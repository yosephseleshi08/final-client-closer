import { playNotificationChime } from './soundEffects';

const LAST_NOTIFICATION_KEY = 'outreach_engine_last_notification_date_v1';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      playNotificationChime();
      new Notification('🔔 Notifications Enabled!', {
        body: 'Outreach Engine Pro will alert you when follow-ups and daily DMs are due.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      });
    }
    return permission;
  } catch (e) {
    return 'denied';
  }
}

export function sendDesktopNotification(title: string, body: string, onClick?: () => void) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  try {
    playNotificationChime();
    const notification = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'outreach-due-reminder',
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
  } catch (e) {
    console.warn('Desktop notification failed:', e);
  }
}

/**
 * Checks if a daily reminder notification should be fired
 */
export function checkDailyFollowupReminder(
  dueFollowupsCount: number,
  todayDmsCount: number,
  onNavigateToDispatch?: () => void
) {
  if (dueFollowupsCount === 0 && todayDmsCount === 0) return;
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const todayStr = new Date().toISOString().split('T')[0];
  const lastNotified = localStorage.getItem(LAST_NOTIFICATION_KEY);

  // If already notified today, skip to avoid spamming
  if (lastNotified === todayStr) return;

  const parts: string[] = [];
  if (dueFollowupsCount > 0) parts.push(`${dueFollowupsCount} follow-up${dueFollowupsCount > 1 ? 's' : ''} waiting`);
  if (todayDmsCount > 0) parts.push(`${todayDmsCount} daily DM${todayDmsCount > 1 ? 's' : ''} scheduled`);

  const body = `Time to close! You have ${parts.join(' and ')} for today.`;
  sendDesktopNotification('⚡ Outreach Engine: Today\'s Action Plan', body, onNavigateToDispatch);
  localStorage.setItem(LAST_NOTIFICATION_KEY, todayStr);
}
