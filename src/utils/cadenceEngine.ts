import { ChannelLead, MultiChannelType } from '../types';

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds exact days to a YYYY-MM-DD date string without timezone drift
 */
export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
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
 * positive = in the future, 0 = today, negative = in the past (overdue)
 */
export function getDayDifference(targetDateStr: string, fromDateStr = getTodayStr()): number {
  const p1 = targetDateStr.split('-').map(Number);
  const p2 = fromDateStr.split('-').map(Number);
  if (p1.length !== 3 || p2.length !== 3) return 0;

  const d1 = new Date(p1[0], p1[1] - 1, p1[2]).getTime();
  const d2 = new Date(p2[0], p2[1] - 1, p2[2]).getTime();

  return Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
}

export function isDateToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  return dateStr === getTodayStr();
}

export function isDateOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return dateStr < getTodayStr();
}

/**
 * Cadence Transition: Mark initial outreach as Sent.
 * Automatically schedules Follow-Up #1 at +3 days and Follow-Up #2 at +7 days.
 */
export function markInitialSent(lead: ChannelLead, sentDate = getTodayStr()): ChannelLead {
  const fu1 = addDays(sentDate, 3);
  const fu2 = addDays(sentDate, 7);

  return {
    ...lead,
    initialSentDate: sentDate,
    followup1Date: fu1,
    followup2Date: fu2,
    followupCount: 0,
    leadStatus: lead.isSeen ? 'seen' : 'waiting_reply',
    isCompleted: false,
  };
}

/**
 * Cadence Transition: Mark a follow-up step as Sent.
 * Step 1: Follow-up #1 (Day 3) completed, keeps Follow-up #2 for Day 7.
 * Step 2: Follow-up #2 (Day 7) completed, concludes cadence.
 */
export function markFollowupSent(
  lead: ChannelLead,
  step: 1 | 2,
  sentDate = getTodayStr()
): ChannelLead {
  if (step === 1) {
    return {
      ...lead,
      followup1SentDate: sentDate,
      followupCount: 1,
      leadStatus: lead.isSeen ? 'seen' : 'waiting_reply',
      isCompleted: false,
    };
  }

  // Step 2: Final touchpoint done
  return {
    ...lead,
    followup2SentDate: sentDate,
    followupCount: 2,
    leadStatus: 'completed',
    isCompleted: true,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Cadence Transition: Mark lead as Replied.
 * Clears pending follow-up requirements and archives successfully.
 */
export function markLeadReplied(lead: ChannelLead): ChannelLead {
  return {
    ...lead,
    leadStatus: 'replied',
    isCompleted: true,
    completedAt: new Date().toISOString(),
    repliedAt: new Date().toISOString(),
  };
}

/**
 * Toggles the 'Seen' status for a lead.
 * Retains follow-up timers active while displaying the '👀 Seen' badge.
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
