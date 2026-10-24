import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  Send,
  Sparkles,
  Facebook,
  Instagram,
  Mail,
  Flame,
  ArrowRight,
  Filter,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Trash2,
  Edit3,
  Save,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { Lead, Weekday } from '../types';
import { DayBadge } from './DayBadge';
import { MockupVault } from './MockupVault';
import { getDefaultStagedMessages } from '../utils/stagedMessageHelper';
import {
  WEEKDAYS,
  WEEKDAY_CONFIG,
  getTodayWeekday,
  getCurrentWeekKey,
  getNextWeekKey,
  getPreviousWeekKey,
  formatWeekLabel,
  normalizeLeadWeek,
} from '../utils/weeklyScheduler';
import {
  sortLeadsDeterministically,
  LeadSortMode,
  STATUS_ACTION_PRIORITY,
  WEEKDAY_PRIORITY_ORDER,
} from '../utils/leadSortHelper';

export { STATUS_ACTION_PRIORITY as STATUS_PRIORITY_ORDER, WEEKDAY_PRIORITY_ORDER };

interface WeeklyDispatchBoardProps {
  leads: Lead[];
  onUpdateLead?: (updatedLead: Lead) => void;
  onUpdateStatus: (leadId: number, status: Lead['status']) => void;
  onLogFollowupSent: (leadId: number) => void;
  onDeleteLead?: (leadId: number) => void;
  onOpenMockup?: (lead: Lead) => void;
  onViewDetails?: (lead: Lead) => void;
  onSelectLeadForCopilot?: (lead: Lead) => void;
  onRescheduleLead?: (leadId: number, newDay: Weekday, targetWeek?: string) => void;
  onAutoDistributeUnassigned?: (targetWeek?: string) => void;
  onOpenWeeklyPacer?: (targetWeek?: string) => void;
}

export const WeeklyDispatchBoard: React.FC<WeeklyDispatchBoardProps> = ({
  leads,
  onUpdateLead,
  onUpdateStatus,
  onLogFollowupSent,
  onDeleteLead,
  onOpenMockup,
  onViewDetails,
  onSelectLeadForCopilot,
  onRescheduleLead,
  onAutoDistributeUnassigned,
  onOpenWeeklyPacer,
}) => {
  const todayWeekday = getTodayWeekday();
  const currentWeekKey = getCurrentWeekKey();
  const nextWeekKey = getNextWeekKey();

  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(currentWeekKey);
  const [viewMode, setViewMode] = useState<'selected_week' | 'all_weeks'>('selected_week');
  const [selectedDay, setSelectedDay] = useState<Weekday | 'ALL'>(todayWeekday);
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'Facebook' | 'Instagram' | 'Email'>('ALL');
  const [sortOrder, setSortOrder] = useState<LeadSortMode>('latest_paste');
  const [mockupModalLead, setMockupModalLead] = useState<Lead | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingPitchLeadId, setEditingPitchLeadId] = useState<number | null>(null);
  const [pitchDraft, setPitchDraft] = useState<string>('');

  const isCurrentWeek = selectedWeekKey === currentWeekKey;
  const isNextWeek = selectedWeekKey === nextWeekKey;

  // Filter leads by week mode
  const activeLeads = viewMode === 'all_weeks'
    ? leads
    : leads.filter((l) => normalizeLeadWeek(l) === selectedWeekKey);

  // Group active leads by weekday
  const leadsByDay: Record<Weekday, Lead[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };

  const unassignedLeads: Lead[] = [];

  activeLeads.forEach((l) => {
    if (l.scheduledDay && WEEKDAYS.includes(l.scheduledDay)) {
      leadsByDay[l.scheduledDay].push(l);
    } else {
      unassignedLeads.push(l);
    }
  });

  const getFilteredLeadsForDay = (day: Weekday) => {
    let list = leadsByDay[day] || [];
    if (channelFilter !== 'ALL') {
      list = list.filter((l) => l.platform.toLowerCase() === channelFilter.toLowerCase());
    }
    return sortLeadsDeterministically(list, sortOrder);
  };

  const handleCopyPitch = (lead: Lead) => {
    const pitch = lead.pitchHook || `Hey! Checked out ${lead.restaurantName} and put together an instant 0.3s direct ordering demo: ${lead.mockupLink}. Waiving our $299 fee to $0 for 3 local spots in exchange for a review. Want me to turn it live?`;
    navigator.clipboard.writeText(pitch);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalWeeklySourced = WEEKDAYS.reduce((sum, d) => sum + (leadsByDay[d]?.length || 0), 0);
  const totalWeeklySent = WEEKDAYS.reduce(
    (sum, d) => sum + (leadsByDay[d]?.filter((l) => l.status !== 'not_sent').length || 0),
    0
  );
  const totalTarget = 70; // 10 per day * 7 days

  return (
    <div className="space-y-6">
      {/* Top Weekly Goal Header & Quota Progress */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl space-y-4">
        {/* Week Selector Bar - Eliminates week collisions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
              <CalendarDays className="h-3.5 w-3.5 text-indigo-400" />
              Week Schedule:
            </span>

            <button
              type="button"
              onClick={() => {
                setSelectedWeekKey(getPreviousWeekKey(selectedWeekKey));
                setViewMode('selected_week');
              }}
              title="Previous Week"
              className="rounded-lg border border-white/10 bg-slate-800 p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedWeekKey(currentWeekKey);
                setViewMode('selected_week');
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border cursor-pointer ${
                viewMode === 'selected_week' && isCurrentWeek
                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'border-white/10 bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              This Week {isCurrentWeek && '• Current'}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedWeekKey(nextWeekKey);
                setViewMode('selected_week');
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border cursor-pointer ${
                viewMode === 'selected_week' && isNextWeek
                  ? 'border-purple-500 bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'border-white/10 bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              Next Week {isNextWeek && '• Planning'}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedWeekKey(getNextWeekKey(selectedWeekKey));
                setViewMode('selected_week');
              }}
              title="Next Week"
              className="rounded-lg border border-white/10 bg-slate-800 p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'all_weeks' ? 'selected_week' : 'all_weeks')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border cursor-pointer ml-1 ${
                viewMode === 'all_weeks'
                  ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                  : 'border-white/5 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-3 w-3 inline mr-1" />
              All Weeks
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
              {viewMode === 'all_weeks' ? 'All Weeks Combined' : formatWeekLabel(selectedWeekKey)}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                isCurrentWeek
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  : isNextWeek
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-slate-700/50 text-slate-300 border-slate-600'
              }`}>
                {isCurrentWeek ? 'THIS WEEK DISPATCH' : isNextWeek ? 'NEXT WEEK PIPELINE' : 'WEEKLY ARCHIVE'}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white font-['Outfit']">
                {viewMode === 'all_weeks'
                  ? 'All Weeks Cold Outreach Overview'
                  : `${formatWeekLabel(selectedWeekKey, true)} Cold Outreach (10 Leads/Day)`}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isNextWeek
                ? 'Preparing your upcoming week. Assign leads here without colliding with this week\'s active batch.'
                : 'Your cold outreach pipeline. Daily 10-lead quotas for Monday through Sunday.'}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/5 bg-slate-950/60 px-3.5 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Scheduled</span>
              <span className="text-base font-black text-white">
                {totalWeeklySourced} <span className="text-xs text-slate-400 font-normal">/ {totalTarget}</span>
              </span>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Sent Out</span>
              <span className="text-base font-black text-emerald-400">
                {totalWeeklySent} <span className="text-xs text-emerald-400/70 font-normal">/ {totalWeeklySourced}</span>
              </span>
            </div>

            {onOpenWeeklyPacer && (
              <button
                type="button"
                onClick={() => onOpenWeeklyPacer(selectedWeekKey)}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/45 hover:to-purple-600/45 px-3.5 py-2 text-xs font-bold text-indigo-200 hover:text-white transition shadow-sm cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>⚡ 70-Lead Pacer ({formatWeekLabel(selectedWeekKey, true)})</span>
              </button>
            )}

            {unassignedLeads.length > 0 && onAutoDistributeUnassigned && (
              <button
                type="button"
                onClick={() => onAutoDistributeUnassigned(selectedWeekKey)}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition shadow-sm cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Auto-Pace {unassignedLeads.length} for {formatWeekLabel(selectedWeekKey, true)}</span>
              </button>
            )}
          </div>
        </div>

        {/* 7-Day Visual Progress Track for Selected Week */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-white/5">
          {WEEKDAYS.map((day) => {
            const dayList = leadsByDay[day] || [];
            const count = dayList.length;
            const sentCount = dayList.filter((l) => l.status !== 'not_sent').length;
            const isFull = count >= 10;
            const isSelected = selectedDay === day;
            const isToday = isCurrentWeek && day === todayWeekday;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`rounded-xl p-3 text-left transition border relative cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-950/40 shadow-md shadow-indigo-950/50 ring-1 ring-indigo-500/30'
                    : isToday
                    ? 'border-amber-500/40 bg-amber-950/20 hover:border-amber-400/60'
                    : 'border-white/5 bg-slate-950/50 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-200">{day}</span>
                    {isToday && (
                      <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-extrabold text-amber-300 border border-amber-500/40">
                        TODAY
                      </span>
                    )}
                  </div>
                  {isFull ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-500">
                      {count}/10
                    </span>
                  )}
                </div>
                {/* Micro Progress Bar */}
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isFull ? 'bg-emerald-500' : isToday ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{count} leads</span>
                  <span className={sentCount > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                    {sentCount > 0 ? `${sentCount} sent` : count >= 10 ? 'Target Hit' : `${10 - count} needed`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Day Selector Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedDay('ALL')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border cursor-pointer ${
              selectedDay === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white'
            }`}
          >
            All 7 Days ({totalWeeklySourced})
          </button>
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border cursor-pointer ${
                selectedDay === day
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white'
              }`}
            >
              {day} ({leadsByDay[day]?.length || 0})
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Channel Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900 p-1 text-xs overflow-x-auto">
            <Filter className="h-3.5 w-3.5 text-slate-400 ml-2 shrink-0" />
            <button
              type="button"
              onClick={() => setChannelFilter('ALL')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer shrink-0 ${
                channelFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Channels
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('Facebook')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer shrink-0 ${
                channelFilter === 'Facebook' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Facebook
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('Instagram')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer shrink-0 ${
                channelFilter === 'Instagram' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Instagram
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('Email')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer shrink-0 ${
                channelFilter === 'Email' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Email
            </button>
          </div>

          {/* Sort Order Selector */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold shrink-0">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as LeadSortMode)}
              className="rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
              title="Sort leads within each weekday queue"
            >
              <option value="latest_paste">✨ Latest Pasted Link (Default - Newest at Top)</option>
              <option value="heat_score">🔥 Highest Heat Score (100 → 1)</option>
              <option value="status_then_day">⚡ Action Priority (Not Sent → Seen → Replied → Sent)</option>
              <option value="pipeline_then_day">📤 Pipeline (Sent → Not Sent → Replied)</option>
              <option value="name">🔤 Business Name (A → Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads List for Selected Day(s) */}
      <div className="space-y-4">
        {(selectedDay === 'ALL' ? WEEKDAYS : [selectedDay]).map((day) => {
          const dayLeads = getFilteredLeadsForDay(day);
          const sentForDay = dayLeads.filter((l) => l.status !== 'not_sent').length;

          return (
            <div key={day} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-400" />
                    <span>{day}'s Outreach Queue</span>
                  </h4>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    dayLeads.length >= 10
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}>
                    {dayLeads.length} / 10 Ready
                  </span>
                  {sentForDay > 0 && (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                      {sentForDay} Sent
                    </span>
                  )}
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 border border-white/5 font-mono">
                    {formatWeekLabel(selectedWeekKey, true)}
                  </span>
                </div>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Fixed $299 Client Closer Offer
                </span>
              </div>

              {dayLeads.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No leads scheduled for {day} in {formatWeekLabel(selectedWeekKey, true)}. Move leads here or use Auto-Pacer to plan this week's queue!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {dayLeads.map((lead, idx) => {
                    const isCopied = copiedId === lead.id;
                    const leadWeek = normalizeLeadWeek(lead);

                    let ChannelIcon = Mail;
                    let channelBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                    if (lead.platform.toLowerCase() === 'facebook') {
                      ChannelIcon = Facebook;
                      channelBadge = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                    } else if (lead.platform.toLowerCase() === 'instagram') {
                      ChannelIcon = Instagram;
                      channelBadge = 'bg-pink-500/20 text-pink-300 border-pink-500/30';
                    }

                    return (
                      <div
                        key={lead.id}
                        className="rounded-xl border border-white/5 bg-slate-950/70 p-4 space-y-3 hover:border-white/15 transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${channelBadge}`}>
                                  <ChannelIcon className="h-3 w-3" />
                                  <span>{lead.platform}</span>
                                </span>
                                <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                                  #{idx + 1}
                                </span>
                                {leadWeek === nextWeekKey && (
                                  <span className="rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 text-[9px] font-bold">
                                    Next Wk
                                  </span>
                                )}
                              </div>
                              <h5 className="text-sm font-bold text-white leading-snug">
                                {lead.restaurantName}
                              </h5>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {lead.city} • <span className="text-slate-300 font-mono">{lead.handle}</span>
                              </p>
                              <div className="mt-2">
                                <DayBadge
                                  lead={lead}
                                  allLeads={leads}
                                  onRescheduleLead={onRescheduleLead}
                                  size="sm"
                                />
                              </div>

                              {(lead.mockupImage1 || lead.mockupImage2) && (
                                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                  {lead.mockupImage1 && (
                                    <img
                                      src={lead.mockupImage1}
                                      alt="Mockup 1"
                                      className="w-6 h-6 rounded object-cover border border-purple-400/40 cursor-pointer hover:scale-110 transition shadow-sm"
                                      onClick={() => setMockupModalLead(lead)}
                                      title="Open Mockup Screenshot 1"
                                    />
                                  )}
                                  {lead.mockupImage2 && (
                                    <img
                                      src={lead.mockupImage2}
                                      alt="Mockup 2"
                                      className="w-6 h-6 rounded object-cover border border-purple-400/40 cursor-pointer hover:scale-110 transition shadow-sm"
                                      onClick={() => setMockupModalLead(lead)}
                                      title="Open Mockup Screenshot 2"
                                    />
                                  )}
                                  <span className="text-[10px] font-bold text-purple-300">
                                    Mockup ({Number(!!lead.mockupImage1) + Number(!!lead.mockupImage2)}/2)
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="text-right">
                              <select
                                value={lead.status}
                                onChange={(e) => onUpdateStatus(lead.id, e.target.value as Lead['status'])}
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border cursor-pointer focus:outline-none transition ${
                                  lead.status === 'not_sent'
                                    ? 'border-slate-500/30 bg-slate-800 text-slate-300'
                                    : lead.status === 'closed_won'
                                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                                    : lead.status === 'proposal_sent'
                                    ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                                    : lead.status === 'replied'
                                    ? 'border-purple-500/40 bg-purple-500/20 text-purple-300'
                                    : 'border-white/10 bg-slate-900 text-slate-300'
                                }`}
                                title="Change lead status"
                              >
                                <option value="not_sent">NOT SENT</option>
                                <option value="sent">SENT</option>
                                <option value="seen">SEEN</option>
                                <option value="replied">REPLIED</option>
                                <option value="mockup_sent">MOCKUP SENT</option>
                                <option value="call_booked">CALL BOOKED</option>
                                <option value="proposal_sent">PROPOSAL SENT</option>
                                <option value="closed_won">WON</option>
                                <option value="closed_dead">DEAD</option>
                              </select>
                            </div>
                          </div>

                          {/* Hook preview & inline editor */}
                          {editingPitchLeadId === lead.id ? (
                            <div className="mt-2 space-y-2 rounded-xl border border-indigo-500/50 bg-slate-950 p-2.5">
                              <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300">
                                <span>Edit Pitch for {lead.restaurantName}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const defs = getDefaultStagedMessages(lead);
                                    setPitchDraft(defs.stagedDmMiniPitch);
                                  }}
                                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                >
                                  <RefreshCw className="h-2.5 w-2.5" />
                                  <span>Reset Copy</span>
                                </button>
                              </div>
                              <textarea
                                rows={3}
                                value={pitchDraft}
                                onChange={(e) => setPitchDraft(e.target.value)}
                                className="w-full rounded-lg border border-indigo-500/40 bg-slate-900 p-2 text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400">
                                  {pitchDraft.trim().split(/\s+/).filter(Boolean).length} words
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingPitchLeadId(null)}
                                    className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400 hover:text-white transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onUpdateLead) {
                                        onUpdateLead({
                                          ...lead,
                                          pitchHook: pitchDraft.trim(),
                                          stagedDmMiniPitch: pitchDraft.trim(),
                                        });
                                      }
                                      setEditingPitchLeadId(null);
                                    }}
                                    className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                                  >
                                    <Save className="h-3 w-3" />
                                    <span>Save Pitch</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 group/pitch relative">
                              {(() => {
                                const defs = getDefaultStagedMessages(lead);
                                const currentPitch = lead.pitchHook || lead.stagedDmMiniPitch || defs.stagedDmMiniPitch;
                                return (
                                  <div className="bg-slate-900/80 p-2 rounded-lg border border-white/5 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                                        Tailored Pitch
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingPitchLeadId(lead.id);
                                          setPitchDraft(currentPitch);
                                        }}
                                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-white transition cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/25 px-1.5 py-0.5 rounded border border-indigo-500/20"
                                      >
                                        <Edit3 className="h-2.5 w-2.5" />
                                        <span>Edit Pitch</span>
                                      </button>
                                    </div>
                                    <p className="text-xs text-slate-300 italic line-clamp-2 select-all">
                                      "{currentPitch}"
                                    </p>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Actions Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleCopyPitch(lead)}
                              className="flex items-center gap-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 px-2.5 py-1 font-bold text-indigo-200 transition cursor-pointer"
                            >
                              {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              <span>{isCopied ? 'Copied' : 'Copy Pitch'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const defs = getDefaultStagedMessages(lead);
                                setEditingPitchLeadId(lead.id);
                                setPitchDraft(lead.pitchHook || lead.stagedDmMiniPitch || defs.stagedDmMiniPitch);
                              }}
                              className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 font-bold text-indigo-300 transition cursor-pointer"
                              title="Edit pitch message for this lead"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>Edit</span>
                            </button>

                            {/* Mockup Screenshots & Permission Pitch Vault */}
                            <button
                              type="button"
                              onClick={() => setMockupModalLead(lead)}
                              className="flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-600/20 hover:bg-purple-600/40 px-2 py-1 font-bold text-purple-200 transition cursor-pointer"
                              title="Mockup Screenshots (2 slots) & Permission Pitch"
                            >
                              <ImageIcon className="h-3 w-3 text-purple-400" />
                              <span>{lead.mockupImage1 || lead.mockupImage2 ? `Mockup (${Number(!!lead.mockupImage1) + Number(!!lead.mockupImage2)}/2)` : '+ Mockup'}</span>
                            </button>

                            {onViewDetails && (
                              <button
                                type="button"
                                onClick={() => onViewDetails(lead)}
                                className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-slate-300 transition cursor-pointer"
                                title="View Lead Details"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                            )}

                            {/* Direct Channel Launcher */}
                            {lead.platform.toLowerCase() === 'facebook' && (
                              <a
                                href={lead.profileUrl || `https://${lead.handle}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 px-2 py-1 text-blue-200 transition font-bold"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Messenger</span>
                              </a>
                            )}
                            {lead.platform.toLowerCase() === 'instagram' && (
                              <a
                                href={`https://instagram.com/${lead.handle.replace('@', '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-pink-600/30 hover:bg-pink-600/50 border border-pink-500/30 px-2 py-1 text-pink-200 transition font-bold"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Open IG</span>
                              </a>
                            )}
                            {lead.platform.toLowerCase() === 'email' && (
                              <a
                                href={`mailto:${lead.email || lead.handle}?subject=${encodeURIComponent(`Quick question regarding ${lead.restaurantName}`)}&body=${encodeURIComponent(lead.pitchHook || '')}`}
                                className="flex items-center gap-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/30 px-2 py-1 text-emerald-200 transition font-bold"
                              >
                                <Send className="h-3 w-3" />
                                <span>Email</span>
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Reschedule Dropdown with Week Awareness */}
                            {onRescheduleLead && (
                              <select
                                value={`${normalizeLeadWeek(lead)}:${lead.scheduledDay || day}`}
                                onChange={(e) => {
                                  const [targetWk, targetD] = e.target.value.split(':');
                                  onRescheduleLead(lead.id, targetD as Weekday, targetWk);
                                }}
                                className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 focus:outline-none cursor-pointer"
                              >
                                <optgroup label={`This Week (${formatWeekLabel(currentWeekKey, true)})`}>
                                  {WEEKDAYS.map((d) => (
                                    <option key={`current:${d}`} value={`${currentWeekKey}:${d}`}>
                                      {d.slice(0, 3)} (This Wk)
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label={`Next Week (${formatWeekLabel(nextWeekKey, true)})`}>
                                  {WEEKDAYS.map((d) => (
                                    <option key={`next:${d}`} value={`${nextWeekKey}:${d}`}>
                                      {d.slice(0, 3)} (Next Wk)
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            )}

                            {/* Quick Week Flip Button */}
                            {onRescheduleLead && (
                              <button
                                type="button"
                                onClick={() => {
                                  const targetWeek = normalizeLeadWeek(lead) === currentWeekKey ? nextWeekKey : currentWeekKey;
                                  onRescheduleLead(lead.id, lead.scheduledDay || day, targetWeek);
                                }}
                                title={normalizeLeadWeek(lead) === currentWeekKey ? 'Move to Next Week' : 'Move to This Week'}
                                className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                              >
                                {normalizeLeadWeek(lead) === currentWeekKey ? '➔ Next Wk' : '⬅ This Wk'}
                              </button>
                            )}

                            {/* Log Sent Button */}
                            <button
                              type="button"
                              onClick={() => {
                                onLogFollowupSent(lead.id);
                                onUpdateStatus(lead.id, 'sent');
                              }}
                              className="flex items-center gap-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 px-2.5 py-1 text-emerald-200 hover:text-white transition font-bold cursor-pointer"
                              title="Mark as Sent & Log Activity"
                            >
                              <Check className="h-3 w-3" />
                              <span>Sent</span>
                            </button>

                            {/* Trash / Delete Lead Button */}
                            {onDeleteLead && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteLead(lead.id);
                                }}
                                title={lead.status === 'closed_dead' ? "Trash Dead Lead" : "Delete Lead"}
                                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition cursor-pointer shadow-sm ${
                                  lead.status === 'closed_dead'
                                    ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30'
                                    : 'border border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/25 hover:text-white'
                                }`}
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>{lead.status === 'closed_dead' ? 'Trash' : 'Del'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mockup Screenshots & Permission Pitch Modal */}
      {mockupModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl rounded-3xl border border-purple-500/40 bg-[#0d121f] p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
                    Mockup Screenshots & Permission Pitch: {mockupModalLead.restaurantName}
                  </h3>
                  <p className="text-xs text-purple-300/80">
                    Store 2 mockup screenshots, copy them to clipboard, and use high-converting permission-ask outreach templates.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMockupModalLead(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <MockupVault
              lead={mockupModalLead}
              onUpdateLead={(updates) => {
                const updated = { ...mockupModalLead, ...updates };
                setMockupModalLead(updated);
                if (onUpdateLead) onUpdateLead(updated);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
