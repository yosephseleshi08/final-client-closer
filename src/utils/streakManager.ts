import {
  ChannelLead,
  DailyHistoryRecord,
  ExecutionTier,
  HistoryStreakStats,
  StreakStatus,
} from '../types';
import { addDays, getLocalTodayStr, normalizeToLocalDateStr } from './cadenceEngine';
import { isDateFrozen, isPipelineFrozenNow } from './pipelineFreeze';
import { loadChannelLeads } from './channelStorage';
import { loadBackstageLeads } from './backstageStorage';

export const QUOTA_SETTINGS_STORAGE_KEY = 'outreach_execution_quota_settings_v1';

export interface ExecutionQuotaSettings {
  igQuota: number;
  combinedQuota: number;
  dailyQuota: number;
  streakThreshold: number;
}

export const DEFAULT_EXECUTION_QUOTA_SETTINGS: ExecutionQuotaSettings = {
  igQuota: 6,
  combinedQuota: 4,
  dailyQuota: 10,
  streakThreshold: 70,
};

export interface DailyExecutionScore {
  date: string;
  actual: number;
  expected: number;
  percentage: number;
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

export interface ExecutionTierMeta {
  tier: ExecutionTier;
  label: string;
  shortLabel: string;
  colorHex: string;
  dotClass: string;
  badgeClass: string;
  barClass: string;
  cardBorderClass: string;
}

/**
 * Reads user-configured Daily Quota & Streak Threshold from localStorage.
 * Defaults to 10/day (6 Instagram + 4 Combined) and 70% streak protection threshold.
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
    const dailyQuota = computedTotal > 0 ? computedTotal : Math.max(1, Math.round(Number(parsed.dailyQuota ?? 10)));
    const streakThreshold = Math.min(100, Math.max(1, Math.round(Number(parsed.streakThreshold ?? 70))));
    return {
      igQuota,
      combinedQuota,
      dailyQuota,
      streakThreshold,
    };
  } catch {
    return { ...DEFAULT_EXECUTION_QUOTA_SETTINGS };
  }
}

/**
 * Persists Daily Quota & Streak Threshold settings and dispatches a live update event.
 */
export function saveQuotaSettings(
  partial: Partial<ExecutionQuotaSettings>
): ExecutionQuotaSettings {
  const current = getQuotaSettings();
  const igQuota = Math.max(0, Math.round(partial.igQuota ?? current.igQuota));
  const combinedQuota = Math.max(0, Math.round(partial.combinedQuota ?? current.combinedQuota));
  const dailyQuota = Math.max(1, igQuota + combinedQuota);
  const streakThreshold = Math.min(
    100,
    Math.max(1, Math.round(partial.streakThreshold ?? current.streakThreshold))
  );

  const next: ExecutionQuotaSettings = {
    igQuota,
    combinedQuota,
    dailyQuota,
    streakThreshold,
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

/**
 * Checks if a timestamp or date string falls inside the local 24-hour calendar window of targetDate (YYYY-MM-DD).
 */
function isWithinLocalCalendarDay(
  rawValue: string | undefined | null,
  targetDate: string,
  dayStartMs: number,
  dayEndMs: number
): boolean {
  if (!rawValue) return false;
  const trimmed = String(rawValue).trim();
  if (!trimmed) return false;

  // Exact calendar date string without time
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed === targetDate;
  }

  // ISO timestamp / datetime string: test strictly against local 24-hour calendar window
  if (trimmed.includes('T') || trimmed.includes(':') || trimmed.includes('Z')) {
    const ms = new Date(trimmed).getTime();
    if (!Number.isNaN(ms)) {
      return ms >= dayStartMs && ms < dayEndMs;
    }
  }

  return normalizeToLocalDateStr(trimmed) === targetDate;
}

/**
 * Loads all leads across active channels + legacy storage + archived sent leads in Backstage
 * so historical audits retain verified dispatches even if a contacted lead was later archived.
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

    // Legacy standalone channel keys if still present
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

    // Include archived leads ONLY if they have verified dispatch metadata
    const backstage = loadBackstageLeads();
    const sentBackstage = backstage.filter((l) =>
      Boolean(
        l.initialSentDate ||
          l.followup1SentDate ||
          l.followup2SentDate ||
          l.followup3SentDate ||
          l.dispatchedAt ||
          l.dispatchDate ||
          l.dmSent ||
          l.status === 'dispatched' ||
          l.status === 'sent'
      )
    );
    appendUnique(sentBackstage);
  } catch (err) {
    console.error('Failed to collect leads for execution audit:', err);
  }

  return collected;
}

/**
 * Resolves verified dispatch counts for a single lead on targetDate (local calendar day).
 * Prevents double-counting when both step dates (initialSentDate) and dispatchedAt/dispatchDate exist.
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

  // Fallback for leads stamped strictly with dispatchDate + status='dispatched' or dispatchedAt
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
 * Auditable Daily Execution Calculator:
 * Completion % = (Actual Verified Dispatches / Expected Daily Quota) * 100
 * - Checks Rest Day (Sunday) / Pipeline Freeze -> expected = 0, percentage = 100
 * - Never inflates completion to 100% when scheduled tasks run out below Expected Daily Quota
 */
export function calculateDailyExecutionScore(
  date: string,
  providedLeads?: ChannelLead[],
  customQuotaSettings?: ExecutionQuotaSettings
): DailyExecutionScore {
  const targetDate = normalizeToLocalDateStr(date) || getLocalTodayStr();
  const [y, m, d] = targetDate.split('-').map(Number);
  const dayStartMs = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const dayEndMs = new Date(y, m - 1, d + 1, 0, 0, 0, 0).getTime();

  const quota = customQuotaSettings ?? getQuotaSettings();
  const isRestDay = isSundayDateStr(targetDate);
  const isFrozen =
    isDateFrozen(targetDate) ||
    (targetDate === getLocalTodayStr() && isPipelineFrozenNow());

  const leads = providedLeads ?? loadAllAuditLeads();

  let actual = 0;
  let igActual = 0;
  let combinedActual = 0;
  let initialCount = 0;
  let followupCount = 0;

  for (const lead of leads) {
    const counts = countLeadVerifiedDispatchesOnDate(lead, targetDate, dayStartMs, dayEndMs);
    if (counts.total > 0) {
      actual += counts.total;
      initialCount += counts.initial;
      followupCount += counts.followup;
      if (counts.isInstagram) {
        igActual += counts.total;
      } else {
        combinedActual += counts.total;
      }
    }
  }

  if (isRestDay || isFrozen) {
    return {
      date: targetDate,
      actual,
      expected: 0,
      percentage: 100,
      isRestDay,
      isFrozen,
      tier: 'protected',
      igActual,
      igExpected: 0,
      combinedActual,
      combinedExpected: 0,
      initialCount,
      followupCount,
      shortfallReason: isFrozen
        ? 'Pipeline Frozen · 100% Streak Protected'
        : 'Sunday Rest Day · 100% Streak Protected',
    };
  }

  const igExpected = quota.igQuota;
  const combinedExpected = quota.combinedQuota;
  const expected = quota.dailyQuota;
  const percentage = expected > 0 ? Math.min(100, Math.round((actual / expected) * 100)) : 100;

  let tier: ExecutionTier;
  if (percentage >= 90) {
    tier = 'elite';
  } else if (percentage >= quota.streakThreshold) {
    tier = 'partial';
  } else {
    tier = 'critical';
  }

  const igGap = Math.max(0, igExpected - igActual);
  const combinedGap = Math.max(0, combinedExpected - combinedActual);

  let shortfallReason = '';
  if (actual >= expected) {
    shortfallReason = `Quota met: ${actual}/${expected} verified dispatches (IG ${igActual}/${igExpected} · Combined ${combinedActual}/${combinedExpected})`;
  } else if (igGap > 0 && combinedGap > 0) {
    shortfallReason = `Expected ${igExpected} IG & ${combinedExpected} Email/FB dispatches — only ${igActual} IG & ${combinedActual} Combined verified`;
  } else if (igGap > 0) {
    shortfallReason = `Expected ${igExpected} Instagram dispatches, only ${igActual} verified`;
  } else if (combinedGap > 0) {
    shortfallReason = `Expected ${combinedExpected} Email/Combined dispatches, only ${combinedActual} verified`;
  } else {
    shortfallReason = `Verified ${actual}/${expected} total dispatches against daily quota`;
  }

  return {
    date: targetDate,
    actual,
    expected,
    percentage,
    isRestDay: false,
    isFrozen: false,
    tier,
    igActual,
    igExpected,
    combinedActual,
    combinedExpected,
    initialCount,
    followupCount,
    shortfallReason,
  };
}

/**
 * Returns the standardized 3-tier visual metadata using exact semantic palette:
 * - 90–100%: Emerald (#10B981) — "Elite Execution"
 * - 70–89%: Amber (#F59E0B) — "Partial Execution (Supply Gap)"
 * - <70%: Red (#EF4444) — "Critical Miss"
 */
export function getExecutionTierMeta(
  percentage: number,
  options?: {
    isSunday?: boolean;
    isFrozen?: boolean;
    isPreLaunch?: boolean;
    streakThreshold?: number;
  }
): ExecutionTierMeta {
  const threshold = options?.streakThreshold ?? getQuotaSettings().streakThreshold;

  if (options?.isFrozen) {
    return {
      tier: 'protected',
      label: '100% Protected (Frozen)',
      shortLabel: 'Frozen',
      colorHex: '#22D3EE',
      dotClass: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]',
      badgeClass: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
      barClass: 'bg-cyan-400',
      cardBorderClass: 'border-cyan-500/40 bg-cyan-950/30 hover:border-cyan-400/60',
    };
  }

  if (options?.isSunday) {
    return {
      tier: 'protected',
      label: '100% Protected (Rest Day)',
      shortLabel: 'Rest Day',
      colorHex: '#94A3B8',
      dotClass: 'bg-slate-400',
      badgeClass: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
      barClass: 'bg-slate-400',
      cardBorderClass: 'border-slate-700/40 bg-slate-800/30 hover:border-slate-600',
    };
  }

  if (options?.isPreLaunch) {
    return {
      tier: 'pre_launch',
      label: 'Pre-Launch',
      shortLabel: 'Pre-Launch',
      colorHex: '#475569',
      dotClass: 'bg-slate-600',
      badgeClass: 'bg-slate-900/60 text-slate-400 border-white/10',
      barClass: 'bg-slate-600',
      cardBorderClass: 'border-white/5 bg-slate-900/30 hover:border-white/10 opacity-70 hover:opacity-100',
    };
  }

  if (percentage >= 90) {
    return {
      tier: 'elite',
      label: 'Elite Execution',
      shortLabel: 'Elite',
      colorHex: '#10B981',
      dotClass: 'bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.55)]',
      badgeClass: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/35',
      barClass: 'bg-[#10B981]',
      cardBorderClass: 'border-[#10B981]/35 bg-[#10B981]/10 hover:border-[#10B981]/60',
    };
  }

  if (percentage >= threshold) {
    return {
      tier: 'partial',
      label: 'Partial Execution (Supply Gap)',
      shortLabel: 'Supply Gap',
      colorHex: '#F59E0B',
      dotClass: 'bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.45)]',
      badgeClass: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/35',
      barClass: 'bg-[#F59E0B]',
      cardBorderClass: 'border-[#F59E0B]/35 bg-[#F59E0B]/10 hover:border-[#F59E0B]/60',
    };
  }

  return {
    tier: 'critical',
    label: 'Critical Miss',
    shortLabel: 'Critical Miss',
    colorHex: '#EF4444',
    dotClass: 'bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.45)]',
    badgeClass: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/35',
    barClass: 'bg-[#EF4444]',
    cardBorderClass: 'border-[#EF4444]/35 bg-[#EF4444]/10 hover:border-[#EF4444]/60',
  };
}

/**
 * Extracts the earliest verified dispatch date across leads or history records.
 */
export function findEarliestDispatchDate(
  leads?: ChannelLead[],
  records?: DailyHistoryRecord[]
): string | null {
  const candidates: string[] = [];
  const auditLeads = leads ?? loadAllAuditLeads();

  for (const lead of auditLeads) {
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
 * Auditable Streak Evaluation Engine:
 * - Only working days scoring >= 70% (or user-defined threshold in Settings) count as Protected/Active.
 * - Rest days (Sundays) & Frozen days are 100% auto-protected and preserve the streak.
 * - If a working day drops below 70%, it NEVER registers as a 100% green day; it flags/pauses streak as "At Risk"
 *   (a single <70% miss pauses streak & warns "At Risk"; two consecutive <70% working misses reset current streak to 0).
 */
export function evaluateStreakStats(
  records: DailyHistoryRecord[],
  options?: EvaluateStreakOptions
): HistoryStreakStats {
  const quota = getQuotaSettings();
  const threshold = quota.streakThreshold;
  const todayStr = options?.referenceDateStr || getLocalTodayStr();
  const leads = options?.leads ?? loadAllAuditLeads();

  const mapByDate = new Map<string, DailyHistoryRecord>();
  for (const r of records) {
    mapByDate.set(r.date, r);
  }

  const getScoreForDate = (dateStr: string): DailyExecutionScore => {
    const score = calculateDailyExecutionScore(dateStr, leads, quota);
    if (score.actual > 0 || score.isRestDay || score.isFrozen) {
      return score;
    }
    const existing = mapByDate.get(dateStr);
    if (existing && (existing.actualDispatched ?? existing.dmsSent ?? 0) > 0) {
      const actual = existing.actualDispatched ?? existing.dmsSent;
      const expected = existing.expectedQuota ?? existing.dmsTarget ?? quota.dailyQuota;
      const pct = expected > 0 ? Math.min(100, Math.round((actual / expected) * 100)) : 100;
      return {
        ...score,
        actual,
        expected,
        percentage: pct,
        tier: pct >= 90 ? 'elite' : pct >= threshold ? 'partial' : 'critical',
      };
    }
    return score;
  };

  const todayScore = getScoreForDate(todayStr);
  const effectiveTodayActual = Math.max(todayScore.actual, options?.todayDmsSent ?? 0);
  const earliestDate = findEarliestDispatchDate(leads, records);

  if (!earliestDate && effectiveTodayActual === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      completedDaysCount: 0,
      protectedDaysCount: 0,
      averageCompletionRate: 0,
      totalDMsSent: 0,
      streakStatus: 'ready',
      streakThreshold: threshold,
      videosVerifiedToday: options?.todayVideosVerified ?? 0,
      storiesPostedToday: options?.todayStoriesPosted ?? 0,
      reelsPostedToday: options?.todayReelsPosted ?? 0,
    };
  }

  const startBound = earliestDate && earliestDate <= todayStr ? earliestDate : todayStr;
  const isTodayProtected = todayScore.isRestDay || todayScore.isFrozen;
  const isTodayQualified = !isTodayProtected && todayScore.percentage >= threshold;

  // Walk chronologically from startBound to todayStr to compute Best Streak & Current Streak state accurately
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
    const score = getScoreForDate(cursor);

    if (score.isRestDay || score.isFrozen) {
      // Rest/Frozen day: auto-protected at 100%, preserves streak cleanly
      cursor = addDays(cursor, 1);
      continue;
    }

    if (score.percentage >= threshold) {
      runningStreak += 1;
      consecutiveMisses = 0;
      pausedAtRiskDate = null;
      pausedAtRiskPct = null;
      if (runningStreak > bestStreak) {
        bestStreak = runningStreak;
      }
    } else if (!isTodayCursor) {
      // Past working day missed (<70%): first miss pauses streak & flags "At Risk";
      // second consecutive working-day miss breaks streak cleanly to 0.
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
      atRiskReason = `Paused · ${pausedAtRiskDate} scored ${pausedAtRiskPct}% (<${threshold}% threshold)`;
    }
  } else if (isTodayQualified) {
    streakStatus = 'active';
  } else if (pausedAtRiskDate) {
    streakStatus = consecutiveMisses >= 2 ? 'broken' : 'at_risk';
    atRiskReason =
      consecutiveMisses >= 2
        ? `Broken · Consecutive <${threshold}% days (latest ${pausedAtRiskDate}: ${pausedAtRiskPct}%)`
        : `At Risk · ${pausedAtRiskDate} scored ${pausedAtRiskPct}% (<${threshold}% threshold)`;
  } else if (todayScore.actual > 0 && todayScore.percentage < threshold) {
    streakStatus = 'at_risk';
    atRiskReason = `Today at ${todayScore.percentage}% (${todayScore.actual}/${todayScore.expected}) — reach ${threshold}%+ to lock streak day`;
  } else if (runningStreak > 0) {
    streakStatus = 'in_progress';
  } else {
    streakStatus = 'at_risk';
    atRiskReason = `0/${todayScore.expected} dispatched today — reach ${threshold}%+ to activate streak`;
  }

  // 30-day rolling aggregates
  let totalDispatched30 = 0;
  let totalPercentages = 0;
  let activeDaysEvaluated = 0;
  let completedDaysCount = 0;
  let protectedDaysCount = 0;

  for (let i = 0; i < 30; i++) {
    const dateStr = addDays(todayStr, -i);
    const isPreLaunch = !earliestDate || dateStr < earliestDate;
    if (isPreLaunch) continue;

    const score = getScoreForDate(dateStr);
    totalDispatched30 += score.initialCount;

    if (!score.isRestDay && !score.isFrozen) {
      totalPercentages += score.percentage;
      activeDaysEvaluated++;
      if (score.percentage >= 90) completedDaysCount++;
      if (score.percentage >= threshold) protectedDaysCount++;
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
    totalDMsSent: totalDispatched30,
    streakStatus,
    streakThreshold: threshold,
    atRiskReason,
    videosVerifiedToday: options?.todayVideosVerified ?? 0,
    storiesPostedToday: options?.todayStoriesPosted ?? 0,
    reelsPostedToday: options?.todayReelsPosted ?? 0,
  };
}
