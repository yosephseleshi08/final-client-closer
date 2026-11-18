import { ChannelLead, DailyObligationSnapshot } from '../types';
import {
  appendDispatchEntriesBatch,
  AppendDispatchInput,
  backfillDispatchLogFromLeads,
  canonicalizeLeadName,
  countDispatches,
  countDispatchesByStep,
  getLifetimeDispatchCount,
  loadDispatchLog,
  toLocalDateString,
} from '../utils/dispatchLog';
import {
  DAILY_OBLIGATIONS_STORAGE_KEY,
  loadAllDailyObligations,
  saveAllDailyObligations,
} from '../utils/dailyObligation';
import {
  addLocalDays,
  BACKSTAGE_LEADS_KEY,
  COMBINED_LEADS_KEY,
  INSTAGRAM_LEADS_KEY,
  shiftDueDateOffRestDay,
} from '../utils/leadLifecycle';

export interface HistoryRepairResult {
  reconstructedEntriesAdded: number;
  snapshotsFrozen: number;
  skippedAlreadyFrozen: number;
  lifetimeD0Count: number;
  totalsByDate: Record<string, { actual: number; expectedTotal: number }>;
}

export interface SentDateRestoreResult {
  restoredLeadIds: string[];
  cancelledDuplicateIds: string[];
  dispatchEntriesAdded: number;
  gmailVerificationEmails: string[];
  details: string[];
}

interface VerifiedBaselineDay {
  date: string;
  actualTotal: number;
  targetD0: number;
  targetD4: number;
  expectedTotal: number;
  isRestDay: boolean;
}

/**
 * Verified historical baselines for Nov 12–18, 2026:
 * - Nov 14: 10/10
 * - Nov 15: Sunday Rest Day (0/0, Protected 100%)
 * - Nov 16: 20/20
 * - Nov 17: 20/20
 * - Nov 18: 17/20
 * Lifetime D0 sum across verified dispatches >= 57 (10 + 17 + 17 + 13 = 57 D0; + 10 D4 = 67 total).
 */
const VERIFIED_NOV_BASELINE: VerifiedBaselineDay[] = [
  { date: '2026-11-12', actualTotal: 0, targetD0: 0, targetD4: 0, expectedTotal: 0, isRestDay: false },
  { date: '2026-11-13', actualTotal: 0, targetD0: 0, targetD4: 0, expectedTotal: 0, isRestDay: false },
  { date: '2026-11-14', actualTotal: 10, targetD0: 10, targetD4: 0, expectedTotal: 10, isRestDay: false },
  { date: '2026-11-15', actualTotal: 0, targetD0: 0, targetD4: 0, expectedTotal: 0, isRestDay: true },
  { date: '2026-11-16', actualTotal: 20, targetD0: 17, targetD4: 3, expectedTotal: 20, isRestDay: false },
  { date: '2026-11-17', actualTotal: 20, targetD0: 17, targetD4: 3, expectedTotal: 20, isRestDay: false },
  { date: '2026-11-18', actualTotal: 17, targetD0: 13, targetD4: 4, expectedTotal: 20, isRestDay: false },
];

function readArray(key: string): ChannelLead[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * PART 4 — Settings -> "Repair History"
 * Idempotently reconstructs Nov 12–18 frozen obligation snapshots and 'reconstruction'
 * dispatch log entries restoring verified totals (Nov 14: 10/10, Nov 16: 20/20,
 * Nov 17: 20/20, Nov 18: 17/20, >= 57 lifetime D0 dispatches), never overwriting
 * existing 'frozen' snapshots or reducing higher actual counts.
 */
export function applyHistoryRepair(): HistoryRepairResult {
  const combined = readArray(COMBINED_LEADS_KEY);
  const instagram = readArray(INSTAGRAM_LEADS_KEY);
  const backstage = readArray(BACKSTAGE_LEADS_KEY);

  // First backfill any real live leads still in storage
  backfillDispatchLogFromLeads([...combined, ...instagram, ...backstage]);

  const toAppend: AppendDispatchInput[] = [];
  const nowIso = new Date().toISOString();

  for (const day of VERIFIED_NOV_BASELINE) {
    if (day.actualTotal === 0) continue;

    const existingSteps = countDispatchesByStep(day.date);
    const neededD0 = Math.max(0, day.targetD0 - existingSteps.D0);
    const neededD4 = Math.max(0, day.targetD4 - existingSteps.D4);
    const currentTotal = existingSteps.total;
    const neededTotal = Math.max(0, day.actualTotal - currentTotal);

    let seq = existingSteps.total + 1;

    // Add D0 reconstruction entries first to guarantee lifetime D0 >= 57
    const d0ToAdd = Math.min(neededD0, Math.max(neededTotal, neededD0));
    for (let i = 0; i < d0ToAdd; i++) {
      toAppend.push({
        id: `legacy-${day.date}-${seq}`,
        leadId: `legacy-${day.date}-${seq}`,
        leadName: `Recovered dispatch #${seq}`,
        channel: i % 2 === 0 ? 'instagram' : 'email',
        step: 'D0',
        localDate: day.date,
        timestamp: `${day.date}T12:00:00`,
        source: 'reconstruction',
      });
      seq++;
    }

    // Add any remaining follow-up / total deficit up to actualTotal
    const d4Remaining = Math.max(0, Math.min(neededD4, neededTotal - d0ToAdd));
    for (let i = 0; i < d4Remaining; i++) {
      toAppend.push({
        id: `legacy-${day.date}-${seq}`,
        leadId: `legacy-${day.date}-${seq}`,
        leadName: `Recovered dispatch #${seq}`,
        channel: i % 2 === 0 ? 'instagram' : 'email',
        step: 'D4',
        localDate: day.date,
        timestamp: `${day.date}T12:00:00`,
        source: 'reconstruction',
      });
      seq++;
    }
  }

  const batchResult = appendDispatchEntriesBatch(toAppend);

  // Guarantee lifetime D0 >= 57 even if local logs had fewer D0s and more follow-ups
  let currentD0 = getLifetimeDispatchCount('D0');
  if (currentD0 < 57) {
    const deficit = 57 - currentD0;
    const extraD0: AppendDispatchInput[] = [];
    for (let i = 0; i < deficit; i++) {
      const targetDay = i % 2 === 0 ? '2026-11-16' : '2026-11-17';
      const seqNum = 100 + i;
      extraD0.push({
        id: `legacy-${targetDay}-d0-${seqNum}`,
        leadId: `legacy-${targetDay}-d0-${seqNum}`,
        leadName: `Recovered dispatch #${seqNum}`,
        channel: i % 2 === 0 ? 'instagram' : 'email',
        step: 'D0',
        localDate: targetDay,
        timestamp: `${targetDay}T12:00:00`,
        source: 'reconstruction',
      });
    }
    const extraRes = appendDispatchEntriesBatch(extraD0);
    batchResult.addedCount += extraRes.addedCount;
    currentD0 = getLifetimeDispatchCount('D0');
  }

  // Reconstruct Nov 12–18 obligation snapshots cleanly without overwriting existing 'frozen' snapshots
  const allObligations = loadAllDailyObligations();
  let snapshotsFrozen = 0;
  let skippedAlreadyFrozen = 0;
  const totalsByDate: Record<string, { actual: number; expectedTotal: number }> = {};

  for (const day of VERIFIED_NOV_BASELINE) {
    const actual = countDispatches(day.date);
    const existing = allObligations[day.date];

    if (existing && existing.status === 'frozen') {
      skippedAlreadyFrozen++;
      totalsByDate[day.date] = {
        actual,
        expectedTotal: existing.expectedTotal,
      };
      continue;
    }

    const expectedTotal = day.isRestDay
      ? 0
      : Math.max(day.expectedTotal, existing?.expectedTotal ?? 0);

    const snapshot: DailyObligationSnapshot = {
      date: day.date,
      expectedTotal,
      expectedInitialIG: day.isRestDay ? 0 : Math.min(6, expectedTotal),
      expectedInitialCombined: day.isRestDay ? 0 : Math.min(4, Math.max(0, expectedTotal - 6)),
      expectedFollowups: day.isRestDay ? 0 : Math.max(0, expectedTotal - 10),
      isRestDay: day.isRestDay,
      isFrozenDay: existing?.isFrozenDay ?? false,
      status: 'frozen',
      lockedAt: existing?.lockedAt || nowIso,
      frozenAt: nowIso,
      removedMidDay: existing?.removedMidDay ?? 0,
      supplyGap: !day.isRestDay && day.expectedTotal < 10 && day.expectedTotal > 0,
      zeroState: day.isRestDay
        ? 'rest'
        : expectedTotal === 0 && actual === 0
        ? 'pre_launch'
        : 'normal',
      updatedAt: nowIso,
    };

    allObligations[day.date] = snapshot;
    snapshotsFrozen++;
    totalsByDate[day.date] = { actual, expectedTotal };
  }

  if (snapshotsFrozen > 0) {
    saveAllDailyObligations(allObligations);
  } else if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ridge_daily_obligations_changed'));
  }

  // Also ensure key exists in localStorage cleanly
  if (typeof localStorage !== 'undefined' && !localStorage.getItem(DAILY_OBLIGATIONS_STORAGE_KEY)) {
    saveAllDailyObligations(allObligations);
  }

  return {
    reconstructedEntriesAdded: batchResult.addedCount,
    snapshotsFrozen,
    skippedAlreadyFrozen,
    lifetimeD0Count: currentD0,
    totalsByDate,
  };
}

/**
 * Known restored metadata anchors for the 11 re-imported November leads (CM-64..CM-74).
 * Dec schedule cohorts map cleanly back to Nov 14–17:
 * - 2026-12-04 -> 2026-11-14
 * - 2026-12-05 -> 2026-11-16
 * - 2026-12-07 -> 2026-11-17
 */
const COHORT_DEC_TO_NOV_DATE: Record<string, string> = {
  '2026-12-04': '2026-11-14',
  '2026-12-05': '2026-11-16',
  '2026-12-07': '2026-11-17',
};

const KNOWN_RESTORE_BY_NORMALIZED_NAME: Record<
  string,
  { sentDate: string; duplicateOf?: string }
> = {
  caminos: { sentDate: '2026-11-14', duplicateOf: 'CM-2' },
  'taqueria chilango gr': { sentDate: '2026-11-16' },
  'sb chocolate': { sentDate: '2026-11-17' },
  'south bend chocolate': { sentDate: '2026-11-17' },
  senia: { sentDate: '2026-11-17' },
};

const GMAIL_VERIFY_ADDRESSES = ['Sbph@sbchocolate.com', 'info@restaurantsenia.com'];

function isTargetRestoredCombinedLead(lead: ChannelLead): boolean {
  if (!lead || lead.channel === 'instagram') return false;
  // Never alter CM-2
  if (lead.id === 'CM-2') return false;

  const idMatch = /^CM-(\d+)$/i.exec(lead.id);
  const numId = idMatch ? parseInt(idMatch[1], 10) : lead.numericId;
  if (numId >= 64 && numId <= 74) return true;

  const normName = canonicalizeLeadName(lead.name);
  if (normName && normName !== 'caminos' && KNOWN_RESTORE_BY_NORMALIZED_NAME[normName]) {
    return Boolean(
      lead.scheduledDate && lead.scheduledDate >= '2026-12-01' && !lead.initialSentDate
    );
  }
  if (
    lead.email &&
    GMAIL_VERIFY_ADDRESSES.some((addr) => addr.toLowerCase() === lead.email?.trim().toLowerCase()) &&
    !lead.initialSentDate
  ) {
    return true;
  }
  return false;
}

/**
 * PART 5 — Settings -> "Restore Sent Dates"
 * - Patches re-imported CM-64..CM-74 by normalized name / ID cohort
 * - Restores original November D0 sent dates (Nov 14–17)
 * - Clears December scheduledDate so they cannot be re-pitched in Dec
 * - Shifts D4/D8/D14 off Sundays/frozen days
 * - Cancels CM-67 Caminos duplicate (cadenceStatus: 'cancelled', cancelledReason: 'Duplicate') without touching CM-2
 * - Inserts 'restore' dispatch log entries idempotently
 * - Surfaces Gmail verification list for Sbph@sbchocolate.com, info@restaurantsenia.com
 */
export function applySentDateRestore(): SentDateRestoreResult {
  const combined = readArray(COMBINED_LEADS_KEY);
  const instagram = readArray(INSTAGRAM_LEADS_KEY);
  const dispatchEntries = loadDispatchLog();
  const nowIso = new Date().toISOString();

  const restoredLeadIds: string[] = [];
  const cancelledDuplicateIds: string[] = [];
  const details: string[] = [];
  const restoreLogEntries: AppendDispatchInput[] = [];
  const matchedVerifyEmails = new Set<string>();

  const cm2Exists = combined.some((l) => l.id === 'CM-2' || canonicalizeLeadName(l.name) === 'caminos' && l.id !== 'CM-67');

  const updatedCombined = combined.map((lead) => {
    // Strictly preserve CM-2 untouched
    if (lead.id === 'CM-2') {
      return lead;
    }

    if (lead.email) {
      for (const targetEmail of GMAIL_VERIFY_ADDRESSES) {
        if (lead.email.trim().toLowerCase() === targetEmail.toLowerCase()) {
          matchedVerifyEmails.add(targetEmail);
        }
      }
    }

    if (!isTargetRestoredCombinedLead(lead)) {
      return lead;
    }

    const normName = canonicalizeLeadName(lead.name);

    // Handle CM-67 (Caminos duplicate) without touching CM-2
    if (
      lead.id === 'CM-67' ||
      (normName === 'caminos' && cm2Exists && lead.id !== 'CM-2')
    ) {
      if (lead.cadenceStatus === 'cancelled' && lead.cancelledReason === 'Duplicate') {
        cancelledDuplicateIds.push(lead.id);
        return lead;
      }
      cancelledDuplicateIds.push(lead.id);
      details.push(`${lead.id} (${lead.name}): Cancelled duplicate of CM-2`);
      return {
        ...lead,
        cadenceStatus: 'cancelled' as const,
        cancelledReason: 'Duplicate',
        cancelledAt: lead.cancelledAt || nowIso,
        scheduledDate: undefined,
        possibleDuplicateOf: 'CM-2',
        restoredAt: nowIso,
        restoredNote: 'Cancelled duplicate without modifying CM-2',
      };
    }

    // Determine exact November sent date
    const existingDispatch = dispatchEntries.find(
      (e) =>
        e.step === 'D0' &&
        (e.leadId === lead.id ||
          (normName && canonicalizeLeadName(e.leadName) === normName))
    );

    const normSched = toLocalDateString(lead.scheduledDate);
    const knownMeta = normName ? KNOWN_RESTORE_BY_NORMALIZED_NAME[normName] : undefined;

    const restoredSentDate =
      (lead.initialSentDate && lead.initialSentDate < '2026-12-01'
        ? toLocalDateString(lead.initialSentDate)
        : null) ||
      existingDispatch?.localDate ||
      knownMeta?.sentDate ||
      (normSched ? COHORT_DEC_TO_NOV_DATE[normSched] : undefined) ||
      '2026-11-16';

    const fu1 = shiftDueDateOffRestDay(addLocalDays(restoredSentDate, 4));
    const fu2 = shiftDueDateOffRestDay(addLocalDays(restoredSentDate, 8));
    const fu3 = shiftDueDateOffRestDay(addLocalDays(restoredSentDate, 14));

    restoreLogEntries.push({
      id: `restore_${lead.id}_D0_${restoredSentDate}`,
      leadId: lead.id,
      leadName: lead.name,
      channel: lead.facebook && !lead.email && !lead.fb_message_restricted ? 'facebook' : 'email',
      step: 'D0',
      localDate: restoredSentDate,
      timestamp: `${restoredSentDate}T12:00:00`,
      source: 'restore',
    });

    restoredLeadIds.push(lead.id);
    details.push(`${lead.id} (${lead.name}): Restored D0 → ${restoredSentDate}, D4 → ${fu1}`);

    return {
      ...lead,
      initialSentDate: restoredSentDate,
      dispatchDate: restoredSentDate,
      dispatchedAt: `${restoredSentDate}T12:00:00`,
      dmSent: true,
      dmSentAt: `${restoredSentDate}T12:00:00`,
      status: 'dispatched',
      scheduledDate: undefined,
      followup1Date: fu1,
      followup2Date: fu2,
      followup3Date: fu3,
      followupCount: lead.followupCount ?? 0,
      leadStatus:
        lead.leadStatus && lead.leadStatus !== 'not_sent' ? lead.leadStatus : 'waiting_reply',
      cadenceStatus:
        lead.cadenceStatus === 'cancelled' ? ('cancelled' as const) : ('running' as const),
      restoredAt: nowIso,
      restoredNote: `D0 restored to ${restoredSentDate}; December schedule cleared`,
    };
  });

  // Also ensure email notice always surfaces the two Gmail verification addresses
  const gmailVerificationEmails =
    matchedVerifyEmails.size > 0
      ? Array.from(matchedVerifyEmails)
      : [...GMAIL_VERIFY_ADDRESSES];

  const dispatchRes = appendDispatchEntriesBatch(restoreLogEntries);

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COMBINED_LEADS_KEY, JSON.stringify(updatedCombined));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('channel_leads_changed', {
          detail: { channel: 'combined', leads: updatedCombined },
        })
      );
      window.dispatchEvent(new CustomEvent('crm_data_repaired'));
    }
  } catch (err) {
    console.error('Failed saving restored combined leads:', err);
  }

  // Run backfill across instagram too so state stays unified
  backfillDispatchLogFromLeads([...updatedCombined, ...instagram]);

  return {
    restoredLeadIds,
    cancelledDuplicateIds,
    dispatchEntriesAdded: dispatchRes.addedCount,
    gmailVerificationEmails,
    details,
  };
}
