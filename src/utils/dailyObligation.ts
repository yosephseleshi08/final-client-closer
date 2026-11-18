import {
  ChannelLead,
  DailyObligationSnapshot,
  ExecutionTier,
  ObligationZeroState,
} from '../types';
import {
  countDispatches,
  countDispatchesByChannel,
  countDispatchesByStep,
  getEarliestDispatchLogDate,
  getLocalTodayDateString,
  loadDispatchLog,
  toLocalDateString,
} from './dispatchLog';
import {
  evaluateExecutionTier,
  getGradeablePercentage,
} from './executionTiers';
import {
  addLocalDays,
  BACKSTAGE_LEADS_KEY,
  COMBINED_LEADS_KEY,
  INSTAGRAM_LEADS_KEY,
  isDateFrozenDirect,
  isLocalSunday,
} from './leadLifecycle';

export const DAILY_OBLIGATIONS_STORAGE_KEY = 'ridge_daily_obligations';
const QUOTA_SETTINGS_KEY = 'outreach_execution_quota_settings_v1';

export interface QuotaConfig {
  igQuota: number;
  combinedQuota: number;
  dailyQuota: number;
  dailyCapacity: number;
  streakThreshold: number;
  streakMinPercent: number;
}

export function readQuotaConfig(): QuotaConfig {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(QUOTA_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const igQuota = Math.max(0, Math.round(Number(parsed.igQuota ?? 6)));
        const combinedQuota = Math.max(0, Math.round(Number(parsed.combinedQuota ?? 4)));
        const dailyQuota = igQuota + combinedQuota > 0 ? igQuota + combinedQuota : 10;
        const dailyCapacity = Math.max(1, Math.round(Number(parsed.dailyCapacity ?? 20)));
        const streakMinPercent = Math.min(
          100,
          Math.max(1, Math.round(Number(parsed.streakMinPercent ?? parsed.streakThreshold ?? 50)))
        );
        return {
          igQuota,
          combinedQuota,
          dailyQuota,
          dailyCapacity,
          streakThreshold: streakMinPercent,
          streakMinPercent,
        };
      }
    }
  } catch {
    // fallback to defaults
  }
  return {
    igQuota: 6,
    combinedQuota: 4,
    dailyQuota: 10,
    dailyCapacity: 20,
    streakThreshold: 50,
    streakMinPercent: 50,
  };
}

export function loadAllDailyObligations(): Record<string, DailyObligationSnapshot> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(DAILY_OBLIGATIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load ridge_daily_obligations:', err);
  }
  return {};
}

export function saveAllDailyObligations(
  map: Record<string, DailyObligationSnapshot>
): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DAILY_OBLIGATIONS_STORAGE_KEY, JSON.stringify(map));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ridge_daily_obligations_changed'));
    }
  } catch (err) {
    console.error('Failed to persist ridge_daily_obligations:', err);
  }
}

function readLeadsFromStorage(): {
  combined: ChannelLead[];
  instagram: ChannelLead[];
  backstage: ChannelLead[];
} {
  const safeParse = (key: string): ChannelLead[] => {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  return {
    combined: safeParse(COMBINED_LEADS_KEY).filter((l) => !l?.isArchived),
    instagram: safeParse(INSTAGRAM_LEADS_KEY).filter((l) => !l?.isArchived),
    backstage: safeParse(BACKSTAGE_LEADS_KEY),
  };
}

function isEmailOnlyCheck(lead: ChannelLead): boolean {
  if (lead.channel === 'instagram' || (lead.instagram && lead.instagram.trim())) return false;
  if (lead.facebook && lead.facebook.trim()) return false;
  if (lead.platformLink && /facebook\.com|fb\.com|fb\.me/i.test(lead.platformLink)) return false;
  if (lead.link && /facebook\.com|fb\.com|fb\.me/i.test(lead.link)) return false;
  return true;
}

function isWarmedBeforeDate(lead: ChannelLead, dateStr: string): boolean {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    if (localStorage.getItem('crm_warmup_manual_override_unlocked') === 'true') {
      return true;
    }
  }
  if (!lead.isWarmedUp && lead.warmupStatus !== 'warmed') return false;
  const warmedDate = toLocalDateString(lead.warmedUpAt);
  return Boolean(warmedDate && warmedDate < dateStr);
}

function countFollowupsDueForDate(leads: ChannelLead[], dateStr: string): number {
  let count = 0;
  for (const lead of leads) {
    if (!lead || lead.cadenceStatus === 'cancelled' || lead.cadenceStatus === 'completed') {
      continue;
    }
    if (lead.isCompleted || lead.leadStatus === 'replied' || lead.leadStatus === 'completed') {
      continue;
    }

    // Active OR archived with cadenceStatus === 'running' (cancelled/completed already skipped above)
    if (!lead.initialSentDate && !lead.dmSent) continue;

    const fuCount = lead.followupCount ?? 0;
    if (fuCount === 0) {
      const target = toLocalDateString(lead.followup1Date) || addLocalDays(lead.initialSentDate || dateStr, 4);
      if (target <= dateStr) count++;
    } else if (fuCount === 1) {
      const target = toLocalDateString(lead.followup2Date) || addLocalDays(lead.initialSentDate || dateStr, 8);
      if (target <= dateStr) count++;
    } else if (fuCount === 2) {
      const target = toLocalDateString(lead.followup3Date) || addLocalDays(lead.initialSentDate || dateStr, 14);
      if (target <= dateStr) count++;
    }
  }
  return count;
}

/**
 * Computes a live Model A obligation snapshot from current queue + dispatch history for an 'open' date.
 */
export function computeOpenObligationSnapshot(
  dateStr: string,
  providedLeads?: ChannelLead[],
  customQuota?: Partial<QuotaConfig>
): DailyObligationSnapshot {
  const normDate = toLocalDateString(dateStr) || getLocalTodayDateString();
  const todayStr = getLocalTodayDateString();
  const quota = { ...readQuotaConfig(), ...customQuota };
  const nowIso = new Date().toISOString();

  const isRestDay = isLocalSunday(normDate);
  const isFrozenDay =
    isDateFrozenDirect(normDate) ||
    (normDate === todayStr &&
      typeof localStorage !== 'undefined' &&
      Boolean((() => {
        try {
          const raw = localStorage.getItem('crm_pipeline_freeze_v1');
          return raw ? JSON.parse(raw)?.isFrozen : false;
        } catch {
          return false;
        }
      })()));

  if (isRestDay || isFrozenDay) {
    return {
      date: normDate,
      expectedTotal: 0,
      expectedInitialIG: 0,
      expectedInitialCombined: 0,
      expectedFollowups: 0,
      isRestDay,
      isFrozenDay,
      status: normDate < todayStr ? 'frozen' : 'open',
      frozenAt: normDate < todayStr ? nowIso : undefined,
      removedMidDay: 0,
      supplyGap: false,
      zeroState: isFrozenDay ? 'frozen' : 'rest',
      updatedAt: nowIso,
    };
  }

  let activeCombined: ChannelLead[];
  let activeInstagram: ChannelLead[];
  let backstage: ChannelLead[];

  if (providedLeads) {
    activeCombined = providedLeads.filter((l) => l.channel !== 'instagram' && !l.isArchived);
    activeInstagram = providedLeads.filter((l) => l.channel === 'instagram' && !l.isArchived);
    backstage = providedLeads.filter((l) => l.isArchived);
  } else {
    const stored = readLeadsFromStorage();
    activeCombined = stored.combined;
    activeInstagram = stored.instagram;
    backstage = stored.backstage;
  }

  // Due D0 IG leads
  const igDueCount = activeInstagram.filter((l) => {
    if (l.isCompleted || l.cadenceStatus === 'cancelled' || l.initialSentDate) return false;
    if (!l.scheduledDate) return false;
    const sd = toLocalDateString(l.scheduledDate);
    if (!sd) return false;
    if (normDate === todayStr) {
      return sd === normDate && isWarmedBeforeDate(l, normDate);
    }
    return sd === normDate;
  }).length;

  // Due D0 Combined leads (Email due <= normDate, FB due on normDate & warmed)
  const combinedDueCount = activeCombined.filter((l) => {
    if (l.isCompleted || l.cadenceStatus === 'cancelled' || l.initialSentDate) return false;
    if (!l.scheduledDate) return false;
    const sd = toLocalDateString(l.scheduledDate);
    if (!sd) return false;
    if (isEmailOnlyCheck(l)) {
      return sd <= normDate;
    }
    if (normDate === todayStr) {
      return sd === normDate && isWarmedBeforeDate(l, normDate);
    }
    return sd === normDate;
  }).length;

  const expectedInitialIG = Math.min(igDueCount, quota.igQuota);
  const expectedInitialCombined = Math.min(combinedDueCount, quota.combinedQuota);

  // Follow-ups due on active + running archived leads
  const runningBackstage = backstage.filter((l) => l.cadenceStatus !== 'cancelled');
  const allFollowupPool = [...activeCombined, ...activeInstagram, ...runningBackstage];
  const dueFollowupsPending = countFollowupsDueForDate(allFollowupPool, normDate);

  // Include follow-ups & initial sends ALREADY dispatched on normDate if computing for a day with logs
  const stepsToday = countDispatchesByStep(normDate);
  const channelCounts = countDispatchesByChannel(normDate);

  const effectiveIgInitial = Math.min(
    quota.igQuota,
    Math.max(expectedInitialIG, Math.min(quota.igQuota, channelCounts.instagram > 0 && stepsToday.D0 > 0 ? channelCounts.instagram : expectedInitialIG))
  );
  const effectiveCombinedInitial = Math.min(
    quota.combinedQuota,
    Math.max(expectedInitialCombined, Math.min(quota.combinedQuota, channelCounts.combined > 0 && stepsToday.D0 > 0 ? channelCounts.combined : expectedInitialCombined))
  );

  const totalFollowupsExpected = dueFollowupsPending + stepsToday.D4 + stepsToday.D8 + stepsToday.D14;
  const expectedTotal =
    Math.max(expectedInitialIG, effectiveIgInitial) +
    Math.max(expectedInitialCombined, effectiveCombinedInitial) +
    totalFollowupsExpected;

  const supplyGap = expectedInitialIG < quota.igQuota || expectedInitialCombined < quota.combinedQuota;

  const earliestDate = getEarliestDispatchLogDate();
  const hasAnyDispatches = countDispatches(normDate) > 0;
  let zeroState: ObligationZeroState = 'normal';

  if (expectedTotal === 0 && !hasAnyDispatches) {
    if (!earliestDate || normDate < earliestDate) {
      zeroState = 'pre_launch';
    } else {
      zeroState = 'empty';
    }
  }

  return {
    date: normDate,
    expectedTotal,
    expectedInitialIG: Math.max(expectedInitialIG, effectiveIgInitial),
    expectedInitialCombined: Math.max(expectedInitialCombined, effectiveCombinedInitial),
    expectedFollowups: totalFollowupsExpected,
    isRestDay: false,
    isFrozenDay: false,
    status: 'open',
    removedMidDay: 0,
    supplyGap,
    zeroState,
    updatedAt: nowIso,
  };
}

/**
 * Retrieves an existing snapshot for `dateStr`, or creates an 'open' snapshot.
 * Strictly respects immutability of 'locked' and 'frozen' snapshots!
 */
export function getOrCreateObligation(
  dateStr: string,
  providedLeads?: ChannelLead[],
  customQuota?: Partial<QuotaConfig>
): DailyObligationSnapshot {
  const normDate = toLocalDateString(dateStr) || getLocalTodayDateString();
  const all = loadAllDailyObligations();
  const existing = all[normDate];

  if (existing && (existing.status === 'frozen' || existing.status === 'locked')) {
    return existing;
  }

  const computed = computeOpenObligationSnapshot(normDate, providedLeads, customQuota);
  // Preserve removedMidDay if an open record had any
  if (existing && existing.removedMidDay > 0) {
    computed.removedMidDay = existing.removedMidDay;
  }
  return computed;
}

/**
 * Transitions today's snapshot from 'open' -> 'locked' upon the first dispatch of the day.
 * Once 'locked', expectedTotal never decreases for the rest of the day.
 */
export function lockObligationOnFirstDispatch(
  dateStr = getLocalTodayDateString(),
  providedLeads?: ChannelLead[]
): DailyObligationSnapshot {
  const normDate = toLocalDateString(dateStr) || getLocalTodayDateString();
  const all = loadAllDailyObligations();
  const existing = all[normDate];

  if (existing && (existing.status === 'frozen' || existing.status === 'locked')) {
    return existing;
  }

  const computed = computeOpenObligationSnapshot(normDate, providedLeads);
  const nowIso = new Date().toISOString();
  // Ensure at least the dispatches already recorded on this date are covered if queue was already empty
  const loggedTotal = countDispatches(normDate);
  const effectiveExpected =
    computed.isRestDay || computed.isFrozenDay
      ? 0
      : Math.max(computed.expectedTotal, loggedTotal);

  const locked: DailyObligationSnapshot = {
    ...computed,
    expectedTotal: effectiveExpected,
    zeroState:
      computed.isFrozenDay
        ? 'frozen'
        : computed.isRestDay
        ? 'rest'
        : effectiveExpected > 0
        ? 'normal'
        : computed.zeroState,
    status: normDate < getLocalTodayDateString() ? 'frozen' : 'locked',
    lockedAt: nowIso,
    frozenAt: normDate < getLocalTodayDateString() ? nowIso : undefined,
    updatedAt: nowIso,
  };

  all[normDate] = locked;
  saveAllDailyObligations(all);
  return locked;
}

/**
 * Records that a scheduled lead was archived or cancelled mid-day after the day locked.
 * Increments removedMidDay WITHOUT decreasing expectedTotal.
 */
export function recordMidDayRemoval(
  dateStr = getLocalTodayDateString(),
  count = 1
): DailyObligationSnapshot | null {
  const normDate = toLocalDateString(dateStr) || getLocalTodayDateString();
  const all = loadAllDailyObligations();
  const existing = all[normDate];
  if (!existing || existing.status !== 'locked') {
    return existing || null;
  }

  const updated: DailyObligationSnapshot = {
    ...existing,
    removedMidDay: (existing.removedMidDay || 0) + Math.max(1, count),
    updatedAt: new Date().toISOString(),
  };

  all[normDate] = updated;
  saveAllDailyObligations(all);
  return updated;
}

/**
 * Transitions all past working/rest/frozen snapshots (< todayStr) to 'frozen'.
 * Never overwrites an already 'frozen' snapshot!
 */
export function checkAndFreezeRolloverObligations(
  todayStr = getLocalTodayDateString()
): Record<string, DailyObligationSnapshot> {
  const normToday = toLocalDateString(todayStr) || getLocalTodayDateString();
  const all = loadAllDailyObligations();
  const nowIso = new Date().toISOString();
  let changed = false;

  // Freeze any unlocked/open past snapshot
  for (const [dateKey, snap] of Object.entries(all)) {
    if (dateKey < normToday && snap.status !== 'frozen') {
      all[dateKey] = {
        ...snap,
        status: 'frozen',
        frozenAt: snap.frozenAt || nowIso,
        updatedAt: nowIso,
      };
      changed = true;
    }
  }

  // Also ensure any past dates present in dispatchLog have a frozen snapshot
  const entries = loadDispatchLog();
  const pastDatesWithLogs = new Set<string>();
  for (const e of entries) {
    if (e.localDate && e.localDate < normToday) {
      pastDatesWithLogs.add(e.localDate);
    }
  }

  for (const dateKey of pastDatesWithLogs) {
    if (!all[dateKey]) {
      const snap = computeOpenObligationSnapshot(dateKey);
      const logged = countDispatches(dateKey);
      const quota = readQuotaConfig();
      const inferredExpected =
        snap.isRestDay || snap.isFrozenDay
          ? 0
          : Math.max(snap.expectedTotal, Math.min(logged, quota.dailyCapacity), logged);
      all[dateKey] = {
        ...snap,
        expectedTotal: inferredExpected,
        zeroState: snap.isFrozenDay ? 'frozen' : snap.isRestDay ? 'rest' : 'normal',
        status: 'frozen',
        frozenAt: nowIso,
        updatedAt: nowIso,
      };
      changed = true;
    }
  }

  if (changed) {
    saveAllDailyObligations(all);
  }
  return all;
}

export interface ObligationGradeResult {
  date: string;
  actual: number;
  expectedTotal: number;
  capacityTarget: number;
  percentage: number | null;
  tier: ExecutionTier;
  backlog: number;
  supplyGap: boolean;
  removedMidDay: number;
  isRestDay: boolean;
  isFrozenDay: boolean;
  zeroState: ObligationZeroState;
  frozen: boolean;
}

/**
 * Pure Model A grade calculation for any ObligationSnapshot + DispatchLog actual count.
 * Guarantees:
 * - Zero numerator > denominator on primary grade (capacityTarget = Math.min(expectedTotal, dailyCapacity))
 * - percentage strictly capped at 100
 * - Pre-launch & Pipeline Empty return percentage = null (not counted as Critical Miss)
 * - backlog = Math.max(0, expectedTotal - actual) exposes overflow > dailyCapacity transparently
 */
export function computeObligationGrade(
  snapshot: DailyObligationSnapshot,
  actualDispatches: number,
  customQuota?: Partial<QuotaConfig>
): ObligationGradeResult {
  const quota = { ...readQuotaConfig(), ...customQuota };
  const dailyCapacity = Math.max(1, quota.dailyCapacity);

  if (snapshot.isFrozenDay || snapshot.zeroState === 'frozen') {
    return {
      date: snapshot.date,
      actual: actualDispatches,
      expectedTotal: 0,
      capacityTarget: 0,
      percentage: 100,
      tier: 'protected',
      backlog: 0,
      supplyGap: false,
      removedMidDay: snapshot.removedMidDay || 0,
      isRestDay: false,
      isFrozenDay: true,
      zeroState: 'frozen',
      frozen: snapshot.status === 'frozen',
    };
  }

  if (snapshot.isRestDay || snapshot.zeroState === 'rest') {
    return {
      date: snapshot.date,
      actual: actualDispatches,
      expectedTotal: 0,
      capacityTarget: 0,
      percentage: 100,
      tier: 'protected',
      backlog: 0,
      supplyGap: false,
      removedMidDay: snapshot.removedMidDay || 0,
      isRestDay: true,
      isFrozenDay: false,
      zeroState: 'rest',
      frozen: snapshot.status === 'frozen',
    };
  }

  if (snapshot.zeroState === 'pre_launch') {
    return {
      date: snapshot.date,
      actual: actualDispatches,
      expectedTotal: 0,
      capacityTarget: 0,
      percentage: null,
      tier: 'pre_launch',
      backlog: 0,
      supplyGap: false,
      removedMidDay: 0,
      isRestDay: false,
      isFrozenDay: false,
      zeroState: 'pre_launch',
      frozen: snapshot.status === 'frozen',
    };
  }

  if (snapshot.expectedTotal <= 0 && actualDispatches === 0) {
    return {
      date: snapshot.date,
      actual: 0,
      expectedTotal: 0,
      capacityTarget: 0,
      percentage: null,
      tier: 'empty',
      backlog: 0,
      supplyGap: snapshot.supplyGap,
      removedMidDay: snapshot.removedMidDay || 0,
      isRestDay: false,
      isFrozenDay: false,
      zeroState: 'empty',
      frozen: snapshot.status === 'frozen',
    };
  }

  const effectiveExpected = Math.max(snapshot.expectedTotal, actualDispatches > 0 && snapshot.expectedTotal === 0 ? actualDispatches : 0);
  const capacityTarget = Math.max(1, Math.min(effectiveExpected, dailyCapacity));
  const percentage = getGradeablePercentage(actualDispatches, capacityTarget, 'normal');
  const tier = evaluateExecutionTier(percentage, {
    streakMinPercent: quota.streakMinPercent,
  });
  const backlog = Math.max(0, effectiveExpected - actualDispatches);

  return {
    date: snapshot.date,
    actual: actualDispatches,
    expectedTotal: effectiveExpected,
    capacityTarget,
    percentage,
    tier,
    backlog,
    supplyGap: Boolean(snapshot.supplyGap),
    removedMidDay: snapshot.removedMidDay || 0,
    isRestDay: false,
    isFrozenDay: false,
    zeroState: 'normal',
    frozen: snapshot.status === 'frozen',
  };
}

/**
 * Evaluates a specific date's Model A grade using immutable dispatchLog counts + obligation snapshot.
 */
export function evaluateDateObligationGrade(
  dateStr: string,
  providedLeads?: ChannelLead[],
  customQuota?: Partial<QuotaConfig>
): ObligationGradeResult {
  const normDate = toLocalDateString(dateStr) || getLocalTodayDateString();
  const snapshot = getOrCreateObligation(normDate, providedLeads, customQuota);
  const actual = countDispatches(normDate);
  return computeObligationGrade(snapshot, actual, customQuota);
}

/**
 * Wave priority sorting for Daily Queue: D14 -> D8 -> D4 -> D0.
 */
export function getLeadWaveRank(lead: ChannelLead): number {
  if (lead.initialSentDate) {
    if (lead.followupCount === 2) return 1; // D14
    if (lead.followupCount === 1) return 2; // D8
    return 3; // D4
  }
  return 4; // D0
}

export function sortLeadsByWavePriority<T extends ChannelLead>(leads: T[]): T[] {
  return [...leads].sort((a, b) => {
    const rankA = getLeadWaveRank(a);
    const rankB = getLeadWaveRank(b);
    if (rankA !== rankB) return rankA - rankB;

    // Earlier scheduled / due dates first
    const dueA =
      rankA === 1
        ? a.followup3Date
        : rankA === 2
        ? a.followup2Date
        : rankA === 3
        ? a.followup1Date
        : a.scheduledDate;
    const dueB =
      rankB === 1
        ? b.followup3Date
        : rankB === 2
        ? b.followup2Date
        : rankB === 3
        ? b.followup1Date
        : b.scheduledDate;

    const normA = toLocalDateString(dueA) || '9999-99-99';
    const normB = toLocalDateString(dueB) || '9999-99-99';
    if (normA !== normB) return normA.localeCompare(normB);

    return (a.numericId ?? 99999) - (b.numericId ?? 99999);
  });
}

/**
 * Detects 3 consecutive working days where backlog > 15 to warn operator to throttle intake.
 */
export function getIntakeThrottleWarning(
  todayStr = getLocalTodayDateString(),
  providedLeads?: ChannelLead[]
): {
  active: boolean;
  consecutiveDays: number;
  latestBacklog: number;
} {
  let workingChecked = 0;
  let consecutiveHigh = 0;
  let latestBacklog = 0;

  for (let i = 0; i < 21 && workingChecked < 3; i++) {
    const d = addLocalDays(todayStr, -i);
    const grade = evaluateDateObligationGrade(d, providedLeads);
    if (grade.isRestDay || grade.isFrozenDay || grade.zeroState === 'pre_launch') {
      continue;
    }
    workingChecked++;
    if (workingChecked === 1) {
      latestBacklog = grade.backlog;
    }
    if (grade.backlog > 15) {
      consecutiveHigh++;
    } else {
      break;
    }
  }

  return {
    active: workingChecked >= 3 && consecutiveHigh >= 3,
    consecutiveDays: consecutiveHigh,
    latestBacklog,
  };
}

/**
 * Generates strict 10-column CSV export for the 30-day obligation ledger:
 * date,expected_total,capacity_target,actual,percentage,tier,backlog,supply_gap,removed_mid_day,frozen
 */
export function exportObligationLedgerCsv(
  days = 30,
  todayStr = getLocalTodayDateString(),
  providedLeads?: ChannelLead[]
): string {
  const headers = [
    'date',
    'expected_total',
    'capacity_target',
    'actual',
    'percentage',
    'tier',
    'backlog',
    'supply_gap',
    'removed_mid_day',
    'frozen',
  ];

  const rows: string[] = [];
  for (let i = 0; i < days; i++) {
    const dateStr = addLocalDays(todayStr, -i);
    const grade = evaluateDateObligationGrade(dateStr, providedLeads);
    rows.push(
      [
        grade.date,
        grade.expectedTotal,
        grade.capacityTarget,
        grade.actual,
        grade.percentage === null ? '' : grade.percentage,
        grade.tier,
        grade.backlog,
        grade.supplyGap ? 'true' : 'false',
        grade.removedMidDay,
        grade.frozen ? 'true' : 'false',
      ].join(',')
    );
  }

  return [headers.join(','), ...rows].join('\n');
}
