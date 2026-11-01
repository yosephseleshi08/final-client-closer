import React from 'react';
import {
  Mail,
  Instagram,
  Facebook,
  Users,
  MessageSquare,
  Calendar,
  Clock,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Download,
  FileSpreadsheet,
  Flame,
  Trophy,
  Film,
  Send,
  Video,
  Sparkles,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../types';
import { exportChannelData } from '../utils/channelStorage';
import { loadDailyHistory, calculateStreaks } from '../utils/historyStorage';
import { getLocalTodayStr, normalizeToLocalDateStr } from '../utils/cadenceEngine';

interface ExecutiveDashboardProps {
  emailLeads: ChannelLead[];
  instagramLeads: ChannelLead[];
  facebookLeads: ChannelLead[];
  onNavigateToChannel: (channel: MultiChannelType) => void;
  onNavigateToToday?: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  emailLeads,
  instagramLeads,
  facebookLeads,
  onNavigateToChannel,
  onNavigateToToday,
}) => {
  const todayStr = getLocalTodayStr();
  const historyRecords = loadDailyHistory();
  const streakStats = calculateStreaks(historyRecords);

  const allLeads = [
    ...emailLeads.map((l) => ({ ...l, channelName: 'Email' as const })),
    ...instagramLeads.map((l) => ({ ...l, channelName: 'Instagram' as const })),
    ...facebookLeads.map((l) => ({ ...l, channelName: 'Facebook' as const })),
  ];

  // Video Value First Daily Quota Metrics (User Requirement #1)
  const dmsSentTodayCount = allLeads.filter(
    (l) =>
      (l.dmSent && normalizeToLocalDateStr(l.dmSentAt) === todayStr) ||
      normalizeToLocalDateStr(l.initialSentDate) === todayStr
  ).length;
  const historyDmsSent = historyRecords.find((r) => r.date === todayStr)?.initialDmsSent || 0;
  const effectiveDmsSentToday = Math.max(dmsSentTodayCount, historyDmsSent);
  const dmQuotaTarget = 6;
  const dmProgressPercent = Math.min(100, Math.round((effectiveDmsSentToday / dmQuotaTarget) * 100));

  const reelsPostedTodayCount = allLeads.filter(
    (l) =>
      l.reelPosted &&
      (normalizeToLocalDateStr(l.reelPostedAt) === todayStr || (!l.reelPostedAt && l.reelPosted))
  ).length;
  const reelQuotaTarget = 2;
  const reelProgressPercent = Math.min(100, Math.round((reelsPostedTodayCount / reelQuotaTarget) * 100));

  const videosPendingReelCount = allLeads.filter(
    (l) => Boolean(l.videoRecorded) && !l.reelPosted
  ).length;

  const totalLeads = allLeads.length;
  const totalPitches = allLeads.filter((l) => Boolean(l.customPitch)).length;
  const totalScheduled = allLeads.filter((l) => Boolean(l.scheduledDate)).length;
  const totalCompleted = allLeads.filter((l) => Boolean(l.isCompleted)).length;
  const totalMockups = allLeads.filter((l) => Boolean(l.hasMockup)).length;

  const urgentLeads = allLeads.filter(
    (l) => !l.isCompleted && Boolean(l.scheduledDate) && l.scheduledDate! <= todayStr
  );

  const handleExportAllChannels = () => {
    exportChannelData('email', 'csv', emailLeads);
    setTimeout(() => exportChannelData('instagram', 'csv', instagramLeads), 300);
    setTimeout(() => exportChannelData('facebook', 'csv', facebookLeads), 600);
  };

  const channelStats: {
    channel: MultiChannelType;
    label: string;
    icon: React.ReactNode;
    color: string;
    border: string;
    gradient: string;
    leads: ChannelLead[];
  }[] = [
    {
      channel: 'email',
      label: 'Email Outreach',
      icon: <Mail className="w-5 h-5 text-indigo-400" />,
      color: 'text-indigo-400',
      border: 'border-indigo-500/30',
      gradient: 'from-indigo-950/40 via-slate-900/90 to-slate-900/90',
      leads: emailLeads,
    },
    {
      channel: 'instagram',
      label: 'Instagram DMs',
      icon: <Instagram className="w-5 h-5 text-pink-400" />,
      color: 'text-pink-400',
      border: 'border-pink-500/30',
      gradient: 'from-pink-950/40 via-slate-900/90 to-slate-900/90',
      leads: instagramLeads,
    },
    {
      channel: 'facebook',
      label: 'Facebook Messages',
      icon: <Facebook className="w-5 h-5 text-sky-400" />,
      color: 'text-sky-400',
      border: 'border-sky-500/30',
      gradient: 'from-sky-950/40 via-slate-900/90 to-slate-900/90',
      leads: facebookLeads,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Deck Banner */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
              Executive Outreach Deck
            </h1>
            <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-0.5 text-xs font-bold text-indigo-300 font-mono">
              3 Active Pipelines
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Real-time aggregate intelligence across Email, Instagram, and Facebook outreach channels.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportAllChannels}
          disabled={totalLeads === 0}
          className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer self-start md:self-auto"
        >
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Export All Channels (CSV)</span>
        </button>
      </div>

      {/* Executive Summary Cards: Video Value First Daily Quotas & Streaks (Requirement #1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. DMs Sent Today (X / 6 with Progress Bar) */}
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/30 via-slate-900/80 to-slate-900 p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-sky-400 uppercase tracking-wider">
            <span>DMs Sent Today</span>
            <Send className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
              {effectiveDmsSentToday}
            </span>
            <span className="text-sm font-bold text-slate-400 font-mono">/ 6</span>
            {effectiveDmsSentToday >= 6 && (
              <span className="ml-auto text-[10px] font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/30 font-mono">
                Hit!
              </span>
            )}
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${dmProgressPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {effectiveDmsSentToday >= 6
              ? '🎯 Daily quota complete'
              : `${6 - effectiveDmsSentToday} more to hit daily goal`}
          </div>
        </div>

        {/* 2. Reels Posted Today (X / 2 with Progress Bar) */}
        <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-950/30 via-slate-900/80 to-slate-900 p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-pink-400 uppercase tracking-wider">
            <span>Reels Posted Today</span>
            <Film className="w-4 h-4 text-pink-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
              {reelsPostedTodayCount}
            </span>
            <span className="text-sm font-bold text-slate-400 font-mono">/ 2</span>
            {reelsPostedTodayCount >= 2 && (
              <span className="ml-auto text-[10px] font-bold text-pink-300 bg-pink-500/20 px-2 py-0.5 rounded border border-pink-500/30 font-mono">
                Hit!
              </span>
            )}
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
              style={{ width: `${reelProgressPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {reelsPostedTodayCount >= 2
              ? '🔥 Target achieved (2/2)'
              : `${2 - reelsPostedTodayCount} more to hit target`}
          </div>
        </div>

        {/* 3. Videos Pending Reel (videoRecorded: true && !reelPosted) */}
        <div className={`rounded-2xl border p-4 shadow-xl space-y-2 ${
          videosPendingReelCount > 0
            ? 'border-purple-500/40 bg-gradient-to-br from-purple-950/30 via-slate-900/80 to-slate-900'
            : 'border-white/10 bg-slate-900/70'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-purple-400 uppercase tracking-wider">
            <span>Videos Pending Reel</span>
            <Video className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-300 font-mono tabular-nums">
              {videosPendingReelCount}
            </span>
            <span className="text-xs text-purple-400/80 font-medium">in queue</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {videosPendingReelCount > 0
              ? 'Recorded & waiting to be posted'
              : 'All recorded videos are posted'}
          </div>
        </div>

        {/* 4. Current Streak (Keep Existing) */}
        <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-950/30 via-slate-900/80 to-slate-900 p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-orange-400 uppercase tracking-wider">
            <span>Current Streak</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
              {streakStats.currentStreak}
            </span>
            <span className="text-xs text-orange-300 font-medium">
              {streakStats.currentStreak === 1 ? 'Day Active' : 'Days Active'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Consecutive 100% days · Sundays rest
          </div>
        </div>

        {/* 5. Best Streak (Keep Existing) */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-slate-900 p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider">
            <span>Best Streak</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
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

      {/* Secondary Pipeline Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5">
          <span className="text-slate-500 block text-[10px] uppercase font-sans">Total Leads</span>
          <strong className="text-slate-200 text-sm">{totalLeads}</strong>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5">
          <span className="text-slate-500 block text-[10px] uppercase font-sans">Scheduled</span>
          <strong className="text-slate-200 text-sm">{totalScheduled}</strong>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5">
          <span className="text-slate-500 block text-[10px] uppercase font-sans">Urgent Dispatches</span>
          <strong className={`text-sm ${urgentLeads.length > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {urgentLeads.length}
          </strong>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5">
          <span className="text-slate-500 block text-[10px] uppercase font-sans">Mockups Ready</span>
          <strong className="text-slate-200 text-sm">{totalMockups}</strong>
        </div>
      </div>

      {/* 3 Channel Workspaces Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {channelStats.map((item) => {
          const leadsCount = item.leads.length;
          const pitchesCount = item.leads.filter((l) => !!l.customPitch).length;
          const scheduledCount = item.leads.filter((l) => !!l.scheduledDate).length;
          const mockupsCount = item.leads.filter((l) => !!l.hasMockup).length;
          const urgentCount = item.leads.filter(
            (l) => !l.isCompleted && Boolean(l.scheduledDate) && l.scheduledDate! <= todayStr
          ).length;

          return (
            <div
              key={item.channel}
              className={`rounded-2xl border ${item.border} bg-gradient-to-b ${item.gradient} p-5 backdrop-blur-sm shadow-xl flex flex-col justify-between space-y-4`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-white font-['Outfit'] text-base">
                        {item.label}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Prefix: {item.channel === 'email' ? 'EM' : item.channel === 'instagram' ? 'IG' : 'FB'}
                      </span>
                    </div>
                  </div>

                  {urgentCount > 0 && (
                    <span className="text-[10px] font-bold text-rose-300 bg-rose-600/30 px-2 py-0.5 rounded border border-rose-500/50 flex items-center gap-1 animate-pulse">
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                      <span>{urgentCount} Urgent</span>
                    </span>
                  )}
                </div>

                {/* Micro Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                    <span className="text-slate-500 block text-[10px] font-sans">Leads</span>
                    <strong className="text-slate-200 text-sm">{leadsCount}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                    <span className="text-slate-500 block text-[10px] font-sans">Pitches</span>
                    <strong className="text-slate-200 text-sm">{pitchesCount}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                    <span className="text-slate-500 block text-[10px] font-sans">Scheduled</span>
                    <strong className="text-slate-200 text-sm">{scheduledCount}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                    <span className="text-slate-500 block text-[10px] font-sans">Mockups</span>
                    <strong className="text-slate-200 text-sm">{mockupsCount}</strong>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => onNavigateToChannel(item.channel)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>Open {item.label.split(' ')[0]} Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Immediate Attention Queue */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white font-['Outfit']">
              Priority Follow-Up Queue (Across Channels)
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">
              {urgentLeads.length} Actionable Items
            </span>
            {onNavigateToToday && (
              <button
                type="button"
                onClick={onNavigateToToday}
                className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
              >
                <span>Today's Command Center &rarr;</span>
              </button>
            )}
          </div>
        </div>

        {urgentLeads.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-6 h-6 text-emerald-500/60 mx-auto mb-2" />
            <span>All follow-ups are up to date across all channels. Excellent dispatch discipline!</span>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto">
            {urgentLeads.map((lead) => {
              const isOverdue = lead.scheduledDate! < todayStr;
              return (
                <div
                  key={`${lead.channel}-${lead.id}`}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded border text-[11px] ${
                        lead.channel === 'email'
                          ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                          : lead.channel === 'instagram'
                          ? 'bg-pink-500/10 text-pink-300 border-pink-500/20'
                          : 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                      }`}
                    >
                      {lead.id}
                    </span>
                    <span className="font-semibold text-slate-200">{lead.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        isOverdue
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isOverdue ? 'Overdue' : 'Due Today'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 tabular-nums">
                      {lead.scheduledDate}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigateToChannel(lead.channel)}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] transition cursor-pointer"
                    >
                      Jump to {lead.channelName} &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
