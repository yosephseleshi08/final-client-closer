import { getLocalTodayStr, normalizeToLocalDateStr } from './cadenceEngine';

export const VIDEO_VERIFICATIONS_STORAGE_KEY = 'outreach_video_verifications_log';

export interface VideoVerificationEntry {
  id: string;
  leadId: string;
  leadName: string;
  channel?: string;
  verifiedAt: string; // ISO string
  verifiedDate: string; // YYYY-MM-DD local
}

/**
 * Loads all recorded video verifications from localStorage.
 */
export function loadVideoVerifications(): VideoVerificationEntry[] {
  try {
    const raw = localStorage.getItem(VIDEO_VERIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load video verifications:', err);
  }
  return [];
}

/**
 * Records a verified video into localStorage with local date and ISO timestamp.
 */
export function recordVideoVerification(
  leadId: string,
  leadName: string,
  channel?: string
): VideoVerificationEntry {
  const list = loadVideoVerifications();
  const now = new Date();
  const todayStr = getLocalTodayStr();

  const entry: VideoVerificationEntry = {
    id: `verif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    leadId,
    leadName: leadName.trim(),
    channel,
    verifiedAt: now.toISOString(),
    verifiedDate: todayStr,
  };

  list.unshift(entry);
  try {
    localStorage.setItem(VIDEO_VERIFICATIONS_STORAGE_KEY, JSON.stringify(list));
    // Dispatch event so other mounted views update in real-time
    window.dispatchEvent(new CustomEvent('video-verification-updated', { detail: entry }));
  } catch (err) {
    console.error('Failed to save video verification:', err);
  }
  return entry;
}

/**
 * Returns all video verifications recorded on a given date (default today).
 */
export function getVideosVerifiedOnDate(
  dateStr: string = getLocalTodayStr()
): VideoVerificationEntry[] {
  const list = loadVideoVerifications();
  const targetDate = normalizeToLocalDateStr(dateStr) || getLocalTodayStr();
  return list.filter((v) => {
    const d1 = normalizeToLocalDateStr(v.verifiedDate);
    const d2 = normalizeToLocalDateStr(v.verifiedAt);
    return d1 === targetDate || d2 === targetDate;
  });
}

/**
 * Returns the count of videos verified today.
 */
export function getVideosVerifiedTodayCount(): number {
  return getVideosVerifiedOnDate(getLocalTodayStr()).length;
}

/**
 * Validates whether the user's input matches the lead's restaurant name.
 * Rule: Case-insensitive, trimmed comparison.
 */
export function validateRestaurantNameMatch(input: string, expectedName: string): boolean {
  const cleanInput = input.trim().toLowerCase();
  const cleanExpected = expectedName.trim().toLowerCase();
  return cleanInput.length > 0 && cleanInput === cleanExpected;
}
