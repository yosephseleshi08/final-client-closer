import { ChannelLead, MultiChannelType } from '../types';
import { getStrictVoiceTypeForId } from './voiceTypeEngine';
import { getLeadInstagram, getLeadFacebook } from './channelStorage';
import { shiftDueDateOffRestDay } from './leadLifecycle';
import { appendDispatchEntry, resolveLeadDispatchChannel } from './dispatchLog';
import { lockObligationOnFirstDispatch } from './dailyObligation';

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

  // 1. Plain local date format: YYYY-MM-DD (strictly 10 characters, no time component)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 2. If it contains time (like ISO 8601 with 'T', e.g. 2026-11-11T03:59:00Z or date with space and time),
  // parse through Date object using local calendar getters to strictly honor user's local timezone.
  if (str.includes('T') || str.includes(':') || str.includes('Z')) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // 3. US format (MM/DD/YYYY or M/D/YYYY)
  const mdyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (mdyMatch) {
    const m = String(parseInt(mdyMatch[1], 10)).padStart(2, '0');
    const d = String(parseInt(mdyMatch[2], 10)).padStart(2, '0');
    const y = mdyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 4. Standard date prefix (YYYY/MM/DD or YYYY.MM.DD)
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = String(parseInt(ymdMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 5. Fallback: parse through Date object using local calendar getters
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
 * Automatically schedules Closed-System 4/8/14 Follow-Up timeline:
 * - Day 4: Value Check-In (kitchen ticket PDF)
 * - Day 8: Social Proof / Case Study (12% jump in takeout)
 * - Day 14: Final Nudge / Breakup (60-second Loom)
 */
export function markInitialSent(lead: ChannelLead, sentDate = getLocalTodayStr()): ChannelLead {
  const normSentDate = normalizeToLocalDateStr(sentDate) || getLocalTodayStr();
  const fu1 = shiftDueDateOffRestDay(addDays(normSentDate, 4));
  const fu2 = shiftDueDateOffRestDay(addDays(normSentDate, 8));
  const fu3 = shiftDueDateOffRestDay(addDays(normSentDate, 14));

  const nowIso = new Date().toISOString();

  lockObligationOnFirstDispatch(normSentDate);
  appendDispatchEntry({
    leadId: lead.id,
    leadName: lead.name,
    channel: resolveLeadDispatchChannel(lead),
    step: 'D0',
    localDate: normSentDate,
    timestamp: nowIso,
    source: 'live',
  });

  return {
    ...lead,
    initialSentDate: normSentDate,
    dispatchDate: normSentDate,
    dispatchedAt: lead.dmSentAt || nowIso,
    status: 'dispatched',
    dmSent: true,
    dmSentAt: lead.dmSentAt || nowIso,
    followup1Date: fu1,
    followup2Date: fu2,
    followup3Date: fu3,
    followupCount: 0,
    leadStatus: lead.isSeen ? 'seen' : 'waiting_reply',
    cadenceStatus: 'running',
    cancelledReason: undefined,
    cancelledAt: undefined,
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
 * Cadence Transition: Mark a follow-up step as Sent (Step 1 = Day 4, Step 2 = Day 8, Step 3 = Day 14).
 */
export function markFollowupSent(
  lead: ChannelLead,
  step: 1 | 2 | 3,
  sentDate = getLocalTodayStr()
): ChannelLead {
  const normSentDate = normalizeToLocalDateStr(sentDate) || getLocalTodayStr();

  const nowIso = new Date().toISOString();
  const dispatchStep = step === 1 ? 'D4' : step === 2 ? 'D8' : 'D14';

  lockObligationOnFirstDispatch(normSentDate);
  appendDispatchEntry({
    leadId: lead.id,
    leadName: lead.name,
    channel: resolveLeadDispatchChannel(lead),
    step: dispatchStep,
    localDate: normSentDate,
    timestamp: nowIso,
    source: 'live',
  });

  if (step === 1) {
    return {
      ...lead,
      followup1SentDate: normSentDate,
      dispatchDate: normSentDate,
      dispatchedAt: nowIso,
      status: 'dispatched',
      followupCount: 1,
      leadStatus: lead.isSeen ? 'seen' : 'waiting_reply',
      cadenceStatus: 'running',
      isCompleted: false,
      dismissedDate: undefined,
    };
  }

  if (step === 2) {
    return {
      ...lead,
      followup2SentDate: normSentDate,
      dispatchDate: normSentDate,
      dispatchedAt: nowIso,
      status: 'dispatched',
      followupCount: 2,
      leadStatus: lead.isSeen ? 'seen' : 'waiting_reply',
      cadenceStatus: 'running',
      isCompleted: false,
      dismissedDate: undefined,
    };
  }

  // Step 3: Final Day 14 touchpoint done - Archive / Complete
  return {
    ...lead,
    followup3SentDate: normSentDate,
    dispatchDate: normSentDate,
    dispatchedAt: nowIso,
    status: 'dispatched',
    followupCount: 3,
    leadStatus: 'completed',
    cadenceStatus: 'completed',
    isCompleted: true,
    completedAt: nowIso,
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
    cadenceStatus: 'completed',
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
 * Resolves the effective initial outreach sent date (YYYY-MM-DD in local timezone)
 * from initialSentDate or fallback sent timestamps when initial outreach was already logged.
 */
export function getEffectiveInitialSentDate(lead: ChannelLead): string | null {
  const normInitial = normalizeToLocalDateStr(lead.initialSentDate);
  if (normInitial) return normInitial;

  const hasSentSignal = Boolean(
    lead.dmSent ||
      lead.status === 'dispatched' ||
      lead.status === 'sent' ||
      (typeof lead.followupCount === 'number' && lead.followupCount > 0) ||
      lead.followup1SentDate ||
      lead.followup2SentDate ||
      lead.followup3SentDate
  );

  if (!hasSentSignal) return null;

  return (
    normalizeToLocalDateStr(lead.dispatchDate) ||
    normalizeToLocalDateStr(lead.dmSentAt) ||
    normalizeToLocalDateStr(lead.dispatchedAt) ||
    normalizeToLocalDateStr(lead.lastContactDate) ||
    null
  );
}

export interface ResolvedCadenceStep {
  stageNumber: 0 | 4 | 8 | 14 | null;
  step: 0 | 1 | 2 | 3 | null;
  daysSinceInitial: number;
  effectiveInitialSentDate: string | null;
  isFollowupDue: boolean;
}

/**
 * Calculates the lead's actual current cadence step based on days passed since initialSentDate
 * and followupCount, automatically advancing past skipped days (e.g. missed Day 4 -> Day 8 on Day 8+).
 */
export function resolveLeadCadenceStep(
  lead: ChannelLead,
  today = getLocalTodayStr()
): ResolvedCadenceStep {
  const effectiveInitial = getEffectiveInitialSentDate(lead);

  if (
    lead.cadenceStatus === 'cancelled' ||
    lead.cadenceStatus === 'completed' ||
    lead.isCompleted ||
    lead.leadStatus === 'replied' ||
    lead.leadStatus === 'completed'
  ) {
    const days = effectiveInitial ? Math.max(0, getDayDifference(today, effectiveInitial)) : 0;
    return {
      stageNumber: null,
      step: null,
      daysSinceInitial: days,
      effectiveInitialSentDate: effectiveInitial,
      isFollowupDue: false,
    };
  }

  const hasInitialSentFlag = Boolean(
    effectiveInitial ||
      lead.dmSent ||
      lead.status === 'dispatched' ||
      lead.status === 'sent' ||
      (typeof lead.followupCount === 'number' && lead.followupCount > 0)
  );

  // Day 0 = Initial DM (no initialSentDate / sent signal exists)
  if (!hasInitialSentFlag) {
    return {
      stageNumber: 0,
      step: 0,
      daysSinceInitial: 0,
      effectiveInitialSentDate: null,
      isFollowupDue: false,
    };
  }

  const fuCount = typeof lead.followupCount === 'number' ? lead.followupCount : 0;
  if (fuCount >= 3) {
    const days = effectiveInitial ? Math.max(0, getDayDifference(today, effectiveInitial)) : 14;
    return {
      stageNumber: null,
      step: null,
      daysSinceInitial: days,
      effectiveInitialSentDate: effectiveInitial,
      isFollowupDue: false,
    };
  }

  const daysSinceInitial = effectiveInitial
    ? Math.max(0, getDayDifference(today, effectiveInitial))
    : fuCount === 0
    ? 4
    : fuCount === 1
    ? 8
    : 14;

  // Day 14 = 14+ days passed and followupCount <= 2 (handles skipped Day 4 or Day 8)
  if (daysSinceInitial >= 14 && fuCount <= 2) {
    return {
      stageNumber: 14,
      step: 3,
      daysSinceInitial,
      effectiveInitialSentDate: effectiveInitial,
      isFollowupDue: true,
    };
  }

  // Day 8 = 8+ days passed and followupCount <= 1 (handles skipped Day 4)
  if (daysSinceInitial >= 8 && fuCount <= 1) {
    return {
      stageNumber: 8,
      step: 2,
      daysSinceInitial,
      effectiveInitialSentDate: effectiveInitial,
      isFollowupDue: true,
    };
  }

  // Day 4 = 4+ days passed and followupCount === 0
  if (daysSinceInitial >= 4 && fuCount === 0) {
    return {
      stageNumber: 4,
      step: 1,
      daysSinceInitial,
      effectiveInitialSentDate: effectiveInitial,
      isFollowupDue: true,
    };
  }

  // Waiting for next follow-up window
  return {
    stageNumber: null,
    step: null,
    daysSinceInitial,
    effectiveInitialSentDate: effectiveInitial,
    isFollowupDue: false,
  };
}

/**
 * Day 4 Follow-Up (Value Check-In):
 * True when resolved cadence step is Day 4 (4-7 days passed and followupCount === 0).
 */
export function isDay4FollowupDue(lead: ChannelLead, today = getLocalTodayStr()): boolean {
  return resolveLeadCadenceStep(lead, today).stageNumber === 4;
}

/**
 * Day 8 Follow-Up (Social Proof / Quick Bump):
 * True when resolved cadence step is Day 8 (8-13 days passed and followupCount <= 1, including skipped Day 4).
 */
export function isDay8FollowupDue(lead: ChannelLead, today = getLocalTodayStr()): boolean {
  return resolveLeadCadenceStep(lead, today).stageNumber === 8;
}

/**
 * Day 14 Follow-Up (Breakup / Final Nudge):
 * True when resolved cadence step is Day 14 (14+ days passed and followupCount <= 2, including skipped Day 4/8).
 */
export function isDay14FollowupDue(lead: ChannelLead, today = getLocalTodayStr()): boolean {
  return resolveLeadCadenceStep(lead, today).stageNumber === 14;
}

/**
 * Checks if any follow-up touchpoint (Day 4, Day 8, or Day 14) is due today or overdue.
 */
export function isAnyFollowupDueToday(lead: ChannelLead, today = getLocalTodayStr()): boolean {
  return resolveLeadCadenceStep(lead, today).isFollowupDue;
}

// Backwards-compatibility aliases for legacy 7/14/30 and 3/7 callers
export const isDay7FollowupDue = isDay4FollowupDue;
export const isDay30FollowupDue = isDay14FollowupDue;
export const isDay3FollowupDue = isDay4FollowupDue;

/**
 * Auto-calculates and persists the exact Day 4 reminder date (shifted off Sunday/Frozen).
 */
export function setDay3Reminder(lead: ChannelLead, daysAhead = 4): ChannelLead {
  const baseDate = getLeadBaseContactDate(lead);
  const reminderDate = shiftDueDateOffRestDay(addDays(baseDate, daysAhead));
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
    dispatchDate: undefined,
    dispatchedAt: undefined,
    status: undefined,
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
 * Returns high-converting pre-staged copy templates for Closed-System 4/8/14 outreach cadence:
 * - STAGE A (Initial Contact - Day 0)
 * - STAGE B (Post-Reaction - "Send it")
 * - Day 4 Trigger (Value Check-In: kitchen ticket PDF)
 * - Day 8 Trigger (Social Proof / Case Study: 12% jump in takeout)
 * - Day 14 Trigger (The "Breakup" / Final Audit: 60-second Loom)
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

  // Value-Based Timeline Triggers (4/8/14 Sequence)
  const day4Message =
    lead.followupDM_Day4?.trim() ||
    lead.followupDM_Day7?.trim() ||
    lead.followup3DM?.trim() ||
    `Hey ${recipient}, did you get a chance to see that breakdown video? We just put together a quick PDF on 3 ways to speed up kitchen ticket times on Friday nights—want me to drop it here?`;

  const day8Message =
    lead.followupDM_Day8?.trim() ||
    lead.followupDM_Day14?.trim() ||
    lead.followup7DM?.trim() ||
    `Hey ${recipient}! Quick update—another spot in ${city} implemented that online ordering tweak from the video we tagged you in and saw a 12% jump in takeout orders last week. Thought of you guys!`;

  const day14Message =
    lead.breakupDM_Day14?.trim() ||
    lead.breakupDM_Day30?.trim() ||
    `Hey ${recipient}, I know you're super busy running service. I'm archiving our video breakdown this week, but I recorded a quick 60-second Loom showing the #1 leak on your mobile checkout. Should I send the Loom or would you rather I close your file?`;

  return {
    initialPitch: stageAMessage,
    stageAMessage,
    stageBMessage,
    day4Message,
    day8Message,
    day14Message,
    // Backwards-compatible aliases
    day7Message: day4Message,
    day30Message: day14Message,
    day3Bump: day4Message,
    day7Loom: day8Message,
  };
}

/**
 * Returns the exact saved or template message for a specific cadence stage (0, 4, 8, or 14).
 * Never falls back to Initial DM when a follow-up stage (4, 8, 14) is active.
 */
export function getMessageForCadenceStage(
  lead: ChannelLead,
  stageNumber: 0 | 4 | 8 | 14
): string {
  const templates = getCadenceMessageTemplates(lead);
  if (stageNumber === 0) {
    return (
      lead.initialDM?.trim() ||
      lead.customPitch?.trim() ||
      lead.stagedDmMiniPitch?.trim() ||
      templates.stageAMessage
    );
  }
  if (stageNumber === 4) {
    return (
      lead.followupDM_Day4?.trim() ||
      lead.followupDM_Day7?.trim() ||
      lead.followup3DM?.trim() ||
      templates.day4Message
    );
  }
  if (stageNumber === 8) {
    return (
      lead.followupDM_Day8?.trim() ||
      lead.followupDM_Day14?.trim() ||
      lead.followup7DM?.trim() ||
      templates.day8Message
    );
  }
  return (
    lead.breakupDM_Day14?.trim() ||
    lead.breakupDM_Day30?.trim() ||
    templates.day14Message
  );
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
 * Resolves tomorrow's warmup target date string (YYYY-MM-DD).
 * - Mon-Fri: tomorrow is next calendar day (+1).
 * - Saturday: Sunday is rest day, so tomorrow's dispatch target is Monday (+2).
 * - Sunday: tomorrow is Monday (+1).
 */
export function getTomorrowWarmupTargetDate(referenceDateStr = getLocalTodayStr()): string {
  const norm = normalizeToLocalDateStr(referenceDateStr) || getLocalTodayStr();
  const [y, m, d] = norm.split('-').map(Number);
  const currentDay = new Date(y, m - 1, d).getDay(); // 0 = Sun, 6 = Sat

  if (currentDay === 6) {
    // Saturday -> next dispatch is Monday (+2 days)
    return addDays(norm, 2);
  }
  return addDays(norm, 1);
}

/**
 * Checks if a lead has been marked as warmed up.
 */
export function isLeadWarmed(lead: ChannelLead): boolean {
  return lead.warmupStatus === 'warmed' || Boolean(lead.isWarmedUp);
}

export const WARMUP_MANUAL_OVERRIDE_KEY = 'crm_warmup_manual_override_unlocked';

export function isManualWarmupOverrideEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(WARMUP_MANUAL_OVERRIDE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setManualWarmupOverride(enabled: boolean): void {
  try {
    if (typeof window === 'undefined') return;
    if (enabled) {
      localStorage.setItem(WARMUP_MANUAL_OVERRIDE_KEY, 'true');
    } else {
      localStorage.removeItem(WARMUP_MANUAL_OVERRIDE_KEY);
    }
    window.dispatchEvent(new CustomEvent('crm_warmup_override_changed', { detail: { enabled } }));
  } catch (err) {
    console.error('Failed to update manual warm-up override', err);
  }
}

/**
 * Checks if a lead was warmed up TODAY.
 * If warmed today (or if warmed with no timestamp), it CANNOT be sent today; it unlocks at midnight tomorrow.
 */
export function isLeadWarmedToday(lead: ChannelLead, referenceDateStr = getLocalTodayStr()): boolean {
  // Email-only leads do not require social warm-up or midnight wait
  if (isEmailOnlyLead(lead)) {
    return false;
  }
  // If manual testing override is enabled in settings, unlock for testing
  if (isManualWarmupOverrideEnabled()) {
    return false;
  }
  if (!lead.isWarmedUp && lead.warmupStatus !== 'warmed') {
    return false;
  }
  // STRICT RULE 1: If no date stamp was explicitly recorded, strictly default to warmed today
  // (Safety first - prevents accidental same-day dispatch and Instagram bans)
  if (!lead.warmedUpAt) {
    return true;
  }
  const warmedDate = normalizeToLocalDateStr(lead.warmedUpAt);
  // If normalization failed or matches today or in the future: strictly warmed today
  if (!warmedDate || warmedDate >= referenceDateStr) {
    return true;
  }
  return false;
}

/**
 * Checks if a lead was warmed up strictly BEFORE today (e.g. yesterday or earlier).
 * A lead can ONLY be dispatched if it was warmed up before today.
 * Warming up a lead today is strictly for tomorrow's dispatch. Same-day send is prohibited.
 */
export function isLeadWarmedBeforeToday(lead: ChannelLead, referenceDateStr = getLocalTodayStr()): boolean {
  // If manual testing override is enabled, allow immediate dispatch
  if (isManualWarmupOverrideEnabled()) {
    return true;
  }
  if (!lead.isWarmedUp && lead.warmupStatus !== 'warmed') {
    return false;
  }
  // If warmed today (or missing timestamp defaulting to today), strictly prohibited from same-day dispatch
  if (isLeadWarmedToday(lead, referenceDateStr)) {
    return false;
  }
  if (lead.warmedUpAt) {
    const warmedDate = normalizeToLocalDateStr(lead.warmedUpAt);
    if (warmedDate) {
      // Must be strictly earlier than reference date (yesterday or older)
      return warmedDate < referenceDateStr;
    }
  }
  // Safe default: cannot dispatch today without verified past date
  return false;
}

/**
 * Checks if a lead's dispatch is locked (warm-up required).
 * A lead is locked if not warmed up, or if only warmed up today (same-day dispatch prohibited).
 */
export function isLeadDispatchLocked(lead: ChannelLead, referenceDateStr = getLocalTodayStr()): boolean {
  if (isManualWarmupOverrideEnabled()) {
    return false;
  }
  if (isEmailOnlyLead(lead)) {
    return false;
  }
  return !isLeadWarmedBeforeToday(lead, referenceDateStr);
}

/**
 * Smart Warm-Up Alert Logic:
 * - If already warmed up: false
 * - If Saturday: do NOT show warm-up alerts for Sunday (rest day)
 * - If Sunday: show warm-up alerts for Monday's leads (to prep for Monday launch)
 * - On normal weekdays: show warm-up alert for leads scheduled for today or overdue
 */
export function shouldShowWarmupAlert(lead: ChannelLead): boolean {
  if (isEmailOnlyLead(lead)) {
    return false;
  }
  if (lead.isWarmedUp || lead.warmupStatus === 'warmed' || lead.isCompleted || lead.leadStatus === 'replied' || lead.leadStatus === 'completed') {
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
/**
 * Auto-Schedule Engine: Closed-System Flat Capacity Model
 * 1. Requirement 4: Starts TOMORROW (never today). Today is strictly reserved for warming up tomorrow's leads.
 * 2. Strictly enforces the daily quota:
 *    - Instagram: 6 leads / day
 *    - Combined Outreach (Email/Facebook): 4 leads / day
 * 3. SKIPS Sundays entirely:
 *    - If tomorrow is Sunday, the first scheduled date MUST be Monday (+2 days).
 *    - Any subsequent Sunday is also completely skipped.
 * 4. Evenly distributes unsent leads across Mon, Tue, Wed, Thu, Fri, Sat, (skip Sun), Mon...
 *    until all leads are assigned.
 */
export function autoScheduleLeads(
  leads: ChannelLead[],
  channel: MultiChannelType,
  startDateStr?: string
): ChannelLead[] {
  // Quota definition: Instagram = 6/day, Combined Outreach = 4/day
  const dailyQuota = channel === 'instagram' ? 6 : 4;

  // Starts TOMORROW by default, shifted off Sundays & frozen days
  const tomorrowStr = addDays(getLocalTodayStr(), 1);
  let cursorDateStr = shiftDueDateOffRestDay(
    normalizeToLocalDateStr(startDateStr) || tomorrowStr
  );

  // Preserve leads where initial outreach was already sent OR cadence was cancelled
  const unsentLeads = leads.filter(
    (l) =>
      !l.initialSentDate &&
      !l.dmSent &&
      !l.dispatchedAt &&
      l.cadenceStatus !== 'cancelled' &&
      !l.isArchived
  );
  const assignments: Record<string, string> = {};

  let currentSlotCount = 0;

  for (const lead of unsentLeads) {
    const safeDate = shiftDueDateOffRestDay(cursorDateStr);
    if (safeDate !== cursorDateStr) {
      cursorDateStr = safeDate;
      currentSlotCount = 0;
    }

    assignments[lead.id] = cursorDateStr;
    currentSlotCount++;

    if (currentSlotCount >= dailyQuota) {
      cursorDateStr = shiftDueDateOffRestDay(addDays(cursorDateStr, 1));
      currentSlotCount = 0;
    }
  }

  return leads.map((lead, idx) => {
    const assignedVoice = getStrictVoiceTypeForId(lead, channel, idx);
    const emailOnly = isEmailOnlyLead(lead);

    if (assignments[lead.id]) {
      return {
        ...lead,
        scheduledDate: assignments[lead.id],
        warmupStatus: emailOnly ? 'warmed' : (lead.warmupStatus || (lead.isWarmedUp ? 'warmed' : 'locked')),
        isWarmedUp: emailOnly ? true : lead.isWarmedUp,
        voiceType: assignedVoice,
        isVoiceTypeOverridden: false,
        dismissedDate: undefined,
      };
    }
    return {
      ...lead,
      warmupStatus: emailOnly ? 'warmed' : lead.warmupStatus,
      isWarmedUp: emailOnly ? true : lead.isWarmedUp,
      voiceType: assignedVoice,
      isVoiceTypeOverridden: false,
    };
  });
}

/**
 * Calculates the next available schedule date for a new lead based on current channel leads.
 * Starts TOMORROW (never today). Skips Sundays and frozen pipeline days.
 */
export function getNextAvailableScheduleDate(
  currentLeads: ChannelLead[],
  channel: MultiChannelType,
  startDateStr?: string
): string {
  const dailyQuota = channel === 'instagram' ? 6 : 4;

  const tomorrowStr = addDays(getLocalTodayStr(), 1);
  let cursorDateStr = shiftDueDateOffRestDay(
    normalizeToLocalDateStr(startDateStr) || tomorrowStr
  );

  // Count scheduled unsent leads by date (excluding cancelled / archived)
  const countsByDate: Record<string, number> = {};
  currentLeads.forEach((l) => {
    if (
      l.scheduledDate &&
      !l.initialSentDate &&
      !l.dmSent &&
      l.cadenceStatus !== 'cancelled' &&
      !l.isArchived
    ) {
      countsByDate[l.scheduledDate] = (countsByDate[l.scheduledDate] || 0) + 1;
    }
  });

  let guard = 0;
  while (guard < 365) {
    guard++;
    cursorDateStr = shiftDueDateOffRestDay(cursorDateStr);
    const count = countsByDate[cursorDateStr] || 0;
    if (count < dailyQuota) {
      return cursorDateStr;
    }
    cursorDateStr = shiftDueDateOffRestDay(addDays(cursorDateStr, 1));
  }
  return cursorDateStr;
}

/**
 * Determines if a lead is strictly Email-only (no social Instagram or Facebook profile link).
 * Email-only leads (and legacy Facebook-labeled leads lacking a FB link) do not undergo social warm-up engagement.
 */
export function isEmailOnlyLead(lead?: ChannelLead | null): boolean {
  if (!lead) return false;
  if (getLeadInstagram(lead) || lead.channel === 'instagram') return false;
  if (getLeadFacebook(lead)) return false;
  return true;
}

/**
 * Intelligent Channel Routing: Returns the dispatch channel for a given touchpoint step.
 * - Any lead with an Instagram link routes strictly to 'instagram' for ALL 4 steps (Day 0, 4, 8, 14).
 * - Facebook and Email-only leads route strictly to 'email' for ALL 4 steps (Day 0, 4, 8, 14).
 */
export function getTouchpointChannel(
  lead?: ChannelLead | null,
  _step: 0 | 1 | 2 | 3 | number = 0
): 'instagram' | 'email' | 'facebook' {
  if (!lead) return 'email';

  if (getLeadInstagram(lead) || lead.channel === 'instagram') {
    return 'instagram';
  }

  return 'email';
}

/**
 * Returns formatted badge label for a touchpoint step.
 */
export function getTouchpointLabel(
  lead?: ChannelLead | null,
  step: 0 | 1 | 2 | 3 | number = 0
): string {
  const channel = getTouchpointChannel(lead, step);
  switch (channel) {
    case 'instagram':
      return '📱 Instagram DM';
    case 'email':
      return '✉️ Email Dispatch';
    case 'facebook':
      return '👤 Facebook';
    default:
      return '✉️ Email Dispatch';
  }
}
