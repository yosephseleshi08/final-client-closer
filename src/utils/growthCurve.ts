import { ChannelLead, MultiChannelType } from '../types';
import { getLocalTodayStr, normalizeToLocalDateStr } from './cadenceEngine';
import { OUTREACH_START_DATE } from './historyStorage';
import { loadChannelLeads } from './channelStorage';

export const GROWTH_CURVE_START_DATE_KEY = 'crm_growth_curve_start_date';
export const STORY_LOGS_STORAGE_KEY = 'crm_story_logs_v1';
export const GROWTH_CURVE_OVERRIDE_KEY = 'crm_growth_curve_week_override';

export interface GrowthCurveWeekInfo {
  weekNumber: number; // 1, 2, 3, 4...
  weekLabel: string; // "Week 1", "Week 2", "Week 3", "Week 4+"
  weeklyQuota: number; // 4, 7, 12, 14
  dailyQuota: number; // 0.5, 1, 2, 2
  dailyQuotaDisplay: string; // "4 / week", "1 Reel / day", "2 Reels / day"
  hint: string;
  allowedReelDays: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  allowedDayNames: string;
  isReelAllowedToday: boolean;
  nonAllowedReason?: string;
  isCurrentDayReelDay: boolean;
}

export interface StoryLogRecord {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO
  leadId?: string;
  leadName?: string;
  channel?: MultiChannelType;
}

/**
 * Returns the effective start date of the CRM (defaulting to OUTREACH_START_DATE '2026-10-26')
 */
export function getGrowthCurveStartDate(): string {
  try {
    const stored = localStorage.getItem(GROWTH_CURVE_START_DATE_KEY);
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
      return stored;
    }
  } catch (_e) {}
  return OUTREACH_START_DATE;
}

/**
 * Allows user to optionally override the week number for previewing/testing the curve.
 */
export function getGrowthCurveWeekOverride(): number | null {
  try {
    const val = localStorage.getItem(GROWTH_CURVE_OVERRIDE_KEY);
    if (val && !isNaN(Number(val))) {
      const num = Number(val);
      if (num >= 1 && num <= 10) return num;
    }
  } catch (_e) {}
  return null;
}

export function setGrowthCurveWeekOverride(weekNum: number | null): void {
  try {
    if (weekNum === null) {
      localStorage.removeItem(GROWTH_CURVE_OVERRIDE_KEY);
    } else {
      localStorage.setItem(GROWTH_CURVE_OVERRIDE_KEY, String(weekNum));
    }
  } catch (_e) {}
}

/**
 * Calculates current week number and quota parameters according to the Growth Curve:
 * - Week 1: Weekly Quota = 4 Reels. Daily Quota = 0.5 (show as "4 / week" and only allow marking on Mon, Wed, Fri, Sun)
 * - Week 2: Weekly Quota = 7 Reels. Daily Quota = 1 Reel
 * - Week 3: Weekly Quota = 12 Reels. Daily Quota = 2 Reels (with hint "Bonus: 3 on Saturdays")
 * - Week 4+: Weekly Quota = 14 Reels. Daily Quota = 2 Reels
 */
export function getGrowthCurveWeekInfo(currentDateStr?: string): GrowthCurveWeekInfo {
  const todayStr = currentDateStr || getLocalTodayStr();
  const startDateStr = getGrowthCurveStartDate();

  // Check manual override first
  const override = getGrowthCurveWeekOverride();
  let weekNumber: number;

  if (override !== null) {
    weekNumber = override;
  } else {
    try {
      const [sy, sm, sd] = startDateStr.split('-').map(Number);
      const [cy, cm, cd] = todayStr.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd);
      const current = new Date(cy, cm - 1, cd);
      const diffMs = current.getTime() - start.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      weekNumber = Math.max(1, Math.floor(diffDays / 7) + 1);
    } catch (_e) {
      weekNumber = 1;
    }
  }

  // Determine current day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  let dayOfWeek = 0;
  try {
    const [cy, cm, cd] = todayStr.split('-').map(Number);
    dayOfWeek = new Date(cy, cm - 1, cd).getDay();
  } catch (_e) {
    dayOfWeek = new Date().getDay();
  }

  if (weekNumber === 1) {
    // Week 1: 4/week, Mon(1), Wed(3), Fri(5), Sun(0)
    const allowedReelDays = [1, 3, 5, 0];
    const isAllowed = allowedReelDays.includes(dayOfWeek);
    return {
      weekNumber: 1,
      weekLabel: 'Week 1',
      weeklyQuota: 4,
      dailyQuota: 0.5,
      dailyQuotaDisplay: '4 / week',
      hint: 'Pacing: 4 / week (Mon, Wed, Fri, Sun)',
      allowedReelDays,
      allowedDayNames: 'Mon, Wed, Fri, Sun',
      isReelAllowedToday: isAllowed,
      isCurrentDayReelDay: isAllowed,
      nonAllowedReason:
        'Week 1 Growth Curve: Reels can only be marked on Monday, Wednesday, Friday, and Sunday (4 / week gradual curve).',
    };
  }

  if (weekNumber === 2) {
    // Week 2: 7/week, 1 Reel/day
    const allowedReelDays = [0, 1, 2, 3, 4, 5, 6];
    return {
      weekNumber: 2,
      weekLabel: 'Week 2',
      weeklyQuota: 7,
      dailyQuota: 1,
      dailyQuotaDisplay: '1 Reel / day',
      hint: 'Daily Target: 1 Reel / day',
      allowedReelDays,
      allowedDayNames: 'Mon through Sun',
      isReelAllowedToday: true,
      isCurrentDayReelDay: true,
    };
  }

  if (weekNumber === 3) {
    // Week 3: 12/week, 2 Reels/day (with a hint "Bonus: 3 on Saturdays")
    const allowedReelDays = [0, 1, 2, 3, 4, 5, 6];
    return {
      weekNumber: 3,
      weekLabel: 'Week 3',
      weeklyQuota: 12,
      dailyQuota: 2,
      dailyQuotaDisplay: '2 Reels / day',
      hint: 'Bonus: 3 on Saturdays',
      allowedReelDays,
      allowedDayNames: 'Mon through Sun (Bonus Sat)',
      isReelAllowedToday: true,
      isCurrentDayReelDay: true,
    };
  }

  // Week 4+
  const allowedReelDays = [0, 1, 2, 3, 4, 5, 6];
  return {
    weekNumber,
    weekLabel: `Week ${weekNumber}+`,
    weeklyQuota: 14,
    dailyQuota: 2,
    dailyQuotaDisplay: '2 Reels / day',
    hint: 'Velocity Target: 2 Reels / day',
    allowedReelDays,
    allowedDayNames: 'Mon through Sun',
    isReelAllowedToday: true,
    isCurrentDayReelDay: true,
  };
}

/**
 * Checks if marking a Reel is allowed on a specific date.
 */
export function canMarkReelOnDate(
  dateStr?: string,
  weekInfo?: GrowthCurveWeekInfo
): { allowed: boolean; reason?: string } {
  const info = weekInfo || getGrowthCurveWeekInfo(dateStr);
  if (info.isReelAllowedToday) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: info.nonAllowedReason || 'Reel marking is not permitted on this day.',
  };
}

// -------------------------------------------------------------
// STORY TRACKING SYSTEM
// -------------------------------------------------------------

export function loadStoryLogs(): StoryLogRecord[] {
  try {
    const raw = localStorage.getItem(STORY_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_e) {}
  return [];
}

export function saveStoryLogs(logs: StoryLogRecord[]): void {
  try {
    localStorage.setItem(STORY_LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (_e) {}
}

/**
 * Logs a Story posted today.
 */
export function logStoryToday(
  leadId?: string,
  leadName?: string,
  channel?: MultiChannelType
): StoryLogRecord {
  const todayStr = getLocalTodayStr();
  const logs = loadStoryLogs();
  const newEntry: StoryLogRecord = {
    id: `story-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: todayStr,
    timestamp: new Date().toISOString(),
    leadId,
    leadName,
    channel,
  };

  const updated = [newEntry, ...logs];
  saveStoryLogs(updated);
  return newEntry;
}

/**
 * Computes total stories posted today across story logs and lead flags.
 */
export function getStoriesPostedTodayCount(allLeads?: ChannelLead[]): number {
  const todayStr = getLocalTodayStr();
  const logs = loadStoryLogs();
  const logsToday = logs.filter((l) => l.date === todayStr);

  let leadsTodayCount = 0;
  if (allLeads && allLeads.length > 0) {
    leadsTodayCount = allLeads.filter(
      (l) => l.storyPosted && (normalizeToLocalDateStr(l.storyPostedAt) === todayStr || (!l.storyPostedAt && l.storyPosted))
    ).length;
  } else {
    const channels: MultiChannelType[] = ['email', 'instagram', 'facebook'];
    for (const ch of channels) {
      const chLeads = loadChannelLeads(ch);
      for (const l of chLeads) {
        if (l.storyPosted && (normalizeToLocalDateStr(l.storyPostedAt) === todayStr || (!l.storyPostedAt && l.storyPosted))) {
          leadsTodayCount++;
        }
      }
    }
  }

  // Combine uniquely (max of logged events or marked leads)
  return Math.max(logsToday.length, leadsTodayCount);
}

// -------------------------------------------------------------
// REEL METRICS
// -------------------------------------------------------------

/**
 * Returns count of Reels posted today across all channels.
 */
export function getReelsPostedTodayCount(allLeads: ChannelLead[]): number {
  const todayStr = getLocalTodayStr();
  return allLeads.filter(
    (l) =>
      l.reelPosted &&
      (normalizeToLocalDateStr(l.reelPostedAt) === todayStr || (!l.reelPostedAt && l.reelPosted))
  ).length;
}

/**
 * Returns count of Reels posted during the current 7-day week cycle.
 */
export function getReelsPostedThisWeekCount(
  allLeads: ChannelLead[],
  currentDateStr?: string
): number {
  const todayStr = currentDateStr || getLocalTodayStr();
  const startDateStr = getGrowthCurveStartDate();

  // Find the start date of the current 7-day week block
  try {
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [cy, cm, cd] = todayStr.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const current = new Date(cy, cm - 1, cd);
    const diffDays = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeekIdx = Math.max(0, Math.floor(diffDays / 7));

    const weekStartDate = new Date(start);
    weekStartDate.setDate(weekStartDate.getDate() + currentWeekIdx * 7);

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const formatYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const wStartStr = formatYmd(weekStartDate);
    const wEndStr = formatYmd(weekEndDate);

    return allLeads.filter((l) => {
      if (!l.reelPosted) return false;
      const date = normalizeToLocalDateStr(l.reelPostedAt) || todayStr;
      return date >= wStartStr && date <= wEndStr;
    }).length;
  } catch (_e) {
    return getReelsPostedTodayCount(allLeads);
  }
}
