import { ChannelLead } from '../types';

/**
 * Returns today's date formatted as YYYY-MM-DD strictly in user's local timezone
 */
export function getLocalTodayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Backward-compatibility alias
export const getTodayStr = getLocalTodayStr;

/**
 * Normalizes any date format (YYYY-MM-DD, MM/DD/YYYY, M/D/YYYY, YYYY/MM/DD, timestamps)
 * into a standardized local calendar YYYY-MM-DD string.
 */
export function normalizeToLocalDateStr(rawInput?: string | null): string | null {
  if (!rawInput) return null;
  const str = String(rawInput).trim();
  if (!str) return null;

  // 1. Standard ISO date prefix (YYYY-MM-DD)
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = String(parseInt(ymdMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. US format (MM/DD/YYYY or M/D/YYYY)
  const mdyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (mdyMatch) {
    const m = String(parseInt(mdyMatch[1], 10)).padStart(2, '0');
    const d = String(parseInt(mdyMatch[2], 10)).padStart(2, '0');
    const y = mdyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 3. Fallback: parse through Date object using local calendar getters
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return str;
}

/**
 * Adds exact days to a date string using local calendar math
 */
export function addDays(dateStr: string, days: number): string {
  const normalized = normalizeToLocalDateStr(dateStr) || getLocalTodayStr();
  const parts = normalized.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day);
  d.setDate(d.getDate() + days);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dt = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dt}`;
}

/**
 * Returns integer days difference from today:
 * positive = in future, 0 = today, negative = in past (overdue)
 */
export function getDayDifference(targetDateStr: string, fromDateStr = getLocalTodayStr()): number {
  const normalizedTarget = normalizeToLocalDateStr(targetDateStr);
  const normalizedFrom = normalizeToLocalDateStr(fromDateStr);
  if (!normalizedTarget || !normalizedFrom) return 0;

  const p1 = normalizedTarget.split('-').map(Number);
  const p2 = normalizedFrom.split('-').map(Number);

  const d1 = new Date(p1[0], p1[1] - 1, p1[2]).getTime();
  const d2 = new Date(p2[0], p2[1] - 1, p2[2]).getTime();

  return Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
}

/**
 * Checks if target date matches the user's local timezone today
 */
export function isDateToday(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const normalized = normalizeToLocalDateStr(dateStr);
  return normalized === getLocalTodayStr();
}

/**
 * Checks if target date is before today in the user's local timezone
 */
export function isDateOverdue(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const normalized = normalizeToLocalDateStr(dateStr);
  if (!normalized) return false;
  return normalized < getLocalTodayStr();
}

/**
 * Non-Destructive Daily Queue Dismissal:
 * Stamps dismissedDate with today's local date so lead is hidden for today only.
 * The lead remains safely preserved in the database and Leads tab.
 */
export function dismissLeadForToday(lead: ChannelLead): ChannelLead {
  return {
    ...lead,
    dismissedDate: getLocalTodayStr(),
  };
}

/**
 * Restores a previously dismissed lead back to the daily queue.
 */
export function restoreDismissedLead(lead: ChannelLead): ChannelLead {
  return {
    ...lead,
    dismissedDate: undefined,
  };
}

/**
 * Checks if a lead was dismissed for today's local date
 */
export function isLeadDismissedToday(lead: ChannelLead): boolean {
  if (!lead.dismissedDate) return false;
  return normalizeToLocalDateStr(lead.dismissedDate) === getLocalTodayStr();
}

/**
 * Cadence Transition: Mark initial outreach as Sent.
 * Automatically schedules Follow-Up #1 at +3 days and Follow-Up #2 at +7 days.
 */
export function markInitialSent(lead: ChannelLead, sentDate = getLocalTodayStr()): ChannelLead {
  const normSentDate = normalizeToLocalDateStr(sentDate) || getLocalTodayStr();
  const fu1 = addDays(normSentDate, 3);
  const fu2 = addDays(normSentDate, 7);

  return {
    ...lead,
    initialSentDate: normSentDate,
    followup1Date: fu1,
    followup2Date: fu2,
    followupCount: 0,
    leadStatus: lead.isSeen ? 'seen' : 'waiting_reply',
    isCompleted: false,
    dismissedDate: undefined, // Clear dismissal on action
  };
}

/**
 * Cadence Transition: Mark a follow-up step as Sent.
 */
export function markFollowupSent(
  lead: ChannelLead,
  step: 1 | 2,
  sentDate = getLocalTodayStr()
): ChannelLead {
  const normSentDate = normalizeToLocalDateStr(sentDate) || getLocalTodayStr();

  if (step === 1) {
    return {
      ...lead,
      followup1SentDate: normSentDate,
      followupCount: 1,
      leadStatus: lead.isSeen ? 'seen' : 'waiting_reply',
      isCompleted: false,
      dismissedDate: undefined,
    };
  }

  // Step 2: Final touchpoint done
  return {
    ...lead,
    followup2SentDate: normSentDate,
    followupCount: 2,
    leadStatus: 'completed',
    isCompleted: true,
    completedAt: new Date().toISOString(),
    dismissedDate: undefined,
  };
}

/**
 * Cadence Transition: Mark lead as Replied.
 */
export function markLeadReplied(lead: ChannelLead): ChannelLead {
  return {
    ...lead,
    leadStatus: 'replied',
    isCompleted: true,
    completedAt: new Date().toISOString(),
    repliedAt: new Date().toISOString(),
    dismissedDate: undefined,
  };
}

/**
 * Toggles the 'Seen' status for a lead while keeping follow-up timers active.
 */
export function toggleLeadSeen(lead: ChannelLead): ChannelLead {
  const nextSeen = !lead.isSeen;
  let nextStatus = lead.leadStatus;

  if (nextSeen) {
    if (!lead.leadStatus || lead.leadStatus === 'waiting_reply') {
      nextStatus = 'seen';
    }
  } else {
    if (lead.leadStatus === 'seen') {
      nextStatus = 'waiting_reply';
    }
  }

  return {
    ...lead,
    isSeen: nextSeen,
    leadStatus: nextStatus,
  };
}

/**
 * Returns high-converting pre-staged copy templates for initial and follow-ups.
 */
export function getCadenceMessageTemplates(lead: ChannelLead) {
  const recipient = lead.name || 'there';

  const initialPitch =
    lead.customPitch?.trim() ||
    `Hey ${recipient}! Love what you're doing. Built a 0.3s interactive prototype specifically for your business: mind if I share the 20-second preview? (Zero commitment, $299 turnkey if you ever want it live).`;

  const day3Bump = `Hey ${recipient}, bumping this quick! Wondering if you had 30 seconds to click through the interactive demo I put together for ${lead.name}? No pressure at all!`;

  const day7Loom = `Hey ${recipient}, wanted to send one final quick note! Recorded a 45-second screen recording showing exactly how the booking upgrade works for ${lead.name}. Should I drop the link here or leave you be?`;

  return {
    initialPitch,
    day3Bump,
    day7Loom,
  };
}
