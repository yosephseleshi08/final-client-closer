import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye, 
  FileText, 
  Send, 
  Plus, 
  Upload, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  CheckSquare,
  Square,
  Trophy,
  RotateCcw,
  History,
  Instagram,
  Facebook,
  Mail,
  Layers,
  Flame,
  Info,
  Calendar,
  Edit3,
  Save,
  Copy,
  Check,
  RefreshCw,
  Ban,
  Link2,
  Image as ImageIcon,
  MessageSquare,
  X
} from 'lucide-react';
import { Lead, LeadStatus, FollowupLog, Weekday } from '../types';
import { DayBadge } from './DayBadge';
import { LeadMessageVaultModal } from './LeadMessageVaultModal';
import { MockupVault } from './MockupVault';
import { getDefaultStagedMessages } from '../utils/stagedMessageHelper';
import { findDuplicateLeadGroups } from '../utils/duplicateDetector';
import { downloadComprehensiveCsv, downloadComprehensiveJson } from '../utils/exportService';

import {
  WEEKDAYS,
  WEEKDAY_CONFIG,
  getTodayWeekday,
  getTomorrowWeekday,
  getLeadDayPosition,
  getCurrentWeekKey,
  getNextWeekKey,
  normalizeLeadWeek,
  formatWeekLabel,
} from '../utils/weeklyScheduler';
import {
  sortLeadsDeterministically,
  LeadSortMode,
  STATUS_ACTION_PRIORITY,
  STATUS_PIPELINE_PRIORITY,
  WEEKDAY_PRIORITY_ORDER,
} from '../utils/leadSortHelper';

export { STATUS_ACTION_PRIORITY as STATUS_PRIORITY_ORDER, WEEKDAY_PRIORITY_ORDER };

interface CrmDatabaseProps {
  leads: Lead[];
  followupLogs?: FollowupLog[];
  onUpdateLead?: (updatedLead: Lead) => void;
  onUpdateStatus: (leadId: number, newStatus: LeadStatus) => void;
  onUpdateAuditChecklist: (leadId: number, index: 0 | 1 | 2, value: boolean) => void;
  onDeleteLead: (leadId: number) => void;
  onDeleteDeadLeads?: () => void;
  onRejectLead?: (lead: Lead) => void;
  onSelectLeadForCopilot: (lead: Lead) => void;
  onViewDetails?: (lead: Lead) => void;
  onOpenAddModal: () => void;
  onOpenBulkModal: () => void;
  onOpenInstaModal?: () => void;
  onResetToRealLeads?: () => void;
  onClearAllLeads?: () => void;
  onRescheduleLead?: (leadId: number, newDay: Weekday, targetWeek?: string) => void;
  onOpenWeeklyPacer?: () => void;
  onOpenDuplicateCleaner?: () => void;
}

export const CrmDatabase: React.FC<CrmDatabaseProps> = ({
  leads,
  followupLogs = [],
  onUpdateLead,
  onUpdateStatus,
  onUpdateAuditChecklist,
  onDeleteLead,
  onDeleteDeadLeads,
  onRejectLead,
  onSelectLeadForCopilot,
  onViewDetails,
  onOpenAddModal,
  onOpenBulkModal,
  onOpenInstaModal,
  onResetToRealLeads,
  onClearAllLeads,
  onRescheduleLead,
  onOpenWeeklyPacer,
  onOpenDuplicateCleaner,
}) => {

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [highScoreOnly, setHighScoreOnly] = useState<boolean>(false);
  const [confirmingTrashAll, setConfirmingTrashAll] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<LeadSortMode>('latest_paste');
  const [mockupModalLead, setMockupModalLead] = useState<Lead | null>(null);
  const [selectedLeadIdForSidebar, setSelectedLeadIdForSidebar] = useState<number | null>(
    leads.length > 0 ? leads[0].id : null
  );

  // Individual Pitch Editing State
  const [isEditingPitch, setIsEditingPitch] = useState<boolean>(false);
  const [pitchDraft, setPitchDraft] = useState<string>('');
  const [copiedPitch, setCopiedPitch] = useState<boolean>(false);
  const [vaultModalLead, setVaultModalLead] = useState<Lead | null>(null);

  // Multi-Select & Batch Page Mover State
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());

  const handleToggleSelectLead = (id: number) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = (visibleLeads: Lead[]) => {
    if (selectedLeadIds.size === visibleLeads.length && visibleLeads.length > 0) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(visibleLeads.map((l) => l.id)));
    }
  };

  const handleBatchMovePage = (targetPlatform: Lead['platform']) => {
    if (!onUpdateLead || selectedLeadIds.size === 0) return;
    leads.forEach((l) => {
      if (selectedLeadIds.has(l.id)) {
        onUpdateLead({ ...l, platform: targetPlatform });
      }
    });
    setSelectedLeadIds(new Set());
  };

  const todayWeekday = getTodayWeekday();
  const tomorrowWeekday = getTomorrowWeekday();

  const highScoreCount = useMemo(
    () => leads.filter((l) => (l.leadScore ?? 25) > 80).length,
    [leads]
  );

  const deadLeadsCount = useMemo(
    () => leads.filter((l) => l.status === 'closed_dead').length,
    [leads]
  );

  const currentWeekKey = getCurrentWeekKey();

  const todayLeadsCount = useMemo(
    () => leads.filter((l) => l.scheduledDay === todayWeekday && normalizeLeadWeek(l) === currentWeekKey).length,
    [leads, todayWeekday, currentWeekKey]
  );

  const tomorrowLeadsCount = useMemo(
    () => leads.filter((l) => l.scheduledDay === tomorrowWeekday && normalizeLeadWeek(l) === currentWeekKey).length,
    [leads, tomorrowWeekday, currentWeekKey]
  );

  const duplicateGroups = useMemo(() => findDuplicateLeadGroups(leads), [leads]);
  const redundantDuplicateCount = duplicateGroups.reduce((acc, g) => acc + (g.leads.length - 1), 0);


  const filteredLeads = useMemo(() => {
    const filtered = leads.filter((lead) => {
      const matchesSearch =
        lead.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.contactName && lead.contactName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesHighScore = !highScoreOnly || ((lead.leadScore ?? 25) > 80);

      let matchesDay = true;
      if (dayFilter === 'today') {
        matchesDay = lead.scheduledDay === todayWeekday && normalizeLeadWeek(lead) === currentWeekKey;
      } else if (dayFilter === 'tomorrow') {
        matchesDay = lead.scheduledDay === tomorrowWeekday && normalizeLeadWeek(lead) === currentWeekKey;
      } else if (dayFilter !== 'all') {
        matchesDay = lead.scheduledDay === dayFilter;
      }

      return matchesSearch && matchesStatus && matchesHighScore && matchesDay;
    });

    return sortLeadsDeterministically(filtered, sortOrder);
  }, [leads, searchQuery, statusFilter, highScoreOnly, dayFilter, todayWeekday, tomorrowWeekday, currentWeekKey, sortOrder]);

  const selectedLead =
    filteredLeads.find((l) => l.id === selectedLeadIdForSidebar) ||
    leads.find((l) => l.id === selectedLeadIdForSidebar) ||
    filteredLeads[0] ||
    leads[0] ||
    null;

  useEffect(() => {
    if (selectedLead) {
      const defs = getDefaultStagedMessages(selectedLead);
      setPitchDraft(selectedLead.pitchHook || selectedLead.stagedDmMiniPitch || defs.stagedDmMiniPitch);
      setIsEditingPitch(false);
    }
  }, [selectedLead?.id]);

  const handleCopyPitchText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleExportCsv = () => {
    if (leads.length === 0) return;
    downloadComprehensiveCsv(leads, followupLogs, 'outreach-crm-all-leads-full-archive');
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'not_sent':
        return <span className="rounded-md bg-slate-500/20 px-2 py-0.5 text-xs font-bold text-slate-300 border border-slate-500/30">⏳ NOT SENT</span>;
      case 'sent':
        return <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-500/25">📤 SENT</span>;
      case 'seen':
        return <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-bold text-sky-300 border border-sky-500/25">👀 SEEN</span>;
      case 'replied':
        return <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/25">💬 REPLIED</span>;
      case 'mockup_sent':
        return <span className="rounded-md bg-purple-500/15 px-2 py-0.5 text-xs font-bold text-purple-300 border border-purple-500/25">🎨 MOCKUP SENT</span>;
      case 'call_booked':
        return <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-xs font-bold text-blue-300 border border-blue-500/25">📞 CALL BOOKED</span>;
      case 'proposal_sent':
        return <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/25">📑 PROPOSAL SENT</span>;
      case 'closed_won':
        return <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">🏆 WON</span>;
      case 'closed_dead':
        return <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-300 border border-rose-500/25">💀 DEAD</span>;
      default:
        return <span className="rounded-md bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by restaurant name, city, handle, owner..."
            className="w-full rounded-xl border border-white/10 bg-slate-950/80 pl-9 pr-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">All Stages ({leads.length})</option>
            <option value="not_sent">⏳ Not Sent</option>
            <option value="sent">📤 Sent</option>
            <option value="seen">👀 Seen</option>
            <option value="replied">💬 Replied</option>
            <option value="mockup_sent">🎨 Mockup Sent</option>
            <option value="call_booked">📞 Call Booked</option>
            <option value="proposal_sent">📑 Proposal Sent</option>
            <option value="closed_won">🏆 Closed Won</option>
            <option value="closed_dead">💀 Dead</option>
          </select>

          {/* High Intent Prospects Filter Button (leadScore > 80) */}
          <button
            id="btn-filter-lead-score-80"
            onClick={() => setHighScoreOnly((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition shadow-sm ${
              highScoreOnly
                ? 'border border-amber-400 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-amber-500/25 ring-2 ring-amber-400/40'
                : 'border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            }`}
            title="Prioritize high-intent prospects with a leadScore above 80"
          >
            <Flame className={`h-3.5 w-3.5 ${highScoreOnly ? 'text-slate-950 fill-current' : 'text-amber-400'}`} />
            <span>Score &gt; 80</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                highScoreOnly ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {highScoreCount}
            </span>
          </button>

          <button
            id="btn-export-csv"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          {onOpenWeeklyPacer && (
            <button
              id="btn-open-weekly-pacer-toolbar"
              onClick={onOpenWeeklyPacer}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-600/25 to-purple-600/25 hover:from-indigo-600/40 hover:to-purple-600/40 px-3 py-2 text-xs font-bold text-indigo-200 hover:text-white transition shadow-sm cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>⚡ 70-Lead Pacer</span>
            </button>
          )}

          {onOpenDuplicateCleaner && (
            <button
              id="btn-crm-check-duplicates"
              onClick={onOpenDuplicateCleaner}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition shadow-sm cursor-pointer ${
                redundantDuplicateCount > 0
                  ? 'border-rose-500/50 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 ring-1 ring-rose-500/30'
                  : 'border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Search all stored leads and remove duplicated links"
            >
              <Link2 className="h-3.5 w-3.5 text-rose-400" />
              <span>Duplicates</span>
              {redundantDuplicateCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-mono text-white animate-pulse">
                  {redundantDuplicateCount}
                </span>
              )}
            </button>
          )}

          <button
            id="btn-open-bulk-import"
            onClick={onOpenBulkModal}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Bulk CSV</span>
          </button>

          {onOpenInstaModal && (
            <button
              id="btn-crm-insta-extract"
              onClick={onOpenInstaModal}
              className="flex items-center gap-1.5 rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-600/20 to-purple-600/20 px-3 py-2 text-xs font-bold text-pink-300 hover:from-pink-600/30 hover:to-purple-600/30 transition shadow-sm"
            >
              <Instagram className="h-3.5 w-3.5 text-pink-400" />
              <span>Insta Extract</span>
            </button>
          )}

          <button
            id="btn-open-add-lead-crm"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/30"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Lead</span>
          </button>

          {deadLeadsCount > 0 && (
            <button
              id="btn-trash-dead-leads"
              onClick={() => {
                if (!confirmingTrashAll) {
                  setConfirmingTrashAll(true);
                  setTimeout(() => setConfirmingTrashAll(false), 3500);
                  return;
                }
                setConfirmingTrashAll(false);
                if (onDeleteDeadLeads) {
                  onDeleteDeadLeads();
                } else {
                  leads.filter((l) => l.status === 'closed_dead').forEach((l) => onDeleteLead(l.id));
                }
              }}
              title={confirmingTrashAll ? "Click again to confirm permanent trash" : `Trash all ${deadLeadsCount} dead leads`}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition shadow-sm cursor-pointer ${
                confirmingTrashAll
                  ? 'border-rose-500 bg-rose-600 text-white animate-pulse'
                  : 'border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 hover:text-white'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{confirmingTrashAll ? `Click again to trash (${deadLeadsCount})` : `Trash Dead (${deadLeadsCount})`}</span>
            </button>
          )}

          {onResetToRealLeads && (
            <button
              id="btn-reset-real-leads"
              onClick={onResetToRealLeads}
              title="Reset to your authenticated 68 real prospect outreach dataset"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
            >
              <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
              <span>Restore My Real Leads</span>
            </button>
          )}

          {onClearAllLeads && leads.length > 0 && (
            <button
              id="btn-clear-pipeline"
              onClick={onClearAllLeads}
              title="Clear all leads for a blank slate"
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-2.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* 7-Day Weekly Pacing & Daily Recognition Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-indigo-500/25 bg-slate-900/60 p-3.5 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 shrink-0">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            <span>Pacing:</span>
          </span>

          <button
            onClick={() => setDayFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              dayFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-800/50'
            }`}
          >
            All Leads ({leads.length})
          </button>

          {/* Today's 10 Target */}
          <button
            onClick={() => setDayFilter('today')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              dayFilter === 'today'
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-400'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
            }`}
          >
            <Flame className="h-3.5 w-3.5 fill-current" />
            <span>Today: {todayWeekday}</span>
            <span className="rounded-full bg-black/25 px-1.5 py-0.2 text-[10px] font-mono">
              {todayLeadsCount}/10
            </span>
          </button>

          {/* Tomorrow's Target */}
          <button
            onClick={() => setDayFilter('tomorrow')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              dayFilter === 'tomorrow'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20'
            }`}
          >
            <span>Tomorrow: {tomorrowWeekday}</span>
            <span className="rounded-full bg-black/25 px-1.5 py-0.2 text-[10px] font-mono">
              {tomorrowLeadsCount}
            </span>
          </button>

          {/* Mon - Sun individual filters */}
          {WEEKDAYS.map((wDay) => {
            const count = leads.filter((l) => l.scheduledDay === wDay).length;
            const config = WEEKDAY_CONFIG[wDay];
            const isSelected = dayFilter === wDay;

            return (
              <button
                key={wDay}
                onClick={() => setDayFilter(wDay)}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
                <span>{config.short}</span>
                <span className="text-[10px] text-slate-500 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {onOpenWeeklyPacer && (
          <button
            onClick={onOpenWeeklyPacer}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600/20 hover:bg-indigo-600/30 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:text-white transition shadow-sm whitespace-nowrap cursor-pointer shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Manage 70-Lead Pacer</span>
          </button>
        )}
      </div>

      {/* Dead Leads Archive Purge Banner when viewing Dead status filter */}
      {statusFilter === 'closed_dead' && deadLeadsCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💀</span>
            <div>
              <p className="font-bold text-white text-sm">Dead &amp; Disqualified Prospects Archive ({deadLeadsCount})</p>
              <p className="text-[11px] text-rose-300/80">These leads closed dead, bounced, or opted out. You can trash them individually in the table or purge all at once.</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (onDeleteDeadLeads) {
                onDeleteDeadLeads();
              } else {
                leads.filter((l) => l.status === 'closed_dead').forEach((l) => onDeleteLead(l.id));
              }
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-rose-600/30 whitespace-nowrap cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Purge All {deadLeadsCount} Dead Leads</span>
          </button>
        </div>
      )}

      {/* Grid: Master Table + Sidebar Quick Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Table */}
        <div className="lg:col-span-8 rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-xl overflow-hidden">
          {/* Batch Page Mover Action Bar */}
          {selectedLeadIds.size > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-indigo-950/90 border-b border-indigo-500/40 p-3 px-4 backdrop-blur-xl animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-xs font-black text-white">
                  {selectedLeadIds.size}
                </span>
                <span className="text-xs font-bold text-white">
                  {selectedLeadIds.size} lead{selectedLeadIds.size === 1 ? '' : 's'} selected
                </span>
                <span className="text-slate-400 text-xs hidden sm:inline">• Choose page to store them in:</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleBatchMovePage('Instagram')}
                  className="flex items-center gap-1 rounded-lg border border-pink-500/40 bg-pink-500/20 hover:bg-pink-500/30 px-2.5 py-1 text-xs font-bold text-pink-300 hover:text-white transition cursor-pointer"
                >
                  <Instagram className="h-3.5 w-3.5" />
                  <span>Move to Instagram Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchMovePage('Facebook')}
                  className="flex items-center gap-1 rounded-lg border border-blue-500/40 bg-blue-500/20 hover:bg-blue-500/30 px-2.5 py-1 text-xs font-bold text-blue-300 hover:text-white transition cursor-pointer"
                >
                  <Facebook className="h-3.5 w-3.5" />
                  <span>Move to Facebook Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchMovePage('Email')}
                  className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-300 hover:text-white transition cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Move to Email Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLeadIds(new Set())}
                  className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Deselect
                </button>
              </div>
            </div>
          )}

          {/* Table Header Bar with Counts and Sort Order */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 bg-slate-950/60 border-b border-white/5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white font-['Outfit']">
                {filteredLeads.length} Lead{filteredLeads.length === 1 ? '' : 's'}
              </span>
              <span className="rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold">
                {filteredLeads.filter((l) => l.status === 'sent').length} Sent
              </span>
              <span className="rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-bold">
                {filteredLeads.filter((l) => l.status === 'not_sent').length} Not Sent
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold hidden md:inline">Sort:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as LeadSortMode)}
                className="rounded-xl border border-white/10 bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
                title="Choose lead sorting priority"
              >
                <option value="latest_paste">✨ Latest Pasted Link (Default - Newest at Top)</option>
                <option value="heat_score">🔥 Highest Heat Score (100 → 1)</option>
                <option value="status_then_day">⚡ Action Priority (Not Sent → Seen → Replied → Sent, then Mon-Sun)</option>
                <option value="pipeline_then_day">📤 Pipeline Flow (Sent → Not Sent → Replied, then Mon-Sun)</option>
                <option value="day_then_status">📅 Scheduled Weekday (Monday → Sunday, then by Status)</option>
                <option value="name">🔤 Business Name (A → Z)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-white/10 bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-3.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={() => handleSelectAllVisible(filteredLeads)}
                      title="Select / Deselect all visible leads"
                      className="cursor-pointer text-slate-400 hover:text-white flex items-center justify-center mx-auto"
                    >
                      {selectedLeadIds.size > 0 && selectedLeadIds.size === filteredLeads.length ? (
                        <CheckSquare className="h-4 w-4 text-indigo-400" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3.5">Lead / Restaurant</th>
                  <th className="px-4 py-3.5">Stored Page</th>
                  <th className="px-4 py-3.5">Stage</th>
                  <th className="px-3 py-3.5">Scheduled Day</th>
                  <th className="px-4 py-3.5 text-center">Score</th>
                  <th className="px-4 py-3.5">Follow-Up Audit</th>
                  <th className="px-4 py-3.5">Next Due</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredLeads.map((lead) => {
                  const isSelected = selectedLead?.id === lead.id;
                  const isChecked = selectedLeadIds.has(lead.id);
                  const checklist = lead.auditChecklist || [false, false, false];

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLeadIdForSidebar(lead.id)}
                      className={`cursor-pointer transition hover:bg-white/[0.03] ${
                        isSelected ? 'bg-indigo-950/30' : ''
                      } ${isChecked ? 'bg-indigo-950/20' : ''}`}
                    >
                      {/* Selection Checkbox */}
                      <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleSelectLead(lead.id)}
                          className="cursor-pointer text-slate-400 hover:text-white flex items-center justify-center mx-auto"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-indigo-400" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-600 hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white text-sm">{lead.restaurantName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {lead.city} • <span className="text-slate-300">{lead.contactName || 'Owner'}</span>
                        </div>
                      </td>

                      {/* Stored Page / Platform Selector Dropdown */}
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <select
                            value={lead.platform}
                            onChange={(e) => {
                              const newPlatform = e.target.value as Lead['platform'];
                              if (onUpdateLead) {
                                onUpdateLead({ ...lead, platform: newPlatform });
                              }
                            }}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-bold focus:outline-none cursor-pointer transition ${
                              lead.platform === 'Instagram'
                                ? 'border-pink-500/40 bg-pink-950/40 text-pink-300 hover:border-pink-400'
                                : lead.platform === 'Facebook'
                                ? 'border-blue-500/40 bg-blue-950/40 text-blue-300 hover:border-blue-400'
                                : lead.platform === 'Email' || lead.platform === 'Website'
                                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:border-emerald-400'
                                : 'border-white/10 bg-slate-950 text-slate-300'
                            }`}
                            title="Choose what page this lead is stored in"
                          >
                            <option value="Instagram">📸 Instagram Page</option>
                            <option value="Facebook">📘 Facebook Page</option>
                            <option value="Email">✉️ Email Page</option>
                            <option value="Website">🌐 Website</option>
                            <option value="Google Maps">📍 Google Maps</option>
                            <option value="WhatsApp">💬 WhatsApp</option>
                            <option value="TikTok">🎵 TikTok</option>
                            <option value="LinkedIn">💼 LinkedIn</option>
                            <option value="Phone">📞 Phone</option>
                          </select>
                          <span className="block text-[10px] text-indigo-400 truncate max-w-[130px] font-mono">
                            {lead.handle}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.status}
                          onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-bold focus:outline-none cursor-pointer transition ${
                            lead.status === 'not_sent'
                              ? 'border-slate-500/30 bg-slate-800 text-slate-300 hover:border-slate-400'
                              : lead.status === 'proposal_sent'
                              ? 'border-amber-500/40 bg-amber-950/40 text-amber-300 hover:border-amber-400'
                              : lead.status === 'call_booked'
                              ? 'border-blue-500/40 bg-blue-950/40 text-blue-300 hover:border-blue-400'
                              : lead.status === 'closed_won'
                              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:border-emerald-400'
                              : lead.status === 'closed_dead'
                              ? 'border-rose-500/40 bg-rose-950/40 text-rose-300 hover:border-rose-400'
                              : lead.status === 'replied'
                              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:border-emerald-400'
                              : lead.status === 'mockup_sent'
                              ? 'border-purple-500/40 bg-purple-950/40 text-purple-300 hover:border-purple-400'
                              : 'border-indigo-500/40 bg-indigo-950/40 text-indigo-300 hover:border-indigo-400'
                          }`}
                          title="Click to update lead stage"
                        >
                          <option value="not_sent">⏳ NOT SENT</option>
                          <option value="sent">📤 SENT</option>
                          <option value="seen">👀 SEEN</option>
                          <option value="replied">💬 REPLIED</option>
                          <option value="mockup_sent">🎨 MOCKUP SENT</option>
                          <option value="call_booked">📞 CALL BOOKED</option>
                          <option value="proposal_sent">📑 PROPOSAL SENT</option>
                          <option value="closed_won">🏆 WON</option>
                          <option value="closed_dead">💀 DEAD</option>
                        </select>
                      </td>

                      {/* Scheduled Day / Batch Badge */}
                      <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <DayBadge
                          lead={lead}
                          allLeads={leads}
                          onRescheduleLead={onRescheduleLead}
                        />
                      </td>

                      {/* Lead Heat / Engagement Score */}
                      <td className="px-4 py-3.5 text-center">
                        {(() => {
                          const score = lead.leadScore ?? 25;
                          let styleClasses = 'bg-slate-800/80 text-slate-300 border-slate-700/60';
                          let dotColor = 'bg-slate-400';
                          if (score >= 80) {
                            styleClasses = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                            dotColor = 'bg-emerald-400';
                          } else if (score >= 60) {
                            styleClasses = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
                            dotColor = 'bg-indigo-400';
                          } else if (score >= 40) {
                            styleClasses = 'bg-sky-500/15 text-sky-300 border-sky-500/30';
                            dotColor = 'bg-sky-400';
                          } else {
                            styleClasses = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                            dotColor = 'bg-rose-400';
                          }
                          return (
                            <div
                              title={`Lead Score: ${score}/100 based on activity & status`}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-black border shadow-sm ${styleClasses}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                              <span>{score}</span>
                              <span className="text-[10px] font-sans font-normal opacity-60">/100</span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 3 Step Milestone Audit */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {[0, 1, 2].map((idx) => {
                            const isChecked = checklist[idx as 0 | 1 | 2];
                            return (
                              <button
                                key={idx}
                                title={`Follow-Up Milestone ${idx + 1}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateAuditChecklist(lead.id, idx as 0 | 1 | 2, !isChecked);
                                }}
                                className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold border transition ${
                                  isChecked
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                    : 'bg-slate-800/80 border-white/5 text-slate-500 hover:border-white/20'
                                }`}
                              >
                                {idx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {lead.nextFollowupDate ? (
                          <span className="font-mono text-slate-200">{lead.nextFollowupDate}</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            title="Mockup Screenshots (2 slots) & Permission Pitch"
                            onClick={() => setMockupModalLead(lead)}
                            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition cursor-pointer ${
                              lead.mockupImage1 || lead.mockupImage2
                                ? 'border-purple-500/50 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                                : 'border-white/10 bg-slate-800/60 text-slate-400 hover:text-white'
                            }`}
                          >
                            <ImageIcon className="h-3 w-3 text-purple-400" />
                            <span>{Number(!!lead.mockupImage1) + Number(!!lead.mockupImage2)}/2</span>
                          </button>

                          <button
                            title="Edit Individual Pitch / Message"
                            onClick={() => {
                              setSelectedLeadIdForSidebar(lead.id);
                              setIsEditingPitch(true);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/25 px-2 py-1 text-[11px] font-bold text-indigo-300 transition cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Pitch</span>
                          </button>

                          {onViewDetails && (
                            <button
                              title="View Extracted Details"
                              onClick={() => onViewDetails(lead)}
                              className="rounded-lg p-1.5 text-indigo-400 hover:bg-indigo-500/20 transition cursor-pointer"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            title="Open in Copilot"
                            onClick={() => onSelectLeadForCopilot(lead)}
                            className="rounded-lg p-1.5 text-purple-400 hover:bg-purple-500/20 transition cursor-pointer"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          {onRejectLead && lead.status !== 'closed_dead' && (
                            <button
                              type="button"
                              title="Reject lead & save to duplicate prevention blacklist"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRejectLead(lead);
                              }}
                              className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/25 px-2 py-1 text-[11px] font-bold text-rose-300 hover:text-white transition cursor-pointer shadow-sm"
                            >
                              <Ban className="h-3 w-3" />
                              <span>Reject</span>
                            </button>
                          )}

                          <button
                            type="button"
                            title={lead.status === 'closed_dead' ? "Trash Dead Lead" : "Delete Lead"}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLead(lead.id);
                            }}
                            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition cursor-pointer shadow-sm ${
                              lead.status === 'closed_dead'
                                ? 'border border-rose-500/40 bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white'
                                : 'border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 hover:text-rose-100'
                            }`}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>{lead.status === 'closed_dead' ? 'Trash' : 'Delete'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <h4 className="text-sm font-bold text-white">No leads found</h4>
                        <p className="text-xs text-slate-400">
                          {leads.length === 0
                            ? "Your pipeline is currently empty. You can restore your 68 logged prospect leads or paste a custom CSV."
                            : highScoreOnly
                            ? "No leads matched the Score > 80 filter. Toggle it off to view all prospects."
                            : "No leads matched your search filter. Try clearing your search query."}
                        </p>
                        {highScoreOnly && leads.length > 0 && (
                          <button
                            onClick={() => setHighScoreOnly(false)}
                            className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
                          >
                            Clear Score &gt; 80 Filter
                          </button>
                        )}
                        {leads.length === 0 && onResetToRealLeads && (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={onResetToRealLeads}
                              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Restore My 103 SQLite Leads</span>
                            </button>
                            <button
                              onClick={onOpenBulkModal}
                              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              <span>Import CSV</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Management & Audit Inspector */}
        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur-xl shadow-xl space-y-5">
          {selectedLead ? (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                    Lead Inspector
                  </span>
                  <div className="flex items-center gap-1.5 rounded-full bg-slate-800/80 px-2.5 py-0.5 border border-white/10 text-xs font-mono font-black">
                    <span className="text-[10px] uppercase font-sans font-bold text-slate-400">Score:</span>
                    <span className={
                      (selectedLead.leadScore ?? 25) >= 80 ? 'text-emerald-400' :
                      (selectedLead.leadScore ?? 25) >= 60 ? 'text-indigo-400' :
                      (selectedLead.leadScore ?? 25) >= 40 ? 'text-sky-400' : 'text-rose-400'
                    }>
                      {selectedLead.leadScore ?? 25}/100
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-black text-white font-['Outfit'] mt-0.5">
                  {selectedLead.restaurantName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedLead.city} • Fixed Offer:{' '}
                  <span className="text-emerald-400 font-bold">
                    ${selectedLead.estimatedDealValue || 299}
                  </span>
                </p>

                {/* Lead Score Heat Meter */}
                <div className="mt-3 rounded-xl bg-slate-950/70 p-3 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                      <Flame className="h-3.5 w-3.5 text-amber-400" />
                      <span>Engagement Score</span>
                    </span>
                    <span className="font-mono text-xs font-black text-white">
                      <span className={
                        (selectedLead.leadScore ?? 25) >= 80 ? 'text-emerald-400' :
                        (selectedLead.leadScore ?? 25) >= 60 ? 'text-indigo-400' :
                        (selectedLead.leadScore ?? 25) >= 40 ? 'text-sky-400' : 'text-rose-400'
                      }>
                        {selectedLead.leadScore ?? 25}
                      </span>
                      <span className="text-slate-500 text-[10px]"> / 100</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        (selectedLead.leadScore ?? 25) >= 80
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : (selectedLead.leadScore ?? 25) >= 60
                          ? 'bg-gradient-to-r from-indigo-500 to-sky-400'
                          : (selectedLead.leadScore ?? 25) >= 40
                          ? 'bg-gradient-to-r from-sky-500 to-amber-400'
                          : 'bg-gradient-to-r from-rose-500 to-orange-400'
                      }`}
                      style={{ width: `${Math.min(Math.max(selectedLead.leadScore ?? 25, 6), 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>
                      {(selectedLead.leadScore ?? 25) >= 80 ? '🔥 High Conversion Probability' :
                       (selectedLead.leadScore ?? 25) >= 60 ? '⚡ Highly Engaged Prospect' :
                       (selectedLead.leadScore ?? 25) >= 40 ? '👀 Warmed Up / Active Outreach' : '❄️ Early Stage Outreach'}
                    </span>
                    <span className="text-slate-500">Activity weighted</span>
                  </p>
                </div>

                {/* Daily Pacing & Scheduled Day */}
                <div className="mt-3 rounded-xl bg-slate-950/70 p-3.5 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Weekly Batch &amp; Day</span>
                    </span>
                    {selectedLead.scheduledDay && (
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        10-Pack Quota
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <DayBadge
                      lead={selectedLead}
                      allLeads={leads}
                      onRescheduleLead={onRescheduleLead}
                      size="md"
                    />
                    {onOpenWeeklyPacer && (
                      <button
                        onClick={onOpenWeeklyPacer}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>70-Lead Pacer</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Choose Lead Stored Page / Destination Channel */}
              <div className="rounded-xl bg-slate-950/70 p-3.5 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Choose Stored Page:</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-300 uppercase">
                    {selectedLead.platform} Page
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateLead && onUpdateLead({ ...selectedLead, platform: 'Instagram' })}
                    className={`flex items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-bold border transition cursor-pointer ${
                      selectedLead.platform === 'Instagram'
                        ? 'border-pink-500 bg-pink-500/20 text-white shadow ring-1 ring-pink-500/40'
                        : 'border-white/5 bg-slate-800/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Instagram className="h-3.5 w-3.5 text-pink-400" />
                    <span>Instagram</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateLead && onUpdateLead({ ...selectedLead, platform: 'Facebook' })}
                    className={`flex items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-bold border transition cursor-pointer ${
                      selectedLead.platform === 'Facebook'
                        ? 'border-blue-500 bg-blue-500/20 text-white shadow ring-1 ring-blue-500/40'
                        : 'border-white/5 bg-slate-800/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Facebook className="h-3.5 w-3.5 text-blue-400" />
                    <span>Facebook</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateLead && onUpdateLead({ ...selectedLead, platform: 'Email' })}
                    className={`flex items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-bold border transition cursor-pointer ${
                      selectedLead.platform === 'Email' || selectedLead.platform === 'Website'
                        ? 'border-emerald-500 bg-emerald-500/20 text-white shadow ring-1 ring-emerald-500/40'
                        : 'border-white/5 bg-slate-800/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Email</span>
                  </button>
                </div>
              </div>

              {/* Mockup Screenshots (2 slots) & Permission Pitch Card */}
              <div className="rounded-xl bg-slate-950/70 p-3.5 border border-purple-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
                    <span>Mockup Screenshots ({Number(!!selectedLead.mockupImage1) + Number(!!selectedLead.mockupImage2)}/2):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMockupModalLead(selectedLead)}
                    className="text-[11px] font-bold text-purple-400 hover:text-purple-300 transition cursor-pointer"
                  >
                    Manage Slots
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Slot 1 thumbnail */}
                  <div
                    onClick={() => setMockupModalLead(selectedLead)}
                    className="aspect-[16/10] rounded-lg border border-slate-800 bg-slate-900 overflow-hidden flex flex-col items-center justify-center p-1 cursor-pointer hover:border-purple-500/50 transition group relative"
                  >
                    {selectedLead.mockupImage1 ? (
                      <img
                        src={selectedLead.mockupImage1}
                        alt="Hero mockup"
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="text-center p-1">
                        <ImageIcon className="w-4 h-4 text-slate-600 mx-auto mb-1 group-hover:text-purple-400" />
                        <span className="text-[10px] text-slate-500 block">Slot 1 (Hero)</span>
                      </div>
                    )}
                  </div>

                  {/* Slot 2 thumbnail */}
                  <div
                    onClick={() => setMockupModalLead(selectedLead)}
                    className="aspect-[16/10] rounded-lg border border-slate-800 bg-slate-900 overflow-hidden flex flex-col items-center justify-center p-1 cursor-pointer hover:border-purple-500/50 transition group relative"
                  >
                    {selectedLead.mockupImage2 ? (
                      <img
                        src={selectedLead.mockupImage2}
                        alt="Mobile mockup"
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="text-center p-1">
                        <ImageIcon className="w-4 h-4 text-slate-600 mx-auto mb-1 group-hover:text-purple-400" />
                        <span className="text-[10px] text-slate-500 block">Slot 2 (Mobile)</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMockupModalLead(selectedLead)}
                  className="w-full py-1.5 px-2 text-xs font-bold rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>Open Mockup &amp; Permission Vault</span>
                </button>
              </div>

              {/* Quick Stage Switcher */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Update Pipeline Stage:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'not_sent', label: '⏳ Not Sent' },
                    { id: 'sent', label: '📤 Sent' },
                    { id: 'seen', label: '👀 Seen' },
                    { id: 'replied', label: '💬 Replied' },
                    { id: 'mockup_sent', label: '🎨 Mockup' },
                    { id: 'call_booked', label: '📞 Call' },
                    { id: 'proposal_sent', label: '📑 Proposal' },
                    { id: 'closed_won', label: '🏆 Won' },
                    { id: 'closed_dead', label: '💀 Dead' },
                  ].map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => onUpdateStatus(selectedLead.id, stage.id as LeadStatus)}
                      className={`rounded-xl py-2 px-2.5 text-xs font-bold border transition cursor-pointer ${
                        selectedLead.status === stage.id
                          ? 'border-indigo-500 bg-indigo-950/60 text-white shadow-md'
                          : 'border-white/5 bg-slate-800/40 text-slate-400 hover:text-white'
                      }`}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual Outreach Pitch / Custom Message */}
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/25 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Outreach Pitch / What You Message Them</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {!isEditingPitch ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingPitch(true)}
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-200 hover:text-white transition cursor-pointer bg-indigo-600/30 hover:bg-indigo-600/50 px-2.5 py-1 rounded-lg border border-indigo-500/40"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Edit Pitch</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const defs = getDefaultStagedMessages(selectedLead);
                          setPitchDraft(defs.stagedDmMiniPitch);
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        <span>Reset Copy</span>
                      </button>
                    )}
                  </div>
                </div>

                {isEditingPitch ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={pitchDraft}
                      onChange={(e) => setPitchDraft(e.target.value)}
                      placeholder="Type the exact custom pitch message to send this lead..."
                      className="w-full rounded-xl border border-indigo-500/50 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
                    />
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 text-[10px] font-mono">
                        {pitchDraft.trim().split(/\s+/).filter(Boolean).length} words • {pitchDraft.length} chars
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const defs = getDefaultStagedMessages(selectedLead);
                            setPitchDraft(selectedLead.pitchHook || selectedLead.stagedDmMiniPitch || defs.stagedDmMiniPitch);
                            setIsEditingPitch(false);
                          }}
                          className="rounded-lg border border-white/10 px-2.5 py-1 text-slate-400 hover:text-white transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateLead) {
                              onUpdateLead({
                                ...selectedLead,
                                pitchHook: pitchDraft.trim(),
                                stagedDmMiniPitch: pitchDraft.trim(),
                              });
                            }
                            setIsEditingPitch(false);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1 font-bold text-white shadow-sm transition cursor-pointer"
                        >
                          <Save className="h-3 w-3" />
                          <span>Save Pitch</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {(() => {
                      const defs = getDefaultStagedMessages(selectedLead);
                      const currentPitch = selectedLead.pitchHook || selectedLead.stagedDmMiniPitch || defs.stagedDmMiniPitch;
                      return (
                        <>
                          <p className="text-xs text-slate-200 leading-relaxed font-sans select-all bg-slate-950/70 p-2.5 rounded-lg border border-white/5 line-clamp-4">
                            "{currentPitch}"
                          </p>
                          <div className="flex items-center justify-between pt-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() => handleCopyPitchText(currentPitch)}
                              className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                            >
                              {copiedPitch ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedPitch ? 'Copied Pitch!' : 'Copy Pitch'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setVaultModalLead(selectedLead)}
                              className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-300 transition cursor-pointer"
                            >
                              <FileText className="h-3 w-3" />
                              <span>4-Step Sequence Vault</span>
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Strategic Pitch Notes */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Strategic Notes & Context:
                </label>
                <div className="rounded-xl bg-slate-950/70 p-3 text-xs text-slate-300 border border-white/5 leading-relaxed">
                  {selectedLead.notes || 'No custom notes provided for this lead.'}
                </div>
              </div>

              {/* Touchpoint History */}
              {(() => {
                const leadLogs = followupLogs.filter((l) => l.leadId === selectedLead.id);
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Touchpoint History ({leadLogs.length}):</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Started: {selectedLead.dateFirstContact}
                      </span>
                    </div>

                    {leadLogs.length > 0 ? (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {leadLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950/80 px-2.5 py-1.5 text-[11px]"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  log.actionType === 'replied' ? 'bg-emerald-400' : 'bg-indigo-400'
                                }`}
                              />
                              <span className="text-slate-300 font-medium">{log.note}</span>
                            </div>
                            <span className="text-slate-500 font-mono text-[10px]">{log.logDate}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-950/40 p-2.5 text-center text-[11px] text-slate-500 border border-white/5">
                        No touchpoint logs recorded for this lead yet.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Lead Details & Outreach Actions */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(selectedLead)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 py-2.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 transition shadow-sm cursor-pointer"
                  >
                    <Info className="h-4 w-4 text-indigo-400" />
                    <span>View Full Extracted Details</span>
                  </button>
                )}

                <button
                  onClick={() => onSelectLeadForCopilot(selectedLead)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-xs font-bold text-white hover:from-indigo-500 hover:to-purple-500 transition shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>Open in Follow-Up Copilot</span>
                </button>

                {onRejectLead && selectedLead.status !== 'closed_dead' && (
                  <button
                    type="button"
                    onClick={() => onRejectLead(selectedLead)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600/20 border border-rose-500/30 py-2 text-xs font-bold text-rose-300 hover:bg-rose-600/30 transition shadow-sm cursor-pointer"
                  >
                    <Ban className="h-4 w-4" />
                    <span>Reject & Save to Duplicate Blacklist</span>
                  </button>
                )}

                {selectedLead.status === 'closed_dead' ? (
                  <button
                    type="button"
                    onClick={() => onDeleteLead(selectedLead.id)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-rose-600/30 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Trash This Dead Lead</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onDeleteLead(selectedLead.id)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Lead Record</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500">
              Select a lead from the master table to manage details.
            </div>
          )}
        </div>
      </div>

      {/* 4-Step Sequence Vault Modal */}
      <LeadMessageVaultModal
        lead={vaultModalLead}
        isOpen={!!vaultModalLead}
        onClose={() => setVaultModalLead(null)}
        onSaveLead={(updatedLead) => {
          if (onUpdateLead) onUpdateLead(updatedLead);
        }}
        showToast={() => {}}
      />

      {/* Dual Mockup Screenshots & Permission Vault Modal */}
      {mockupModalLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setMockupModalLead(null)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">
                  Mockup Screenshots &amp; Permission Pitch: {mockupModalLead.restaurantName}
                </h3>
                <p className="text-xs text-slate-400">
                  Store desktop &amp; mobile redesign screenshots. Copy image or script in 1-click to request permission.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMockupModalLead(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
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
