import {
  ChannelLead,
  DailyHistoryRecord,
  ExecutionTier,
  HistoryStreakStats,
  ObligationZeroState,
  StreakStatus,
} from '../types';
import { addDays, getLocalTodayStr, normalizeToLocalDateStr } from './cadenceEngine';
import { loadChannelLeads } from './channelStorage';
import { loadBackstageLeads } from './backstageStorage';
import {
  countDispatchesByChannel,
  countDispatchesByStep,
  getEarliestDispatchLogDate,
  getLifetimeDispatchCount,
} from './dispatchLog';
import { evaluateDateObligationGrade } from './dailyObligation';
import { ExecutionTierMeta, getExecutionTierMeta } from './executionTiers';

export const QUOTA_SETTINGS_STORAGE_KEY = 'outreach_execution_quota_settings_v1';

export interface ExecutionQuotaSettings {
  igQuota: number;
  combinedQuota: number;
  dailyQuota: number;
  dailyCapacity: number;
  streakThreshold: number;
  streakMinPercent: number;
}

export const DEFAULT_EXECUTION_QUOTA_SETTINGS: ExecutionQuotaSettings = {
  igQuota: 6,
  combinedQuota: 4,
  dailyQuota: 10,
  dailyCapacity: 20,
  streakThreshold: 50,
  streakMinPercent: 50,
};

export interface DailyExecutionScore {
  date: string;
  actual: number;
  expected: number;
  expectedTotal: number;
  capacityTarget: number;
  backlog: number;
  supplyGap: boolean;
  removedMidDay: number;
  zeroState: ObligationZeroState;
  frozen: boolean;
  percentage: number;
  percentageOrNull: number | null;
  isRestDay: boolean;
  isFrozen: boolean;
  tier: ExecutionTier;
  igActual: number;
  igExpected: number;
  combinedActual: number;
  combinedExpected: number;
  initialCount: number;
  followupCount: number;
  shortfallReason: string;
}

export type { ExecutionTierMeta };
export { getExecutionTierMeta };

/**
 * Reads user-configured Daily Capacity, Quotas & Streak Min % from localStorage.
 * Defaults: 6 IG + 4 Combined (10/day), 20 Daily Capacity Cap, 50% Streak Min.
 */
export function getQuotaSettings(): ExecutionQuotaSettings {
  try {
    if (typeof localStorage === 'undefined') {
      return { ...DEFAULT_EXECUTION_QUOTA_SETTINGS };
    }
    const raw = localStorage.getItem(QUOTA_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_EXECUTION_QUOTA_SETTINGS };
    const parsed = JSON.parse(raw);
    const igQuota = Math.max(0, Math.round(Number(parsed.igQuota ?? 6)));
    const combinedQuota = Math.max(0, Math.round(Number(parsed.combinedQuota ?? 4)));
    const computedTotal = igQuota + combinedQuota;
    const dailyQuota =
      computedTotal > 0 ? computedTotal : Math.max(1, Math.round(Number(parsed.dailyQuota ?? 10)));
    const dailyCapacity = Math.max(1, Math.round(Number(parsed.dailyCapacity ?? 20)));
    const streakMinPercent = Math.min(
      100,
      Math.max(1, Math.round(Number(parsed.streakMinPercent ?? 50)))
    );
    return {
      igQuota,
      combinedQuota,
      dailyQuota,
      dailyCapacity,
      streakThreshold: streakMinPercent,
      streakMinPercent,
    };
  } catch {
    return { ...DEFAULT_EXECUTION_QUOTA_SETTINGS };
  }
}

/**
 * Persists Daily Capacity, Quota & Streak Min % settings and dispatches live update event.
 */
export function saveQuotaSettings(
  partial: Partial<ExecutionQuotaSettings>
): ExecutionQuotaSettings {
  const current = getQuotaSettings();
  const igQuota = Math.max(0, Math.round(partial.igQuota ?? current.igQuota));
  const combinedQuota = Math.max(0, Math.round(partial.combinedQuota ?? current.combinedQuota));
  const dailyQuota = Math.max(1, igQuota + combinedQuota);
  const dailyCapacity = Math.max(1, Math.round(partial.dailyCapacity ?? current.dailyCapacity));
  const streakMinPercent = Math.min(
    100,
    Math.max(
      1,
      Math.round(partial.streakMinPercent ?? partial.streakThreshold ?? current.streakMinPercent)
    )
  );

  const next: ExecutionQuotaSettings = {
    igQuota,
    combinedQuota,
    dailyQuota,
    dailyCapacity,
    streakThreshold: streakMinPercent,
    streakMinPercent,
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(QUOTA_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm_quota_settings_changed', { detail: next }));
    }
  } catch (err) {
    console.error('Failed to save quota settings:', err);
  }

  return next;
}

/**
 * Checks if a YYYY-MM-DD date string falls on Sunday (Rest Day).
 */
export function isSundayDateStr(dateStr: string): boolean {
  try {
    const norm = normalizeToLocalDateStr(dateStr);
    if (!norm) return false;
    const [y, m, d] = norm.split('-').map(Number);
    return new Date(y, m - 1, d).getDay() === 0;
  } catch {
    return false;
  }
}

function isWithinLocalCalendarDay(
  rawValue: string | undefined | null,
  targetDate: string,
  dayStartMs: number,
  dayEndMs: number
): boolean {
  if (!rawValue) return false;
  const trimmed = String(rawValue).trim();
  if (!trimmed) return false;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed === targetDate;
  }

  if (trimmed.includes('T') || trimmed.includes(':') || trimmed.includes('Z')) {
    const ms = new Date(trimmed).getTime();
    if (!Number.isNaN(ms)) {
      return ms >= dayStartMs && ms < dayEndMs;
    }
  }

  return normalizeToLocalDateStr(trimmed) === targetDate;
}

/**
 * Loads all active + Backstage leads for queue/backfill inspection.
 */
export function loadAllAuditLeads(): ChannelLead[] {
  const seen = new Set<string>();
  const collected: ChannelLead[] = [];

  const appendUnique = (list: ChannelLead[], fallbackChannel?: 'combined' | 'instagram') => {
    for (const lead of list) {
      if (!lead) continue;
      const ch = lead.channel === 'instagram' ? 'instagram' : fallbackChannel || lead.channel || 'combined';
      const dedupeKey = `${ch}::${lead.id}::${lead.name}::${lead.initialSentDate || lead.dispatchDate || ''}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        collected.push(lead);
      }
    }
  };

  try {
    appendUnique(loadChannelLeads('combined'), 'combined');
    appendUnique(loadChannelLeads('instagram'), 'instagram');

    if (typeof localStorage !== 'undefined') {
      for (const legacyKey of ['outreach_channel_leads_email', 'outreach_channel_leads_facebook']) {
        const raw = localStorage.getItem(legacyKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            appendUnique(parsed, 'combined');
          }
        }
      }
    }

    const backstage = loadBackstageLeads();
    appendUnique(backstage);
  } catch (err) {
    console.error('Failed to collect leads for execution audit:', err);
  }

  return collected;
}

/**
 * Resolves verified dispatch counts for a single lead on targetDate (local calendar day).
 */
export function countLeadVerifiedDispatchesOnDate(
  lead: ChannelLead,
  targetDate: string,
  dayStartMs: number,
  dayEndMs: number
): {
  total: number;
  initial: number;
  followup: number;
  isInstagram: boolean;
} {
  const isInstagram =
    lead.channel === 'instagram' ||
    Boolean(lead.instagram && lead.instagram.trim().length > 0);

  const hitInitial =
    isWithinLocalCalendarDay(lead.initialSentDate, targetDate, dayStartMs, dayEndMs) ||
    (!lead.initialSentDate &&
      Boolean(lead.dmSent) &&
      isWithinLocalCalendarDay(lead.dmSentAt, targetDate, dayStartMs, dayEndMs));

  const hitD4 = isWithinLocalCalendarDay(lead.followup1SentDate, targetDate, dayStartMs, dayEndMs);
  const hitD8 = isWithinLocalCalendarDay(lead.followup2SentDate, targetDate, dayStartMs, dayEndMs);
  const hitD14 = isWithinLocalCalendarDay(lead.followup3SentDate, targetDate, dayStartMs, dayEndMs);

  const isStatusDispatched =
    lead.status === 'dispatched' ||
    lead.status === 'sent';

  const hitDispatchField =
    (isStatusDispatched &&
      isWithinLocalCalendarDay(lead.dispatchDate, targetDate, dayStartMs, dayEndMs)) ||
    isWithinLocalCalendarDay(lead.dispatchedAt, targetDate, dayStartMs, dayEndMs);

  const followup = (hitD4 ? 1 : 0) + (hitD8 ? 1 : 0) + (hitD14 ? 1 : 0);
  let initial = hitInitial ? 1 : 0;

  if (initial === 0 && followup === 0 && hitDispatchField) {
    initial = 1;
  }

  return {
    total: initial + followup,
    initial,
    followup,
    isInstagram,
  };
}

/**
 * Model A Daily Execution Calculator:
 * Reads verified dispatches strictly from immutable 'ridge_dispatch_log'
 * and due obligation targets from immutable/locked 'ridge_daily_obligations'.
 * - Capacity-capped denominator: capacityTarget = min(expectedTotal, dailyCapacity)
 * - Percentage capped at 100% (never >100%, never numerator > denominator on primary grade)
 * - Deletion of leads NEVER alters past verified dispatch counts or snapshots.
 */
export function calculateDailyExecutionScore(
  date: string,
  providedLeads?: ChannelLead[],
  customQuotaSettings?: ExecutionQuotaSettings
): DailyExecutionScore {
  const targetDate = normalizeToLocalDateStr(date) || getLocalTodayStr();
  const quota = customQuotaSettings ?? getQuotaSettings();
  const leads = providedLeads ?? loadAllAuditLeads();

  const grade = evaluateDateObligationGrade(targetDate, leads, quota);
  const stepCounts = countDispatchesByStep(targetDate);
  const chCounts = countDispatchesByChannel(targetDate);

  const igActual = chCounts.instagram;
  const combinedActual = chCounts.combined;
  const initialCount = stepCounts.D0;
  const followupCount = stepCounts.D4 + stepCounts.D8 + stepCounts.D14;

  const isRestDay = grade.isRestDay;
  const isFrozen = grade.isFrozenDay;

  if (isFrozen) {
    return {
      date: targetDate,
      actual: grade.actual,
      expected: 0,
      expectedTotal: 0,
      capacityTarget: 0,
      backlog: 0,
      supplyGap: false,
      removedMidDay: grade.removedMidDay,
      zeroState: 'frozen',
      frozen: grade.frozen,
      percentage: 100,
      percentageOrNull: 100,
      isRestDay: false,
      isFrozen: true,
      tier: 'protected',
      igActual,
      igExpected: 0,
      combinedActual,
      combinedExpected: 0,
      initialCount,
      followupCount,
      shortfallReason: 'Pipeline Frozen · Protected 100%',
    };
  }

  if (isRestDay) {
    return {
      date: targetDate,
      actual: grade.actual,
      expected: 0,
      expectedTotal: 0,
      capacityTarget: 0,
      backlog: 0,
      supplyGap: false,
      removedMidDay: grade.removedMidDay,
      zeroState: 'rest',
      frozen: grade.frozen,
      percentage: 100,
      percentageOrNull: 100,
      isRestDay: true,
      isFrozen: false,
      tier: 'protected',
      igActual,
      igExpected: 0,
      combinedActual,
      combinedExpected: 0,
      initialCount,
      followupCount,
      shortfallReason: 'Sunday Rest Day · Protected 100%',
    };
  }

  if (grade.zeroState === 'pre_launch') {
    return {
      date: targetDate,
      actual: 0,
      expected: 0,
      expectedTotal: 0,
      capacityTarget: 0,
      backlog: 0,
      supplyGap: false,
      removedMidDay: 0,
      zeroState: 'pre_launch',
      frozen: grade.frozen,
      percentage: 0,
      percentageOrNull: null,
      isRestDay: false,
      isFrozen: false,
      tier: 'pre_launch',
      igActual: 0,
      igExpected: 0,
      combinedActual: 0,
      combinedExpected: 0,
      initialCount: 0,
      followupCount: 0,
      shortfallReason: 'Pre-Launch · No obligations scheduled yet',
    };
  }

  if (grade.zeroState === 'empty') {
    return {
      date: targetDate,
      actual: 0,
      expected: 0,
      expectedTotal: 0,
      capacityTarget: 0,
      backlog: 0,
      supplyGap: grade.supplyGap,
      removedMidDay: grade.removedMidDay,
      zeroState: 'empty',
      frozen: grade.frozen,
      percentage: 0,
      percentageOrNull: null,
      isRestDay: false,
      isFrozen: false,
      tier: 'empty',
      igActual: 0,
      igExpected: quota.igQuota,
      combinedActual: 0,
      combinedExpected: quota.combinedQuota,
      initialCount: 0,
      followupCount: 0,
      shortfallReason: 'Pipeline Empty — Refill Required',
    };
  }

  const pct = grade.percentage ?? 0;
  let shortfallReason = '';
  if (grade.actual >= grade.capacityTarget) {
    shortfallReason =
      grade.backlog > 0
        ? `Daily cap met (${grade.actual}/${grade.capacityTarget}) · ${grade.backlog} remaining in backlog`
        : `Target met: ${grade.actual}/${grade.capacityTarget} dispatches verified (IG ${igActual} · Combined ${combinedActual})`;
  } else {
    shortfallReason =
      `Verified ${grade.actual}/${grade.capacityTarget} daily target (IG ${igActual} · Combined ${combinedActual})` +
      (grade.supplyGap ? ' · Supply Gap' : '');
  }

  return {
    date: targetDate,
    actual: grade.actual,
    expected: grade.capacityTarget,
    expectedTotal: grade.expectedTotal,
    capacityTarget: grade.capacityTarget,
    backlog: grade.backlog,
    supplyGap: grade.supplyGap,
    removedMidDay: grade.removedMidDay,
    zeroState: 'normal',
    frozen: grade.frozen,
    percentage: pct,
    percentageOrNull: grade.percentage,
    isRestDay: false,
    isFrozen: false,
    tier: grade.tier,
    igActual,
    igExpected: quota.igQuota,
    combinedActual,
    combinedExpected: quota.combinedQuota,
    initialCount,
    followupCount,
    shortfallReason,
  };
}

/**
 * Extracts earliest verified dispatch date from immutable 'ridge_dispatch_log' or records/leads.
 */
export function findEarliestDispatchDate(
  leads?: ChannelLead[],
  records?: DailyHistoryRecord[]
): string | null {
  const candidates: string[] = [];
  const logEarliest = getEarliestDispatchLogDate();
  if (logEarliest) candidates.push(logEarliest);

  if (leads) {
    for (const lead of leads) {
      const possibleDates = [
        lead.initialSentDate,
        lead.dispatchDate,
        lead.dispatchedAt,
        lead.dmSent ? lead.dmSentAt : undefined,
        lead.followup1SentDate,
        lead.followup2SentDate,
        lead.followup3SentDate,
      ];
      for (const raw of possibleDates) {
        const norm = normalizeToLocalDateStr(raw);
        if (norm) candidates.push(norm);
      }
    }
  }

  if (records) {
    for (const r of records) {
      if ((r.actualDispatched ?? r.dmsSent ?? 0) > 0 && r.date) {
        candidates.push(r.date);
      }
    }
  }

  candidates.sort();
  return candidates.length > 0 ? candidates[0] : null;
}

export interface EvaluateStreakOptions {
  leads?: ChannelLead[];
  todayDmsSent?: number;
  todayVideosVerified?: number;
  todayReelsPosted?: number;
  todayStoriesPosted?: number;
  referenceDateStr?: string;
}

/**
 * Model A Auditable Streak Evaluation Engine:
 * - Evaluates streak using immutable 'ridge_dispatch_log' + 'ridge_daily_obligations'
 * - Threshold defaults to 50% (configurable in Settings)
 * - Rest days (Sundays) & Frozen days stay Protected 100% and preserve streak
 * - Pre-Launch & Pipeline Empty (percentage === null) never falsely trigger a streak break
 * - totalDMsSent returns immutable lifetime D0 count from dispatchLog (never drops on lead delete)
 */
export function evaluateStreakStats(
  records: DailyHistoryRecord[],
  options?: EvaluateStreakOptions
): HistoryStreakStats {
  const quota = getQuotaSettings();
  const minPct = quota.streakMinPercent;
  const todayStr = options?.referenceDateStr || getLocalTodayStr();
  const leads = options?.leads ?? loadAllAuditLeads();

  const todayScore = calculateDailyExecutionScore(todayStr, leads, quota);
  const lifetimeD0Count = getLifetimeDispatchCount('D0');
  const earliestDate = findEarliestDispatchDate(leads, records);

  if (!earliestDate && todayScore.actual === 0 && lifetimeD0Count === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      completedDaysCount: 0,
      protectedDaysCount: 0,
      averageCompletionRate: 0,
      totalDMsSent: 0,
      streakStatus: 'ready',
      streakThreshold: minPct,
      videosVerifiedToday: options?.todayVideosVerified ?? 0,
      storiesPostedToday: options?.todayStoriesPosted ?? 0,
      reelsPostedToday: options?.todayReelsPosted ?? 0,
    };
  }

  const startBound = earliestDate && earliestDate <= todayStr ? earliestDate : todayStr;
  const isTodayProtected = todayScore.isRestDay || todayScore.isFrozen;
  const isTodayQualified =
    !isTodayProtected &&
    todayScore.percentageOrNull !== null &&
    todayScore.percentage >= minPct;

  let runningStreak = 0;
  let bestStreak = 0;
  let consecutiveMisses = 0;
  let pausedAtRiskDate: string | null = null;
  let pausedAtRiskPct: number | null = null;

  let cursor = startBound;
  let guard = 0;
  while (cursor <= todayStr && guard < 400) {
    guard++;
    const isTodayCursor = cursor === todayStr;
    const score = calculateDailyExecutionScore(cursor, leads, quota);

    if (score.isRestDay || score.isFrozen || score.zeroState === 'pre_launch' || score.zeroState === 'empty') {
      cursor = addDays(cursor, 1);
      continue;
    }

    if (score.percentageOrNull !== null && score.percentage >= minPct) {
      runningStreak += 1;
      consecutiveMisses = 0;
      pausedAtRiskDate = null;
      pausedAtRiskPct = null;
      if (runningStreak > bestStreak) {
        bestStreak = runningStreak;
      }
    } else if (!isTodayCursor) {
      consecutiveMisses += 1;
      if (consecutiveMisses === 1 && runningStreak > 0) {
        pausedAtRiskDate = cursor;
        pausedAtRiskPct = score.percentage;
      } else {
        runningStreak = 0;
        pausedAtRiskDate = cursor;
        pausedAtRiskPct = score.percentage;
      }
    }
    cursor = addDays(cursor, 1);
  }

  let streakStatus: StreakStatus;
  let atRiskReason: string | undefined;

  if (isTodayProtected) {
    streakStatus = pausedAtRiskDate ? 'at_risk' : 'protected';
    if (pausedAtRiskDate) {
      atRiskReason = `Paused · ${pausedAtRiskDate} scored ${pausedAtRiskPct}% (<${minPct}% threshold)`;
    }
  } else if (todayScore.zeroState === 'empty') {
    streakStatus = runningStreak > 0 ? 'in_progress' : 'ready';
    atRiskReason = 'Pipeline Empty — Refill Required to continue dispatches';
  } else if (isTodayQualified) {
    streakStatus = 'active';
  } else if (pausedAtRiskDate) {
    streakStatus = consecutiveMisses >= 2 ? 'broken' : 'at_risk';
    atRiskReason =
      consecutiveMisses >= 2
        ? `Broken · Consecutive <${minPct}% days (latest ${pausedAtRiskDate}: ${pausedAtRiskPct}%)`
        : `At Risk · ${pausedAtRiskDate} scored ${pausedAtRiskPct}% (<${minPct}% threshold)`;
  } else if (todayScore.actual > 0 && todayScore.percentage < minPct) {
    streakStatus = 'at_risk';
    atRiskReason = `Today at ${todayScore.percentage}% (${todayScore.actual}/${todayScore.capacityTarget}) — reach ${minPct}%+ to lock streak day`;
  } else if (runningStreak > 0) {
    streakStatus = 'in_progress';
  } else {
    streakStatus = 'at_risk';
    atRiskReason = `0/${todayScore.capacityTarget} dispatched today — reach ${minPct}%+ to activate streak`;
  }

  let totalPercentages = 0;
  let activeDaysEvaluated = 0;
  let completedDaysCount = 0;
  let protectedDaysCount = 0;

  for (let i = 0; i < 30; i++) {
    const dateStr = addDays(todayStr, -i);
    const isPreLaunch = !earliestDate || dateStr < earliestDate;
    if (isPreLaunch) continue;

    const score = calculateDailyExecutionScore(dateStr, leads, quota);
    if (score.isRestDay || score.isFrozen || score.zeroState === 'pre_launch' || score.zeroState === 'empty') {
      continue;
    }
    if (score.percentageOrNull !== null) {
      totalPercentages += score.percentage;
      activeDaysEvaluated++;
      if (score.percentage >= 90) completedDaysCount++;
      if (score.percentage >= minPct) protectedDaysCount++;
    }
  }

  const averageCompletionRate =
    activeDaysEvaluated > 0 ? Math.round(totalPercentages / activeDaysEvaluated) : 0;

  return {
    currentStreak: runningStreak,
    bestStreak,
    completedDaysCount,
    protectedDaysCount,
    averageCompletionRate,
    totalDMsSent: lifetimeD0Count,
    streakStatus,
    streakThreshold: minPct,
    atRiskReason,
    videosVerifiedToday: options?.todayVideosVerified ?? 0,
    storiesPostedToday: options?.todayStoriesPosted ?? 0,
    reelsPostedToday: options?.todayReelsPosted ?? 0,
  };
}
