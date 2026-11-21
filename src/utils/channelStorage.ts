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
