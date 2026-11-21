import { getLocalTodayStr, normalizeToLocalDateStr } from './cadenceEngine';

export const PIPELINE_FREEZE_KEY = 'crm_pipeline_freeze_v1';
const DAILY_OBLIGATIONS_KEY = 'ridge_daily_obligations';

export interface PipelineFreezeState {
  isFrozen: boolean;
  frozenAt?: string; // ISO string when freeze was activated
  frozenStartDate?: string; // YYYY-MM-DD (single frozen calendar date)
  reason?: string;
  frozenDates?: string[]; // Past YYYY-MM-DD dates that remained frozen through midnight
}

/**
 * Loads the current pipeline freeze state from localStorage.
 */
export function getPipelineFreezeState(): PipelineFreezeState {
  try {
    const raw = localStorage.getItem(PIPELINE_FREEZE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          isFrozen: Boolean(parsed.isFrozen),
          frozenAt: parsed.frozenAt,
          frozenStartDate: parsed.frozenStartDate,
          reason: parsed.reason,
          frozenDates: Array.isArray(parsed.frozenDates) ? parsed.frozenDates : [],
        };
      }
    }
  } catch (_e) {}
  return { isFrozen: false, frozenDates: [] };
}

/**
 * Saves pipeline freeze state to localStorage and dispatches reactivity events.
 */
export function savePipelineFreezeState(state: PipelineFreezeState): void {
  try {
    localStorage.setItem(PIPELINE_FREEZE_KEY, JSON.stringify(state));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pipeline_freeze_changed', { detail: state }));
      window.dispatchEvent(new CustomEvent('ridge_daily_obligations_changed'));
    }
  } catch (_e) {}
}

/**
 * If a previous calendar day was frozen via Freeze Day and never manually resumed,
 * archive that past date into frozenDates (preserving 100% Protected history) and
 * reset today's live state to active.
 */
export function finalizeExpiredDayFreeze(todayStr = getLocalTodayStr()): PipelineFreezeState {
  const current = getPipelineFreezeState();
  if (!current.isFrozen || !current.frozenStartDate || current.frozenStartDate >= todayStr) {
    return current;
  }

  const pastFrozen = new Set((current.frozenDates || []).filter((d) => d < todayStr));
  pastFrozen.add(current.frozenStartDate);

  const next: PipelineFreezeState = {
    isFrozen: false,
    frozenAt: undefined,
    frozenStartDate: undefined,
    reason: undefined,
    frozenDates: Array.from(pastFrozen).sort(),
  };

  savePipelineFreezeState(next);
  return next;
}

/**
 * Checks if TODAY is currently frozen (single-day Freeze Day).
 * Returns false automatically if an old freeze flag came from a previous calendar day.
 */
export function isPipelineFrozenNow(): boolean {
  const state = getPipelineFreezeState();
  if (!state.isFrozen) return false;
  const todayStr = getLocalTodayStr();
  if (state.frozenStartDate && state.frozenStartDate !== todayStr) {
    return false;
  }
  return true;
}

/**
 * Checks if a specific date is frozen:
 * - Today: strictly reflects live isPipelineFrozenNow() (never stale frozenDates!)
 * - Past dates (< today): preserved in frozenDates for 100% Protected History
 * - Future dates (> today): false (Freeze Day only freezes today)
 */
export function isDateFrozen(dateStr: string): boolean {
  const normalized = normalizeToLocalDateStr(dateStr);
  if (!normalized) return false;
  const todayStr = getLocalTodayStr();

  if (normalized === todayStr) {
    return isPipelineFrozenNow();
  }

  if (normalized > todayStr) {
    return false;
  }

  const state = getPipelineFreezeState();
  if (state.frozenDates && state.frozenDates.includes(normalized)) {
    return true;
  }
  if (state.isFrozen && state.frozenStartDate === normalized) {
    return true;
  }
  return false;
}

/**
 * Freezes TODAY ONLY (Freeze Day): pauses today's daily tasks, shifts D4/D8/D14
 * follow-ups forward to the next active working day, and grants 100% streak protection
 * for today until resumed or midnight rollover.
 */
export function freezePipeline(reason = 'Paused for today'): PipelineFreezeState {
  const current = getPipelineFreezeState();
  const todayStr = getLocalTodayStr();
  const nowIso = new Date().toISOString();

  // Keep only strictly past frozen dates (< todayStr); if a past day was still marked frozenStartDate, seal it too
  const pastDates = new Set((current.frozenDates || []).filter((d) => d < todayStr));
  if (current.isFrozen && current.frozenStartDate && current.frozenStartDate < todayStr) {
    pastDates.add(current.frozenStartDate);
  }

  const updated: PipelineFreezeState = {
    isFrozen: true,
    frozenAt: nowIso,
    frozenStartDate: todayStr,
    reason,
    frozenDates: Array.from(pastDates).sort(),
  };

  savePipelineFreezeState(updated);
  return updated;
}

/**
 * Unfreezes TODAY immediately so daily quotas (6 IG + 4 Combined = 10/day) and tasks wake back up.
 * Strictly strips todayStr from frozenDates so Today is NOT recorded as frozen in History
 * while preserving all past frozen days (< todayStr) as 100% Protected.
 */
export function unfreezePipeline(): PipelineFreezeState {
  const current = getPipelineFreezeState();
  const todayStr = getLocalTodayStr();

  const pastDates = new Set((current.frozenDates || []).filter((d) => d < todayStr));
  if (current.frozenStartDate && current.frozenStartDate < todayStr) {
    pastDates.add(current.frozenStartDate);
  }

  // Clear any stale frozen obligation snapshot for today so Today's Progress recalculates live
  try {
    if (typeof localStorage !== 'undefined') {
      const rawObligations = localStorage.getItem(DAILY_OBLIGATIONS_KEY);
      if (rawObligations) {
        const parsed = JSON.parse(rawObligations);
        if (
          parsed &&
          typeof parsed === 'object' &&
          parsed[todayStr] &&
          (parsed[todayStr].isFrozenDay || parsed[todayStr].zeroState === 'frozen')
        ) {
          delete parsed[todayStr];
          localStorage.setItem(DAILY_OBLIGATIONS_KEY, JSON.stringify(parsed));
        }
      }
    }
  } catch (_e) {}

  const updated: PipelineFreezeState = {
    isFrozen: false,
    frozenAt: undefined,
    frozenStartDate: undefined,
    reason: undefined,
    frozenDates: Array.from(pastDates).sort(),
  };

  savePipelineFreezeState(updated);
  return updated;
}

/**
 * Toggles Freeze Day for today.
 */
export function togglePipelineFreeze(): PipelineFreezeState {
  if (isPipelineFrozenNow()) {
    return unfreezePipeline();
  }
  return freezePipeline('Manual day pause');
}
