import {
  DailyHistoryRecord,
  DailyHistoryStatus,
  HistoryStreakStats,
  MultiChannelType,
  ChannelLead,
} from '../types';
import { getLocalTodayStr, normalizeToLocalDateStr } from './cadenceEngine';
import { loadChannelLeads } from './channelStorage';
import { getVideosVerifiedTodayCount } from './videoVerification';
import { isPipelineFrozenNow, isDateFrozen } from './pipelineFreeze';
import {
  calculateDailyExecutionScore,
  DailyExecutionScore,
  evaluateStreakStats,
  findEarliestDispatchDate,
  getExecutionTierMeta,
  getQuotaSettings,
  saveQuotaSettings,
  loadAllAuditLeads,
  isSundayDateStr,
  countLeadVerifiedDispatchesOnDate,
} from './streakManager';

export const HISTORY_STORAGE_KEY = 'outreach_daily_history';
export const OUTREACH_START_DATE = '2026-10-26';

export {
  calculateDailyExecutionScore,
  getExecutionTierMeta,
  getQuotaSettings,
  saveQuotaSettings,
  loadAllAuditLeads,
};
export type { DailyExecutionScore };

/**
 * Finds the earliest verified outreach dispatch date across active/archived leads.
 * Returns null if no outreach dispatches have been executed yet.
 */
export function getEarliestOutreachDate(providedLeads?: ChannelLead[]): string | null {
  try {
    return findEarliestDispatchDate(providedLeads);
  } catch {
    return null;
  }
}

/**
 * Formats YYYY-MM-DD into a human-readable string like "Oct 26, 2026"
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Checks if a YYYY-MM-DD string falls on a Sunday
 */
export function isDateStringSunday(dateStr: string): boolean {
  return isSundayDateStr(dateStr);
}

/**
 * Checks existing channel leads in localStorage for outreach completed on a specific date.
 */
export function getLeadsSentOnDate(dateStr: string): {
  count: number;
  initialCount: number;
  followupCount: number;
  channelBreakdown: Record<string, number>;
} {
  const channels: MultiChannelType[] = ['combined', 'instagram'];
  let count = 0;
  let initialCount = 0;
  let followupCount = 0;
  const channelBreakdown: Record<string, number> = { combined: 0, instagram: 0 };

  const normDate = normalizeToLocalDateStr(dateStr) || getLocalTodayStr();
  const [y, m, d] = normDate.split('-').map(Number);
  const dayStartMs = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const dayEndMs = new Date(y, m - 1, d + 1, 0, 0, 0, 0).getTime();

  for (const ch of channels) {
    const leads = loadChannelLeads(ch);
    for (const lead of leads) {
      const counts = countLeadVerifiedDispatchesOnDate(lead, normDate, dayStartMs, dayEndMs);
      if (counts.total > 0) {
        count += counts.total;
        initialCount += counts.initial;
        followupCount += counts.followup;
        channelBreakdown[ch] = (channelBreakdown[ch] || 0) + counts.total;
      }
    }
  }

  return { count, initialCount, followupCount, channelBreakdown };
}

/**
 * Maps an Auditable Execution Score into a standardized DailyHistoryRecord.
 */
function buildAuditedHistoryRecord(
  dateStr: string,
  score: DailyExecutionScore,
  earliestDate: string | null,
  existing?: Partial<DailyHistoryRecord>
): DailyHistoryRecord {
  const isPreLaunch =
    !score.isFrozen &&
    !score.isRestDay &&
    score.actual === 0 &&
    (!earliestDate || dateStr < earliestDate);

  let status: DailyHistoryStatus = 'zero';
  if (score.isFrozen) {
    status = 'frozen';
  } else if (score.isRestDay) {
    status = 'sunday';
  } else if (isPreLaunch) {
    status = 'pre_launch';
  } else if (score.percentage >= 90) {
    status = 'full';
  } else if (score.percentage > 0) {
    status = 'partial';
  } else {
    status = 'zero';
  }

  return {
    date: dateStr,
    displayDate: formatDisplayDate(dateStr),
    dmsSent: score.actual,
    dmsTarget: score.expected,
    percentage: isPreLaunch ? 0 : score.percentage,
    isSunday: score.isRestDay,
    isFrozen: score.isFrozen,
    status,
    executionTier: isPreLaunch ? 'pre_launch' : score.tier,
    actualDispatched: score.actual,
    expectedQuota: score.expected,
    igDispatched: score.igActual,
    igExpected: score.igExpected,
    combinedDispatched: score.combinedActual,
    combinedExpected: score.combinedExpected,
    shortfallReason: isPreLaunch
      ? !earliestDate
        ? 'Pre-Launch (Outreach Not Started)'
        : 'Pre-Launch (Prior to Kickoff)'
      : score.shortfallReason,
    notes: score.isFrozen
      ? 'Pipeline Frozen (Streak Protected)'
      : score.isRestDay
      ? 'Sunday Rest Day'
      : existing?.notes,
    updatedAt: existing?.updatedAt || new Date().toISOString(),
    initialDmsSent: score.initialCount,
    initialDmsTarget: score.expected,
    followupsSent: score.followupCount,
    followupsTarget: 0,
    videosVerified: existing?.videosVerified,
    storiesPosted: existing?.storiesPosted,
    reelsPosted: existing?.reelsPosted,
    warmupCompleted: existing?.warmupCompleted,
    warmupTarget: existing?.warmupTarget,
    warmupPercentage: existing?.warmupPercentage,
  };
}

/**
 * Backfill & Migration Engine:
 * Recalculates stored historical entries against actual verified dispatches in lead storage
 * so legacy inflated task-marked 100% entries immediately reflect true quota execution.
 */
export function migrateAndBackfillHistory(
  rawRecords: DailyHistoryRecord[],
  providedLeads?: ChannelLead[]
): { records: DailyHistoryRecord[]; didMigrate: boolean } {
  const allLeads = providedLeads ?? loadAllAuditLeads();
  const earliestDate = findEarliestDispatchDate(allLeads, rawRecords);
  const quota = getQuotaSettings();

  let didMigrate = false;
  const migrated: DailyHistoryRecord[] = rawRecords.map((record) => {
    const score = calculateDailyExecutionScore(record.date, allLeads, quota);
    const nextRecord = buildAuditedHistoryRecord(record.date, score, earliestDate, record);

    if (
      record.dmsSent !== nextRecord.dmsSent ||
      record.dmsTarget !== nextRecord.dmsTarget ||
      record.percentage !== nextRecord.percentage ||
      record.status !== nextRecord.status ||
      record.executionTier !== nextRecord.executionTier ||
      record.expectedQuota !== nextRecord.expectedQuota ||
      record.actualDispatched !== nextRecord.actualDispatched ||
      record.shortfallReason !== nextRecord.shortfallReason
    ) {
      didMigrate = true;
      return {
        ...nextRecord,
        updatedAt: new Date().toISOString(),
      };
    }

    return record;
  });

  return {
    records: migrated.sort((a, b) => b.date.localeCompare(a.date)),
    didMigrate,
  };
}

/**
 * Loads daily history from localStorage and automatically runs backfill/migration
 * against real lead dispatch timestamps.
 */
export function loadDailyHistory(providedLeads?: ChannelLead[]): DailyHistoryRecord[] {
  let records: DailyHistoryRecord[] = [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        records = parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load daily history from localStorage:', err);
  }

  if (records.length === 0) {
    return [];
  }

  const { records: audited, didMigrate } = migrateAndBackfillHistory(records, providedLeads);
  if (didMigrate) {
    saveDailyHistory(audited);
  }

  return audited;
}

/**
 * Saves the given records to localStorage.
 */
export function saveDailyHistory(records: DailyHistoryRecord[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save daily history to localStorage:', err);
  }
}

export interface TodayCompletionDetails {
  totalCompleted: number;
  totalRemainingDue: number;
  initialSent: number;
  initialRemainingDue: number;
  followupsSent: number;
  followupsRemainingDue: number;
  videosVerified?: number;
  storiesPosted?: number;
  reelsPosted?: number;
  warmupCompleted?: number;
  warmupTarget?: number;
  warmupPercentage?: number;
  notes?: string;
}

/**
 * Records or updates today's auditable completion progress into the history array.
 * Percentage strictly measures (Actual Verified Dispatches / Expected Daily Quota) * 100.
 * Never awards 100% on an active working day simply because scheduled tasks ran out.
 */
export function recordTodayCompletion(
  completedCountOrDetails: number | TodayCompletionDetails,
  legacyRemainingDue?: number,
  legacyNotes?: string
): DailyHistoryRecord[] {
  const todayStr = getLocalTodayStr();
  const auditLeads = loadAllAuditLeads();
  const quota = getQuotaSettings();
  const score = calculateDailyExecutionScore(todayStr, auditLeads, quota);
  const earliestOutreach = findEarliestDispatchDate(auditLeads);

  let videosVerified: number | undefined;
  let storiesPosted: number | undefined;
  let reelsPosted: number | undefined;
  let warmupCompleted: number | undefined;
  let warmupTarget: number | undefined;
  let warmupPercentage: number | undefined;
  let notes: string | undefined;

  if (typeof completedCountOrDetails === 'object') {
    videosVerified = completedCountOrDetails.videosVerified ?? getVideosVerifiedTodayCount();
    storiesPosted = completedCountOrDetails.storiesPosted;
    reelsPosted = completedCountOrDetails.reelsPosted;
    warmupCompleted = completedCountOrDetails.warmupCompleted;
    warmupTarget = completedCountOrDetails.warmupTarget;
    warmupPercentage = completedCountOrDetails.warmupPercentage;
    notes = completedCountOrDetails.notes;
  } else {
    void legacyRemainingDue;
    videosVerified = getVideosVerifiedTodayCount();
    notes = legacyNotes;
  }

  const entry = buildAuditedHistoryRecord(todayStr, score, earliestOutreach, {
    videosVerified,
    storiesPosted,
    reelsPosted,
    warmupCompleted,
    warmupTarget,
    warmupPercentage:
      warmupPercentage !== undefined
        ? warmupPercentage
        : warmupTarget !== undefined && warmupTarget > 0
        ? Math.min(100, Math.round(((warmupCompleted || 0) / warmupTarget) * 100))
        : undefined,
    notes,
    updatedAt: new Date().toISOString(),
  });

  const records = loadDailyHistory(auditLeads);
  const existingIdx = records.findIndex((r) => r.date === todayStr);

  if (existingIdx >= 0) {
    records[existingIdx] = entry;
  } else {
    records.unshift(entry);
  }

  saveDailyHistory(records);
  return records;
}

/**
 * Helper to calculate days offset from today (e.g. -1 for yesterday).
 */
export function getDateOffset(daysFromToday: number): string {
  const now = new Date();
  now.setDate(now.getDate() + daysFromToday);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface CalculateStreaksOptions {
  leads?: ChannelLead[];
  todayDmsSent?: number;
  todayVideosVerified?: number;
  todayReelsPosted?: number;
  todayStoriesPosted?: number;
}

/**
 * Delegates streak calculation to the Auditable Streak Manager:
 * - Protected/Active ONLY when execution score >= 70% (or user-defined threshold in settings).
 * - Days <70% pause/flag streak as "At Risk" and never masquerade as green 100% days.
 * - Sunday Rest Days & Frozen Days remain auto-protected at 100%.
 */
export function calculateStreaks(
  records: DailyHistoryRecord[],
  options?: CalculateStreaksOptions
): HistoryStreakStats {
  return evaluateStreakStats(records, options);
}

/**
 * Builds the complete 30-day auditable history view window (today back to 29 days ago).
 * Every date is freshly reconciled with calculateDailyExecutionScore so historical records
 * and the 30-day calendar matrix strictly reflect actual verified dispatches vs daily quota.
 */
export function get30DayHistoryView(
  records: DailyHistoryRecord[],
  leads?: ChannelLead[]
): DailyHistoryRecord[] {
  const auditLeads = leads !== undefined ? leads : loadAllAuditLeads();
  const quota = getQuotaSettings();

  const mapByDate = new Map<string, DailyHistoryRecord>();
  for (const r of records) {
    mapByDate.set(r.date, r);
  }

  const earliestDate = findEarliestDispatchDate(auditLeads, records);
  const result: DailyHistoryRecord[] = [];

  for (let i = 0; i < 30; i++) {
    const dateStr = getDateOffset(-i);
    const existing = mapByDate.get(dateStr);
    const score = calculateDailyExecutionScore(dateStr, auditLeads, quota);

    // If lead array wasn't complete for an archived past date that recorded verified dispatches,
    // still enforce expectedQuota normalization on that stored actual count.
    if (
      score.actual === 0 &&
      !score.isRestDay &&
      !score.isFrozen &&
      existing &&
      (existing.actualDispatched ?? existing.dmsSent ?? 0) > 0 &&
      leads === undefined
    ) {
      const preservedActual = existing.actualDispatched ?? existing.dmsSent;
      const expected = quota.dailyQuota;
      const pct = expected > 0 ? Math.min(100, Math.round((preservedActual / expected) * 100)) : 100;
      const fallbackScore: DailyExecutionScore = {
        ...score,
        actual: preservedActual,
        expected,
        percentage: pct,
        tier: pct >= 90 ? 'elite' : pct >= quota.streakThreshold ? 'partial' : 'critical',
        shortfallReason:
          preservedActual >= expected
            ? `Quota met: ${preservedActual}/${expected} dispatches`
            : `Expected ${expected} daily dispatches, ${preservedActual} logged`,
      };
      result.push(buildAuditedHistoryRecord(dateStr, fallbackScore, earliestDate, existing));
      continue;
    }

    result.push(buildAuditedHistoryRecord(dateStr, score, earliestDate, existing));
  }

  return result;
}

/**
 * Clears all daily history cleanly to 0 without mock data.
 */
export function resetDailyHistory(): DailyHistoryRecord[] {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    localStorage.removeItem('crm_daily_history');
    localStorage.removeItem('outreach_daily_history');
  } catch (err) {
    console.error('Failed to reset daily history:', err);
  }
  return [];
}
