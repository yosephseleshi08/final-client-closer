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

  // Gather candidate email values
  const explicitEmail = typeof lead.email === 'string' ? lead.email.trim() : '';
  const rawDetailsEmail =
    lead.rawDetails && typeof lead.rawDetails.email === 'string'
      ? lead.rawDetails.email.trim()
      : '';
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

  const hasAnyEmailField = Boolean(
    explicitEmail || rawDetailsEmail || linkLooksLikeEmail || platformLinkLooksLikeEmail
  );

  // If lead has no email-related data at all (e.g., pure Instagram or pure Facebook lead), leave untouched
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
    // Corrupted / unfixable email: flag hasInvalidEmail: true without deleting lead or touching messages
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
  'outreach_engine_lead_inbox_v1',
];

/**
 * Scans all leads stored in localStorage across all workspaces and inbox,
 * repairs corrupted email addresses (preserving all sequence messages & leads),
 * flags unfixable emails with hasInvalidEmail: true, and persists results.
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
        if (wasCleaned) {
          storeModified = true;
          if (!isInvalid) {
            emailsCleaned++;
            if (repairedLead.name) repairedNames.push(repairedLead.name);
          }
        }
        if (isInvalid) {
          invalidFlagged++;
          if (repairedLead.name) invalidNames.push(repairedLead.name);
        }
        return repairedLead;
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
