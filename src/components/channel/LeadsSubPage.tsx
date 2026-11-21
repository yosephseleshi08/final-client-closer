import React, { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Trash2,
  ExternalLink,
  Download,
  Plus,
  Link as LinkIcon,
  Search,
  Check,
  FileSpreadsheet,
  FileCode,
  AlertTriangle,
  Sparkles,
  Copy,
  Mail,
  Instagram,
  Facebook,
  X,
  ShieldAlert,
} from 'lucide-react';
import { ChannelLead, MultiChannelType, VoiceType } from '../../types';
import {
  getNextLeadId,
  extractSuggestedName,
  exportChannelData,
  getChannelLabel,
  getPlatformLink,
  getLeadEmail,
  findDuplicateLead,
  hasSocialWarmupLink,
  reorderChannelLeadsWithFixedLocks,
  removeAndResequenceActiveLeads,
} from '../../utils/channelStorage';
import {
  getStrictVoiceTypeForId,
  getVoiceTypeBadgeStyle,
  getWorkspaceFilterOptions,
  formatDeepSeekBatchPrompt,
} from '../../utils/voiceTypeEngine';
import { getNextAvailableScheduleDate } from '../../utils/cadenceEngine';
import { findNormalizedDuplicateMatches, hasLeadSentHistory } from '../../utils/leadLifecycle';
import { archiveLeadsWithChoice } from '../../utils/backstageStorage';
import { extractCleanEmail } from '../../utils/dataRepair';
import { TestLinkButton } from '../TestLinkButton';
import { LeadAnalysisModal, AnalyzableLead } from './LeadAnalysisModal';

interface LeadsSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
  onNavigateToBackstage?: () => void;
  allLeads?: {
    combined: ChannelLead[];
    instagram: ChannelLead[];
  };
}

interface SortableLeadRowProps {
  lead: ChannelLead;
  channel: MultiChannelType;
  onOpenAnalysis: (lead: ChannelLead) => void;
  onRequestArchive: (lead: ChannelLead) => void;
}

function SortableLeadRow({
  lead,
  channel,
  onOpenAnalysis,
  onRequestArchive,
}: SortableLeadRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const voiceType = lead.voiceType || getStrictVoiceTypeForId(lead, channel);
  const voiceStyle = getVoiceTypeBadgeStyle(voiceType);

  const cleanEmail = getLeadEmail(lead);
  const displayLink = cleanEmail || lead.platformLink || lead.link;
  const resolvedHref = getPlatformLink(
    cleanEmail ? cleanEmail : lead,
    cleanEmail ? 'email' : channel
  );
  const isMail = resolvedHref.startsWith('mailto:');
  const hasAnalysis = Boolean(lead.leadAnalysis?.trim() || lead.prompt?.trim());

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-white/[0.06] transition-colors group ${
        isDragging
          ? 'bg-indigo-950/60 shadow-xl border-indigo-500/40 opacity-95'
          : 'hover:bg-white/[0.02]'
      }`}
    >
      {/* Drag Handle & ID + Voice Badge */}
      <td className="py-3.5 px-4 text-left font-mono text-xs tabular-nums text-slate-300">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 transition-colors p-1 rounded hover:bg-white/5"
            title="Drag to reorder priority"
            aria-label={`Reorder lead ${lead.id}`}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {lead.id}
          </span>
          <span
            className={`px-2 py-0.5 rounded border text-[10px] font-bold font-mono ${voiceStyle.badgeClass}`}
            title={`Assigned Voice Type: ${voiceType}`}
          >
            {voiceType}
          </span>
        </div>
      </td>

      {/* Name */}
      <td className="py-3.5 px-4 text-left text-sm font-medium text-slate-100">
        <div className="flex items-center gap-2">
          <span className="truncate max-w-xs block font-['Outfit']">{lead.name}</span>
          {lead.initialSentDate && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
              D0 {lead.initialSentDate}
            </span>
          )}
        </div>
      </td>

      {/* Link + Email Invalid Flag + Test Link */}
      <td className="py-3.5 px-4 text-left text-xs text-slate-400">
        <div className="flex items-center gap-2 flex-wrap">
          {lead.hasInvalidEmail && (
            <span
              className="inline-flex items-center text-rose-400 shrink-0"
              title="Invalid or unfixable email address detected during diagnostic repair. Update manually before sending."
            >
              <AlertTriangle className="w-4 h-4" />
            </span>
          )}
          {resolvedHref ? (
            <a
              href={resolvedHref}
              target={isMail ? '_self' : '_blank'}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors max-w-xs truncate group/link"
              title={resolvedHref}
            >
              {isMail ? (
                <Mail className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
              ) : displayLink.toLowerCase().includes('facebook') ? (
                <Facebook className="w-3.5 h-3.5 shrink-0 text-sky-400" />
              ) : (
                <Instagram className="w-3.5 h-3.5 shrink-0 text-pink-400" />
              )}
              <span className="truncate">{displayLink}</span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-70 group-hover/link:opacity-100" />
            </a>
          ) : (
            <span className="text-slate-500 truncate max-w-xs">{displayLink || 'No link'}</span>
          )}
          <TestLinkButton
            lead={lead}
            url={cleanEmail || displayLink}
            platform={cleanEmail ? 'email' : channel}
          />
        </div>
      </td>

      {/* Actions: Prompt/Analysis + Archive */}
      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onOpenAnalysis(lead)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 border ${
              hasAnalysis
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-white/5 text-slate-400 hover:text-white border-white/10 hover:bg-white/10'
            }`}
            title="View / Edit Lead Analysis & DeepSeek Prompt"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{hasAnalysis ? 'Prompt' : 'Notes'}</span>
          </button>

          <button
            type="button"
            onClick={() => onRequestArchive(lead)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Move lead to Backstage archive"
            aria-label={`Archive ${lead.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function LeadsSubPage({
  channel,
  leads,
  onUpdateLeads,
  onNavigateToBackstage,
  allLeads,
}: LeadsSubPageProps) {
  const [linkInput, setLinkInput] = useState('');
  const [duplicateAlert, setDuplicateAlert] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingLink, setPendingLink] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [voiceFilter, setVoiceFilter] = useState<VoiceType | 'all'>('all');
  const [batchPromptCopied, setBatchPromptCopied] = useState(false);
  const [analysisLead, setAnalysisLead] = useState<ChannelLead | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ChannelLead | null>(null);
  const [archiveReason, setArchiveReason] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filterOptions = useMemo(() => getWorkspaceFilterOptions(channel), [channel]);

  const checkForNormalizedDuplicate = (candidateLink: string, candidateName?: string): string | null => {
    const trimmed = candidateLink.trim();
    if (!trimmed) return null;

    const cleanEmail = extractCleanEmail(trimmed);
    const localDup = findDuplicateLead(cleanEmail || trimmed, leads);
    if (localDup) {
      return `Duplicate blocked: "${trimmed}" matches existing ${localDup.id} (${localDup.name}).`;
    }

    const crossMatch = findNormalizedDuplicateMatches(
      {
        name: candidateName,
        link: trimmed,
        platformLink: trimmed,
        email: cleanEmail || undefined,
      },
      {
        targetChannel: channel === 'instagram' ? 'instagram' : 'combined',
        activeCombined: allLeads?.combined,
        activeInstagram: allLeads?.instagram,
      }
    );

    if (crossMatch.hasMatch) {
      return `Duplicate blocked: ${crossMatch.summaryReason || `"${trimmed}" already exists in CRM / Backstage / Dispatch Log.`}`;
    }

    return null;
  };

  const handleLinkInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateAlert(null);
    const trimmed = linkInput.trim();
    if (!trimmed) return;

    const dupMessage = checkForNormalizedDuplicate(trimmed);
    if (dupMessage) {
      setDuplicateAlert(dupMessage);
      return;
    }

    const suggested = extractSuggestedName(trimmed);
    setPendingLink(trimmed);
    setPendingName(suggested);
    setShowNameModal(true);
  };

  const handleConfirmAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = pendingName.trim() || extractSuggestedName(pendingLink) || 'Prospect';
    const dupMessage = checkForNormalizedDuplicate(pendingLink, finalName);
    if (dupMessage) {
      setDuplicateAlert(dupMessage);
      setShowNameModal(false);
      return;
    }

    const { id, numericId } = getNextLeadId(channel, leads);
    const cleanEmail = extractCleanEmail(pendingLink);
    const storedLink = cleanEmail || pendingLink.trim();
    const emailOnly = !hasSocialWarmupLink({
      channel,
      link: storedLink,
      platformLink: storedLink,
      email: cleanEmail || undefined,
    });
    const assignedScheduleDate = getNextAvailableScheduleDate(leads, channel);

    const newLead: ChannelLead = {
      id,
      numericId,
      name: finalName,
      link: storedLink,
      platformLink: storedLink,
      email: cleanEmail || undefined,
      channel,
      voiceType: getStrictVoiceTypeForId(numericId, channel),
      isVoiceTypeOverridden: false,
      sortOrder: leads.length,
      createdAt: new Date().toISOString(),
      scheduledDate: assignedScheduleDate,
      warmupStatus: emailOnly ? 'warmed' : 'locked',
      isWarmedUp: emailOnly,
    };

    const updated = [...leads, newLead];
    onUpdateLeads(updated);

    setShowNameModal(false);
    setPendingLink('');
    setPendingName('');
    setLinkInput('');
  };

  const handleConfirmArchive = (choice: 'keep_running' | 'cancel_cadence') => {
    if (!archiveTarget) return;
    archiveLeadsWithChoice(
      [archiveTarget],
      channel,
      choice,
      archiveReason.trim() || undefined
    );
    const nextActive = removeAndResequenceActiveLeads(leads, [archiveTarget.id], channel);
    onUpdateLeads(nextActive);
    setArchiveTarget(null);
    setArchiveReason('');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = leads.findIndex((item) => item.id === active.id);
    const newIndex = leads.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const moved = arrayMove(leads, oldIndex, newIndex);
      onUpdateLeads(reorderChannelLeadsWithFixedLocks(moved, channel));
    }
  };

  const handleSaveAnalysis = (leadId: string, analysisText: string) => {
    const nowIso = new Date().toISOString();
    const updated = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            leadAnalysis: analysisText,
            prompt: analysisText,
            analysisSavedAt: nowIso,
          }
        : l
    );
    onUpdateLeads(updated);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (voiceFilter !== 'all') {
        const vt = l.voiceType || getStrictVoiceTypeForId(l, channel);
        if (vt !== voiceFilter) return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.id.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.link.toLowerCase().includes(q) ||
        (l.email && l.email.toLowerCase().includes(q))
      );
    });
  }, [leads, voiceFilter, searchQuery, channel]);

  const handleCopyBatchPrompt = () => {
    if (filteredLeads.length === 0) return;
    const text = formatDeepSeekBatchPrompt(filteredLeads, voiceFilter, channel);
    navigator.clipboard.writeText(text);
    setBatchPromptCopied(true);
    setTimeout(() => setBatchPromptCopied(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Top Intake Bar & Actions */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleLinkInputSubmit} className="flex-1 relative">
          <div className="relative flex items-center">
            <LinkIcon className="w-4 h-4 absolute left-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                if (duplicateAlert) setDuplicateAlert(null);
              }}
              placeholder={`Paste ${getChannelLabel(channel)} link, handle, or email and press Enter...`}
              className="w-full pl-10 pr-24 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
            />
            <button
              type="submit"
              disabled={!linkInput.trim()}
              className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </form>

        {/* Filter, Batch Prompt & Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={voiceFilter}
            onChange={(e) => setVoiceFilter(e.target.value as VoiceType | 'all')}
            className="px-3 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer font-mono"
            aria-label="Filter by Voice Type"
          >
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {leads.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads..."
                className="pl-8 pr-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 md:w-44"
              />
            </div>
          )}

          {filteredLeads.length > 0 && (
            <button
              type="button"
              onClick={handleCopyBatchPrompt}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                batchPromptCopied
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-500/30 text-indigo-300 hover:text-white'
              }`}
              title="Copy batch DeepSeek prompt for currently filtered leads"
            >
              {batchPromptCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{batchPromptCopied ? 'Copied Batch' : 'Batch Prompt'}</span>
            </button>
          )}

          {/* Export Data Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={leads.length === 0}
              className="px-3.5 py-2 rounded-xl border border-white/10 bg-slate-900/80 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-40 rounded-xl bg-slate-900 border border-white/10 shadow-2xl p-1 z-50 backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => {
                      exportChannelData(channel, 'csv', leads);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportChannelData(channel, 'json', leads);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Download JSON</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Normalized URL Duplicate Prevention Banner */}
      {duplicateAlert && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 flex items-center justify-between gap-3 text-xs text-rose-200 animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{duplicateAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setDuplicateAlert(null)}
            className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Leads Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 text-left w-48">ID &amp; Type</th>
                <th className="py-3 px-4 text-left">Prospect Name</th>
                <th className="py-3 px-4 text-left">Target Link / Email</th>
                <th className="py-3 px-4 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="text-sm font-medium text-slate-400">
                        No leads in {getChannelLabel(channel)} yet
                      </p>
                      <p className="text-xs text-slate-500">
                        Paste any link or handle above and press Enter to intake your first lead, or accept leads from the Lead Inbox.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 text-xs">
                    No leads match current filter criteria.
                  </td>
                </tr>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredLeads.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredLeads.map((lead) => (
                      <SortableLeadRow
                        key={lead.id}
                        lead={lead}
                        channel={channel}
                        onOpenAnalysis={setAnalysisLead}
                        onRequestArchive={setArchiveTarget}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </tbody>
          </table>
        </div>

        {leads.length > 0 && (
          <div className="px-4 py-3 bg-slate-950/40 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
            <span>
              Showing <strong className="text-slate-200 font-mono">{filteredLeads.length}</strong> of{' '}
              <strong className="text-slate-200 font-mono">{leads.length}</strong> leads
            </span>
            <div className="flex items-center gap-3">
              {onNavigateToBackstage && (
                <button
                  type="button"
                  onClick={onNavigateToBackstage}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                >
                  View Backstage Archive
                </button>
              )}
              <span className="text-[11px] text-slate-500">
                Drag handle to reorder priority
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Business Name Prompt Modal (Upon Link Paste) */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">Confirm Business Name</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter or verify the name for this prospect. It will be assigned to the next available ID.
              </p>
            </div>

            <form onSubmit={handleConfirmAddLead} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Business / Prospect Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  placeholder="e.g. Acme Studio, Luigi's Kitchen"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Pasted Link / Contact
                </label>
                <div className="px-3.5 py-2 bg-slate-950/60 border border-white/5 rounded-xl text-xs text-slate-400 truncate font-mono">
                  {pendingLink}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNameModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backstage Soft-Delete / Archive Modal */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white font-['Outfit']">
                  Archive Lead to Backstage
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  <strong className="text-slate-200">{archiveTarget.id} · {archiveTarget.name}</strong> will be moved safely to Backstage. Historical outreach counts stay locked.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setArchiveTarget(null);
                  setArchiveReason('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Optional Note / Reason
              </label>
              <input
                type="text"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="e.g. Not a fit, paused for Q1, bounced email..."
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {hasLeadSentHistory(archiveTarget) && (
                <button
                  type="button"
                  onClick={() => handleConfirmArchive('keep_running')}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-bold transition cursor-pointer"
                >
                  Archive &amp; Keep D4/D8/D14 Follow-Ups Running
                </button>
              )}
              <button
                type="button"
                onClick={() => handleConfirmArchive('cancel_cadence')}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition cursor-pointer"
              >
                {hasLeadSentHistory(archiveTarget)
                  ? 'Archive & Cancel Future Cadence'
                  : 'Move to Backstage Archive'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setArchiveTarget(null);
                  setArchiveReason('');
                }}
                className="w-full py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Analysis & Prompt Hub Modal */}
      <LeadAnalysisModal
        isOpen={Boolean(analysisLead)}
        onClose={() => setAnalysisLead(null)}
        lead={analysisLead as AnalyzableLead | null}
        channel={channel}
        onSaveAnalysis={handleSaveAnalysis}
      />
    </div>
  );
}
