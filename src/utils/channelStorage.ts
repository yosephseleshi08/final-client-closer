import { ChannelLead, MultiChannelType } from '../types';
import { extractCleanEmail } from './dataRepair';
import { getStrictVoiceTypeForId, recalculateAllVoiceTypes } from './voiceTypeEngine';

const STORAGE_PREFIX = 'outreach_channel_leads_';

export interface BlindRouteResult {
  channelType: 'instagram' | 'facebook' | 'email';
  link: string;
  href: string;
  badgeLabel: string;
  actionLabel: string;
  isMailto: boolean;
}

export function getChannelPrefix(channel: MultiChannelType): string {
  switch (channel) {
    case 'combined':
      return 'CM';
    case 'email':
      return 'EM';
    case 'instagram':
      return 'IG';
    case 'facebook':
      return 'FB';
  }
}

export function getChannelLabel(channel: MultiChannelType): string {
  switch (channel) {
    case 'combined':
      return 'Combined Outreach';
    case 'email':
      return 'Email';
    case 'instagram':
      return 'Instagram';
    case 'facebook':
      return 'Facebook';
  }
}

/**
 * Loads leads for a specific channel from localStorage with legacy migration for 'combined'.
 */
export function loadChannelLeads(channel: MultiChannelType): ChannelLead[] {
  try {
    if (typeof localStorage === 'undefined') return [];

    const raw = localStorage.getItem(`${STORAGE_PREFIX}${channel}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return [...parsed].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
    }

    // One-time seamless migration if 'combined' is empty and legacy email/facebook stores exist
    if (channel === 'combined') {
      const merged: ChannelLead[] = [];
      for (const legacyKey of [`${STORAGE_PREFIX}email`, `${STORAGE_PREFIX}facebook`]) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              merged.push({ ...item, channel: 'combined' });
            }
          }
        }
      }
      if (merged.length > 0) {
        const normalized = recalculateAllVoiceTypes(
          merged.map((l, idx) => ({
            ...l,
            numericId: l.numericId || idx + 1,
            id: l.id && /^CM-/i.test(l.id) ? l.id : `CM-${l.numericId || idx + 1}`,
            sortOrder: idx,
          })),
          'combined'
        );
        localStorage.setItem(`${STORAGE_PREFIX}combined`, JSON.stringify(normalized));
        return normalized;
      }
    }
  } catch (err) {
    console.error(`Failed to load leads for channel "${channel}":`, err);
  }
  return [];
}

/**
 * Saves leads for a specific channel to localStorage and notifies subscribers.
 */
export function saveChannelLeads(channel: MultiChannelType, leads: ChannelLead[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${STORAGE_PREFIX}${channel}`, JSON.stringify(leads));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('channel_leads_changed', { detail: { channel, leads } })
      );
    }
  } catch (err) {
    console.error(`Failed to save leads for channel "${channel}":`, err);
  }
}

/**
 * Computes the next available ID for the channel.
 */
export function getNextLeadId(
  channel: MultiChannelType,
  currentLeads: ChannelLead[]
): { id: string; numericId: number } {
  const prefix = getChannelPrefix(channel);
  let highest = 0;
  for (const lead of currentLeads) {
    if (lead.numericId && lead.numericId > highest) {
      highest = lead.numericId;
    } else if (typeof lead.id === 'string') {
      const match = lead.id.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > highest) {
          highest = num;
        }
      }
    }
  }
  const nextNum = highest + 1;
  return {
    numericId: nextNum,
    id: `${prefix}-${nextNum}`,
  };
}

/**
 * Extracts a cleaned email address from a lead without mutating saved pitches.
 */
export function getLeadEmail(lead?: Partial<ChannelLead> | null): string {
  if (!lead) return '';
  const candidates = [
    lead.email,
    lead.rawDetails?.email,
    lead.rawDetails?.Email,
    lead.rawDetails?.emailAddress,
    lead.rawDetails?.contactEmail,
    lead.platformLink,
    lead.link,
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    if (
      trimmed.toLowerCase().includes('instagram.com') ||
      trimmed.toLowerCase().includes('facebook.com') ||
      trimmed.toLowerCase().includes('fb.com')
    ) {
      continue;
    }
    if (trimmed.startsWith('@') && !trimmed.slice(1).includes('@')) {
      continue;
    }
    const clean = extractCleanEmail(trimmed);
    if (clean) return clean;
  }
  return '';
}

/**
 * Extracts an Instagram profile link/handle from a lead.
 */
export function getLeadInstagram(lead?: Partial<ChannelLead> | null): string {
  if (!lead) return '';
  const candidates = [
    lead.instagram,
    lead.rawDetails?.instagram,
    lead.rawDetails?.Instagram,
    lead.rawDetails?.instagramHandle,
    lead.rawDetails?.socialLinks?.instagram,
    lead.platformLink,
    lead.link,
  ];
  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
      return trimmed;
    }
    if (
      lead.channel === 'instagram' &&
      !lower.includes('facebook.com') &&
      !lower.includes('fb.com') &&
      !lower.startsWith('mailto:') &&
      (!lower.includes('@') || lower.startsWith('@'))
    ) {
      return trimmed;
    }
  }
  return '';
}

/**
 * Extracts a Facebook profile/page link from a lead.
 */
export function getLeadFacebook(lead?: Partial<ChannelLead> | null): string {
  if (!lead) return '';
  const candidates = [
    lead.facebook,
    lead.rawDetails?.facebook,
    lead.rawDetails?.Facebook,
    lead.rawDetails?.facebookUrl,
    lead.rawDetails?.facebook_url,
    lead.rawDetails?.fb,
    lead.rawDetails?.socialLinks?.facebook,
    lead.platformLink,
    lead.link,
  ];
  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.me')) {
      return trimmed;
    }
    if (
      lead.channel === 'facebook' &&
      !lower.includes('instagram.com') &&
      !lower.includes('@') &&
      !lower.startsWith('mailto:')
    ) {
      return trimmed;
    }
  }
  return '';
}

/**
 * Checks whether a lead has an active social profile requiring warm-up (IG or unrestricted FB).
 */
export function hasSocialWarmupLink(lead?: Partial<ChannelLead> | null): boolean {
  if (!lead) return false;
  if (getLeadInstagram(lead)) return true;
  if (getLeadFacebook(lead) && !lead.fb_message_restricted) return true;
  return false;
}

/**
 * Ensures email-only leads are automatically treated as warmed (no social warm-up required).
 */
export function normalizeEmailOnlyWarmupStatus(leads: ChannelLead[]): ChannelLead[] {
  return leads.map((lead) => {
    const hasSocial = hasSocialWarmupLink(lead);
    if (!hasSocial && lead.channel !== 'instagram') {
      if (lead.warmupStatus === 'warmed' && lead.isWarmedUp) return lead;
      return {
        ...lead,
        warmupStatus: 'warmed' as const,
        isWarmedUp: true,
      };
    }
    return lead;
  });
}

export function hasDualChannelLinks(lead?: Partial<ChannelLead> | null): boolean {
  if (!lead) return false;
  return Boolean(getLeadEmail(lead) && (getLeadFacebook(lead) || getLeadInstagram(lead)));
}

/**
 * Resolves a clean external URL or mailto: URI using extracted clean emails where applicable.
 */
export function getPlatformLink(
  input: string | Partial<ChannelLead> | undefined | null,
  platformHint?: string
): string {
  if (!input) return '';

  if (typeof input === 'object') {
    const hint = (platformHint || input.channel || '').toLowerCase();
    if (hint.includes('email') || hint.includes('mail')) {
      const clean = getLeadEmail(input);
      if (clean) return `mailto:${clean}`;
    }
    if (hint.includes('instagram') || hint === 'ig') {
      const ig = getLeadInstagram(input);
      if (ig) return getPlatformLink(ig, 'instagram');
    }
    if (hint.includes('facebook') || hint === 'fb') {
      const fb = getLeadFacebook(input);
      if (fb) return getPlatformLink(fb, 'facebook');
    }
    // Combined / fallback auto-detect
    const cleanEmail = getLeadEmail(input);
    const rawCandidate = input.platformLink || input.link || input.instagram || input.facebook || cleanEmail;
    if (!rawCandidate && cleanEmail) return `mailto:${cleanEmail}`;
    return getPlatformLink(rawCandidate, platformHint || input.channel);
  }

  const raw = String(input).trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();
  const hint = (platformHint || '').toLowerCase();

  // Check if input is an email or scraper-corrupted email (never treat IG @handle as email)
  const looksLikeSocial =
    lower.includes('instagram.com') ||
    lower.includes('instagr.am') ||
    lower.includes('facebook.com') ||
    lower.includes('fb.com') ||
    lower.includes('fb.me') ||
    (raw.startsWith('@') && !raw.slice(1).includes('@'));

  if (!looksLikeSocial && (raw.includes('@') || lower.startsWith('mailto:') || hint.includes('email'))) {
    const clean = extractCleanEmail(raw);
    if (clean) return `mailto:${clean}`;
    if (hint.includes('email')) return '';
  }

  // Handle bare @handle for Instagram
  if (raw.startsWith('@')) {
    const handle = raw.replace(/^@+/, '').split(/[/?#]/)[0];
    return handle ? `https://instagram.com/${handle}` : '';
  }

  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return raw;
  }

  if (hint.includes('instagram') && !lower.includes('.')) {
    return `https://instagram.com/${raw.replace(/^\/+/, '')}`;
  }
  if (hint.includes('facebook') && !lower.includes('.')) {
    return `https://facebook.com/${raw.replace(/^\/+/, '')}`;
  }

  return `https://${raw.replace(/^\/+/, '')}`;
}

/**
 * Intelligent Channel Routing (The Blind Rule):
 * Shows ONLY the single active routed link for Warm-Up or Dispatch.
 */
export function getBlindRouteLink(
  lead: ChannelLead,
  mode: 'warmup' | 'dispatch',
  _stage: 0 | 4 | 8 | 14 = 0
): BlindRouteResult | null {
  const ig = getLeadInstagram(lead);
  const fb = getLeadFacebook(lead);
  const email = getLeadEmail(lead);

  if (mode === 'warmup') {
    if (lead.channel === 'instagram' || (ig && !fb)) {
      if (!ig) return null;
      return {
        channelType: 'instagram',
        link: ig,
        href: getPlatformLink(ig, 'instagram'),
        badgeLabel: 'IG',
        actionLabel: 'Warm up IG Profile',
        isMailto: false,
      };
    }
    if (fb && !lead.fb_message_restricted) {
      return {
        channelType: 'facebook',
        link: fb,
        href: getPlatformLink(fb, 'facebook'),
        badgeLabel: 'FB',
        actionLabel: 'Warm up FB Page',
        isMailto: false,
      };
    }
    return null;
  }

  // Dispatch mode
  if (lead.channel === 'instagram') {
    const target = ig || lead.platformLink || lead.link;
    if (!target) return null;
    return {
      channelType: 'instagram',
      link: target,
      href: getPlatformLink(target, 'instagram'),
      badgeLabel: 'IG',
      actionLabel: 'Open IG Profile',
      isMailto: false,
    };
  }

  // Combined / Email / Facebook dispatch routing
  // Prioritize Email if Email exists (or FB is restricted), else Facebook
  if (email && (lead.fb_message_restricted || !fb || lead.channel === 'combined' || lead.channel === 'email')) {
    return {
      channelType: 'email',
      link: email,
      href: `mailto:${email}`,
      badgeLabel: 'Email',
      actionLabel: 'Email Prospect',
      isMailto: true,
    };
  }

  if (fb && !lead.fb_message_restricted) {
    return {
      channelType: 'facebook',
      link: fb,
      href: getPlatformLink(fb, 'facebook'),
      badgeLabel: 'FB',
      actionLabel: 'Message on Facebook',
      isMailto: false,
    };
  }

  if (email) {
    return {
      channelType: 'email',
      link: email,
      href: `mailto:${email}`,
      badgeLabel: 'Email',
      actionLabel: 'Email Prospect',
      isMailto: true,
    };
  }

  const fallback = lead.platformLink || lead.link;
  if (!fallback) return null;
  const href = getPlatformLink(fallback, lead.channel);
  const isMailto = href.startsWith('mailto:');
  return {
    channelType: isMailto ? 'email' : fallback.toLowerCase().includes('facebook') ? 'facebook' : 'instagram',
    link: fallback,
    href,
    badgeLabel: isMailto ? 'Email' : 'Link',
    actionLabel: isMailto ? 'Email Prospect' : 'Open Profile',
    isMailto,
  };
}

/**
 * Normalizes any URL, social handle, or email for reliable duplicate link comparison.
 * Example: "instagram.com/pasta" and "https://www.instagram.com/pasta/?hl=en" both normalize to "instagram.com/pasta".
 */
export function normalizeUrlForDuplicateCheck(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim().toLowerCase();
  if (!str) return '';

  // Clean email if present and non-social
  if (
    str.includes('@') &&
    !str.includes('instagram.com') &&
    !str.includes('instagr.am') &&
    !str.includes('facebook.com') &&
    !str.includes('fb.com') &&
    !str.startsWith('@')
  ) {
    const cleanEmail = extractCleanEmail(str);
    if (cleanEmail) return cleanEmail;
  }

  str = str
    .replace(/^mailto:/i, '')
    .replace(/^https?:\/\//i, '')
    .replace(/^(?:www\.|m\.|mobile\.|web\.|l\.)/i, '')
    .replace(/^(?:[a-z0-9_-]+\.)*(?:instagram\.com|instagr\.am)(?:\/|$)/i, 'instagram.com/')
    .replace(/^(?:[a-z0-9_-]+\.)*(?:facebook\.com|fb\.com|fb\.me)(?:\/|$)/i, 'facebook.com/');

  // Preserve Facebook profile.php?id=...
  if (str.includes('facebook.com/profile.php')) {
    const idMatch = str.match(/[?&]id=([0-9a-zA-Z._-]+)/i);
    if (idMatch && idMatch[1]) {
      return `facebook.com/profile.php?id=${idMatch[1]}`;
    }
  } else {
    str = str.split('?')[0].split('#')[0];
  }

  str = str.replace(/^@/, '').replace(/\/+$/, '');

  // Ignore bare domain-only placeholders
  if (['instagram.com', 'facebook.com', 'fb.com', 'fb.me', '-', 'n/a', 'na', 'none'].includes(str)) {
    return '';
  }

  return str;
}

export function areLinksEquivalent(a?: string | null, b?: string | null): boolean {
  const normA = normalizeUrlForDuplicateCheck(a);
  const normB = normalizeUrlForDuplicateCheck(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Compare stripped social handle tail when one is a bare handle and the other is a full social URL
  const tailA = normA.replace(/^(?:instagram\.com|facebook\.com)\//, '');
  const tailB = normB.replace(/^(?:instagram\.com|facebook\.com)\//, '');
  const isBareA = !normA.includes('/');
  const isBareB = !normB.includes('/');
  if ((isBareA || isBareB) && !normA.includes('@') && !normB.includes('@') && tailA && tailA === tailB) {
    return true;
  }
  return false;
}

/**
 * Checks whether a candidate link or email already exists in the given lead list.
 */
export function findDuplicateLead(
  candidateLink: string,
  leads: ChannelLead[],
  excludeLeadId?: string
): ChannelLead | undefined {
  const normCandidate = normalizeUrlForDuplicateCheck(candidateLink);
  if (!normCandidate) return undefined;

  for (const lead of leads) {
    if (excludeLeadId && lead.id === excludeLeadId) continue;
    const fields = [lead.link, lead.platformLink, lead.email, lead.instagram, lead.facebook];
    for (const f of fields) {
      if (f && areLinksEquivalent(normCandidate, f)) {
        return lead;
      }
    }
  }
  return undefined;
}

/**
 * Extracts a suggested business name from a URL, handle, or email.
 */
export function extractSuggestedName(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return 'New Prospect';

  // Handle email
  const cleanEmail = extractCleanEmail(trimmed);
  if (cleanEmail && !trimmed.includes('/')) {
    const parts = cleanEmail.split('@');
    const localPart = parts[0].replace(/[._-]+/g, ' ');
    return (
      localPart
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ') || 'Prospect'
    );
  }

  // Handle URL
  const pathOnly = trimmed
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^(instagram\.com|facebook\.com|fb\.com)\//i, '')
    .replace(/\/+$/, '')
    .split(/[?#]/)[0];

  const segments = pathOnly.split('/').filter(Boolean);
  const candidate = segments[segments.length - 1] || pathOnly;

  const cleaned = candidate
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/[._\-]+/g, ' ')
    .trim();

  if (cleaned.length >= 2) {
    return cleaned
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  return 'New Prospect';
}

/**
 * Generates an AI-ready outreach prompt context block for a prospect.
 */
export function generateLeadPrompt(lead: ChannelLead, channel: MultiChannelType): string {
  const channelName = getChannelLabel(channel);
  const contactTarget = getLeadEmail(lead) || getLeadInstagram(lead) || getLeadFacebook(lead) || lead.link;
  const voiceType = lead.voiceType || getStrictVoiceTypeForId(lead, channel);
  const analysis = (lead.leadAnalysis || lead.prompt || '').trim();

  return [
    `Generate a personalized 4-step ${channelName} outreach sequence (Day 0 Initial, Day 4 Follow-Up, Day 8 Value Follow-Up, Day 14 Breakup) for this restaurant prospect:`,
    `- Lead ID: ${lead.id} (${voiceType})`,
    `- Business Name: ${lead.name}`,
    `- Contact / Profile: ${contactTarget}`,
    lead.city ? `- City: ${lead.city}` : '',
    analysis ? `\nProspect Notes & Audit:\n${analysis}` : '',
    `\nRequirements:\n- Keep Day 0 concise, conversational, and mobile-friendly.\n- Reference specific visual/conversion improvements from the notes above.\n- End with a soft low-friction CTA.`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Checks whether a lead's position/ID is locked because it already has sent history or a saved sequence.
 */
export function getLeadLockReason(lead: ChannelLead): string | null {
  if (lead.initialSentDate || lead.dmSent || lead.followup1SentDate || lead.followup2SentDate || lead.followup3SentDate) {
    return 'Already dispatched';
  }
  if (lead.scheduledDate) {
    return 'Scheduled on calendar';
  }
  return null;
}

/**
 * Reorders leads cleanly while preserving sortOrder indices and recalculating unlocked voice types if needed.
 */
export function reorderChannelLeadsWithFixedLocks(
  leads: ChannelLead[],
  channel: MultiChannelType
): ChannelLead[] {
  const reindexed = leads.map((lead, idx) => ({
    ...lead,
    sortOrder: idx,
  }));
  return recalculateAllVoiceTypes(reindexed, channel);
}

/**
 * Removes leads by ID and re-normalizes active lead sortOrder.
 */
export function removeAndResequenceActiveLeads(
  leads: ChannelLead[],
  idsToRemove: string[],
  channel: MultiChannelType
): ChannelLead[] {
  const removeSet = new Set(idsToRemove);
  const remaining = leads
    .filter((l) => !removeSet.has(l.id))
    .map((l, idx) => ({ ...l, sortOrder: idx }));
  return recalculateAllVoiceTypes(remaining, channel);
}

export function formatAddedDate(iso?: string): string {
  if (!iso) return '—';
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function detectLinkChannel(rawLink: string): 'instagram' | 'facebook' | 'email' | 'unknown' {
  const lower = rawLink.trim().toLowerCase();
  if (!lower) return 'unknown';
  if (lower.includes('instagram.com') || lower.includes('instagr.am') || (lower.startsWith('@') && !lower.slice(1).includes('@'))) {
    return 'instagram';
  }
  if (lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.me')) {
    return 'facebook';
  }
  if (extractCleanEmail(rawLink)) {
    return 'email';
  }
  return 'unknown';
}

export function validateChannelLink(
  rawLink: string,
  channel: MultiChannelType
): { valid: boolean; reason?: string } {
  const trimmed = rawLink.trim();
  if (!trimmed) return { valid: false, reason: 'Please enter a valid link, handle, or email.' };
  const detected = detectLinkChannel(trimmed);
  if (channel === 'instagram' && (detected === 'facebook' || detected === 'email')) {
    return {
      valid: false,
      reason: `This looks like a ${detected} contact. Add it in Combined Outreach instead.`,
    };
  }
  if (channel === 'combined' && detected === 'instagram') {
    return {
      valid: false,
      reason: 'Instagram links belong in the dedicated Instagram workspace.',
    };
  }
  return { valid: true };
}

/**
 * Exports channel leads as CSV or JSON format.
 */
export function exportChannelData(
  channel: MultiChannelType,
  format: 'csv' | 'json',
  leads: ChannelLead[]
): void {
  const channelName = getChannelLabel(channel);
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const filename = `${channel}_leads_${timestamp}.${format}`;

  if (format === 'json') {
    const jsonStr = JSON.stringify(leads, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    downloadBlob(blob, filename);
  } else {
    const headers = [
      'ID',
      'Name',
      'Voice Type',
      'Link',
      'Email',
      'Channel',
      'Scheduled Date',
      'Initial Sent Date',
      'Completed',
      'Custom Pitch',
      'Has Mockup',
      'Created At',
    ];
    const rows = leads.map((l) => [
      `"${l.id}"`,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${l.voiceType || ''}"`,
      `"${(l.link || '').replace(/"/g, '""')}"`,
      `"${(getLeadEmail(l) || '').replace(/"/g, '""')}"`,
      `"${channelName}"`,
      `"${l.scheduledDate || ''}"`,
      `"${l.initialSentDate || ''}"`,
      `"${l.isCompleted ? 'YES' : 'NO'}"`,
      `"${(l.initialDM || l.customPitch || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${l.hasMockup || l.mockupHtml ? 'YES' : 'NO'}"`,
      `"${l.createdAt || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
