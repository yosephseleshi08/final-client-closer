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
    return cleaned
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  return 'New Prospect';
}

/**
 * Normalizes URLs and handles for duplicate comparison.
 * Strips protocol (https://, http://), www., m., trailing slashes,
 * query parameters (?...) and hash anchors (#...).
 * Normalizes Instagram and Facebook aliases so handles and URLs match.
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

  // Strip www. or m.
  str = str.replace(/^(?:www\.|m\.)/i, '');

  // Strip query parameters and hash fragments
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
