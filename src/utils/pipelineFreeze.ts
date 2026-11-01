import { getLocalTodayStr, normalizeToLocalDateStr } from './cadenceEngine';

export const PIPELINE_FREEZE_KEY = 'crm_pipeline_freeze_v1';

export interface PipelineFreezeState {
  isFrozen: boolean;
  frozenAt?: string; // ISO string when freeze was activated
  frozenStartDate?: string; // YYYY-MM-DD
  reason?: string;
  frozenDates?: string[]; // Array of YYYY-MM-DD dates that were frozen
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
 * Saves pipeline freeze state to localStorage and dispatches storage event for multi-tab reactivity.
 */
export function savePipelineFreezeState(state: PipelineFreezeState): void {
  try {
    localStorage.setItem(PIPELINE_FREEZE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('pipeline_freeze_changed', { detail: state }));
  } catch (_e) {}
}

/**
 * Checks if the pipeline is currently frozen.
 */
export function isPipelineFrozenNow(): boolean {
  const state = getPipelineFreezeState();
  return Boolean(state.isFrozen);
}

/**
 * Checks if a specific date was part of a frozen period.
 */
export function isDateFrozen(dateStr: string): boolean {
  const normalized = normalizeToLocalDateStr(dateStr);
  if (!normalized) return false;
  const state = getPipelineFreezeState();

  if (state.frozenDates && state.frozenDates.includes(normalized)) {
    return true;
  }

  if (state.isFrozen && state.frozenStartDate) {
    const todayStr = getLocalTodayStr();
    if (normalized >= state.frozenStartDate && normalized <= todayStr) {
      return true;
    }
  }

  return false;
}

/**
 * Freezes the pipeline: pauses all daily tasks, prevents overdue flags,
 * and grants full streak immunity until manually unfrozen.
 */
export function freezePipeline(reason = 'Paused for the week'): PipelineFreezeState {
  const current = getPipelineFreezeState();
  const todayStr = getLocalTodayStr();
  const nowIso = new Date().toISOString();

  const existingDates = new Set(current.frozenDates || []);
  existingDates.add(todayStr);

  const updated: PipelineFreezeState = {
    isFrozen: true,
    frozenAt: nowIso,
    frozenStartDate: current.frozenStartDate || todayStr,
    reason,
    frozenDates: Array.from(existingDates),
  };

  savePipelineFreezeState(updated);
  return updated;
}

/**
 * Unfreezes the pipeline so normal daily quotas and streaks resume.
 */
export function unfreezePipeline(): PipelineFreezeState {
  const current = getPipelineFreezeState();
  const todayStr = getLocalTodayStr();

  // Keep a record of the dates that were frozen for historical streak immunity
  const existingDates = new Set(current.frozenDates || []);
  if (current.frozenStartDate) {
    try {
      const [sy, sm, sd] = current.frozenStartDate.split('-').map(Number);
      const [cy, cm, cd] = todayStr.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd);
      const end = new Date(cy, cm - 1, cd);
      const cur = new Date(start);
      while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        existingDates.add(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
      }
    } catch (_e) {
      existingDates.add(todayStr);
    }
  }

  const updated: PipelineFreezeState = {
    isFrozen: false,
    frozenAt: undefined,
    frozenStartDate: undefined,
    reason: undefined,
    frozenDates: Array.from(existingDates),
  };

  savePipelineFreezeState(updated);
  return updated;
}

/**
 * Toggles the freeze state.
 */
export function togglePipelineFreeze(): PipelineFreezeState {
  if (isPipelineFrozenNow()) {
    return unfreezePipeline();
  }
  return freezePipeline('Manual week pause');
}
