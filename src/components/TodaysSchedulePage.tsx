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
  Snowflake,
  Play,
  Flame,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../types';
import { QuickNoteModal } from './QuickNoteModal';
import { SundayPrepView } from './SundayPrepView';
import { recordTodayCompletion } from '../utils/historyStorage';
import {
  getLocalTodayStr,
  normalizeToLocalDateStr,
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
  isDay7FollowupDue,
  isDay14FollowupDue,
  isDay30FollowupDue,
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
  isFrozen?: boolean;
  onToggleFreeze?: () => void;
}

export const TodaysSchedulePage: React.FC<TodaysSchedulePageProps> = ({
  emailLeads,
  instagramLeads,
  facebookLeads,
  onUpdateEmailLeads,
  onUpdateInstagramLeads,
  onUpdateFacebookLeads,
  onNavigateToChannel,
  isFrozen = false,
  onToggleFreeze,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'instagram' | 'facebook'>('all');
  const [showDismissedDrawer, setShowDismissedDrawer] = useState(false);
  const [reminderSavedId, setReminderSavedId] = useState<string | null>(null);
  const [noteModalLead, setNoteModalLead] = useState<ChannelLead | null>(null);
  const [showFrozenOverride, setShowFrozenOverride] = useState(false);

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

    // Check if follow-up 1 (Day 7) is overdue
    if (l.initialSentDate && l.followupCount === 0 && l.followup1Date && isDateOverdue(l.followup1Date)) {
      return true;
    }

    // Check if follow-up 2 (Day 14) is overdue
    if (l.initialSentDate && l.followupCount === 1 && l.followup2Date && isDateOverdue(l.followup2Date)) {
      return true;
    }

    // Check if follow-up 3 (Day 30) is overdue
    if (l.initialSentDate && l.followupCount === 2 && l.followup3Date && isDateOverdue(l.followup3Date)) {
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

  // 3. SENT TODAY LOG (Initial DMs dispatched today in the user's local timezone)
  const sentTodayLeads = filteredAllLeads.filter((l) => isInitialSentToday(l, todayStr));
  const initialSentTodayCount = sentTodayLeads.length;

  // 4. FOLLOW-UPS SENT TODAY (Day 7, Day 14, and Day 30 follow-up touches sent today)
  const day7SentTodayLeads = filteredAllLeads.filter(
    (l) => normalizeToLocalDateStr(l.followup1SentDate) === todayStr
  );
  const day14SentTodayLeads = filteredAllLeads.filter(
    (l) => normalizeToLocalDateStr(l.followup2SentDate) === todayStr
  );
  const day30SentTodayLeads = filteredAllLeads.filter(
    (l) => normalizeToLocalDateStr(l.followup3SentDate) === todayStr
  );
  const followupsSentTodayCount = day7SentTodayLeads.length + day14SentTodayLeads.length + day30SentTodayLeads.length;

  // Total tasks completed across all of today's schedule (Initial DM + Day 7 FU + Day 14 FU + Day 30 FU)
  const totalTasksCompletedToday = initialSentTodayCount + followupsSentTodayCount;

  // 5. FOLLOW-UPS DUE TODAY (Section 2 - Strict Time-Lock Enforced)
  const followupsDueToday = filteredAllLeads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
    if (isLeadDismissedToday(l)) return false;
    if (!l.initialSentDate) return false;

    // Day 7 check: due today
    if (l.followupCount === 0 && (isDateToday(l.followup1Date) || isDay7FollowupDue(l, todayStr))) {
      return true;
    }

    // Day 14 check: due today
    if (l.followupCount === 1 && (isDateToday(l.followup2Date) || isDay14FollowupDue(l, todayStr))) {
      return true;
    }

    // Day 30 check: due today
    if (l.followupCount === 2 && (isDateToday(l.followup3Date) || isDay30FollowupDue(l, todayStr))) {
      return true;
    }

    return false;
  });

  const totalActionableToday = overdueLeads.length + newOutreachDueToday.length + followupsDueToday.length;

  // Remaining tasks scheduled for today
  const newDueTodayCount = newOutreachDueToday.length;
  const followupsDueTodayCount = followupsDueToday.length;
  const totalTasksRemainingToday = newDueTodayCount + followupsDueTodayCount;

  // Total daily schedule objective: (Completed today + Remaining due today)
  const dailyTargetTotal = totalTasksCompletedToday + totalTasksRemainingToday;
  const progressPercent = dailyTargetTotal > 0
    ? Math.min(100, Math.round((totalTasksCompletedToday / dailyTargetTotal) * 100))
    : (totalTasksCompletedToday > 0 ? 100 : 100);
  const isGoalFinished = dailyTargetTotal > 0 && totalTasksCompletedToday >= dailyTargetTotal;

  // 6. 🔥 WARM UP FOR TOMORROW
  // Sunday Rule: No DMs on Sunday, no warm-ups on Sunday.
  // On Saturday, warm-ups are for Monday's leads (addDays(todayStr, 2)).
  // Mon-Fri: warm-ups are for tomorrow's leads (addDays(todayStr, 1)).
  const [schedY, schedM, schedD] = todayStr.split('-').map(Number);
  const schedTodayDate = new Date(schedY, schedM - 1, schedD);
  const schedDayOfWeek = schedTodayDate.getDay();
  const isSchedSaturday = schedDayOfWeek === 6;
  const isSchedSunday = schedDayOfWeek === 0;

  const warmupTargetDateStr = isSchedSunday
    ? null
    : isSchedSaturday
    ? addDays(todayStr, 2)
    : addDays(todayStr, 1);

  const warmupForTomorrowLeads = !warmupTargetDateStr
    ? []
    : filteredAllLeads.filter((l) => {
        if (l.isCompleted || l.initialSentDate) return false;
        return l.scheduledDate === warmupTargetDateStr;
      });

  const handleToggleLeadWarmup = (lead: ChannelLead) => {
    const isCurrentlyWarmed = lead.warmupStatus === 'warmed' || Boolean(lead.isWarmedUp);
    const nextVal = !isCurrentlyWarmed;
    const updated: ChannelLead = {
      ...lead,
      warmupStatus: nextVal ? 'warmed' : 'locked',
      isWarmedUp: nextVal,
      warmedUpAt: nextVal ? new Date().toISOString() : undefined,
    };
    handleUpdateLead(updated);
  };

  // Numbers Dashboard Channel Counts
  const getChannelStats = (channelType: MultiChannelType) => {
    const channelList = allLeads.filter((l) => l.channel === channelType);
    const initialDue = channelList.filter((l) => {
      if (l.isCompleted || l.initialSentDate) return false;
      if (isLeadDismissedToday(l)) return false;
      return isDateToday(l.scheduledDate) || isDateOverdue(l.scheduledDate);
    }).length;

    const followupsDue = channelList.filter((l) => {
      if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
      if (isLeadDismissedToday(l)) return false;
      if (!l.initialSentDate) return false;

      // Day 7
      if (l.followupCount === 0 && (isDateToday(l.followup1Date) || isDateOverdue(l.followup1Date) || isDay7FollowupDue(l, todayStr))) {
        return true;
      }
      // Day 14
      if (l.followupCount === 1 && (isDateToday(l.followup2Date) || isDateOverdue(l.followup2Date) || isDay14FollowupDue(l, todayStr))) {
        return true;
      }
      // Day 30
      if (l.followupCount === 2 && (isDateToday(l.followup3Date) || isDateOverdue(l.followup3Date) || isDay30FollowupDue(l, todayStr))) {
        return true;
      }
      return false;
    }).length;

    return { initialDue, followupsDue };
  };

  const igStats = getChannelStats('instagram');
  const fbStats = getChannelStats('facebook');
  const emailStats = getChannelStats('email');

  // Automatically sync today's full schedule progress (Initial DM + Day 3 FU + Day 7 FU)
  // into persistent daily history, while isolating Initial DM sends for Total DMs Dispatches
  useEffect(() => {
    recordTodayCompletion({
      totalCompleted: totalTasksCompletedToday,
      totalRemainingDue: totalTasksRemainingToday,
      initialSent: initialSentTodayCount,
      initialRemainingDue: newDueTodayCount,
      followupsSent: followupsSentTodayCount,
      followupsRemainingDue: followupsDueTodayCount,
    });
  }, [
    totalTasksCompletedToday,
    totalTasksRemainingToday,
    initialSentTodayCount,
    newDueTodayCount,
    followupsSentTodayCount,
    followupsDueTodayCount,
  ]);

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

  // Dedicated Freeze Mode Screen when user has paused outreach for the week
  if (isFrozen && !showFrozenOverride) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-r from-cyan-950/70 via-slate-900/95 to-slate-900/95 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-xl shadow-cyan-950/50 shrink-0">
                <Snowflake className="w-7 h-7 text-cyan-400 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
                    Pipeline Frozen For This Week
                  </h1>
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    PAUSED &amp; STREAK PROTECTED
                  </span>
                </div>
                <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                  You paused outreach for this week because you have other commitments. No daily DMs, Follow-ups, Reels, or Stories will be marked as missed or overdue. Your active streak is completely protected and will not break.
                </p>
                <div className="flex items-center gap-4 text-xs font-mono text-cyan-300/80 pt-1 flex-wrap">
                  <span>🛡️ 100% Streak Safe</span>
                  <span>•</span>
                  <span>📦 0 Overdue Tasks</span>
                  <span>•</span>
                  <span>🎯 Quotas Suspended</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {onToggleFreeze && (
                <button
                  type="button"
                  onClick={onToggleFreeze}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-950/60 transition cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Resume / Start Pipeline</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFrozenOverride(true)}
                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                title="Inspect today's queue in read-only preview mode"
              >
                <span>👁️ View Queue Anyway</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-sm space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">🛡️</span> Zero Penalty Guarantee
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When life or other urgent work takes over, freezing this week preserves your record. The History matrix records all frozen days as protected rest.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-sm space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">🔒</span> Streak Locked &amp; Safe
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your Current Streak count will bridge seamlessly without zeroing out until you manually click "Resume / Start Pipeline".
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-sm space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">⚡</span> 1-Click Reactivation
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Whenever you're ready to start work again, click Resume from the top bar or right here to unfreeze all quotas and schedules.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
      {/* Frozen Override Active Banner */}
      {isFrozen && showFrozenOverride && (
        <div className="rounded-2xl border-2 border-cyan-500/50 bg-cyan-950/70 p-4 sm:p-5 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Snowflake className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono">
                  ❄️ Pipeline Frozen (Previewing Queue)
                </span>
                <span className="text-[11px] text-cyan-400/80 font-mono">
                  (Tasks on hold · Streak 100% protected)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                You are previewing today's queue while the week is frozen. No tasks count as missed or overdue.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onToggleFreeze && (
              <button
                type="button"
                onClick={onToggleFreeze}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Resume Pipeline</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFrozenOverride(false)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Hide Queue
            </button>
          </div>
        </div>
      )}

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
                  {totalTasksCompletedToday} / {dailyTargetTotal} Tasks Done
                </span>
                <span className="text-base font-mono text-slate-400 font-semibold">
                  ({progressPercent}%)
                </span>
              </h2>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono sm:text-right">
            {dailyTargetTotal === 0 ? (
              <span>No outreaches or follow-ups scheduled for {todayStr}</span>
            ) : isGoalFinished ? (
              <span className="text-emerald-300 font-bold flex items-center gap-1.5 sm:justify-end">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>You've hit 100%! All initial DMs and follow-ups complete.</span>
              </span>
            ) : (
              <div className="space-y-0.5 sm:text-right">
                <div className="text-slate-300">
                  <strong className="text-white font-bold">{newDueTodayCount}</strong> Initial DM{newDueTodayCount === 1 ? '' : 's'} · <strong className="text-white font-bold">{followupsDueTodayCount}</strong> Follow-Up{followupsDueTodayCount === 1 ? '' : 's'} remaining
                </div>
                <div className="text-[11px] text-slate-500">
                  Completed today: {initialSentTodayCount} Initial · {followupsSentTodayCount} Follow-ups
                </div>
              </div>
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
            <span>Tasks Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-400 font-mono tabular-nums">
            {totalTasksCompletedToday}
          </div>
          <div className="mt-1 text-[11px] text-emerald-300/80">
            {initialSentTodayCount} Initial · {followupsSentTodayCount} Follow-ups
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
      {/* SECTION: NUMBERS DASHBOARD (Clean Quotas & Direct Workspace Links)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Instagram */}
        <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-950/25 via-slate-900/90 to-slate-900 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center shadow-sm">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base font-['Outfit']">Instagram</h3>
                  <span className="text-[10px] font-mono text-pink-300/80 uppercase">Workspace Quotas</span>
                </div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
              <div className="text-sm sm:text-base font-bold text-white font-mono tracking-tight">
                <span className="text-pink-300 font-black text-lg">{igStats.initialDue}</span> Initial DMs ·{' '}
                <span className="text-pink-300 font-black text-lg">{igStats.followupsDue}</span> Follow-Ups
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToChannel('instagram')}
            className="w-full py-2.5 px-3 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 hover:text-white border border-pink-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm group active:scale-98"
          >
            <span>View IG Leads</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>

        {/* Facebook */}
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/25 via-slate-900/90 to-slate-900 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shadow-sm">
                  <Facebook className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base font-['Outfit']">Facebook</h3>
                  <span className="text-[10px] font-mono text-sky-300/80 uppercase">Workspace Quotas</span>
                </div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
              <div className="text-sm sm:text-base font-bold text-white font-mono tracking-tight">
                <span className="text-sky-300 font-black text-lg">{fbStats.initialDue}</span> Initial DMs ·{' '}
                <span className="text-sky-300 font-black text-lg">{fbStats.followupsDue}</span> Follow-Ups
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToChannel('facebook')}
            className="w-full py-2.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm group active:scale-98"
          >
            <span>View FB Leads</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>

        {/* Email */}
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/25 via-slate-900/90 to-slate-900 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-sm">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base font-['Outfit']">Email</h3>
                  <span className="text-[10px] font-mono text-indigo-300/80 uppercase">Workspace Quotas</span>
                </div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
              <div className="text-sm sm:text-base font-bold text-white font-mono tracking-tight">
                <span className="text-indigo-300 font-black text-lg">{emailStats.initialDue}</span> Initial DMs ·{' '}
                <span className="text-indigo-300 font-black text-lg">{emailStats.followupsDue}</span> Follow-Ups
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToChannel('email')}
            className="w-full py-2.5 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm group active:scale-98"
          >
            <span>View Email Leads</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>

        {/* Warm-Ups Needed Today */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/25 via-slate-900/90 to-slate-900 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-sm">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base font-['Outfit']">Warm-Ups Needed Today</h3>
                  <span className="text-[10px] font-mono text-amber-300/80 uppercase">Pre-Outreach Target</span>
                </div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
              <div className="text-sm sm:text-base font-bold text-amber-200 font-mono tracking-tight">
                <span className="text-amber-300 font-black text-lg">{warmupForTomorrowLeads.length}</span> {warmupForTomorrowLeads.length === 1 ? 'lead' : 'leads'} to warm up {isSchedSaturday ? 'for Monday' : 'for tomorrow'}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-amber-300/80 font-mono py-2 px-3 text-center bg-amber-500/10 rounded-xl border border-amber-500/20 font-semibold">
            ↓ Engage individual leads below
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: 🔥 WARM UP FOR TOMORROW                                          */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/25 via-slate-900/90 to-slate-900 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-500/20 pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Flame className="w-5 h-5 text-amber-400" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-['Outfit'] flex items-center gap-2">
                <span>🔥 Warm Up for Tomorrow</span>
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-500/30">
                  {warmupForTomorrowLeads.length} Due Today
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSchedSaturday
                  ? 'Saturday Rest Mode: No warm-ups today since Sunday is a rest day.'
                  : isSchedSunday
                  ? 'Sunday Warm-Up: Engage prospects scheduled for Monday outreach.'
                  : 'Engage these prospects today so they recognize your profile when outreach sends tomorrow.'}
              </p>
            </div>
          </div>
        </div>

        {warmupForTomorrowLeads.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-slate-300 font-semibold">
              {isSchedSaturday
                ? 'No warm-ups needed on Saturday. Sunday is rest!'
                : 'All prospects scheduled for tomorrow are warmed up, or no leads scheduled for tomorrow.'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {warmupForTomorrowLeads.map((lead) => (
              <div
                key={`warmup-${lead.channel}-${lead.id}`}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  lead.isWarmedUp
                    ? 'border-emerald-500/40 bg-emerald-950/20 shadow-sm'
                    : 'border-amber-500/50 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {renderChannelBadge(lead.channel)}
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {lead.id}
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-slate-100 truncate font-['Outfit']">
                    {lead.name}
                  </div>
                  <a
                    href={lead.link.startsWith('http') ? lead.link : `https://${lead.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 truncate max-w-full"
                  >
                    <span className="truncate">{lead.link}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleLeadWarmup(lead)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                    lead.isWarmedUp
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/50 shadow-amber-950/40 animate-pulse'
                  }`}
                  title={lead.isWarmedUp ? 'Profile Warmed Up (Click to toggle)' : 'Mark profile as Warmed Up'}
                >
                  <span>🔥</span>
                  <span>{lead.isWarmedUp ? 'Warmed' : 'Warm Up'}</span>
                </button>
              </div>
            ))}
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
