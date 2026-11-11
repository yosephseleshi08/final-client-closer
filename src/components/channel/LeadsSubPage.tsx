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
  Sparkles,
  ShieldCheck,
  Save,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import { ChannelLead, MultiChannelType, VoiceType } from '../../types';
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
  getCadenceMessageTemplates,
} from '../../utils/cadenceEngine';
import {
  getRoundRobinVoiceType,
  getStrictVoiceTypeForId,
  ensureVoiceTypeAssignments,
  getVoiceTypeBadgeStyle,
  getWorkspaceVoiceTypes,
  getVoiceTypeDisplayLabel,
  getWorkspaceFilterOptions,
} from '../../utils/voiceTypeEngine';
import { playWarningChime } from '../../utils/soundEffects';

interface LeadsSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
  onNavigateToChannel?: (channel: MultiChannelType) => void;
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

  // Voice Type Filtering States
  const [selectedVoiceFilter, setSelectedVoiceFilter] = useState<VoiceType | 'all'>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [openVoiceDropdownLeadId, setOpenVoiceDropdownLeadId] = useState<string | null>(null);

  // Reset filter when switching between workspaces
  useEffect(() => {
    setSelectedVoiceFilter('all');
    setIsFilterDropdownOpen(false);
  }, [channel]);

  // Auto-assign round-robin voice types to existing leads immediately on mount if missing
  useEffect(() => {
    if (leads.length === 0) return;
    const { updatedLeads, hasChanges } = ensureVoiceTypeAssignments(leads, channel);
    if (hasChanges) {
      onUpdateLeads(updatedLeads);
    }
  }, [leads, channel]);

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

  // Update a single lead's voiceType via the inline dropdown
  const handleUpdateLeadVoiceType = (leadId: string, newVoiceType: VoiceType) => {
    const updated = leads.map((l) =>
      l.id === leadId
        ? { ...l, voiceType: newVoiceType, isVoiceTypeOverridden: true }
        : l
    );
    onUpdateLeads(updated);
    setOpenVoiceDropdownLeadId(null);
  };

  // Open Edit Sequence Modal
  const handleOpenEditSequence = (lead: ChannelLead) => {
    const defaultTemplates = getCadenceMessageTemplates(lead);
    setEditingLead(lead);
    setInitialDmText(lead.initialDM || lead.customPitch || defaultTemplates.stageAMessage);
    setDay4Text(lead.followupDM_Day7 || lead.followup3DM || defaultTemplates.day4Message);
    setDay8Text(lead.followupDM_Day14 || lead.followup7DM || defaultTemplates.day8Message);
    setDay14Text(lead.breakupDM_Day30 || defaultTemplates.day14Message);
    setCopiedPrompt(false);
    setSaveSuccess(false);
  };

  const handleSaveSequence = () => {
    if (!editingLead) return;

    const updated = leads.map((l) => {
      if (l.id === editingLead.id) {
        return {
          ...l,
          initialDM: initialDmText.trim(),
          customPitch: initialDmText.trim(),
          stagedDmMiniPitch: initialDmText.trim(),
          followupDM_Day7: day4Text.trim(),
          followup3DM: day4Text.trim(),
          followupDM_Day14: day8Text.trim(),
          followup7DM: day8Text.trim(),
          breakupDM_Day30: day14Text.trim(),
          pitchSavedAt: new Date().toISOString(),
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

  const handleDeleteLead = (id: string) => {
    const filtered = leads.filter((l) => l.id !== id);
    const resequenced = resequenceLeadIds(filtered, channel);
    onUpdateLeads(resequenced);
  };

  const handleCopyPrompt = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Batch import handler
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

      const duplicateFb = detectedFb ? findDuplicateLead(detectedFb, currentList) : undefined;
      const duplicateEmail = detectedEmail ? findDuplicateLead(detectedEmail, currentList) : undefined;
      const duplicateUrl = findDuplicateLead(rawUrl, currentList);

      if (duplicateFb || duplicateEmail || duplicateUrl) {
        duplicateCount++;
        continue;
      }

      const nextIdData = getNextLeadId(channel, currentList);
      const businessName = customName || extractSuggestedName(rawUrl);
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
        voiceType: getStrictVoiceTypeForId(nextIdData.numericId, channel),
        isVoiceTypeOverridden: false,
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

      {/* Toolbar: Closed-System Notice & Batch / Search Bar */}
      <div className="relative z-30 rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 sm:p-5 backdrop-blur-sm shadow-xl space-y-4">
        <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-slate-300 font-medium">
              <strong className="text-indigo-200">Closed-System CRM:</strong> Leads ordered chronologically by ID (1, 2, 3...). Profile links are hidden to enforce Warm-Up discipline. Write and configure your 4-step sequence below.
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
            <span>Batch Import</span>
          </button>
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 text-left w-28">ID</th>
                <th className="py-3 px-4 text-left">Prospect Name</th>
                <th className="py-3 px-4 text-left w-64">Sequence Configuration</th>
                <th className="py-3 px-4 text-right w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="text-sm font-medium text-slate-400">No leads in {getChannelLabel(channel)} yet</p>
                      <p className="text-xs text-slate-500">
                        Upload leads through the <strong>📥 Lead Inbox</strong> or <strong>Batch Import</strong> to intake prospects.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const dayStyle = getScheduleDayStyle(lead.scheduledDate);
                  const isDueToday = isDateToday(lead.scheduledDate);

                  return (
                    <tr
                      key={lead.id}
                      className={`border-b border-white/[0.06] transition-colors hover:bg-white/[0.02] ${
                        dayStyle.borderClass
                      } ${dayStyle.tintClass} ${
                        isDueToday ? 'ring-1 ring-emerald-500/40 bg-emerald-950/20' : ''
                      }`}
                    >
                      {/* 1. ID */}
                      <td className="py-3.5 px-4 text-left font-mono text-xs tabular-nums text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20">
                            {lead.id}
                          </span>
                          {isDueToday && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm animate-pulse">
                              TODAY
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Prospect Name + Voice Type Badge with Dropdown */}
                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-100 font-['Outfit'] truncate max-w-xs">
                            {lead.name}
                          </span>

                          {/* Voice Type Badge & Dropdown Selector (Requirement 4) */}
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenVoiceDropdownLeadId(
                                  openVoiceDropdownLeadId === lead.id ? null : lead.id
                                );
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono border transition-all cursor-pointer shadow-sm ${
                                getVoiceTypeBadgeStyle(lead.voiceType).pillClass
                              }`}
                              title={`Voice Type: ${getVoiceTypeDisplayLabel(lead.voiceType, channel)} - Click to override`}
                            >
                              <span>{getVoiceTypeDisplayLabel(lead.voiceType, channel)}</span>
                              <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                            </button>

                            {openVoiceDropdownLeadId === lead.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenVoiceDropdownLeadId(null);
                                  }}
                                />
                                <div className="absolute left-0 mt-1 w-44 rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/80 p-1.5 z-50 text-left">
                                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2 py-1 border-b border-white/5 mb-1">
                                    Override Type
                                  </div>
                                  <div className="space-y-0.5 max-h-52 overflow-y-auto">
                                    {workspaceVoiceTypes.map((vt) => {
                                      if (!vt) return null;
                                      const isCurrent = lead.voiceType === vt;
                                      const style = getVoiceTypeBadgeStyle(vt);
                                      const displayLabel = getVoiceTypeDisplayLabel(vt, channel);
                                      return (
                                        <button
                                          key={vt}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUpdateLeadVoiceType(lead.id, vt);
                                            setOpenVoiceDropdownLeadId(null);
                                          }}
                                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center justify-between transition-colors cursor-pointer ${
                                            isCurrent
                                              ? 'bg-white/15 text-white font-bold'
                                              : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                          }`}
                                        >
                                          <span className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${style.dotColor}`} />
                                            <span>{displayLabel}</span>
                                          </span>
                                          {isCurrent && <span className="text-[10px] text-emerald-400 font-bold">✓</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

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

                      {/* 3. Prompt / Edit Sequence Button (Requirement 4) */}
                      <td className="py-3.5 px-4 text-left">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSequence(lead)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
                          title="Open Lead Analysis and edit 4-step sequence (Initial, Day 4, Day 8, Day 14)"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Prompt / Edit Sequence</span>
                        </button>
                      </td>

                      {/* 4. Action: ONLY Delete Button (🗑️) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead.id)}
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
                })
              )}
            </tbody>
          </table>
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
              <h4 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>4-Step Multi-Channel Sequence</span>
              </h4>

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
                  placeholder="Hey team! I just posted a quick video breaking down your website..."
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
                  <span className="text-[10px] text-slate-500">Kitchen Ticket PDF</span>
                </div>
                <textarea
                  rows={3}
                  value={day4Text}
                  onChange={(e) => setDay4Text(e.target.value)}
                  placeholder="Hey there, did you get a chance to see that breakdown video? We just put together a quick PDF..."
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
                  placeholder="Quick update—another spot in your area implemented that online ordering tweak and saw a 12% jump..."
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
                  placeholder="I know you're super busy running service. I'm archiving our video breakdown this week, but I recorded a quick 60-second Loom..."
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
    </div>
  );
}
