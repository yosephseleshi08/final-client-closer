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
} from '../../utils/cadenceEngine';

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
   * Auto-Schedule Algorithm:
   * Takes all unscheduled leads and assigns them dates based on:
   * - Start Date: Starts TOMORROW (not today), so today can be used to warm up tomorrow's leads.
   * - Days 1-3: 3 leads per day
   * - Days 4-6: 4 leads per day
   * - Days 7-9: 5 leads per day
   * - Day 10+: 6 leads per day
   * - Sunday Rule: If assigned date falls on Sunday, skip Sunday and assign to Monday.
   * - Facebook Logic: Facebook always ramps at 3 leads/day from day one (flat 3/day, skipping Sundays).
   * - Existing Data: Do not break existing scheduled leads. Only fill in the gaps for unscheduled leads.
   * - Warm-Up Lock: Newly scheduled leads default to warmupStatus: 'locked'.
   */
  const handleAutoSchedule = () => {
    const unscheduledLeads = leads.filter((l) => !l.scheduledDate);
    if (unscheduledLeads.length === 0) {
      setScheduledBannerMsg('All leads are already scheduled! No unscheduled leads to assign.');
      setTimeout(() => setScheduledBannerMsg(null), 3500);
      return;
    }

    // Map existing assignments to avoid breaking or exceeding day caps
    const countsByDate: Record<string, number> = {};
    leads.forEach((l) => {
      if (l.scheduledDate) {
        countsByDate[l.scheduledDate] = (countsByDate[l.scheduledDate] || 0) + 1;
      }
    });

    // Start from TOMORROW in local time (protects today for warming up)
    const [year, month, day] = todayStr.split('-').map(Number);
    const cursor = new Date(year, month - 1, day + 1);

    let outreachDayIndex = 1;
    let unscheduledIndex = 0;
    const assignments: Record<string, string> = {};

    while (unscheduledIndex < unscheduledLeads.length) {
      // Sunday Rule: 0 = Sunday. Sunday is rest, skip to Monday.
      if (cursor.getDay() === 0) {
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      // Calculate quota for this outreach day
      let dailyQuota: number;
      if (channel === 'facebook') {
        dailyQuota = 3; // Flat 3/day from day one
      } else {
        if (outreachDayIndex <= 3) {
          dailyQuota = 3;
        } else if (outreachDayIndex <= 6) {
          dailyQuota = 4;
        } else if (outreachDayIndex <= 9) {
          dailyQuota = 5;
        } else {
          dailyQuota = 6;
        }
      }

      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const existingCount = countsByDate[dateStr] || 0;
      const availableCapacity = Math.max(0, dailyQuota - existingCount);

      for (let i = 0; i < availableCapacity && unscheduledIndex < unscheduledLeads.length; i++) {
        const lead = unscheduledLeads[unscheduledIndex];
        assignments[lead.id] = dateStr;
        countsByDate[dateStr] = (countsByDate[dateStr] || 0) + 1;
        unscheduledIndex++;
      }

      // Advance to next calendar day
      cursor.setDate(cursor.getDate() + 1);
      outreachDayIndex++;
    }

    const updated = leads.map((l) => {
      if (assignments[l.id]) {
        return {
          ...l,
          scheduledDate: assignments[l.id],
          warmupStatus: l.warmupStatus || (l.isWarmedUp ? 'warmed' : 'locked'),
          dismissedDate: undefined,
        };
      }
      return l;
    });

    onUpdateLeads(updated);
    setScheduledBannerMsg(
      `🚀 Auto-scheduled ${unscheduledLeads.length} leads across the ramp curve (Sundays protected)!`
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
            {channel === 'facebook'
              ? 'Facebook Ramp: Flat 3 leads/day from day one (Sundays skipped).'
              : 'Growth Curve: Days 1-3 (3/day) · Days 4-6 (4/day) · Days 7-9 (5/day) · Day 10+ (6/day) · Sundays rest.'}
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

                      {/* Date Picker Input (Quick Presets removed) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
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
