import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  X,
  ArrowRight,
  StickyNote,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import {
  getNextLeadId,
  extractSuggestedName,
  exportChannelData,
  getChannelLabel,
  normalizeUrlForDuplicateCheck,
  formatAddedDate,
  validateChannelLink,
} from '../../utils/channelStorage';
import { playWarningChime } from '../../utils/soundEffects';
import { LeadAnalysisModal } from './LeadAnalysisModal';
import { QuickNoteModal } from '../QuickNoteModal';

interface LeadsSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
  onNavigateToChannel?: (channel: MultiChannelType) => void;
}

interface SortableLeadRowProps {
  lead: ChannelLead;
  onDelete: (id: string) => void;
  onOpenAnalysis: (lead: ChannelLead) => void;
  onOpenNote: (lead: ChannelLead) => void;
  isJustAdded?: boolean;
}

function SortableLeadRow({ lead, onDelete, onOpenAnalysis, onOpenNote, isJustAdded }: SortableLeadRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const formattedUrl = lead.link.startsWith('http://') || lead.link.startsWith('https://')
    ? lead.link
    : `https://${lead.link}`;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-white/[0.06] transition-all duration-300 group ${
        isDragging
          ? 'bg-indigo-950/60 shadow-xl border-indigo-500/40 opacity-95'
          : isJustAdded
          ? 'bg-indigo-950/50 ring-1 ring-indigo-500/70 border-indigo-500/40'
          : 'hover:bg-white/[0.02]'
      }`}
    >
      {/* Drag Handle & ID */}
      <td className="py-3.5 px-4 text-left font-mono text-xs tabular-nums text-slate-300">
        <div className="flex items-center gap-2">
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
          {isJustAdded && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono animate-pulse">
              NEW
            </span>
          )}
        </div>
      </td>

      {/* Name & Visual Indicator (Green dot + Analysis Ready badge + Quick Note badge) */}
      <td className="py-3.5 px-4 text-left">
        <div className="flex flex-col gap-1">
          <span className="truncate max-w-xs text-sm font-medium text-slate-100 font-['Outfit']">{lead.name}</span>
          <div className="flex items-center gap-2 flex-wrap">
            {lead.leadAnalysis ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                Analysis Ready
              </span>
            ) : (
              <span className="text-[10px] text-slate-500">No analysis yet</span>
            )}

            {lead.quickNote && (
              <button
                type="button"
                onClick={() => onOpenNote(lead)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-medium transition cursor-pointer max-w-xs truncate"
                title={`Quick Note: ${lead.quickNote} (click to edit)`}
              >
                <StickyNote className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span className="truncate">"{lead.quickNote}"</span>
              </button>
            )}
          </div>
        </div>
      </td>

      {/* Link */}
      <td className="py-3.5 px-4 text-left text-xs text-slate-400">
        <a
          href={formattedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors max-w-sm truncate group/link"
        >
          <span className="truncate">{lead.link}</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover/link:opacity-100" />
        </a>
      </td>

      {/* Action Column: Quick Note, Prompt Button & Delete */}
      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenNote(lead)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              lead.quickNote
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 shadow-sm'
                : 'border-white/10 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title={lead.quickNote ? 'Edit Quick Note' : 'Add Quick Note'}
            aria-label={`Note for ${lead.name}`}
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-400" />
            <span>{lead.quickNote ? 'Note' : '+ Note'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAnalysis(lead)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              lead.leadAnalysis
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 shadow-sm'
                : 'border-white/10 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Open Gemini Lead Analysis & DeepSeek prompt hub"
            aria-label={`Open prompt analysis for ${lead.name}`}
          >
            <span>📋 Prompt</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(lead.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Delete lead"
            aria-label={`Delete ${lead.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function LeadsSubPage({ channel, leads, onUpdateLeads, onNavigateToChannel }: LeadsSubPageProps) {
  const [linkInput, setLinkInput] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingLink, setPendingLink] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicateAlert, setDuplicateAlert] = useState<{
    message: string;
    timestamp: number;
    detectedChannel?: MultiChannelType;
  } | null>(null);

  // Floating Action Button Centered Add Lead Modal state
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [modalLinkInput, setModalLinkInput] = useState('');
  const [modalNameInput, setModalNameInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [justAddedLeadId, setJustAddedLeadId] = useState<string | null>(null);

  // Gemini Lead Analysis Modal state
  const [selectedLeadForAnalysis, setSelectedLeadForAnalysis] = useState<ChannelLead | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  // Quick Note Modal state
  const [noteModalLead, setNoteModalLead] = useState<ChannelLead | null>(null);

  const handleSaveQuickNote = (noteText: string) => {
    if (!noteModalLead) return;
    const trimmed = noteText.trim();
    const updated = leads.map((l) =>
      l.id === noteModalLead.id
        ? {
            ...l,
            quickNote: trimmed || undefined,
            quickNoteSavedAt: trimmed ? new Date().toISOString() : undefined,
          }
        : l
    );
    onUpdateLeads(updated);
    setNoteModalLead(null);
  };

  const handleDeleteQuickNote = () => {
    if (!noteModalLead) return;
    const updated = leads.map((l) =>
      l.id === noteModalLead.id
        ? {
            ...l,
            quickNote: undefined,
            quickNoteSavedAt: undefined,
          }
        : l
    );
    onUpdateLeads(updated);
    setNoteModalLead(null);
  };

  const handleOpenAnalysis = (lead: ChannelLead) => {
    setSelectedLeadForAnalysis(lead);
    setIsAnalysisModalOpen(true);
  };

  const handleSaveAnalysis = (leadId: string, analysisText: string) => {
    const updated = leads.map((l) => {
      if (l.id === leadId) {
        return {
          ...l,
          leadAnalysis: analysisText,
          analysisSavedAt: new Date().toISOString(),
        };
      }
      return l;
    });
    onUpdateLeads(updated);
    if (selectedLeadForAnalysis && selectedLeadForAnalysis.id === leadId) {
      setSelectedLeadForAnalysis({
        ...selectedLeadForAnalysis,
        leadAnalysis: analysisText,
        analysisSavedAt: new Date().toISOString(),
      });
    }
  };

  // Auto-dismiss the duplicate alert after 6 seconds
  useEffect(() => {
    if (!duplicateAlert) return;
    const timer = setTimeout(() => {
      setDuplicateAlert(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [duplicateAlert]);

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

  const handleLinkInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkInput.trim();
    if (!trimmed) return;

    // 1. Strict Channel-Specific Link Validation
    const validation = validateChannelLink(trimmed, channel);
    if (!validation.isValid) {
      playWarningChime();
      setDuplicateAlert({
        message: validation.errorMessage || 'Invalid link format for this channel.',
        timestamp: Date.now(),
        detectedChannel: validation.detectedChannel,
      });
      return;
    }

    // 2. Duplicate Check on Normalized URL
    const normalizedInput = normalizeUrlForDuplicateCheck(trimmed, channel);
    const existingLead = leads.find((l) => {
      const lNorm = normalizeUrlForDuplicateCheck(l.link, channel);
      return lNorm && lNorm === normalizedInput;
    });

    if (existingLead) {
      // Do NOT save it. Trigger warning chime and red alert/toast message
      playWarningChime();
      const dateFormatted = formatAddedDate(existingLead.createdAt);
      setDuplicateAlert({
        message: `Warning: This link has already been added. ${existingLead.name} was added on ${dateFormatted}.`,
        timestamp: Date.now(),
      });
      return;
    }

    // Clear any previous alert
    setDuplicateAlert(null);

    // Prompt for business name upon paste (normal flow)
    const suggested = extractSuggestedName(trimmed);
    setPendingLink(trimmed);
    setPendingName(suggested);
    setShowNameModal(true);
  };

  const handleConfirmAddLead = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Strict Channel Validation check
    const validation = validateChannelLink(pendingLink, channel);
    if (!validation.isValid) {
      playWarningChime();
      setDuplicateAlert({
        message: validation.errorMessage || 'Invalid link format for this channel.',
        timestamp: Date.now(),
        detectedChannel: validation.detectedChannel,
      });
      setShowNameModal(false);
      setPendingLink('');
      setPendingName('');
      return;
    }

    // 2. Duplicate Check
    const normalizedInput = normalizeUrlForDuplicateCheck(pendingLink, channel);
    const existingLead = leads.find((l) => {
      const lNorm = normalizeUrlForDuplicateCheck(l.link, channel);
      return lNorm && lNorm === normalizedInput;
    });

    if (existingLead) {
      playWarningChime();
      const dateFormatted = formatAddedDate(existingLead.createdAt);
      setDuplicateAlert({
        message: `Warning: This link has already been added. ${existingLead.name} was added on ${dateFormatted}.`,
        timestamp: Date.now(),
      });
      setShowNameModal(false);
      setPendingLink('');
      setPendingName('');
      return;
    }

    const finalName = pendingName.trim() || extractSuggestedName(pendingLink) || 'Prospect';
    const { id, numericId } = getNextLeadId(channel, leads);

    const newLead: ChannelLead = {
      id,
      numericId,
      name: finalName,
      link: pendingLink,
      channel,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    };

    // Prepend new lead to index 0, strictly preserving all existing leads and their relative order
    const updated = [newLead, ...leads].map((l, index) => ({
      ...l,
      sortOrder: index,
    }));
    onUpdateLeads(updated);

    // Highlight newly created lead at top
    setJustAddedLeadId(id);
    setTimeout(() => setJustAddedLeadId(null), 3000);

    // Reset state
    setShowNameModal(false);
    setPendingLink('');
    setPendingName('');
    setLinkInput('');
  };

  const handleModalLinkChange = (value: string) => {
    setModalLinkInput(value);
    setModalError(null);
    if (!modalNameInput || modalNameInput === extractSuggestedName(modalLinkInput)) {
      setModalNameInput(extractSuggestedName(value));
    }
  };

  const handleCreateLeadFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLink = modalLinkInput.trim();
    if (!trimmedLink) {
      setModalError('Please enter a link or handle.');
      return;
    }

    // 1. Strict Channel Validation check
    const validation = validateChannelLink(trimmedLink, channel);
    if (!validation.isValid) {
      playWarningChime();
      setModalError(validation.errorMessage || 'Invalid link format for this channel.');
      return;
    }

    // 2. Duplicate Check
    const normalizedInput = normalizeUrlForDuplicateCheck(trimmedLink, channel);
    const existingLead = leads.find((l) => {
      const lNorm = normalizeUrlForDuplicateCheck(l.link, channel);
      return lNorm && lNorm === normalizedInput;
    });

    if (existingLead) {
      playWarningChime();
      const dateFormatted = formatAddedDate(existingLead.createdAt);
      setModalError(`Warning: This link has already been added. ${existingLead.name} was added on ${dateFormatted}.`);
      return;
    }

    const finalName = modalNameInput.trim() || extractSuggestedName(trimmedLink) || 'Prospect';
    const { id, numericId } = getNextLeadId(channel, leads);

    const newLead: ChannelLead = {
      id,
      numericId,
      name: finalName,
      link: trimmedLink,
      channel,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    };

    // Prepend new lead at index 0, strictly preserving all existing leads and their order
    const updated = [newLead, ...leads].map((l, index) => ({
      ...l,
      sortOrder: index,
    }));
    onUpdateLeads(updated);

    // Highlight newly created lead at top
    setJustAddedLeadId(id);
    setTimeout(() => setJustAddedLeadId(null), 3000);

    // Close modal & reset
    setIsAddLeadModalOpen(false);
    setModalLinkInput('');
    setModalNameInput('');
    setModalError(null);
  };

  const handleDeleteLead = (id: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      const filtered = leads.filter((l) => l.id !== id);
      // Re-normalize sortOrder
      const reindexed = filtered.map((l, index) => ({ ...l, sortOrder: index }));
      onUpdateLeads(reindexed);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = leads.findIndex((item) => item.id === active.id);
    const newIndex = leads.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(leads, oldIndex, newIndex).map((item, index) => ({
        ...item,
        sortOrder: index,
      }));
      onUpdateLeads(reordered);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.id.toLowerCase().includes(q) ||
      l.name.toLowerCase().includes(q) ||
      l.link.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Red Alert / Toast Message for Duplicate Link Prevention or Channel Mismatch */}
      {duplicateAlert && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-5 right-5 z-50 max-w-lg w-[calc(100vw-2.5rem)] rounded-2xl border border-rose-500/50 bg-rose-950/95 p-4 text-xs sm:text-sm font-semibold text-rose-100 shadow-2xl shadow-rose-950/60 backdrop-blur-md animate-in slide-in-from-top-3 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="leading-snug">{duplicateAlert.message}</p>
            {duplicateAlert.detectedChannel && onNavigateToChannel && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToChannel(duplicateAlert.detectedChannel!);
                  setDuplicateAlert(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <span>Switch to {getChannelLabel(duplicateAlert.detectedChannel)} Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDuplicateAlert(null)}
            className="text-rose-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Inline Red Alert Banner */}
      {duplicateAlert && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/50 bg-rose-500/15 p-3.5 text-xs sm:text-sm font-semibold text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{duplicateAlert.message}</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {duplicateAlert.detectedChannel && onNavigateToChannel && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToChannel(duplicateAlert.detectedChannel!);
                  setDuplicateAlert(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <span>Switch to {getChannelLabel(duplicateAlert.detectedChannel)}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setDuplicateAlert(null)}
              className="text-rose-400 hover:text-white p-1 rounded transition cursor-pointer"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Intake Bar & Actions */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Intake Input Form */}
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
              placeholder={`Paste ${getChannelLabel(channel)} link or handle (e.g. instagram.com/handle) and press Enter...`}
              className={`w-full pl-10 pr-24 py-3 bg-slate-900/80 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all font-sans ${
                duplicateAlert
                  ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              }`}
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


        {/* Search & Export Buttons */}
        <div className="flex items-center gap-2.5">
          {leads.length > 5 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads..."
                className="pl-8 pr-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 md:w-44"
              />
            </div>
          )}

          {/* Export Data Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={leads.length === 0}
              className="px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-900/80 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Data</span>
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

      {/* Table Display: Shows ONLY ID, Name, Link, Delete */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 text-left w-32">ID</th>
                  <th className="py-3 px-4 text-left">Name</th>
                  <th className="py-3 px-4 text-left">Link</th>
                  <th className="py-3 px-4 text-right w-44">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-slate-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <p className="text-sm font-medium text-slate-400">No leads in {getChannelLabel(channel)} yet</p>
                        <p className="text-xs text-slate-500">
                          Paste any link or handle above and press Enter to instantly intake your first lead.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500 text-xs">
                      No leads match "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  <SortableContext
                    items={filteredLeads.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredLeads.map((lead) => (
                      <SortableLeadRow
                        key={lead.id}
                        lead={lead}
                        onDelete={handleDeleteLead}
                        onOpenAnalysis={handleOpenAnalysis}
                        onOpenNote={setNoteModalLead}
                        isJustAdded={lead.id === justAddedLeadId}
                      />
                    ))}
                  </SortableContext>
                )}
              </tbody>
            </table>
          </DndContext>
        </div>

        {leads.length > 0 && (
          <div className="px-4 py-3 bg-slate-950/40 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>
              Total leads: <strong className="text-slate-200 font-mono">{leads.length}</strong>
            </span>
            <span className="text-[11px] text-slate-500">
              Drag rows by handle icon to reorder priority
            </span>
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
                  Pasted Link
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

      {/* Gemini Lead Analysis & Prompt Hub Modal */}
      <LeadAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        lead={selectedLeadForAnalysis}
        channel={channel}
        onSaveAnalysis={handleSaveAnalysis}
      />

      {/* Centered Add Lead Modal (Triggered by Floating Action Button) */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-['Outfit']">
                    Add {getChannelLabel(channel)} Lead
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lead will appear immediately at the top of your list.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddLeadModalOpen(false);
                  setModalError(null);
                }}
                className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateLeadFromModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Profile Link or Handle <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={modalLinkInput}
                  onChange={(e) => handleModalLinkChange(e.target.value)}
                  placeholder={
                    channel === 'instagram'
                      ? 'https://instagram.com/business or @handle'
                      : channel === 'facebook'
                      ? 'https://facebook.com/business_page'
                      : 'contact@domain.com or https://website.com'
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Business / Contact Name
                </label>
                <input
                  type="text"
                  value={modalNameInput}
                  onChange={(e) => setModalNameInput(e.target.value)}
                  placeholder="e.g. Trattoria Luigi"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddLeadModalOpen(false);
                    setModalError(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Note Modal */}
      <QuickNoteModal
        isOpen={Boolean(noteModalLead)}
        lead={noteModalLead}
        onClose={() => setNoteModalLead(null)}
        onSave={handleSaveQuickNote}
        onDelete={handleDeleteQuickNote}
      />

      {/* Floating Add Lead Circular Button (Visible strictly on Leads tab) */}
      <div className="fixed bottom-20 right-6 sm:bottom-24 sm:right-8 z-40">
        <button
          type="button"
          onClick={() => {
            setModalLinkInput('');
            setModalNameInput('');
            setModalError(null);
            setIsAddLeadModalOpen(true);
          }}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white shadow-2xl shadow-indigo-950/80 hover:shadow-indigo-500/50 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer border border-indigo-400/40 group"
          title={`Add new ${getChannelLabel(channel)} lead`}
          aria-label={`Add new ${getChannelLabel(channel)} lead`}
        >
          <Plus className="w-7 h-7 text-white group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>
    </div>
  );
}
