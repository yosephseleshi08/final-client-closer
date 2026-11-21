import React, { useState } from 'react';
import {
  Calendar,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Check,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import { getChannelLabel, getPlatformLink, getLeadEmail } from '../../utils/channelStorage';
import {
  getLocalTodayStr,
  addDays,
  normalizeToLocalDateStr,
  isDateToday,
  autoScheduleLeads,
  getScheduleDayStyle,
} from '../../utils/cadenceEngine';

interface ScheduleSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
}

export function ScheduleSubPage({ channel, leads, onUpdateLeads }: ScheduleSubPageProps) {
  const todayStr = getLocalTodayStr();
  const [autoScheduledToast, setAutoScheduledToast] = useState(false);

  const handleDateChange = (leadId: string, newDate: string) => {
    const normalized = normalizeToLocalDateStr(newDate);
    const updated = leads.map((l) => {
      if (l.id === leadId) {
        return {
          ...l,
          scheduledDate: normalized || undefined,
          dismissedDate: undefined,
        };
      }
      return l;
    });
    onUpdateLeads(updated);
  };

  const handleQuickSet = (leadId: string, daysAhead: number) => {
    const targetDateStr = addDays(todayStr, daysAhead);
    handleDateChange(leadId, targetDateStr);
  };

  const handleAutoSchedule = () => {
    const scheduled = autoScheduleLeads(leads, channel);
    onUpdateLeads(scheduled);
    setAutoScheduledToast(true);
    setTimeout(() => setAutoScheduledToast(false), 2500);
  };

  const scheduledCount = leads.filter((l) => Boolean(l.scheduledDate)).length;
  const dailyQuota = channel === 'instagram' ? 6 : 4;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white font-['Outfit']">
            {getChannelLabel(channel)} Dispatch Planner &amp; Date Assignment
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Assign outreach dates or auto-distribute {dailyQuota} leads/day starting tomorrow (Sundays &amp; frozen days automatically skipped).
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-xs font-mono text-slate-400">
            Scheduled:{' '}
            <span className="text-indigo-400 font-bold">{scheduledCount}</span> / {leads.length}
          </div>
          {leads.length > 0 && (
            <button
              type="button"
              onClick={handleAutoSchedule}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                autoScheduledToast
                  ? 'bg-emerald-600 text-white shadow-emerald-600/25'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
              }`}
            >
              {autoScheduledToast ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Auto-Scheduled!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Schedule ({dailyQuota}/day)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No leads to schedule</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add leads in the &quot;Leads&quot; sub-tab first to assign their outreach dates.
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
                  <th className="py-3 px-4 text-left w-60">Assigned Date</th>
                  <th className="py-3 px-4 text-right">Quick Presets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leads.map((lead) => {
                  const hasDate = Boolean(lead.scheduledDate);
                  const isToday = isDateToday(lead.scheduledDate);
                  const dayStyle = getScheduleDayStyle(lead.scheduledDate);
                  const cleanEmail = getLeadEmail(lead);
                  const href = getPlatformLink(cleanEmail || lead, cleanEmail ? 'email' : channel);

                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 text-left font-mono text-xs tabular-nums">
                        <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                          {lead.id}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-left">
                        <div className="font-medium text-sm text-slate-100 font-['Outfit'] truncate max-w-xs">
                          {lead.name}
                        </div>
                        {href && (
                          <a
                            href={href}
                            target={href.startsWith('mailto:') ? '_self' : '_blank'}
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition-colors mt-0.5 truncate max-w-xs"
                          >
                            <span className="truncate">{cleanEmail || lead.link}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center gap-2">
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
                          {dayStyle?.dayName && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${dayStyle.badgeClass}`}>
                              {dayStyle.dayName}
                            </span>
                          )}
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

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickSet(lead.id, 0)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickSet(lead.id, 1)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                          >
                            Tomorrow
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickSet(lead.id, 3)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                          >
                            +3 Days
                          </button>
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
