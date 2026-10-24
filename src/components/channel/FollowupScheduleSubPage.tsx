import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  ExternalLink,
  Check,
  Filter,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import { getChannelLabel } from '../../utils/channelStorage';

interface FollowupScheduleSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
  onNavigateToSchedule: () => void;
}

export function FollowupScheduleSubPage({
  channel,
  leads,
  onUpdateLeads,
  onNavigateToSchedule,
}: FollowupScheduleSubPageProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');

  const todayStr = new Date().toISOString().split('T')[0];

  // Only consider leads with an assigned scheduledDate
  const scheduledLeads = leads
    .filter((l) => Boolean(l.scheduledDate))
    .sort((a, b) => {
      const dateA = a.scheduledDate || '';
      const dateB = b.scheduledDate || '';
      return dateA.localeCompare(dateB);
    });

  const handleToggleCompleted = (leadId: string) => {
    const updated = leads.map((l) => {
      if (l.id === leadId) {
        const isNowCompleted = !l.isCompleted;
        return {
          ...l,
          isCompleted: isNowCompleted,
          completedAt: isNowCompleted ? new Date().toISOString() : undefined,
        };
      }
      return l;
    });
    onUpdateLeads(updated);
  };

  const getDayDiff = (dateStr: string) => {
    const target = new Date(dateStr).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    const diffMs = target - today;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  };

  const overdueCount = scheduledLeads.filter(
    (l) => !l.isCompleted && l.scheduledDate! < todayStr
  ).length;

  const dueTodayCount = scheduledLeads.filter(
    (l) => !l.isCompleted && l.scheduledDate === todayStr
  ).length;

  const filteredList = scheduledLeads.filter((l) => {
    if (filterMode === 'pending') return !l.isCompleted;
    if (filterMode === 'completed') return l.isCompleted;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header and Alert Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white font-['Outfit']">
            {getChannelLabel(channel)} Follow-Up Chronology & Dispatch Queue
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Leads sorted chronologically by dispatch date. Immediate visual alerts for today and overdue outreach.
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-white/10 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({scheduledLeads.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterMode === 'pending'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending ({scheduledLeads.filter((l) => !l.isCompleted).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('completed')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterMode === 'completed'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Completed ({scheduledLeads.filter((l) => l.isCompleted).length})
          </button>
        </div>
      </div>

      {/* Critical Overdue / Due Today Alert Banner if applicable */}
      {(overdueCount > 0 || dueTodayCount > 0) && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/40 backdrop-blur-md flex items-center justify-between gap-4 animate-pulse-slow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-200">
                Action Required in {getChannelLabel(channel)} Queue
              </h3>
              <p className="text-xs text-rose-300/80">
                {overdueCount > 0 && `${overdueCount} lead${overdueCount > 1 ? 's are' : ' is'} OVERDUE. `}
                {dueTodayCount > 0 && `${dueTodayCount} lead${dueTodayCount > 1 ? 's are' : ' is'} scheduled for TODAY.`}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 shrink-0">
            {overdueCount + dueTodayCount} Urgent
          </span>
        </div>
      )}

      {/* List / Table */}
      {scheduledLeads.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No scheduled follow-ups yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
            Assign planned outreach dates to your leads in the "Schedule" sub-tab to see them chronologically here.
          </p>
          <button
            type="button"
            onClick={onNavigateToSchedule}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
          >
            Go to Schedule Sub-Page
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-8 text-center text-slate-500 text-xs">
          No leads match the "{filterMode}" status filter.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredList.map((lead) => {
            const dateStr = lead.scheduledDate!;
            const isCompleted = Boolean(lead.isCompleted);
            const isOverdue = !isCompleted && dateStr < todayStr;
            const isToday = !isCompleted && dateStr === todayStr;
            const diffDays = getDayDiff(dateStr);

            return (
              <div
                key={lead.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCompleted
                    ? 'border-white/[0.06] bg-slate-900/30 opacity-75'
                    : isOverdue
                    ? 'border-rose-500/60 bg-rose-950/30 shadow-lg shadow-rose-950/20'
                    : isToday
                    ? 'border-rose-500/50 bg-rose-950/20 shadow-md shadow-rose-950/10'
                    : 'border-white/[0.08] bg-slate-900/50 hover:bg-slate-900/80'
                }`}
              >
                {/* Left: Checkbox + Lead Info */}
                <div className="flex items-start sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleCompleted(lead.id)}
                    className={`mt-0.5 sm:mt-0 w-6 h-6 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : isOverdue || isToday
                        ? 'border-rose-500/60 hover:border-rose-400 bg-rose-950/40 text-transparent hover:text-rose-400'
                        : 'border-white/20 hover:border-indigo-400 bg-white/5 text-transparent hover:text-slate-400'
                    }`}
                    title={isCompleted ? 'Mark as Pending' : 'Mark as Sent/Completed'}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {lead.id}
                      </span>
                      <span className="text-sm font-bold text-slate-100 font-['Outfit']">
                        {lead.name}
                      </span>

                      {/* Visual Alert Badge */}
                      {isCompleted ? (
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Sent & Completed</span>
                        </span>
                      ) : isOverdue ? (
                        <span className="text-[11px] font-bold text-rose-300 bg-rose-600/30 px-2.5 py-0.5 rounded border border-rose-500/50 flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          <span>OVERDUE ({Math.abs(diffDays)}d ago)</span>
                        </span>
                      ) : isToday ? (
                        <span className="text-[11px] font-bold text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded border border-rose-500/40 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-rose-400" />
                          <span>DUE TODAY</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          In {diffDays} days
                        </span>
                      )}
                    </div>

                    <a
                      href={lead.link.startsWith('http') ? lead.link : `https://${lead.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-400 transition-colors"
                    >
                      <span className="truncate max-w-sm">{lead.link}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>

                {/* Right: Date Display & Action */}
                <div className="flex items-center gap-4 sm:justify-end shrink-0 pl-9 sm:pl-0">
                  <div className="text-right">
                    <div
                      className={`text-xs font-mono font-bold tabular-nums ${
                        isCompleted
                          ? 'text-slate-400 line-through'
                          : isOverdue || isToday
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    {lead.completedAt && (
                      <div className="text-[10px] text-slate-500">
                        Finished {new Date(lead.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleCompleted(lead.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                      isCompleted
                        ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                        : isOverdue || isToday
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isCompleted ? 'Completed' : 'Mark as Sent'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
