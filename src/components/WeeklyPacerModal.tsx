import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  CheckCircle2,
  Flame,
  ArrowRight,
  RefreshCw,
  Sliders,
  Send,
  Users,
  ChevronRight,
  ExternalLink,
  CalendarDays,
} from 'lucide-react';
import { Lead, Weekday } from '../types';
import {
  WEEKDAYS,
  WEEKDAY_CONFIG,
  getTodayWeekday,
  getCurrentWeekKey,
  getNextWeekKey,
  formatWeekLabel,
  normalizeLeadWeek,
  autoPaceLeads,
} from '../utils/weeklyScheduler';

interface WeeklyPacerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  onApplyPacing: (pacedLeads: Lead[]) => void;
  onRescheduleLead?: (leadId: number, newDay: Weekday, targetWeek?: string) => void;
  onSelectLeadForCopilot?: (lead: Lead) => void;
  onViewDetails?: (lead: Lead) => void;
  initialWeekKey?: string;
}

export const WeeklyPacerModal: React.FC<WeeklyPacerModalProps> = ({
  isOpen,
  onClose,
  leads,
  onApplyPacing,
  onRescheduleLead,
  onSelectLeadForCopilot,
  onViewDetails,
  initialWeekKey,
}) => {
  const currentWeekKey = getCurrentWeekKey();
  const nextWeekKey = getNextWeekKey();

  const [dailyQuota, setDailyQuota] = useState<number>(10);
  const [activeDayTab, setActiveDayTab] = useState<Weekday | 'ALL'>('ALL');
  const [targetWeekKey, setTargetWeekKey] = useState<string>(initialWeekKey || currentWeekKey);

  if (!isOpen) return null;

  const todayWeekday = getTodayWeekday();
  const isCurrentWeek = targetWeekKey === currentWeekKey;

  // Leads for the selected target week
  const weekLeads = leads.filter((l) => normalizeLeadWeek(l) === targetWeekKey);

  // Group leads by weekday for the selected target week
  const leadsByDay: Record<Weekday, Lead[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };

  const unassigned: Lead[] = [];

  // Categorize: leads already assigned to this target week
  weekLeads.forEach((l) => {
    if (l.scheduledDay && WEEKDAYS.includes(l.scheduledDay)) {
      leadsByDay[l.scheduledDay].push(l);
    } else {
      unassigned.push(l);
    }
  });

  // Leads in pipeline with no day assigned at all
  leads.forEach((l) => {
    if (!l.scheduledDay || !WEEKDAYS.includes(l.scheduledDay)) {
      if (!unassigned.some((u) => u.id === l.id)) {
        unassigned.push(l);
      }
    }
  });

  const totalScheduled = WEEKDAYS.reduce((sum, d) => sum + leadsByDay[d].length, 0);

  const handleExecuteAutoPace = (mode: 'all' | 'unassigned_only') => {
    const updated = autoPaceLeads(leads, dailyQuota, mode, targetWeekKey);
    onApplyPacing(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-indigo-500/30 bg-slate-900 shadow-2xl overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
              <Calendar className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white font-['Outfit']">
                  70-Lead Weekly Pacer & Daily Quota Scheduler
                </h3>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-black text-emerald-300 border border-emerald-500/30">
                  {dailyQuota} LEADS / DAY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Organize leads across Monday through Sunday into batches. Separate weeks so next week's assignments never collide with this week!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Bar & Quick Auto-Pacer */}
        <div className="p-4 sm:p-5 border-b border-white/5 bg-slate-950/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Target Week Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-xl p-1 text-xs">
              <span className="text-slate-400 font-semibold px-2 flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-indigo-400" />
                Target Week:
              </span>
              <button
                type="button"
                onClick={() => setTargetWeekKey(currentWeekKey)}
                className={`rounded-lg px-2.5 py-1 font-bold transition cursor-pointer ${
                  targetWeekKey === currentWeekKey
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                This Week (Current)
              </button>
              <button
                type="button"
                onClick={() => setTargetWeekKey(nextWeekKey)}
                className={`rounded-lg px-2.5 py-1 font-bold transition cursor-pointer ${
                  targetWeekKey === nextWeekKey
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Next Week (Planning)
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-400 font-semibold">Quota:</span>
              {[5, 10, 14].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setDailyQuota(q)}
                  className={`rounded-lg px-2 py-0.5 font-bold transition cursor-pointer ${
                    dailyQuota === q
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {q}/day
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg">
                {totalScheduled} in {formatWeekLabel(targetWeekKey, true)}
              </span>
              {unassigned.length > 0 && (
                <span className="font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                  {unassigned.length} Unassigned
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExecuteAutoPace('all')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Auto-Pace {formatWeekLabel(targetWeekKey, true)} ({dailyQuota}/Day)</span>
            </button>

            {unassigned.length > 0 && (
              <button
                type="button"
                onClick={() => handleExecuteAutoPace('unassigned_only')}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-2 text-xs font-bold text-amber-300 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Fill Unassigned ({unassigned.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* 7-Day Matrix Overview Strip for Target Week */}
        <div className="p-4 sm:p-5 border-b border-white/5 bg-slate-900/40">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {WEEKDAYS.map((wDay) => {
              const config = WEEKDAY_CONFIG[wDay];
              const dayLeads = leadsByDay[wDay] || [];
              const count = dayLeads.length;
              const isToday = isCurrentWeek && wDay === todayWeekday;
              const isSelected = activeDayTab === wDay;
              const isFull = count >= dailyQuota;

              return (
                <button
                  key={wDay}
                  type="button"
                  onClick={() => setActiveDayTab(activeDayTab === wDay ? 'ALL' : wDay)}
                  className={`rounded-2xl p-3 text-left transition border cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/50 shadow-lg shadow-indigo-950/60 ring-2 ring-indigo-500/40'
                      : isToday
                      ? 'border-amber-500/50 bg-amber-950/20 hover:border-amber-500'
                      : 'border-white/5 bg-slate-950/40 hover:border-white/20'
                  }`}
                >
                  {isToday && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-0.5">
                      <Flame className="h-2.5 w-2.5 fill-slate-950" />
                      TODAY
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`h-2 w-2 rounded-full ${config.dotColor}`} />
                    <span className="text-xs font-black text-white">{wDay}</span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-black text-white">
                      {count} <span className="text-[11px] text-slate-400 font-normal">/ {dailyQuota}</span>
                    </span>
                    <span className={`text-[10px] font-bold ${isFull ? 'text-emerald-400' : 'text-slate-400'}`}>
                      Batch #{config.batchNum}
                    </span>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isFull ? 'bg-emerald-500' : isToday ? 'bg-amber-400' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min((count / dailyQuota) * 100, 100)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Leads Breakdown & Management Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Viewing:
              </span>
              <span className="text-sm font-black text-white">
                {activeDayTab === 'ALL'
                  ? `All 7 Days (${formatWeekLabel(targetWeekKey)})`
                  : `${activeDayTab}'s Batch (${formatWeekLabel(targetWeekKey, true)})`}
              </span>
              {isCurrentWeek && activeDayTab === todayWeekday && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Flame className="h-3 w-3 text-amber-400" />
                  TODAY'S TARGET WORKLIST
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveDayTab('ALL')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  activeDayTab === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Days
              </button>
              {WEEKDAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDayTab(d)}
                  className={`rounded-lg px-2 py-1 text-xs font-semibold transition cursor-pointer ${
                    activeDayTab === d
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {WEEKDAY_CONFIG[d].short}
                </button>
              ))}
            </div>
          </div>

          {/* Cards for Days */}
          <div className="space-y-4">
            {WEEKDAYS.filter((d) => activeDayTab === 'ALL' || activeDayTab === d).map((wDay) => {
              const config = WEEKDAY_CONFIG[wDay];
              const dayLeads = [...(leadsByDay[wDay] || [])].sort((a, b) => {
                const statA = a.status === 'sent' ? 1 : a.status === 'not_sent' ? 2 : 3;
                const statB = b.status === 'sent' ? 1 : b.status === 'not_sent' ? 2 : 3;
                if (statA !== statB) return statA - statB;
                return b.id - a.id;
              });
              const isToday = isCurrentWeek && wDay === todayWeekday;

              return (
                <div
                  key={wDay}
                  className={`rounded-2xl border transition p-4 sm:p-5 ${
                    isToday
                      ? 'border-amber-500/30 bg-amber-950/10 shadow-lg shadow-amber-950/20'
                      : 'border-white/5 bg-slate-950/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-3 w-3 rounded-full ${config.dotColor}`} />
                      <h4 className="text-base font-black text-white font-['Outfit'] flex items-center gap-2">
                        {wDay} • Batch #{config.batchNum}
                        {isToday && (
                          <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-300 border border-amber-500/30">
                            TODAY
                          </span>
                        )}
                      </h4>
                      <span className="text-xs text-slate-400">
                        ({dayLeads.length} / {dailyQuota} target for {formatWeekLabel(targetWeekKey, true)})
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      {dayLeads.length === 0 ? (
                        <span className="text-rose-400 font-semibold">⚠️ 0 leads assigned to {wDay}</span>
                      ) : dayLeads.length < dailyQuota ? (
                        <span className="text-amber-400 font-semibold">{dailyQuota - dayLeads.length} more leads needed to reach {dailyQuota}</span>
                      ) : (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Full {dailyQuota}-Lead Batch Ready
                        </span>
                      )}
                    </div>
                  </div>

                  {dayLeads.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No leads scheduled for {wDay} in {formatWeekLabel(targetWeekKey, true)}. Click "Auto-Pace {formatWeekLabel(targetWeekKey, true)}" above to balance this week's queue.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {dayLeads.map((lead, idx) => (
                        <div
                          key={lead.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-900/60 p-3 hover:border-white/20 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[11px] font-mono font-bold text-slate-300">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate">
                                {lead.restaurantName}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {lead.city} • <span className="text-indigo-400">{lead.handle}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {onRescheduleLead && (
                              <select
                                value={`${normalizeLeadWeek(lead)}:${lead.scheduledDay || wDay}`}
                                onChange={(e) => {
                                  const [wk, d] = e.target.value.split(':');
                                  onRescheduleLead(lead.id, d as Weekday, wk);
                                }}
                                className="rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                              >
                                <optgroup label={`This Week`}>
                                  {WEEKDAYS.map((targetDay) => (
                                    <option key={`current:${targetDay}`} value={`${currentWeekKey}:${targetDay}`}>
                                      {targetDay.slice(0, 3)} (This Wk)
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label={`Next Week`}>
                                  {WEEKDAYS.map((targetDay) => (
                                    <option key={`next:${targetDay}`} value={`${nextWeekKey}:${targetDay}`}>
                                      {targetDay.slice(0, 3)} (Next Wk)
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            )}

                            {onSelectLeadForCopilot && (
                              <button
                                type="button"
                                title="Open in Pitch Copilot"
                                onClick={() => {
                                  onSelectLeadForCopilot(lead);
                                  onClose();
                                }}
                                className="rounded-lg bg-indigo-600/30 hover:bg-indigo-600 p-1.5 text-indigo-300 hover:text-white transition cursor-pointer"
                              >
                                <Send className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Scheduling for <strong className="text-white">{formatWeekLabel(targetWeekKey)}</strong>. Pacing keeps daily workloads sustainable and prevents week collisions.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white transition shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
