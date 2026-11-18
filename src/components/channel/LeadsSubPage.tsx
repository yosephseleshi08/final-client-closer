import React, { useState, useEffect, useMemo } from 'react';
import {
  Trash2,
  Download,
  Search,
  Filter,
  FileSpreadsheet,
  FileCode,
  AlertCircle,
  X,
  ArrowRight,
  Upload,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Save,
  MessageSquare,
  ChevronDown,
  Plus,
  Instagram,
  Facebook,
  Mail,
  Calendar,
  GripVertical,
  Lock,
} from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChannelLead, MultiChannelType, VoiceType } from '../../types';
import {
  getNextLeadId,
  extractSuggestedName,
  exportChannelData,
  getChannelLabel,
  removeAndResequenceActiveLeads,
  findDuplicateLead,
  detectLinkChannel,
  validateChannelLink,
  getLeadLockReason,
  reorderChannelLeadsWithFixedLocks,
  LeadLockReason,
} from '../../utils/channelStorage';
import {
  archiveLeadsWithChoice,
  restoreLeadsFromBackstage,
} from '../../utils/backstageStorage';
import {
  getLocalTodayStr,
  getScheduleDayStyle,
  isDateToday,
  getNextAvailableScheduleDate,
  getCadenceMessageTemplates,
} from '../../utils/cadenceEngine';
import {
  findNormalizedDuplicateMatches,
  hasLeadSentHistory,
  mergeLeadIntoExisting,
  DuplicateMatchResult,
} from '../../utils/leadLifecycle';
import {
  getOrCreateObligation,
  recordMidDayRemoval,
} from '../../utils/dailyObligation';
import {
  getRoundRobinVoiceType,
  getStrictVoiceTypeForId,
  extractLeadNumericId,
  ensureVoiceTypeAssignments,
  recalculateAllVoiceTypes,
  getVoiceTypeBadgeStyle,
  getWorkspaceVoiceTypes,
  getVoiceTypeDisplayLabel,
  getWorkspaceFilterOptions,
} from '../../utils/voiceTypeEngine';
import { extractCleanEmail } from '../../utils/dataRepair';
import { playWarningChime } from '../../utils/soundEffects';

interface LeadsSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
  onNavigateToChannel?: (channel: MultiChannelType) => void;
  onNavigateToBackstage?: () => void;
}

interface SortableLeadRowProps {
  lead: ChannelLead;
  channel: MultiChannelType;
  lockReason: LeadLockReason;
  isDndEnabled: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenEditSequence: (lead: ChannelLead) => void;
  onDeleteLead: (id: string) => void;
}

function SortableLeadRow({
  lead,
  channel,
  lockReason,
  isDndEnabled,
  isSelected,
  onToggleSelect,
  onOpenEditSequence,
  onDeleteLead,
}: SortableLeadRowProps) {
  const isFixed = lockReason !== null;
  const canDrag = isDndEnabled && !isFixed;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    disabled: !canDrag ? { draggable: true, droppable: true } : false,
  });

  const dayStyle = getScheduleDayStyle(lead.scheduledDate);
  const isDueToday = isDateToday(lead.scheduledDate);

  const numId = lead.numericId ?? extractLeadNumericId(lead, 0);
  const isProtectedLead =
    (channel === 'instagram' && numId <= 6) ||
    (channel === 'combined' && numId <= 4);

  const initial = (lead.initialDM || lead.customPitch || '').trim();
  const d4 = (lead.followupDM_Day4 || lead.followupDM_Day7 || lead.followup3DM || '').trim();
  const d8 = (lead.followupDM_Day8 || lead.followupDM_Day14 || lead.followup7DM || '').trim();
  const d14 = (lead.breakupDM_Day14 || lead.breakupDM_Day30 || '').trim();

  const hasAll4Sequences =
    initial.length > 0 &&
    d4.length > 0 &&
    d8.length > 0 &&
    d14.length > 0;

  const isGreen =
    (isProtectedLead && lead.isSequenceConfigured !== false) ||
    (Boolean(lead.isSequenceConfigured) && hasAll4Sequences);

  const dragStyle =
    transform || transition
      ? {
          transform: CSS.Translate.toString(transform),
          transition,
        }
      : undefined;

  const lockTooltip =
    lockReason === 'sent'
      ? 'Locked: Already sent — position & ID cannot be changed'
      : lockReason === 'warmed'
      ? 'Locked: Already warmed up — position & ID cannot be changed'
      : '';

  return (
    <tr
      ref={setNodeRef}
      style={dragStyle}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
      className={`group border-b border-white/[0.06] transition-colors ${
        canDrag
          ? 'cursor-grab active:cursor-grabbing hover:bg-white/[0.03]'
          : isFixed
          ? 'bg-slate-950/25 hover:bg-white/[0.015]'
          : 'hover:bg-white/[0.02]'
      } ${dayStyle.borderClass} ${dayStyle.tintClass} ${
        isDueToday ? 'ring-1 ring-emerald-500/40 bg-emerald-950/20' : ''
      } ${
        isDragging
          ? 'relative z-20 bg-slate-800/95 ring-2 ring-indigo-500/70 shadow-2xl shadow-black/70 opacity-95'
          : ''
      }`}
      title={canDrag ? 'Click and drag to change lead ID order' : lockTooltip || undefined}
    >
      {/* 1. Selection + Drag Handle / Lock Status + ID */}
      <td className="py-3.5 px-4 text-left font-mono text-xs tabular-nums text-slate-300 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelect(lead.id)}
            aria-label={`Select ${lead.name}`}
            className="rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer shrink-0"
          />
          {isFixed ? (
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded border shrink-0 cursor-not-allowed ${
                lockReason === 'sent'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              }`}
              title={lockTooltip}
              aria-label={lockTooltip}
            >
              <Lock className="w-3 h-3" />
            </span>
          ) : (
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded shrink-0 transition-colors ${
                canDrag
                  ? 'text-slate-500 group-hover:text-indigo-400'
                  : 'text-slate-700 cursor-not-allowed'
              }`}
              title={
                canDrag
                  ? 'Drag to reorder lead ID'
                  : 'Clear filter/search to reorder leads'
              }
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
          )}

          <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20">
            {lead.id}
          </span>

          {isFixed && (
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                lockReason === 'sent'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
              }`}
              title={lockTooltip}
            >
              {lockReason === 'sent' ? 'Sent' : 'Warmed'}
            </span>
          )}

          {isDueToday && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm animate-pulse">
              TODAY
            </span>
          )}
        </div>
      </td>

      {/* 2. Prospect Name + Strict ID-Governed Voice Type Badge (Read-Only) */}
      <td className="py-3.5 px-4 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-100 font-['Outfit'] truncate max-w-xs">
            {lead.name}
          </span>

          {/* Strict ID-Based Voice Type Badge (Non-clickable) */}
          {(() => {
            const strictVoice = getStrictVoiceTypeForId(lead, channel);
            return (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono border shadow-sm select-none ${
                  getVoiceTypeBadgeStyle(strictVoice).badgeClass
                }`}
                title={`Voice Type: ${getVoiceTypeDisplayLabel(strictVoice, channel)} (Assigned strictly by ID ${lead.id})`}
              >
                {getVoiceTypeDisplayLabel(strictVoice, channel)}
              </span>
            );
          })()}

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

      {/* 3. Prompt / Edit Sequence Button */}
      <td className="py-3.5 px-4 text-left">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onOpenEditSequence(lead)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm ${
            isGreen
              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 hover:text-white border border-emerald-500/40 shadow-emerald-500/10'
              : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-white border border-indigo-500/30 shadow-indigo-500/10'
          }`}
          title={
            isGreen
              ? 'All 4 sequences written & configured! Click to review or adjust.'
              : 'Sequence incomplete. Write all 4 messages (Initial, Day 4, Day 8, Day 14) to turn button green.'
          }
        >
          {isGreen ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          )}
          <span>Prompt / Edit Sequence</span>
          {isGreen && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </td>

      {/* 4. Action: Soft Delete to Backstage Button */}
      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDeleteLead(lead.id)}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Move to Backstage (soft delete — restore anytime)"
            aria-label={`Move ${lead.name} to Backstage`}
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
  onNavigateToChannel,
  onNavigateToBackstage,
}: LeadsSubPageProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [backstageToast, setBackstageToast] = useState<string | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<{
    message: string;
    timestamp: number;
    detectedChannel?: MultiChannelType;
  } | null>(null);

  // Batch Import Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchInputText, setBatchInputText] = useState('');
  const [batchError, setBatchError] = useState<string | null>(null);

  // Manual Add Lead Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualIgLink, setManualIgLink] = useState('');
  const [manualFbLink, setManualFbLink] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualPrompt, setManualPrompt] = useState('');
  const [manualAutoSchedule, setManualAutoSchedule] = useState(true);
  const [manualError, setManualError] = useState<{
    message: string;
    detectedChannel?: MultiChannelType;
    duplicateMatch?: DuplicateMatchResult;
    pendingIncoming?: Partial<ChannelLead>;
  } | null>(null);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Archive-First Cadence Choice Modal State (for sent/active-cadence leads)
  const [pendingArchiveModal, setPendingArchiveModal] = useState<{
    leadsToArchive: ChannelLead[];
    ids: string[];
    cancelReason: string;
  } | null>(null);

  // Voice Type Filtering States
  const [selectedVoiceFilter, setSelectedVoiceFilter] = useState<VoiceType | 'all'>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Reset filter and selection when switching between workspaces
  useEffect(() => {
    setSelectedVoiceFilter('all');
    setIsFilterDropdownOpen(false);
    setSelectedLeadIds(new Set());
  }, [channel]);

  useEffect(() => {
    const activeIds = new Set(leads.map((l) => l.id));
    setSelectedLeadIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (activeIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [leads]);

  // Auto-assign round-robin voice types to existing leads immediately on mount if missing
  useEffect(() => {
    if (leads.length === 0) return;
    const { updatedLeads, hasChanges } = ensureVoiceTypeAssignments(leads, channel);
    if (hasChanges) {
      onUpdateLeads(updatedLeads);
    }
  }, [leads, channel]);

  // One-time sanitization:
  // 1. Keep the first 6 Instagram leads (ID 1..6) and first 4 Combined/Email leads (ID 1..4) green & untouched.
  // 2. Empty all 4 sequence messages for remaining leads (ID 7+ in IG, ID 5+ in Combined), but leave prompts intact!
  useEffect(() => {
    if (leads.length === 0) return;
    const sanitizationKey = `crm_sequence_v4_sanitized_${channel}`;
    if (localStorage.getItem(sanitizationKey)) return;

    let modified = false;
    const updated = leads.map((lead, idx) => {
      const numId = lead.numericId ?? extractLeadNumericId(lead, idx);
      const isProtected =
        (channel === 'instagram' && numId <= 6) ||
        (channel === 'combined' && numId <= 4);

      if (isProtected) {
        if (!lead.isSequenceConfigured) {
          modified = true;
          return {
            ...lead,
            isSequenceConfigured: true,
          };
        }
        return lead;
      }

      // For all other leads: empty the 4 sequence messages, but KEEP prompt and leadAnalysis untouched!
      modified = true;
      return {
        ...lead,
        initialDM: '',
        customPitch: '',
        stagedDmMiniPitch: '',
        followupDM_Day4: '',
        followupDM_Day7: '',
        followup3DM: '',
        followupDM_Day8: '',
        followupDM_Day14: '',
        followup7DM: '',
        breakupDM_Day14: '',
        breakupDM_Day30: '',
        isSequenceConfigured: false,
        pitchSavedAt: undefined,
      };
    });

    localStorage.setItem(sanitizationKey, 'true');
    if (modified) {
      onUpdateLeads(updated);
    }
  }, [leads, channel, onUpdateLeads]);

  // Edit Sequence Modal State (Requirement 4)
  const [editingLead, setEditingLead] = useState<ChannelLead | null>(null);
  const [initialDmText, setInitialDmText] = useState('');
  const [day4Text, setDay4Text] = useState('');
  const [day8Text, setDay8Text] = useState('');
  const [day14Text, setDay14Text] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!duplicateAlert) return;
    const timer = setTimeout(() => {
      setDuplicateAlert(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [duplicateAlert]);

  useEffect(() => {
    if (!addedToast) return;
    const timer = setTimeout(() => {
      setAddedToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [addedToast]);

  useEffect(() => {
    if (!backstageToast) return;
    const timer = setTimeout(() => {
      setBackstageToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [backstageToast]);

  // Workspace-specific voice options and allowed types
  const workspaceVoiceTypes = useMemo(() => {
    return getWorkspaceVoiceTypes(channel);
  }, [channel]);

  const workspaceFilterOptions = useMemo(() => {
    return getWorkspaceFilterOptions(channel);
  }, [channel]);

  const currentFilterLabel = useMemo(() => {
    return getVoiceTypeDisplayLabel(selectedVoiceFilter, channel);
  }, [selectedVoiceFilter, channel]);

  // Compute Voice Type counts for the current workspace
  const voiceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leads.length };
    workspaceVoiceTypes.forEach((vt) => {
      if (vt) counts[vt] = 0;
    });
    leads.forEach((l) => {
      if (l.voiceType) {
        counts[l.voiceType] = (counts[l.voiceType] || 0) + 1;
      }
    });
    return counts;
  }, [leads, workspaceVoiceTypes]);

  // Requirement 4: Always order leads by ID from least to highest (1, 2, 3...)
  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => (a.numericId || 0) - (b.numericId || 0));
  }, [leads]);

  // Combined Voice Type & Search Query filter
  const isFiltered = selectedVoiceFilter !== 'all' || searchQuery.trim().length > 0;

  const filteredLeads = useMemo(() => {
    let result = sortedLeads;
    if (selectedVoiceFilter !== 'all') {
      result = result.filter((l) => l.voiceType === selectedVoiceFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.id.toLowerCase().includes(q) ||
          l.name.toLowerCase().includes(q) ||
          (l.link && l.link.toLowerCase().includes(q))
      );
    }
    return result;
  }, [sortedLeads, selectedVoiceFilter, searchQuery]);

  // Drag-and-drop ID reordering sensors & handlers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const movableLeadIds = useMemo(() => {
    if (isFiltered) return [];
    return filteredLeads
      .filter((lead) => getLeadLockReason(lead) === null)
      .map((lead) => lead.id);
  }, [filteredLeads, isFiltered]);

  const lockCounts = useMemo(() => {
    let fixedCount = 0;
    let movableCount = 0;
    for (const l of sortedLeads) {
      if (getLeadLockReason(l) !== null) fixedCount++;
      else movableCount++;
    }
    return { fixedCount, movableCount };
  }, [sortedLeads]);

  const handleDragStart = (_event: DragStartEvent) => {
    // Drag started
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || isFiltered) return;

    const result = reorderChannelLeadsWithFixedLocks(
      leads,
      String(active.id),
      String(over.id),
      channel
    );

    if (result.movedLead && result.newId && result.oldId !== result.newId) {
      onUpdateLeads(result.reorderedLeads);
      setAddedToast(
        `Reordered "${result.movedLead.name}": ${result.oldId} → ${result.newId}`
      );
    }
  };

  // Open Edit Sequence Modal (starts empty unless operator has written text)
  const handleOpenEditSequence = (lead: ChannelLead) => {
    setEditingLead(lead);
    setInitialDmText(lead.initialDM || lead.customPitch || '');
    setDay4Text(lead.followupDM_Day4 || lead.followupDM_Day7 || lead.followup3DM || '');
    setDay8Text(lead.followupDM_Day8 || lead.followupDM_Day14 || lead.followup7DM || '');
    setDay14Text(lead.breakupDM_Day14 || lead.breakupDM_Day30 || '');
    setCopiedPrompt(false);
    setSaveSuccess(false);
  };

  const handleSaveSequence = () => {
    if (!editingLead) return;

    const trimmedInitial = initialDmText.trim();
    const trimmedDay4 = day4Text.trim();
    const trimmedDay8 = day8Text.trim();
    const trimmedDay14 = day14Text.trim();

    const numId = editingLead.numericId ?? extractLeadNumericId(editingLead, 0);
    const isProtectedLead =
      ((channel === 'instagram' && numId <= 6) ||
        (channel === 'combined' && numId <= 4)) &&
      editingLead.isSequenceConfigured !== false;

    // STRICT: Green finish button turns on ONLY if all 4 sequence steps have content!
    const isAll4Written =
      trimmedInitial.length > 0 &&
      trimmedDay4.length > 0 &&
      trimmedDay8.length > 0 &&
      trimmedDay14.length > 0;

    const isComplete = isProtectedLead || isAll4Written;

    const updated = leads.map((l) => {
      if (l.id === editingLead.id) {
        return {
          ...l,
          initialDM: trimmedInitial,
          customPitch: trimmedInitial,
          stagedDmMiniPitch: trimmedInitial,
          followupDM_Day4: trimmedDay4,
          followupDM_Day7: trimmedDay4,
          followup3DM: trimmedDay4,
          followupDM_Day8: trimmedDay8,
          followupDM_Day14: trimmedDay8,
          followup7DM: trimmedDay8,
          breakupDM_Day14: trimmedDay14,
          breakupDM_Day30: trimmedDay14,
          pitchSavedAt: isComplete ? (l.pitchSavedAt || new Date().toISOString()) : undefined,
          isSequenceConfigured: isComplete,
        };
      }
      return l;
    });

    onUpdateLeads(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setEditingLead(null);
    }, 1200);
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected =
    filteredLeads.length > 0 && filteredLeads.every((l) => selectedLeadIds.has(l.id));

  const toggleSelectAllFiltered = () => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredLeads.forEach((l) => next.delete(l.id));
      } else {
        filteredLeads.forEach((l) => next.add(l.id));
      }
      return next;
    });
  };

  const finalizeSoftDelete = (
    toArchive: ChannelLead[],
    ids: string[],
    choice: 'keep_running' | 'cancel_cadence',
    cancelReason?: string
  ) => {
    if (toArchive.length === 0) return;

    const todayStr = getLocalTodayStr();
    const obligation = getOrCreateObligation(todayStr);
    if (obligation.status === 'locked') {
      const scheduledTodayCount = toArchive.filter(
        (l) => !l.initialSentDate && l.scheduledDate === todayStr
      ).length;
      if (scheduledTodayCount > 0) {
        recordMidDayRemoval(todayStr, scheduledTodayCount);
      }
    }

    const idSet = new Set(ids);
    archiveLeadsWithChoice(toArchive, channel, choice, cancelReason);
    const remaining = removeAndResequenceActiveLeads(leads, idSet, channel);
    onUpdateLeads(remaining);

    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });

    if (toArchive.length === 1) {
      setBackstageToast(
        choice === 'cancel_cadence'
          ? `Archived "${toArchive[0].name}" (${toArchive[0].id}) & cancelled future follow-up cadence.`
          : `Archived "${toArchive[0].name}" (${toArchive[0].id}) to Backstage (cadence preserved).`
      );
    } else {
      setBackstageToast(
        choice === 'cancel_cadence'
          ? `Archived ${toArchive.length} leads to Backstage & cancelled their follow-up cadences.`
          : `Moved ${toArchive.length} leads to Backstage. Restore anytime from 🗑️ Backstage.`
      );
    }
  };

  const handleSoftDeleteLeads = (ids: string[]) => {
    const idSet = new Set(ids);
    const toArchive = leads.filter((l) => idSet.has(l.id));
    if (toArchive.length === 0) return;

    if (toArchive.some((l) => hasLeadSentHistory(l))) {
      setPendingArchiveModal({
        leadsToArchive: toArchive,
        ids,
        cancelReason: 'Cancelled by operator',
      });
      return;
    }

    finalizeSoftDelete(toArchive, ids, 'keep_running');
  };

  const handleDeleteLead = (id: string) => {
    handleSoftDeleteLeads([id]);
  };

  const handleCopyPrompt = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Batch import handler with normalized duplicate detection across active + Backstage + dispatchLog
  const handleBatchImportText = (rawText: string) => {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setBatchError('Please paste at least one lead link or line.');
      return;
    }

    let currentList = [...leads];
    let addedCount = 0;
    let mergedCount = 0;
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

      const businessName = customName || extractSuggestedName(rawUrl);

      const duplicateFb = detectedFb ? findDuplicateLead(detectedFb, currentList) : undefined;
      const duplicateEmail = detectedEmail ? findDuplicateLead(detectedEmail, currentList) : undefined;
      const duplicateUrl = findDuplicateLead(rawUrl, currentList);

      const normCheck = findNormalizedDuplicateMatches(
        {
          name: businessName,
          link: rawUrl,
          platformLink: rawUrl,
          email: detectedEmail,
          facebook: detectedFb,
          instagram: channel === 'instagram' ? rawUrl : undefined,
        },
        {
          activeCombined: channel === 'combined' ? currentList : undefined,
          activeInstagram: channel === 'instagram' ? currentList : undefined,
        }
      );

      if (duplicateFb || duplicateEmail || duplicateUrl || normCheck.hasMatch) {
        // If matched to an active lead in THIS workspace, merge metadata cleanly WITHOUT resetting sent dates
        const activeTarget =
          duplicateFb ||
          duplicateEmail ||
          duplicateUrl ||
          normCheck.activeMatches.find((m) => m.channel === channel);

        if (activeTarget) {
          currentList = currentList.map((item) =>
            item.id === activeTarget.id
              ? mergeLeadIntoExisting(item, {
                  email: detectedEmail,
                  facebook: detectedFb,
                  instagram: channel === 'instagram' ? rawUrl : undefined,
                })
              : item
          );
          mergedCount++;
        } else {
          duplicateCount++;
        }
        continue;
      }

      const nextIdData = getNextLeadId(channel, currentList);
      const assignedScheduleDate = getNextAvailableScheduleDate(currentList, channel);
      const isEmailOnly = channel !== 'instagram' && !detectedFb;

      const newLead: ChannelLead = {
        id: nextIdData.id,
        numericId: nextIdData.numericId,
        name: businessName,
        link: rawUrl,
        platformLink: rawUrl,
        facebook: detectedFb,
        email: detectedEmail,
        channel,
        voiceType: getStrictVoiceTypeForId(nextIdData.numericId, channel),
        isVoiceTypeOverridden: false,
        scheduledDate: assignedScheduleDate,
        sortOrder: currentList.length,
        createdAt: new Date().toISOString(),
        warmupStatus: isEmailOnly ? 'warmed' : 'locked',
        isWarmedUp: isEmailOnly,
      };

      currentList.push(newLead);
      addedCount++;
    }

    if (duplicateCount > 0 || mergedCount > 0) {
      playWarningChime();
      const parts: string[] = [];
      if (mergedCount > 0) {
        parts.push(`${mergedCount} existing ${mergedCount === 1 ? 'lead' : 'leads'} merged cleanly (sent dates preserved)`);
      }
      if (duplicateCount > 0) {
        parts.push(`${duplicateCount} historical/archived ${duplicateCount === 1 ? 'duplicate was' : 'duplicates were'} blocked to prevent D0 re-pitching`);
      }
      setDuplicateAlert({
        message: parts.join(' · '),
        timestamp: Date.now(),
      });
    }

    if (addedCount > 0 || mergedCount > 0) {
      const recalculated = recalculateAllVoiceTypes(currentList, channel);
      onUpdateLeads(recalculated);
      setIsBatchModalOpen(false);
      setBatchInputText('');
      setBatchError(null);
      if (addedCount > 0) {
        setAddedToast(
          `Imported ${addedCount} ${addedCount === 1 ? 'lead' : 'leads'} into ${getChannelLabel(channel)}${mergedCount > 0 ? ` & merged ${mergedCount}` : ''}.`
        );
      }
    } else if (duplicateCount === 0) {
      setBatchError('No valid leads found to import.');
    }
  };

  // Preview next ID, strict Type, and next available schedule slot for Manual Add modal
  const nextLeadPreview = useMemo(() => {
    const nextIdData = getNextLeadId(channel, leads);
    const voiceType = getStrictVoiceTypeForId(nextIdData.numericId, channel);
    const nextDate = getNextAvailableScheduleDate(leads, channel);
    return {
      ...nextIdData,
      voiceType,
      voiceLabel: getVoiceTypeDisplayLabel(voiceType, channel),
      nextDate,
    };
  }, [channel, leads]);

  const handleOpenAddModal = () => {
    setManualName('');
    setManualIgLink('');
    setManualFbLink('');
    setManualEmail('');
    setManualCity('');
    setManualPrompt('');
    setManualAutoSchedule(true);
    setManualError(null);
    setIsAddModalOpen(true);
  };

  const handleManualAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);

    const trimmedName = manualName.trim();
    const trimmedCity = manualCity.trim();
    const trimmedPrompt = manualPrompt.trim();

    let rawPrimaryLink = '';
    let instagramField: string | undefined = undefined;
    let facebookField: string | undefined = undefined;
    let emailField: string | undefined = undefined;

    if (channel === 'instagram') {
      const igInput = manualIgLink.trim();
      if (!igInput) {
        setManualError({ message: 'Please enter an Instagram handle (e.g. @bistro) or profile URL.' });
        return;
      }

      const validation = validateChannelLink(igInput, 'instagram');
      if (!validation.isValid) {
        setManualError({
          message: validation.errorMessage || 'Please enter a valid Instagram link or @handle.',
          detectedChannel: validation.detectedChannel === 'facebook' || validation.detectedChannel === 'email' ? 'combined' : validation.detectedChannel,
        });
        return;
      }

      instagramField = igInput;
      rawPrimaryLink = igInput;

      // Optional email on IG lead (used by Blind Rule on Day 8 / Day 14)
      const rawEmailInput = manualEmail.trim();
      if (rawEmailInput) {
        const cleaned = extractCleanEmail(rawEmailInput);
        if (!cleaned) {
          setManualError({ message: 'The optional email address you entered is not valid. Please check it or leave it blank.' });
          return;
        }
        emailField = cleaned;
      }
    } else {
      // Combined Outreach (Facebook and/or Email)
      const fbInput = manualFbLink.trim();
      const rawEmailInput = manualEmail.trim();

      if (!fbInput && !rawEmailInput) {
        setManualError({ message: 'Please enter at least a Facebook Page URL or an Email address.' });
        return;
      }

      if (fbInput) {
        const detectedFb = detectLinkChannel(fbInput);
        if (detectedFb === 'instagram') {
          setManualError({
            message: 'Error: This is an Instagram link. Switch to the Instagram workspace to add Instagram leads.',
            detectedChannel: 'instagram',
          });
          return;
        }
        if (detectedFb === 'email') {
          setManualError({
            message: 'You entered an email address in the Facebook URL field. Please put emails in the Email Address box below.',
          });
          return;
        }
        facebookField = fbInput;
      }

      if (rawEmailInput) {
        const detectedEm = detectLinkChannel(rawEmailInput);
        if (detectedEm === 'instagram') {
          setManualError({
            message: 'Error: This is an Instagram link. Switch to the Instagram workspace to add Instagram leads.',
            detectedChannel: 'instagram',
          });
          return;
        }
        const cleanedEmail = extractCleanEmail(rawEmailInput);
        if (!cleanedEmail) {
          setManualError({ message: 'Please enter a valid email address (e.g. contact@restaurant.com).' });
          return;
        }
        emailField = cleanedEmail;
      }

      rawPrimaryLink = facebookField || emailField || '';
    }

    const businessName = trimmedName || extractSuggestedName(rawPrimaryLink);

    // Duplicate protection across active leads, Backstage archive, and immutable dispatchLog
    const dupPrimary = rawPrimaryLink ? findDuplicateLead(rawPrimaryLink, leads) : undefined;
    const dupFb = facebookField ? findDuplicateLead(facebookField, leads) : undefined;
    const dupEmail = emailField ? findDuplicateLead(emailField, leads) : undefined;
    const existingDup = dupPrimary || dupFb || dupEmail;

    const normDup = findNormalizedDuplicateMatches(
      {
        name: businessName,
        link: rawPrimaryLink,
        platformLink: rawPrimaryLink,
        email: emailField,
        facebook: facebookField,
        instagram: instagramField,
      },
      {
        activeCombined: channel === 'combined' ? leads : undefined,
        activeInstagram: channel === 'instagram' ? leads : undefined,
      }
    );

    if (existingDup || normDup.hasMatch) {
      playWarningChime();
      setManualError({
        message: existingDup
          ? `Duplicate Blocked: Already in ${getChannelLabel(channel)} as ${existingDup.id} (${existingDup.name}).`
          : `Duplicate / Prior Outreach Guard: ${normDup.summaryReason}`,
        duplicateMatch: normDup,
        pendingIncoming: {
          email: emailField,
          facebook: facebookField,
          instagram: instagramField,
          city: trimmedCity || undefined,
          prompt: trimmedPrompt || undefined,
          leadAnalysis: trimmedPrompt || undefined,
        },
      });
      return;
    }

    const nextIdData = getNextLeadId(channel, leads);
    const assignedScheduleDate = manualAutoSchedule
      ? getNextAvailableScheduleDate(leads, channel)
      : undefined;

    const nowIso = new Date().toISOString();
    const isEmailOnly = channel !== 'instagram' && !facebookField;

    const newLead: ChannelLead = {
      id: nextIdData.id,
      numericId: nextIdData.numericId,
      name: businessName,
      link: rawPrimaryLink,
      platformLink: rawPrimaryLink,
      instagram: instagramField,
      facebook: facebookField,
      email: emailField,
      hasInvalidEmail: false,
      city: trimmedCity || undefined,
      channel,
      voiceType: getStrictVoiceTypeForId(nextIdData.numericId, channel),
      isVoiceTypeOverridden: false,
      scheduledDate: assignedScheduleDate,
      sortOrder: leads.length,
      createdAt: nowIso,
      warmupStatus: isEmailOnly ? 'warmed' : 'locked',
      isWarmedUp: isEmailOnly,
      prompt: trimmedPrompt || undefined,
      leadAnalysis: trimmedPrompt || undefined,
      analysisSavedAt: trimmedPrompt ? nowIso : undefined,
      initialDM: '',
      customPitch: '',
      stagedDmMiniPitch: '',
      followupDM_Day4: '',
      followupDM_Day7: '',
      followup3DM: '',
      followupDM_Day8: '',
      followupDM_Day14: '',
      followup7DM: '',
      breakupDM_Day14: '',
      breakupDM_Day30: '',
      isSequenceConfigured: false,
    };

    const recalculated = recalculateAllVoiceTypes([...leads, newLead], channel);
    onUpdateLeads(recalculated);
    setIsAddModalOpen(false);
    setManualError(null);
    setAddedToast(
      assignedScheduleDate
        ? `Added ${newLead.id} (${newLead.name}) · Auto-scheduled for ${assignedScheduleDate}`
        : `Added ${newLead.id} (${newLead.name}) to ${getChannelLabel(channel)}`
    );
  };

  const handleMergeManualDuplicate = () => {
    if (!manualError?.duplicateMatch?.bestMatch || !manualError.pendingIncoming) return;
    const match = manualError.duplicateMatch.bestMatch;

    if (match.isArchived && match.archiveUid) {
      const restored = restoreLeadsFromBackstage([match.archiveUid]);
      const targetCh = channel === 'instagram' ? 'instagram' : 'combined';
      const updatedList = (targetCh === 'instagram' ? restored.updatedInstagram : restored.updatedCombined).map((l) =>
        l.name === match.name && l.initialSentDate === match.initialSentDate
          ? mergeLeadIntoExisting(l, manualError.pendingIncoming!)
          : l
      );
      onUpdateLeads(updatedList);
      setIsAddModalOpen(false);
      setManualError(null);
      setAddedToast(`Restored & merged "${match.name}" with sent dates preserved.`);
      return;
    }

    if (match.channel === channel) {
      const updatedList = leads.map((l) =>
        l.id === match.id ? mergeLeadIntoExisting(l, manualError.pendingIncoming!) : l
      );
      onUpdateLeads(updatedList);
      setIsAddModalOpen(false);
      setManualError(null);
      setAddedToast(`Merged new contact details into ${match.id} (${match.name}) without resetting sent dates.`);
    }
  };

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

      {/* Success Toast Banner for Manual Add */}
      {addedToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 right-5 z-50 max-w-lg w-[calc(100vw-2.5rem)] rounded-2xl border border-emerald-500/50 bg-emerald-950/95 p-4 text-xs sm:text-sm font-semibold text-emerald-100 shadow-2xl shadow-emerald-950/60 backdrop-blur-md animate-in slide-in-from-top-3 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{addedToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setAddedToast(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss confirmation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Soft Delete -> Backstage Toast Banner */}
      {backstageToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 right-5 z-50 max-w-lg w-[calc(100vw-2.5rem)] rounded-2xl border border-amber-500/40 bg-slate-900/95 p-4 text-xs sm:text-sm font-semibold text-slate-100 shadow-2xl shadow-black/70 backdrop-blur-md animate-in slide-in-from-top-3 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 flex-1">
            <Trash2 className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="leading-snug">{backstageToast}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onNavigateToBackstage && (
              <button
                type="button"
                onClick={() => {
                  setBackstageToast(null);
                  onNavigateToBackstage();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/35 text-amber-200 text-xs font-bold transition cursor-pointer whitespace-nowrap"
              >
                Open Backstage
              </button>
            )}
            <button
              type="button"
              onClick={() => setBackstageToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: Closed-System Notice & Manual Add / Batch / Search Bar */}
      <div className="relative z-30 rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 sm:p-5 backdrop-blur-sm shadow-xl space-y-4">
        <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-slate-300 font-medium">
              <strong className="text-indigo-200">Closed-System CRM:</strong> Leads ordered chronologically by ID (1, 2, 3...). Profile links are hidden to enforce Warm-Up discipline. Write and configure your 4-step sequence below.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 text-xs shrink-0 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Lead</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBatchInputText('');
                setBatchError(null);
                setIsBatchModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 text-xs shrink-0 active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Batch Import</span>
            </button>
          </div>
        </div>

        {/* Search Bar, Filter by Type Dropdown & Export Menu */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-white/5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads by name or ID..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Clean Dropdown: Filter by Type: [All Types] */}
            <div className="relative z-40">
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                className="h-9 px-3.5 bg-slate-950/60 hover:bg-slate-900 border border-white/10 hover:border-white/20 rounded-xl text-xs font-medium text-slate-200 flex items-center justify-between gap-2 transition cursor-pointer shadow-sm shrink-0"
              >
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-slate-400 font-normal">Filter by Type:</span>
                  <span className="font-semibold text-slate-100">{currentFilterLabel}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFilterDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsFilterDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-52 rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/80 p-1.5 z-50 text-xs">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2.5 py-1.5 border-b border-white/5 mb-1">
                      {channel === 'instagram' ? 'Instagram Voice Types' : 'Email Voice Types'}
                    </div>
                    {workspaceFilterOptions.map((opt) => {
                      const isSelected = selectedVoiceFilter === opt.value;
                      const style = opt.value && opt.value !== 'all' ? getVoiceTypeBadgeStyle(opt.value) : null;
                      const count = !opt.value || opt.value === 'all' ? leads.length : (voiceCounts[opt.value] || 0);

                      return (
                        <button
                          key={opt.value ?? 'all'}
                          type="button"
                          onClick={() => {
                            setSelectedVoiceFilter(opt.value);
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600/30 text-indigo-200 font-bold border border-indigo-500/30'
                              : 'text-slate-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {style ? (
                              <span className={`w-2 h-2 rounded-full ${style.dotColor}`} />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                            )}
                            <span>{opt.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-500">({count})</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {selectedLeadIds.size > 0 && (
              <button
                type="button"
                onClick={() => handleSoftDeleteLeads(Array.from(selectedLeadIds))}
                className="px-3.5 py-2 rounded-xl border border-rose-500/35 bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Move Selected to Backstage ({selectedLeadIds.size})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={leads.length === 0}
              className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
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

      {/* Simplified Clean Table: ID, Name, Prompt / Edit Sequence, Delete */}
      <div className="relative z-10 rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-xl min-h-[360px]">
        {leads.length > 0 && (
          <div className="px-4 py-2.5 border-b border-white/[0.06] bg-slate-950/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              {isFiltered ? (
                <span className="text-amber-300 font-medium">
                  Clear search or type filter to drag-reorder lead IDs
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <GripVertical className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>
                    Click and drag any unlocked lead row to change its ID position.
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="inline-flex items-center gap-1 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>{lockCounts.movableCount} Movable</span>
              </span>
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>{lockCounts.fixedCount} Fixed (Warmed / Sent)</span>
              </span>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 text-left w-44">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        disabled={filteredLeads.length === 0}
                        aria-label="Select all visible leads"
                        className="rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                      />
                      <span>ID</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left">Prospect Name</th>
                  <th className="py-3 px-4 text-left w-64">Sequence Configuration</th>
                  <th className="py-3 px-4 text-right w-20">Action</th>
                </tr>
              </thead>
              <SortableContext
                items={movableLeadIds}
                strategy={verticalListSortingStrategy}
              >
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <div className="max-w-sm mx-auto space-y-2">
                          <p className="text-sm font-medium text-slate-400">No leads in {getChannelLabel(channel)} yet</p>
                          <p className="text-xs text-slate-500">
                            Use <strong>+ Add Lead</strong>, <strong>Batch Import</strong>, or the <strong>📥 Lead Inbox</strong> to add prospects.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <SortableLeadRow
                        key={lead.id}
                        lead={lead}
                        channel={channel}
                        lockReason={getLeadLockReason(lead)}
                        isDndEnabled={!isFiltered}
                        isSelected={selectedLeadIds.has(lead.id)}
                        onToggleSelect={toggleSelectLead}
                        onOpenEditSequence={handleOpenEditSequence}
                        onDeleteLead={handleDeleteLead}
                      />
                    ))
                  )}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      </div>

      {/* Requirement 4: Prompt / Edit Sequence Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                    {editingLead.id}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {getChannelLabel(editingLead.channel)} Workspace
                  </span>
                </div>
                <h3 className="text-xl font-black text-white font-['Outfit'] mt-1">
                  Cadence Writer &amp; Analysis: {editingLead.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Write and customize the 4 cadence messages for this lead. When the scheduled dispatch day arrives, the CRM will automatically serve the saved message.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lead Analysis / Prompt Viewer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 font-mono flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Lead Engine Analysis &amp; Sourced Prompt</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyPrompt(
                      editingLead.prompt ||
                        editingLead.leadAnalysis ||
                        editingLead.customPitch ||
                        ''
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
                      <span>Copy Analysis</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {editingLead.prompt ||
                  editingLead.leadAnalysis ||
                  editingLead.customPitch ||
                  'No strategy prompt attached to this lead.'}
              </div>
            </div>

            {/* The 4 Sequence Messages */}
            <div className="border-t border-white/10 pt-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>4-Step Multi-Channel Sequence</span>
                </h4>
                {(() => {
                  const numId = editingLead.numericId ?? extractLeadNumericId(editingLead, 0);
                  const isProtected =
                    ((channel === 'instagram' && numId <= 6) ||
                      (channel === 'combined' && numId <= 4)) &&
                    editingLead.isSequenceConfigured !== false;

                  const filled = [initialDmText.trim(), day4Text.trim(), day8Text.trim(), day14Text.trim()].filter(Boolean).length;
                  const isReady = isProtected || filled === 4;

                  return (
                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1.5 ${
                      isReady
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {isReady ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>All 4 Sequences Ready (Button will be Green)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>{filled} / 4 Written (Fill all 4 to turn Green)</span>
                        </>
                      )}
                    </span>
                  );
                })()}
              </div>

              {/* Step 1: Initial DM (Day 0) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5 text-indigo-300">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>Step 1: Initial DM (Day 0 Pitch Hook)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Under 75 words</span>
                </div>
                <textarea
                  rows={3}
                  value={initialDmText}
                  onChange={(e) => setInitialDmText(e.target.value)}
                  placeholder="Write Initial DM pitch (Day 0)..."
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs font-sans text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Step 2: Day 4 Follow-Up */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5 text-purple-300">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>Step 2: Day 4 Follow-Up (Value Check-In)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Kitchen Ticket PDF / Quick Win</span>
                </div>
                <textarea
                  rows={3}
                  value={day4Text}
                  onChange={(e) => setDay4Text(e.target.value)}
                  placeholder="Write Day 4 Value Check-In (e.g. kitchen ticket speed-up PDF)..."
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs font-sans text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>

              {/* Step 3: Day 8 Follow-Up */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Step 3: Day 8 Follow-Up (Social Proof / Case Study)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">12% Takeout Surge</span>
                </div>
                <textarea
                  rows={3}
                  value={day8Text}
                  onChange={(e) => setDay8Text(e.target.value)}
                  placeholder="Write Day 8 Social Proof reminder (e.g. 12% takeout surge case study)..."
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs font-sans text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              {/* Step 4: Day 14 Final Breakup */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5 text-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>Step 4: Day 14 Breakup (Final Nudge / 60s Loom)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Close File or Loom</span>
                </div>
                <textarea
                  rows={3}
                  value={day14Text}
                  onChange={(e) => setDay14Text(e.target.value)}
                  placeholder="Write Day 14 Final Breakup (e.g. archiving video breakdown or 60s Loom audit)..."
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs font-sans text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              {saveSuccess ? (
                <span className="text-xs text-emerald-400 font-bold font-mono flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>All 4 sequence messages saved to lead!</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">
                  Messages auto-serve in Today's Schedule on their respective dispatch days.
                </span>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSequence}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Sequence to Lead</span>
                </button>
              </div>
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
                  Duplicates are strictly blocked, and new leads are auto-scheduled.
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

      {/* Manual Single Lead Entry Modal (Instagram & Combined Outreach) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded border border-emerald-500/30">
                    {nextLeadPreview.id}
                  </span>
                  <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${getVoiceTypeBadgeStyle(nextLeadPreview.voiceType).pillClass}`}>
                    {nextLeadPreview.voiceLabel}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    {getChannelLabel(channel)}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white font-['Outfit'] mt-1.5">
                  Add Lead Manually
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create a verified prospect directly in {getChannelLabel(channel)}. Duplicates are blocked and ID/Type are assigned automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {manualError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-medium space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{manualError.message}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {manualError.duplicateMatch?.bestMatch &&
                    (manualError.duplicateMatch.bestMatch.isArchived ||
                      manualError.duplicateMatch.bestMatch.channel === channel) && (
                      <button
                        type="button"
                        onClick={handleMergeManualDuplicate}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>
                          {manualError.duplicateMatch.bestMatch.isArchived
                            ? 'Restore & Merge Metadata (Keep Sent Dates)'
                            : 'Merge Into Existing Lead (Keep Sent Dates)'}
                        </span>
                      </button>
                    )}
                  {manualError.detectedChannel && onNavigateToChannel && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddModalOpen(false);
                        onNavigateToChannel(manualError.detectedChannel!);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                    >
                      <span>Switch to {getChannelLabel(manualError.detectedChannel)} Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleManualAddLead} className="space-y-4">
              {/* Prospect / Business Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                  Prospect / Business Name
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Gigi's On Fairmount (auto-filled from link if blank)"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Channel-Specific Link / Contact Fields */}
              {channel === 'instagram' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-pink-300 font-mono uppercase tracking-wider">
                      <Instagram className="w-3.5 h-3.5 text-pink-400" />
                      <span>Instagram Handle or Profile URL *</span>
                    </label>
                    <input
                      type="text"
                      value={manualIgLink}
                      onChange={(e) => {
                        setManualIgLink(e.target.value);
                        setManualError(null);
                      }}
                      placeholder="https://instagram.com/restaurant or @handle"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>Backup Email (Optional · Reference Only)</span>
                    </label>
                    <input
                      type="text"
                      value={manualEmail}
                      onChange={(e) => {
                        setManualEmail(e.target.value);
                        setManualError(null);
                      }}
                      placeholder="contact@restaurant.com"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-sky-300 font-mono uppercase tracking-wider">
                      <Facebook className="w-3.5 h-3.5 text-sky-400" />
                      <span>Facebook Page URL</span>
                    </label>
                    <input
                      type="text"
                      value={manualFbLink}
                      onChange={(e) => {
                        setManualFbLink(e.target.value);
                        setManualError(null);
                      }}
                      placeholder="https://facebook.com/restaurant"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 font-mono uppercase tracking-wider">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Email Address</span>
                    </label>
                    <input
                      type="text"
                      value={manualEmail}
                      onChange={(e) => {
                        setManualEmail(e.target.value);
                        setManualError(null);
                      }}
                      placeholder="owner@restaurant.com"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      Provide a Facebook URL, an Email address, or both (at least one is required).
                    </p>
                  </div>
                </>
              )}

              {/* City / Location */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
                  City / Market (Optional)
                </label>
                <input
                  type="text"
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  placeholder="e.g. Dallas, TX"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Optional Lead Analysis / Prompt */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
                  Lead Analysis / Prompt Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={manualPrompt}
                  onChange={(e) => setManualPrompt(e.target.value)}
                  placeholder="Paste research notes or Gemini/DeepSeek analysis here..."
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Auto-Schedule Toggle */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-white/10 cursor-pointer hover:border-emerald-500/30 transition">
                <input
                  type="checkbox"
                  checked={manualAutoSchedule}
                  onChange={(e) => setManualAutoSchedule(e.target.checked)}
                  className="mt-0.5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Auto-Schedule Starting Tomorrow</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {manualAutoSchedule ? (
                      <>
                        Next available slot:{' '}
                        <strong className="text-emerald-300 font-mono">{nextLeadPreview.nextDate}</strong>{' '}
                        (respects daily quota &amp; warm-up rhythm)
                      </>
                    ) : (
                      'Lead will be added without a scheduled dispatch date.'
                    )}
                  </p>
                </div>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Lead to {getChannelLabel(channel)}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive-First Cadence Choice Modal (preserves immutable dispatchLog history) */}
      {pendingArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/35 bg-slate-900 p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Archive {pendingArchiveModal.leadsToArchive.length === 1 ? `"${pendingArchiveModal.leadsToArchive[0].name}"` : `${pendingArchiveModal.leadsToArchive.length} Leads`}?
                  </h3>
                  <p className="text-xs text-slate-400">
                    Past verified dispatches stay permanently in your ledger
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingArchiveModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This selection includes already-pitched lead(s). Choose whether their D4/D8/D14 follow-ups should continue running or be cancelled:
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase font-bold text-slate-400">
                Cancel Reason (used only if cancelling cadence)
              </label>
              <input
                type="text"
                value={pendingArchiveModal.cancelReason}
                onChange={(e) =>
                  setPendingArchiveModal((prev) =>
                    prev ? { ...prev, cancelReason: e.target.value } : null
                  )
                }
                placeholder="e.g. Out of business, Duplicate, Bounced"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const { leadsToArchive, ids } = pendingArchiveModal;
                  setPendingArchiveModal(null);
                  finalizeSoftDelete(leadsToArchive, ids, 'keep_running');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Archive (Keep Follow-Ups Running)
              </button>
              <button
                type="button"
                onClick={() => {
                  const { leadsToArchive, ids, cancelReason } = pendingArchiveModal;
                  setPendingArchiveModal(null);
                  finalizeSoftDelete(leadsToArchive, ids, 'cancel_cadence', cancelReason.trim() || 'Cancelled by operator');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 text-xs font-bold transition cursor-pointer"
              >
                Archive &amp; Cancel Cadence
              </button>
              <button
                type="button"
                onClick={() => setPendingArchiveModal(null)}
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
