import React, { useState } from 'react';
import {
  Calendar,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Rocket,
  CheckCircle2,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import { getChannelLabel } from '../../utils/channelStorage';
import {
  getLocalTodayStr,
  normalizeToLocalDateStr,
  isDateToday,
  autoScheduleLeads,
  getScheduleDayStyle,
} from '../../utils/cadenceEngine';
import { formatDisplayDate } from '../../utils/historyStorage';

interface ScheduleSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
}

export function ScheduleSubPage({ channel, leads, onUpdateLeads }: ScheduleSubPageProps) {
  const todayStr = getLocalTodayStr();
  const [scheduledBannerMsg, setScheduledBannerMsg] = useState<string | null>(null);

  const handleDateChange = (leadId: string, newDate: string) => {
    const normalized = normalizeToLocalDateStr(newDate);
    const updated = leads.map((l) => {
      if (l.id === leadId) {
        return {
          ...l,
          scheduledDate: normalized || undefined,
          warmupStatus: normalized ? (l.warmupStatus || (l.isWarmedUp ? 'warmed' : 'locked')) : undefined,
          dismissedDate: undefined, // Clear any prior dismissal when rescheduling
        };
      }
      return l;
    });
    onUpdateLeads(updated);
  };

  /**
   * Auto-Schedule Algorithm: Flat Capacity Model
   * Strictly enforces daily quotas and protects Sunday rest:
   * - Instagram: 6 leads / day
   * - Combined Outreach (Email/Facebook): 4 leads / day
   * - Sunday Rule: SKIPS Sundays entirely. If today is Sunday, first scheduled date is Monday!
   * - Staggers all 27+ leads across Mon, Tue, Wed, Thu, Fri, Sat, (skip Sun), Mon...
   */
  const handleAutoSchedule = () => {
    if (leads.length === 0) {
      setScheduledBannerMsg('No leads available in this workspace.');
      setTimeout(() => setScheduledBannerMsg(null), 3500);
      return;
    }

    const dailyQuota = channel === 'instagram' ? 6 : 4;
    const updated = autoScheduleLeads(leads, channel);
    onUpdateLeads(updated);

    const unsentCount = updated.filter((l) => !l.initialSentDate && l.scheduledDate).length;
    setScheduledBannerMsg(
      `🚀 Auto-scheduled ${unsentCount} leads: strictly ${dailyQuota}/day, Sundays skipped (staggered across weekdays starting Monday)!`
    );
    setTimeout(() => setScheduledBannerMsg(null), 4500);
  };

  const scheduledCount = leads.filter((l) => !!l.scheduledDate).length;
  const unscheduledCount = leads.length - scheduledCount;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
            <span>{getChannelLabel(channel)} Dispatch Planner</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Flat Capacity Model: {channel === 'instagram' ? 'Target 6 leads/day' : 'Target 4 leads/day'} from Day 1 · Global Quota: 10 Combined Touchpoints/Day (Sundays rest).
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <div className="text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/10">
            Scheduled: <span className="text-indigo-400 font-bold">{scheduledCount}</span> / {leads.length}
            {unscheduledCount > 0 && (
              <span className="text-amber-400 ml-1.5">({unscheduledCount} unscheduled)</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAutoSchedule}
            disabled={leads.length === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95"
            title="Auto-schedule all unscheduled leads along the growth curve (skips Sundays)"
          >
            <Rocket className="w-4 h-4 text-amber-300" />
            <span>🚀 Auto-Schedule</span>
          </button>
        </div>
      </div>

      {/* Confirmation Notification Banner */}
      {scheduledBannerMsg && (
        <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{scheduledBannerMsg}</span>
        </div>
      )}

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No leads to schedule</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add leads in the "Leads" sub-tab first to assign their outreach dates.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 text-left w-32">Lead ID</th>
                  <th className="py-3 px-4 text-left">Prospect Name</th>
                  <th className="py-3 px-4 text-left">Profile Link</th>
                  <th className="py-3 px-4 text-right w-64">Assigned Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leads.map((lead) => {
                  const hasDate = Boolean(lead.scheduledDate);
                  const isToday = isDateToday(lead.scheduledDate);

                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* ID */}
                      <td className="py-3.5 px-4 text-left font-mono text-xs tabular-nums">
                        <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                          {lead.id}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4 text-left">
                        <div className="font-medium text-sm text-slate-100 font-['Outfit'] truncate max-w-xs">
                          {lead.name}
                        </div>
                      </td>

                      {/* Link */}
                      <td className="py-3.5 px-4 text-left text-xs text-slate-400">
                        <a
                          href={lead.link.startsWith('http') ? lead.link : `https://${lead.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition-colors truncate max-w-xs"
                        >
                          <span className="truncate">{lead.link}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>

                      {/* Date Picker Input & Staggered Day Badge */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {hasDate && (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono border ${getScheduleDayStyle(lead.scheduledDate).badgeClass}`}
                              title={`Scheduled for ${getScheduleDayStyle(lead.scheduledDate).dayName} (${lead.scheduledDate})`}
                            >
                              <span>{getScheduleDayStyle(lead.scheduledDate).dayShort}</span>
                              <span className="opacity-75">· {formatDisplayDate(lead.scheduledDate!)}</span>
                            </span>
                          )}
                          <input
                            type="date"
                            value={lead.scheduledDate || ''}
                            onChange={(e) => handleDateChange(lead.id, e.target.value)}
                            className={`px-3 py-1.5 bg-slate-950 border rounded-lg text-xs font-mono tabular-nums text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                              hasDate
                                ? isToday
                                  ? 'border-amber-500/50 bg-amber-500/5 text-amber-200'
                                  : 'border-indigo-500/40 bg-indigo-500/5 text-indigo-200'
                                : 'border-white/10'
                            }`}
                          />
                          {hasDate && (
                            <button
                              type="button"
                              onClick={() => handleDateChange(lead.id, '')}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-white/5 transition-colors cursor-pointer"
                              title="Clear date"
                              aria-label={`Clear date for ${lead.id}`}
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
