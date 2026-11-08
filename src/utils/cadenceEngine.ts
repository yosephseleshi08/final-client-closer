import { ChannelLead, MultiChannelType } from '../types';

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
 * Automatically schedules Value-Based Follow-Up timeline:
 * - Day 7: Value Check-In (kitchen ticket PDF)
 * - Day 14: Social Proof / Case Study (12% jump in takeout)
 * - Day 30: The Breakup / Final Audit (60-second Loom)
 */
export function markInitialSent(lead: ChannelLead, sentDate = getLocalTodayStr()): ChannelLead {
  const normSentDate = normalizeToLocalDateStr(sentDate) || getLocalTodayStr();
  const fu1 = addDays(normSentDate, 7);
  const fu2 = addDays(normSentDate, 14);
  const fu3 = addDays(normSentDate, 30);

  return {
    ...lead,
    initialSentDate: normSentDate,
    dmSent: true,
    dmSentAt: lead.dmSentAt || new Date().toISOString(),
    followup1Date: fu1,
    followup2Date: fu2,
    followup3Date: fu3,
    followupCount: 0,
    leadStatus: lead.isSeen ? 'seen' : 'waiting_reply',
    isCompleted: false,
    dismissedDate: undefined, // Clear dismissal on action
  };
}

/**
 * Returns the base outreach contact date for a lead.
 * Prefers initialSentDate, then lastContactDate, dmSentAt, createdAt, or scheduledDate.
 */
export function getLeadBaseContactDate(lead: ChannelLead): string {
  return (
    normalizeToLocalDateStr(lead.initialSentDate) ||
    normalizeToLocalDateStr(lead.lastContactDate) ||
    normalizeToLocalDateStr(lead.dmSentAt) ||
    normalizeToLocalDateStr(lead.createdAt) ||
    normalizeToLocalDateStr(lead.scheduledDate) ||
    getLocalTodayStr()
  );
}

/**
 * Calculates days elapsed since the lead's initial outreach or contact
 */
export function getDaysSinceContact(lead: ChannelLead, today = getLocalTodayStr()): number {
  const baseDate = getLeadBaseContactDate(lead);
  const diff = getDayDifference(baseDate, today);
  return Math.max(0, -diff);
}

/**
 * Cadence Transition: Mark a follow-up step as Sent (Step 1 = Day 7, Step 2 = Day 14, Step 3 = Day 30).
 */
export function markFollowupSent(
  lead: ChannelLead,
  step: 1 | 2 | 3,
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

  if (step === 2) {
    return {
      ...lead,
      followup2SentDate: normSentDate,
      followupCount: 2,
      leadStatus: lead.isSeen ? 'seen' : 'waiting_reply',
      isCompleted: false,
      dismissedDate: undefined,
    };
  }

  // Step 3: Final Day 30 touchpoint done - Archive / Complete
  return {
    ...lead,
    followup3SentDate: normSentDate,
    followupCount: 3,
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
 * Strict Day 7 Follow-Up Time-Lock (Value Check-In):
 * Returns true ONLY if today is on or after (initialSentDate + 7 days) and Follow-Up 1 is pending.
 */
export function isDay7FollowupDue(lead: ChannelLead, today = getLocalTodayStr()): boolean {
  if (lead.isCompleted || lead.leadStatus === 'replied' || lead.leadStatus === 'completed') return false;
  if (!lead.initialSentDate && !lead.dmSent) return false;
  if (lead.followupCount !== undefined && lead.followupCount > 0) return false;

  const targetDate = lead.followup1Date || addDays(getLeadBaseContactDate(lead), 7);
  const normalizedTarget = normalizeToLocalDateStr(targetDate);
  if (!normalizedTarget) return false;

  return today >= normalizedTarget;
}

/**
 * Strict Day 14 Follow-Up Time-Lock (Social Proof / Case Study):
 * Returns true ONLY if today is on or after (initialSentDate + 14 days) and Follow-Up 1 is completed.
 */
export function isDay14FollowupDue(lead: ChannelLead, today = getLocalTodayStr()): boolean {
  if (lead.isCompleted || lead.leadStatus === 'replied' || lead.leadStatus === 'completed') return false;
  if (!lead.initialSentDate && !lead.dmSent) return false;
  if (lead.followupCount !== 1) return false;

  const targetDate = lead.followup2Date || addDays(getLeadBaseContactDate(lead), 14);
  const normalizedTarget = normalizeToLocalDateStr(targetDate);
  if (!normalizedTarget) return false;

  return today >= normalizedTarget;
}

/**
 * Strict Day 30 Follow-Up Time-Lock (Breakup / Final Audit):
 * Returns true ONLY if today is on or after (initialSentDate + 30 days) and Follow-Up 2 is completed.
 */
export function isDay30FollowupDue(lead: ChannelLead, today = getLocalTodayStr()): boolean {
  if (lead.isCompleted || lead.leadStatus === 'replied' || lead.leadStatus === 'completed') return false;
  if (!lead.initialSentDate && !lead.dmSent) return false;
  if (lead.followupCount !== 2) return false;

  const targetDate = lead.followup3Date || addDays(getLeadBaseContactDate(lead), 30);
  const normalizedTarget = normalizeToLocalDateStr(targetDate);
  if (!normalizedTarget) return false;

  return today >= normalizedTarget;
}

/**
 * Checks if any follow-up touchpoint (Day 7, Day 14, or Day 30) is due today or overdue.
 */
export function isAnyFollowupDueToday(lead: ChannelLead, today = getLocalTodayStr()): boolean {
  return isDay7FollowupDue(lead, today) || isDay14FollowupDue(lead, today) || isDay30FollowupDue(lead, today);
}

// Backwards-compatibility alias for older code
export const isDay3FollowupDue = isDay7FollowupDue;

/**
 * Auto-calculates and persists the exact Day 7 reminder date.
 */
export function setDay3Reminder(lead: ChannelLead, daysAhead = 7): ChannelLead {
  const baseDate = getLeadBaseContactDate(lead);
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
    dmSent: false,
    dmSentAt: undefined,
    followup1Date: undefined,
    followup2Date: undefined,
    followup3Date: undefined,
    followupCount: 0,
    leadStatus: 'not_sent',
    isCompleted: false,
  };
}

/**
 * Returns high-converting pre-staged copy templates for Video Value First outreach & cadence:
 * - STAGE A (Initial Contact - Day 1)
 * - STAGE B (Post-Reaction - "Send it")
 * - Day 7 Trigger (Value Check-In: kitchen ticket PDF)
 * - Day 14 Trigger (Social Proof / Case Study: 12% jump in takeout)
 * - Day 30 Trigger (The "Breakup" / Final Audit: 60-second Loom)
 */
export function getCadenceMessageTemplates(lead: ChannelLead) {
  const recipient = lead.name?.trim() || 'there';
  const city = lead.city?.trim() || 'your area';
  const liveLink = lead.mockupLink || (lead.link ? (lead.link.startsWith('http') ? lead.link : `https://${lead.link}`) : '[Live Link]');

  // Stage A & Stage B Video Value scripts
  const stageAMessage =
    `Hey ${recipient}! I just posted a quick video on my story/feed breaking down your menu design/website and how you could easily add 15-20 more covers this weekend. Tagged you guys! Mind if I send the direct link to the full breakdown here?`;

  const stageBMessage =
    `Here you go: ${liveLink}. Let me know what you think of the online ordering tip at 1:12! If you want the full kitchen ticket PDF I mentioned, happy to send that over too.`;

  // Value-Based Timeline Triggers (Requirement #5)
  const day7Message =
    lead.followup3DM?.trim() ||
    `Hey ${recipient}, did you get a chance to see that breakdown video? We just put together a quick PDF on 3 ways to speed up kitchen ticket times on Friday nights—want me to drop it here?`;

  const day14Message =
    lead.followup7DM?.trim() ||
    `Hey ${recipient}! Quick update—another spot in ${city} implemented that online ordering tweak from the video we tagged you in and saw a 12% jump in takeout orders last week. Thought of you guys!`;

  const day30Message =
    `Hey ${recipient}, I know you're super busy running service. I'm archiving our video breakdown this week, but I recorded a quick 60-second Loom showing the #1 leak on your mobile checkout. Should I send the Loom or would you rather I close your file?`;

  return {
    initialPitch: stageAMessage,
    stageAMessage,
    stageBMessage,
    day7Message,
    day14Message,
    day30Message,
    // Backwards-compatible aliases
    day3Bump: day7Message,
    day7Loom: day14Message,
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

/**
 * Auto-Schedule Engine: Flat Capacity Model
 * 1. Strictly enforces the daily quota:
 *    - Instagram: 6 leads / day
 *    - Combined Outreach (Email/Facebook): 4 leads / day
 * 2. SKIPS Sundays entirely:
 *    - If today is Sunday, the first scheduled date MUST be Monday.
 *    - Any subsequent Sunday is also completely skipped.
 * 3. Evenly distributes unsent leads across Mon, Tue, Wed, Thu, Fri, Sat, (skip Sun), Mon...
 *    until all leads are assigned.
 */
export function autoScheduleLeads(
  leads: ChannelLead[],
  channel: MultiChannelType,
  startDateStr?: string
): ChannelLead[] {
  // Quota definition: Instagram = 6/day, Combined Outreach = 4/day
  const dailyQuota = channel === 'instagram' ? 6 : 4;

  const baseToday = startDateStr || getLocalTodayStr();
  const [year, month, day] = baseToday.split('-').map(Number);
  const cursor = new Date(year, month - 1, day);

  // Rule 3: Skip Sundays entirely. If today is Sunday, first scheduled date MUST be Monday.
  if (cursor.getDay() === 0) {
    cursor.setDate(cursor.getDate() + 1);
  }

  // Preserve leads where initial outreach was already sent in real life
  const unsentLeads = leads.filter((l) => !l.initialSentDate);
  const assignments: Record<string, string> = {};

  let currentSlotCount = 0;

  for (const lead of unsentLeads) {
    // Skip any Sundays
    while (cursor.getDay() === 0) {
      cursor.setDate(cursor.getDate() + 1);
      currentSlotCount = 0;
    }

    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    assignments[lead.id] = dateStr;
    currentSlotCount++;

    if (currentSlotCount >= dailyQuota) {
      cursor.setDate(cursor.getDate() + 1);
      currentSlotCount = 0;
      // Skip next Sunday if we landed on it
      while (cursor.getDay() === 0) {
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  return leads.map((lead) => {
    if (assignments[lead.id]) {
      return {
        ...lead,
        scheduledDate: assignments[lead.id],
        warmupStatus: lead.warmupStatus || (lead.isWarmedUp ? 'warmed' : 'locked'),
        dismissedDate: undefined,
      };
    }
    return lead;
  });
}

/**
 * Calculates the next available schedule date for a new lead based on current channel leads,
 * respecting the daily quota (Instagram: 6/day, Combined: 4/day) and skipping Sundays.
 */
export function getNextAvailableScheduleDate(
  currentLeads: ChannelLead[],
  channel: MultiChannelType,
  startDateStr?: string
): string {
  const dailyQuota = channel === 'instagram' ? 6 : 4;
  const baseToday = startDateStr || getLocalTodayStr();
  const [year, month, day] = baseToday.split('-').map(Number);
  const cursor = new Date(year, month - 1, day);

  if (cursor.getDay() === 0) {
    cursor.setDate(cursor.getDate() + 1);
  }

  // Count scheduled unsent leads by date
  const countsByDate: Record<string, number> = {};
  currentLeads.forEach((l) => {
    if (l.scheduledDate && !l.initialSentDate) {
      countsByDate[l.scheduledDate] = (countsByDate[l.scheduledDate] || 0) + 1;
    }
  });

  while (true) {
    while (cursor.getDay() === 0) {
      cursor.setDate(cursor.getDate() + 1);
    }
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const count = countsByDate[dateStr] || 0;
    if (count < dailyQuota) {
      return dateStr;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
}



