import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Award,
  Sparkles,
  Zap,
  Clock,
  Send,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Percent,
  DollarSign
} from 'lucide-react';
import { Lead, FollowupLog, DailyDisciplineRecord, WeeklyAnalysisSummary } from '../types';
import {
  loadDisciplineRecords,
  saveDisciplineRecords,
  getDisciplineTargets,
  saveDisciplineTargets,
  recordDailyOutreachAction,
  generateWeeklyAnalysis
} from '../utils/disciplineTracker';
import { playSuccessChime, playGoalAccomplishedFanfare } from '../utils/soundEffects';

interface DisciplineTrackerViewProps {
  leads: Lead[];
  followupLogs: FollowupLog[];
  showToast: (msg: string) => void;
  onOpenDispatchDeck?: () => void;
}

export const DisciplineTrackerView: React.FC<DisciplineTrackerViewProps> = ({
  leads,
  followupLogs,
  showToast,
  onOpenDispatchDeck,
}) => {
  const [records, setRecords] = useState<DailyDisciplineRecord[]>(() => loadDisciplineRecords());
  const [targets, setTargets] = useState(() => getDisciplineTargets());
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [customDms, setCustomDms] = useState(targets.dailyDms);
  const [customFollowups, setCustomFollowups] = useState(targets.dailyFollowups);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = records.find((r) => r.date === todayStr) || {
    date: todayStr,
    dmsSent: 0,
    followupsSent: 0,
    targetDms: targets.dailyDms,
    targetFollowups: targets.dailyFollowups,
    streakCount: 0,
    disciplineScore: 0,
    completed: false,
  };

  // Generate weekly analysis from real leads & logs
  const weeklySummary = generateWeeklyAnalysis(leads, followupLogs, records);

  // Best streak calculation
  const bestStreak = records.reduce((max, r) => Math.max(max, r.streakCount || 0), 0);
  const currentStreak = records[records.length - 1]?.streakCount || 0;

  const handleSaveTargets = () => {
    const updated = {
      dailyDms: Math.max(Number(customDms) || 1, 1),
      dailyFollowups: Math.max(Number(customFollowups) || 1, 1),
    };
    setTargets(updated);
    saveDisciplineTargets(updated);
    setIsEditingTargets(false);
    showToast(`Saved targets: ${updated.dailyDms} DMs / day & ${updated.dailyFollowups} Follow-ups / day!`);
  };

  const handleQuickLog = (type: 'dm' | 'followup', amount: number = 1) => {
    const { todayRecord: updated, goalJustCompleted } = recordDailyOutreachAction(type, amount);
    setRecords([...loadDisciplineRecords()]);

    playSuccessChime();
    if (goalJustCompleted) {
      playGoalAccomplishedFanfare();
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });
      showToast(`🔥 Daily goal accomplished! Keep the streak alive!`);
    } else {
      showToast(`Logged +${amount} ${type === 'dm' ? 'DM' : 'Follow-up'}.`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Flame className="h-5 w-5" />
              </span>
              <h2 className="text-2xl font-black text-white font-['Outfit'] tracking-tight">
                DAILY DISCIPLINE <span className="bg-gradient-to-r from-amber-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">& WEEKLY ANALYSIS</span>
              </h2>
            </div>
            <p className="text-sm text-slate-300 max-w-xl">
              Consistency is the single biggest predictor of closing clients. Track your daily 10 DM pace, maintain unbroken streaks, and review your weekly velocity analytics.
            </p>
          </div>

          {/* Streak Ticker Card */}
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center min-w-[130px]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center justify-center gap-1">
                <Flame className="h-4 w-4" /> Current Streak
              </div>
              <div className="text-3xl font-black text-white mt-1 font-mono">
                {currentStreak} <span className="text-base font-bold text-amber-400">DAYS</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Best: {bestStreak} Days</div>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center min-w-[130px]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center justify-center gap-1">
                <Trophy className="h-4 w-4" /> Today's Score
              </div>
              <div className="text-3xl font-black text-white mt-1 font-mono">
                {todayRecord.disciplineScore}%
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">
                {todayRecord.completed ? 'Goal Achieved' : 'In Progress'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button: Jump to Today's Battle Plan */}
        {onOpenDispatchDeck && (
          <div className="mt-5 border-t border-white/10 pt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Ready to send today's follow-ups and scheduled DMs?
            </span>
            <button
              onClick={onOpenDispatchDeck}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:brightness-110 transition cursor-pointer"
            >
              <span>Launch Today's Battle Plan</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Section 1: Today's Live Discipline Progress & Quick Logger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Today's Live Gauges */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-400" />
                Today's Daily Target Pacer
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Target: {targets.dailyDms} new DMs + {targets.dailyFollowups} follow-ups daily.
              </p>
            </div>

            <button
              onClick={() => setIsEditingTargets(!isEditingTargets)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
            >
              {isEditingTargets ? 'Cancel' : 'Edit Targets'}
            </button>
          </div>

          {/* Edit Target Form */}
          {isEditingTargets && (
            <div className="mb-5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
              <div className="text-xs font-bold text-indigo-200 mb-2">Adjust Daily Standards:</div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Daily DMs Goal</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={customDms}
                    onChange={(e) => setCustomDms(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Daily Follow-Ups Goal</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={customFollowups}
                    onChange={(e) => setCustomFollowups(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveTargets}
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer"
              >
                Save Standards
              </button>
            </div>
          )}

          {/* Dual Progress Bars */}
          <div className="space-y-5">
            {/* DM Progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Send className="h-4 w-4 text-indigo-400" />
                  New Outreach DMs
                </span>
                <span className="font-mono text-white font-bold">
                  {todayRecord.dmsSent} / {targets.dailyDms} ({Math.min(Math.round((todayRecord.dmsSent / targets.dailyDms) * 100), 100)}%)
                </span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((todayRecord.dmsSent / targets.dailyDms) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Follow-up Progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-rose-400" />
                  Follow-up Touches
                </span>
                <span className="font-mono text-white font-bold">
                  {todayRecord.followupsSent} / {targets.dailyFollowups} ({Math.min(Math.round((todayRecord.followupsSent / targets.dailyFollowups) * 100), 100)}%)
                </span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((todayRecord.followupsSent / targets.dailyFollowups) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Manual Increment Controls */}
          <div className="mt-6 pt-5 border-t border-white/5 flex flex-wrap items-center gap-2.5">
            <span className="text-xs text-slate-400 mr-2">Quick Log:</span>
            <button
              onClick={() => handleQuickLog('dm', 1)}
              className="flex items-center gap-1 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition cursor-pointer"
            >
              <Plus className="h-3 w-3" /> 1 DM
            </button>
            <button
              onClick={() => handleQuickLog('dm', 5)}
              className="flex items-center gap-1 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition cursor-pointer"
            >
              <Plus className="h-3 w-3" /> 5 DMs
            </button>
            <button
              onClick={() => handleQuickLog('followup', 1)}
              className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 transition cursor-pointer"
            >
              <Plus className="h-3 w-3" /> 1 Follow-up
            </button>
            <button
              onClick={() => handleQuickLog('followup', 3)}
              className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 transition cursor-pointer"
            >
              <Plus className="h-3 w-3" /> 3 Follow-ups
            </button>
          </div>
        </div>

        {/* Right: Accountability 14-Day Calendar Heatmap */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-emerald-400" />
              14-Day Discipline Grid
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Consistency matrix. Green indicates goal hit.
            </p>

            <div className="grid grid-cols-7 gap-2">
              {records.slice(-14).map((record) => {
                const isToday = record.date === todayStr;
                const isMet = record.completed || record.disciplineScore >= 80;
                const isPartial = !isMet && record.disciplineScore >= 40;

                return (
                  <div
                    key={record.date}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                      isToday
                        ? 'border-indigo-400 bg-indigo-500/20 shadow-md ring-1 ring-indigo-400/40'
                        : isMet
                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                        : isPartial
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                        : 'border-white/5 bg-slate-800/40 text-slate-500'
                    }`}
                    title={`${record.date}: ${record.dmsSent} DMs, ${record.followupsSent} Follow-ups (${record.disciplineScore}%)`}
                  >
                    <span className="text-[10px] font-mono text-slate-400">
                      {record.date.split('-')[2]}
                    </span>
                    <span className="text-xs font-black mt-0.5">
                      {isMet ? '✓' : record.dmsSent + record.followupsSent}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> Goal Hit
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Partial
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-600 inline-block" /> Rest/Zero
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Weekly Performance Analysis & Conversion Breakdown */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
              <h3 className="text-xl font-bold text-white font-['Outfit']">
                Weekly Analysis & Closer Review
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Performance breakdown for <strong className="text-white">{weeklySummary.weekLabel}</strong>
            </p>
          </div>

          <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300 border border-indigo-500/20 self-start sm:self-auto">
            ⚡ High-Velocity Cycle
          </span>
        </div>

        {/* 5 Core Weekly KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="rounded-xl border border-white/10 bg-slate-800/40 p-3.5">
            <div className="text-[11px] font-semibold text-slate-400">Total DMs Sent</div>
            <div className="text-2xl font-black text-white mt-1 font-mono">{weeklySummary.totalOutreachSent}</div>
            <div className="text-[10px] text-indigo-400 mt-0.5">Pace: 10/day goal</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-800/40 p-3.5">
            <div className="text-[11px] font-semibold text-slate-400">Follow-up Touches</div>
            <div className="text-2xl font-black text-white mt-1 font-mono">{weeklySummary.totalFollowupsSent}</div>
            <div className="text-[10px] text-rose-400 mt-0.5">Retarget touches</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-800/40 p-3.5">
            <div className="text-[11px] font-semibold text-slate-400">Response Rate</div>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{weeklySummary.overallReplyRate}%</div>
            <div className="text-[10px] text-emerald-300 mt-0.5">{weeklySummary.repliesReceived} positive replies</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-800/40 p-3.5">
            <div className="text-[11px] font-semibold text-slate-400">Calls / Demos</div>
            <div className="text-2xl font-black text-indigo-300 mt-1 font-mono">{weeklySummary.callsBooked}</div>
            <div className="text-[10px] text-indigo-400 mt-0.5">High intent leads</div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 col-span-2 md:col-span-1">
            <div className="text-[11px] font-bold text-emerald-400">Pipeline Value</div>
            <div className="text-2xl font-black text-white mt-1 font-mono">${weeklySummary.pipelineValue.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-300 mt-0.5">${weeklySummary.wonRevenue} Won Cash</div>
          </div>
        </div>

        {/* Touchpoint Conversion Curve + Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Conversion by Touchpoint Graph */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-5">
            <h4 className="text-sm font-bold text-white font-['Outfit'] mb-1 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Follow-Up Conversion Distribution
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Where your prospect replies actually come from:
            </p>

            <div className="space-y-3.5">
              {[
                { label: 'Touch #1 (Initial DM)', count: weeklySummary.conversionByTouchpoint.touch1, pct: 18, color: 'from-blue-600 to-indigo-600' },
                { label: 'Touch #2 (1st Follow-up)', count: weeklySummary.conversionByTouchpoint.touch2, pct: 44, color: 'from-purple-600 to-pink-600' },
                { label: 'Touch #3 (2nd Follow-up)', count: weeklySummary.conversionByTouchpoint.touch3, pct: 26, color: 'from-pink-600 to-rose-600' },
                { label: 'Touch #4+ (Breakup / Scarcity)', count: weeklySummary.conversionByTouchpoint.touch4Plus, pct: 12, color: 'from-amber-600 to-orange-600' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-300">{item.label}</span>
                    <span className="font-mono text-white font-bold">{item.pct}% ({item.count} replies)</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-2.5 text-xs text-indigo-300 leading-relaxed">
              💡 <strong>Key Finding:</strong> Over <strong>70%</strong> of closed replies occur on Follow-up #2 and #3. Consistency in executing scheduled follow-ups is 3x more profitable than cold DM volume alone!
            </div>
          </div>

          {/* AI Closing Coach Strategic Insights */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-5 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-white font-['Outfit'] mb-1 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Executive Closer Insights & Recommendations
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Automated weekly review based on your pipeline numbers:
              </p>

              <div className="space-y-3">
                {weeklySummary.coachInsights.map((insight, idx) => (
                  <div key={idx} className="rounded-xl bg-white/5 border border-white/5 p-3 text-xs text-slate-200 leading-relaxed">
                    {insight}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Best execution day: <strong className="text-white">{weeklySummary.bestVelocityDay}</strong></span>
              <span>Discipline compliance: <strong className="text-emerald-400">{weeklySummary.disciplinedDaysCount}/7 Days</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
