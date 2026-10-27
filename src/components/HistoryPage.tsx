import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { DailyHistoryRecord, DailyHistoryStatus } from '../types';
import {
  loadDailyHistory,
  calculateStreaks,
  get30DayHistoryView,
  resetDailyHistory,
  OUTREACH_START_DATE,
} from '../utils/historyStorage';
import { getLocalTodayStr } from '../utils/cadenceEngine';

interface HistoryPageProps {
  onNavigateToToday: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigateToToday }) => {
  const [historyRecords, setHistoryRecords] = useState<DailyHistoryRecord[]>(() =>
    loadDailyHistory()
  );
  const [filterStatus, setFilterStatus] = useState<'all' | 'full' | 'sunday' | 'partial_zero'>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  const todayStr = getLocalTodayStr();

  // Streak calculations and aggregates
  const streakStats = useMemo(() => calculateStreaks(historyRecords), [historyRecords]);

  // 30-day window
  const thirtyDayWindow = useMemo(
    () => get30DayHistoryView(historyRecords),
    [historyRecords]
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

  // Helper for status styling & icons
  const getStatusDisplay = (record: DailyHistoryRecord) => {
    if (record.isSunday) {
      return {
        dotClass: 'bg-slate-400',
        badgeBg: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
        label: 'Rest Day',
        icon: <Coffee className="w-3.5 h-3.5 text-slate-400" />,
        desc: 'Sunday rest protocol · Streak protected',
      };
    }
    if (record.status === 'full') {
      return {
        dotClass: 'bg-emerald-400',
        badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
        label: `${record.percentage}% Complete`,
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        desc: `${record.dmsSent}/${record.dmsTarget} DMs Sent · Daily Goal Hit`,
      };
    }
    if (record.status === 'partial') {
      return {
        dotClass: 'bg-amber-400',
        badgeBg: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
        label: `${record.percentage}% Partial`,
        icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
        desc: `${record.dmsSent}/${record.dmsTarget} DMs Sent · Incomplete`,
      };
    }
    // zero / missed
    if (record.date < OUTREACH_START_DATE) {
      return {
        dotClass: 'bg-slate-600',
        badgeBg: 'bg-slate-900/40 text-slate-500 border-white/5',
        label: 'Pre-Launch',
        icon: <Info className="w-3.5 h-3.5 text-slate-500" />,
        desc: 'Before official outreach kickoff on Oct 26',
      };
    }
    return {
      dotClass: 'bg-rose-500',
      badgeBg: 'bg-rose-950/60 text-rose-300 border-rose-500/30',
      label: '0% Missed',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
      desc: 'No outreach logged for this working day',
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

        <div className="flex items-center gap-2.5 self-start md:self-auto">
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
            <span className="text-xs text-orange-300 font-medium">
              {streakStats.currentStreak === 1 ? 'Day Active' : 'Days Active'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
            Consecutive 100% days logged. Sundays are rest days and never break your streak.
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
              {streakStats.completedDaysCount} Days 100%
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(streakStats.averageCompletionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Total DMs Sent in Window */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900/80 to-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-300/80 uppercase tracking-wider">
              Total DMs Logged
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tabular-nums">
              {streakStats.totalDMsSent}
            </span>
            <span className="text-xs text-indigo-300 font-medium">Dispatches</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
            Real outreach dispatches verified from Oct 26 launch to present.
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
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
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
              <span>0% Missed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Sunday Rest</span>
            </div>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
          {thirtyDayWindow.map((day) => {
            const isToday = day.date === todayStr;
            const isSelected = selectedDate === day.date;
            const statusMeta = getStatusDisplay(day);

            let borderStyle = 'border-white/5 hover:border-white/20';
            if (isSelected) {
              borderStyle = 'border-indigo-400 ring-2 ring-indigo-400/20 bg-indigo-500/10';
            } else if (day.status === 'full') {
              borderStyle = 'border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-400/50';
            } else if (day.isSunday) {
              borderStyle = 'border-slate-700/40 bg-slate-800/30 hover:border-slate-600';
            } else if (day.status === 'partial') {
              borderStyle = 'border-amber-500/30 bg-amber-950/20 hover:border-amber-400/50';
            }

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : day.date)}
                className={`relative flex flex-col justify-between p-3 rounded-xl border transition-all text-left group ${borderStyle}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 font-mono">
                    {day.displayDate.split(',')[0]}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${statusMeta.dotClass}`} />
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-white font-mono tabular-nums">
                      {day.isSunday ? 'Rest' : `${day.percentage}%`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {day.isSunday ? '⚪' : `${day.dmsSent}/${day.dmsTarget}`}
                    </span>
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
                        {record.date === OUTREACH_START_DATE && (
                          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                            Official Kickoff
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
              Are you sure you want to reset your history ledger? Your historical records will be cleared and reset to your clean <strong>October 26, 2026</strong> launch day (6/6 DMs Sent, 100%). Your actual leads and notes in Instagram, Facebook, and Email will not be touched.
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
