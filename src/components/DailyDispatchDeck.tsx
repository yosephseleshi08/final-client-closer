import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  CheckCircle2,
  Copy,
  ExternalLink,
  Send,
  Calendar,
  Clock,
  Sparkles,
  Zap,
  Target,
  Trophy,
  Filter,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Sliders,
  DollarSign,
  Image as ImageIcon,
  X,
  Clipboard
} from 'lucide-react';
import { Lead, FollowupLog, Weekday } from '../types';
import { calculateNextFollowupDate } from '../data/initialLeads';
import { recordDailyOutreachAction, getDisciplineTargets } from '../utils/disciplineTracker';
import { playSuccessChime, playGoalAccomplishedFanfare } from '../utils/soundEffects';
import { getActiveMessageForTouchpoint } from '../utils/stagedMessageHelper';
import { getCurrentWeekKey, normalizeLeadWeek, formatWeekLabel } from '../utils/weeklyScheduler';
import { LeadMessageVaultModal } from './LeadMessageVaultModal';
import { MockupVault } from './MockupVault';
import { copyBase64ImageToClipboard } from '../utils/imageCompressor';
import { getPermissionPitchText } from '../utils/permissionScripts';
import { Edit3, FileText } from 'lucide-react';
import { sortLeadsDeterministically } from '../utils/leadSortHelper';

interface DailyDispatchDeckProps {
  leads: Lead[];
  followupLogs: FollowupLog[];
  todayWeekday: Weekday;
  onUpdateLead: (updated: Lead) => void;
  onAddFollowupLog: (log: FollowupLog) => void;
  onSelectLeadForCopilot?: (lead: Lead) => void;
  onOpenDetailsModal?: (lead: Lead) => void;
  showToast: (msg: string, undo?: () => void) => void;
}

export const DailyDispatchDeck: React.FC<DailyDispatchDeckProps> = ({
  leads,
  followupLogs,
  todayWeekday,
  onUpdateLead,
  onAddFollowupLog,
  onSelectLeadForCopilot,
  onOpenDetailsModal,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'followups' | 'dms'>('followups');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [vaultModalLead, setVaultModalLead] = useState<Lead | null>(null);
  const [mockupModalLead, setMockupModalLead] = useState<Lead | null>(null);
  const [copiedImageSlotForLead, setCopiedImageSlotForLead] = useState<{ leadId: number; slot: 1 | 2 } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentWeekKey = getCurrentWeekKey();
  const targets = getDisciplineTargets();

  // 1. Follow-ups due today or overdue
  const dueFollowups = leads.filter((l) => {
    if (['replied', 'closed_won', 'closed_dead'].includes(l.status)) return false;
    if (!l.nextFollowupDate) return false;
    return l.nextFollowupDate <= todayStr;
  });

  // 2. Today's scheduled DMs for this weekday in the CURRENT WEEK (isolated from past/next weeks)
  const todayDms = leads.filter((l) => {
    if (['closed_won', 'closed_dead'].includes(l.status)) return false;
    if (l.scheduledDay !== todayWeekday) return false;
    return normalizeLeadWeek(l) === currentWeekKey;
  });

  // Filtered lists (deterministically sorted with Action-Needed priority first)
  const filteredFollowups = sortLeadsDeterministically(
    dueFollowups.filter((l) => {
      if (channelFilter === 'all') return true;
      if (channelFilter === 'instagram') return l.platform === 'Instagram';
      if (channelFilter === 'facebook') return l.platform === 'Facebook';
      if (channelFilter === 'email') return l.platform === 'Email' || l.platform === 'Website';
      return true;
    }),
    'status_then_day'
  );

  const filteredDms = sortLeadsDeterministically(
    todayDms.filter((l) => {
      if (channelFilter === 'all') return true;
      if (channelFilter === 'instagram') return l.platform === 'Instagram';
      if (channelFilter === 'facebook') return l.platform === 'Facebook';
      if (channelFilter === 'email') return l.platform === 'Email' || l.platform === 'Website';
      return true;
    }),
    'status_then_day'
  );

  // Today's discipline progress for this week's active batch
  const sentTodayCount = todayDms.filter((l) => l.lastContactDate === todayStr || l.status !== 'not_sent').length;
  const followupsCompletedToday = followupLogs.filter((log) => log.logDate === todayStr && log.actionType === 'followup_sent').length;

  const dmProgressPct = Math.min(Math.round((sentTodayCount / targets.dailyDms) * 100), 100);
  const fuProgressPct = Math.min(Math.round((followupsCompletedToday / targets.dailyFollowups) * 100), 100);

  // Copy helper
  const handleCopyMessage = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied pitch text to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyMockupImage = async (lead: Lead, slot: 1 | 2) => {
    const src = slot === 1 ? lead.mockupImage1 : lead.mockupImage2;
    if (!src) return;
    const ok = await copyBase64ImageToClipboard(src);
    if (ok) {
      setCopiedImageSlotForLead({ leadId: lead.id, slot });
      showToast(`Copied Mockup Slot ${slot} to clipboard! Paste it directly into your DM.`);
      setTimeout(() => setCopiedImageSlotForLead(null), 2500);
    } else {
      showToast(`Browser blocked clipboard image write. Opening mockup vault.`);
      setMockupModalLead(lead);
    }
  };

  // Helper to open platform direct chat
  const handleOpenDirectChat = (lead: Lead) => {
    let targetUrl = '';
    const cleanHandle = (lead.handle || '').replace(/^@/, '').trim();

    if (lead.platform === 'Instagram') {
      targetUrl = `https://instagram.com/${cleanHandle}/`;
    } else if (lead.platform === 'Facebook') {
      const fbSlug = cleanHandle.replace(/^(fb\.com\/|facebook\.com\/)/, '');
      targetUrl = lead.profileUrl || `https://m.me/${fbSlug}`;
    } else if (lead.platform === 'Email' || lead.platform === 'Website') {
      const email = lead.email || (lead.handle.includes('@') ? lead.handle : '');
      const subject = encodeURIComponent(`Question regarding ${lead.restaurantName}`);
      const body = encodeURIComponent(lead.pitchHook || `Hi ${lead.restaurantName} team, I created an interactive concept for you.`);
      targetUrl = `mailto:${email}?subject=${subject}&body=${body}`;
    } else {
      targetUrl = lead.profileUrl || `https://google.com/search?q=${encodeURIComponent(lead.restaurantName)}`;
    }

    if (targetUrl) {
      try {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } catch (_e) {
        const a = document.createElement('a');
        a.href = targetUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  // Action: Mark Follow-Up Sent (+ Auto Schedule Next Touchpoint)
  const handleMarkFollowupSent = (lead: Lead) => {
    const prevLead = { ...lead };
    const nextCount = (lead.followupCount || 0) + 1;
    const nextDate = calculateNextFollowupDate(todayStr, nextCount);

    const updatedLead: Lead = {
      ...lead,
      lastContactDate: todayStr,
      nextFollowupDate: nextDate,
      followupCount: nextCount,
      status: 'sent',
    };

    onUpdateLead(updatedLead);

    // Add log
    const newLog: FollowupLog = {
      id: `log-${Date.now()}`,
      leadId: lead.id,
      logDate: todayStr,
      actionType: 'followup_sent',
      note: `Follow-up #${nextCount} sent via ${lead.platform}. Next due: ${nextDate || 'Sequence Complete'}`,
    };
    onAddFollowupLog(newLog);

    // Track discipline
    const { goalJustCompleted } = recordDailyOutreachAction('followup', 1);

    // Audio & Visual rewards
    playSuccessChime();
    if (goalJustCompleted) {
      playGoalAccomplishedFanfare();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      showToast(`🎯 DAILY FOLLOW-UP GOAL REACHED (${targets.dailyFollowups}/${targets.dailyFollowups})!`);
    } else {
      showToast(
        `✅ Follow-up #${nextCount} logged for ${lead.restaurantName}! Next due in ${nextDate ? 'auto-scheduled' : 'sequence finished'}.`,
        () => onUpdateLead(prevLead)
      );
    }
  };

  // Action: Mark DM Sent (Initial Outreach -> Auto Schedule Follow-up #1 in 3 days)
  const handleMarkDmSent = (lead: Lead) => {
    const prevLead = { ...lead };
    const nextDate = calculateNextFollowupDate(todayStr, 0); // Day +3

    const updatedLead: Lead = {
      ...lead,
      lastContactDate: todayStr,
      dateFirstContact: lead.dateFirstContact || todayStr,
      nextFollowupDate: nextDate,
      followupCount: 0,
      status: 'sent',
    };

    onUpdateLead(updatedLead);

    const newLog: FollowupLog = {
      id: `log-${Date.now()}`,
      leadId: lead.id,
      logDate: todayStr,
      actionType: 'first_contact',
      note: `Initial DM sent via ${lead.platform}. Auto-scheduled Follow-Up #1 for ${nextDate}`,
    };
    onAddFollowupLog(newLog);

    // Track discipline
    const { goalJustCompleted } = recordDailyOutreachAction('dm', 1);

    playSuccessChime();
    if (goalJustCompleted) {
      playGoalAccomplishedFanfare();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
      showToast(`🔥 DAILY DM GOAL ACHIEVED (${targets.dailyDms}/${targets.dailyDms})! Streak alive!`);
    } else {
      showToast(
        `🚀 DM sent to ${lead.restaurantName}! Follow-up #1 automatically scheduled for ${nextDate}.`,
        () => onUpdateLead(prevLead)
      );
    }
  };

  // Generate customized follow-up message if not present
  const getFollowupText = (lead: Lead) => {
    const count = lead.followupCount || 0;
    const name = lead.contactName && lead.contactName !== 'Owner' ? lead.contactName : lead.restaurantName;
    const mockup = lead.mockupLink || `https://demo.closer.app/${lead.restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    if (count === 0) {
      return `Hey ${name}! Just making sure this didn't get buried - put together that 0.3s direct ordering concept for you: ${mockup}. We waive our normal $299 fee to $0 for 3 local spots. Want me to turn it live for this weekend?`;
    }
    if (count === 1) {
      return `Hey ${name}! Recorded a 45-second video showing how ${lead.restaurantName} could capture 15-20 more dinner orders directly instead of losing 30% to DoorDash. Mind if I drop the link here?`;
    }
    if (count === 2) {
      return `Hey ${name}! One quick thing: I noticed your mobile link freezes on iPhone Safari when viewing the menu. We already fixed it in this demo: ${mockup}. Happy to give you the code zero strings attached.`;
    }
    return `Hey ${name}, figured you're either completely slammed or all set for ${lead.restaurantName}. I'll close out this file so I don't bug you! If you ever want the direct ordering demo, it's here: ${mockup}. Wishing you a big week!`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Daily Discipline & Pacing Monitor */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-5 sm:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Flame className="h-4 w-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] tracking-tight">
                TODAY'S BATTLE PLAN <span className="bg-gradient-to-r from-rose-400 to-indigo-400 bg-clip-text text-transparent">& DISPATCH DECK</span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Execution dashboard for <strong className="text-white">{todayWeekday}, {todayStr}</strong>. Zero guesswork: copy, send, and auto-schedule next touches.
            </p>
          </div>

          {/* Live Progress Gauges */}
          <div className="flex flex-wrap items-center gap-3">
            {/* DM Gauge */}
            <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 min-w-[140px]">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="flex items-center gap-1 font-semibold text-indigo-300">
                  <Send className="h-3 w-3" /> New DMs
                </span>
                <span className="font-mono text-white font-bold">{sentTodayCount}/{targets.dailyDms}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${dmProgressPct}%` }}
                />
              </div>
            </div>

            {/* Follow-up Gauge */}
            <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 min-w-[140px]">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="flex items-center gap-1 font-semibold text-rose-300">
                  <Clock className="h-3 w-3" /> Follow-Ups
                </span>
                <span className="font-mono text-white font-bold">{followupsCompletedToday}/{targets.dailyFollowups}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-500 to-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${fuProgressPct}%` }}
                />
              </div>
            </div>

            {/* Projected Revenue Value */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-300">Offer Value</div>
                <div className="text-sm font-black text-white">$299 + $99/mo</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Channel Filter */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('followups')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeSubTab === 'followups'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Follow-ups Due Today</span>
              <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                activeSubTab === 'followups' ? 'bg-black/30 text-white' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {dueFollowups.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('dms')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeSubTab === 'dms'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Send className="h-4 w-4" />
              <span>Today's {todayWeekday} DMs</span>
              <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                activeSubTab === 'dms' ? 'bg-black/30 text-white' : 'bg-indigo-500/20 text-indigo-300'
              }`}>
                {todayDms.length}
              </span>
            </button>
          </div>

          {/* Channel Filters */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filter:
            </span>
            {['all', 'instagram', 'facebook', 'email'].map((f) => (
              <button
                key={f}
                onClick={() => setChannelFilter(f)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition cursor-pointer ${
                  channelFilter === f
                    ? 'bg-white/20 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Cards Deck */}
      {activeSubTab === 'followups' ? (
        <div>
          {filteredFollowups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/50 p-12 text-center text-slate-400">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-3 opacity-90" />
              <h3 className="text-base font-bold text-white font-['Outfit']">Zero Pending Follow-ups Due!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                You're 100% caught up on all follow-up touchpoints for today. Head over to <strong>"Today's {todayWeekday} DMs"</strong> to send your 10 new daily pitches!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFollowups.map((lead) => {
                const isOverdue = lead.nextFollowupDate ? lead.nextFollowupDate < todayStr : false;
                const { text: followupText, isStoredCustom, touchpointLabel } = getActiveMessageForTouchpoint(lead, 'followup');
                const isCopied = copiedId === lead.id;

                return (
                  <div
                    key={lead.id}
                    className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm hover:border-rose-500/30 transition group"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white font-['Outfit'] group-hover:text-rose-300 transition">
                              {lead.restaurantName}
                            </h3>
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              isOverdue ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40 animate-pulse' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {isOverdue ? '⚠️ Overdue' : '🔥 Due Today'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {lead.platform} • <span className="text-slate-300 font-mono">{lead.handle}</span> • {lead.city}
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300 border border-white/5 shrink-0">
                          Touchpoint #{lead.followupCount + 1}
                        </span>
                      </div>

                      {/* Timeline Info */}
                      <div className="mb-3.5 flex items-center gap-3 text-[11px] text-slate-400 bg-white/5 rounded-xl px-3 py-1.5 border border-white/5">
                        <span>Last Contact: <strong className="text-slate-200">{lead.lastContactDate || 'Initial'}</strong></span>
                        <span>•</span>
                        <span>Prior Touches: <strong className="text-indigo-300">{lead.followupCount || 0}</strong></span>
                      </div>

                      {/* Pre-composed / Stored Follow-up Message */}
                      <div className="relative rounded-xl border border-white/10 bg-black/40 p-3 mb-4">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1.5">
                          <span className="flex items-center gap-1">
                            {isStoredCustom ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-black">
                                <FileText className="h-3 w-3" /> Stored in Vault ({touchpointLabel})
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> Pre-Staged Copy ({touchpointLabel})
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => setVaultModalLead(lead)}
                            className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-white transition cursor-pointer"
                            title="Edit and customize stored messages for this lead"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit Message Store</span>
                          </button>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans select-all">
                          {followupText}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyMessage(followupText, lead.id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                            isCopied
                              ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                              : 'border-white/10 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200'
                          }`}
                        >
                          {isCopied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
                        </button>

                        <button
                          onClick={() => handleOpenDirectChat(lead)}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25 px-3 py-2 text-xs font-bold text-indigo-300 transition cursor-pointer"
                          title="Open platform directly"
                        >
                          <span>Open {lead.platform}</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* 1-Click Send & Auto-Schedule Next */}
                      <button
                        onClick={() => handleMarkFollowupSent(lead)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-600/20 active:scale-98 transition cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Mark Sent (+ Auto-Schedule Next Follow-Up)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Tab B: Today's Scheduled Initial DMs (10/day batch) */
        <div>
          {filteredDms.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/50 p-12 text-center text-slate-400">
              <Calendar className="mx-auto h-12 w-12 text-indigo-400 mb-3 opacity-90" />
              <h3 className="text-base font-bold text-white font-['Outfit']">No leads assigned for {todayWeekday}</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Go to the <strong>Sunday Sourcing</strong> tab to paste or import leads and allocate them into your Monday-Sunday 10-lead daily batches!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDms.map((lead) => {
                const { text: pitchText, isStoredCustom } = getActiveMessageForTouchpoint(lead, 'dm');
                const isCopied = copiedId === lead.id;
                const alreadySent = lead.lastContactDate === todayStr || lead.status !== 'not_sent';

                return (
                  <div
                    key={lead.id}
                    className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xl backdrop-blur-sm transition group ${
                      alreadySent
                        ? 'border-emerald-500/20 bg-emerald-950/10'
                        : 'border-white/10 bg-slate-900/80 hover:border-indigo-500/30'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white font-['Outfit'] group-hover:text-indigo-300 transition">
                              {lead.restaurantName}
                            </h3>
                            {alreadySent ? (
                              <span className="rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                                ✅ Sent Today
                              </span>
                            ) : (
                              <span className="rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold">
                                Initial DM
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {lead.platform} • <span className="text-slate-300 font-mono">{lead.handle}</span> • {lead.city}
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-indigo-300 border border-white/5 shrink-0">
                          {lead.scheduledDay}
                        </span>
                      </div>

                      {/* Mockup Screenshots (2 slots) & Live Link Strip */}
                      <div className="mb-3 rounded-xl bg-slate-950/80 p-2.5 border border-purple-500/30 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-purple-300 flex items-center gap-1.5">
                            <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
                            <span>Mockup Screenshots ({Number(!!lead.mockupImage1) + Number(!!lead.mockupImage2)}/2)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setMockupModalLead(lead)}
                            className="text-[10px] font-bold text-purple-400 hover:text-purple-300 underline cursor-pointer"
                          >
                            {lead.mockupImage1 || lead.mockupImage2 ? 'Manage / Pitch' : '+ Attach Screenshots'}
                          </button>
                        </div>

                        {(lead.mockupImage1 || lead.mockupImage2) ? (
                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            {lead.mockupImage1 && (
                              <button
                                type="button"
                                onClick={() => handleCopyMockupImage(lead, 1)}
                                className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/50 p-1.5 text-[11px] font-medium text-purple-200 transition cursor-pointer text-left"
                                title="Click to copy Slot 1 screenshot to clipboard"
                              >
                                <img src={lead.mockupImage1} alt="Mockup 1" className="w-7 h-7 object-cover rounded shrink-0" />
                                <div className="truncate flex-1">
                                  <span className="block text-[10px] text-slate-400">Slot 1 (Hero)</span>
                                  <span className="text-purple-300 font-bold text-[11px]">
                                    {copiedImageSlotForLead?.leadId === lead.id && copiedImageSlotForLead?.slot === 1 ? 'Copied!' : 'Copy Image'}
                                  </span>
                                </div>
                              </button>
                            )}

                            {lead.mockupImage2 && (
                              <button
                                type="button"
                                onClick={() => handleCopyMockupImage(lead, 2)}
                                className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/50 p-1.5 text-[11px] font-medium text-purple-200 transition cursor-pointer text-left"
                                title="Click to copy Slot 2 screenshot to clipboard"
                              >
                                <img src={lead.mockupImage2} alt="Mockup 2" className="w-7 h-7 object-cover rounded shrink-0" />
                                <div className="truncate flex-1">
                                  <span className="block text-[10px] text-slate-400">Slot 2 (Mobile)</span>
                                  <span className="text-purple-300 font-bold text-[11px]">
                                    {copiedImageSlotForLead?.leadId === lead.id && copiedImageSlotForLead?.slot === 2 ? 'Copied!' : 'Copy Image'}
                                  </span>
                                </div>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 p-1.5 rounded-lg border border-white/5">
                            <span>No screenshots attached yet</span>
                            <button
                              type="button"
                              onClick={() => setMockupModalLead(lead)}
                              className="text-[10px] font-bold text-indigo-400 hover:text-white cursor-pointer"
                            >
                              + Add 2 Screenshots
                            </button>
                          </div>
                        )}

                        {lead.mockupLink && (
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                            <span className="text-slate-400 truncate">Link: <span className="text-indigo-300 font-mono">{lead.mockupLink}</span></span>
                            <a
                              href={lead.mockupLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:text-white shrink-0 ml-1.5 inline-flex items-center gap-0.5"
                            >
                              <span>Demo</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Pre-composed DM Text */}
                      <div className="relative rounded-xl border border-white/10 bg-black/40 p-3 mb-4">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1.5">
                          <span className="flex items-center gap-1">
                            {isStoredCustom ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-black">
                                <FileText className="h-3 w-3" /> Stored Vault Pitch
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> Pre-Staged Case Study Pitch
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => setVaultModalLead(lead)}
                            className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-white transition cursor-pointer"
                            title="Edit and customize stored messages for this lead"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit Message Store</span>
                          </button>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans select-all">
                          {pitchText}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyMessage(pitchText, lead.id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                            isCopied
                              ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                              : 'border-white/10 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200'
                          }`}
                        >
                          {isCopied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{isCopied ? 'Copied Pitch' : 'Copy Pitch'}</span>
                        </button>

                        <button
                          onClick={() => handleOpenDirectChat(lead)}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25 px-3 py-2 text-xs font-bold text-indigo-300 transition cursor-pointer"
                        >
                          <span>Open {lead.platform}</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleMarkDmSent(lead)}
                        className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black transition cursor-pointer ${
                          alreadySent
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-lg shadow-indigo-600/25 active:scale-98'
                        }`}
                      >
                        <Send className="h-4 w-4" />
                        <span>{alreadySent ? 'Re-Log DM (Update Timestamp)' : 'Mark Sent (+ Auto-Schedule Follow-Up #1)'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lead Message Vault Modal */}
      <LeadMessageVaultModal
        lead={vaultModalLead}
        isOpen={!!vaultModalLead}
        onClose={() => setVaultModalLead(null)}
        onSaveLead={onUpdateLead}
        showToast={showToast}
      />

      {/* Dual Mockup Screenshots & Permission Vault Modal */}
      {mockupModalLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setMockupModalLead(null)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">
                  Mockup Screenshots &amp; Permission Pitch: {mockupModalLead.restaurantName}
                </h3>
                <p className="text-xs text-slate-400">
                  Store desktop &amp; mobile redesign screenshots. Copy image or script in 1-click to request permission.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMockupModalLead(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <MockupVault
              lead={mockupModalLead}
              onUpdateLead={(updates) => {
                const updated = { ...mockupModalLead, ...updates };
                setMockupModalLead(updated);
                onUpdateLead(updated);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
