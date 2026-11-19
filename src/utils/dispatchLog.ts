import {
  ChannelLead,
  DispatchChannel,
  DispatchLogEntry,
  DispatchSource,
  DispatchStep,
} from '../types';

export const DISPATCH_LOG_STORAGE_KEY = 'ridge_dispatch_log';

/**
 * Canonical lead name normalizer shared with duplicate detection and dispatch deduping.
 * Strips diacritics, pipe/parenthetical location notes, city suffixes, punctuation, and extra spaces.
 */
export function canonicalizeLeadName(rawName?: string | null): string {
  if (!rawName || typeof rawName !== 'string') return '';
  let str = rawName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (!str) return '';

  // Remove parenthetical tags e.g. "(River Park/IUSB)", "(Downtown)"
  str = str.replace(/\([^)]*\)/g, ' ');
  // Remove trailing pipe metadata e.g. "| Italian", "| Fine Dining"
  str = str.replace(/\|.*$/g, ' ');
  // Normalize possessive / ampersand
  str = str.replace(/&/g, ' and ').replace(/['’]s\b/g, 's');
  // Strip remaining punctuation
  str = str.replace(/[^a-z0-9\s]/g, ' ');
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Strictly converts any timestamp or date string into local calendar YYYY-MM-DD
 * using local getters (.getFullYear(), .getMonth(), .getDate()). Never uses .toISOString().split('T')[0].
 */
export function toLocalDateString(rawInput?: string | null): string | null {
  if (!rawInput) return null;
  const trimmed = String(rawInput).trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.includes('T') || trimmed.includes(':') || trimmed.includes('Z')) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const mdy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (mdy) {
    const m = String(parseInt(mdy[1], 10)).padStart(2, '0');
    const d = String(parseInt(mdy[2], 10)).padStart(2, '0');
    return `${mdy[3]}-${m}-${d}`;
  }

  const ymd = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymd) {
    const m = String(parseInt(ymd[2], 10)).padStart(2, '0');
    const d = String(parseInt(ymd[3], 10)).padStart(2, '0');
    return `${ymd[1]}-${m}-${d}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

export function getLocalTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Loads all immutable dispatch log entries from localStorage.
 * APPEND-ONLY STORE: This module intentionally exposes ZERO delete/prune/clear functions.
 */
export function loadDispatchLog(): DispatchLogEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(DISPATCH_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DispatchLogEntry =>
        Boolean(item && typeof item === 'object' && item.leadId && item.step && item.localDate)
    );
  } catch (err) {
    console.error('Failed to load ridge_dispatch_log:', err);
    return [];
  }
}

function saveDispatchLogInternal(entries: DispatchLogEntry[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DISPATCH_LOG_STORAGE_KEY, JSON.stringify(entries));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ridge_dispatch_log_changed', { detail: { count: entries.length } }));
    }
  } catch (err) {
    console.error('Failed to persist ridge_dispatch_log:', err);
  }
}

function isEntryDuplicate(
  existing: DispatchLogEntry[],
  leadId: string,
  leadName: string,
  step: DispatchStep,
  localDate: string
): DispatchLogEntry | undefined {
  const normName = canonicalizeLeadName(leadName);
  return existing.find((e) => {
    if (e.step !== step || e.localDate !== localDate) return false;
    if (e.leadId === leadId) return true;
    const existingNorm = canonicalizeLeadName(e.leadName);
    return Boolean(normName && existingNorm && normName === existingNorm);
  });
}

export interface AppendDispatchInput {
  id?: string;
  leadId: string;
  leadName: string;
  channel: DispatchChannel;
  step: DispatchStep;
  localDate?: string;
  timestamp?: string;
  source?: DispatchSource;
}

/**
 * Appends a verified dispatch entry to 'ridge_dispatch_log' if not already logged
 * for the same (leadId, step, localDate) or (normalizedLeadName, step, localDate).
 */
export function appendDispatchEntry(input: AppendDispatchInput): {
  added: boolean;
  entry: DispatchLogEntry;
} {
  const existing = loadDispatchLog();
  const timestamp = input.timestamp || new Date().toISOString();
  const localDate =
    toLocalDateString(input.localDate) ||
    toLocalDateString(timestamp) ||
    getLocalTodayDateString();

  const dup = isEntryDuplicate(existing, input.leadId, input.leadName, input.step, localDate);
  if (dup) {
    return { added: false, entry: dup };
  }

  const entry: DispatchLogEntry = {
    id:
      input.id ||
      `dsp_${localDate}_${input.leadId}_${input.step}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    leadId: input.leadId,
    leadName: input.leadName || input.leadId,
    channel: input.channel,
    step: input.step,
    localDate,
    timestamp,
    source: input.source || 'live',
  };

  existing.push(entry);
  saveDispatchLogInternal(existing);
  return { added: true, entry };
}

/**
 * Appends multiple entries in a single localStorage write while honoring dedupe rules.
 */
export function appendDispatchEntriesBatch(inputs: AppendDispatchInput[]): {
  addedCount: number;
  totalCount: number;
} {
  if (!inputs || inputs.length === 0) {
    const current = loadDispatchLog();
    return { addedCount: 0, totalCount: current.length };
  }

  const existing = loadDispatchLog();
  let addedCount = 0;

  for (const input of inputs) {
    const timestamp = input.timestamp || new Date().toISOString();
    const localDate =
      toLocalDateString(input.localDate) ||
      toLocalDateString(timestamp) ||
      getLocalTodayDateString();

    if (isEntryDuplicate(existing, input.leadId, input.leadName, input.step, localDate)) {
      continue;
    }

    existing.push({
      id:
        input.id ||
        `dsp_${localDate}_${input.leadId}_${input.step}_${addedCount}_${Math.random().toString(36).slice(2, 6)}`,
      leadId: input.leadId,
      leadName: input.leadName || input.leadId,
      channel: input.channel,
      step: input.step,
      localDate,
      timestamp,
      source: input.source || 'live',
    });
    addedCount++;
  }

  if (addedCount > 0) {
    saveDispatchLogInternal(existing);
  }

  return { addedCount, totalCount: existing.length };
}

export function resolveLeadDispatchChannel(lead: ChannelLead): DispatchChannel {
  if (lead.channel === 'instagram' || (lead.instagram && lead.instagram.trim().length > 0)) {
    return 'instagram';
  }
  if (lead.channel === 'facebook' || (lead.facebook && !lead.email && !lead.fb_message_restricted)) {
    return 'facebook';
  }
  return 'email';
}

/**
 * Idempotently backfills 'ridge_dispatch_log' from an array of leads (active + Backstage).
 * Inspects initialSentDate, dmSent+dmSentAt, dispatchedAt, dispatchDate+'sent'|'dispatched',
 * followup1SentDate, followup2SentDate, followup3SentDate.
 */
export function backfillDispatchLogFromLeads(leads: ChannelLead[]): {
  addedCount: number;
  totalCount: number;
} {
  const candidates: AppendDispatchInput[] = [];

  for (const lead of leads) {
    if (!lead || !lead.id) continue;
    const channel = resolveLeadDispatchChannel(lead);
    const leadName = lead.name || lead.id;

    // D0 Initial Dispatch
    const d0Raw =
      lead.initialSentDate ||
      (lead.dmSent ? lead.dmSentAt : undefined) ||
      (lead.status === 'sent' || lead.status === 'dispatched'
        ? lead.dispatchDate || lead.dispatchedAt
        : undefined) ||
      (!lead.followup1SentDate && !lead.followup2SentDate && !lead.followup3SentDate
        ? lead.dispatchedAt
        : undefined);

    const d0Date = toLocalDateString(d0Raw);
    if (d0Date) {
      candidates.push({
        leadId: lead.id,
        leadName,
        channel,
        step: 'D0',
        localDate: d0Date,
        timestamp: lead.dispatchedAt || lead.dmSentAt || `${d0Date}T12:00:00`,
        source: 'backfill',
      });
    }

    // D4 Follow-Up
    const d4Date = toLocalDateString(lead.followup1SentDate);
    if (d4Date) {
      candidates.push({
        leadId: lead.id,
        leadName,
        channel,
        step: 'D4',
        localDate: d4Date,
        timestamp: `${d4Date}T12:00:00`,
        source: 'backfill',
      });
    }

    // D8 Follow-Up
    const d8Date = toLocalDateString(lead.followup2SentDate);
    if (d8Date) {
      candidates.push({
        leadId: lead.id,
        leadName,
        channel,
        step: 'D8',
        localDate: d8Date,
        timestamp: `${d8Date}T12:00:00`,
        source: 'backfill',
      });
    }

    // D14 Follow-Up
    const d14Date = toLocalDateString(lead.followup3SentDate);
    if (d14Date) {
      candidates.push({
        leadId: lead.id,
        leadName,
        channel,
        step: 'D14',
        localDate: d14Date,
        timestamp: `${d14Date}T12:00:00`,
        source: 'backfill',
      });
    }
  }

  return appendDispatchEntriesBatch(candidates);
}

export function getDispatchEntriesForDate(dateStr: string): DispatchLogEntry[] {
  const norm = toLocalDateString(dateStr) || dateStr;
  return loadDispatchLog().filter((e) => e.localDate === norm);
}

export function countDispatches(dateStr: string): number {
  return getDispatchEntriesForDate(dateStr).length;
}

export function countDispatchesByStep(dateStr: string): {
  D0: number;
  D4: number;
  D8: number;
  D14: number;
  total: number;
} {
  const entries = getDispatchEntriesForDate(dateStr);
  let D0 = 0;
  let D4 = 0;
  let D8 = 0;
  let D14 = 0;

  for (const e of entries) {
    if (e.step === 'D0') D0++;
    else if (e.step === 'D4') D4++;
    else if (e.step === 'D8') D8++;
    else if (e.step === 'D14') D14++;
  }

  return { D0, D4, D8, D14, total: entries.length };
}

export function countDispatchesByChannel(
  dateStr: string,
  step?: DispatchStep
): {
  instagram: number;
  combined: number;
  email: number;
  facebook: number;
  total: number;
} {
  const entries = getDispatchEntriesForDate(dateStr).filter((e) =>
    step ? e.step === step : true
  );
  let instagram = 0;
  let email = 0;
  let facebook = 0;

  for (const e of entries) {
    if (e.channel === 'instagram') instagram++;
    else if (e.channel === 'facebook') facebook++;
    else email++;
  }

  return {
    instagram,
    combined: email + facebook,
    email,
    facebook,
    total: entries.length,
  };
}

export interface ReconcileNovDispatchOptions {
  /** Canonical business names of backdated leads -> their exact D0 date */
  backdatedD0ByName: Record<string, string>;
  /** Exact D4 date for cohorts whose D4 already occurred (Nov 12-14 -> Nov 16-18) */
  backdatedD4ByName: Record<string, string>;
  /** Entries to guarantee are present after pruning stale/misdated entries */
  verifiedEntries: AppendDispatchInput[];
}

/**
 * Reconciles 'ridge_dispatch_log' for the Nov 12–19, 2026 recovery:
 * - Strips outdated 'legacy-2026-11-*' / 'restore_*' reconstruction rows that used wrong baseline counts
 * - Strips misdated entries for backdated Combined leads (e.g. erroneously logged on 11/19 or 11/20)
 * - Preserves all real Instagram and legitimate non-stale entries untouched
 * - Upserts the verified Nov 12–19 entries idempotently
 */
export function reconcileNovDispatchLog(options: ReconcileNovDispatchOptions): {
  removedCount: number;
  addedCount: number;
  totalCount: number;
} {
  const existing = loadDispatchLog();
  const { backdatedD0ByName, backdatedD4ByName, verifiedEntries } = options;

  const filtered = existing.filter((entry) => {
    const isNovWindow = entry.localDate >= '2026-11-12' && entry.localDate <= '2026-11-19';
    // Remove synthetic legacy/restore entries in Nov 12-19 from the previous faulty baseline
    if (
      isNovWindow &&
      (entry.source === 'reconstruction' ||
        entry.source === 'restore' ||
        entry.id.startsWith('legacy-2026-11-') ||
        entry.id.startsWith('restore_'))
    ) {
      return false;
    }

    // Remove misdated entries for the 21 backdated leads (e.g. manually re-added & marked sent on 11/19 or 11/20)
    const normName = canonicalizeLeadName(entry.leadName);
    if (normName && backdatedD0ByName[normName]) {
      if (entry.step === 'D0' && entry.localDate !== backdatedD0ByName[normName]) {
        return false;
      }
      if (entry.step === 'D4') {
        const expectedD4 = backdatedD4ByName[normName];
        if (!expectedD4 || entry.localDate !== expectedD4) {
          return false;
        }
      }
      if ((entry.step === 'D8' || entry.step === 'D14') && entry.localDate <= '2026-11-19') {
        return false;
      }
    }

    return true;
  });

  const removedCount = existing.length - filtered.length;
  let addedCount = 0;

  for (const input of verifiedEntries) {
    const timestamp = input.timestamp || `${input.localDate || getLocalTodayDateString()}T12:00:00`;
    const localDate =
      toLocalDateString(input.localDate) ||
      toLocalDateString(timestamp) ||
      getLocalTodayDateString();

    if (isEntryDuplicate(filtered, input.leadId, input.leadName, input.step, localDate)) {
      continue;
    }

    filtered.push({
      id:
        input.id ||
        `dsp_${localDate}_${input.leadId}_${input.step}_${addedCount}`,
      leadId: input.leadId,
      leadName: input.leadName || input.leadId,
      channel: input.channel,
      step: input.step,
      localDate,
      timestamp,
      source: input.source || 'restore',
    });
    addedCount++;
  }

  if (removedCount > 0 || addedCount > 0) {
    saveDispatchLogInternal(filtered);
  }

  return { removedCount, addedCount, totalCount: filtered.length };
}

export function getLifetimeDispatchCount(step?: DispatchStep): number {
  const all = loadDispatchLog();
  if (!step) return all.length;
  return all.filter((e) => e.step === step).length;
}

export function getEarliestDispatchLogDate(): string | null {
  const all = loadDispatchLog();
  if (all.length === 0) return null;
  let earliest = all[0].localDate;
  for (const e of all) {
    if (e.localDate && e.localDate < earliest) {
      earliest = e.localDate;
    }
  }
  return earliest || null;
}

export function findLeadDispatchHistoryByName(rawName: string): DispatchLogEntry[] {
  const target = canonicalizeLeadName(rawName);
  if (!target) return [];
  return loadDispatchLog().filter((e) => canonicalizeLeadName(e.leadName) === target);
}
