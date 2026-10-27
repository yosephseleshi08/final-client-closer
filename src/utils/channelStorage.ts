import { ChannelLead, MultiChannelType } from '../types';

const STORAGE_PREFIX = 'outreach_channel_leads_';

export function getChannelPrefix(channel: MultiChannelType): string {
  switch (channel) {
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
    case 'email':
      return 'Email';
    case 'instagram':
      return 'Instagram';
    case 'facebook':
      return 'Facebook';
  }
}

/**
 * Loads leads for a specific channel from localStorage with full isolation.
 */
export function loadChannelLeads(channel: MultiChannelType): ChannelLead[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${channel}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Sort by sortOrder ascending
        return parsed.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
    }
  } catch (err) {
    console.error(`Failed to load leads for channel "${channel}":`, err);
  }
  return [];
}

/**
 * Saves leads for a specific channel to localStorage.
 */
export function saveChannelLeads(channel: MultiChannelType, leads: ChannelLead[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${channel}`, JSON.stringify(leads));
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
    } else {
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
 * Extracts a suggested business name from a URL or handle.
 */
export function extractSuggestedName(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return 'New Prospect';

  // Handle email
  if (trimmed.includes('@') && !trimmed.includes('/')) {
    const parts = trimmed.split('@');
    const localPart = parts[0].replace(/[._-]+/g, ' ');
    return localPart
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ') || 'Prospect';
  }

  // Handle URL
  let pathOnly = trimmed
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
    const formatted = cleaned
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    if (
      formatted.toLowerCase() === 'profile php' ||
      formatted.toLowerCase() === 'profile' ||
      /^[0-9\s]+$/.test(formatted)
    ) {
      return 'New Prospect';
    }
    return formatted;
  }

  return 'New Prospect';
}

/**
 * Normalizes URLs and handles for duplicate comparison.
 * - Strips protocol (https://, http://) and mailto:
 * - Normalizes subdomains (web., m., mobile., touch., l., lm., www.) to canonical domain
 * - CRITICAL FIX FOR FACEBOOK: If a URL contains "facebook.com/profile.php?id=", it DOES NOT strip the `id` parameter.
 *   Only strips tracking parameters like `&sk=about`, `&mibextid=...`, `&rdc=1`, `&_rdc=...`, etc.
 *   Ensures that `profile.php?id=100094275802002` and `profile.php?id=61586199793829` are recognized as distinct unique links.
 * - For other links, strips all query params and hash fragments
 * - Strips trailing slashes
 * - Normalizes handles (@handle) to domain paths
 */
export function normalizeUrlForDuplicateCheck(
  rawInput: string,
  channel?: MultiChannelType
): string {
  if (!rawInput || typeof rawInput !== 'string') return '';
  let str = rawInput.trim();
  if (!str) return '';

  // Lowercase for comparison
  str = str.toLowerCase();

  // Strip mailto:
  str = str.replace(/^mailto:/i, '');

  // Strip protocol
  str = str.replace(/^https?:\/\//i, '');

  // Normalize common Facebook & Instagram subdomains (web., m., mobile., touch., l., lm., www., etc.)
  str = str.replace(/^(?:[a-z0-9_-]+\.)*(?:facebook\.com|fb\.com|fb\.me)(?:\/|$)/i, 'facebook.com/');
  str = str.replace(/^(?:[a-z0-9_-]+\.)*(?:instagram\.com|instagr\.am)(?:\/|$)/i, 'instagram.com/');
  str = str.replace(/^(?:www\.|m\.|mobile\.|web\.)/i, '');

  // If in Facebook channel and starts with profile.php directly
  if ((channel === 'facebook' || str.startsWith('profile.php')) && !str.startsWith('facebook.com/')) {
    str = `facebook.com/${str}`;
  }

  // Handle Facebook profile links with ?id=... (CRITICAL FIX)
  // Ensures profile.php?id=100094275802002 and profile.php?id=61586199793829 are recognized as distinct unique links
  // while stripping tracking parameters (&sk=about, &mibextid=..., &rdc=1, &_rdc=1, etc.)
  if (
    str.includes('facebook.com/profile.php') ||
    str.includes('/profile.php') ||
    (channel === 'facebook' && str.includes('profile.php'))
  ) {
    const idMatch = str.match(/[?&]id=([0-9a-zA-Z._-]+)/i);
    if (idMatch && idMatch[1]) {
      return `facebook.com/profile.php?id=${idMatch[1]}`;
    }
  }

  // Strip query parameters and hash fragments for other links
  str = str.split('?')[0].split('#')[0];

  // Strip trailing slashes
  str = str.replace(/\/+$/, '');

  // Channel-specific handle/domain normalization
  if (channel === 'instagram' || str.includes('instagram.com') || str.includes('instagr.am')) {
    if (str.startsWith('@')) {
      str = `instagram.com/${str.slice(1)}`;
    } else if (!str.includes('.') && !str.includes('/')) {
      str = `instagram.com/${str}`;
    } else {
      str = str.replace(/^instagr\.am\//i, 'instagram.com/');
    }
  } else if (channel === 'facebook' || str.includes('facebook.com') || str.includes('fb.com') || str.includes('fb.me')) {
    str = str
      .replace(/^fb\.com\//i, 'facebook.com/')
      .replace(/^fb\.me\//i, 'facebook.com/');
    if (str.startsWith('@')) {
      str = `facebook.com/${str.slice(1)}`;
    }
  }

  // Final trim of any remaining trailing slashes
  str = str.replace(/\/+$/, '');

  return str;
}

/**
 * Formats a lead's createdAt or added timestamp into a clean date string.
 * Uses local calendar parsing to avoid timezone day-shift bugs.
 */
export function formatAddedDate(rawDate?: string | null): string {
  if (!rawDate) return 'an earlier date';
  const str = String(rawDate).trim();
  if (!str) return 'an earlier date';

  // If ISO string like 2026-10-24T... or YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10) - 1;
    const d = parseInt(ymdMatch[3], 10);
    const dateObj = new Date(y, m, d);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString();
    }
  }

  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString();
    }
  } catch {}

  return str.split('T')[0] || str;
}

export interface ChannelValidationResult {
  isValid: boolean;
  detectedChannel?: MultiChannelType;
  errorMessage?: string;
}

/**
 * Detects if a raw input is an Instagram handle/link, Facebook link, or Email.
 */
export function detectLinkChannel(input: string): MultiChannelType | 'other' {
  const clean = input.trim().toLowerCase();

  // 1. Check Instagram
  if (
    clean.includes('instagram.com') ||
    clean.includes('instagr.am') ||
    clean.startsWith('@')
  ) {
    return 'instagram';
  }

  // 2. Check Facebook
  if (
    clean.includes('facebook.com') ||
    clean.includes('fb.com') ||
    clean.includes('fb.me')
  ) {
    return 'facebook';
  }

  // 3. Check Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const strippedMailto = clean.replace(/^mailto:/i, '');
  if (emailRegex.test(strippedMailto)) {
    return 'email';
  }

  return 'other';
}

/**
 * Validates a lead link or handle strictly against the active workspace channel.
 * Returns failure with custom error message and target channel recommendation.
 */
export function validateChannelLink(
  rawInput: string,
  channel: MultiChannelType
): ChannelValidationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid link, handle, or email.',
    };
  }

  const detected = detectLinkChannel(trimmed);

  if (channel === 'email') {
    if (detected === 'instagram') {
      return {
        isValid: false,
        detectedChannel: 'instagram',
        errorMessage: 'Error: This is an Instagram link. Please switch to the Instagram workspace.',
      };
    }
    if (detected === 'facebook') {
      return {
        isValid: false,
        detectedChannel: 'facebook',
        errorMessage: 'Error: This is a Facebook link. Please switch to the Facebook workspace.',
      };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = trimmed.replace(/^mailto:/i, '').trim();
    if (!emailRegex.test(cleanEmail)) {
      return {
        isValid: false,
        errorMessage: 'Error: This is not an email address. Please enter a valid email address (e.g. contact@business.com).',
      };
    }
    return { isValid: true };
  }

  if (channel === 'instagram') {
    if (detected === 'facebook') {
      return {
        isValid: false,
        detectedChannel: 'facebook',
        errorMessage: 'Error: This is a Facebook link. Please switch to the Facebook workspace.',
      };
    }
    if (detected === 'email') {
      return {
        isValid: false,
        detectedChannel: 'email',
        errorMessage: 'Error: This is an email address. Please switch to the Email workspace.',
      };
    }
    const lower = trimmed.toLowerCase();
    const isInsta = lower.includes('instagram.com') || lower.includes('instagr.am') || lower.startsWith('@');
    if (!isInsta) {
      return {
        isValid: false,
        errorMessage: "Error: This is not an Instagram link or handle. Please enter a link containing 'instagram.com' or starting with '@'.",
      };
    }
    return { isValid: true };
  }

  if (channel === 'facebook') {
    if (detected === 'instagram') {
      return {
        isValid: false,
        detectedChannel: 'instagram',
        errorMessage: 'Error: This is an Instagram link. Please switch to the Instagram workspace.',
      };
    }
    if (detected === 'email') {
      return {
        isValid: false,
        detectedChannel: 'email',
        errorMessage: 'Error: This is an email address. Please switch to the Email workspace.',
      };
    }
    const lower = trimmed.toLowerCase();
    const isFb = lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.me');
    if (!isFb) {
      return {
        isValid: false,
        errorMessage: "Error: This is not a Facebook link. Please enter a link containing 'facebook.com'.",
      };
    }
    return { isValid: true };
  }

  return { isValid: true };
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
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${channel}_leads_${timestamp}.${format}`;

  if (format === 'json') {
    const jsonStr = JSON.stringify(leads, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    downloadBlob(blob, filename);
  } else {
    // CSV
    const headers = [
      'ID',
      'Name',
      'Link',
      'Channel',
      'Scheduled Date',
      'Completed',
      'Custom Pitch',
      'Has Mockup',
      'Created At',
    ];
    const rows = leads.map((l) => [
      `"${l.id}"`,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.link || '').replace(/"/g, '""')}"`,
      `"${channelName}"`,
      `"${l.scheduledDate || ''}"`,
      `"${l.isCompleted ? 'YES' : 'NO'}"`,
      `"${(l.customPitch || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${l.hasMockup ? 'YES' : 'NO'}"`,
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
