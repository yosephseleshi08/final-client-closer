import { ChannelLead, MultiChannelType } from '../types';
import {
  getNextLeadId,
  loadChannelLeads,
  saveChannelLeads,
  normalizeEmailOnlyWarmupStatus,
} from './channelStorage';
import { getStrictVoiceTypeForId, recalculateAllVoiceTypes } from './voiceTypeEngine';
import { buildArchivedLeadState, hasLeadSentHistory } from './leadLifecycle';
import { appendDeletionLog } from './deletionLog';

export const BACKSTAGE_STORAGE_KEY = 'outreach_backstage_leads_v1';

function createArchiveUid(lead: ChannelLead, sourceChannel: MultiChannelType, indexOffset = 0): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${sourceChannel}_${lead.id}_${Date.now() + indexOffset}_${rand}`;
}

function getNormalizedTargetChannel(lead: ChannelLead, fallback?: MultiChannelType): 'combined' | 'instagram' {
  const ch = lead.archivedFromChannel || lead.channel || fallback;
  return ch === 'instagram' ? 'instagram' : 'combined';
}

/**
 * Loads all soft-deleted (archived) leads from Backstage localStorage.
 * Sorted newest-archived first so accidental deletes appear at the top.
 */
export function loadBackstageLeads(): ChannelLead[] {
  try {
    const raw = localStorage.getItem(BACKSTAGE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    let repairedUid = false;
    const seenUids = new Set<string>();
    const normalized: ChannelLead[] = parsed.map((item: ChannelLead, idx: number) => {
      const targetChannel = getNormalizedTargetChannel(item);
      let uid = item.archiveUid;
      if (!uid || seenUids.has(uid)) {
        uid = `${targetChannel}_${item.id || idx}_${Date.now()}_${idx}`;
        repairedUid = true;
      }
      seenUids.add(uid);
      return {
        ...item,
        isArchived: true,
        lifecycle: 'archived',
        archivedFromChannel: item.archivedFromChannel || targetChannel,
        archiveUid: uid,
      };
    });

    if (repairedUid) {
      localStorage.setItem(BACKSTAGE_STORAGE_KEY, JSON.stringify(normalized));
    }

    return normalized.sort((a, b) => {
      const timeA = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
      const timeB = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Failed to load Backstage leads from localStorage:', err);
    return [];
  }
}

/**
 * Saves Backstage leads array to localStorage and notifies listeners.
 */
export function saveBackstageLeads(leads: ChannelLead[]): void {
  try {
    localStorage.setItem(BACKSTAGE_STORAGE_KEY, JSON.stringify(leads));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backstage_leads_changed', { detail: leads }));
    }
  } catch (err) {
    console.error('Failed to save Backstage leads to localStorage:', err);
  }
}

/**
 * Archive-First Soft Delete with explicit cadence choice:
 * - 'keep_running': keeps initialSentDate & follow-up timers alive so D4/D8/D14 stay visible
 * - 'cancel_cadence': sets cadenceStatus = 'cancelled' with reason & clears future schedule
 */
export function archiveLeadsWithChoice(
  leadsToArchive: ChannelLead[],
  sourceChannel: MultiChannelType,
  choice: 'keep_running' | 'cancel_cadence' = 'keep_running',
  cancelReason?: string
): ChannelLead[] {
  if (!leadsToArchive || leadsToArchive.length === 0) {
    return loadBackstageLeads();
  }

  const existingBackstage = loadBackstageLeads();
  const archivedItems: ChannelLead[] = leadsToArchive.map((lead, idx) =>
    buildArchivedLeadState(lead, sourceChannel, choice, cancelReason, idx)
  );

  const updatedBackstage = [...archivedItems, ...existingBackstage];
  saveBackstageLeads(updatedBackstage);
  return updatedBackstage;
}

/**
 * Backwards-compatible soft-delete wrapper: keeps cadence running on sent leads, archives clean.
 */
export function archiveLeadsToBackstage(
  leadsToArchive: ChannelLead[],
  sourceChannel: MultiChannelType
): ChannelLead[] {
  return archiveLeadsWithChoice(leadsToArchive, sourceChannel, 'keep_running');
}

/**
 * Cancels an archived lead's running follow-up cadence directly inside Backstage.
 */
export function cancelBackstageLeadCadence(
  archiveUid: string,
  reason = 'Cancelled by operator in Backstage'
): ChannelLead[] {
  const current = loadBackstageLeads();
  const nowIso = new Date().toISOString();
  const updated = current.map((l) => {
    if (l.archiveUid !== archiveUid) return l;
    appendDeletionLog({
      leadId: l.id,
      leadName: l.name,
      channel: getNormalizedTargetChannel(l),
      action: 'cancel_cadence',
      reason,
      hadSentHistory: hasLeadSentHistory(l),
    });
    return {
      ...l,
      cadenceStatus: 'cancelled' as const,
      cancelledReason: reason,
      cancelledAt: nowIso,
      scheduledDate: undefined,
    };
  });
  saveBackstageLeads(updated);
  return updated;
}

/**
 * Restores selected Backstage leads (isArchived: false, lifecycle: 'active') back into main workspaces.
 * Preserves existing cadenceStatus ('cancelled' stays 'cancelled', running sent leads resume cleanly).
 */
export function restoreLeadsFromBackstage(
  archiveUids: string[],
  existingActive?: {
    combined?: ChannelLead[];
    instagram?: ChannelLead[];
  }
): {
  restoredLeads: ChannelLead[];
  updatedCombined: ChannelLead[];
  updatedInstagram: ChannelLead[];
  remainingBackstage: ChannelLead[];
} {
  const uidSet = new Set(archiveUids);
  const currentBackstage = loadBackstageLeads();

  const toRestore = currentBackstage.filter((l) => l.archiveUid && uidSet.has(l.archiveUid));
  const remainingBackstage = currentBackstage.filter((l) => !l.archiveUid || !uidSet.has(l.archiveUid));

  let combinedList = [...(existingActive?.combined ?? loadChannelLeads('combined'))];
  let instagramList = [...(existingActive?.instagram ?? loadChannelLeads('instagram'))];

  if (toRestore.length === 0) {
    return {
      restoredLeads: [],
      updatedCombined: combinedList,
      updatedInstagram: instagramList,
      remainingBackstage,
    };
  }

  const sortedToRestore = [...toRestore].sort(
    (a, b) => (a.numericId ?? 0) - (b.numericId ?? 0)
  );

  const restoredLeads: ChannelLead[] = [];

  for (const archived of sortedToRestore) {
    const targetChannel = getNormalizedTargetChannel(archived);
    const targetList = targetChannel === 'instagram' ? instagramList : combinedList;

    const usedIds = new Set(targetList.map((l) => l.id));
    const usedNums = new Set(targetList.map((l) => l.numericId));

    const {
      isArchived: _isArchived,
      archivedAt: _archivedAt,
      archivedFromChannel: _archivedFromChannel,
      archiveUid: _archiveUid,
      ...cleanFields
    } = archived;

    const canKeepOriginalId =
      Boolean(cleanFields.id) &&
      Boolean(cleanFields.numericId && cleanFields.numericId > 0) &&
      !usedIds.has(cleanFields.id) &&
      !usedNums.has(cleanFields.numericId);

    const assignedId = canKeepOriginalId
      ? { id: cleanFields.id, numericId: cleanFields.numericId }
      : getNextLeadId(targetChannel, targetList);

    const resolvedVoiceType = getStrictVoiceTypeForId(assignedId.numericId, targetChannel);

    const preservedCadenceStatus =
      cleanFields.cadenceStatus === 'cancelled'
        ? ('cancelled' as const)
        : cleanFields.isCompleted || cleanFields.leadStatus === 'replied' || cleanFields.leadStatus === 'completed'
        ? ('completed' as const)
        : ('running' as const);

    const restoredLead: ChannelLead = {
      ...cleanFields,
      id: assignedId.id,
      numericId: assignedId.numericId,
      channel: targetChannel,
      voiceType: resolvedVoiceType,
      isVoiceTypeOverridden: false,
      isArchived: false,
      lifecycle: 'active',
      cadenceStatus: preservedCadenceStatus,
      sortOrder: targetList.length,
    };

    targetList.push(restoredLead);
    restoredLeads.push(restoredLead);
  }

  const finalizeList = (list: ChannelLead[], ch: 'combined' | 'instagram'): ChannelLead[] =>
    recalculateAllVoiceTypes(
      normalizeEmailOnlyWarmupStatus(list)
        .sort((a, b) => (a.numericId ?? 0) - (b.numericId ?? 0))
        .map((l, idx) => ({ ...l, sortOrder: idx })),
      ch
    );

  combinedList = finalizeList(combinedList, 'combined');
  instagramList = finalizeList(instagramList, 'instagram');

  saveChannelLeads('combined', combinedList);
  saveChannelLeads('instagram', instagramList);
  saveBackstageLeads(remainingBackstage);

  return {
    restoredLeads,
    updatedCombined: combinedList,
    updatedInstagram: instagramList,
    remainingBackstage,
  };
}

/**
 * Permanently removes selected leads from Backstage.
 * Logs permanent deletion to 'ridge_deletion_log' and NEVER touches 'ridge_dispatch_log' or frozen obligations!
 */
export function permanentlyDeleteFromBackstage(archiveUids: string[]): ChannelLead[] {
  const uidSet = new Set(archiveUids);
  const currentBackstage = loadBackstageLeads();
  const toDelete = currentBackstage.filter((l) => l.archiveUid && uidSet.has(l.archiveUid));

  for (const lead of toDelete) {
    appendDeletionLog({
      leadId: lead.id,
      leadName: lead.name,
      channel: getNormalizedTargetChannel(lead),
      action: 'permanent_delete',
      hadSentHistory: hasLeadSentHistory(lead),
    });
  }

  const remaining = currentBackstage.filter((l) => !l.archiveUid || !uidSet.has(l.archiveUid));
  saveBackstageLeads(remaining);
  return remaining;
}

/**
 * Permanently clears all leads from Backstage while leaving immutable dispatch/obligation logs untouched.
 */
export function clearAllBackstageLeads(): ChannelLead[] {
  const currentBackstage = loadBackstageLeads();
  for (const lead of currentBackstage) {
    appendDeletionLog({
      leadId: lead.id,
      leadName: lead.name,
      channel: getNormalizedTargetChannel(lead),
      action: 'permanent_delete',
      reason: 'Empty Backstage',
      hadSentHistory: hasLeadSentHistory(lead),
    });
  }
  saveBackstageLeads([]);
  return [];
}
