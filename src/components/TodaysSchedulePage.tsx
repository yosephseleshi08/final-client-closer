import React, { useState } from 'react';
import {
  CalendarDays,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Eye,
  MessageSquare,
  Sparkles,
  Zap,
  Flame,
  CheckCheck,
  Mail,
  Instagram,
  Facebook,
  ArrowRight,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../types';
import {
  getTodayStr,
  isDateToday,
  isDateOverdue,
  getDayDifference,
  markInitialSent,
  markFollowupSent,
  markLeadReplied,
  toggleLeadSeen,
  getCadenceMessageTemplates,
} from '../utils/cadenceEngine';

interface TodaysSchedulePageProps {
  emailLeads: ChannelLead[];
  instagramLeads: ChannelLead[];
  facebookLeads: ChannelLead[];
  onUpdateEmailLeads: (leads: ChannelLead[]) => void;
  onUpdateInstagramLeads: (leads: ChannelLead[]) => void;
  onUpdateFacebookLeads: (leads: ChannelLead[]) => void;
  onNavigateToChannel: (channel: MultiChannelType) => void;
}

export const TodaysSchedulePage: React.FC<TodaysSchedulePageProps> = ({
  emailLeads,
  instagramLeads,
  facebookLeads,
  onUpdateEmailLeads,
  onUpdateInstagramLeads,
  onUpdateFacebookLeads,
  onNavigateToChannel,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'instagram' | 'facebook'>('all');

  const todayStr = getTodayStr();

  // Helper to update a lead in its respective channel store
  const handleUpdateLead = (updated: ChannelLead) => {
    switch (updated.channel) {
      case 'email':
        onUpdateEmailLeads(emailLeads.map((l) => (l.id === updated.id ? updated : l)));
        break;
      case 'instagram':
        onUpdateInstagramLeads(instagramLeads.map((l) => (l.id === updated.id ? updated : l)));
        break;
      case 'facebook':
        onUpdateFacebookLeads(facebookLeads.map((l) => (l.id === updated.id ? updated : l)));
        break;
    }
  };

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const allLeads: (ChannelLead & { channelLabel: string })[] = [
    ...emailLeads.map((l) => ({ ...l, channelLabel: 'Email' })),
    ...instagramLeads.map((l) => ({ ...l, channelLabel: 'Instagram' })),
    ...facebookLeads.map((l) => ({ ...l, channelLabel: 'Facebook' })),
  ];

  const filteredAllLeads = allLeads.filter((l) => {
    if (channelFilter === 'all') return true;
    return l.channel === channelFilter;
  });

  // 1. OVERDUE LEADS (Section 0 - Priority Alert Queue)
  // Leads that had initial send or follow-up scheduled before today and are not completed
  const overdueLeads = filteredAllLeads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;

    // Check if initial outreach is overdue
    if (!l.initialSentDate && l.scheduledDate && isDateOverdue(l.scheduledDate)) {
      return true;
    }

    // Check if follow-up 1 is overdue (count == 0, waiting_reply, and followup1Date < today)
    if (l.initialSentDate && l.followupCount === 0 && l.followup1Date && isDateOverdue(l.followup1Date)) {
      return true;
    }

    // Check if follow-up 2 is overdue (count == 1, waiting_reply, and followup2Date < today)
    if (l.initialSentDate && l.followupCount === 1 && l.followup2Date && isDateOverdue(l.followup2Date)) {
      return true;
    }

    return false;
  });

  // 2. NEW OUTREACH DUE TODAY (Section 1)
  // Leads whose initial outreach is scheduled strictly for today
  const newOutreachDueToday = filteredAllLeads.filter((l) => {
    if (l.isCompleted || l.initialSentDate) return false;
    return isDateToday(l.scheduledDate);
  });

  // 3. FOLLOW-UPS DUE TODAY (Section 2)
  // Leads reaching exact 3-Day or 7-Day mark today
  const followupsDueToday = filteredAllLeads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
    if (!l.initialSentDate) return false;

    // Day 3 check
    if (l.followupCount === 0 && isDateToday(l.followup1Date)) {
      return true;
    }

    // Day 7 check
    if (l.followupCount === 1 && isDateToday(l.followup2Date)) {
      return true;
    }

    return false;
  });

  const totalActionableToday = overdueLeads.length + newOutreachDueToday.length + followupsDueToday.length;

  const renderChannelBadge = (channel: MultiChannelType) => {
    switch (channel) {
      case 'email':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Mail className="w-3 h-3 text-indigo-400" />
            <span>Email</span>
          </span>
        );
      case 'instagram':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-pink-500/10 text-pink-300 border border-pink-500/20">
            <Instagram className="w-3 h-3 text-pink-400" />
            <span>Instagram</span>
          </span>
        );
      case 'facebook':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-sky-500/10 text-sky-300 border border-sky-500/20">
            <Facebook className="w-3 h-3 text-sky-400" />
            <span>Facebook</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Deck */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-900/90 p-5 sm:p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-lg shadow-amber-950/40">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                Today's Execution Schedule
              </h1>
              <p className="text-xs text-slate-400">
                Unified daily command center. Aggregates all leads due today across Email, Instagram, and Facebook.
              </p>
            </div>
          </div>
        </div>

        {/* Channel Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 border border-white/10 rounded-xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => setChannelFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              channelFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Channels
          </button>
          <button
            type="button"
            onClick={() => setChannelFilter('email')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              channelFilter === 'email'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3 h-3" />
            <span>Email</span>
          </button>
          <button
            type="button"
            onClick={() => setChannelFilter('instagram')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              channelFilter === 'instagram'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Instagram className="w-3 h-3" />
            <span>Insta</span>
          </button>
          <button
            type="button"
            onClick={() => setChannelFilter('facebook')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              channelFilter === 'facebook'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Facebook className="w-3 h-3" />
            <span>FB</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Daily Tasks</span>
            <CalendarDays className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-100 font-mono tabular-nums">
            {totalActionableToday}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Across selected channels
          </div>
        </div>

        <div className={`rounded-2xl border p-4 shadow-xl ${
          overdueLeads.length > 0 ? 'border-rose-500/40 bg-rose-950/20' : 'border-white/10 bg-slate-900/70'
        }`}>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Overdue Priority</span>
            <AlertCircle className={`w-4 h-4 ${overdueLeads.length > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`mt-2 text-2xl sm:text-3xl font-black font-mono tabular-nums ${
            overdueLeads.length > 0 ? 'text-rose-400' : 'text-slate-100'
          }`}>
            {overdueLeads.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Pending past scheduled date
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>New Outreach Due</span>
            <Send className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-indigo-400 font-mono tabular-nums">
            {newOutreachDueToday.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Initial DMs scheduled today
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Follow-Ups Due</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-400 font-mono tabular-nums">
            {followupsDueToday.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            3-Day &amp; 7-Day touchpoints
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 0: OVERDUE PRIORITY QUEUE (Confirmed in Clarification Q1)         */}
      {/* ========================================================================= */}
      {overdueLeads.length > 0 && (
        <div className="rounded-3xl border-2 border-rose-500/50 bg-rose-950/25 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white font-['Outfit'] flex items-center gap-2">
                  <span>Priority Alert: Overdue Outreach &amp; Follow-Ups</span>
                  <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                    {overdueLeads.length} Urgent
                  </span>
                </h2>
                <p className="text-xs text-rose-200/80 mt-0.5">
                  These prospects missed their planned outreach or follow-up date. Clear them first to restore cadence.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {overdueLeads.map((lead) => {
              const templates = getCadenceMessageTemplates(lead);
              const isInitial = !lead.initialSentDate;
              const isDay3 = lead.initialSentDate && lead.followupCount === 0;
              const overdueDate = isInitial
                ? lead.scheduledDate!
                : isDay3
                ? lead.followup1Date!
                : lead.followup2Date!;
              const diffDays = Math.abs(getDayDifference(overdueDate));
              const pitchText = isInitial
                ? templates.initialPitch
                : isDay3
                ? templates.day3Bump
                : templates.day7Loom;

              return (
                <div
                  key={`${lead.channel}-${lead.id}`}
                  className="rounded-2xl border border-rose-500/40 bg-slate-950/90 p-4 space-y-3 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {renderChannelBadge(lead.channel)}
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {lead.id}
                      </span>
                      <h3 className="font-bold text-white text-sm sm:text-base font-['Outfit']">
                        {lead.name}
                      </h3>
                      {lead.isSeen && (
                        <span className="text-xs font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                          <span>👀 Seen</span>
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40 font-mono">
                        Overdue by {diffDays} {diffDays === 1 ? 'day' : 'days'}
                      </span>
                    </div>

                    <a
                      href={lead.link.startsWith('http') ? lead.link : `https://${lead.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white transition px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 self-start sm:self-auto"
                    >
                      <span className="truncate max-w-xs">{lead.link}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  {/* Pre-staged Copy with 1-click Copy */}
                  <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-rose-300">
                      <span>
                        {isInitial
                          ? 'Initial DM Pitch Copy'
                          : isDay3
                          ? 'Follow-Up #1 (Day 3 Bump Copy)'
                          : 'Follow-Up #2 (Day 7 Video Copy)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`${lead.id}-overdue`, pitchText)}
                        className="flex items-center gap-1 text-xs text-rose-300 hover:text-white transition cursor-pointer"
                      >
                        {copiedKey === `${lead.id}-overdue` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Message</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 italic select-all font-sans leading-relaxed">
                      "{pitchText}"
                    </p>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Target was: {overdueDate}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleUpdateLead(toggleLeadSeen(lead))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          lead.isSeen
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                        }`}
                        title="Toggle Seen status (retains cadence timers)"
                      >
                        <span>👀 Seen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateLead(markLeadReplied(lead))}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Replied!</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isInitial) {
                            handleUpdateLead(markInitialSent(lead));
                          } else if (isDay3) {
                            handleUpdateLead(markFollowupSent(lead, 1));
                          } else {
                            handleUpdateLead(markFollowupSent(lead, 2));
                          }
                        }}
                        className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {isInitial ? 'Mark Initial Sent' : isDay3 ? 'Mark FU 1 Sent' : 'Mark FU 2 Sent'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: NEW OUTREACH DUE TODAY                                         */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Send className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-['Outfit'] flex items-center gap-2">
                <span>New Outreach Due Today</span>
                <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                  {newOutreachDueToday.length} Prospects
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Initial DMs scheduled for today. Marking sent automatically activates the 3-day and 7-day follow-up timers.
              </p>
            </div>
          </div>
        </div>

        {newOutreachDueToday.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-indigo-400/50 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">All new outreaches for today are cleared!</p>
            <p className="text-xs text-slate-500 mt-1">
              Add leads in any channel workspace or assign dates in the Schedule tab.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {newOutreachDueToday.map((lead) => {
              const templates = getCadenceMessageTemplates(lead);
              const pitchText = templates.initialPitch;

              return (
                <div
                  key={`${lead.channel}-${lead.id}`}
                  className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 space-y-3 hover:border-indigo-500/30 transition shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {renderChannelBadge(lead.channel)}
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {lead.id}
                      </span>
                      <h3 className="font-bold text-white text-sm sm:text-base font-['Outfit']">
                        {lead.name}
                      </h3>
                      {lead.isSeen && (
                        <span className="text-xs font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                          <span>👀 Seen</span>
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        Initial Outreach
                      </span>
                    </div>

                    <a
                      href={lead.link.startsWith('http') ? lead.link : `https://${lead.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white transition px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 self-start sm:self-auto"
                    >
                      <span className="truncate max-w-xs">{lead.link}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  {/* Pre-staged Pitch Copy Box */}
                  <div className="rounded-xl border border-indigo-500/20 bg-slate-900/90 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300">
                      <span>Initial Outreach Copy</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`${lead.id}-initial`, pitchText)}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-white transition cursor-pointer"
                      >
                        {copiedKey === `${lead.id}-initial` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Pitch</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 italic select-all font-sans leading-relaxed">
                      "{pitchText}"
                    </p>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Cadence on send: Day +3 &amp; Day +7 auto-scheduled
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleUpdateLead(toggleLeadSeen(lead))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          lead.isSeen
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                        }`}
                        title="Toggle Seen status"
                      >
                        <span>👀 Seen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateLead(markLeadReplied(lead))}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Replied!</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateLead(markInitialSent(lead))}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Mark as Sent</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: FOLLOW-UPS DUE TODAY (Day 3 & Day 7 Cadence)                    */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-['Outfit'] flex items-center gap-2">
                <span>Follow-Ups Due Today</span>
                <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  {followupsDueToday.length} Pending
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Proactive touchpoints reaching exact 3-Day (quick check) or 7-Day (final Loom offer) mark today.
              </p>
            </div>
          </div>
        </div>

        {followupsDueToday.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-400/50 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No follow-ups due today!</p>
            <p className="text-xs text-slate-500 mt-1">
              Any prospects that reach their 3rd or 7th day will automatically populate here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {followupsDueToday.map((lead) => {
              const isDay3 = lead.followupCount === 0;
              const templates = getCadenceMessageTemplates(lead);
              const followText = isDay3 ? templates.day3Bump : templates.day7Loom;

              return (
                <div
                  key={`${lead.channel}-${lead.id}`}
                  className={`rounded-2xl border p-4 space-y-3 shadow-lg transition ${
                    isDay3
                      ? 'border-amber-500/30 bg-slate-950/80 hover:border-amber-500/50'
                      : 'border-rose-500/30 bg-slate-950/80 hover:border-rose-500/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {renderChannelBadge(lead.channel)}
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {lead.id}
                      </span>
                      <h3 className="font-bold text-white text-sm sm:text-base font-['Outfit']">
                        {lead.name}
                      </h3>
                      {lead.isSeen && (
                        <span className="text-xs font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                          <span>👀 Seen</span>
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${
                          isDay3
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {isDay3 ? '⚡ Follow-Up #1 (Day +3)' : '🔥 Follow-Up #2 (Day +7 - Final)'}
                      </span>
                    </div>

                    <a
                      href={lead.link.startsWith('http') ? lead.link : `https://${lead.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white transition px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 self-start sm:self-auto"
                    >
                      <span className="truncate max-w-xs">{lead.link}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  {/* Pre-staged Follow-Up Copy Box */}
                  <div
                    className={`rounded-xl border p-2.5 space-y-1.5 ${
                      isDay3
                        ? 'border-amber-500/20 bg-amber-950/20'
                        : 'border-rose-500/20 bg-rose-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className={isDay3 ? 'text-amber-300' : 'text-rose-300'}>
                        {isDay3 ? 'Day 3 Bump Copy' : 'Day 7 Final Video Touch'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`${lead.id}-fu`, followText)}
                        className="flex items-center gap-1 text-xs text-slate-300 hover:text-white transition cursor-pointer"
                      >
                        {copiedKey === `${lead.id}-fu` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Message</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 italic select-all font-sans leading-relaxed">
                      "{followText}"
                    </p>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Initial sent on: {lead.initialSentDate}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleUpdateLead(toggleLeadSeen(lead))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          lead.isSeen
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                        }`}
                        title="Toggle Seen status"
                      >
                        <span>👀 Seen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateLead(markLeadReplied(lead))}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Replied!</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateLead(markFollowupSent(lead, isDay3 ? 1 : 2))}
                        className={`px-4 py-1.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer ${
                          isDay3
                            ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                            : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isDay3 ? 'Mark FU 1 Sent (Day 3)' : 'Mark FU 2 Sent (Day 7)'}</span>
                      </button>
                    </div>
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
