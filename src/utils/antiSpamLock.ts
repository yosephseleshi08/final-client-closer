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

/**
 * 8-Minute Platform-Independent Warm-Up Cooling Break
 * Tracks independent timers for Instagram and Facebook warm-up actions.
 */
export const WARMUP_COOLDOWN_MS = 8 * 60 * 1000; // 8 minutes

export function getWarmupCooldownStorageKey(platform: 'instagram' | 'facebook'): string {
  return `outreach_warmup_cooldown_${platform}`;
}

/**
 * Returns remaining warm-up cooldown in milliseconds for the given platform.
 */
export function getWarmupCooldownRemaining(platform: 'instagram' | 'facebook'): number {
  try {
    const raw = localStorage.getItem(getWarmupCooldownStorageKey(platform));
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
 * Sets an 8-minute cooling break strictly for the specified platform.
 */
export function startWarmupCooldown(platform: 'instagram' | 'facebook'): void {
  try {
    const expiresAt = Date.now() + WARMUP_COOLDOWN_MS;
    localStorage.setItem(getWarmupCooldownStorageKey(platform), expiresAt.toString());
    window.dispatchEvent(
      new CustomEvent('outreach_warmup_cooldown_changed', { detail: { platform } })
    );
  } catch (err) {
    console.error('Failed to set warm-up cooldown:', err);
  }
}

/**
 * Helper to identify which platform warm-up channel applies to a lead.
 */
export function getLeadWarmupPlatform(lead?: { channel?: string; facebook?: string; instagram?: string; link?: string; platformLink?: string } | null): 'instagram' | 'facebook' {
  if (!lead) return 'instagram';
  if (lead.channel === 'instagram') return 'instagram';
  if (lead.facebook || lead.channel === 'facebook') return 'facebook';
  const raw = (lead.platformLink || lead.link || '').toLowerCase();
  if (raw.includes('facebook') || raw.includes('fb.com') || raw.includes('fb.me')) {
    return 'facebook';
  }
  return 'instagram';
}
