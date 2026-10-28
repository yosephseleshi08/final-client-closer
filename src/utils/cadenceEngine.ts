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
 * Checks if a lead's initial outreach was marked sent today in the user's local timezone.
 */
export function isInitialSentToday(lead: ChannelLead, today = getLocalTodayStr()): boolean {
  if (!lead.initialSentDate) return false;
  return normalizeToLocalDateStr(lead.initialSentDate) === today;
}

/**
 * Strict 3-Day Follow-Up Time-Lock:
 * Returns true ONLY if today is on or after (initialSentDate + 3 days).
 */
export function isDay3FollowupDue(lead: ChannelLead, today = getLocalTodayStr()): boolean {
  if (lead.isCompleted || lead.leadStatus === 'replied' || lead.leadStatus === 'completed') return false;
  if (!lead.initialSentDate) return false;
  if (lead.followupCount !== undefined && lead.followupCount > 0) return false;

  const targetDate = lead.followup1Date || addDays(lead.initialSentDate, 3);
  const normalizedTarget = normalizeToLocalDateStr(targetDate);
  if (!normalizedTarget) return false;

  return today >= normalizedTarget;
}

/**
 * Strict 7-Day Follow-Up Time-Lock:
 * Returns true ONLY if today is on or after (initialSentDate + 7 days) and Follow-Up 1 is completed.
 */
export function isDay7FollowupDue(lead: ChannelLead, today = getLocalTodayStr()): boolean {
  if (lead.isCompleted || lead.leadStatus === 'replied' || lead.leadStatus === 'completed') return false;
  if (!lead.initialSentDate) return false;
  if (lead.followupCount !== 1) return false;

  const targetDate = lead.followup2Date || addDays(lead.initialSentDate, 7);
  const normalizedTarget = normalizeToLocalDateStr(targetDate);
  if (!normalizedTarget) return false;

  return today >= normalizedTarget;
}

/**
 * Auto-calculates and persists the exact Day 3 reminder date (initialSentDate + 3 days).
 */
export function setDay3Reminder(lead: ChannelLead, daysAhead = 3): ChannelLead {
  const baseDate = lead.initialSentDate || getLocalTodayStr();
  const reminderDate = addDays(baseDate, daysAhead);
  return {
    ...lead,
    followup1Date: reminderDate,
  };
}

/**
 * Reverts an initial send back to un-sent status if clicked accidentally.
 */
export function revertInitialSent(lead: ChannelLead): ChannelLead {
  return {
    ...lead,
    initialSentDate: undefined,
    followup1Date: undefined,
    followup2Date: undefined,
    followupCount: 0,
    leadStatus: 'not_sent',
    isCompleted: false,
  };
}

/**
 * Returns high-converting pre-staged copy templates for initial and follow-ups.
 */
export function getCadenceMessageTemplates(lead: ChannelLead) {
  const recipient = lead.name || 'there';

  const initialPitch =
    lead.initialDM?.trim() ||
    lead.customPitch?.trim() ||
    `Hey ${recipient}! Love what you're doing. Built a 0.3s interactive prototype specifically for your business: mind if I share the 20-second preview? (Zero commitment, $299 turnkey if you ever want it live).`;

  const day3Bump =
    lead.followup3DM?.trim() ||
    `Hey ${recipient}, bumping this quick! Wondering if you had 30 seconds to click through the interactive demo I put together for ${lead.name}? No pressure at all!`;

  const day7Loom =
    lead.followup7DM?.trim() ||
    `Hey ${recipient}, wanted to send one final quick note! Recorded a 45-second screen recording showing exactly how the booking upgrade works for ${lead.name}. Should I drop the link here or leave you be?`;

  return {
    initialPitch,
    day3Bump,
    day7Loom,
  };
}

/**
 * Checks if the current local day is Sunday (day 0)
 */
export function isTodaySunday(date = new Date()): boolean {
  return date.getDay() === 0;
}

/**
 * Calculates the upcoming Monday date string (YYYY-MM-DD).
 * If fromDateStr is a Sunday, returns tomorrow (+1 day).
 * Otherwise returns the next calendar Monday.
 */
export function getMondayDateStr(fromDateStr = getLocalTodayStr()): string {
  const norm = normalizeToLocalDateStr(fromDateStr) || getLocalTodayStr();
  const parts = norm.split('-');
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7 || 7;
  return addDays(norm, daysUntilMonday);
}

export interface WeeklyOutreachStats {
  dmsSentLast7Days: number;
  repliesReceived: number;
  mockupsAuditsCount: number;
}

/**
 * Computes weekly outreach performance metrics from the actual lead database.
 */
export function getWeeklyOutreachStats(
  allLeads: ChannelLead[],
  referenceDateStr = getLocalTodayStr()
): WeeklyOutreachStats {
  const cutoffDateStr = addDays(referenceDateStr, -7);

  let dmsSentLast7Days = 0;
  let repliesReceived = 0;
  let mockupsAuditsCount = 0;

  for (const lead of allLeads) {
    // 1. Initial outreach sent within last 7 days
    if (lead.initialSentDate) {
      const normSent = normalizeToLocalDateStr(lead.initialSentDate);
      if (normSent && normSent >= cutoffDateStr && normSent <= referenceDateStr) {
        dmsSentLast7Days++;
      }
    }
    // 2. Follow-ups sent within last 7 days
    if (lead.followup1SentDate) {
      const normF1 = normalizeToLocalDateStr(lead.followup1SentDate);
      if (normF1 && normF1 >= cutoffDateStr && normF1 <= referenceDateStr) {
        dmsSentLast7Days++;
      }
    }
    if (lead.followup2SentDate) {
      const normF2 = normalizeToLocalDateStr(lead.followup2SentDate);
      if (normF2 && normF2 >= cutoffDateStr && normF2 <= referenceDateStr) {
        dmsSentLast7Days++;
      }
    }

    // 3. Replied leads
    if (lead.leadStatus === 'replied') {
      repliesReceived++;
    }

    // 4. Mockups & Analysis ready
    if (lead.hasMockup || lead.mockupFileName || lead.leadAnalysis) {
      mockupsAuditsCount++;
    }
  }

  return {
    dmsSentLast7Days,
    repliesReceived,
    mockupsAuditsCount,
  };
}

export interface ScheduleDayStyle {
  dayName: string;
  dayShort: string;
  borderClass: string;
  tintClass: string;
  badgeClass: string;
  textClass: string;
}

/**
 * Color-codes leads based on scheduled day:
 * - Monday: Blue
 * - Tuesday: Purple
 * - Wednesday: Green
 * - Thursday: Amber
 * - Friday: Rose
 * - Saturday: Cyan
 * - Sunday: Rest (no color)
 * - Unscheduled: Grey
 */
export function getScheduleDayStyle(dateStr?: string | null): ScheduleDayStyle {
  if (!dateStr) {
    return {
      dayName: 'Unscheduled',
      dayShort: 'None',
      borderClass: 'border-l-4 border-l-slate-700/60',
      tintClass: 'hover:bg-slate-900/30',
      badgeClass: 'bg-slate-800 text-slate-400 border-white/5',
      textClass: 'text-slate-500',
    };
  }

  const normalized = normalizeToLocalDateStr(dateStr);
  if (!normalized) {
    return {
      dayName: 'Unscheduled',
      dayShort: 'None',
      borderClass: 'border-l-4 border-l-slate-700/60',
      tintClass: 'hover:bg-slate-900/30',
      badgeClass: 'bg-slate-800 text-slate-400 border-white/5',
      textClass: 'text-slate-500',
    };
  }

  const [y, m, d] = normalized.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayIndex = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  switch (dayIndex) {
    case 1: // Monday: Blue
      return {
        dayName: 'Monday',
        dayShort: 'Mon',
        borderClass: 'border-l-4 border-l-blue-500',
        tintClass: 'bg-blue-500/[0.04] hover:bg-blue-500/[0.07]',
        badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        textClass: 'text-blue-400',
      };
    case 2: // Tuesday: Purple
      return {
        dayName: 'Tuesday',
        dayShort: 'Tue',
        borderClass: 'border-l-4 border-l-purple-500',
        tintClass: 'bg-purple-500/[0.04] hover:bg-purple-500/[0.07]',
        badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        textClass: 'text-purple-400',
      };
    case 3: // Wednesday: Green
      return {
        dayName: 'Wednesday',
        dayShort: 'Wed',
        borderClass: 'border-l-4 border-l-emerald-500',
        tintClass: 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.07]',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        textClass: 'text-emerald-400',
      };
    case 4: // Thursday: Amber
      return {
        dayName: 'Thursday',
        dayShort: 'Thu',
        borderClass: 'border-l-4 border-l-amber-500',
        tintClass: 'bg-amber-500/[0.04] hover:bg-amber-500/[0.07]',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        textClass: 'text-amber-400',
      };
    case 5: // Friday: Rose
      return {
        dayName: 'Friday',
        dayShort: 'Fri',
        borderClass: 'border-l-4 border-l-rose-500',
        tintClass: 'bg-rose-500/[0.04] hover:bg-rose-500/[0.07]',
        badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        textClass: 'text-rose-400',
      };
    case 6: // Saturday: Cyan
      return {
        dayName: 'Saturday',
        dayShort: 'Sat',
        borderClass: 'border-l-4 border-l-cyan-500',
        tintClass: 'bg-cyan-500/[0.04] hover:bg-cyan-500/[0.07]',
        badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        textClass: 'text-cyan-400',
      };
    case 0: // Sunday: Rest (no color)
    default:
      return {
        dayName: 'Sunday',
        dayShort: 'Sun',
        borderClass: 'border-l-4 border-l-transparent',
        tintClass: 'hover:bg-slate-900/30',
        badgeClass: 'bg-slate-800/80 text-slate-400 border-white/5',
        textClass: 'text-slate-400',
      };
  }
}

/**
 * Smart Warm-Up Alert Logic:
 * - If already warmed up: false
 * - If Saturday: do NOT show warm-up alerts for Sunday (rest day)
 * - If Sunday: show warm-up alerts for Monday's leads (to prep for Monday launch)
 * - On normal weekdays: show warm-up alert for leads scheduled for today or overdue
 */
export function shouldShowWarmupAlert(lead: ChannelLead): boolean {
  if (lead.isWarmedUp || lead.isCompleted || lead.leadStatus === 'replied' || lead.leadStatus === 'completed') {
    return false;
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  if (!lead.scheduledDate) return false;
  const normDate = normalizeToLocalDateStr(lead.scheduledDate);
  if (!normDate) return false;

  const [y, m, d] = normDate.split('-').map(Number);
  const leadDay = new Date(y, m - 1, d).getDay();

  // Smart Rule 1: If today is Saturday, do NOT show warm-up alerts for Sunday
  if (currentDay === 6) {
    if (leadDay === 0) return false;
    return isDateToday(lead.scheduledDate);
  }

  // Smart Rule 2: If today is Sunday, show warm-up alerts for Monday's leads
  if (currentDay === 0) {
    return leadDay === 1;
  }

  // Normal weekdays: show alert if lead is due today or overdue
  return isDateToday(lead.scheduledDate) || isDateOverdue(lead.scheduledDate);
}


