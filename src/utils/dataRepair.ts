import { ChannelLead } from '../types';

export const EMAIL_EXTRACT_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Common scraper icon/label prefixes that get prepended to email strings (sometimes without a space)
const SCRAPER_PREFIX_REGEX =
  /^(?:mailto:|map\s*marker\s*pin\s*|map-marker-pin\s*|map\s*pin\s*|location\s*pin\s*|pin\s*icon\s*|email\s*icon\s*|envelope\s*icon\s*|e-?mail\s*:?\s*|contact\s*:?\s*|mail\s*:?\s*|globe\s*icon\s*)+/i;

/**
 * Strips leading scraper garbage text (e.g., "map marker pincaminocle@gmail.com", "email: foo@bar.com")
 * and extracts a valid email address if present. Returns null if no valid email exists.
 */
export function extractCleanEmail(rawValue?: string | null): string | null {
  if (!rawValue || typeof rawValue !== 'string') return null;

  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  // First strip known scraper prefixes (even when concatenated without a space, e.g. "map marker pincaminocle@gmail.com")
  const withoutPrefixes = trimmed.replace(SCRAPER_PREFIX_REGEX, '').trim();

  // Extract valid email using standard RFC-like email pattern
  const match = withoutPrefixes.match(EMAIL_EXTRACT_REGEX);
  if (match && match[0]) {
    return match[0].toLowerCase();
  }

  // Fallback check on original trimmed string in case prefix wasn't at start
  const fallbackMatch = trimmed.match(EMAIL_EXTRACT_REGEX);
  if (fallbackMatch && fallbackMatch[0]) {
    return fallbackMatch[0].toLowerCase();
  }

  return null;
}

/**
 * Inspects and cleans email fields on a single lead without deleting the lead
 * or modifying any saved cadence/sequence messages.
 */
export function repairSingleLeadEmail<T extends Partial<ChannelLead> & Record<string, any>>(
  lead: T
): { repairedLead: T; wasCleaned: boolean; isInvalid: boolean } {
  if (!lead || typeof lead !== 'object') {
    return { repairedLead: lead, wasCleaned: false, isInvalid: false };
  }

  const isPlaceholder = (val: string) =>
    ['-', '--', 'n/a', 'na', 'none', 'null', 'undefined'].includes(val.trim().toLowerCase());

  // Gather candidate email values (ignoring empty/placeholder values like "-")
  const rawExplicitEmail = typeof lead.email === 'string' ? lead.email.trim() : '';
  const explicitEmail = rawExplicitEmail && !isPlaceholder(rawExplicitEmail) ? rawExplicitEmail : '';
  const rawDetailsEmailRaw =
    lead.rawDetails && typeof lead.rawDetails.email === 'string'
      ? lead.rawDetails.email.trim()
      : '';
  const rawDetailsEmail = rawDetailsEmailRaw && !isPlaceholder(rawDetailsEmailRaw) ? rawDetailsEmailRaw : '';
  const linkStr = typeof lead.link === 'string' ? lead.link.trim() : '';
  const platformLinkStr = typeof lead.platformLink === 'string' ? lead.platformLink.trim() : '';

  const linkLooksLikeEmail =
    !linkStr.includes('instagram.com') &&
    !linkStr.includes('facebook.com') &&
    !linkStr.includes('fb.com') &&
    (linkStr.includes('@') || linkStr.toLowerCase().startsWith('mailto:') || lead.channel === 'email');

  const platformLinkLooksLikeEmail =
    !platformLinkStr.includes('instagram.com') &&
    !platformLinkStr.includes('facebook.com') &&
    !platformLinkStr.includes('fb.com') &&
    (platformLinkStr.includes('@') || platformLinkStr.toLowerCase().startsWith('mailto:'));

  const isIgLead = lead.channel === 'instagram';
  const hasAnyEmailField =
    !isIgLead &&
    Boolean(explicitEmail || rawDetailsEmail || linkLooksLikeEmail || platformLinkLooksLikeEmail);

  // If lead is Instagram or has no meaningful email data, clear any false hasInvalidEmail flag
  if (!hasAnyEmailField) {
    if (lead.hasInvalidEmail) {
      return {
        repairedLead: { ...lead, hasInvalidEmail: false },
        wasCleaned: true,
        isInvalid: false,
      };
    }
    return { repairedLead: lead, wasCleaned: false, isInvalid: false };
  }

  // Try extracting a clean email from explicit email first, then rawDetails, then link fields
  const cleanEmail =
    extractCleanEmail(explicitEmail) ||
    extractCleanEmail(rawDetailsEmail) ||
    (linkLooksLikeEmail ? extractCleanEmail(linkStr) : null) ||
    (platformLinkLooksLikeEmail ? extractCleanEmail(platformLinkStr) : null);

  if (!cleanEmail) {
    // Corrupted / unfixable email: preserve lead and messages without showing table warning badges
    const alreadyFlagged = lead.hasInvalidEmail === true;
    return {
      repairedLead: alreadyFlagged ? lead : { ...lead, hasInvalidEmail: true },
      wasCleaned: !alreadyFlagged,
      isInvalid: true,
    };
  }

  let changed = false;
  const nextLead: any = { ...lead };

  if (explicitEmail && explicitEmail !== cleanEmail) {
    nextLead.email = cleanEmail;
    changed = true;
  } else if (!explicitEmail && cleanEmail && (linkLooksLikeEmail || rawDetailsEmail)) {
    nextLead.email = cleanEmail;
    changed = true;
  }

  if (nextLead.hasInvalidEmail) {
    nextLead.hasInvalidEmail = false;
    changed = true;
  }

  if (linkLooksLikeEmail && linkStr && linkStr !== cleanEmail) {
    nextLead.link = cleanEmail;
    changed = true;
  }

  if (platformLinkLooksLikeEmail && platformLinkStr && platformLinkStr !== cleanEmail) {
    nextLead.platformLink = cleanEmail;
    changed = true;
  }

  if (nextLead.rawDetails && typeof nextLead.rawDetails.email === 'string' && nextLead.rawDetails.email !== cleanEmail) {
    nextLead.rawDetails = {
      ...nextLead.rawDetails,
      email: cleanEmail,
    };
    changed = true;
  }

  return {
    repairedLead: nextLead as T,
    wasCleaned: changed,
    isInvalid: false,
  };
}

function normDateStr(rawInput?: string | null): string | undefined {
  if (!rawInput) return undefined;
  const str = String(rawInput).trim();
  if (!str) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  if (str.includes('T') || str.includes(':') || str.includes('Z')) {
    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const mdyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (mdyMatch) {
    const m = String(parseInt(mdyMatch[1], 10)).padStart(2, '0');
    const d = String(parseInt(mdyMatch[2], 10)).padStart(2, '0');
    return `${mdyMatch[3]}-${m}-${d}`;
  }

  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const m = String(parseInt(ymdMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
    return `${ymdMatch[1]}-${m}-${d}`;
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return undefined;
}

function addLocalCalendarDays(dateStr: string, days: number): string {
  const norm = normDateStr(dateStr);
  const parts = (norm || dateStr).split('-').map(Number);
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isFrozenOrSundayDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (new Date(y, m - 1, d).getDay() === 0) return true;
  try {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem('crm_pipeline_freeze_v1');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.frozenDates) && parsed.frozenDates.includes(dateStr)) {
      return true;
    }
    if (parsed?.isFrozen && parsed?.frozenStartDate) {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (dateStr >= parsed.frozenStartDate && dateStr <= today) {
        return true;
      }
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

function shiftOffRestDay(dateStr: string): string {
  let cursor = normDateStr(dateStr) || dateStr;
  let guard = 0;
  while (isFrozenOrSundayDate(cursor) && guard < 31) {
    cursor = addLocalCalendarDays(cursor, 1);
    guard++;
  }
  return cursor;
}

/**
 * Idempotently upgrades existing stored leads so legacy cadence fields
 * (followupDM_Day7 / followup3DM / followupDM_Day14 / followup7DM / breakupDM_Day30,
 * legacy date formats, missing initialSentDate on sent leads, and old 3/7/14 or 7/14/30
 * followup dates) are aligned with the Day 0 / Day 4 / Day 8 / Day 14 cadence without
 * ever overwriting custom user-written messages.
 */
export function normalizeExistingLeadCadence<T extends Partial<ChannelLead> & Record<string, any>>(
  lead: T
): { normalizedLead: T; wasChanged: boolean } {
  if (!lead || typeof lead !== 'object') {
    return { normalizedLead: lead, wasChanged: false };
  }

  let changed = false;
  const next: any = { ...lead };

  // 1. Sync saved sequence messages bidirectionally without overwriting custom text
  const trimStr = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

  const initMsg = trimStr(next.initialDM) || trimStr(next.customPitch) || trimStr(next.stagedDmMiniPitch);
  if (initMsg) {
    if (!trimStr(next.initialDM)) {
      next.initialDM = initMsg;
      changed = true;
    }
    if (!trimStr(next.customPitch)) {
      next.customPitch = initMsg;
      changed = true;
    }
  }

  const day4Msg = trimStr(next.followupDM_Day4) || trimStr(next.followupDM_Day7) || trimStr(next.followup3DM);
  if (day4Msg) {
    if (!trimStr(next.followupDM_Day4)) {
      next.followupDM_Day4 = day4Msg;
      changed = true;
    }
    if (!trimStr(next.followupDM_Day7)) {
      next.followupDM_Day7 = day4Msg;
      changed = true;
    }
    if (!trimStr(next.followup3DM)) {
      next.followup3DM = day4Msg;
      changed = true;
    }
  }

  const day8Msg = trimStr(next.followupDM_Day8) || trimStr(next.followupDM_Day14) || trimStr(next.followup7DM);
  if (day8Msg) {
    if (!trimStr(next.followupDM_Day8)) {
      next.followupDM_Day8 = day8Msg;
      changed = true;
    }
    if (!trimStr(next.followupDM_Day14)) {
      next.followupDM_Day14 = day8Msg;
      changed = true;
    }
    if (!trimStr(next.followup7DM)) {
      next.followup7DM = day8Msg;
      changed = true;
    }
  }

  const day14Msg = trimStr(next.breakupDM_Day14) || trimStr(next.breakupDM_Day30);
  if (day14Msg) {
    if (!trimStr(next.breakupDM_Day14)) {
      next.breakupDM_Day14 = day14Msg;
      changed = true;
    }
    if (!trimStr(next.breakupDM_Day30)) {
      next.breakupDM_Day30 = day14Msg;
      changed = true;
    }
  }

  if (!next.isSequenceConfigured && initMsg && day4Msg && day8Msg && day14Msg) {
    next.isSequenceConfigured = true;
    changed = true;
  }

  // 2. Standardize date strings on existing leads
  const dateFields = [
    'initialSentDate',
    'followup1SentDate',
    'followup2SentDate',
    'followup3SentDate',
    'scheduledDate',
    'dispatchDate',
  ] as const;

  for (const field of dateFields) {
    const raw = next[field];
    if (typeof raw === 'string' && raw.trim()) {
      const normalized = normDateStr(raw);
      if (normalized && normalized !== raw) {
        next[field] = normalized;
        changed = true;
      }
    }
  }

  // 3. Reconcile followupCount with any logged followup*SentDate
  let fuCount = typeof next.followupCount === 'number' && !Number.isNaN(next.followupCount) ? next.followupCount : 0;
  if (normDateStr(next.followup3SentDate)) {
    fuCount = Math.max(fuCount, 3);
  } else if (normDateStr(next.followup2SentDate)) {
    fuCount = Math.max(fuCount, 2);
  } else if (normDateStr(next.followup1SentDate)) {
    fuCount = Math.max(fuCount, 1);
  }

  // 4. Resolve initialSentDate & align Day 4 / Day 8 / Day 14 schedule dates on sent existing leads
  const explicitInitial = normDateStr(next.initialSentDate);
  const rawStatus = String(next.status || '').trim().toLowerCase();
  const rawLeadStatus = String(next.leadStatus || '').trim().toLowerCase();
  const normDmSentAt = normDateStr(next.dmSentAt);
  const normDispatchDate = normDateStr(next.dispatchDate);
  const normDispatchedAt = normDateStr(next.dispatchedAt);
  const normLastContact = normDateStr(next.lastContactDate);
  const normFirstContact = normDateStr(next.dateFirstContact);
  const normF1Date = normDateStr(next.followup1Date);
  const normF2Date = normDateStr(next.followup2Date);
  const normF3Date = normDateStr(next.followup3Date);
  const normF1Sent = normDateStr(next.followup1SentDate);
  const normF2Sent = normDateStr(next.followup2SentDate);
  const normF3Sent = normDateStr(next.followup3SentDate);

  const hasSentSignal = Boolean(
    explicitInitial ||
      next.dmSent ||
      rawStatus === 'dispatched' ||
      rawStatus === 'sent' ||
      rawStatus === 'mockup_sent' ||
      rawLeadStatus === 'waiting_reply' ||
      rawLeadStatus === 'seen' ||
      normDmSentAt ||
      normDispatchDate ||
      normDispatchedAt ||
      normLastContact ||
      normFirstContact ||
      normF1Date ||
      normF2Date ||
      normF3Date ||
      fuCount > 0 ||
      normF1Sent ||
      normF2Sent ||
      normF3Sent
  );

  if (hasSentSignal) {
    const inferredInitial =
      explicitInitial ||
      (fuCount > 0
        ? normDmSentAt ||
          normFirstContact ||
          (normF1Sent ? addLocalCalendarDays(normF1Sent, -4) : undefined) ||
          (normF2Sent ? addLocalCalendarDays(normF2Sent, -8) : undefined) ||
          (normF3Sent ? addLocalCalendarDays(normF3Sent, -14) : undefined) ||
          (normF1Date ? addLocalCalendarDays(normF1Date, -4) : undefined) ||
          (normF2Date ? addLocalCalendarDays(normF2Date, -8) : undefined) ||
          (normF3Date ? addLocalCalendarDays(normF3Date, -14) : undefined) ||
          normDispatchDate ||
          normDispatchedAt ||
          normLastContact
        : normDispatchDate ||
          normDmSentAt ||
          normDispatchedAt ||
          normLastContact ||
          normFirstContact ||
          (normF1Date ? addLocalCalendarDays(normF1Date, -4) : undefined) ||
          (normF2Date ? addLocalCalendarDays(normF2Date, -8) : undefined) ||
          (normF3Date ? addLocalCalendarDays(normF3Date, -14) : undefined));

    if (inferredInitial) {
      if (next.initialSentDate !== inferredInitial) {
        next.initialSentDate = inferredInitial;
        changed = true;
      }

      const expectedFu1 = shiftOffRestDay(addLocalCalendarDays(inferredInitial, 4));
      const expectedFu2 = shiftOffRestDay(addLocalCalendarDays(inferredInitial, 8));
      const expectedFu3 = shiftOffRestDay(addLocalCalendarDays(inferredInitial, 14));

      if (next.followup1Date !== expectedFu1) {
        next.followup1Date = expectedFu1;
        changed = true;
      }
      if (next.followup2Date !== expectedFu2) {
        next.followup2Date = expectedFu2;
        changed = true;
      }
      if (next.followup3Date !== expectedFu3) {
        next.followup3Date = expectedFu3;
        changed = true;
      }
    }

    if (next.followupCount !== fuCount) {
      next.followupCount = fuCount;
      changed = true;
    }

    if (next.cadenceStatus !== 'cancelled') {
      if (!next.dmSent) {
        next.dmSent = true;
        changed = true;
      }
      if (!next.status) {
        next.status = 'dispatched';
        changed = true;
      }
      if (fuCount >= 3) {
        if (!next.isCompleted) {
          next.isCompleted = true;
          changed = true;
        }
        if (next.cadenceStatus !== 'completed') {
          next.cadenceStatus = 'completed';
          changed = true;
        }
        if (next.leadStatus !== 'replied' && next.leadStatus !== 'completed') {
          next.leadStatus = 'completed';
          changed = true;
        }
      } else {
        if (!next.isCompleted && next.leadStatus !== 'replied' && next.leadStatus !== 'completed') {
          if (next.cadenceStatus !== 'running') {
            next.cadenceStatus = 'running';
            changed = true;
          }
          if (!next.leadStatus || next.leadStatus === 'not_sent') {
            next.leadStatus = next.isSeen ? 'seen' : 'waiting_reply';
            changed = true;
          }
        }
      }
    }
  }

  return {
    normalizedLead: next as T,
    wasChanged: changed,
  };
}

export interface DataRepairReport {
  totalScanned: number;
  emailsCleaned: number;
  invalidFlagged: number;
  repairedNames: string[];
  invalidNames: string[];
  timestamp: string;
}

const LEAD_STORAGE_KEYS = [
  'outreach_channel_leads_combined',
  'outreach_channel_leads_instagram',
  'outreach_channel_leads_email',
  'outreach_channel_leads_facebook',
  'outreach_backstage_leads_v1',
  'outreach_engine_lead_inbox_v1',
];

/**
 * Scans all leads stored in localStorage across all workspaces, backstage, and inbox,
 * repairs corrupted email addresses, upgrades legacy cadence fields to the 4/8/14 schedule
 * without overwriting custom messages, flags unfixable emails, and persists results.
 */
export function runDiagnosticDataRepair(dispatchEvent = true): DataRepairReport {
  let totalScanned = 0;
  let emailsCleaned = 0;
  let invalidFlagged = 0;
  const repairedNames: string[] = [];
  const invalidNames: string[] = [];
  let anyStoreUpdated = false;

  for (const key of LEAD_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;

      let storeModified = false;
      const nextList = parsed.map((item) => {
        totalScanned++;
        const { repairedLead, wasCleaned, isInvalid } = repairSingleLeadEmail(item);
        const { normalizedLead, wasChanged: cadenceChanged } =
          key === 'outreach_engine_lead_inbox_v1'
            ? { normalizedLead: repairedLead, wasChanged: false }
            : normalizeExistingLeadCadence(repairedLead);

        if (wasCleaned) {
          storeModified = true;
          if (!isInvalid) {
            emailsCleaned++;
            if (normalizedLead.name) repairedNames.push(normalizedLead.name);
          }
        }
        if (cadenceChanged) {
          storeModified = true;
        }
        if (isInvalid) {
          invalidFlagged++;
          if (normalizedLead.name) invalidNames.push(normalizedLead.name);
        }
        return normalizedLead;
      });

      if (storeModified) {
        localStorage.setItem(key, JSON.stringify(nextList));
        anyStoreUpdated = true;
      }
    } catch (err) {
      console.error(`Diagnostic data repair error on key "${key}":`, err);
    }
  }

  if (dispatchEvent && anyStoreUpdated && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm_data_repaired'));
  }

  return {
    totalScanned,
    emailsCleaned,
    invalidFlagged,
    repairedNames,
    invalidNames,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}
