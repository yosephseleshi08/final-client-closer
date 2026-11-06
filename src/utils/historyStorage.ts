import { DailyHistoryRecord, DailyHistoryStatus, HistoryStreakStats, MultiChannelType } from '../types';
import { getLocalTodayStr, normalizeToLocalDateStr } from './cadenceEngine';
import { loadChannelLeads } from './channelStorage';
import { getVideosVerifiedTodayCount, getVideosVerifiedOnDate } from './videoVerification';
import { isPipelineFrozenNow, isDateFrozen } from './pipelineFreeze';

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
export function getLeadsSentOnDate(dateStr: string): {
  count: number;
  initialCount: number;
  followupCount: number;
  channelBreakdown: Record<string, number>;
} {
  const channels: MultiChannelType[] = ['combined', 'instagram'];
  let count = 0;
  let initialCount = 0;
  let followupCount = 0;
  const channelBreakdown: Record<string, number> = { combined: 0, instagram: 0 };

  for (const ch of channels) {
    const leads = loadChannelLeads(ch);
    for (const lead of leads) {
      const initDate = normalizeToLocalDateStr(lead.initialSentDate);
      const f1Date = normalizeToLocalDateStr(lead.followup1SentDate);
      const f2Date = normalizeToLocalDateStr(lead.followup2SentDate);
      const f3Date = normalizeToLocalDateStr(lead.followup3SentDate);

      let channelHit = false;
      if (initDate === dateStr) {
        count++;
        initialCount++;
        channelBreakdown[ch] = (channelBreakdown[ch] || 0) + 1;
        channelHit = true;
      }
      if (f1Date === dateStr) {
        count++;
        followupCount++;
        if (!channelHit) {
          channelBreakdown[ch] = (channelBreakdown[ch] || 0) + 1;
          channelHit = true;
        }
      }
      if (f2Date === dateStr) {
        count++;
        followupCount++;
        if (!channelHit) {
          channelBreakdown[ch] = (channelBreakdown[ch] || 0) + 1;
          channelHit = true;
        }
      }
      if (f3Date === dateStr) {
        count++;
        followupCount++;
        if (!channelHit) {
          channelBreakdown[ch] = (channelBreakdown[ch] || 0) + 1;
        }
      }
    }
  }

  return { count, initialCount, followupCount, channelBreakdown };
}

/**
 * Loads daily history from localStorage.
 * Initialized clean without auto-seeding fake mock data.
 * Records only exist when manually performed by the user.
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

export interface TodayCompletionDetails {
  totalCompleted: number;
  totalRemainingDue: number;
  initialSent: number;
  initialRemainingDue: number;
  followupsSent: number;
  followupsRemainingDue: number;
  videosVerified?: number;
  storiesPosted?: number;
  reelsPosted?: number;
  notes?: string;
}


/**
 * Records or updates today's completion progress into the history array.
 * Decoupled from lead creation: ONLY records when verified manual outreach actions occur.
 * If totalCompleted is 0 and no manual actions have occurred, no false 100% record is created.
 */
export function recordTodayCompletion(
  completedCountOrDetails: number | TodayCompletionDetails,
  legacyRemainingDue?: number,
  legacyNotes?: string
): DailyHistoryRecord[] {
  const todayStr = getLocalTodayStr();
  const isSunday = isDateStringSunday(todayStr);

  let totalCompleted: number;
  let totalRemainingDue: number;
  let initialSent: number | undefined;
  let initialRemainingDue: number | undefined;
  let followupsSent: number | undefined;
  let followupsRemainingDue: number | undefined;
  let videosVerified: number | undefined;
  let storiesPosted: number | undefined;
  let reelsPosted: number | undefined;
  let notes: string | undefined;

  if (typeof completedCountOrDetails === 'object') {
    totalCompleted = completedCountOrDetails.totalCompleted;
    totalRemainingDue = completedCountOrDetails.totalRemainingDue;
    initialSent = completedCountOrDetails.initialSent;
    initialRemainingDue = completedCountOrDetails.initialRemainingDue;
    followupsSent = completedCountOrDetails.followupsSent;
    followupsRemainingDue = completedCountOrDetails.followupsRemainingDue;
    videosVerified = completedCountOrDetails.videosVerified ?? getVideosVerifiedTodayCount();
    storiesPosted = completedCountOrDetails.storiesPosted;
    reelsPosted = completedCountOrDetails.reelsPosted;
    notes = completedCountOrDetails.notes;
  } else {
    totalCompleted = completedCountOrDetails;
    totalRemainingDue = legacyRemainingDue || 0;
    initialSent = completedCountOrDetails;
    initialRemainingDue = legacyRemainingDue || 0;
    followupsSent = 0;
    followupsRemainingDue = 0;
    videosVerified = getVideosVerifiedTodayCount();
    notes = legacyNotes;
  }

  const isFrozen = isPipelineFrozenNow();

  // If no manual outreach has happened today (totalCompleted === 0) and it's not a frozen or sunday rest day:
  // We do not award 100% if nothing was scheduled or completed. It stays at 0% unless at least 1 verified action occurred.
  const totalTarget = Math.max(totalCompleted + totalRemainingDue, totalCompleted);
  let percentage: number;
  if (isFrozen || isSunday) {
    percentage = 100;
  } else if (totalCompleted === 0) {
    percentage = 0;
  } else if (totalTarget > 0) {
    percentage = Math.min(100, Math.round((totalCompleted / totalTarget) * 100));
  } else {
    percentage = 100;
  }

  let status: DailyHistoryStatus = 'zero';
  if (isFrozen) {
    status = 'frozen';
  } else if (isSunday) {
    status = 'sunday';
  } else if (percentage >= 100) {
    status = 'full';
  } else if (percentage > 0) {
    status = 'partial';
  } else {
    status = 'zero';
  }

  const initialTarget =
    initialSent !== undefined && initialRemainingDue !== undefined
      ? Math.max(initialSent + initialRemainingDue, initialSent, 0)
      : undefined;
  const followupsTarget =
    followupsSent !== undefined && followupsRemainingDue !== undefined
      ? Math.max(followupsSent + followupsRemainingDue, followupsSent, 0)
      : undefined;

  const records = loadDailyHistory();
  const existingIdx = records.findIndex((r) => r.date === todayStr);

  const entry: DailyHistoryRecord = {
    date: todayStr,
    displayDate: formatDisplayDate(todayStr),
    dmsSent: totalCompleted,
    dmsTarget: totalTarget,
    percentage,
    isSunday,
    status,
    notes: notes || (isSunday ? 'Sunday Rest Day' : undefined),
    updatedAt: new Date().toISOString(),
    initialDmsSent: initialSent,
    initialDmsTarget: initialTarget,
    followupsSent,
    followupsTarget,
    videosVerified,
    storiesPosted,
    reelsPosted,
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

export interface CalculateStreaksOptions {
  todayDmsSent?: number;
  todayVideosVerified?: number;
  todayReelsPosted?: number;
  todayStoriesPosted?: number;
}

/**
 * Calculates current streak and best streak from the history records.
 * Rules:
 * 1. A streak day is a non-Sunday day where tasks were actually executed and reached >= 100%.
 * 2. Sunday is a rest day and DOES NOT break the streak (preserves streak unbroken).
 * 3. All streak stats initialize at 0 until the first verified manual completion action occurs.
 */
export function calculateStreaks(
  records: DailyHistoryRecord[],
  options?: CalculateStreaksOptions
): HistoryStreakStats {
  const mapByDate = new Map<string, DailyHistoryRecord>();
  for (const r of records) {
    mapByDate.set(r.date, r);
  }

  const todayStr = getLocalTodayStr();
  const todayEntry = mapByDate.get(todayStr);
  const isTodaySun = isDateStringSunday(todayStr);

  const effectiveTodayTasksCompleted =
    options?.todayDmsSent !== undefined
      ? options.todayDmsSent
      : (todayEntry?.dmsSent ?? 0);

  // If there are no records in the history and today has 0 completions, return zero stats
  if (records.length === 0 && effectiveTodayTasksCompleted === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      completedDaysCount: 0,
      averageCompletionRate: 0,
      totalDMsSent: 0,
      videosVerifiedToday: options?.todayVideosVerified ?? 0,
      storiesPostedToday: options?.todayStoriesPosted ?? 0,
      reelsPostedToday: options?.todayReelsPosted ?? 0,
    };
  }

  // Today completes streak if it reached 100% and has at least 1 verified task completed
  const isTodayCompleted =
    !isTodaySun &&
    todayEntry !== undefined &&
    todayEntry.percentage >= 100 &&
    todayEntry.dmsSent > 0;

  // 1. Calculate Current Streak
  let currentStreak = 0;
  let startOffset = 0;

  const isTodayFrozen = isPipelineFrozenNow() || isDateFrozen(todayStr);

  if (isTodaySun || isTodayFrozen) {
    // Sunday or Frozen day is a rest mode: streak continues unbroken up to the last active day
    startOffset = -1;
  } else if (!isTodayCompleted) {
    // Weekday in progress: streak counts consecutive completed days up to yesterday
    startOffset = -1;
  } else {
    // Today has 100% completion verified!
    startOffset = 0;
  }

  // Find the earliest recorded entry date to know where history starts
  const recordedDates = records.map((r) => r.date).filter(Boolean).sort();
  const earliestDate = recordedDates.length > 0 ? recordedDates[0] : todayStr;

  // Iterate backwards day by day up to 365 days or earliest recorded date
  for (let offset = startOffset; offset >= -365; offset--) {
    const dateStr = getDateOffset(offset);

    if (dateStr < earliestDate) {
      break;
    }

    const isSunday = isDateStringSunday(dateStr);
    const isFrozen = isDateFrozen(dateStr);
    if (isSunday || isFrozen) {
      // Sunday or Frozen day continues the streak without incrementing or breaking
      continue;
    }

    if (offset === 0) {
      if (isTodayCompleted) {
        currentStreak++;
      }
      continue;
    }

    const entry = mapByDate.get(dateStr);
    if (entry && entry.dmsSent > 0 && (entry.percentage >= 100 || entry.status === 'frozen')) {
      currentStreak++;
    } else {
      // Missing or incomplete working day breaks current streak
      break;
    }
  }

  // 2. Calculate Best Streak across all recorded days
  let bestStreak = currentStreak;
  let tempStreak = 0;

  if (recordedDates.length > 0) {
    const allDates: string[] = [];
    let d = new Date(earliestDate);
    const end = new Date(todayStr);

    while (d <= end) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      allDates.push(`${y}-${m}-${day}`);
      d.setDate(d.getDate() + 1);
    }

    for (const dateStr of allDates) {
      if (isDateStringSunday(dateStr) || isDateFrozen(dateStr)) {
        continue;
      }

      if (dateStr === todayStr) {
        if (isTodayCompleted) {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        }
        continue;
      }

      const entry = mapByDate.get(dateStr);
      if (entry && entry.dmsSent > 0 && entry.percentage >= 100) {
        tempStreak++;
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
        }
      } else {
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

    if (entry && entry.dmsSent > 0) {
      const initialSends =
        entry.initialDmsSent !== undefined ? entry.initialDmsSent : entry.dmsSent || 0;
      totalDMs += initialSends;
      if (!isSunday) {
        totalPercentages += entry.percentage;
        activeDaysEvaluated++;
        if (entry.percentage >= 100) completedDaysCount++;
      }
    }
  }

  const avgCompletion =
    activeDaysEvaluated > 0 ? Math.round(totalPercentages / activeDaysEvaluated) : 0;

  return {
    currentStreak,
    bestStreak,
    completedDaysCount,
    averageCompletionRate: avgCompletion,
    totalDMsSent: totalDMs,
    videosVerifiedToday: options?.todayVideosVerified ?? 0,
    storiesPostedToday: options?.todayStoriesPosted ?? 0,
    reelsPostedToday: options?.todayReelsPosted ?? 0,
  };
}

/**
 * Builds the complete 30-day view window (today back to 29 days ago).
 * Default records for past days with no action start at 0% (never fake 100%).
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
    const isFrozen = isDateFrozen(dateStr);
    const existing = mapByDate.get(dateStr);

    if (existing) {
      result.push({
        ...existing,
        isFrozen: isFrozen || existing.status === 'frozen',
        status: isFrozen ? 'frozen' : existing.status,
        percentage: isFrozen ? 100 : existing.percentage,
        notes: isFrozen ? 'Pipeline Frozen (Streak Protected)' : existing.notes,
      });
    } else {
      const status: DailyHistoryStatus = isFrozen
        ? 'frozen'
        : isSunday
        ? 'sunday'
        : 'zero';

      result.push({
        date: dateStr,
        displayDate: formatDisplayDate(dateStr),
        dmsSent: 0,
        dmsTarget: 0,
        percentage: isSunday || isFrozen ? 100 : 0,
        isSunday,
        isFrozen,
        status,
        notes: isFrozen
          ? 'Pipeline Frozen (Streak Protected)'
          : isSunday
          ? 'Sunday Rest Day'
          : 'No outreach recorded',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return result;
}

/**
 * Clears all daily history cleanly to 0 without mock data.
 */
export function resetDailyHistory(): DailyHistoryRecord[] {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to reset daily history:', err);
  }
  return [];
}
