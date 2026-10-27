import { DailyHistoryRecord, DailyHistoryStatus, HistoryStreakStats, MultiChannelType } from '../types';
import { getLocalTodayStr, normalizeToLocalDateStr } from './cadenceEngine';
import { loadChannelLeads } from './channelStorage';

export const HISTORY_STORAGE_KEY = 'outreach_daily_history';
export const OUTREACH_START_DATE = '2026-10-26'; // User's verified launch day

/**
 * Formats YYYY-MM-DD into a human-readable string like "Oct 26, 2026"
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Checks if a YYYY-MM-DD string falls on a Sunday
 */
export function isDateStringSunday(dateStr: string): boolean {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getDay() === 0;
  } catch {
    return false;
  }
}

/**
 * Checks existing channel leads in localStorage for outreach completed on a specific date.
 */
export function getLeadsSentOnDate(dateStr: string): { count: number; channelBreakdown: Record<string, number> } {
  const channels: MultiChannelType[] = ['email', 'instagram', 'facebook'];
  let count = 0;
  const channelBreakdown: Record<string, number> = { email: 0, instagram: 0, facebook: 0 };

  for (const ch of channels) {
    const leads = loadChannelLeads(ch);
    for (const lead of leads) {
      const initDate = normalizeToLocalDateStr(lead.initialSentDate);
      const f1Date = normalizeToLocalDateStr(lead.followup1SentDate);
      const f2Date = normalizeToLocalDateStr(lead.followup2SentDate);

      let sentForCh = false;
      if (initDate === dateStr) {
        count++;
        channelBreakdown[ch]++;
        sentForCh = true;
      }
      if (f1Date === dateStr && !sentForCh) {
        count++;
        channelBreakdown[ch]++;
        sentForCh = true;
      }
      if (f2Date === dateStr && !sentForCh) {
        count++;
        channelBreakdown[ch]++;
      }
    }
  }

  return { count, channelBreakdown };
}

/**
 * Loads daily history from localStorage.
 * Guarantees that the launch baseline (Oct 26, 2026: 6/6 DMs Sent, 100%) is present.
 */
export function loadDailyHistory(): DailyHistoryRecord[] {
  let records: DailyHistoryRecord[] = [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        records = parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load daily history from localStorage:', err);
  }

  // Ensure October 26, 2026 is properly recorded as 100% complete with 6 DMs sent
  const oct26Index = records.findIndex((r) => r.date === OUTREACH_START_DATE);
  const oct26RealLeads = getLeadsSentOnDate(OUTREACH_START_DATE);
  const oct26Count = Math.max(6, oct26RealLeads.count);

  if (oct26Index === -1) {
    records.push({
      date: OUTREACH_START_DATE,
      displayDate: formatDisplayDate(OUTREACH_START_DATE),
      dmsSent: oct26Count,
      dmsTarget: oct26Count,
      percentage: 100,
      isSunday: false,
      status: 'full',
      notes: 'Initial outreach launch day (100% completed)',
      updatedAt: new Date().toISOString(),
    });
    saveDailyHistory(records);
  } else {
    // If it exists but had less than 100%, update it per user instructions
    if (records[oct26Index].percentage < 100 || records[oct26Index].dmsSent < 6) {
      records[oct26Index] = {
        ...records[oct26Index],
        dmsSent: oct26Count,
        dmsTarget: oct26Count,
        percentage: 100,
        status: 'full',
        notes: 'Initial outreach launch day (100% completed)',
        updatedAt: new Date().toISOString(),
      };
      saveDailyHistory(records);
    }
  }

  // Sort by date descending (newest first)
  return records.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Saves the given records to localStorage.
 */
export function saveDailyHistory(records: DailyHistoryRecord[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save daily history to localStorage:', err);
  }
}

/**
 * Records or updates today's completion progress into the history array.
 * Calculates percentage: if tasksScheduled is 0, percentage is 100% if sentCount > 0 or defaults to 100%.
 */
export function recordTodayCompletion(
  dmsSent: number,
  tasksRemainingDue: number,
  notes?: string
): DailyHistoryRecord[] {
  const todayStr = getLocalTodayStr();
  const isSunday = isDateStringSunday(todayStr);

  const totalTarget = Math.max(dmsSent + tasksRemainingDue, dmsSent, 1);
  const percentage = isSunday
    ? 100
    : totalTarget > 0
    ? Math.round((dmsSent / totalTarget) * 100)
    : 100;

  let status: DailyHistoryStatus = 'zero';
  if (isSunday) {
    status = 'sunday';
  } else if (percentage >= 100) {
    status = 'full';
  } else if (percentage > 0) {
    status = 'partial';
  } else {
    status = 'zero';
  }

  const records = loadDailyHistory();
  const existingIdx = records.findIndex((r) => r.date === todayStr);

  const entry: DailyHistoryRecord = {
    date: todayStr,
    displayDate: formatDisplayDate(todayStr),
    dmsSent,
    dmsTarget: totalTarget,
    percentage,
    isSunday,
    status,
    notes: notes || (isSunday ? 'Sunday Rest Day' : undefined),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    records[existingIdx] = entry;
  } else {
    records.unshift(entry);
  }

  saveDailyHistory(records);
  return records;
}

/**
 * Helper to calculate days offset from today (e.g. -1 for yesterday).
 */
export function getDateOffset(daysFromToday: number): string {
  const now = new Date();
  now.setDate(now.getDate() + daysFromToday);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates current streak and best streak from the history records.
 * Rules:
 * 1. A streak day is a non-Sunday day with percentage >= 100.
 * 2. Sunday is a rest day and DOES NOT break the streak.
 * 3. If today is Sunday or today is already 100%, today contributes to the streak.
 * 4. If today is a weekday and not yet 100% (in progress), the streak is measured up to yesterday.
 */
export function calculateStreaks(records: DailyHistoryRecord[]): HistoryStreakStats {
  const mapByDate = new Map<string, DailyHistoryRecord>();
  for (const r of records) {
    mapByDate.set(r.date, r);
  }

  const todayStr = getLocalTodayStr();
  const todayEntry = mapByDate.get(todayStr);
  const isToday100 = todayEntry ? todayEntry.percentage >= 100 : false;
  const isTodaySun = isDateStringSunday(todayStr);

  // 1. Calculate Current Streak
  // We evaluate backwards starting from today (if completed or Sunday) or yesterday (if today in progress).
  let currentStreak = 0;
  let startOffset = 0;

  if (!isTodaySun && !isToday100) {
    // Today is in progress; start checking from yesterday so pending tasks don't break the streak
    startOffset = -1;
  }

  // Iterate backwards day by day up to 365 days
  for (let offset = startOffset; offset >= -365; offset--) {
    const dateStr = getDateOffset(offset);

    // Stop if we go before official outreach start date
    if (dateStr < OUTREACH_START_DATE) {
      break;
    }

    const isSunday = isDateStringSunday(dateStr);
    if (isSunday) {
      // Sunday is neutral rest day; continues the streak without incrementing or breaking
      continue;
    }

    const entry = mapByDate.get(dateStr);
    if (entry && entry.percentage >= 100) {
      currentStreak++;
    } else {
      // Encountered a weekday with < 100% completion; streak breaks
      break;
    }
  }

  // 2. Calculate Best Streak across all recorded days from OUTREACH_START_DATE to today
  let bestStreak = currentStreak;
  let tempStreak = 0;

  // Gather chronological dates from start date up to today
  const allDates: string[] = [];
  let d = new Date(OUTREACH_START_DATE);
  const end = new Date(todayStr);

  while (d <= end) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    allDates.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }

  for (const dateStr of allDates) {
    if (isDateStringSunday(dateStr)) {
      continue; // Sunday does not reset or count
    }

    const entry = mapByDate.get(dateStr);
    if (entry && entry.percentage >= 100) {
      tempStreak++;
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
    } else {
      // If it's today and today is in progress, don't reset tempStreak for past days
      if (dateStr !== todayStr) {
        tempStreak = 0;
      }
    }
  }

  // 3. Aggregate 30-day stats
  let totalDMs = 0;
  let totalPercentages = 0;
  let activeDaysEvaluated = 0;
  let completedDaysCount = 0;

  for (let i = 0; i < 30; i++) {
    const dateStr = getDateOffset(-i);
    const entry = mapByDate.get(dateStr);
    const isSunday = isDateStringSunday(dateStr);

    if (entry) {
      totalDMs += entry.dmsSent || 0;
      if (!isSunday) {
        totalPercentages += entry.percentage;
        activeDaysEvaluated++;
        if (entry.percentage >= 100) completedDaysCount++;
      }
    }
  }

  const avgCompletion =
    activeDaysEvaluated > 0 ? Math.round(totalPercentages / activeDaysEvaluated) : 100;

  return {
    currentStreak,
    bestStreak,
    completedDaysCount,
    averageCompletionRate: avgCompletion,
    totalDMsSent: totalDMs,
  };
}

/**
 * Builds the complete 30-day view window (today back to 29 days ago).
 * Provides intelligent default records for days where no history exists.
 */
export function get30DayHistoryView(records: DailyHistoryRecord[]): DailyHistoryRecord[] {
  const mapByDate = new Map<string, DailyHistoryRecord>();
  for (const r of records) {
    mapByDate.set(r.date, r);
  }

  const result: DailyHistoryRecord[] = [];

  for (let i = 0; i < 30; i++) {
    const dateStr = getDateOffset(-i);
    const isSunday = isDateStringSunday(dateStr);
    const existing = mapByDate.get(dateStr);

    if (existing) {
      result.push(existing);
    } else {
      // Prior to launch or missing
      const isBeforeLaunch = dateStr < OUTREACH_START_DATE;
      const status: DailyHistoryStatus = isSunday
        ? 'sunday'
        : isBeforeLaunch
        ? 'zero'
        : 'zero';

      result.push({
        date: dateStr,
        displayDate: formatDisplayDate(dateStr),
        dmsSent: 0,
        dmsTarget: 0,
        percentage: isSunday ? 100 : 0,
        isSunday,
        status,
        notes: isSunday
          ? 'Sunday Rest Day'
          : isBeforeLaunch
          ? 'Before outreach launch'
          : 'No outreach recorded',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return result;
}

/**
 * Clears all daily history and re-seeds cleanly with the October 26 baseline.
 */
export function resetDailyHistory(): DailyHistoryRecord[] {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to reset daily history:', err);
  }
  return loadDailyHistory();
}
