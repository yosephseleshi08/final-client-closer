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
  Download,
  Search,
  FileSpreadsheet,
  FileCode,
  AlertCircle,
  X,
  ArrowRight,
  Upload,
  FileText,
  Copy,
  Check,
  Sparkles,
  Shuffle,
  ShieldCheck,
  Save,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import {
  getNextLeadId,
  extractSuggestedName,
  exportChannelData,
  getChannelLabel,
  resequenceLeadIds,
  findDuplicateLead,
  detectLinkChannel,
} from '../../utils/channelStorage';
import {
  getScheduleDayStyle,
  isDateToday,
  getNextAvailableScheduleDate,
} from '../../utils/cadenceEngine';
import { playWarningChime } from '../../utils/soundEffects';

interface LeadsSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
  onNavigateToChannel?: (channel: MultiChannelType) => void;
}

interface SortableLeadRowProps {
  lead: ChannelLead;
  channel: MultiChannelType;
  onDelete: (id: string) => void;
  onOpenPrompt: (lead: ChannelLead) => void;
  isJustAdded?: boolean;
}

/**
 * Spintax Generator Helper
 * Replaces any {option1|option2|option3} block with a random choice.
 */
export function spinSpintax(template: string): string {
  if (!template) return '';
  return template.replace(/\{([^{}]+)\}/g, (_, group) => {
    const choices = group.split('|');
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    return chosen.trim();
  });
}

/**
 * Row component for the Closed-System Leads Table
 * Rules enforced:
 * - Anti-Cheat: Profile link is strictly PLAIN TEXT (unclickable, no href).
 * - "Warm Up" badge replaced with "Prompt" button that opens analysis & Spintax editor.
 * - Action column contains ONLY the Delete button.
 */
function SortableLeadRow({
  lead,
  channel,
  onDelete,
  onOpenPrompt,
  isJustAdded,
}: SortableLeadRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const dayStyle = getScheduleDayStyle(lead.scheduledDate);
  const isDueToday = isDateToday(lead.scheduledDate);
  const plainLink = lead.platformLink || lead.link;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-white/[0.06] transition-all duration-200 group ${
        dayStyle.borderClass
      } ${dayStyle.tintClass} ${
        isDragging
          ? 'bg-indigo-950/60 shadow-xl border-indigo-500/40 opacity-95'
          : isJustAdded
          ? 'bg-indigo-950/50 ring-2 ring-indigo-500/70 border-indigo-500/40'
          : isDueToday
          ? 'ring-2 ring-emerald-500/50 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
          : ''
      }`}
    >
      {/* 1. Drag Handle & ID */}
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
          {isDueToday && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm animate-pulse">
              TODAY
            </span>
          )}
          {isJustAdded && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              NEW
            </span>
          )}
        </div>
      </td>

      {/* 2. Prospect Name & Scheduled Day */}
      <td className="py-3.5 px-4 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-100 font-['Outfit'] truncate max-w-xs">
            {lead.name}
          </span>
          {lead.scheduledDate && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ${dayStyle.badgeClass}`}
              title={`Scheduled for ${dayStyle.dayName} (${lead.scheduledDate})`}
            >
              <span>{dayStyle.dayShort}</span>
              <span className="opacity-75">· {lead.scheduledDate.split('-').slice(1).join('/')}</span>
            </span>
          )}
          {lead.fb_message_restricted && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
              ✉️ Email Default
            </span>
          )}
        </div>
      </td>

      {/* 3. Profile Link: STRICTLY PLAIN TEXT (Requirement 2 Anti-Cheat) */}
      <td className="py-3.5 px-4 text-left text-xs font-mono text-slate-300 select-all">
        <span
          className="truncate max-w-sm block text-slate-300 font-mono tracking-tight"
          title={`Plain-text handle/link: ${plainLink} (Direct links are locked in Leads table to enforce Warm-Up discipline)`}
        >
          {plainLink}
        </span>
      </td>

      {/* 4. Strategy Prompt Button (Requirement 3: Replaces Warm-Up badge) */}
      <td className="py-3.5 px-4 text-left">
        <button
          type="button"
          onClick={() => onOpenPrompt(lead)}
          className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
          title="Inspect saved Gemini/DeepSeek prompt & write pitch with Spintax generator"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Prompt</span>
        </button>
      </td>

      {/* 5. Action: ONLY Delete Button (🗑️) */}
      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => onDelete(lead.id)}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Delete lead (remaining IDs will re-sequence)"
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicateAlert, setDuplicateAlert] = useState<{
    message: string;
    timestamp: number;
    detectedChannel?: MultiChannelType;
  } | null>(null);

  // Batch Import Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchInputText, setBatchInputText] = useState('');
  const [batchError, setBatchError] = useState<string | null>(null);

  // Prompt & Spintax Modal State (Requirement 3)
  const [selectedPromptLead, setSelectedPromptLead] = useState<ChannelLead | null>(null);
  const [isPitchEditorOpen, setIsPitchEditorOpen] = useState(false);
  const [spintaxTemplate, setSpintaxTemplate] = useState('');
  const [spunPitchResult, setSpunPitchResult] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!duplicateAlert) return;
    const timer = setTimeout(() => {
      setDuplicateAlert(null);
    }, 4500);
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

  // Open Prompt & Spintax Modal
  const handleOpenPromptModal = (lead: ChannelLead) => {
    setSelectedPromptLead(lead);
    setIsPitchEditorOpen(false);
    setCopiedPrompt(false);
    setCopiedPitch(false);
    setSaveSuccessMessage(null);

    // Initialize Spintax Template with existing lead pitch or standard high-converting Spintax
    const defaultTemplate =
      lead.initialDM ||
      lead.customPitch ||
      `{Hey|Hi|Hello} there, loved what you're doing at ${lead.name}! Built a quick 0.3s prototype showing {how to convert 15 extra weekend covers|how to eliminate third-party commission leaks}. Mind if I send the 30s link?`;

    setSpintaxTemplate(defaultTemplate);
    setSpunPitchResult(spinSpintax(defaultTemplate));
  };

  const handleSpinVariation = () => {
    if (!spintaxTemplate.trim()) return;
    const spun = spinSpintax(spintaxTemplate);
    setSpunPitchResult(spun);
    setSaveSuccessMessage(null);
  };

  const handleCopyText = (text: string, type: 'prompt' | 'pitch') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'prompt') {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else {
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2000);
    }
  };

  const handleSavePitchToLead = () => {
    if (!selectedPromptLead) return;
    const pitchToSave = spunPitchResult || spintaxTemplate;
    const updated = leads.map((l) =>
      l.id === selectedPromptLead.id
        ? {
            ...l,
            initialDM: pitchToSave,
            customPitch: pitchToSave,
            stagedDmMiniPitch: pitchToSave,
          }
        : l
    );
    onUpdateLeads(updated);
    setSaveSuccessMessage('✅ Pitch saved to lead successfully!');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // Batch import handler (Requirement 1: Imports only via Batch/Inbox flow)
  const handleBatchImportText = (rawText: string) => {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setBatchError('Please paste at least one lead link or line.');
      return;
    }

    const currentList = [...leads];
    let addedCount = 0;
    let duplicateCount = 0;

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length === 0 || !parts[0]) continue;

      let rawUrl = parts[0];
      let customName = '';
      let detectedFb: string | undefined = undefined;
      let detectedEmail: string | undefined = undefined;

      if (channel === 'combined') {
        for (const part of parts) {
          const ch = detectLinkChannel(part);
          if (ch === 'facebook' && !detectedFb) {
            detectedFb = part;
          } else if (ch === 'email' && !detectedEmail) {
            detectedEmail = part;
          } else if (!customName && !part.startsWith('http') && !part.includes('/') && !part.includes('@')) {
            customName = part;
          }
        }
        if (!detectedFb && !detectedEmail) {
          if (parts[0].includes('@')) detectedEmail = parts[0];
          else detectedFb = parts[0];
          customName = parts[1] || '';
        } else if (!customName && parts.length > 2) {
          customName = parts[parts.length - 1];
        }
        rawUrl = detectedFb || detectedEmail || parts[0];
      } else {
        customName = parts[1] || '';
      }

      // Strict duplicate check with full URL normalization
      const duplicateFb = detectedFb ? findDuplicateLead(detectedFb, currentList) : undefined;
      const duplicateEmail = detectedEmail ? findDuplicateLead(detectedEmail, currentList) : undefined;
      const duplicateUrl = findDuplicateLead(rawUrl, currentList);

      if (duplicateFb || duplicateEmail || duplicateUrl) {
        duplicateCount++;
        continue;
      }

      const nextIdData = getNextLeadId(channel, currentList);
      const businessName = customName || extractSuggestedName(rawUrl);
      // Auto-schedule enforces start tomorrow!
      const assignedScheduleDate = getNextAvailableScheduleDate(currentList, channel);

      const newLead: ChannelLead = {
        id: nextIdData.id,
        numericId: nextIdData.numericId,
        name: businessName,
        link: rawUrl,
        platformLink: rawUrl,
        facebook: detectedFb,
        email: detectedEmail,
        channel,
        scheduledDate: assignedScheduleDate,
        sortOrder: currentList.length,
        createdAt: new Date().toISOString(),
        warmupStatus: 'locked',
        isWarmedUp: false,
      };

      currentList.push(newLead);
      addedCount++;
    }

    if (duplicateCount > 0) {
      playWarningChime();
      setDuplicateAlert({
        message: `${duplicateCount} duplicate ${duplicateCount === 1 ? 'lead was' : 'leads were'} skipped.`,
        timestamp: Date.now(),
      });
    }

    if (addedCount > 0) {
      onUpdateLeads(currentList);
      setIsBatchModalOpen(false);
      setBatchInputText('');
      setBatchError(null);
    } else if (duplicateCount === 0) {
      setBatchError('No valid leads found to import.');
    }
  };

  const handleDeleteLead = (id: string) => {
    const filtered = leads.filter((l) => l.id !== id);
    const resequenced = resequenceLeadIds(filtered, channel);
    onUpdateLeads(resequenced);
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
      {/* Toast Alert */}
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

      {/* Closed-System Notice & Search / Batch Bar (Manual "+" removed completely) */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 sm:p-5 backdrop-blur-sm shadow-xl space-y-4">
        {/* Closed-System CRM Banner */}
        <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-slate-300 font-medium">
              <strong className="text-indigo-200">Closed-System CRM:</strong> Manual single-lead entry is disabled. All prospects enter verified through the <strong>Lead Inbox</strong> or <strong>Batch Import</strong> with prompts &amp; routing data.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setBatchInputText('');
              setBatchError(null);
              setIsBatchModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 text-xs shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Batch Import JSON / CSV</span>
          </button>
        </div>

        {/* Search & Export Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads by name, ID, or handle..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/50 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Export Dropdown */}
          <div className="relative self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={leads.length === 0}
              className="px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-slate-900 p-1 shadow-2xl z-30 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      exportChannelData(channel, 'csv', leads);
                      setShowExportMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left rounded-lg hover:bg-white/10 text-slate-200 hover:text-white flex items-center gap-2 transition"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Download CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportChannelData(channel, 'json', leads);
                      setShowExportMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left rounded-lg hover:bg-white/10 text-slate-200 hover:text-white flex items-center gap-2 transition"
                  >
                    <FileCode className="w-4 h-4 text-indigo-400" />
                    <span>Download JSON</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Closed-System Table: ID, Name, Profile Link (Plain Text), Prompt, Delete */}
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
                  <th className="py-3 px-4 text-left">Prospect Name</th>
                  <th className="py-3 px-4 text-left">Profile Link (Locked)</th>
                  <th className="py-3 px-4 text-left w-28">Prompt</th>
                  <th className="py-3 px-4 text-right w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="max-w-sm mx-auto space-y-2">
                        <p className="text-sm font-medium text-slate-400">No leads in {getChannelLabel(channel)} yet</p>
                        <p className="text-xs text-slate-500">
                          Import leads through the <strong>📥 Lead Inbox</strong> or <strong>Batch Import</strong> to intake prospects.
                        </p>
                      </div>
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
                        channel={channel}
                        onDelete={handleDeleteLead}
                        onOpenPrompt={handleOpenPromptModal}
                      />
                    ))}
                  </SortableContext>
                )}
              </tbody>
            </table>
          </DndContext>
        </div>
      </div>

      {/* Requirement 3: Prompt & Spintax Generator Modal */}
      {selectedPromptLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                    {selectedPromptLead.id}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {getChannelLabel(selectedPromptLead.channel)}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white font-['Outfit'] mt-1">
                  Strategy Prompt: {selectedPromptLead.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPromptLead(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Saved Gemini / DeepSeek Strategy Analysis Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Saved Lead Qualification Prompt</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      selectedPromptLead.prompt ||
                        selectedPromptLead.leadAnalysis ||
                        selectedPromptLead.customPitch ||
                        '',
                      'prompt'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 hover:text-white border border-white/10 flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                {selectedPromptLead.prompt ||
                  selectedPromptLead.leadAnalysis ||
                  selectedPromptLead.customPitch ||
                  'No strategy prompt analysis found in lead record.'}
              </div>
            </div>

            {/* Write a Pitch & Spintax Generator Toggle */}
            <div className="border-t border-white/10 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Spintax Pitch Generator</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Use <code className="text-amber-300 font-mono">{`{Hey|Hi|Hello}`}</code> syntax to generate high-converting variations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPitchEditorOpen(!isPitchEditorOpen)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
                >
                  {isPitchEditorOpen ? 'Hide Generator' : '✍️ Write a Pitch'}
                </button>
              </div>

              {isPitchEditorOpen && (
                <div className="space-y-3.5 p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/20 animate-fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                      Spintax Template:
                    </label>
                    <textarea
                      rows={3}
                      value={spintaxTemplate}
                      onChange={(e) => setSpintaxTemplate(e.target.value)}
                      placeholder="{Hey|Hi|Hello} there! Loved what you're doing at {lead.name}..."
                      className="w-full p-3 bg-slate-900 border border-white/10 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleSpinVariation}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-950/40 active:scale-95"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>🎲 Spin Variation</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSavePitchToLead}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-950/40 active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Pitch to Lead</span>
                    </button>
                  </div>

                  {saveSuccessMessage && (
                    <p className="text-xs text-emerald-400 font-semibold font-mono animate-fade-in">
                      {saveSuccessMessage}
                    </p>
                  )}

                  {/* Spun Output Preview */}
                  {spunPitchResult && (
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-emerald-400 font-mono font-bold">
                        <span>✨ Spun Pitch Preview</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(spunPitchResult, 'pitch')}
                          className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center gap-1 transition"
                        >
                          {copiedPitch ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedPitch ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-100 font-sans leading-relaxed whitespace-pre-wrap">
                        {spunPitchResult}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">
                  Batch Pipeline Intake
                </span>
                <h3 className="text-xl font-black text-white font-['Outfit'] mt-0.5">
                  Import {getChannelLabel(channel)} Leads
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Paste links line-by-line (format: <code className="text-indigo-300">URL</code> or <code className="text-indigo-300">URL, Business Name</code>).
                  Duplicates are strictly blocked, and new leads are auto-scheduled starting tomorrow skipping Sundays.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {batchError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{batchError}</span>
              </div>
            )}

            <div className="space-y-4">
              <textarea
                rows={8}
                value={batchInputText}
                onChange={(e) => {
                  setBatchInputText(e.target.value);
                  setBatchError(null);
                }}
                placeholder={
                  channel === 'instagram'
                    ? "https://instagram.com/restaurant_one, Restaurant One\n@restaurant_two\nhttps://instagram.com/restaurant_three"
                    : "https://facebook.com/bistro_one, Bistro One\ncontact@grillhouse.com, Grill House\nhttps://facebook.com/cafe_three"
                }
                className="w-full p-3.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />

              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">⚡ Closed-System Rules Enforced:</p>
                <p>• {channel === 'instagram' ? 'Daily quota: 6 leads / day' : 'Daily quota: 4 leads / day'}</p>
                <p>• Starts TOMORROW (today is reserved for warm-up)</p>
                <p>• Sundays skipped completely (first date starts Monday if start is Sunday)</p>
                <p>• Strict duplicate check prevents duplicate imports</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchImportText(batchInputText)}
                  disabled={!batchInputText.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import &amp; Auto-Schedule</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
