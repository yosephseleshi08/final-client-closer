import {
  ChannelLead,
  DispatchLogEntry,
  MultiChannelType,
} from '../types';
import {
  canonicalizeLeadName,
  findLeadDispatchHistoryByName,
  getLocalTodayDateString,
  loadDispatchLog,
  toLocalDateString,
} from './dispatchLog';
import { appendDeletionLog } from './deletionLog';

export const PIPELINE_FREEZE_STORAGE_KEY = 'crm_pipeline_freeze_v1';
export const COMBINED_LEADS_KEY = 'outreach_channel_leads_combined';
export const INSTAGRAM_LEADS_KEY = 'outreach_channel_leads_instagram';
export const BACKSTAGE_LEADS_KEY = 'outreach_backstage_leads_v1';

export { canonicalizeLeadName as normalizeLeadName };

/**
 * Pure local calendar date addition (no circular imports).
 */
export function addLocalDays(dateStr: string, days: number): string {
  const norm = toLocalDateString(dateStr) || getLocalTodayDateString();
  const [y, m, d] = norm.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const ry = dt.getFullYear();
  const rm = String(dt.getMonth() + 1).padStart(2, '0');
  const rd = String(dt.getDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

export function isLocalSunday(dateStr: string): boolean {
  const norm = toLocalDateString(dateStr);
  if (!norm) return false;
  const [y, m, d] = norm.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
}

export function isDateFrozenDirect(dateStr: string): boolean {
  const norm = toLocalDateString(dateStr);
  if (!norm) return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem(PIPELINE_FREEZE_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.frozenDates) && parsed.frozenDates.includes(norm)) {
      return true;
    }
    if (parsed?.isFrozen && parsed?.frozenStartDate) {
      const today = getLocalTodayDateString();
      if (norm >= parsed.frozenStartDate && norm <= today) {
        return true;
      }
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

/**
 * Shifts any due date landing on a Sunday (Rest Day) or frozen date forward
 * to the next active working calendar day using local calendar math.
 */
export function shiftDueDateOffRestDay(
  dateStr: string,
  customFrozenCheck?: (d: string) => boolean
): string {
  let cursor = toLocalDateString(dateStr) || getLocalTodayDateString();
  const isFrozen = customFrozenCheck || isDateFrozenDirect;
  let guard = 0;
  while ((isLocalSunday(cursor) || isFrozen(cursor)) && guard < 31) {
    cursor = addLocalDays(cursor, 1);
    guard++;
  }
  return cursor;
}

export function hasLeadSentHistory(lead: Partial<ChannelLead>): boolean {
  return Boolean(
    lead.initialSentDate ||
      lead.followup1SentDate ||
      lead.followup2SentDate ||
      lead.followup3SentDate ||
      lead.dispatchedAt ||
      lead.dispatchDate ||
      lead.dmSent ||
      lead.status === 'dispatched' ||
      lead.status === 'sent' ||
      (typeof lead.followupCount === 'number' && lead.followupCount > 0)
  );
}

function readStoredLeadsArray(storageKey: string): ChannelLead[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeUrlHandle(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/^mailto:/i, '')
    .replace(/^https?:\/\//i, '')
    .replace(/^(?:www\.|m\.|mobile\.|web\.)/i, '')
    .replace(/^@/, '')
    .replace(/\/+$/, '');
}

function leadsShareLinkOrEmail(a: Partial<ChannelLead>, b: Partial<ChannelLead>): boolean {
  const emailA = normalizeUrlHandle(a.email);
  const emailB = normalizeUrlHandle(b.email);
  if (emailA && emailB && emailA === emailB) return true;

  const linksA = [a.link, a.platformLink, a.instagram, a.facebook]
    .map(normalizeUrlHandle)
    .filter(Boolean);
  const linksB = [b.link, b.platformLink, b.instagram, b.facebook]
    .map(normalizeUrlHandle)
    .filter(Boolean);

  for (const la of linksA) {
    for (const lb of linksB) {
      if (la === lb) return true;
      const tailA = la.replace(/^(?:instagram\.com|facebook\.com|fb\.com)\//, '');
      const tailB = lb.replace(/^(?:instagram\.com|facebook\.com|fb\.com)\//, '');
      if (tailA && tailB && tailA === tailB) return true;
    }
  }
  return false;
}

export interface DuplicateMatchResult {
  hasMatch: boolean;
  activeMatches: ChannelLead[];
  backstageMatches: ChannelLead[];
  dispatchMatches: DispatchLogEntry[];
  bestMatch?: ChannelLead;
  summaryReason?: string;
}

/**
 * Checks normalized name + normalized links/email across:
 * 1. Active Combined + Instagram leads
 * 2. Archived Backstage leads
 * 3. Immutable 'ridge_dispatch_log' history
 */
export function findNormalizedDuplicateMatches(
  candidate: {
    name?: string;
    link?: string;
    platformLink?: string;
    email?: string;
    facebook?: string;
    instagram?: string;
  },
  options?: {
    excludeLeadId?: string;
    activeCombined?: ChannelLead[];
    activeInstagram?: ChannelLead[];
    backstageLeads?: ChannelLead[];
  }
): DuplicateMatchResult {
  const normCandidateName = canonicalizeLeadName(candidate.name);
  const combined =
    options?.activeCombined ??
    readStoredLeadsArray(COMBINED_LEADS_KEY).filter((l) => !l?.isArchived);
  const instagram =
    options?.activeInstagram ??
    readStoredLeadsArray(INSTAGRAM_LEADS_KEY).filter((l) => !l?.isArchived);
  const backstage =
    options?.backstageLeads ?? readStoredLeadsArray(BACKSTAGE_LEADS_KEY);

  const isMatch = (lead: ChannelLead): boolean => {
    if (options?.excludeLeadId && lead.id === options.excludeLeadId) return false;
    if (normCandidateName && canonicalizeLeadName(lead.name) === normCandidateName) {
      return true;
    }
    return leadsShareLinkOrEmail(candidate, lead);
  };

  const activeMatches = [...combined, ...instagram].filter(isMatch);
  const backstageMatches = backstage.filter(isMatch);
  const dispatchMatches = normCandidateName
    ? findLeadDispatchHistoryByName(candidate.name || '')
    : [];

  const hasMatch =
    activeMatches.length > 0 ||
    backstageMatches.length > 0 ||
    dispatchMatches.length > 0;

  let summaryReason: string | undefined;
  if (activeMatches.length > 0) {
    const m = activeMatches[0];
    summaryReason = `Matches active lead ${m.id} (${m.name}) in ${m.channel === 'instagram' ? 'Instagram' : 'Combined'}`;
  } else if (backstageMatches.length > 0) {
    const m = backstageMatches[0];
    summaryReason = `Matches archived lead ${m.id} (${m.name}) in Backstage`;
  } else if (dispatchMatches.length > 0) {
    const latest = dispatchMatches[dispatchMatches.length - 1];
    summaryReason = `Previously dispatched as "${latest.leadName}" (${latest.step} on ${latest.localDate})`;
  }

  return {
    hasMatch,
    activeMatches,
    backstageMatches,
    dispatchMatches,
    bestMatch: activeMatches[0] || backstageMatches[0],
    summaryReason,
  };
}

/**
 * Safely merges incoming metadata into an existing lead WITHOUT resetting sent dates
 * or wiping sequence history.
 */
export function mergeLeadIntoExisting(
  existing: ChannelLead,
  incoming: Partial<ChannelLead>
): ChannelLead {
  return {
    ...existing,
    email: existing.email || incoming.email,
    facebook: existing.facebook || incoming.facebook,
    instagram: existing.instagram || incoming.instagram,
    city: existing.city || incoming.city,
    prompt: existing.prompt || incoming.prompt,
    leadAnalysis: existing.leadAnalysis || incoming.leadAnalysis,
    notes: existing.notes || incoming.notes,
    rawDetails: existing.rawDetails || incoming.rawDetails,
    // Explicitly preserve all historical outreach progress:
    initialSentDate: existing.initialSentDate,
    followup1Date: existing.followup1Date,
    followup2Date: existing.followup2Date,
    followup3Date: existing.followup3Date,
    followup1SentDate: existing.followup1SentDate,
    followup2SentDate: existing.followup2SentDate,
    followup3SentDate: existing.followup3SentDate,
    followupCount: existing.followupCount,
    dispatchedAt: existing.dispatchedAt,
    dispatchDate: existing.dispatchDate,
    dmSent: existing.dmSent,
    dmSentAt: existing.dmSentAt,
    isArchived: false,
    lifecycle: 'active',
    cadenceStatus:
      existing.cadenceStatus === 'cancelled'
        ? existing.cadenceStatus
        : existing.isCompleted || existing.leadStatus === 'replied'
        ? 'completed'
        : 'running',
    possibleDuplicateOf: undefined,
  };
}

export interface OrphanedCadenceItem {
  lead: ChannelLead;
  dueStep: 'D4' | 'D8' | 'D14';
  dueDate: string;
  daysUntilDue: number;
}

/**
 * Finds archived leads in Backstage whose cadence is still 'running' and whose next
 * follow-up (D4, D8, or D14) is due today, overdue, or within the next 7 days.
 */
export function getOrphanedCadences(
  referenceDateStr = getLocalTodayDateString(),
  providedBackstage?: ChannelLead[]
): OrphanedCadenceItem[] {
  const today = toLocalDateString(referenceDateStr) || getLocalTodayDateString();
  const horizon = addLocalDays(today, 7);
  const backstage = providedBackstage ?? readStoredLeadsArray(BACKSTAGE_LEADS_KEY);
  const items: OrphanedCadenceItem[] = [];

  const [ty, tm, td] = today.split('-').map(Number);
  const todayMs = new Date(ty, tm - 1, td).getTime();

  for (const lead of backstage) {
    if (!lead || lead.cadenceStatus === 'cancelled' || lead.cadenceStatus === 'completed') {
      continue;
    }
    if (lead.isCompleted || lead.leadStatus === 'replied' || lead.leadStatus === 'completed') {
      continue;
    }
    if (!lead.initialSentDate && !lead.dmSent) continue;

    // Effective cadenceStatus for archived sent leads is 'running' unless cancelled
    if (lead.cadenceStatus && lead.cadenceStatus !== 'running') continue;

    let dueStep: 'D4' | 'D8' | 'D14' | null = null;
    let rawDue: string | undefined;

    if (!lead.followupCount || lead.followupCount === 0) {
      dueStep = 'D4';
      rawDue = lead.followup1Date || addLocalDays(lead.initialSentDate || today, 4);
    } else if (lead.followupCount === 1) {
      dueStep = 'D8';
      rawDue = lead.followup2Date || addLocalDays(lead.initialSentDate || today, 8);
    } else if (lead.followupCount === 2) {
      dueStep = 'D14';
      rawDue = lead.followup3Date || addLocalDays(lead.initialSentDate || today, 14);
    }

    if (!dueStep || !rawDue) continue;
    const dueDate = toLocalDateString(rawDue);
    if (!dueDate || dueDate > horizon) continue;

    const [dy, dm, dd] = dueDate.split('-').map(Number);
    const dueMs = new Date(dy, dm - 1, dd).getTime();
    const daysUntilDue = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));

    items.push({
      lead,
      dueStep,
      dueDate,
      daysUntilDue,
    });
  }

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/**
 * Prepares a lead for Archive-First removal with explicit cadence choice ('keep_running' vs 'cancel_cadence').
 */
export function buildArchivedLeadState(
  lead: ChannelLead,
  sourceChannel: MultiChannelType,
  choice: 'keep_running' | 'cancel_cadence',
  cancelReason?: string,
  indexOffset = 0
): ChannelLead {
  const nowIso = new Date().toISOString();
  const normalizedChannel: 'combined' | 'instagram' =
    sourceChannel === 'instagram' ? 'instagram' : 'combined';

  appendDeletionLog({
    leadId: lead.id,
    leadName: lead.name,
    channel: normalizedChannel,
    action: choice === 'cancel_cadence' ? 'cancel_cadence' : 'archive',
    reason: cancelReason,
    hadSentHistory: hasLeadSentHistory(lead),
  });

  const baseArchived: ChannelLead = {
    ...lead,
    isArchived: true,
    lifecycle: 'archived',
    archivedAt: nowIso,
    archivedFromChannel: normalizedChannel,
    archiveUid:
      lead.archiveUid ||
      `${normalizedChannel}_${lead.id}_${Date.now() + indexOffset}_${Math.random().toString(36).slice(2, 7)}`,
  };

  if (choice === 'cancel_cadence') {
    return {
      ...baseArchived,
      cadenceStatus: 'cancelled',
      cancelledReason: cancelReason || 'Cancelled by operator',
      cancelledAt: nowIso,
      scheduledDate: undefined,
    };
  }

  return {
    ...baseArchived,
    cadenceStatus:
      lead.isCompleted || lead.leadStatus === 'replied' || lead.leadStatus === 'completed'
        ? 'completed'
        : 'running',
  };
}

/**
 * Checks if any historical dispatch entries in ridge_dispatch_log already exist for a lead name
 * so re-imports never blindly reset previously sent leads.
 */
export function getHistoricalSentDateForName(name: string): string | null {
  const entries = loadDispatchLog();
  const norm = canonicalizeLeadName(name);
  if (!norm) return null;
  const d0s = entries
    .filter((e) => e.step === 'D0' && canonicalizeLeadName(e.leadName) === norm)
    .sort((a, b) => a.localDate.localeCompare(b.localDate));
  return d0s.length > 0 ? d0s[0].localDate : null;
}
