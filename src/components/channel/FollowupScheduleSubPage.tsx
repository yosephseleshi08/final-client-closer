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
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import {
  getLocalTodayStr,
  isDateToday,
  isDateOverdue,
  getDayDifference,
  markInitialSent,
  markFollowupSent,
  markLeadReplied,
  toggleLeadSeen,
  dismissLeadForToday,
  restoreDismissedLead,
  isLeadDismissedToday,
  getCadenceMessageTemplates,
} from '../../utils/cadenceEngine';
import { getChannelLabel } from '../../utils/channelStorage';

interface FollowupScheduleSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
  onNavigateToSchedule: () => void;
}

type FollowupCadenceTab = 'due_today' | 'day3' | 'day7' | 'completed';

export function FollowupScheduleSubPage({
  channel,
  leads,
  onUpdateLeads,
  onNavigateToSchedule,
}: FollowupScheduleSubPageProps) {
  const [activeCadenceTab, setActiveCadenceTab] = useState<FollowupCadenceTab>('due_today');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  // Leads dismissed for today only (safely kept in database & Leads tab)
  const dismissedTodayLeads = leads.filter((l) => isLeadDismissedToday(l));

  // 1. Sub-tab: DUE TODAY
  // Leads requiring action today or overdue (Initial sends + 3-day + 7-day)
  const dueTodayLeads = leads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
    if (isLeadDismissedToday(l)) return false;

    // Initial outreach due today or overdue
    if (!l.initialSentDate && l.scheduledDate && (isDateToday(l.scheduledDate) || isDateOverdue(l.scheduledDate))) {
      return true;
    }

    // Follow-up 1 due today or overdue
    if (l.initialSentDate && (l.followupCount === 0 || l.followupCount === undefined) && l.followup1Date && (isDateToday(l.followup1Date) || isDateOverdue(l.followup1Date))) {
      return true;
    }

    // Follow-up 2 due today or overdue
    if (l.initialSentDate && l.followupCount === 1 && l.followup2Date && (isDateToday(l.followup2Date) || isDateOverdue(l.followup2Date))) {
      return true;
    }

    return false;
  });

  // 2. Sub-tab: 3-DAY FOLLOW-UP
  // Leads whose initial send occurred and are pending Follow-up #1 (Day 3)
  const day3Leads = leads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
    return Boolean(l.initialSentDate) && (l.followupCount === 0 || l.followupCount === undefined);
  });

  // 3. Sub-tab: 7-DAY FOLLOW-UP
  // Leads whose Follow-up #1 was completed and are pending Follow-up #2 (Day 7)
  const day7Leads = leads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
    return Boolean(l.initialSentDate) && l.followupCount === 1;
  });

  // 4. Sub-tab: COMPLETED / ARCHIVED
  // Leads that replied or concluded their cadence
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
      id: 'day3',
      label: '3-Day Follow-Up',
      count: day3Leads.length,
      icon: <Zap className="w-3.5 h-3.5" />,
    },
    {
      id: 'day7',
      label: '7-Day Follow-Up',
      count: day7Leads.length,
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
            {getChannelLabel(channel)} Automated Follow-Up Schedule
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict 2-step automated sales cadence: Day 3 (Quick Check) and Day 7 (Final Loom Touch).
          </p>
        </div>

        {dueTodayLeads.length > 0 && (
          <span className="text-xs font-bold text-rose-300 bg-rose-500/20 px-3 py-1 rounded-xl border border-rose-500/30 flex items-center gap-1.5 self-start sm:self-auto animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>{dueTodayLeads.length} Actionable Today</span>
          </span>
        )}
      </div>

      {/* Internal Sub-Tabs Navigation (Strictly 4 Sub-Tabs) */}
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
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full tabular-nums ${
                  isUrgent
                    ? 'bg-rose-500 text-white font-black animate-pulse'
                    : isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-slate-400'
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
                No initial outreach or follow-ups are due today in {getChannelLabel(channel)}. Check the 3-Day and 7-Day tabs for upcoming pipeline touchpoints.
              </p>
            </div>
          ) : (
            dueTodayLeads.map((lead) => {
              const templates = getCadenceMessageTemplates(lead);
              const isInitial = !lead.initialSentDate;
              const isDay3 = lead.initialSentDate && lead.followupCount === 0;
              const targetDate = isInitial
                ? lead.scheduledDate!
                : isDay3
                ? lead.followup1Date!
                : lead.followup2Date!;
              const isOverdue = targetDate < todayStr;
              const isToday = targetDate === todayStr;
              const copyText = isInitial ? templates.initialPitch : isDay3 ? templates.day3Bump : templates.day7Loom;

              return (
                <div
                  key={lead.id}
                  className={`rounded-2xl border p-4 space-y-3 shadow-lg transition ${
                    isOverdue
                      ? 'border-rose-500/50 bg-rose-950/20'
                      : isToday
                      ? 'border-amber-500/40 bg-amber-950/20'
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
                        <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                          Initial Outreach
                        </span>
                      ) : isDay3 ? (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 font-mono">
                          ⚡ Day 3 Follow-Up
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40 font-mono">
                          🔥 Day 7 Follow-Up
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-rose-300 bg-rose-600/30 px-2 py-0.5 rounded border border-rose-500/50 font-mono">
                          Overdue ({targetDate})
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

                  {/* Pre-staged Copy Box */}
                  <div className="rounded-xl border border-white/5 bg-slate-900/90 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                      <span>Message Template</span>
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

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Target Date: {targetDate}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Non-Destructive Remove / Dismiss Button */}
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

                      <button
                        type="button"
                        onClick={() => {
                          if (isInitial) {
                            handleUpdateLeadItem(markInitialSent(lead));
                          } else if (isDay3) {
                            handleUpdateLeadItem(markFollowupSent(lead, 1));
                          } else {
                            handleUpdateLeadItem(markFollowupSent(lead, 2));
                          }
                        }}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {isInitial ? 'Mark Initial Sent' : isDay3 ? 'Mark FU 1 Sent (Day 3)' : 'Mark FU 2 Sent (Day 7)'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 2: 3-DAY FOLLOW-UP */}
      {activeCadenceTab === 'day3' && (
        <div className="space-y-3">
          {day3Leads.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
              <Zap className="w-8 h-8 text-amber-400/50 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">No leads currently in 3-Day Cadence</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                When you mark initial outreach as sent, leads automatically move here with their exact +3 day follow-up timer.
              </p>
            </div>
          ) : (
            day3Leads.map((lead) => {
              const templates = getCadenceMessageTemplates(lead);
              const fu1Date = lead.followup1Date || '';
              const diff = getDayDifference(fu1Date);
              const isDue = fu1Date <= todayStr;

              return (
                <div
                  key={lead.id}
                  className={`rounded-2xl border p-4 space-y-3 shadow-lg transition ${
                    isDue
                      ? 'border-amber-500/40 bg-amber-950/20'
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
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                        {isDue ? '⚡ Due Now (Day 3)' : `Due in ${diff} day${diff === 1 ? '' : 's'}`}
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

                  {/* Follow-up 1 Copy */}
                  <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                      <span>Follow-Up #1 Quick Bump Copy</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`${lead.id}-day3`, templates.day3Bump)}
                        className="flex items-center gap-1 text-xs text-amber-300 hover:text-white transition cursor-pointer"
                      >
                        {copiedKey === `${lead.id}-day3` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Bump</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 italic select-all font-sans leading-relaxed">
                      "{templates.day3Bump}"
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                      <span>Sent: {lead.initialSentDate}</span>
                      <span>•</span>
                      <span>FU1 Date: {fu1Date}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Non-Destructive Remove / Dismiss Button */}
                      {isLeadDismissedToday(lead) ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateLeadItem(restoreDismissedLead(lead))}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Re-include in today's active schedule"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateLeadItem(dismissLeadForToday(lead))}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Remove from today's queue (lead remains safely in your database)"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}

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
                        <span>Mark FU 1 Sent (Day 3)</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 3: 7-DAY FOLLOW-UP */}
      {activeCadenceTab === 'day7' && (
        <div className="space-y-3">
          {day7Leads.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
              <Flame className="w-8 h-8 text-rose-400/50 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">No leads currently in 7-Day Cadence</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                After completing Follow-Up #1, prospects advance here for their final 7-Day video touch.
              </p>
            </div>
          ) : (
            day7Leads.map((lead) => {
              const templates = getCadenceMessageTemplates(lead);
              const fu2Date = lead.followup2Date || '';
              const diff = getDayDifference(fu2Date);
              const isDue = fu2Date <= todayStr;

              return (
                <div
                  key={lead.id}
                  className={`rounded-2xl border p-4 space-y-3 shadow-lg transition ${
                    isDue
                      ? 'border-rose-500/40 bg-rose-950/20'
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
                      <span className="text-[10px] font-bold text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30 font-mono">
                        {isDue ? '🔥 Due Now (Day 7 Final)' : `Due in ${diff} day${diff === 1 ? '' : 's'}`}
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

                  {/* Follow-up 2 Copy */}
                  <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-rose-300">
                      <span>Follow-Up #2 (Day 7 Loom Screen Recording Touch)</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`${lead.id}-day7`, templates.day7Loom)}
                        className="flex items-center gap-1 text-xs text-rose-300 hover:text-white transition cursor-pointer"
                      >
                        {copiedKey === `${lead.id}-day7` ? (
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
                      "{templates.day7Loom}"
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                      <span>FU1 Sent: {lead.followup1SentDate || 'Done'}</span>
                      <span>•</span>
                      <span>FU2 Target: {fu2Date}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Non-Destructive Remove / Dismiss Button */}
                      {isLeadDismissedToday(lead) ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateLeadItem(restoreDismissedLead(lead))}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Re-include in today's active schedule"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateLeadItem(dismissLeadForToday(lead))}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Remove from today's queue (lead remains safely in your database)"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}

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
                        className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Complete Cadence (Day 7)</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 4: COMPLETED / ARCHIVED */}
      {activeCadenceTab === 'completed' && (
        <div className="space-y-3">
          {completedLeads.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
              <Archive className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">No completed or archived leads yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Leads that reply or complete their full 2-step follow-up cadence will appear in this archive.
              </p>
            </div>
          ) : (
            completedLeads.map((lead) => {
              const isReplied = lead.leadStatus === 'replied';

              return (
                <div
                  key={lead.id}
                  className="rounded-2xl border border-white/[0.06] bg-slate-950/60 p-4 space-y-2 opacity-85 hover:opacity-100 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {lead.id}
                      </span>
                      <h3 className="font-bold text-white text-sm sm:text-base font-['Outfit']">
                        {lead.name}
                      </h3>
                      {isReplied ? (
                        <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                          <CheckCheck className="w-3 h-3 text-emerald-400" />
                          <span>Replied!</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
                          <Check className="w-3 h-3 text-indigo-400" />
                          <span>Cadence Finished</span>
                        </span>
                      )}
                    </div>

                    <a
                      href={lead.link.startsWith('http') ? lead.link : `https://${lead.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition px-2 py-1 rounded bg-white/5"
                    >
                      <span className="truncate max-w-xs">{lead.link}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-white/5">
                    <span>
                      {lead.completedAt
                        ? `Concluded on ${new Date(lead.completedAt).toLocaleDateString()}`
                        : 'Archived'}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateLeadItem({
                          ...lead,
                          isCompleted: false,
                          leadStatus: 'waiting_reply',
                        })
                      }
                      className="text-xs text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Re-open Cadence</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
