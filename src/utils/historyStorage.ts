import {
  DailyHistoryRecord,
  DailyHistoryStatus,
  HistoryStreakStats,
  MultiChannelType,
  ChannelLead,
} from '../types';
import { getLocalTodayStr, normalizeToLocalDateStr } from './cadenceEngine';
import { getVideosVerifiedTodayCount } from './videoVerification';
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
} from './streakManager';
import { countDispatchesByChannel, countDispatchesByStep } from './dispatchLog';
import { loadAllDailyObligations } from './dailyObligation';

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

export function getEarliestOutreachDate(providedLeads?: ChannelLead[]): string | null {
  try {
    return findEarliestDispatchDate(providedLeads);
  } catch {
    return null;
  }
}

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

export function isDateStringSunday(dateStr: string): boolean {
  return isSundayDateStr(dateStr);
}

/**
 * Reads immutable dispatch counts by step/channel for a specific local date.
 */
export function getLeadsSentOnDate(dateStr: string): {
  count: number;
  initialCount: number;
  followupCount: number;
  channelBreakdown: Record<string, number>;
} {
  const normDate = normalizeToLocalDateStr(dateStr) || getLocalTodayStr();
  const steps = countDispatchesByStep(normDate);
  const channels = countDispatchesByChannel(normDate);

  return {
    count: steps.total,
    initialCount: steps.D0,
    followupCount: steps.D4 + steps.D8 + steps.D14,
    channelBreakdown: {
      combined: channels.combined,
      instagram: channels.instagram,
    },
  };
}

function buildAuditedHistoryRecord(
  dateStr: string,
  score: DailyExecutionScore,
  earliestDate: string | null,
  existing?: Partial<DailyHistoryRecord>
): DailyHistoryRecord {
  const isPreLaunch =
    score.zeroState === 'pre_launch' ||
    (!score.isFrozen &&
      !score.isRestDay &&
      score.actual === 0 &&
      score.expectedTotal === 0 &&
      (!earliestDate || dateStr < earliestDate));

  let status: DailyHistoryStatus = 'zero';
  if (score.isFrozen) {
    status = 'frozen';
  } else if (score.isRestDay) {
    status = 'sunday';
  } else if (isPreLaunch) {
    status = 'pre_launch';
  } else if (score.zeroState === 'empty') {
    status = 'empty';
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
    dmsTarget: score.capacityTarget,
    percentage: isPreLaunch || score.zeroState === 'empty' ? 0 : score.percentage,
    isSunday: score.isRestDay,
    isFrozen: score.isFrozen,
    status,
    executionTier: isPreLaunch ? 'pre_launch' : score.tier,
    actualDispatched: score.actual,
    expectedQuota: score.capacityTarget,
    expectedTotal: score.expectedTotal,
    capacityTarget: score.capacityTarget,
    backlog: score.backlog,
    supplyGap: score.supplyGap,
    removedMidDay: score.removedMidDay,
    zeroState: isPreLaunch ? 'pre_launch' : score.zeroState,
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
      ? 'Pipeline Frozen (Protected 100%)'
      : score.isRestDay
      ? 'Sunday Rest Day (Protected 100%)'
      : existing?.notes,
    updatedAt: existing?.updatedAt || new Date().toISOString(),
    initialDmsSent: score.initialCount,
    initialDmsTarget: score.capacityTarget,
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
 * Reconciles cached view records against immutable dispatchLog + dailyObligations.
 * STRICTLY skips modifying dates that already have a 'frozen' snapshot in ridge_daily_obligations.
 */
export function migrateAndBackfillHistory(
  rawRecords: DailyHistoryRecord[],
  providedLeads?: ChannelLead[]
): { records: DailyHistoryRecord[]; didMigrate: boolean } {
  const allLeads = providedLeads ?? loadAllAuditLeads();
  const earliestDate = findEarliestDispatchDate(allLeads, rawRecords);
  const quota = getQuotaSettings();
  const obligations = loadAllDailyObligations();

  let didMigrate = false;
  const migrated: DailyHistoryRecord[] = rawRecords.map((record) => {
    const score = calculateDailyExecutionScore(record.date, allLeads, quota);
    const nextRecord = buildAuditedHistoryRecord(record.date, score, earliestDate, record);
    const isObligationFrozen = obligations[record.date]?.status === 'frozen';

    if (
      !isObligationFrozen &&
      (record.dmsSent !== nextRecord.dmsSent ||
        record.dmsTarget !== nextRecord.dmsTarget ||
        record.percentage !== nextRecord.percentage ||
        record.status !== nextRecord.status ||
        record.executionTier !== nextRecord.executionTier ||
        record.expectedQuota !== nextRecord.expectedQuota ||
        record.actualDispatched !== nextRecord.actualDispatched ||
        record.shortfallReason !== nextRecord.shortfallReason)
    ) {
      didMigrate = true;
      return {
        ...nextRecord,
        updatedAt: new Date().toISOString(),
      };
    }

    return nextRecord;
  });

  return {
    records: migrated.sort((a, b) => b.date.localeCompare(a.date)),
    didMigrate,
  };
}

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

export function calculateStreaks(
  records: DailyHistoryRecord[],
  options?: CalculateStreaksOptions
): HistoryStreakStats {
  return evaluateStreakStats(records, options);
}

/**
 * Builds 30-day Model A ledger view directly from immutable 'ridge_dispatch_log'
 * and 'ridge_daily_obligations' snapshots. Deleting leads NEVER shrinks historical days.
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
    result.push(buildAuditedHistoryRecord(dateStr, score, earliestDate, existing));
  }

  return result;
}

/**
 * Clears ONLY the legacy non-authoritative view cache keys.
 * NEVER touches immutable 'ridge_dispatch_log', 'ridge_daily_obligations', or 'ridge_deletion_log'.
 */
export function resetDailyHistory(): DailyHistoryRecord[] {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    localStorage.removeItem('crm_daily_history');
  } catch (err) {
    console.error('Failed to reset legacy daily history cache:', err);
  }
  return [];
}
