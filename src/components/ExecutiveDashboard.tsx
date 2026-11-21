import React, { useState, useEffect } from 'react';
import {
  Send,
  Flame,
  Trophy,
  Download,
  ArrowRight,
  TrendingUp,
  Layers,
  Instagram,
  AlertTriangle,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../types';
import { exportChannelData, getChannelLabel } from '../utils/channelStorage';
import {
  loadDailyHistory,
  calculateStreaks,
  isDateStringSunday,
  calculateDailyExecutionScore,
  getExecutionTierMeta,
  getQuotaSettings,
} from '../utils/historyStorage';
import { getLocalTodayStr } from '../utils/cadenceEngine';
import { getSupplyGapBadgeMeta } from '../utils/executionTiers';
import { getOrphanedCadences } from '../utils/leadLifecycle';

interface ExecutiveDashboardProps {
  combinedLeads?: ChannelLead[];
  emailLeads?: ChannelLead[];
  instagramLeads: ChannelLead[];
  facebookLeads?: ChannelLead[];
  onNavigateToChannel: (channel: MultiChannelType) => void;
  onNavigateToToday?: () => void;
  onNavigateToBackstage?: () => void;
  isFrozen?: boolean;
  onToggleFreeze?: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  combinedLeads,
  emailLeads = [],
  instagramLeads,
  facebookLeads = [],
  onNavigateToChannel,
  onNavigateToBackstage,
  isFrozen = false,
  onToggleFreeze,
}) => {
  const [quotaSettings, setQuotaSettings] = useState(() => getQuotaSettings());
  const [, setLedgerTick] = useState(0);

  useEffect(() => {
    const handleQuotaChanged = () => {
      setQuotaSettings(getQuotaSettings());
    };
    const handleLedgerChanged = () => {
      setLedgerTick((t) => t + 1);
    };
    window.addEventListener('crm_quota_settings_changed', handleQuotaChanged);
    window.addEventListener('ridge_dispatch_log_changed', handleLedgerChanged);
    window.addEventListener('ridge_daily_obligations_changed', handleLedgerChanged);
    window.addEventListener('backstage_leads_changed', handleLedgerChanged);
    window.addEventListener('crm_data_repaired', handleLedgerChanged);
    window.addEventListener('pipeline_freeze_changed', handleLedgerChanged);
    return () => {
      window.removeEventListener('crm_quota_settings_changed', handleQuotaChanged);
      window.removeEventListener('ridge_dispatch_log_changed', handleLedgerChanged);
      window.removeEventListener('ridge_daily_obligations_changed', handleLedgerChanged);
      window.removeEventListener('backstage_leads_changed', handleLedgerChanged);
      window.removeEventListener('crm_data_repaired', handleLedgerChanged);
      window.removeEventListener('pipeline_freeze_changed', handleLedgerChanged);
    };
  }, []);

  const todayStr = getLocalTodayStr();
  const effectiveCombinedLeads = combinedLeads ?? [...emailLeads, ...facebookLeads];

  const allLeads = [
    ...effectiveCombinedLeads.map((l) => ({ ...l, channelName: 'Combined Outreach' as const })),
    ...instagramLeads.map((l) => ({ ...l, channelName: 'Instagram' as const })),
  ];

  const historyRecords = loadDailyHistory(allLeads);

  // Auditable Model A Execution Score for Today
  const todayScore = calculateDailyExecutionScore(todayStr, allLeads, quotaSettings);
  const todayTierMeta = getExecutionTierMeta(todayScore.percentageOrNull, {
    isSunday: todayScore.isRestDay,
    isFrozen: todayScore.isFrozen,
    isEmpty: todayScore.zeroState === 'empty',
    isPreLaunch: todayScore.zeroState === 'pre_launch',
    isToday: true,
    streakMinPercent: quotaSettings.streakMinPercent,
  });

  const igSentToday = todayScore.igActual;
  const combinedSentToday = todayScore.combinedActual;
  const effectiveDmsSentToday = todayScore.actual;
  const unifiedDailyQuotaTarget = todayScore.capacityTarget || quotaSettings.dailyCapacity;
  const dmProgressPercent = todayScore.percentage;
  const supplyGapBadge = getSupplyGapBadgeMeta(todayScore.supplyGap);
  const orphanedCadences = getOrphanedCadences(todayStr);

  // Count FB restricted leads needing email routing
  const fbRestrictedCount = effectiveCombinedLeads.filter((l) => l.fb_message_restricted && l.cadenceStatus !== 'cancelled').length;

  // Auditable Streak Calculation (Immutable ledger + >=50% default min, Rest/Frozen 100% Protected)
  const streakStats = calculateStreaks(historyRecords, {
    leads: allLeads,
    todayDmsSent: effectiveDmsSentToday,
  });
  const isTodaySunday = isDateStringSunday(todayStr);

  const handleExportAllChannels = () => {
    if (combinedLeads) {
      exportChannelData('combined', 'csv', effectiveCombinedLeads);
    } else {
      exportChannelData('email', 'csv', emailLeads);
      setTimeout(() => exportChannelData('facebook', 'csv', facebookLeads), 300);
    }
    setTimeout(() => exportChannelData('instagram', 'csv', instagramLeads), 600);
  };

  // Pipeline Comparison Data per Channel
  const channelsData: {
    channel: MultiChannelType;
    label: string;
    icon: React.ReactNode;
    color: string;
    border: string;
    badgeClass: string;
    leads: ChannelLead[];
  }[] = [
    {
      channel: 'combined',
      label: 'Combined Outreach',
      icon: <Layers className="w-4 h-4 text-indigo-400" />,
      color: 'text-indigo-400',
      border: 'border-indigo-500/30',
      badgeClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
      leads: effectiveCombinedLeads,
    },
    {
      channel: 'instagram',
      label: 'Instagram',
      icon: <Instagram className="w-4 h-4 text-pink-400" />,
      color: 'text-pink-400',
      border: 'border-pink-500/30',
      badgeClass: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
      leads: instagramLeads,
    },
  ];

  // Pipeline totals
  const totalLeads = allLeads.length;
  const totalPitches = allLeads.filter((l) => Boolean(l.initialDM || l.customPitch)).length;
  const totalScheduled = allLeads.filter((l) => Boolean(l.scheduledDate)).length;
  const totalDispatched = allLeads.filter((l) => Boolean(l.initialSentDate || l.dmSent)).length;
  const totalMockups = allLeads.filter((l) => Boolean(l.hasMockup || l.mockupHtml)).length;

  return (
    <div className="space-y-6">
      {/* Executive Command Header */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">
              Executive Command Center
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono">
              Live Pipeline
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] mt-1">
            Outreach Engine Pro
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-indigo-300 font-semibold font-mono tabular-nums">
              Daily Cap: {quotaSettings.dailyCapacity}/day ({quotaSettings.igQuota} IG · {quotaSettings.combinedQuota} Combined)
            </span>
            <span>·</span>
            <span className="text-emerald-400 font-mono tabular-nums">
              Lifetime D0: {streakStats.totalDMsSent}
            </span>
            <span>·</span>
            <span className="text-emerald-400 font-medium">Sunday Rest Mode Active</span>
            <span>·</span>
            <span className="text-slate-400 font-mono text-[11px] tabular-nums">
              Active Leads: {totalLeads}
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          {onToggleFreeze && (
            <button
              type="button"
              onClick={onToggleFreeze}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                isFrozen
                  ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                  : 'border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white'
              }`}
              title={
                isFrozen
                  ? 'Today is frozen. Click to resume work and wake up today\'s daily quota!'
                  : 'Freeze Day (Take Day Off): pauses today\'s tasks, shifts follow-ups to the next active working day, and protects your streak.'
              }
            >
              <span>{isFrozen ? '▶️ Resume Today' : '❄️ Freeze Day (Take Day Off)'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportAllChannels}
            disabled={totalLeads === 0}
            className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            title="Download CSV export across all channels"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export All CSV</span>
          </button>
        </div>
      </div>

      {/* FB Message Restriction Smart Routing Banner if any restricted leads detected */}
      {fbRestrictedCount > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <span className="text-base">🚫</span>
            <span>
              <strong>{fbRestrictedCount} Facebook {fbRestrictedCount === 1 ? 'Lead has' : 'Leads have'}</strong> the message button restricted or hidden. Smart routing automatically prioritizes Email fallback.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToChannel('facebook')}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold cursor-pointer shrink-0"
          >
            Review FB Leads
          </button>
        </div>
      )}

      {/* Orphaned Cadences Warning Banner */}
      {orphanedCadences.length > 0 && (
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Orphaned Cadences ({orphanedCadences.length}):</strong> Archived leads in Backstage still have active D4/D8/D14 follow-ups scheduled or due within 7 days.
            </span>
          </div>
          {onNavigateToBackstage && (
            <button
              type="button"
              onClick={onNavigateToBackstage}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold cursor-pointer shrink-0"
            >
              Review in Backstage
            </button>
          )}
        </div>
      )}

      {/* Top 3 Executive Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Unified Touchpoints Dispatched Today (Model A Quota Score) */}
        <div
          className="rounded-2xl border bg-gradient-to-br from-sky-950/30 via-slate-900/80 to-slate-900 p-5 shadow-xl space-y-2.5"
          style={{ borderColor: `${todayTierMeta.colorHex}55` }}
          title={todayScore.shortfallReason}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider" style={{ color: todayTierMeta.colorHex }}>
            <span>Audited Dispatches Today</span>
            <Send className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-black text-white font-mono tabular-nums">
              {todayScore.isRestDay || todayScore.isFrozen
                ? '100%'
                : todayScore.zeroState === 'empty'
                ? 'Empty'
                : `${dmProgressPercent}%`}
            </span>
            <span className="text-xs font-bold text-slate-300 font-mono tabular-nums">
              {todayScore.isRestDay || todayScore.isFrozen
                ? '(Rest / Protected)'
                : todayScore.zeroState === 'empty'
                ? '— Refill Required'
                : `(${effectiveDmsSentToday}/${unifiedDailyQuotaTarget} Dispatched)`}
            </span>
            <span
              className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded border font-mono"
              style={{
                backgroundColor: `${todayTierMeta.colorHex}1F`,
                borderColor: `${todayTierMeta.colorHex}55`,
                color: todayTierMeta.colorHex,
              }}
            >
              {todayTierMeta.shortLabel}
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${todayScore.zeroState === 'empty' ? 0 : dmProgressPercent}%`,
                backgroundColor: todayTierMeta.colorHex,
              }}
            />
          </div>
          {/* Channel Allocation Breakdown + Backlog / Supply Gap pills */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5 tabular-nums flex-wrap gap-1.5">
            <span className="text-pink-400" title="Instagram Sent Today">
              IG: {igSentToday}/{quotaSettings.igQuota}
            </span>
            <span className="text-indigo-400" title="Combined Outreach (Email & FB) Sent Today">
              Combined: {combinedSentToday}/{quotaSettings.combinedQuota}
            </span>
            <div className="flex items-center gap-1.5">
              {todayScore.backlog > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
                  +{todayScore.backlog} backlog
                </span>
              )}
              {supplyGapBadge && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${supplyGapBadge.badgeClass}`}
                  title={supplyGapBadge.tooltip}
                >
                  {supplyGapBadge.label}
                </span>
              )}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {todayScore.shortfallReason}
          </div>
        </div>

        {/* 2. Current Streak */}
        <div
          className={`rounded-2xl border p-5 shadow-xl space-y-2.5 ${
            streakStats.streakStatus === 'at_risk' || streakStats.streakStatus === 'broken'
              ? 'border-[#EF4444]/40 bg-gradient-to-br from-rose-950/30 via-slate-900/80 to-slate-900'
              : 'border-orange-500/30 bg-gradient-to-br from-orange-950/30 via-slate-900/80 to-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-orange-400 uppercase tracking-wider">
            <span>Current Streak</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-black text-white font-mono tabular-nums">
              {streakStats.currentStreak}
            </span>
            <span className="text-xs text-orange-300 font-medium">
              {streakStats.currentStreak === 1 ? 'Day' : 'Days'}
            </span>
            {streakStats.streakStatus === 'at_risk' || streakStats.streakStatus === 'broken' ? (
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded border font-mono bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40">
                {streakStats.streakStatus === 'broken' ? 'Broken' : 'At Risk / Paused'}
              </span>
            ) : streakStats.streakStatus === 'active' || streakStats.streakStatus === 'protected' ? (
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded border font-mono bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40">
                Protected / Active
              </span>
            ) : null}
          </div>
          <div className="text-[11px] text-slate-400">
            {isFrozen
              ? '❄️ Pipeline Frozen (100% Streak Protected)'
              : isTodaySunday
              ? '🌿 Sunday Rest Day (100% Protected)'
              : streakStats.atRiskReason
              ? streakStats.atRiskReason
              : `Maintain ≥${quotaSettings.streakThreshold}% verified dispatches/day to stay protected`}
          </div>
        </div>

        {/* 3. Best Streak */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-slate-900 p-5 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider">
            <span>Best Streak</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tabular-nums">
              {streakStats.bestStreak}
            </span>
            <span className="text-xs text-amber-300 font-medium">
              {streakStats.bestStreak === 1 ? 'Day Record' : 'Days Record'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            All-time execution record
          </div>
        </div>
      </div>

      {/* CHANNEL PIPELINE COMPARISON TABLE */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden shadow-2xl space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <TrendingUp className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-['Outfit']">
                Channel Pipeline Comparison
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time breakdown of leads, custom pitches drafted, scheduled outreach, dispatched DMs, and mockup readiness across channels.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 text-left">Channel</th>
                <th className="py-3.5 px-4 text-center font-mono">Leads</th>
                <th className="py-3.5 px-4 text-center font-mono">Pitches Drafted</th>
                <th className="py-3.5 px-4 text-center font-mono">Scheduled</th>
                <th className="py-3.5 px-4 text-center font-mono">Dispatched</th>
                <th className="py-3.5 px-4 text-center font-mono">Mockup Ready</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {channelsData.map((item) => {
                const leadsCount = item.leads.length;
                const pitchesCount = item.leads.filter((l) => Boolean(l.initialDM || l.customPitch)).length;
                const scheduledCount = item.leads.filter((l) => Boolean(l.scheduledDate)).length;
                const dispatchedCount = item.leads.filter((l) => Boolean(l.initialSentDate || l.dmSent)).length;
                const mockupsCount = item.leads.filter((l) => Boolean(l.hasMockup || l.mockupHtml)).length;

                return (
                  <tr key={item.channel} className="hover:bg-white/[0.02] transition-colors">
                    {/* Channel */}
                    <td className="py-4 px-4 text-left">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/10 flex items-center justify-center">
                          {item.icon}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-100 font-['Outfit'] block">
                            {item.label}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {getChannelLabel(item.channel)} Workspace
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Leads */}
                    <td className="py-4 px-4 text-center font-mono text-sm font-bold text-slate-200 tabular-nums">
                      {leadsCount}
                    </td>

                    {/* Pitches Drafted */}
                    <td className="py-4 px-4 text-center font-mono text-sm font-bold text-indigo-300 tabular-nums">
                      {pitchesCount}
                    </td>

                    {/* Scheduled */}
                    <td className="py-4 px-4 text-center font-mono text-sm font-bold text-amber-300 tabular-nums">
                      {scheduledCount}
                    </td>

                    {/* Dispatched */}
                    <td className="py-4 px-4 text-center font-mono text-sm font-bold text-sky-300 tabular-nums">
                      {dispatchedCount}
                    </td>

                    {/* Mockup Ready */}
                    <td className="py-4 px-4 text-center font-mono text-sm font-bold text-emerald-400 tabular-nums">
                      {mockupsCount}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onNavigateToChannel(item.channel)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition cursor-pointer"
                      >
                        <span>Open Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Summary / Total Row */}
              <tr className="bg-slate-950/60 font-bold border-t-2 border-white/10">
                <td className="py-4 px-4 text-left font-['Outfit'] text-slate-300">
                  Total Pipeline
                </td>
                <td className="py-4 px-4 text-center font-mono text-sm text-white tabular-nums">
                  {totalLeads}
                </td>
                <td className="py-4 px-4 text-center font-mono text-sm text-indigo-300 tabular-nums">
                  {totalPitches}
                </td>
                <td className="py-4 px-4 text-center font-mono text-sm text-amber-300 tabular-nums">
                  {totalScheduled}
                </td>
                <td className="py-4 px-4 text-center font-mono text-sm text-sky-300 tabular-nums">
                  {totalDispatched}
                </td>
                <td className="py-4 px-4 text-center font-mono text-sm text-emerald-400 tabular-nums">
                  {totalMockups}
                </td>
                <td className="py-4 px-4 text-right text-xs text-slate-400 font-mono">
                  All Channels Active
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
