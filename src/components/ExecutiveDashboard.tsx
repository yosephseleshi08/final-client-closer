import React from 'react';
import {
  Mail,
  Instagram,
  Facebook,
  Send,
  Flame,
  Trophy,
  Download,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../types';
import { exportChannelData, getChannelLabel } from '../utils/channelStorage';
import { loadDailyHistory, calculateStreaks, isDateStringSunday } from '../utils/historyStorage';
import { getLocalTodayStr, normalizeToLocalDateStr } from '../utils/cadenceEngine';

interface ExecutiveDashboardProps {
  emailLeads: ChannelLead[];
  instagramLeads: ChannelLead[];
  facebookLeads: ChannelLead[];
  onNavigateToChannel: (channel: MultiChannelType) => void;
  onNavigateToToday?: () => void;
  isFrozen?: boolean;
  onToggleFreeze?: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  emailLeads,
  instagramLeads,
  facebookLeads,
  onNavigateToChannel,
  isFrozen = false,
  onToggleFreeze,
}) => {
  const todayStr = getLocalTodayStr();
  const historyRecords = loadDailyHistory();

  const allLeads = [
    ...emailLeads.map((l) => ({ ...l, channelName: 'Email' as const })),
    ...instagramLeads.map((l) => ({ ...l, channelName: 'Instagram' as const })),
    ...facebookLeads.map((l) => ({ ...l, channelName: 'Facebook' as const })),
  ];

  // Calculate DMs / Touchpoints Sent Today per channel
  const igSentToday = instagramLeads.filter(
    (l) =>
      (l.dmSent && normalizeToLocalDateStr(l.dmSentAt) === todayStr) ||
      normalizeToLocalDateStr(l.initialSentDate) === todayStr
  ).length;

  const emailSentToday = emailLeads.filter(
    (l) =>
      (l.dmSent && normalizeToLocalDateStr(l.dmSentAt) === todayStr) ||
      normalizeToLocalDateStr(l.initialSentDate) === todayStr
  ).length;

  const fbSentToday = facebookLeads.filter(
    (l) =>
      (l.dmSent && normalizeToLocalDateStr(l.dmSentAt) === todayStr) ||
      normalizeToLocalDateStr(l.initialSentDate) === todayStr
  ).length;

  const dmsSentTodayCount = igSentToday + emailSentToday + fbSentToday;
  const historyDmsSent = historyRecords.find((r) => r.date === todayStr)?.initialDmsSent || 0;
  const effectiveDmsSentToday = Math.max(dmsSentTodayCount, historyDmsSent);
  
  // Unified Cross-Channel Quota: Global cap of 10 Combined Touchpoints/Day (IG target: 6, Others: 4)
  const unifiedDailyQuotaTarget = 10;
  const dmProgressPercent = Math.min(100, Math.round((effectiveDmsSentToday / unifiedDailyQuotaTarget) * 100));

  // Count FB restricted leads needing email routing
  const fbRestrictedCount = facebookLeads.filter((l) => l.fb_message_restricted).length;

  // Streak Calculation (Sunday Rest Mode preserved)
  const streakStats = calculateStreaks(historyRecords, {
    todayDmsSent: effectiveDmsSentToday,
  });
  const isTodaySunday = isDateStringSunday(todayStr);

  const handleExportAllChannels = () => {
    exportChannelData('email', 'csv', emailLeads);
    setTimeout(() => exportChannelData('instagram', 'csv', instagramLeads), 300);
    setTimeout(() => exportChannelData('facebook', 'csv', facebookLeads), 600);
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
      channel: 'email',
      label: 'Email',
      icon: <Mail className="w-4 h-4 text-indigo-400" />,
      color: 'text-indigo-400',
      border: 'border-indigo-500/30',
      badgeClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
      leads: emailLeads,
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
    {
      channel: 'facebook',
      label: 'Facebook',
      icon: <Facebook className="w-4 h-4 text-sky-400" />,
      color: 'text-sky-400',
      border: 'border-sky-500/30',
      badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
      leads: facebookLeads,
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
            <span className="text-indigo-300 font-semibold">Unified Quota: 10 Combined Touchpoints/Day</span>
            <span>·</span>
            <span className="text-pink-400">IG Target: 6</span>
            <span>+</span>
            <span className="text-indigo-300">Email & FB: 4</span>
            <span>·</span>
            <span className="text-emerald-400 font-medium">Sunday Rest Mode Active</span>
            <span>·</span>
            <span className="text-slate-400 font-mono text-[11px]">
              Total Leads across channels: {totalLeads}
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
                  ? 'Pipeline is currently frozen. Click to resume and start your week!'
                  : 'Freeze pipeline for this week: pauses daily tasks, protects streaks, and prevents missed penalties.'
              }
            >
              <span>{isFrozen ? '▶️ Resume Work' : '❄️ Freeze Week'}</span>
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

      {/* Top 3 Executive Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Unified Touchpoints Dispatched Today (Progress Bar X / 10) */}
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/30 via-slate-900/80 to-slate-900 p-5 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-sky-400 uppercase tracking-wider">
            <span>Touchpoints Today</span>
            <Send className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tabular-nums">
              {effectiveDmsSentToday}
            </span>
            <span className="text-sm font-bold text-slate-400 font-mono">/ 10</span>
            {effectiveDmsSentToday >= 10 && (
              <span className="ml-auto text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                Daily Quota Met!
              </span>
            )}
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-sky-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${dmProgressPercent}%` }}
            />
          </div>
          {/* Channel Allocation Breakdown */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
            <span className="text-pink-400" title="Instagram Sent Today">IG: {igSentToday}/6</span>
            <span className="text-indigo-400" title="Email Sent Today">Email: {emailSentToday}</span>
            <span className="text-sky-400" title="Facebook Sent Today">FB: {fbSentToday}</span>
            <span className="text-slate-300 font-bold">{effectiveDmsSentToday}/10 total</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {isFrozen
              ? '⏸️ Week Frozen (0 tasks due)'
              : effectiveDmsSentToday >= 10
              ? '🎯 Unified daily quota complete (10/10)'
              : `${10 - effectiveDmsSentToday} more touchpoints to hit daily goal`}
          </div>
        </div>

        {/* 2. Current Streak */}
        <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-950/30 via-slate-900/80 to-slate-900 p-5 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-orange-400 uppercase tracking-wider">
            <span>Current Streak</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tabular-nums">
              {streakStats.currentStreak}
            </span>
            <span className="text-xs text-orange-300 font-medium">
              {streakStats.currentStreak === 1 ? 'Day Active' : 'Days Active'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            {isFrozen
              ? '❄️ Pipeline Frozen (Streak 100% Safe)'
              : isTodaySunday
              ? '🌿 Sunday Rest Day (streak preserved)'
              : effectiveDmsSentToday >= 6
              ? '🔥 Daily goal met! Streak active'
              : 'Send 6 DMs to maintain daily momentum'}
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
