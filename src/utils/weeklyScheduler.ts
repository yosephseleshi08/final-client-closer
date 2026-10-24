import { Lead, Weekday } from '../types';

export const WEEKDAYS: Weekday[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export interface WeekdayConfig {
  label: Weekday;
  short: string;
  batchNum: number;
  bgLight: string;
  textLight: string;
  borderLight: string;
  dotColor: string;
  accentColor: string;
}

export const WEEKDAY_CONFIG: Record<Weekday, WeekdayConfig> = {
  Monday: {
    label: 'Monday',
    short: 'Mon',
    batchNum: 1,
    bgLight: 'bg-sky-500/15',
    textLight: 'text-sky-300',
    borderLight: 'border-sky-500/30',
    dotColor: 'bg-sky-400',
    accentColor: '#38bdf8',
  },
  Tuesday: {
    label: 'Tuesday',
    short: 'Tue',
    batchNum: 2,
    bgLight: 'bg-teal-500/15',
    textLight: 'text-teal-300',
    borderLight: 'border-teal-500/30',
    dotColor: 'bg-teal-400',
    accentColor: '#2dd4bf',
  },
  Wednesday: {
    label: 'Wednesday',
    short: 'Wed',
    batchNum: 3,
    bgLight: 'bg-indigo-500/15',
    textLight: 'text-indigo-300',
    borderLight: 'border-indigo-500/30',
    dotColor: 'bg-indigo-400',
    accentColor: '#818cf8',
  },
  Thursday: {
    label: 'Thursday',
    short: 'Thu',
    batchNum: 4,
    bgLight: 'bg-purple-500/15',
    textLight: 'text-purple-300',
    borderLight: 'border-purple-500/30',
    dotColor: 'bg-purple-400',
    accentColor: '#c084fc',
  },
  Friday: {
    label: 'Friday',
    short: 'Fri',
    batchNum: 5,
    bgLight: 'bg-amber-500/15',
    textLight: 'text-amber-300',
    borderLight: 'border-amber-500/30',
    dotColor: 'bg-amber-400',
    accentColor: '#fbbf24',
  },
  Saturday: {
    label: 'Saturday',
    short: 'Sat',
    batchNum: 6,
    bgLight: 'bg-pink-500/15',
    textLight: 'text-pink-300',
    borderLight: 'border-pink-500/30',
    dotColor: 'bg-pink-400',
    accentColor: '#f472b6',
  },
  Sunday: {
    label: 'Sunday',
    short: 'Sun',
    batchNum: 7,
    bgLight: 'bg-emerald-500/15',
    textLight: 'text-emerald-300',
    borderLight: 'border-emerald-500/30',
    dotColor: 'bg-emerald-400',
    accentColor: '#34d399',
  },
};

/**
 * Gets the current day of the week as a Weekday type.
 */
export function getTodayWeekday(): Weekday {
  const dayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
  const map: Weekday[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return map[dayIndex];
}

/**
 * Gets tomorrow's day of the week as a Weekday type.
 */
export function getTomorrowWeekday(): Weekday {
  const dayIndex = (new Date().getDay() + 1) % 7;
  const map: Weekday[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return map[dayIndex];
}

/**
 * Calculates the Monday ISO date string (YYYY-MM-DD) for any given date.
 * If Sunday, walks back 6 days to Monday of the same week.
 */
export function getMondayOfDate(d?: Date | string): string {
  let base: Date;
  if (!d) {
    base = new Date();
  } else if (typeof d === 'string') {
    // Append T00:00:00 to prevent timezone drift when parsing YYYY-MM-DD
    base = d.includes('T') ? new Date(d) : new Date(`${d}T00:00:00`);
  } else {
    base = new Date(d.getTime());
  }

  if (isNaN(base.getTime())) {
    base = new Date();
  }

  const day = base.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diff);

  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const dateNum = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${dateNum}`;
}

/**
 * Returns the Monday date string (YYYY-MM-DD) representing the current active week.
 */
export function getCurrentWeekKey(): string {
  return getMondayOfDate(new Date());
}

/**
 * Returns the Monday date string (YYYY-MM-DD) for next week.
 */
export function getNextWeekKey(weekKey?: string): string {
  const monday = weekKey ? new Date(`${weekKey}T00:00:00`) : new Date(`${getCurrentWeekKey()}T00:00:00`);
  monday.setDate(monday.getDate() + 7);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dateNum = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dateNum}`;
}

/**
 * Adds a specific number of days to a YYYY-MM-DD date string.
 */
export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates Day 3 and Day 7 follow-up dates based on when initial outreach was sent.
 * User requirement: Follow-up 1 is strictly 3 days after sent, Follow-up 2 is 7 days after sent.
 */
export function calculate2StepFollowupDates(sentDate: string): {
  followup1Date: string; // sentDate + 3 days
  followup2Date: string; // sentDate + 7 days
} {
  return {
    followup1Date: addDaysToDate(sentDate, 3),
    followup2Date: addDaysToDate(sentDate, 7),
  };
}

/**
 * Returns the Monday date string (YYYY-MM-DD) for previous week.
 */
export function getPreviousWeekKey(weekKey?: string): string {
  const monday = weekKey ? new Date(`${weekKey}T00:00:00`) : new Date(`${getCurrentWeekKey()}T00:00:00`);
  monday.setDate(monday.getDate() - 7);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dateNum = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dateNum}`;
}

/**
 * Returns the Monday date string (YYYY-MM-DD) for a specific date string.
 */
export function getWeekKeyForDate(dateStr?: string): string {
  return getMondayOfDate(dateStr);
}

/**
 * Returns date range information for a given week key (Monday YYYY-MM-DD).
 */
export function getWeekDateRange(weekKey: string): {
  startStr: string;
  endStr: string;
  startFormatted: string;
  endFormatted: string;
  rangeLabel: string;
} {
  const monday = new Date(`${weekKey}T00:00:00`);
  const sunday = new Date(`${weekKey}T00:00:00`);
  sunday.setDate(sunday.getDate() + 6);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = monthNames[monday.getMonth()];
  const startDay = monday.getDate();
  const endMonth = monthNames[sunday.getMonth()];
  const endDay = sunday.getDate();

  const startFormatted = `${startMonth} ${startDay}`;
  const endFormatted = `${endMonth} ${endDay}`;
  const rangeLabel = startMonth === endMonth
    ? `${startMonth} ${startDay} – ${endDay}`
    : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;

  const endStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

  return {
    startStr: weekKey,
    endStr,
    startFormatted,
    endFormatted,
    rangeLabel,
  };
}

/**
 * Formats a user-friendly label for the week (e.g., "This Week (Oct 12 – 18)").
 */
export function formatWeekLabel(weekKey: string, short = false): string {
  const current = getCurrentWeekKey();
  const next = getNextWeekKey();
  const prev = getPreviousWeekKey();
  const { rangeLabel } = getWeekDateRange(weekKey);

  if (weekKey === current) {
    return short ? 'This Week' : `This Week (${rangeLabel})`;
  }
  if (weekKey === next) {
    return short ? 'Next Week' : `Next Week (${rangeLabel})`;
  }
  if (weekKey === prev) {
    return short ? 'Last Week' : `Last Week (${rangeLabel})`;
  }
  return short ? rangeLabel : `Week of ${rangeLabel}`;
}

/**
 * Normalizes a lead's targetWeek.
 * If targetWeek is not explicitly set:
 * - If the lead was already contacted in the past, uses the Monday of that contact date.
 * - Otherwise defaults to current week.
 */
export function normalizeLeadWeek(lead: Partial<Lead>): string {
  if (lead.targetWeek && /^\d{4}-\d{2}-\d{2}$/.test(lead.targetWeek)) {
    return lead.targetWeek;
  }
  if (lead.status && lead.status !== 'not_sent') {
    if (lead.lastContactDate) {
      return getMondayOfDate(lead.lastContactDate);
    }
    if (lead.dateFirstContact) {
      return getMondayOfDate(lead.dateFirstContact);
    }
  }
  return getCurrentWeekKey();
}

/**
 * Auto-paces leads into daily buckets of dailyQuota leads per day (Monday–Sunday)
 * specifically for a designated targetWeek.
 */
export function autoPaceLeads(
  leads: Lead[],
  dailyQuota = 10,
  mode: 'all' | 'unassigned_only' = 'all',
  targetWeek: string = getCurrentWeekKey()
): Lead[] {
  if (mode === 'unassigned_only') {
    // Count existing leads assigned to this targetWeek
    const dayCounts: Record<Weekday, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };

    leads.forEach((l) => {
      const leadWeek = normalizeLeadWeek(l);
      if (leadWeek === targetWeek && l.scheduledDay && WEEKDAYS.includes(l.scheduledDay)) {
        dayCounts[l.scheduledDay]++;
      }
    });

    return leads.map((lead) => {
      const leadWeek = normalizeLeadWeek(lead);
      if (lead.scheduledDay && WEEKDAYS.includes(lead.scheduledDay) && leadWeek === targetWeek) {
        return {
          ...lead,
          targetWeek,
        };
      }

      // If already has a day assigned for another week, keep it unless unassigned
      if (lead.scheduledDay && WEEKDAYS.includes(lead.scheduledDay)) {
        return lead;
      }

      // Find the day with the lowest count in the target week
      let targetDay: Weekday = 'Monday';
      let lowestCount = Infinity;
      for (const day of WEEKDAYS) {
        if (dayCounts[day] < lowestCount) {
          lowestCount = dayCounts[day];
          targetDay = day;
        }
      }

      dayCounts[targetDay]++;
      return {
        ...lead,
        scheduledDay: targetDay,
        targetWeek,
      };
    });
  }

  // Pace ALL provided leads into the targetWeek
  return leads.map((lead, idx) => {
    const dayIndex = Math.floor(idx / dailyQuota) % WEEKDAYS.length;
    return {
      ...lead,
      scheduledDay: WEEKDAYS[dayIndex],
      targetWeek,
    };
  });
}

/**
 * Returns the position of a lead within its day batch for its specific week.
 * Prevents leads from last week or next week from inflating the count/position.
 */
export function getLeadDayPosition(
  lead: Lead,
  allLeads: Lead[],
  weekKey?: string
): {
  day: Weekday | null;
  position: number;
  totalForDay: number;
  isToday: boolean;
  batchNum: number;
  weekLabel: string;
} {
  if (!lead.scheduledDay || !WEEKDAYS.includes(lead.scheduledDay)) {
    return {
      day: null,
      position: 0,
      totalForDay: 0,
      isToday: false,
      batchNum: 0,
      weekLabel: '',
    };
  }

  const targetWeek = weekKey || normalizeLeadWeek(lead);
  const currentWeek = getCurrentWeekKey();
  const today = getTodayWeekday();

  // Filter same day leads strictly in the SAME week
  const sameDayLeads = allLeads.filter(
    (l) => l.scheduledDay === lead.scheduledDay && normalizeLeadWeek(l) === targetWeek
  );
  const position = sameDayLeads.findIndex((l) => l.id === lead.id) + 1;
  const config = WEEKDAY_CONFIG[lead.scheduledDay];

  return {
    day: lead.scheduledDay,
    position: position > 0 ? position : 1,
    totalForDay: sameDayLeads.length,
    isToday: lead.scheduledDay === today && targetWeek === currentWeek,
    batchNum: config?.batchNum || 1,
    weekLabel: formatWeekLabel(targetWeek, true),
  };
}
