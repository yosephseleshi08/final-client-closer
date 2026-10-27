import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  CheckCheck,
  Mail,
  Instagram,
  Facebook,
  X,
  RotateCcw,
  EyeOff,
  Target,
  Trophy,
  Sparkles,
  CalendarCheck2,
  StickyNote,
  Coffee,
  AlertTriangle,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../types';
import { QuickNoteModal } from './QuickNoteModal';
import { SundayPrepView } from './SundayPrepView';
import { recordTodayCompletion } from '../utils/historyStorage';
import {
  getLocalTodayStr,
  isDateToday,
  isDateOverdue,
  getDayDifference,
  addDays,
  isTodaySunday,
  markInitialSent,
  markFollowupSent,
  markLeadReplied,
  toggleLeadSeen,
  dismissLeadForToday,
  restoreDismissedLead,
  isLeadDismissedToday,
  isInitialSentToday,
  isDay3FollowupDue,
  isDay7FollowupDue,
  setDay3Reminder,
  revertInitialSent,
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
  const [showDismissedDrawer, setShowDismissedDrawer] = useState(false);
  const [reminderSavedId, setReminderSavedId] = useState<string | null>(null);
  const [noteModalLead, setNoteModalLead] = useState<ChannelLead | null>(null);

  const isActualSunday = isTodaySunday();
  // Toggle defaults to ON if it is actually Sunday, and OFF on other days
  const [forceSundayPreview, setForceSundayPreview] = useState<boolean>(() => isActualSunday);
  const [showQueuesOverride, setShowQueuesOverride] = useState<boolean>(false);

  const todayStr = getLocalTodayStr();
  const isSundayMode = (isActualSunday || forceSundayPreview) && !showQueuesOverride;

  const handleToggleSundayMode = () => {
    if (isSundayMode) {
      setForceSundayPreview(false);
      setShowQueuesOverride(true);
    } else {
      setForceSundayPreview(true);
      setShowQueuesOverride(false);
    }
  };

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

  const handleSetDay3Reminder = (lead: ChannelLead) => {
    const updated = setDay3Reminder(lead);
    handleUpdateLead(updated);
    setReminderSavedId(lead.id);
    setTimeout(() => setReminderSavedId(null), 2500);
  };

  const handleUndoSent = (lead: ChannelLead) => {
    const updated = revertInitialSent(lead);
    handleUpdateLead(updated);
  };

  const handleSaveQuickNote = (leadId: string, noteText: string) => {
    const targetLead = allLeads.find((l) => l.id === leadId);
    if (!targetLead) return;
    const updated: ChannelLead = {
      ...targetLead,
      quickNote: noteText || undefined,
      quickNoteSavedAt: noteText ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    };
    handleUpdateLead(updated);
  };

  const handleDeleteQuickNote = (leadId: string) => {
    const targetLead = allLeads.find((l) => l.id === leadId);
    if (!targetLead) return;
    const updated: ChannelLead = {
      ...targetLead,
      quickNote: undefined,
      quickNoteSavedAt: undefined,
    };
    handleUpdateLead(updated);
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

  // Dismissed leads (hidden from today's daily queue, but safely stored in database)
  const dismissedTodayLeads = filteredAllLeads.filter((l) => isLeadDismissedToday(l));

  // 1. OVERDUE LEADS (Section 0 - Priority Alert Queue)
  const overdueLeads = filteredAllLeads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
    if (isLeadDismissedToday(l)) return false;

    // Check if initial outreach is overdue
    if (!l.initialSentDate && l.scheduledDate && isDateOverdue(l.scheduledDate)) {
      return true;
    }

    // Check if follow-up 1 is overdue (strict time-lock: must be past followup1Date)
    if (l.initialSentDate && l.followupCount === 0 && l.followup1Date && isDateOverdue(l.followup1Date)) {
      return true;
    }

    // Check if follow-up 2 is overdue (strict time-lock: must be past followup2Date)
    if (l.initialSentDate && l.followupCount === 1 && l.followup2Date && isDateOverdue(l.followup2Date)) {
      return true;
    }

    return false;
  });

  // 2. NEW OUTREACH DUE TODAY (Section 1)
  // Leads whose scheduled date is today, not completed, and not yet sent
  const newOutreachDueToday = filteredAllLeads.filter((l) => {
    if (l.isCompleted || l.initialSentDate) return false;
    if (isLeadDismissedToday(l)) return false;
    return isDateToday(l.scheduledDate);
  });

  // 3. SENT TODAY LOG (Section - Sent Today Progress Tracker)
  // Leads whose initial outreach was dispatched today in the user's local timezone
  const sentTodayLeads = filteredAllLeads.filter((l) => isInitialSentToday(l, todayStr));

  // 4. FOLLOW-UPS DUE TODAY (Section 2 - Strict Time-Lock Enforced)
  const followupsDueToday = filteredAllLeads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
    if (isLeadDismissedToday(l)) return false;
    if (!l.initialSentDate) return false;

    // Day 3 check: strictly due today
    if (l.followupCount === 0 && isDateToday(l.followup1Date)) {
      return true;
    }

    // Day 7 check: strictly due today
    if (l.followupCount === 1 && isDateToday(l.followup2Date)) {
      return true;
    }

    return false;
  });

  const totalActionableToday = overdueLeads.length + newOutreachDueToday.length + followupsDueToday.length;

  // Daily Progress Math: sent today / total scheduled today (sent + remaining due)
  const sentTodayCount = sentTodayLeads.length;
  const newDueTodayCount = newOutreachDueToday.length;
  const dailyTargetTotal = sentTodayCount + newDueTodayCount;
  const progressPercent = dailyTargetTotal > 0
    ? Math.min(100, Math.round((sentTodayCount / dailyTargetTotal) * 100))
    : (sentTodayCount > 0 ? 100 : 0);
  const isGoalFinished = dailyTargetTotal > 0 && sentTodayCount >= dailyTargetTotal;

  // Automatically sync today's date and current completion percentage into persistent daily history
  useEffect(() => {
    recordTodayCompletion(sentTodayCount, newDueTodayCount);
  }, [sentTodayCount, newDueTodayCount]);

  const handleRestoreAllDismissed = () => {
    dismissedTodayLeads.forEach((lead) => {
      handleUpdateLead(restoreDismissedLead(lead));
    });
  };

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

  const renderQuickNoteBox = (lead: ChannelLead) => {
    if (!lead.quickNote) return null;
    return (
      <div
        onClick={() => setNoteModalLead(lead)}
        className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-amber-950/40 transition group shadow-sm"
        title="Click to edit quick note"
      >
        <div className="flex items-start gap-2.5 text-xs text-amber-200 font-sans">
          <StickyNote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium whitespace-pre-wrap leading-relaxed">{lead.quickNote}</p>
            {lead.quickNoteSavedAt && (
              <span className="text-[10px] text-amber-400/70 font-mono block">
                Note recorded at {lead.quickNoteSavedAt}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setNoteModalLead(lead);
          }}
          className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-semibold border border-amber-500/20 shrink-0 transition"
        >
          Edit Note
        </button>
      </div>
    );
  };

  const renderNoteButton = (lead: ChannelLead) => (
    <button
      type="button"
      onClick={() => setNoteModalLead(lead)}
      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
        lead.quickNote
          ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
          : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
      }`}
      title={lead.quickNote ? 'Edit existing note' : 'Add quick note (e.g. call appointment, owner context)'}
    >
      <StickyNote className="w-3.5 h-3.5 text-amber-400" />
      <span>{lead.quickNote ? 'Edit Note' : '📝 Add Note'}</span>
    </button>
  );

  if (isSundayMode) {
    return (
      <div className="space-y-6">
        {/* Top Banner Deck */}
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-900/90 p-5 sm:p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-lg shadow-emerald-950/40">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                    Today's Execution Schedule
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                    {isActualSunday ? `${todayStr} (Sunday Rest)` : `${todayStr} (Sunday Preview)`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rest day mode active. Daily outreach triggers are paused to protect energy. Lead research and prompt drafting are active.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleToggleSundayMode}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-md"
              title="Toggle Sunday Prep Mode"
            >
              <Coffee className="w-3.5 h-3.5 text-emerald-400" />
              <span>🌿 Sunday Mode: ON</span>
            </button>
          </div>
        </div>

        {/* Dedicated Sunday Prep View */}
        <SundayPrepView
          emailLeads={emailLeads}
          instagramLeads={instagramLeads}
          facebookLeads={facebookLeads}
          onNavigateToChannel={onNavigateToChannel}
          isPreviewMode={!isActualSunday && forceSundayPreview}
          onExitPreview={() => {
            setForceSundayPreview(false);
            setShowQueuesOverride(true);
          }}
          onShowQueuesAnyway={() => setShowQueuesOverride(true)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Persistent Sunday Override Active Banner */}
      {showQueuesOverride && (isActualSunday || forceSundayPreview) && (
        <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-950/70 p-4 sm:p-5 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                  ⚠️ Sunday Override Active
                </span>
                <span className="text-[11px] text-amber-400/80 font-mono">
                  (Showing standard daily queues)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Queues are safely displayed so you can handle urgent prospects. All records and cadences remain preserved.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowQueuesOverride(false)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 shrink-0 cursor-pointer active:scale-95"
          >
            <Coffee className="w-4 h-4" />
            <span>Return to Sunday Prep Mode</span>
          </button>
        </div>
      )}

      {/* Top Banner Deck */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-900/90 p-5 sm:p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-lg shadow-amber-950/40">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                  Today's Execution Schedule
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                  {todayStr} (Local Time)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Unified daily command center. Aggregates all leads due today in your local timezone across Email, Instagram, and Facebook.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Sunday Preview Simulation Toggle */}
          <button
            type="button"
            onClick={handleToggleSundayMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              isSundayMode
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-md'
                : 'bg-white/5 hover:bg-emerald-500/15 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-300 border-white/10'
            }`}
            title="Preview and test the Sunday Prep Mode experience anytime"
          >
            <Coffee className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isSundayMode ? '🌿 Sunday Mode: ON' : '🌿 Sunday Mode Preview'}</span>
          </button>

          {/* Channel Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 border border-white/10 rounded-xl">
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
      </div>

      {/* Daily Progress Finish Line Widget */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/95 to-slate-900/95 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/50">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Daily Execution Objective
                </span>
                {isGoalFinished && dailyTargetTotal > 0 && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Goal Finished!</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] flex items-center gap-2 mt-0.5">
                <span>Today's Progress:</span>
                <span className="font-mono text-emerald-400">
                  {sentTodayCount} / {dailyTargetTotal} DMs Sent
                </span>
                <span className="text-base font-mono text-slate-400 font-semibold">
                  ({progressPercent}%)
                </span>
              </h2>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono sm:text-right">
            {dailyTargetTotal === 0 ? (
              <span>No outreaches scheduled for {todayStr}</span>
            ) : isGoalFinished ? (
              <span className="text-emerald-300 font-bold flex items-center gap-1.5 sm:justify-end">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>You've hit your finish line for today! Great work.</span>
              </span>
            ) : (
              <span className="text-slate-300">
                <strong className="text-white font-bold">{newDueTodayCount}</strong> initial DM{newDueTodayCount === 1 ? '' : 's'} remaining today
              </span>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-3.5 bg-slate-950/80 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isGoalFinished && dailyTargetTotal > 0
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-lg shadow-emerald-500/60'
                : 'bg-gradient-to-r from-indigo-500 via-emerald-500 to-teal-400 shadow-md shadow-emerald-500/30'
            }`}
            style={{ width: `${dailyTargetTotal === 0 ? 0 : progressPercent}%` }}
          />
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Tasks</span>
            <CalendarDays className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-100 font-mono tabular-nums">
            {totalActionableToday}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Due in local timezone
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 shadow-xl">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Sent Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-400 font-mono tabular-nums">
            {sentTodayCount}
          </div>
          <div className="mt-1 text-[11px] text-emerald-300/80">
            {dailyTargetTotal > 0 ? `${progressPercent}% complete` : 'Outreaches done'}
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
            Pending past target
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
            Strict 3-Day &amp; 7-Day touchpoints
          </div>
        </div>
      </div>

      {/* Dismissed Notification Bar */}
      {dismissedTodayLeads.length > 0 && (
        <div className="p-3.5 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <EyeOff className="w-4 h-4 text-slate-500" />
            <span>
              <strong className="text-slate-200">{dismissedTodayLeads.length}</strong> lead{dismissedTodayLeads.length === 1 ? '' : 's'} removed from today's view (still safely stored in Leads tab).
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDismissedDrawer(!showDismissedDrawer)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              {showDismissedDrawer ? 'Hide List' : 'View Removed'}
            </button>
            <button
              type="button"
              onClick={handleRestoreAllDismissed}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore All</span>
            </button>
          </div>
        </div>
      )}

      {/* Dismissed Drawer (if open) */}
      {showDismissedDrawer && dismissedTodayLeads.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 space-y-2 animate-fade-in">
          <div className="text-xs font-bold text-slate-400 mb-2">
            Leads Removed for Today (Safe in Database):
          </div>
          <div className="divide-y divide-white/5">
            {dismissedTodayLeads.map((lead) => (
              <div key={lead.id} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {renderChannelBadge(lead.channel)}
                  <span className="font-mono font-bold text-indigo-400">{lead.id}</span>
                  <span className="text-slate-200 font-semibold">{lead.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateLead(restoreDismissedLead(lead))}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-indigo-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore to Queue</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: SENT TODAY LOG (Progress Tracker)                                */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-emerald-500/30 bg-slate-900/80 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-['Outfit'] flex items-center gap-2">
                <span>✅ Sent Today ({sentTodayLeads.length})</span>
                <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded border border-emerald-500/30">
                  {sentTodayLeads.length} Logged
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Initial outreach dispatches completed today ({todayStr}). Time-locks safeguard follow-up intervals.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            {sentTodayLeads.length > 0 && (
              <span className="text-emerald-400 font-semibold">
                Follow-ups automatically time-locked for +3 days
              </span>
            )}
          </div>
        </div>

        {sentTodayLeads.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            <Send className="w-7 h-7 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-slate-300">No DMs marked sent yet today</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              When you click "Mark Initial Sent" on a lead below, it moves here automatically so you can see your daily tally and reminder dates.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sentTodayLeads.map((lead) => {
              const day3Target = lead.followup1Date || addDays(lead.initialSentDate || todayStr, 3);
              const day7Target = lead.followup2Date || addDays(lead.initialSentDate || todayStr, 7);
              const isReminderSaved = reminderSavedId === lead.id;

              return (
                <div
                  key={`sent-${lead.channel}-${lead.id}`}
                  className="rounded-2xl border border-emerald-500/25 bg-slate-950/80 p-4 space-y-3 hover:border-emerald-500/40 transition shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {renderChannelBadge(lead.channel)}
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {lead.id}
                      </span>
                      <h3 className="font-bold text-white text-sm sm:text-base font-['Outfit']">
                        {lead.name}
                      </h3>
                      <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 font-mono">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Sent Today ({lead.initialSentDate})</span>
                      </span>
                      {lead.isSeen && (
                        <span className="text-xs font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                          👀 Seen
                        </span>
                      )}
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

                  {/* Amber Sticky Note Box Preview (if present) */}
                  {renderQuickNoteBox(lead)}

                  {/* Follow-up reminder & Action Bar */}
                  <div className="rounded-xl border border-emerald-500/15 bg-emerald-950/15 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-300 font-mono flex-wrap">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Day 3 Follow-Up: <strong className="text-white">{day3Target}</strong></span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400">Day 7: {day7Target}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Quick Note Action Button */}
                      {renderNoteButton(lead)}

                      {/* Set Day 3 Reminder Action Button */}
                      <button
                        type="button"
                        onClick={() => handleSetDay3Reminder(lead)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          isReminderSaved
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                        }`}
                        title="Auto-calculates +3 days and stores the exact follow-up date"
                      >
                        <CalendarCheck2 className="w-3.5 h-3.5" />
                        <span>{isReminderSaved ? '✓ Day 3 Reminder Saved!' : 'Set Day 3 Reminder'}</span>
                      </button>

                      {/* Undo Initial Sent in case of misclick */}
                      <button
                        type="button"
                        onClick={() => handleUndoSent(lead)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                        title="Revert back to un-sent status if clicked accidentally"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Undo</span>
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
      {/* SECTION 0: OVERDUE PRIORITY QUEUE                                         */}
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
                      <div className="flex items-center gap-1.5">
                        <span>
                          {isInitial
                            ? 'Message 1: Initial DM (Day 1)'
                            : isDay3
                            ? 'Message 2: 3-Day Follow-Up (Day 3)'
                            : 'Message 3: 7-Day Breakup (Day 7)'}
                        </span>
                        {(isInitial ? lead.initialDM : isDay3 ? lead.followup3DM : lead.followup7DM) ? (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            Custom Pitch
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.2 rounded">
                            Default Template
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`${lead.id}-overdue`, pitchText)}
                        className="flex items-center gap-1 text-xs text-rose-300 hover:text-white transition cursor-pointer font-semibold"
                      >
                        {copiedKey === `${lead.id}-overdue` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>
                              {isInitial
                                ? 'Copy Initial DM'
                                : isDay3
                                ? 'Copy 3-Day Follow-Up'
                                : 'Copy 7-Day Breakup'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 italic select-all font-sans leading-relaxed">
                      "{pitchText}"
                    </p>
                  </div>

                  {/* Amber Sticky Note Box Preview (if present) */}
                  {renderQuickNoteBox(lead)}

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Target was: {overdueDate}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Quick Note Action Button */}
                      {renderNoteButton(lead)}

                      {/* Non-Destructive Remove / Dismiss Button */}
                      <button
                        type="button"
                        onClick={() => handleUpdateLead(dismissLeadForToday(lead))}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                        title="Remove from today's queue (lead remains safely in your database)"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>

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
                Initial DMs scheduled for today ({todayStr}). Marking sent automatically activates the 3-day and 7-day follow-up timers.
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
                      <div className="flex items-center gap-1.5">
                        <span>Message 1: Initial DM (Day 1)</span>
                        {lead.initialDM ? (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            Custom Pitch
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.2 rounded">
                            Default Template
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`${lead.id}-initial`, pitchText)}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-white transition cursor-pointer font-semibold"
                      >
                        {copiedKey === `${lead.id}-initial` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Initial DM</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 italic select-all font-sans leading-relaxed">
                      "{pitchText}"
                    </p>
                  </div>

                  {/* Amber Sticky Note Box Preview (if present) */}
                  {renderQuickNoteBox(lead)}

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Cadence on send: Day +3 &amp; Day +7 auto-scheduled
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Quick Note Action Button */}
                      {renderNoteButton(lead)}

                      {/* Non-Destructive Remove / Dismiss Button */}
                      <button
                        type="button"
                        onClick={() => handleUpdateLead(dismissLeadForToday(lead))}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                        title="Remove from today's queue (lead remains safely in your database)"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>

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
                        <span>Mark Initial Sent</span>
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
                      <div className="flex items-center gap-1.5">
                        <span className={isDay3 ? 'text-amber-300' : 'text-rose-300'}>
                          {isDay3 ? 'Message 2: 3-Day Follow-Up (Day 3)' : 'Message 3: 7-Day Breakup (Day 7)'}
                        </span>
                        {(isDay3 ? lead.followup3DM : lead.followup7DM) ? (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            Custom Pitch
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.2 rounded">
                            Default Template
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`${lead.id}-fu`, followText)}
                        className={`flex items-center gap-1 text-xs transition cursor-pointer font-semibold ${
                          isDay3 ? 'text-amber-300 hover:text-white' : 'text-rose-300 hover:text-white'
                        }`}
                      >
                        {copiedKey === `${lead.id}-fu` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{isDay3 ? 'Copy 3-Day Follow-Up' : 'Copy 7-Day Breakup'}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 italic select-all font-sans leading-relaxed">
                      "{followText}"
                    </p>
                  </div>

                  {/* Amber Sticky Note Box Preview (if present) */}
                  {renderQuickNoteBox(lead)}

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Initial sent on: {lead.initialSentDate}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Quick Note Action Button */}
                      {renderNoteButton(lead)}

                      {/* Non-Destructive Remove / Dismiss Button */}
                      <button
                        type="button"
                        onClick={() => handleUpdateLead(dismissLeadForToday(lead))}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                        title="Remove from today's queue (lead remains safely in your database)"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>

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

      {/* Quick Note Modal */}
      <QuickNoteModal
        isOpen={Boolean(noteModalLead)}
        lead={noteModalLead}
        onClose={() => setNoteModalLead(null)}
        onSave={handleSaveQuickNote}
        onDelete={handleDeleteQuickNote}
      />
    </div>
  );
};
