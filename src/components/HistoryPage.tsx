import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  Trophy,
  CalendarCheck2,
  Calendar as CalendarIcon,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coffee,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  Layers,
  ArrowRight,
  Download,
  X,
  Send,
} from 'lucide-react';
import { DailyHistoryRecord, DailyHistoryStatus, ChannelLead } from '../types';
import {
  loadDailyHistory,
  calculateStreaks,
  get30DayHistoryView,
  resetDailyHistory,
  isDateStringSunday,
} from '../utils/historyStorage';
import {
  getLocalTodayStr,
  addDays,
  getLeadBaseContactDate,
  normalizeToLocalDateStr,
  getTomorrowWarmupTargetDate,
  isEmailOnlyLead,
} from '../utils/cadenceEngine';
import { loadChannelLeads } from '../utils/channelStorage';
import { getVideosVerifiedTodayCount } from '../utils/videoVerification';
import { getStoriesPostedTodayCount } from '../utils/growthCurve';

interface HistoryPageProps {
  onNavigateToToday: () => void;
  combinedLeads?: ChannelLead[];
  emailLeads?: ChannelLead[];
  instagramLeads?: ChannelLead[];
  facebookLeads?: ChannelLead[];
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onNavigateToToday,
  combinedLeads,
  emailLeads,
  instagramLeads,
  facebookLeads,
}) => {
  const [historyRecords, setHistoryRecords] = useState<DailyHistoryRecord[]>(() =>
    loadDailyHistory()
  );
  const [filterStatus, setFilterStatus] = useState<'all' | 'full' | 'sunday' | 'partial_zero'>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [inspectedDate, setInspectedDate] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  const todayStr = getLocalTodayStr();

  // Combine leads across channels
  const allLeads = useMemo(() => {
    const combined = combinedLeads || loadChannelLeads('combined');
    const ig = instagramLeads || loadChannelLeads('instagram');
    const e = emailLeads || [];
    const fb = facebookLeads || [];
    return [...combined, ...ig, ...e, ...fb];
  }, [combinedLeads, instagramLeads, emailLeads, facebookLeads]);

  // Wipe any stale legacy mock data from LocalStorage: must start at 0 until verified outreach occurs
  useEffect(() => {
    const verifiedSendsCount = allLeads.filter((l) => Boolean(l.initialSentDate)).length;
    if (verifiedSendsCount === 0) {
      try {
        const raw = localStorage.getItem('outreach_daily_history');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.some((r) => (r.dmsSent ?? 0) > 0 || (r.initialDmsSent ?? 0) > 0)) {
            localStorage.removeItem('outreach_daily_history');
            setHistoryRecords([]);
          }
        }
      } catch {}
    }
  }, [allLeads]);

  // Actual verified Initial DM dispatches
  const totalInitialDMsDispatched = useMemo(() => {
    return allLeads.filter((l) => Boolean(l.initialSentDate)).length;
  }, [allLeads]);

  // Map touchpoints per date: Initial (Blue), D4 (Purple), D8 (Amber), D14 (Red)
  // CRITICAL: Only count when outreach was ACTUALLY MARKED AS SENT. Never count unsent scheduled dates!
  const touchpointsByDate = useMemo(() => {
    const map: Record<
      string,
      { initial: number; d4: number; d8: number; d14: number }
    > = {};

    allLeads.forEach((l) => {
      // 1. Initial Contact — ONLY if actually marked as sent!
      if (l.initialSentDate) {
        const initDate = normalizeToLocalDateStr(l.initialSentDate);
        if (initDate) {
          if (!map[initDate]) map[initDate] = { initial: 0, d4: 0, d8: 0, d14: 0 };
          map[initDate].initial += 1;
        }
      }

      // 2. Day 4 Follow-Up — ONLY if actually marked as sent!
      if (l.followup1SentDate) {
        const d4Date = normalizeToLocalDateStr(l.followup1SentDate);
        if (d4Date) {
          if (!map[d4Date]) map[d4Date] = { initial: 0, d4: 0, d8: 0, d14: 0 };
          map[d4Date].d4 += 1;
        }
      }

      // 3. Day 8 Follow-Up — ONLY if actually marked as sent!
      if (l.followup2SentDate) {
        const d8Date = normalizeToLocalDateStr(l.followup2SentDate);
        if (d8Date) {
          if (!map[d8Date]) map[d8Date] = { initial: 0, d4: 0, d8: 0, d14: 0 };
          map[d8Date].d8 += 1;
        }
      }

      // 4. Day 14 Follow-Up — ONLY if actually marked as sent!
      if (l.followup3SentDate) {
        const d14Date = normalizeToLocalDateStr(l.followup3SentDate);
        if (d14Date) {
          if (!map[d14Date]) map[d14Date] = { initial: 0, d4: 0, d8: 0, d14: 0 };
          map[d14Date].d14 += 1;
        }
      }
    });

    return map;
  }, [allLeads]);

  // Streak calculations and aggregates
  const streakStats = useMemo(
    () =>
      calculateStreaks(historyRecords, {
        todayDmsSent: totalInitialDMsDispatched,
        todayVideosVerified: getVideosVerifiedTodayCount(),
        todayStoriesPosted: getStoriesPostedTodayCount(),
      }),
    [historyRecords, totalInitialDMsDispatched]
  );

  // 30-day window
  const thirtyDayWindow = useMemo(
    () => get30DayHistoryView(historyRecords, allLeads),
    [historyRecords, allLeads]
  );

  // Filtered chronological entries
  const filteredRecords = useMemo(() => {
    return thirtyDayWindow.filter((record) => {
      if (selectedDate && record.date !== selectedDate) {
        return false;
      }
      if (filterStatus === 'all') return true;
      if (filterStatus === 'full') return record.status === 'full';
      if (filterStatus === 'sunday') return record.isSunday;
      if (filterStatus === 'partial_zero')
        return !record.isSunday && (record.status === 'partial' || record.status === 'zero');
      return true;
    });
  }, [thirtyDayWindow, filterStatus, selectedDate]);

  const handleResetConfirm = () => {
    const refreshed = resetDailyHistory();
    setHistoryRecords(refreshed);
    setSelectedDate(null);
    setShowResetModal(false);
  };

  /**
   * Requirement 3: Download History CSV
   * Columns: Date, Completion % (Outreach), Completion % (Warm-Up), Initial DMs Sent, Day 4 Sent, Day 8 Sent, Day 14 Sent
   */
  const handleDownloadCsv = () => {
    const headers = [
      'Date',
      'Completion % (Outreach)',
      'Completion % (Warm-Up)',
      'Initial DMs Sent',
      'Day 4 Sent',
      'Day 8 Sent',
      'Day 14 Sent',
    ];

    // Calculate live warmup metrics for today from current leads
    const warmupTargetDateStr = isDateStringSunday(todayStr)
      ? null
      : getTomorrowWarmupTargetDate(todayStr);
    const warmupLeadsForTomorrow = warmupTargetDateStr
      ? allLeads.filter(
          (l) =>
            !l.isCompleted &&
            !l.initialSentDate &&
            l.scheduledDate === warmupTargetDateStr &&
            !isEmailOnlyLead(l)
        )
      : [];
    const warmupCompletedTodayCount = warmupLeadsForTomorrow.filter(
      (l) => l.warmupStatus === 'warmed' || l.isWarmedUp
    ).length;
    const warmupTotalNeededToday = warmupLeadsForTomorrow.length;
    const liveWarmupPctToday =
      warmupTotalNeededToday > 0
        ? Math.min(100, Math.round((warmupCompletedTodayCount / warmupTotalNeededToday) * 100))
        : 100;

    const rows = thirtyDayWindow.map((day) => {
      const tp = touchpointsByDate[day.date] || { initial: 0, d4: 0, d8: 0, d14: 0 };
      const outreachPct =
        day.isSunday ? 'Rest' : day.status === 'pre_launch' ? '0%' : `${day.percentage}%`;

      // Accurate calculated maths for warm-up completion percentage:
      let warmupPct: string;
      if (day.isSunday) {
        warmupPct = 'Rest';
      } else if (day.status === 'pre_launch') {
        warmupPct = '0%';
      } else if (day.date === todayStr) {
        // Today: prioritize live real-time calculated warm-up progress (100% when all are completed)
        warmupPct = `${liveWarmupPctToday}%`;
      } else if (day.warmupPercentage !== undefined) {
        warmupPct = `${day.warmupPercentage}%`;
      } else if (day.status === 'full') {
        warmupPct = '100%';
      } else if (day.warmupTarget !== undefined && day.warmupTarget > 0) {
        warmupPct = `${Math.min(100, Math.round(((day.warmupCompleted || 0) / day.warmupTarget) * 100))}%`;
      } else {
        // For past historical days without explicit record, check leads warmed on that date
        const warmedOnDate = allLeads.filter(
          (l) => l.warmedUpAt && normalizeToLocalDateStr(l.warmedUpAt) === day.date
        ).length;
        if (warmedOnDate > 0) {
          warmupPct = `${Math.min(100, Math.round((warmedOnDate / 10) * 100))}%`;
        } else {
          warmupPct = '0%';
        }
      }

      return [
        `"${day.date}"`,
        `"${outreachPct}"`,
        `"${warmupPct}"`,
        tp.initial,
        tp.d4,
        tp.d8,
        tp.d14,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `outreach-history-${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getLeadsSentOnDate = (targetDate?: string | null) => {
    if (!targetDate) return { initial: [], d4: [], d8: [], d14: [] };
    const normalized = normalizeToLocalDateStr(targetDate);
    if (!normalized) return { initial: [], d4: [], d8: [], d14: [] };

    return {
      initial: allLeads.filter((l) => normalizeToLocalDateStr(l.initialSentDate) === normalized),
      d4: allLeads.filter((l) => normalizeToLocalDateStr(l.followup1SentDate) === normalized),
      d8: allLeads.filter((l) => normalizeToLocalDateStr(l.followup2SentDate) === normalized),
      d14: allLeads.filter((l) => normalizeToLocalDateStr(l.followup3SentDate) === normalized),
    };
  };

  // Helper for status styling & icons
  const getStatusDisplay = (record: DailyHistoryRecord) => {
    if (record.status === 'frozen' || record.isFrozen) {
      return {
        dotClass: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]',
        badgeBg: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
        label: '❄️ Frozen',
        icon: <span className="text-xs">❄️</span>,
        desc: 'Pipeline frozen for the week · 100% streak immunity preserved',
      };
    }
    if (record.isSunday) {
      return {
        dotClass: 'bg-slate-400',
        badgeBg: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
        label: 'Rest Day',
        icon: <Coffee className="w-3.5 h-3.5 text-slate-400" />,
        desc: 'Sunday rest protocol · Streak protected',
      };
    }
    if (record.status === 'pre_launch') {
      return {
        dotClass: 'bg-slate-600',
        badgeBg: 'bg-slate-900/60 text-slate-400 border-white/10',
        label: 'Pre-Launch',
        icon: <Clock className="w-3.5 h-3.5 text-slate-500" />,
        desc: 'Prior to initial outreach dispatch · Zero failure penalty',
      };
    }
    if (record.status === 'full') {
      const breakdownText =
        record.initialDmsSent !== undefined
          ? `${record.dmsSent}/${record.dmsTarget} Tasks (${record.initialDmsSent} Initial · ${record.followupsSent || 0} Follow-ups)`
          : `${record.dmsSent}/${record.dmsTarget} Tasks Completed`;
      return {
        dotClass: 'bg-emerald-400',
        badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
        label: `${record.percentage}% Complete`,
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        desc: `${breakdownText} · Daily Goal Hit`,
      };
    }
    if (record.status === 'partial') {
      const breakdownText =
        record.initialDmsSent !== undefined
          ? `${record.dmsSent}/${record.dmsTarget} Tasks (${record.initialDmsSent} Initial · ${record.followupsSent || 0} Follow-ups)`
          : `${record.dmsSent}/${record.dmsTarget} Tasks Logged`;
      return {
        dotClass: 'bg-amber-400',
        badgeBg: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
        label: `${record.percentage}% Partial`,
        icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
        desc: `${breakdownText} · Incomplete`,
      };
    }
    // zero / missed
    return {
      dotClass: 'bg-rose-500',
      badgeBg: 'bg-rose-950/60 text-rose-300 border-rose-500/30',
      label: '0% Missed',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
      desc: 'Missed scheduled outreach for this active working day',
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Context */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4 text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight font-['Outfit']">
              Outreach History &amp; Streaks
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Permanent daily completion ledger across 30-day rolling cycles · Sundays protected
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer shadow-sm active:scale-95"
            title="Download complete 30-day history ledger as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download History CSV</span>
          </button>
          <button
            onClick={onNavigateToToday}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-white/10 rounded-lg transition-colors"
          >
            <span>Today&apos;s Schedule</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Cycle</span>
          </button>
        </div>
      </div>

      {/* Primary Streak & Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Streak Card */}
        <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-slate-900/80 to-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-orange-300/80 uppercase tracking-wider">
              Current Streak
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tabular-nums">
              {streakStats.currentStreak}
            </span>
            {totalInitialDMsDispatched === 0 ? (
              <span className="text-xs text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                🚀 Ready to Launch
              </span>
            ) : (
              <span className="text-xs text-orange-300 font-medium">
                {streakStats.currentStreak === 1 ? 'Day Active' : 'Days Active'}
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
            {totalInitialDMsDispatched === 0
              ? 'Streak tracking begins dynamically on the day you send your first initial outreach.'
              : 'Consecutive 100% days logged. Sundays are rest days and never break your streak.'}
          </p>
        </div>

        {/* Best Streak Card */}
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300/80 uppercase tracking-wider">
              Best Streak
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tabular-nums">
              {streakStats.bestStreak}
            </span>
            <span className="text-xs text-amber-300 font-medium">
              {streakStats.bestStreak === 1 ? 'Day Record' : 'Days Record'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
            All-time record streak of complete execution across multi-channel cadences.
          </p>
        </div>

        {/* 30-Day Completion Rate */}
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900/80 to-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300/80 uppercase tracking-wider">
              Average Completion
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tabular-nums">
              {streakStats.averageCompletionRate}%
            </span>
            <span className="text-xs text-emerald-300 font-medium">
              {totalInitialDMsDispatched === 0 ? 'Awaiting First Dispatch' : `${streakStats.completedDaysCount} Days 100%`}
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(streakStats.averageCompletionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Total DMs Dispatched (Initial DM sends only) */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900/80 to-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-300/80 uppercase tracking-wider">
              Total DMs Dispatched
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tabular-nums">
              {totalInitialDMsDispatched}
            </span>
            <span className="text-xs text-indigo-300 font-medium">Initial DMs</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
            Initial DM dispatches only (follow-ups tracked separately in daily schedule completion).
          </p>
        </div>
      </div>

      {/* 30-Day Interactive Calendar Matrix */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-6 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              30-Day Calendar Matrix
            </h3>
            <span className="text-xs text-slate-500">· Click any date to inspect details</span>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>100%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>1–99%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Missed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Rest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <span>Pre-Launch</span>
            </div>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              🔵 Initial
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              🟣 D4
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              🟡 D8
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              🔴 D14
            </span>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
          {thirtyDayWindow.map((day) => {
            const isToday = day.date === todayStr;
            const isSelected = selectedDate === day.date;
            const statusMeta = getStatusDisplay(day);
            const tp = touchpointsByDate[day.date] || { initial: 0, d4: 0, d8: 0, d14: 0 };

            let borderStyle = 'border-white/5 hover:border-white/20';
            if (isSelected) {
              borderStyle = 'border-indigo-400 ring-2 ring-indigo-400/20 bg-indigo-500/10';
            } else if (day.status === 'frozen' || day.isFrozen) {
              borderStyle = 'border-cyan-500/40 bg-cyan-950/30 hover:border-cyan-400/60 shadow-sm shadow-cyan-950/30';
            } else if (day.status === 'full') {
              borderStyle = 'border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-400/50';
            } else if (day.isSunday) {
              borderStyle = 'border-slate-700/40 bg-slate-800/30 hover:border-slate-600';
            } else if (day.status === 'partial') {
              borderStyle = 'border-amber-500/30 bg-amber-950/20 hover:border-amber-400/50';
            } else if (day.status === 'pre_launch') {
              borderStyle = 'border-white/5 bg-slate-900/30 hover:border-white/10 opacity-70 hover:opacity-100';
            } else if (day.status === 'zero') {
              borderStyle = 'border-rose-500/30 bg-rose-950/20 hover:border-rose-400/50';
            }

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => {
                  setInspectedDate(day.date);
                  setSelectedDate(day.date);
                }}
                title={
                  day.isSunday
                    ? 'Sunday Rest Day'
                    : day.status === 'pre_launch'
                    ? `${day.displayDate}: Pre-Launch (Outreach Not Started)`
                    : day.initialDmsSent !== undefined
                    ? `${day.displayDate}: ${day.dmsSent}/${day.dmsTarget} Tasks (${day.initialDmsSent} Initial · ${day.followupsSent || 0} Follow-ups) — ${day.percentage}%`
                    : `${day.displayDate}: ${day.dmsSent}/${day.dmsTarget} Tasks (${day.percentage}%)`
                }
                className={`relative flex flex-col justify-between p-3 rounded-xl border transition-all text-left group min-h-[92px] ${borderStyle}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 font-mono">
                    {day.displayDate.split(',')[0]}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${statusMeta.dotClass}`} />
                </div>

                <div className="mt-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-white font-mono tabular-nums">
                      {day.isSunday
                        ? 'Rest'
                        : day.status === 'pre_launch'
                        ? 'Pre-Launch'
                        : `${day.percentage}%`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {day.isSunday ? '⚪' : day.status === 'pre_launch' ? '—' : `${day.dmsSent}/${day.dmsTarget}`}
                    </span>
                  </div>

                  {/* Standardized Follow-up Cadence Touchpoint Badges */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {tp.initial > 0 && (
                      <span
                        className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono"
                        title={`${tp.initial} Initial Outreach`}
                      >
                        🔵 {tp.initial}
                      </span>
                    )}
                    {tp.d4 > 0 && (
                      <span
                        className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono"
                        title={`${tp.d4} Day 4 Follow-Ups (+4d: Kitchen Ticket PDF)`}
                      >
                        🟣 {tp.d4}
                      </span>
                    )}
                    {tp.d8 > 0 && (
                      <span
                        className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono"
                        title={`${tp.d8} Day 8 Follow-Ups (+8d: Takeout Surge)`}
                      >
                        🟡 {tp.d8}
                      </span>
                    )}
                    {tp.d14 > 0 && (
                      <span
                        className="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono"
                        title={`${tp.d14} Day 14 Final Follow-Ups (+14d: Breakup Loom)`}
                      >
                        🔴 {tp.d14}
                      </span>
                    )}
                  </div>
                </div>

                {isToday && (
                  <span className="mt-1 text-[9px] uppercase tracking-wider text-amber-400 font-bold">
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chronological Day Detail Log */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-6 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Chronological Audit Log
            </h3>
            <span className="text-xs text-slate-400">
              ({filteredRecords.length} {filteredRecords.length === 1 ? 'day' : 'days'} shown)
            </span>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => {
                setFilterStatus('all');
                setSelectedDate(null);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filterStatus === 'all' && !selectedDate
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Days
            </button>
            <button
              onClick={() => {
                setFilterStatus('full');
                setSelectedDate(null);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filterStatus === 'full'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🟢 100% Hit
            </button>
            <button
              onClick={() => {
                setFilterStatus('sunday');
                setSelectedDate(null);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filterStatus === 'sunday'
                  ? 'bg-slate-700 text-slate-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚪ Rest Days
            </button>
            <button
              onClick={() => {
                setFilterStatus('partial_zero');
                setSelectedDate(null);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filterStatus === 'partial_zero'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🟡 Missed / Partial
            </button>
          </div>
        </div>

        {selectedDate && (
          <div className="mb-4 flex items-center justify-between p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
            <span>Filtered to single date: <strong>{selectedDate}</strong></span>
            <button
              onClick={() => setSelectedDate(null)}
              className="font-medium underline hover:text-indigo-200"
            >
              Show all dates
            </button>
          </div>
        )}

        {/* Rows */}
        <div className="space-y-2.5">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No entries match the selected filter.
            </div>
          ) : (
            filteredRecords.map((record) => {
              const statusMeta = getStatusDisplay(record);
              const isToday = record.date === todayStr;

              return (
                <div
                  key={record.date}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                    isToday
                      ? 'bg-slate-900/90 border-amber-500/40 ring-1 ring-amber-500/20'
                      : 'bg-slate-900/40 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${statusMeta.dotClass}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono">
                          {record.displayDate}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {statusMeta.desc}
                        {record.notes && !statusMeta.desc.includes(record.notes) && (
                          <span className="text-slate-500"> · {record.notes}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-0 flex items-center gap-3 self-end sm:self-auto">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${statusMeta.badgeBg}`}
                    >
                      {statusMeta.icon}
                      <span className="font-mono tabular-nums">{statusMeta.label}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Requirement 3: Click to Inspect Date Modal */}
      {inspectedDate && (() => {
        const inspectedRecord = thirtyDayWindow.find((d) => d.date === inspectedDate);
        const statusMeta = inspectedRecord ? getStatusDisplay(inspectedRecord) : null;
        const leadsSent = getLeadsSentOnDate(inspectedDate);
        const totalSent =
          leadsSent.initial.length +
          leadsSent.d4.length +
          leadsSent.d8.length +
          leadsSent.d14.length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/20">
                      Audit Inspection
                    </span>
                    {statusMeta && (
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${statusMeta.badgeBg}`}>
                        {statusMeta.label}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-white font-['Outfit'] mt-1">
                    {inspectedRecord?.displayDate || inspectedDate}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {statusMeta?.desc || 'Audit breakdown for this date'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedDate(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Breakdown Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <span className="text-[10px] font-mono font-bold text-blue-300 uppercase">🔵 Initial DMs</span>
                  <div className="text-2xl font-black text-white font-mono mt-1">{leadsSent.initial.length}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <span className="text-[10px] font-mono font-bold text-purple-300 uppercase">🟣 Day 4 Sent</span>
                  <div className="text-2xl font-black text-white font-mono mt-1">{leadsSent.d4.length}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-mono font-bold text-amber-300 uppercase">🟡 Day 8 Sent</span>
                  <div className="text-2xl font-black text-white font-mono mt-1">{leadsSent.d8.length}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] font-mono font-bold text-rose-300 uppercase">🔴 Day 14 Sent</span>
                  <div className="text-2xl font-black text-white font-mono mt-1">{leadsSent.d14.length}</div>
                </div>
              </div>

              {/* Detailed Lead Lists */}
              {totalSent === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No outreach dispatches were recorded as sent on this date.
                </div>
              ) : (
                <div className="space-y-4">
                  {leadsSent.initial.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-blue-300 uppercase font-mono tracking-wider flex items-center gap-1.5">
                        <span>🔵 Initial DMs Dispatched ({leadsSent.initial.length})</span>
                      </h4>
                      <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-slate-950/60 p-2">
                        {leadsSent.initial.map((lead) => (
                          <div key={lead.id} className="py-2 px-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                {lead.id}
                              </span>
                              <span className="text-slate-100 font-semibold">{lead.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono capitalize">{lead.channel}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {leadsSent.d4.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-purple-300 uppercase font-mono tracking-wider flex items-center gap-1.5">
                        <span>🟣 Day 4 Follow-Ups (Kitchen Ticket PDF) ({leadsSent.d4.length})</span>
                      </h4>
                      <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-slate-950/60 p-2">
                        {leadsSent.d4.map((lead) => (
                          <div key={lead.id} className="py-2 px-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                                {lead.id}
                              </span>
                              <span className="text-slate-100 font-semibold">{lead.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono capitalize">{lead.channel}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {leadsSent.d8.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-amber-300 uppercase font-mono tracking-wider flex items-center gap-1.5">
                        <span>🟡 Day 8 Follow-Ups (Social Proof) ({leadsSent.d8.length})</span>
                      </h4>
                      <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-slate-950/60 p-2">
                        {leadsSent.d8.map((lead) => (
                          <div key={lead.id} className="py-2 px-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                {lead.id}
                              </span>
                              <span className="text-slate-100 font-semibold">{lead.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono capitalize">{lead.channel}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {leadsSent.d14.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-rose-300 uppercase font-mono tracking-wider flex items-center gap-1.5">
                        <span>🔴 Day 14 Breakup (60s Loom) ({leadsSent.d14.length})</span>
                      </h4>
                      <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-slate-950/60 p-2">
                        {leadsSent.d14.map((lead) => (
                          <div key={lead.id} className="py-2 px-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                                {lead.id}
                              </span>
                              <span className="text-slate-100 font-semibold">{lead.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono capitalize">{lead.channel}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setInspectedDate(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reset History Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reset 30-Day History?</h3>
                <p className="text-xs text-slate-400">This will restart your clean tracking cycle</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to reset your history ledger? Your historical records will be cleared and reset to 0. Your actual leads and notes in Instagram and Combined Outreach will not be touched.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-lg shadow-rose-900/30"
              >
                Reset Cycle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
