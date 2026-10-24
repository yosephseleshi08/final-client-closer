import { Lead } from '../types';
import { parseBusinessFromUrl, isGenericPlaceholderName, isBarePlatformDomain } from './linkLeadParser';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedLead?: Lead;
  reason?: string;
}

/**
 * Checks if an extracted key is a bare generic key (e.g. "fb:facebook.com" or "fb:")
 */
export function isBarePlatformKey(key: string): boolean {
  if (!key) return true;
  if (/^fb:(?:[a-z0-9_-]+\.)*facebook\.com$/i.test(key)) return true;
  if (/^fb:(?:[a-z0-9_-]+\.)*fb\.(?:com|me)$/i.test(key)) return true;
  if (/^ig:(?:[a-z0-9_-]+\.)*instagram\.com$/i.test(key)) return true;
  const bareKeys = [
    'fb:',
    'fb:facebook.com',
    'fb:web.facebook.com',
    'fb:m.facebook.com',
    'fb:mobile.facebook.com',
    'fb:fb.com',
    'fb:fb.me',
    'maps:',
    'maps:google.com/maps',
    'maps:maps.google.com',
    'ig:',
    'ig:instagram.com',
  ];
  return bareKeys.includes(key) || key.length <= 4;
}

/**
 * Normalizes a URL for robust comparison:
 * - strips protocol (http://, https://)
 * - strips all subdomains (web.facebook.com, m.facebook.com -> facebook.com)
 * - strips tracking query params and hashes
 * - strips trailing slashes
 */
export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim().toLowerCase();

  // Strip protocol
  url = url.replace(/^https?:\/\//i, '');

  // Normalize common domains & subdomains (web., m., mobile., touch., l., lm., www., etc.)
  url = url.replace(/^(?:[a-z0-9_-]+\.)*(?:facebook\.com|fb\.com|fb\.me)\//i, 'facebook.com/');
  url = url.replace(/^(?:[a-z0-9_-]+\.)*instagram\.com\//i, 'instagram.com/');
  url = url.replace(/^(?:maps\.)?google\.com\/maps\//i, 'google.com/maps/');
  if (url.startsWith('maps.app.goo.gl/')) {
    url = url.replace(/^maps\.app\.goo\.gl\//i, 'goo.gl/maps/');
  }

  // Strip www. or m. on any generic domain
  url = url.replace(/^(www\.|m\.)/i, '');

  // Strip query parameters that are purely tracking/session
  try {
    const hasQuery = url.indexOf('?');
    if (hasQuery !== -1) {
      const base = url.substring(0, hasQuery);
      const query = url.substring(hasQuery + 1);
      const searchParams = new URLSearchParams(query);

      // Remove tracking garbage
      const trackingParams = [
        'fref', 'mibextid', 'locale', 'ref', 'source', 'utm_source',
        'utm_medium', 'utm_campaign', 'share_id', 'hrc', 'extid',
        'rdid', 'paipv', '_rdr', 'sk', '_rdc', 'checkpoint_src',
        'hc_ref', 'comment_id', 'notif_id'
      ];
      trackingParams.forEach((tp) => searchParams.delete(tp));

      const cleanedQuery = searchParams.toString();
      url = cleanedQuery ? `${base}?${cleanedQuery}` : base;
    }
  } catch (_e) {
    url = url.split('?')[0];
  }

  // Strip hash and trailing slashes
  url = url.split('#')[0].replace(/%23.*$/, '').replace(/\/+$/, '');
  return url;
}

/**
 * Extracts a unique identity key from a Facebook or Google Maps URL
 */
export function extractUniqueKey(rawUrl: string): string {
  const norm = normalizeUrl(rawUrl);
  if (!norm || isBarePlatformDomain(norm)) return '';

  // 1. Facebook Page / Profile Slug
  if (norm.startsWith('facebook.com/')) {
    const path = norm.replace(/^facebook\.com\/?/, '');
    const parts = path.split('/').filter(Boolean);
    if (parts.length > 0) {
      // Modern /p/ format: facebook.com/p/Grade-A-Tacos-100068372214501
      if (parts[0] === 'p' && parts.length >= 2) {
        return `fb:p:${parts[1].toLowerCase()}`;
      }
      // Modern /people/ format: facebook.com/people/Name/ID
      if (parts[0] === 'people' && parts.length >= 2) {
        return `fb:people:${parts[1].toLowerCase()}`;
      }
      // Pages format: facebook.com/pages/category/Name/ID or facebook.com/pages/Name/ID
      if (parts[0] === 'pages' && parts.length >= 2) {
        const nonCategory = parts.filter((p) => !['pages', 'category'].includes(p.toLowerCase()));
        if (nonCategory.length > 0) {
          return `fb:pages:${nonCategory[nonCategory.length - 1].toLowerCase()}`;
        }
      }
      // Groups format: facebook.com/groups/name
      if (parts[0] === 'groups' && parts.length >= 2) {
        return `fb:group:${parts[1].toLowerCase()}`;
      }
      // Direct numeric profile ID: facebook.com/100094642025733/mentions
      if (/^[0-9]{5,}$/.test(parts[0])) {
        return `fb:id:${parts[0]}`;
      }
      // profile.php?id=12345
      if (parts[0].startsWith('profile.php')) {
        const idMatch = norm.match(/[?&]id=([0-9]+)/);
        if (idMatch) return `fb:id:${idMatch[1]}`;
      }
      // Standard vanity handle: facebook.com/handle
      const genericSegments = new Set([
        'p', 'groups', 'watch', 'share', 'profile.php', 'people', 'reel',
        'stories', 'events', 'photo.php', 'permalink.php', 'mentions',
        'reviews', 'followers', 'following', 'posts', 'community'
      ]);
      if (!genericSegments.has(parts[0].toLowerCase())) {
        return `fb:${parts[0].toLowerCase()}`;
      }
    }
    return '';
  }

  // 2. Google Maps place or query
  if (norm.startsWith('google.com/maps') || norm.startsWith('goo.gl/maps')) {
    if (norm.includes('/place/')) {
      const placePart = norm.split('/place/')[1];
      const placeName = placePart ? placePart.split('/')[0] : '';
      if (placeName) {
        return `maps:${decodeURIComponent(placeName).replace(/\+/g, ' ').trim()}`;
      }
    }
    return '';
  }

  // 3. Instagram Handle
  if (norm.startsWith('instagram.com/')) {
    const igUser = norm.replace(/^instagram\.com\//, '').split('/')[0].replace(/^@/, '');
    if (igUser && !['p', 'reel', 'stories', 'explore'].includes(igUser)) {
      return `ig:${igUser}`;
    }
    return '';
  }

  return '';
}

/**
 * Normalizes business name for loose equality check
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/['’".,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a given URL or business name is ALREADY present in the leads pipeline.
 */
export function checkDuplicateLead(
  urlOrInput: string,
  existingLeads: Lead[],
  candidateName?: string
): DuplicateCheckResult {
  if (!urlOrInput && !candidateName) {
    return { isDuplicate: false };
  }

  const trimmedInput = urlOrInput.trim();
  const inputNorm = normalizeUrl(trimmedInput);
  const inputKey = extractUniqueKey(trimmedInput);

  // Parse candidate name if not explicitly given
  const parsed = parseBusinessFromUrl(trimmedInput, candidateName);
  const targetNameNorm = normalizeName(candidateName || parsed.name);

  // If input is just a bare platform domain like facebook.com, don't flag as duplicate
  const isInputBare = isBarePlatformDomain(inputNorm) || isBarePlatformDomain(trimmedInput);

  for (const lead of existingLeads) {
    const leadLink = lead.profileUrl || lead.handle || lead.website || '';
    const leadNorm = normalizeUrl(leadLink);
    const leadKey = extractUniqueKey(leadLink);
    const leadNameNorm = normalizeName(lead.restaurantName);

    // 1. Direct URL match (only if neither is a bare platform domain)
    if (
      !isInputBare &&
      inputNorm &&
      leadNorm &&
      !isBarePlatformDomain(leadNorm) &&
      inputNorm === leadNorm
    ) {
      return {
        isDuplicate: true,
        matchedLead: lead,
        reason: `Identical link already saved for "${lead.restaurantName}" (${lead.platform} • ${lead.status.toUpperCase()})`,
      };
    }

    // 2. Extracted platform identity key match (e.g. both Facebook page slug or Maps place)
    if (
      inputKey &&
      leadKey &&
      !isBarePlatformKey(inputKey) &&
      !isBarePlatformKey(leadKey) &&
      inputKey === leadKey &&
      inputKey.length > 5
    ) {
      return {
        isDuplicate: true,
        matchedLead: lead,
        reason: `Matches existing ${lead.platform} page for "${lead.restaurantName}"`,
      };
    }

    // 3. Match by business name ONLY if BOTH are real non-generic names
    if (
      targetNameNorm &&
      leadNameNorm &&
      !isGenericPlaceholderName(parsed.name) &&
      !isGenericPlaceholderName(lead.restaurantName) &&
      targetNameNorm === leadNameNorm &&
      targetNameNorm.length > 3
    ) {
      const platformMatches =
        lead.platform.toLowerCase() === parsed.platform.toLowerCase() ||
        (lead.platform === 'Google Maps' && parsed.platform === 'Google Maps') ||
        (lead.platform === 'Facebook' && parsed.platform === 'Facebook');

      if (platformMatches) {
        return {
          isDuplicate: true,
          matchedLead: lead,
          reason: `A ${lead.platform} lead for "${lead.restaurantName}" already exists in your pipeline (${lead.scheduledDay || 'Batch'} • ${lead.status.toUpperCase()})`,
        };
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Filters a bulk list of URLs/lines, separating fresh leads from rejected duplicates
 */
export function filterBulkDuplicates(
  lines: string[],
  existingLeads: Lead[]
): {
  freshLeads: { rawLine: string; url: string; name: string }[];
  rejectedDuplicates: { rawLine: string; url: string; name: string; matchedLead: Lead; reason: string }[];
} {
  const freshLeads: { rawLine: string; url: string; name: string }[] = [];
  const rejectedDuplicates: { rawLine: string; url: string; name: string; matchedLead: Lead; reason: string }[] = [];
  const sessionSeenKeys = new Set<string>();

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const parts = trimmed.split(',');
    const url = parts[0]?.trim() || '';
    const customName = parts[1]?.trim() || '';

    if (!url) return;

    const parsed = parseBusinessFromUrl(url, customName);
    const key = extractUniqueKey(url) || (!isGenericPlaceholderName(parsed.name) ? normalizeName(parsed.name) : '');

    // 1. Check if already in existingLeads
    const check = checkDuplicateLead(url, existingLeads, parsed.name);
    if (check.isDuplicate && check.matchedLead) {
      rejectedDuplicates.push({
        rawLine: trimmed,
        url,
        name: parsed.name,
        matchedLead: check.matchedLead,
        reason: check.reason || 'Already in pipeline',
      });
      return;
    }

    // 2. Check if duplicated within this same batch (only if key is non-empty)
    if (key && sessionSeenKeys.has(key)) {
      rejectedDuplicates.push({
        rawLine: trimmed,
        url,
        name: parsed.name,
        matchedLead: existingLeads[0] || ({} as Lead),
        reason: 'Duplicate entry inside this batch',
      });
      return;
    }

    if (key) {
      sessionSeenKeys.add(key);
    }

    freshLeads.push({
      rawLine: trimmed,
      url: parsed.url,
      name: parsed.name,
    });
  });

  return { freshLeads, rejectedDuplicates };
}

export interface DuplicateGroup {
  key: string;
  normalizedUrl: string;
  displayName: string;
  reason: string;
  leads: Lead[];
  recommendedKeepId: number;
}

/**
 * Computes a quality/priority score to decide which lead copy is best to keep when duplicates are found.
 */
function scoreLeadForRetention(lead: Lead): number {
  let score = 0;
  // Status priority
  switch (lead.status) {
    case 'closed_won':
      score += 1000;
      break;
    case 'proposal_sent':
      score += 800;
      break;
    case 'call_booked':
      score += 750;
      break;
    case 'mockup_sent':
      score += 700;
      break;
    case 'replied':
      score += 600;
      break;
    case 'seen':
      score += 400;
      break;
    case 'sent':
      score += 200;
      break;
    case 'closed_dead':
      score += 50;
      break;
    default:
      score += 100;
      break;
  }

  // Follow-up touches priority
  score += (lead.followupCount || 0) * 50;

  // Richness of data
  if (lead.phone) score += 20;
  if (lead.email) score += 20;
  if (lead.notes && lead.notes.length > 20) score += 30;
  if (lead.pitchHook) score += 15;
  if (lead.lastContactDate) score += 25;

  return score;
}

/**
 * Searches every stored lead and groups duplicate entries together by link/handle/URL or matching identity.
 */
export function findDuplicateLeadGroups(leads: Lead[]): DuplicateGroup[] {
  if (!leads || leads.length === 0) return [];

  // Map of canonical key -> list of leads
  const keyToLeads = new Map<string, { key: string; normalizedUrl: string; displayName: string; reason: string; leads: Lead[] }>();

  leads.forEach((lead) => {
    // Determine canonical identity key
    const rawLink = lead.profileUrl || lead.handle || lead.website || '';
    let normUrl = normalizeUrl(rawLink);

    // If handle is an @handle, treat as Instagram handle
    if (!normUrl && lead.handle && lead.handle.startsWith('@')) {
      normUrl = `instagram.com/${lead.handle.slice(1).toLowerCase().trim()}`;
    }

    const uniqueKey = extractUniqueKey(rawLink || normUrl);
    const cleanName = normalizeName(lead.restaurantName);

    let groupKey = '';
    let reason = '';
    let displayName = lead.restaurantName;

    if (uniqueKey && uniqueKey.length > 4 && !isBarePlatformKey(uniqueKey)) {
      groupKey = `link:${uniqueKey}`;
      reason = `Matching profile link / URL (${uniqueKey})`;
      displayName = normUrl || uniqueKey;
    } else if (normUrl && normUrl.length > 5 && !isBarePlatformDomain(normUrl)) {
      groupKey = `url:${normUrl}`;
      reason = `Matching URL: ${normUrl}`;
      displayName = normUrl;
    } else if (cleanName && cleanName.length > 3 && !isGenericPlaceholderName(lead.restaurantName)) {
      // Fallback: match by platform and business name ONLY if not a generic placeholder
      const plat = (lead.platform || 'Other').toLowerCase();
      groupKey = `name:${plat}:${cleanName}`;
      reason = `Matching business name on ${lead.platform}`;
      displayName = lead.restaurantName;
    }

    if (!groupKey) return;

    if (!keyToLeads.has(groupKey)) {
      keyToLeads.set(groupKey, {
        key: groupKey,
        normalizedUrl: normUrl || rawLink,
        displayName,
        reason,
        leads: [lead],
      });
    } else {
      keyToLeads.get(groupKey)!.leads.push(lead);
    }
  });

  // Filter only groups with more than 1 lead (real duplicates)
  const duplicateGroups: DuplicateGroup[] = [];

  keyToLeads.forEach((group) => {
    if (group.leads.length > 1) {
      // Determine recommended lead to keep
      let bestLead = group.leads[0];
      let bestScore = scoreLeadForRetention(bestLead);

      for (let i = 1; i < group.leads.length; i++) {
        const currentLead = group.leads[i];
        const currentScore = scoreLeadForRetention(currentLead);
        if (currentScore > bestScore) {
          bestScore = currentScore;
          bestLead = currentLead;
        }
      }

      duplicateGroups.push({
        key: group.key,
        normalizedUrl: group.normalizedUrl,
        displayName: group.displayName,
        reason: group.reason,
        leads: group.leads,
        recommendedKeepId: bestLead.id,
      });
    }
  });

  return duplicateGroups;
}

/**
 * Removes duplicate leads from the leads array, keeping the preferred or recommended lead for each group.
 */
export function autoDeduplicateLeads(
  leads: Lead[],
  userKeepOverrides?: Record<string, number>
): {
  deduplicatedLeads: Lead[];
  removedLeads: Lead[];
  removedCount: number;
  duplicateGroups: DuplicateGroup[];
} {
  const duplicateGroups = findDuplicateLeadGroups(leads);
  if (duplicateGroups.length === 0) {
    return {
      deduplicatedLeads: leads,
      removedLeads: [],
      removedCount: 0,
      duplicateGroups: [],
    };
  }

  const idsToRemove = new Set<number>();
  const removedLeads: Lead[] = [];

  duplicateGroups.forEach((group) => {
    const keepId = userKeepOverrides?.[group.key] ?? group.recommendedKeepId;
    group.leads.forEach((l) => {
      if (l.id !== keepId) {
        idsToRemove.add(l.id);
        removedLeads.push(l);
      }
    });
  });

  const deduplicatedLeads = leads.filter((l) => !idsToRemove.has(l.id));

  return {
    deduplicatedLeads,
    removedLeads,
    removedCount: idsToRemove.size,
    duplicateGroups,
  };
}

/**
 * Removes specified duplicate lead IDs from the list.
 */
export function removeSpecificDuplicateLeads(leads: Lead[], idsToRemove: number[]): Lead[] {
  const set = new Set(idsToRemove);
  return leads.filter((l) => !set.has(l.id));
}


