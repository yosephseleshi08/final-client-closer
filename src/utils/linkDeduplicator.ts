import { Lead, RejectedLeadEntry } from '../types';
import { parseBusinessFromUrl, isGenericPlaceholderName, isBarePlatformDomain } from './linkLeadParser';

export const REJECTED_LINKS_STORAGE_KEY = 'outreach_engine_rejected_links_v1';

/**
 * Normalizes any Facebook, Google Maps, Instagram, or Website link into a canonical identifier.
 * Strips tracking parameters, protocol, m./www. subdomains, trailing slashes, and coordinates.
 */
export function normalizeLeadUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();

  // If it's an Instagram handle like @mybusiness
  if (url.startsWith('@')) {
    return `instagram.com/${url.slice(1).toLowerCase()}`;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname
      .toLowerCase()
      .replace(/^(?:[a-z0-9_-]+\.)*(?:facebook\.com|fb\.com|fb\.me)/, 'facebook.com')
      .replace(/^(?:[a-z0-9_-]+\.)*instagram\.com/, 'instagram.com')
      .replace(/^(www\.|m\.|mobile\.|web\.)/, '');
    const pathname = parsed.pathname.replace(/\/+$/, '');

    // 1. Facebook Normalization
    if (host.includes('facebook.com') || host === 'fb.me' || host === 'fb.com') {
      const parts = pathname.replace(/^\/+/, '').split('/').filter(Boolean);

      // Strip common Facebook tracking params
      const trackingParams = ['mibextid', 'rdid', 'ref', 'source', 'utm_source', 'utm_medium', 'utm_campaign', 'share_id', 'hrc', 'paipv', '_rdr', 'sk', 'locale', '_rdc', 'rdc', 'checkpoint_src', 'hc_ref'];
      trackingParams.forEach((tp) => parsed.searchParams.delete(tp));

      // Profile by ID: /profile.php?id=12345
      if (parts[0] === 'profile.php' && parsed.searchParams.get('id')) {
        return `facebook.com/profile.php?id=${parsed.searchParams.get('id')}`;
      }
      // Direct numeric profile ID: facebook.com/100094642025733/mentions
      if (/^[0-9]{5,}$/.test(parts[0])) {
        return `facebook.com/${parts[0]}`;
      }
      // If it's a pages URL: e.g. /pages/category/Category/Name-ID or /pages/Name/ID
      if (parts[0] === 'pages') {
        const nonPagesParts = parts.filter(p => !['pages', 'category', 'restaurant', 'food'].includes(p.toLowerCase()));
        if (nonPagesParts.length > 0) {
          // Use the last specific segment (the business slug or ID)
          return `facebook.com/pages/${nonPagesParts[nonPagesParts.length - 1].toLowerCase()}`;
        }
        return 'facebook.com';
      }
      // Modern /p/ format: facebook.com/p/Name-ID/
      if (parts[0] === 'p' && parts.length >= 2) {
        return `facebook.com/p/${parts[1].toLowerCase()}`;
      }
      // Modern /people/ format: facebook.com/people/Name/ID/
      if (parts[0] === 'people' && parts.length >= 2) {
        return `facebook.com/people/${parts[1].toLowerCase()}`;
      }
      // Groups format: facebook.com/groups/name
      if (parts[0] === 'groups' && parts.length >= 2) {
        return `facebook.com/groups/${parts[1].toLowerCase()}`;
      }
      // Standard page/group: facebook.com/handle
      const nonLeadSegments = new Set([
        'p', 'groups', 'watch', 'share', 'profile.php', 'people', 'reel',
        'stories', 'events', 'photo.php', 'permalink.php', 'mentions',
        'reviews', 'followers', 'following', 'posts', 'community'
      ]);
      if (parts.length > 0 && !nonLeadSegments.has(parts[0].toLowerCase())) {
        return `facebook.com/${parts[0].toLowerCase()}`;
      }
      if (parts.length > 0) {
        return `facebook.com/${parts[0].toLowerCase()}`;
      }
      return 'facebook.com';
    }

    // 2. Google Maps Normalization
    if (
      host.includes('google.com') && pathname.includes('/maps') ||
      host.includes('maps.google.') ||
      host === 'maps.app.goo.gl' ||
      host === 'goo.gl'
    ) {
      // Short links: maps.app.goo.gl/KEY or goo.gl/maps/KEY
      if (host.includes('goo.gl')) {
        return `maps.app.goo.gl${pathname.toLowerCase()}`;
      }

      // /maps/place/Business+Name/@lat,long,...
      if (pathname.includes('/place/')) {
        const placeChunk = pathname.split('/place/')[1];
        if (placeChunk) {
          const rawName = placeChunk.split('/')[0];
          const decoded = decodeURIComponent(rawName)
            .replace(/\+/g, ' ')
            .replace(/[@#].*$/, '')
            .trim()
            .toLowerCase();
          return `google.com/maps/place/${encodeURIComponent(decoded)}`;
        }
      }

      // CID query: ?cid=123456789
      if (parsed.searchParams.get('cid')) {
        return `google.com/maps?cid=${parsed.searchParams.get('cid')}`;
      }

      // Query param: ?q=Business+Name
      if (parsed.searchParams.get('q')) {
        const q = parsed.searchParams.get('q') || '';
        const decoded = decodeURIComponent(q)
          .replace(/\+/g, ' ')
          .replace(/[@#].*$/, '')
          .trim()
          .toLowerCase();
        return `google.com/maps?q=${encodeURIComponent(decoded)}`;
      }

      return `google.com/maps${pathname.toLowerCase()}`;
    }

    // 3. Instagram Normalization
    if (host.includes('instagram.com') || host === 'instagr.am') {
      const parts = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
      if (parts.length > 0 && !['p', 'reel', 'stories', 'explore'].includes(parts[0])) {
        return `instagram.com/${parts[0].toLowerCase()}`;
      }
      return `instagram.com${pathname.toLowerCase()}`;
    }

    // 4. Generic Websites
    return `${host}${pathname.toLowerCase()}`;
  } catch (_e) {
    // Fallback if URL constructor fails
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^(www\.|m\.)/, '')
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '');
  }
}

/**
 * Normalizes business names for fuzzy comparison (e.g. "Joe's Pizzeria & Grill" -> "joespizzeriagrill")
 */
export function normalizeBusinessName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Seed data for authentic rejected leads from prior real outreach campaigns.
 * Excludes generic dummy items to prevent false positives.
 */
const INITIAL_REJECTED_LEADS: RejectedLeadEntry[] = [
  {
    id: 'rej-bbq-crew',
    originalUrl: 'https://instagram.com/bbqcrewfoodtruck',
    normalizedUrl: 'instagram.com/bbqcrewfoodtruck',
    businessName: 'BBQ Crew',
    platform: 'Instagram',
    rejectedAt: '2026-08-31',
    rejectionReason: 'Not interested / Declined outreach',
    notes: 'Mobile catering in Hudson Valley. Rejected pitch.',
    leadId: 15,
  },
  {
    id: 'rej-totally-baked',
    originalUrl: 'https://instagram.com/totallybakedcolorado',
    normalizedUrl: 'instagram.com/totallybakedcolorado',
    businessName: 'Totally Baked Colorado',
    platform: 'Instagram',
    rejectedAt: '2026-09-07',
    rejectionReason: 'Declined proposal / Low budget',
    notes: 'Spuds with swagger in Colorado. Rejected outreach on Sep 7.',
    leadId: 47,
  },
  {
    id: 'rej-tacos-el-viejon',
    originalUrl: 'https://instagram.com/tacoselviejon.foodtrucks',
    normalizedUrl: 'instagram.com/tacoselviejon.foodtrucks',
    businessName: 'Tacos El Viejon',
    platform: 'Instagram',
    rejectedAt: '2026-09-12',
    rejectionReason: 'No response after 3 touchpoints / Inactive',
    notes: 'From Jalisco to KS & MO. Rejected on Sep 12.',
    leadId: 97,
  },
];

/**
 * Loads the current list of rejected leads from localStorage with automatic sanitization
 * of corrupted or generic entries (preventing accidental rejection of fresh links).
 */
export function loadRejectedLeads(): RejectedLeadEntry[] {
  if (typeof window === 'undefined') return INITIAL_REJECTED_LEADS;
  try {
    const raw = localStorage.getItem(REJECTED_LINKS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REJECTED_LINKS_STORAGE_KEY, JSON.stringify(INITIAL_REJECTED_LEADS));
      return INITIAL_REJECTED_LEADS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Sanitize: filter out corrupt entries that have generic placeholder names or bare domains
      const sanitized = parsed.filter((item) => {
        if (!item) return false;
        // Strip dummy sample pizza / cafe entries
        if (item.id === 'rej-fb-example-sample' || item.id === 'rej-maps-example-sample') return false;
        if (item.businessName === 'Sample Bad Fit Pizza' || item.businessName === 'Closed Bistro Cafe') return false;
        
        // Strip entries that are just bare domains (e.g. facebook.com, fb.com, etc.)
        const isBare = isBarePlatformDomain(item.normalizedUrl) || isBarePlatformDomain(item.originalUrl);
        if (isBare) return false;

        // Strip entries that have generic placeholder names (e.g. "Facebook", "Facebook Business", "Facebook Lead", IDs)
        if (isGenericPlaceholderName(item.businessName)) {
          return false;
        }

        return true;
      });

      if (sanitized.length !== parsed.length) {
        localStorage.setItem(REJECTED_LINKS_STORAGE_KEY, JSON.stringify(sanitized));
      }
      return sanitized;
    }
  } catch (e) {
    console.error('Error loading rejected leads from localStorage:', e);
  }
  return INITIAL_REJECTED_LEADS;
}

/**
 * Saves rejected leads to localStorage
 */
export function saveRejectedLeads(entries: RejectedLeadEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REJECTED_LINKS_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Error saving rejected leads to localStorage:', e);
  }
}

/**
 * Adds a new rejected lead or link to the registry
 */
export function addRejectedLead(entry: {
  originalUrl?: string;
  businessName: string;
  platform?: 'Facebook' | 'Google Maps' | 'Instagram' | 'Website' | 'Other';
  rejectionReason?: string;
  notes?: string;
  leadId?: number;
}): RejectedLeadEntry | null {
  const rawUrl = entry.originalUrl || '';
  const trimmedName = entry.businessName.trim();

  // Prevent saving pure bare domains or generic placeholders as blacklisted
  if (isBarePlatformDomain(rawUrl) && isGenericPlaceholderName(trimmedName)) {
    return null;
  }

  const currentList = loadRejectedLeads();
  const normalizedUrl = normalizeLeadUrl(rawUrl);
  const todayStr = new Date().toISOString().split('T')[0];

  // Check if already in list
  const existingIdx = currentList.findIndex((item) => {
    if (normalizedUrl && !isBarePlatformDomain(normalizedUrl) && item.normalizedUrl === normalizedUrl) return true;
    if (
      !isGenericPlaceholderName(item.businessName) &&
      !isGenericPlaceholderName(trimmedName) &&
      normalizeBusinessName(item.businessName) === normalizeBusinessName(trimmedName) &&
      item.platform === (entry.platform || 'Other')
    ) {
      return true;
    }
    return false;
  });

  const newEntry: RejectedLeadEntry = {
    id: existingIdx >= 0 ? currentList[existingIdx].id : `rej-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    originalUrl: rawUrl,
    normalizedUrl,
    businessName: trimmedName,
    platform: entry.platform || 'Other',
    rejectedAt: todayStr,
    rejectionReason: entry.rejectionReason?.trim() || 'Not interested / Closed Dead',
    notes: entry.notes?.trim() || '',
    leadId: entry.leadId,
  };

  let updatedList: RejectedLeadEntry[];
  if (existingIdx >= 0) {
    updatedList = [...currentList];
    updatedList[existingIdx] = newEntry;
  } else {
    updatedList = [newEntry, ...currentList];
  }

  saveRejectedLeads(updatedList);
  return newEntry;
}

/**
 * Removes a rejected entry from the registry (Un-reject / Restore)
 */
export function removeRejectedLead(idOrUrl: string): RejectedLeadEntry[] {
  const currentList = loadRejectedLeads();
  const normalized = normalizeLeadUrl(idOrUrl);

  const updated = currentList.filter((item) => {
    if (item.id === idOrUrl) return false;
    if (normalized && !isBarePlatformDomain(normalized) && item.normalizedUrl === normalized) return false;
    if (item.originalUrl && item.originalUrl === idOrUrl) return false;
    return true;
  });

  saveRejectedLeads(updated);
  return updated;
}

export interface LinkValidationResult {
  status: 'rejected' | 'duplicate_active' | 'fresh' | 'empty';
  isRejected: boolean;
  isDuplicateActive: boolean;
  isFresh: boolean;
  rawUrl: string;
  normalizedUrl: string;
  detectedName: string;
  platform: 'Facebook' | 'Google Maps' | 'Instagram' | 'Website' | 'Other';
  rejectedEntry?: RejectedLeadEntry;
  existingLead?: Lead;
  message: string;
}

/**
 * Checks a URL or business name against both:
 * 1) The permanent Rejected Leads Registry
 * 2) The Active Leads in the CRM
 */
export function checkLeadUrlStatus(
  rawUrl: string,
  existingLeads: Lead[],
  customName?: string
): LinkValidationResult {
  const trimmedUrl = rawUrl?.trim() || '';
  if (!trimmedUrl) {
    return {
      status: 'empty',
      isRejected: false,
      isDuplicateActive: false,
      isFresh: false,
      rawUrl: '',
      normalizedUrl: '',
      detectedName: '',
      platform: 'Other',
      message: 'No link entered.',
    };
  }

  const parsed = parseBusinessFromUrl(trimmedUrl, customName);
  const normalized = normalizeLeadUrl(trimmedUrl);
  const cleanName = normalizeBusinessName(parsed.name);
  const rejectedList = loadRejectedLeads();

  // If the user pasted a bare platform domain like https://facebook.com without a specific page,
  // do not trigger rejection or duplicate match against a specific lead!
  const isBare = isBarePlatformDomain(normalized) || isBarePlatformDomain(trimmedUrl);

  // 1. Check against Rejected Registry (Facebook, Google Maps, Instagram, etc.)
  let matchedRejected: RejectedLeadEntry | undefined;

  if (!isBare) {
    matchedRejected = rejectedList.find((item) => {
      const itemNorm = item.normalizedUrl || normalizeLeadUrl(item.originalUrl || '');
      // Exact normalized URL match - only for specific, non-bare URLs
      if (normalized && itemNorm && !isBarePlatformDomain(itemNorm) && itemNorm === normalized) {
        return true;
      }
      // Matching original raw URL
      if (item.originalUrl && !isBarePlatformDomain(item.originalUrl)) {
        if (normalizeLeadUrl(item.originalUrl) === normalized) return true;
        if (item.originalUrl.trim().toLowerCase() === trimmedUrl.toLowerCase()) return true;
      }
      // Matching same platform and business name ONLY if BOTH are real non-generic names
      if (
        cleanName &&
        !isGenericPlaceholderName(parsed.name) &&
        !isGenericPlaceholderName(item.businessName) &&
        item.platform === parsed.platform &&
        normalizeBusinessName(item.businessName) === cleanName
      ) {
        return true;
      }
      return false;
    });
  }

  if (matchedRejected) {
    return {
      status: 'rejected',
      isRejected: true,
      isDuplicateActive: false,
      isFresh: false,
      rawUrl: trimmedUrl,
      normalizedUrl: normalized,
      detectedName: parsed.name,
      platform: parsed.platform as any,
      rejectedEntry: matchedRejected,
      message: `🚫 Previously Rejected! You already checked and rejected this ${parsed.platform} lead (${matchedRejected.businessName}) on ${matchedRejected.rejectedAt}. Reason: "${matchedRejected.rejectionReason}". Do not waste time re-pitching!`,
    };
  }

  // Also check if any existing lead has status === 'closed_dead'
  let matchedDeadLead: Lead | undefined;
  if (!isBare) {
    matchedDeadLead = existingLeads.find((l) => {
      if (l.status !== 'closed_dead') return false;
      const lNorm = normalizeLeadUrl(l.profileUrl || l.handle || l.website || '');
      if (normalized && lNorm && !isBarePlatformDomain(lNorm) && lNorm === normalized) {
        return true;
      }
      // Match by business name ONLY if not a generic placeholder
      if (
        cleanName &&
        !isGenericPlaceholderName(parsed.name) &&
        !isGenericPlaceholderName(l.restaurantName) &&
        normalizeBusinessName(l.restaurantName) === cleanName &&
        l.platform === parsed.platform
      ) {
        return true;
      }
      return false;
    });
  }

  if (matchedDeadLead) {
    return {
      status: 'rejected',
      isRejected: true,
      isDuplicateActive: false,
      isFresh: false,
      rawUrl: trimmedUrl,
      normalizedUrl: normalized,
      detectedName: matchedDeadLead.restaurantName,
      platform: parsed.platform as any,
      existingLead: matchedDeadLead,
      message: `🚫 Marked as Dead Lead! "${matchedDeadLead.restaurantName}" was previously marked Dead in your CRM on ${matchedDeadLead.lastContactDate || matchedDeadLead.dateFirstContact || 'earlier'}.`,
    };
  }

  // 2. Check against Active CRM Leads (Duplicate Detection)
  let matchedActive: Lead | undefined;
  if (!isBare) {
    matchedActive = existingLeads.find((l) => {
      if (l.status === 'closed_dead') return false;
      const lNorm = normalizeLeadUrl(l.profileUrl || l.handle || l.website || '');
      if (normalized && lNorm && !isBarePlatformDomain(lNorm) && lNorm === normalized) {
        return true;
      }
      // Match by business name ONLY if not a generic placeholder
      if (
        cleanName &&
        !isGenericPlaceholderName(parsed.name) &&
        !isGenericPlaceholderName(l.restaurantName) &&
        normalizeBusinessName(l.restaurantName) === cleanName &&
        l.platform === parsed.platform
      ) {
        return true;
      }
      return false;
    });
  }

  if (matchedActive) {
    const stageLabel = (matchedActive.status || 'sent').replace('_', ' ').toUpperCase();
    return {
      status: 'duplicate_active',
      isRejected: false,
      isDuplicateActive: true,
      isFresh: false,
      rawUrl: trimmedUrl,
      normalizedUrl: normalized,
      detectedName: matchedActive.restaurantName,
      platform: parsed.platform as any,
      existingLead: matchedActive,
      message: `⚠️ Lead Already in Pipeline! "${matchedActive.restaurantName}" is already active in your CRM under stage: [${stageLabel}].`,
    };
  }

  // 3. Brand New Fresh Lead!
  return {
    status: 'fresh',
    isRejected: false,
    isDuplicateActive: false,
    isFresh: true,
    rawUrl: trimmedUrl,
    normalizedUrl: normalized,
    detectedName: parsed.name,
    platform: parsed.platform as any,
    message: `✨ Fresh Lead! "${parsed.name}" has never been contacted or rejected. Ready for 1-click outreach.`,
  };
}

/**
 * Extracts links from text (e.g. pasted clipboard content)
 */
export function extractUrlsFromText(text: string): string[] {
  if (!text) return [];
  // Match URLs starting with http://, https://, or common platform domains
  const urlRegex = /(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`]+|(?:facebook\.com|fb\.me|maps\.app\.goo\.gl|goo\.gl\/maps|instagram\.com)\/[^\s<>"'{}|\\^`]+/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches.map((u) => u.trim())));
}
