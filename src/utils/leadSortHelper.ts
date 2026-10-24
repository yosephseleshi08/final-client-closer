import { Lead, LeadStatus, Weekday } from '../types';

/**
 * Action-needed status sequence:
 * Puts leads requiring immediate action at the top:
 * 1. not_sent (Never contacted yet - highest outreach priority)
 * 2. seen (Viewed message - hot follow-up priority)
 * 3. replied (Engaged in active conversation)
 * 4. sent (Outreach delivered, waiting for view/reply)
 * 5. mockup_sent (Website demo or video mockup delivered)
 * 6. call_booked (Phone/Zoom call scheduled)
 * 7. proposal_sent (Agreement/proposal awaiting sign-off)
 * 8. closed_won (Successfully closed client)
 * 9. closed_dead (Unresponsive or declined)
 */
export const STATUS_ACTION_PRIORITY: Record<LeadStatus, number> = {
  not_sent: 1,
  seen: 2,
  replied: 3,
  sent: 4,
  mockup_sent: 5,
  call_booked: 6,
  proposal_sent: 7,
  closed_won: 8,
  closed_dead: 9,
};

/**
 * Pipeline chronological sequence:
 * Sent first, then not sent, replied, mockup sent, etc.
 */
export const STATUS_PIPELINE_PRIORITY: Record<LeadStatus, number> = {
  sent: 1,
  not_sent: 2,
  replied: 3,
  seen: 4,
  mockup_sent: 5,
  call_booked: 6,
  proposal_sent: 7,
  closed_won: 8,
  closed_dead: 9,
};

/**
 * Chronological weekday priority: Monday to Sunday
 */
export const WEEKDAY_PRIORITY_ORDER: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

export type LeadSortMode = 
  | 'latest_paste'        // Newest pasted/created link first (default)
  | 'status_then_day'     // Action-needed status first, then Monday-Sunday, then ID
  | 'heat_score'          // Highest heat / engagement score first
  | 'pipeline_then_day'   // Pipeline flow (Sent, Not Sent, etc.), then Monday-Sunday
  | 'day_then_status'     // Monday-Sunday first, then status priority
  | 'not_sent_first'      // Strict not_sent priority
  | 'name';               // Alphabetical restaurant name

export const SORT_MODE_OPTIONS: { value: LeadSortMode; label: string }[] = [
  { value: 'latest_paste', label: 'Latest Pasted Link' },
  { value: 'status_then_day', label: 'Action Needed Status' },
  { value: 'heat_score', label: 'Highest Heat Score' },
  { value: 'day_then_status', label: 'Scheduled Day' },
  { value: 'name', label: 'Alphabetical Name' },
];

/**
 * Deterministically sorts any array of leads so that rows never randomly sit
 * or jump around across render cycles and state updates.
 */
export function sortLeadsDeterministically(
  leads: Lead[],
  mode: LeadSortMode = 'latest_paste'
): Lead[] {
  return [...leads].sort((a, b) => {
    if (mode === 'latest_paste') {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      // Tiebreaker: Higher ID (most recently added)
      return (b.id ?? 0) - (a.id ?? 0);
    }

    if (mode === 'heat_score') {
      const scoreA = a.leadScore ?? 25;
      const scoreB = b.leadScore ?? 25;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (b.id ?? 0) - (a.id ?? 0);
    }

    if (mode === 'name') {
      const cmp = a.restaurantName.localeCompare(b.restaurantName);
      if (cmp !== 0) return cmp;
      return (b.id ?? 0) - (a.id ?? 0);
    }

    if (mode === 'day_then_status') {
      const dayA = a.scheduledDay ? (WEEKDAY_PRIORITY_ORDER[a.scheduledDay] || 8) : 8;
      const dayB = b.scheduledDay ? (WEEKDAY_PRIORITY_ORDER[b.scheduledDay] || 8) : 8;
      if (dayA !== dayB) return dayA - dayB;

      const statA = STATUS_ACTION_PRIORITY[a.status] || 99;
      const statB = STATUS_ACTION_PRIORITY[b.status] || 99;
      if (statA !== statB) return statA - statB;

      return (b.id ?? 0) - (a.id ?? 0);
    }

    if (mode === 'pipeline_then_day') {
      const statA = STATUS_PIPELINE_PRIORITY[a.status] || 99;
      const statB = STATUS_PIPELINE_PRIORITY[b.status] || 99;
      if (statA !== statB) return statA - statB;

      const dayA = a.scheduledDay ? (WEEKDAY_PRIORITY_ORDER[a.scheduledDay] || 8) : 8;
      const dayB = b.scheduledDay ? (WEEKDAY_PRIORITY_ORDER[b.scheduledDay] || 8) : 8;
      if (dayA !== dayB) return dayA - dayB;

      return (b.id ?? 0) - (a.id ?? 0);
    }

    // Default: 'status_then_day' and 'not_sent_first'
    // Primary sort: Action-needed status (Not Sent, Seen, Replied, Sent, Closed)
    const statA = STATUS_ACTION_PRIORITY[a.status] || 99;
    const statB = STATUS_ACTION_PRIORITY[b.status] || 99;
    if (statA !== statB) return statA - statB;

    // Secondary sort: Scheduled day (Monday -> Sunday)
    const dayA = a.scheduledDay ? (WEEKDAY_PRIORITY_ORDER[a.scheduledDay] || 8) : 8;
    const dayB = b.scheduledDay ? (WEEKDAY_PRIORITY_ORDER[b.scheduledDay] || 8) : 8;
    if (dayA !== dayB) return dayA - dayB;

    // Tertiary deterministic tiebreaker: ID descending
    return (b.id ?? 0) - (a.id ?? 0);
  });
}

/**
 * Returns a human-friendly status label with icon indicator
 */
export function getStatusDisplayName(status: LeadStatus): string {
  switch (status) {
    case 'not_sent':
      return 'Not Sent';
    case 'sent':
      return 'Sent';
    case 'seen':
      return 'Seen';
    case 'replied':
      return 'Replied';
    case 'mockup_sent':
      return 'Mockup Sent';
    case 'call_booked':
      return 'Call Booked';
    case 'proposal_sent':
      return 'Proposal Sent';
    case 'closed_won':
      return 'Won';
    case 'closed_dead':
      return 'Dead';
    default:
      return status;
  }
}
