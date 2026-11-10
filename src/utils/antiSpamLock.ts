/**
 * Anti-Spam 12-Minute Spaced Out DM Lock
 * Enforces natural human spacing between outreach dispatches.
 * Tracks timers separately for Instagram and Combined Outreach.
 */

const COOLDOWN_DURATION_MS = 12 * 60 * 1000; // 12 minutes in milliseconds

export function getCooldownStorageKey(channel: 'instagram' | 'combined'): string {
  return `outreach_dm_cooldown_${channel}`;
}

/**
 * Returns remaining cooldown in milliseconds (0 if no active cooldown).
 */
export function getChannelCooldownRemaining(channel: 'instagram' | 'combined'): number {
  try {
    const raw = localStorage.getItem(getCooldownStorageKey(channel));
    if (!raw) return 0;
    const expiresAt = parseInt(raw, 10);
    if (isNaN(expiresAt)) return 0;
    const remaining = expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

/**
 * Sets a new 12-minute cooldown for the given channel.
 */
export function startChannelCooldown(channel: 'instagram' | 'combined'): void {
  try {
    const expiresAt = Date.now() + COOLDOWN_DURATION_MS;
    localStorage.setItem(getCooldownStorageKey(channel), expiresAt.toString());
    window.dispatchEvent(new CustomEvent('outreach_cooldown_changed', { detail: { channel } }));
  } catch (err) {
    console.error('Failed to set channel cooldown:', err);
  }
}

/**
 * Formats milliseconds remaining into MM:SS.
 */
export function formatCooldownTime(msRemaining: number): string {
  if (msRemaining <= 0) return '00:00';
  const totalSeconds = Math.ceil(msRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
