import { DeletionLogEntry, MultiChannelType } from '../types';
import { getLocalTodayDateString } from './dispatchLog';

export const DELETION_LOG_STORAGE_KEY = 'ridge_deletion_log';

export function loadDeletionLog(): DeletionLogEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(DELETION_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load ridge_deletion_log:', err);
    return [];
  }
}

export function appendDeletionLog(
  input: Omit<DeletionLogEntry, 'id' | 'timestamp' | 'localDate'> & {
    timestamp?: string;
    localDate?: string;
  }
): DeletionLogEntry {
  const existing = loadDeletionLog();
  const timestamp = input.timestamp || new Date().toISOString();
  const localDate = input.localDate || getLocalTodayDateString();

  const entry: DeletionLogEntry = {
    id: `del_${localDate}_${input.leadId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    leadId: input.leadId,
    leadName: input.leadName,
    channel: input.channel as MultiChannelType,
    action: input.action,
    reason: input.reason,
    timestamp,
    localDate,
    hadSentHistory: Boolean(input.hadSentHistory),
  };

  existing.unshift(entry);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DELETION_LOG_STORAGE_KEY, JSON.stringify(existing));
    }
  } catch (err) {
    console.error('Failed to persist ridge_deletion_log:', err);
  }
  return entry;
}
