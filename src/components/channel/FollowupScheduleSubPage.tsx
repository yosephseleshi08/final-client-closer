import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Check,
  CheckCheck,
  Copy,
  Send,
  Archive,
  Zap,
  Flame,
  CalendarDays,
  RotateCcw,
  X,
  EyeOff,
  Lock,
  StickyNote,
  TrendingUp,
  FileText,
  Mail,
  Facebook,
  Instagram,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import { QuickNoteModal } from '../QuickNoteModal';
import {
  getLocalTodayStr,
  isDateToday,
  isDateOverdue,
  getDayDifference,
  addDays,
  markInitialSent,
  markFollowupSent,
  markLeadReplied,
  toggleLeadSeen,
  dismissLeadForToday,
  restoreDismissedLead,
  isLeadDismissedToday,
  getCadenceMessageTemplates,
  isDay4FollowupDue,
  isDay8FollowupDue,
  isDay14FollowupDue,
  getLeadBaseContactDate,
  isLeadWarmed,
  isLeadWarmedBeforeToday,
  isLeadWarmedToday,
  isEmailOnlyLead,
  getTomorrowWarmupTargetDate,
} from '../../utils/cadenceEngine';
import { getChannelLabel, getBlindRouteLink } from '../../utils/channelStorage';
import { startWarmupCooldown, getLeadWarmupPlatform } from '../../utils/antiSpamLock';
import { TestLinkButton } from '../TestLinkButton';

interface FollowupScheduleSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
  onNavigateToSchedule: () => void;
}

type FollowupCadenceTab = 'due_today' | 'day4' | 'day8' | 'day14' | 'completed';

export function FollowupScheduleSubPage({
  channel,
  leads,
  onUpdateLeads,
  onNavigateToSchedule,
}: FollowupScheduleSubPageProps) {
  const [activeCadenceTab, setActiveCadenceTab] = useState<FollowupCadenceTab>('due_today');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [noteModalLead, setNoteModalLead] = useState<ChannelLead | null>(null);
  const [adminOverrideEnabled, setAdminOverrideEnabled] = useState(false);

  const todayStr = getLocalTodayStr();

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleUpdateLeadItem = (updated: ChannelLead) => {
    const nextList = leads.map((l) => (l.id === updated.id ? updated : l));
    onUpdateLeads(nextList);
  };

  const handleSaveQuickNote = (leadId: string, noteText: string) => {
    const updated = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            quickNote: noteText || undefined,
            quickNoteSavedAt: noteText
              ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : undefined,
          }
        : l
    );
    onUpdateLeads(updated);
  };

  const handleDeleteQuickNote = (leadId: string) => {
    const updated = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            quickNote: undefined,
            quickNoteSavedAt: undefined,
          }
        : l
    );
    onUpdateLeads(updated);
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

  /**
   * INTELLIGENT CHANNEL ROUTING (The Blind Rule)
   * Shows ONLY the single routed link. Never shows both links side-by-side.
   */
  const renderDispatchLinks = (lead: ChannelLead, stage: 0 | 4 | 8 | 14 = 0) => {
    const route = getBlindRouteLink(lead, 'dispatch', stage);
    if (!route) return null;

    const badgeColor =
      route.channelType === 'email'
        ? 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-500/30 text-indigo-300'
        : route.channelType === 'instagram'
        ? 'bg-pink-500/15 hover:bg-pink-500/25 border-pink-500/30 text-pink-300'
        : 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/30 text-sky-300';

    return (
      <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
        <a
          href={route.href}
          target={route.isMailto ? '_self' : '_blank'}
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 text-xs hover:text-white transition px-3 py-1.5 rounded-xl border font-medium ${badgeColor}`}
          title={`${route.actionLabel}: ${route.link}`}
        >
          {route.channelType === 'email' ? (
            <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          ) : route.channelType === 'instagram' ? (
            <Instagram className="w-3.5 h-3.5 text-pink-400 shrink-0" />
          ) : (
            <Facebook className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          )}
          <span className="font-bold text-[10px] bg-white/10 px-1 py-0.5 rounded font-mono">
            {route.badgeLabel}
          </span>
          <span className="truncate max-w-xs">{route.link}</span>
          <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
        </a>
        <TestLinkButton lead={lead} platform={route.channelType} label={`Test ${route.badgeLabel}`} />
      </div>
    );
  };

  // Leads dismissed for today only (safely kept in database & Leads tab)
  const dismissedTodayLeads = leads.filter((l) => isLeadDismissedToday(l));

  // 1. Sub-tab: DUE TODAY (Initial due today/overdue OR Day 7 due OR Day 14 due OR Day 30 due)
  const dueTodayLeads = leads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
    if (isLeadDismissedToday(l)) return false;

    // Initial outreach due today or overdue
    if (!l.initialSentDate && !l.dmSent && l.scheduledDate && (isDateToday(l.scheduledDate) || isDateOverdue(l.scheduledDate))) {
      return true;
    }

    // Follow-ups due today or overdue (Day 4, Day 8, Day 14)
    if (isDay4FollowupDue(l, todayStr)) return true;
    if (isDay8FollowupDue(l, todayStr)) return true;
    if (isDay14FollowupDue(l, todayStr)) return true;

    return false;
  });

  // 2. Sub-tab: DAY 4 (Kitchen Ticket PDF)
  const allDay4Pending = leads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
    return Boolean(l.initialSentDate || l.dmSent) && (l.followupCount === 0 || l.followupCount === undefined);
  });
  const day4ActionableLeads = allDay4Pending.filter((l) => isDay4FollowupDue(l, todayStr));
  const day4LockedLeads = allDay4Pending.filter((l) => !isDay4FollowupDue(l, todayStr));
  const nextDay4Countdown = day4LockedLeads.length > 0
    ? Math.min(...day4LockedLeads.map((l) => {
        const targetDate = l.followup1Date || addDays(getLeadBaseContactDate(l), 4);
        const diff = getDayDifference(targetDate, todayStr);
        return diff > 0 ? diff : 1;
      }))
    : 4;

  // 3. Sub-tab: DAY 8 (Takeout Surge)
  const allDay8Pending = leads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
    return Boolean(l.initialSentDate || l.dmSent) && l.followupCount === 1;
  });
  const day8ActionableLeads = allDay8Pending.filter((l) => isDay8FollowupDue(l, todayStr));
  const day8LockedLeads = allDay8Pending.filter((l) => !isDay8FollowupDue(l, todayStr));
  const nextDay8Countdown = day8LockedLeads.length > 0
    ? Math.min(...day8LockedLeads.map((l) => {
        const targetDate = l.followup2Date || addDays(getLeadBaseContactDate(l), 8);
        const diff = getDayDifference(targetDate, todayStr);
        return diff > 0 ? diff : 1;
      }))
    : 8;

  // 4. Sub-tab: DAY 14 (Final Nudge / Breakup)
  const allDay14Pending = leads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
    return Boolean(l.initialSentDate || l.dmSent) && l.followupCount === 2;
  });
  const day14ActionableLeads = allDay14Pending.filter((l) => isDay14FollowupDue(l, todayStr));
  const day14LockedLeads = allDay14Pending.filter((l) => !isDay14FollowupDue(l, todayStr));
  const nextDay14Countdown = day14LockedLeads.length > 0
    ? Math.min(...day14LockedLeads.map((l) => {
        const targetDate = l.followup3Date || addDays(getLeadBaseContactDate(l), 14);
        const diff = getDayDifference(targetDate, todayStr);
        return diff > 0 ? diff : 1;
      }))
    : 14;

  // 5. Sub-tab: COMPLETED / ARCHIVED
  const completedLeads = leads.filter((l) => {
    return l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed';
  });

  const subTabs: { id: FollowupCadenceTab; label: string; count: number; icon: React.ReactNode }[] = [
    {
      id: 'due_today',
      label: 'Due Today',
      count: dueTodayLeads.length,
      icon: <CalendarDays className="w-3.5 h-3.5" />,
    },
    {
      id: 'day4',
      label: 'Day 4 (Value Check-In)',
      count: day4ActionableLeads.length,
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    {
      id: 'day8',
      label: 'Day 8 (Takeout Surge)',
      count: day8ActionableLeads.length,
      icon: <TrendingUp className="w-3.5 h-3.5" />,
    },
    {
      id: 'day14',
      label: 'Day 14 (Breakup Loom)',
      count: day14ActionableLeads.length,
      icon: <Flame className="w-3.5 h-3.5" />,
    },
    {
      id: 'completed',
      label: 'Completed / Archived',
      count: completedLeads.length,
      icon: <Archive className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white font-['Outfit']">
            {getChannelLabel(channel)} Closed-System Follow-Up Timeline
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            4/8/14 Cadence: Day 4 (Kitchen Ticket PDF) → Day 8 (Takeout Surge) → Day 14 (Breakup Loom).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setAdminOverrideEnabled(!adminOverrideEnabled)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              adminOverrideEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border-white/10'
            }`}
            title="Toggle Admin Override to force-send follow-ups outside designated +4/+8/+14 windows"
          >
            <Zap className={`w-3.5 h-3.5 ${adminOverrideEnabled ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
            <span>{adminOverrideEnabled ? '⚡ Override Active' : '🛡️ Strict Cadence'}</span>
          </button>

          {dueTodayLeads.length > 0 && (
            <span className="text-xs font-bold text-rose-300 bg-rose-500/20 px-3 py-1 rounded-xl border border-rose-500/30 flex items-center gap-1.5 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>{dueTodayLeads.length} Actionable Today</span>
            </span>
          )}
        </div>
      </div>

      {/* Internal Sub-Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-white/10 rounded-xl overflow-x-auto no-scrollbar shadow-inner">
        {subTabs.map((tab) => {
          const isActive = activeCadenceTab === tab.id;
          const isUrgent = tab.id === 'due_today' && tab.count > 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCadenceTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : isUrgent
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-white/5 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dismissed Notification Banner */}
      {dismissedTodayLeads.length > 0 && (
        <div className="p-3 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <EyeOff className="w-4 h-4 text-slate-500" />
            <span>
              <strong className="text-slate-200">{dismissedTodayLeads.length}</strong> lead{dismissedTodayLeads.length === 1 ? '' : 's'} removed from today's queue (still safely stored in Leads tab).
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = leads.map((l) => (isLeadDismissedToday(l) ? restoreDismissedLead(l) : l));
              onUpdateLeads(next);
            }}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restore All</span>
          </button>
        </div>
      )}

      {/* SUB-TAB 1: DUE TODAY */}
      {activeCadenceTab === 'due_today' && (
        <div className="space-y-3">
          {dueTodayLeads.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">All caught up for today!</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No initial outreach or value-based follow-ups are due today in {getChannelLabel(channel)}. Check the Day 7, Day 14, and Day 30 tabs for upcoming pipeline touchpoints.
              </p>
            </div>
          ) : (
            dueTodayLeads.map((lead) => {
              const templates = getCadenceMessageTemplates(lead);
              const isInitial = !lead.initialSentDate && !lead.dmSent;
              const isWarmedBeforeToday = isLeadWarmedBeforeToday(lead, todayStr);
              const isWarmedToday = isLeadWarmedToday(lead, todayStr);
              const isDispatchLocked = isInitial && !isEmailOnlyLead(lead) && !isWarmedBeforeToday;
              const isDay4 = (lead.initialSentDate || lead.dmSent) && (lead.followupCount === 0 || lead.followupCount === undefined);
              const isDay8 = lead.followupCount === 1;
              const isDay14 = lead.followupCount === 2;

              const stageNumber: 0 | 4 | 8 | 14 = isInitial ? 0 : isDay4 ? 4 : isDay8 ? 8 : 14;

              const targetDate = isInitial
                ? lead.scheduledDate!
                : isDay4
                ? (lead.followup1Date || addDays(getLeadBaseContactDate(lead), 4))
                : isDay8
                ? (lead.followup2Date || addDays(getLeadBaseContactDate(lead), 8))
                : (lead.followup3Date || addDays(getLeadBaseContactDate(lead), 14));

              const isOverdue = targetDate < todayStr;
              const isToday = targetDate === todayStr;

              const copyText = isInitial
                ? templates.stageAMessage
                : isDay4
                ? templates.day7Message
                : isDay8
                ? templates.day14Message
                : templates.day30Message;

              return (
                <div
                  key={lead.id}
                  className={`rounded-2xl border p-4 space-y-3 shadow-lg transition ${
                    isDispatchLocked
                      ? 'border-amber-500/50 bg-amber-950/20 ring-1 ring-amber-500/20'
                      : isOverdue
                      ? 'border-rose-500/50 bg-rose-950/20'
                      : isToday
                      ? 'border-indigo-500/40 bg-indigo-950/20'
                      : 'border-white/10 bg-slate-950/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {lead.id}
                      </span>
                      <h3 className="font-bold text-white text-sm sm:text-base font-['Outfit']">
                        {lead.name}
                      </h3>
                      {lead.isSeen && (
                        <span className="text-xs font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                          👀 Seen
                        </span>
                      )}
                      {isInitial ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                            Stage A (Initial DM)
                          </span>
                          {isWarmedBeforeToday ? (
                            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40 font-mono flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>🔥 Warmed &amp; Ready</span>
                            </span>
                          ) : isWarmedToday ? (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 font-mono flex items-center gap-1">
                              <Flame className="w-3 h-3 text-amber-400" />
                              <span>🔥 Warmed (Sends Tomorrow)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 font-mono flex items-center gap-1 animate-pulse">
                              <Lock className="w-3 h-3 text-amber-400" />
                              <span>🔒 Warm-Up Locked</span>
                            </span>
                          )}
                        </div>
                      ) : isDay4 ? (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 font-mono">
                          ⚡ Day 4: Value Check-In
                        </span>
                      ) : isDay8 ? (
                        <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/40 font-mono">
                          📊 Day 8: Takeout Surge
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40 font-mono">
                          🎯 Day 14: Breakup Loom
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-rose-300 bg-rose-600/30 px-2 py-0.5 rounded border border-rose-500/50 font-mono">
                          Overdue ({targetDate})
                        </span>
                      )}
                    </div>

                    {renderDispatchLinks(lead, stageNumber)}
                  </div>

                  {/* Pre-staged Copy Box */}
                  <div className="rounded-xl border border-white/5 bg-slate-900/90 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                      <span>Value Message Template</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(lead.id, copyText)}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-white transition cursor-pointer"
                      >
                        {copiedKey === lead.id ? (
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
                      "{copyText}"
                    </p>
                  </div>

                  {/* Dispatch Lock Notice for Today's Un-Warmed Leads */}
                  {isDispatchLocked && (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-2">
                        {isWarmedToday ? (
                          <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                        )}
                        <span>
                          {isWarmedToday ? (
                            <>
                              <strong>Warmed Today:</strong> Profile was engaged and warmed up today for <strong>tomorrow's dispatch</strong>. Same-day initial DM is locked to protect account health.
                            </>
                          ) : (
                            <>
                              <strong>Dispatch Gate:</strong> This prospect is locked because they were not warmed up yesterday. Engage their profile and click <strong>"Mark as Warmed"</strong> to schedule for tomorrow's dispatch.
                            </>
                          )}
                        </span>
                      </div>
                      {!isWarmedToday ? (
                        <button
                          type="button"
                          onClick={() => {
                            const nowIso = new Date().toISOString();
                            const targetTomorrow = getTomorrowWarmupTargetDate(todayStr);
                            const platform = getLeadWarmupPlatform(lead);
                            startWarmupCooldown(platform);
                            handleUpdateLeadItem({
                              ...lead,
                              warmupStatus: 'warmed',
                              isWarmedUp: true,
                              warmedUpAt: nowIso,
                              scheduledDate: targetTomorrow,
                            });
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40 shrink-0 transition cursor-pointer active:scale-95 self-end sm:self-auto"
                        >
                          <Flame className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                          <span>Mark as Warmed</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[11px] font-bold shrink-0">
                          📅 Dispatches Tomorrow
                        </span>
                      )}
                    </div>
                  )}

                  {/* Amber Sticky Note Box Preview */}
                  {renderQuickNoteBox(lead)}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Target Date: {targetDate}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {renderNoteButton(lead)}

                      <button
                        type="button"
                        onClick={() => handleUpdateLeadItem(dismissLeadForToday(lead))}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                        title="Remove from today's queue (lead remains safely in your database)"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateLeadItem(toggleLeadSeen(lead))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          lead.isSeen
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                        }`}
                      >
                        <span>👀 Seen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateLeadItem(markLeadReplied(lead))}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Replied!</span>
                      </button>

                      {/* DISPATCH BUTTON: Disabled if isDispatchLocked */}
                      <button
                        type="button"
                        disabled={isDispatchLocked}
                        onClick={() => {
                          if (isDispatchLocked) return;
                          if (isInitial) {
                            handleUpdateLeadItem(markInitialSent(lead));
                          } else if (isDay4) {
                            handleUpdateLeadItem(markFollowupSent(lead, 1));
                          } else if (isDay8) {
                            handleUpdateLeadItem(markFollowupSent(lead, 2));
                          } else {
                            handleUpdateLeadItem(markFollowupSent(lead, 3));
                          }
                        }}
                        className={
                          isDispatchLocked
                            ? 'px-4 py-1.5 rounded-xl bg-slate-800 text-slate-500 border border-slate-700/60 font-bold text-xs flex items-center gap-1.5 cursor-not-allowed opacity-60 shadow-none'
                            : 'px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer'
                        }
                        title={
                          isDispatchLocked
                            ? isWarmedToday
                              ? 'Initial DM dispatches tomorrow to satisfy the 24-hour warm-up rule'
                              : "Dispatch is locked until this lead is marked as 'warmed' before dispatch day"
                            : undefined
                        }
                      >
                        {isDispatchLocked ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                            <span>{isWarmedToday ? '🔒 Unlocks Tomorrow' : '🔒 Dispatch Locked'}</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>
                              {isInitial
                                ? 'Mark Initial DM Sent'
                                : isDay4
                                ? 'Mark Day 4 Sent'
                                : isDay8
                                ? 'Mark Day 8 Sent'
                                : 'Mark Day 14 Sent (Archive)'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 2: DAY 4 (Value Check-In - Kitchen Ticket PDF) */}
      {activeCadenceTab === 'day4' && (
        <div className="space-y-4">
          {day4ActionableLeads.length === 0 ? (
            day4LockedLeads.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
                <FileText className="w-8 h-8 text-amber-400/50 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-300">No leads currently in Day 4 Cadence</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When you send Stage A outreach, leads automatically enter the Day 4 value check-in pipeline.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-slate-900/90 p-6 text-center space-y-2 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white font-['Outfit']">
                  No Day 4 follow-ups due. Next follow-up in {nextDay4Countdown} {nextDay4Countdown === 1 ? 'day' : 'days'}.
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Day 4 Value Check-In is time-locked to give prospects adequate space. Prospects will unlock on Day 4.
                </p>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {day4ActionableLeads.map((lead) => {
                const templates = getCadenceMessageTemplates(lead);
                const fu1Date = lead.followup1Date || addDays(getLeadBaseContactDate(lead), 4);

                return (
                  <div
                    key={lead.id}
                    className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-3 shadow-lg transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {lead.id}
                        </span>
                        <h3 className="font-bold text-white text-sm sm:text-base font-['Outfit']">
                          {lead.name}
                        </h3>
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 font-mono">
                          ⚡ Day 4: Value Check-In
                        </span>
                      </div>

                      {renderDispatchLinks(lead, 4)}
                    </div>

                    <div className="rounded-xl border border-amber-500/20 bg-amber-950/30 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                        <span>Day 4 Trigger Message (Kitchen Ticket PDF)</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`${lead.id}-day4`, templates.day7Message)}
                          className="flex items-center gap-1 text-xs text-amber-300 hover:text-white transition cursor-pointer"
                        >
                          {copiedKey === `${lead.id}-day4` ? (
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
                        "{templates.day7Message}"
                      </p>
                    </div>

                    {renderQuickNoteBox(lead)}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Target Date: {fu1Date}
                      </span>

                      <div className="flex items-center gap-2 flex-wrap">
                        {renderNoteButton(lead)}

                        <button
                          type="button"
                          onClick={() => handleUpdateLeadItem(toggleLeadSeen(lead))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            lead.isSeen
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                          }`}
                        >
                          <span>👀 Seen</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateLeadItem(markLeadReplied(lead))}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Replied!</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateLeadItem(markFollowupSent(lead, 1))}
                          className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Day 4 Sent</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Locked Day 4 Leads */}
          {day4LockedLeads.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                <span className="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Upcoming Day 4 Leads ({day4LockedLeads.length})</span>
                </span>
                <span>Unlocks on Day 4</span>
              </div>

              {day4LockedLeads.map((lead) => {
                const target = lead.followup1Date || addDays(getLeadBaseContactDate(lead), 4);
                const diff = Math.max(1, getDayDifference(target, todayStr));
                const templates = getCadenceMessageTemplates(lead);

                return (
                  <div
                    key={`locked-${lead.id}`}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2.5 opacity-85 hover:opacity-100 transition"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {lead.id}
                        </span>
                        <h4 className="font-bold text-slate-200 text-sm font-['Outfit']">{lead.name}</h4>
                        <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 font-mono">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>Unlocks in {diff} {diff === 1 ? 'day' : 'days'}</span>
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">Target: {target}</span>
                    </div>
                    <p className="text-xs text-slate-400 italic truncate">"{templates.day7Message}"</p>

                    {adminOverrideEnabled && (
                      <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-amber-400">⚡ Admin Override Active</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(`${lead.id}-day4-override`, templates.day7Message)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-semibold cursor-pointer"
                          >
                            {copiedKey === `${lead.id}-day4-override` ? 'Copied!' : 'Copy Msg'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateLeadItem(markFollowupSent(lead, 1))}
                            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow transition cursor-pointer"
                          >
                            ⚡ Force Send Day 4
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: DAY 8 (Takeout Surge) */}
      {activeCadenceTab === 'day8' && (
        <div className="space-y-4">
          {day8ActionableLeads.length === 0 ? (
            day8LockedLeads.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
                <TrendingUp className="w-8 h-8 text-purple-400/50 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-300">No leads currently in Day 8 Cadence</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Leads progress to Day 8 after Day 4 is dispatched.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/30 via-slate-900/90 to-slate-900/90 p-6 text-center space-y-2 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white font-['Outfit']">
                  No Day 8 follow-ups due. Next follow-up in {nextDay8Countdown} {nextDay8Countdown === 1 ? 'day' : 'days'}.
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Day 8 Takeout Surge trigger is time-locked.
                </p>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {day8ActionableLeads.map((lead) => {
                const templates = getCadenceMessageTemplates(lead);
                const fu2Date = lead.followup2Date || addDays(getLeadBaseContactDate(lead), 8);

                return (
                  <div
                    key={lead.id}
                    className="rounded-2xl border border-purple-500/40 bg-purple-950/20 p-4 space-y-3 shadow-lg transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          {lead.id}
                        </span>
                        <h3 className="font-bold text-white text-sm sm:text-base font-['Outfit']">
                          {lead.name}
                        </h3>
                        <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/40 font-mono">
                          📊 Day 8: Takeout Surge
                        </span>
                      </div>

                      {renderDispatchLinks(lead, 8)}
                    </div>

                    <div className="rounded-xl border border-purple-500/20 bg-purple-950/30 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-purple-300">
                        <span>Day 8 Trigger Message (Takeout Surge Case Study)</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`${lead.id}-day8`, templates.day14Message)}
                          className="flex items-center gap-1 text-xs text-purple-300 hover:text-white transition cursor-pointer"
                        >
                          {copiedKey === `${lead.id}-day8` ? (
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
                        "{templates.day14Message}"
                      </p>
                    </div>

                    {renderQuickNoteBox(lead)}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Target Date: {fu2Date}
                      </span>

                      <div className="flex items-center gap-2 flex-wrap">
                        {renderNoteButton(lead)}

                        <button
                          type="button"
                          onClick={() => handleUpdateLeadItem(toggleLeadSeen(lead))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            lead.isSeen
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                          }`}
                        >
                          <span>👀 Seen</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateLeadItem(markLeadReplied(lead))}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Replied!</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateLeadItem(markFollowupSent(lead, 2))}
                          className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Day 8 Sent</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Locked Day 8 Leads */}
          {day8LockedLeads.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                <span className="font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Upcoming Day 8 Leads ({day8LockedLeads.length})</span>
                </span>
                <span>Unlocks on Day 8</span>
              </div>

              {day8LockedLeads.map((lead) => {
                const target = lead.followup2Date || addDays(getLeadBaseContactDate(lead), 8);
                const diff = Math.max(1, getDayDifference(target, todayStr));
                const templates = getCadenceMessageTemplates(lead);

                return (
                  <div
                    key={`locked-8-${lead.id}`}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2.5 opacity-85 hover:opacity-100 transition"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {lead.id}
                        </span>
                        <h4 className="font-bold text-slate-200 text-sm font-['Outfit']">{lead.name}</h4>
                        <span className="text-[11px] font-bold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1 font-mono">
                          <Lock className="w-3 h-3 text-purple-400" />
                          <span>Unlocks in {diff} {diff === 1 ? 'day' : 'days'}</span>
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">Target: {target}</span>
                    </div>
                    <p className="text-xs text-slate-400 italic truncate">"{templates.day14Message}"</p>

                    {adminOverrideEnabled && (
                      <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-purple-400">⚡ Admin Override Active</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(`${lead.id}-day8-override`, templates.day14Message)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-semibold cursor-pointer"
                          >
                            {copiedKey === `${lead.id}-day8-override` ? 'Copied!' : 'Copy Msg'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateLeadItem(markFollowupSent(lead, 2))}
                            className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow transition cursor-pointer"
                          >
                            ⚡ Force Send Day 8
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: DAY 14 (Final Nudge / Breakup Loom) */}
      {activeCadenceTab === 'day14' && (
        <div className="space-y-4">
          {day14ActionableLeads.length === 0 ? (
            day14LockedLeads.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
                <Flame className="w-8 h-8 text-rose-400/50 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-300">No leads currently in Day 14 Cadence</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Leads progress to Day 14 after Day 8 is dispatched.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/30 via-slate-900/90 to-slate-900/90 p-6 text-center space-y-2 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white font-['Outfit']">
                  No Day 14 follow-ups due. Next follow-up in {nextDay14Countdown} {nextDay14Countdown === 1 ? 'day' : 'days'}.
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Day 14 Breakup Loom audit is time-locked.
                </p>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {day14ActionableLeads.map((lead) => {
                const templates = getCadenceMessageTemplates(lead);
                const fu3Date = lead.followup3Date || addDays(getLeadBaseContactDate(lead), 14);

                return (
                  <div
                    key={lead.id}
                    className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-4 space-y-3 shadow-lg transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          {lead.id}
                        </span>
                        <h3 className="font-bold text-white text-sm sm:text-base font-['Outfit']">
                          {lead.name}
                        </h3>
                        <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40 font-mono">
                          🎯 Day 14: Breakup Loom
                        </span>
                      </div>

                      {renderDispatchLinks(lead, 14)}
                    </div>

                    <div className="rounded-xl border border-rose-500/20 bg-rose-950/30 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-rose-300">
                        <span>Day 14 Trigger Message (60s Mobile Checkout Loom)</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`${lead.id}-day14`, templates.day30Message)}
                          className="flex items-center gap-1 text-xs text-rose-300 hover:text-white transition cursor-pointer"
                        >
                          {copiedKey === `${lead.id}-day14` ? (
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
                        "{templates.day30Message}"
                      </p>
                    </div>

                    {renderQuickNoteBox(lead)}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Target Date: {fu3Date}
                      </span>

                      <div className="flex items-center gap-2 flex-wrap">
                        {renderNoteButton(lead)}

                        <button
                          type="button"
                          onClick={() => handleUpdateLeadItem(toggleLeadSeen(lead))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            lead.isSeen
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                          }`}
                        >
                          <span>👀 Seen</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateLeadItem(markLeadReplied(lead))}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Replied!</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateLeadItem(markFollowupSent(lead, 3))}
                          className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Send &amp; Archive Cadence</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Locked Day 14 Leads */}
          {day14LockedLeads.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                <span className="font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Upcoming Day 14 Leads ({day14LockedLeads.length})</span>
                </span>
                <span>Unlocks on Day 14</span>
              </div>

              {day14LockedLeads.map((lead) => {
                const target = lead.followup3Date || addDays(getLeadBaseContactDate(lead), 14);
                const diff = Math.max(1, getDayDifference(target, todayStr));
                const templates = getCadenceMessageTemplates(lead);

                return (
                  <div
                    key={`locked-14-${lead.id}`}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2.5 opacity-85 hover:opacity-100 transition"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {lead.id}
                        </span>
                        <h4 className="font-bold text-slate-200 text-sm font-['Outfit']">{lead.name}</h4>
                        <span className="text-[11px] font-bold text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1 font-mono">
                          <Lock className="w-3 h-3 text-rose-400" />
                          <span>Unlocks in {diff} {diff === 1 ? 'day' : 'days'}</span>
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">Target: {target}</span>
                    </div>
                    <p className="text-xs text-slate-400 italic truncate">"{templates.day30Message}"</p>

                    {adminOverrideEnabled && (
                      <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-rose-400">⚡ Admin Override Active</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(`${lead.id}-day14-override`, templates.day30Message)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-semibold cursor-pointer"
                          >
                            {copiedKey === `${lead.id}-day14-override` ? 'Copied!' : 'Copy Msg'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateLeadItem(markFollowupSent(lead, 3))}
                            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition cursor-pointer"
                          >
                            ⚡ Force Send Day 14
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: COMPLETED / ARCHIVED */}
      {activeCadenceTab === 'completed' && (
        <div className="space-y-3">
          {completedLeads.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
              <Archive className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">No completed leads yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Leads that reply or complete all cadence touchpoints will be cataloged here.
              </p>
            </div>
          ) : (
            completedLeads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 space-y-2 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      {lead.id}
                    </span>
                    <h3 className="font-bold text-white text-sm font-['Outfit']">{lead.name}</h3>
                    {lead.leadStatus === 'replied' ? (
                      <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                        <span>Replied</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-slate-400" />
                        <span>Cadence Concluded</span>
                      </span>
                    )}
                  </div>
                  {renderDispatchLinks(lead)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Quick Note Modal */}
      <QuickNoteModal
        isOpen={Boolean(noteModalLead)}
        lead={noteModalLead}
        onClose={() => setNoteModalLead(null)}
        onSave={(text) => {
          if (noteModalLead) handleSaveQuickNote(noteModalLead.id, text);
          setNoteModalLead(null);
        }}
        onDelete={() => {
          if (noteModalLead) handleDeleteQuickNote(noteModalLead.id);
          setNoteModalLead(null);
        }}
      />
    </div>
  );
}
