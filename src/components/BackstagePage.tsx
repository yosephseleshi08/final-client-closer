import React, { useState, useMemo, useEffect } from 'react';
import {
  Trash2,
  RotateCcw,
  Search,
  Instagram,
  Layers,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../types';
import {
  restoreLeadsFromBackstage,
  permanentlyDeleteFromBackstage,
  clearAllBackstageLeads,
} from '../utils/backstageStorage';
import { getVoiceTypeBadgeStyle, getVoiceTypeDisplayLabel } from '../utils/voiceTypeEngine';
import { getChannelLabel } from '../utils/channelStorage';

interface BackstagePageProps {
  backstageLeads: ChannelLead[];
  combinedLeads: ChannelLead[];
  instagramLeads: ChannelLead[];
  onRestored: (
    updatedCombined: ChannelLead[],
    updatedInstagram: ChannelLead[],
    remainingBackstage: ChannelLead[]
  ) => void;
  onBackstageUpdated: (remainingBackstage: ChannelLead[]) => void;
  onNavigateToChannel: (channel: 'combined' | 'instagram') => void;
}

type ChannelFilter = 'all' | 'instagram' | 'combined';

interface ConfirmDeleteState {
  mode: 'single' | 'selected' | 'all';
  uids: string[];
  label: string;
}

export const BackstagePage: React.FC<BackstagePageProps> = ({
  backstageLeads,
  combinedLeads,
  instagramLeads,
  onRestored,
  onBackstageUpdated,
  onNavigateToChannel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'restore' | 'delete' } | null>(null);

  // Prune any selected UIDs that no longer exist in backstageLeads
  useEffect(() => {
    const validSet = new Set(backstageLeads.map((l) => l.archiveUid).filter(Boolean) as string[]);
    setSelectedUids((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((uid) => {
        if (validSet.has(uid)) {
          next.add(uid);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [backstageLeads]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const counts = useMemo(() => {
    let ig = 0;
    let combined = 0;
    for (const l of backstageLeads) {
      const ch = l.archivedFromChannel || l.channel;
      if (ch === 'instagram') ig++;
      else combined++;
    }
    return { total: backstageLeads.length, ig, combined };
  }, [backstageLeads]);

  const filteredLeads = useMemo(() => {
    let list = backstageLeads;
    if (channelFilter !== 'all') {
      list = list.filter((l) => {
        const ch = (l.archivedFromChannel || l.channel) === 'instagram' ? 'instagram' : 'combined';
        return ch === channelFilter;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q) ||
          (l.link && l.link.toLowerCase().includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [backstageLeads, channelFilter, searchQuery]);

  const visibleUids = useMemo(
    () => filteredLeads.map((l) => l.archiveUid).filter(Boolean) as string[],
    [filteredLeads]
  );

  const allVisibleSelected =
    visibleUids.length > 0 && visibleUids.every((uid) => selectedUids.has(uid));

  const toggleSelectAllVisible = () => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleUids.forEach((uid) => next.delete(uid));
      } else {
        visibleUids.forEach((uid) => next.add(uid));
      }
      return next;
    });
  };

  const toggleSelectOne = (uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleRestoreUids = (uidsToRestore: string[]) => {
    if (uidsToRestore.length === 0) return;

    const result = restoreLeadsFromBackstage(uidsToRestore, {
      combined: combinedLeads,
      instagram: instagramLeads,
    });

    onRestored(result.updatedCombined, result.updatedInstagram, result.remainingBackstage);
    setSelectedUids((prev) => {
      const next = new Set(prev);
      uidsToRestore.forEach((u) => next.delete(u));
      return next;
    });

    const count = result.restoredLeads.length;
    if (count === 1) {
      const restored = result.restoredLeads[0];
      const destLabel = restored.channel === 'instagram' ? 'Instagram' : 'Combined Outreach';
      setToast({
        type: 'restore',
        message: `♻️ Restored "${restored.name}" (${restored.id}) back to ${destLabel}.`,
      });
    } else if (count > 1) {
      setToast({
        type: 'restore',
        message: `♻️ Restored ${count} leads back to their main workspaces.`,
      });
    }
  };

  const handleRequestPermanentDeleteSingle = (lead: ChannelLead) => {
    if (!lead.archiveUid) return;
    setConfirmDelete({
      mode: 'single',
      uids: [lead.archiveUid],
      label: `"${lead.name}" (${lead.id})`,
    });
  };

  const handleRequestPermanentDeleteSelected = () => {
    const uids = Array.from(selectedUids);
    if (uids.length === 0) return;
    setConfirmDelete({
      mode: 'selected',
      uids,
      label: `${uids.length} selected lead${uids.length === 1 ? '' : 's'}`,
    });
  };

  const handleRequestEmptyBackstage = () => {
    if (backstageLeads.length === 0) return;
    setConfirmDelete({
      mode: 'all',
      uids: backstageLeads.map((l) => l.archiveUid).filter(Boolean) as string[],
      label: `all ${backstageLeads.length} archived lead${backstageLeads.length === 1 ? '' : 's'}`,
    });
  };

  const handleConfirmPermanentDelete = () => {
    if (!confirmDelete) return;

    let remaining: ChannelLead[];
    if (confirmDelete.mode === 'all') {
      remaining = clearAllBackstageLeads();
    } else {
      remaining = permanentlyDeleteFromBackstage(confirmDelete.uids);
    }

    onBackstageUpdated(remaining);
    setSelectedUids((prev) => {
      const next = new Set(prev);
      confirmDelete.uids.forEach((u) => next.delete(u));
      return next;
    });

    const deletedLabel = confirmDelete.label;
    setConfirmDelete(null);
    setToast({
      type: 'delete',
      message: `Permanently deleted ${deletedLabel} from Backstage.`,
    });
  };

  const formatArchivedTime = (iso?: string): string => {
    if (!iso) return 'Recently';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  const getStatusLabel = (lead: ChannelLead): { text: string; className: string } => {
    if (lead.leadStatus === 'replied') {
      return { text: 'Replied', className: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' };
    }
    if (lead.isCompleted || lead.leadStatus === 'completed') {
      return { text: 'Completed', className: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30' };
    }
    if (lead.initialSentDate || lead.dmSent || (lead.followupCount && lead.followupCount > 0)) {
      return { text: 'Sent', className: 'text-sky-300 bg-sky-500/15 border-sky-500/30' };
    }
    if (lead.isWarmedUp || lead.warmupStatus === 'warmed') {
      return { text: 'Warmed', className: 'text-amber-300 bg-amber-500/15 border-amber-500/30' };
    }
    return { text: 'Queued', className: 'text-slate-300 bg-white/5 border-white/10' };
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-50 max-w-lg w-[calc(100vw-2.5rem)] rounded-2xl border p-4 text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 ${
            toast.type === 'restore'
              ? 'border-emerald-500/50 bg-emerald-950/95 text-emerald-100 shadow-emerald-950/60'
              : 'border-rose-500/50 bg-rose-950/95 text-rose-100 shadow-rose-950/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'restore' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Trash2 className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Backstage Header Banner */}
      <div className="rounded-2xl border border-rose-500/25 bg-gradient-to-r from-rose-500/15 via-slate-900/70 to-slate-900/90 p-5 sm:p-6 backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-900 border border-rose-500/30 flex items-center justify-center shadow-lg shrink-0">
            <Trash2 className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-white font-['Outfit']">
                🗑️ Backstage Recycle Bin
              </h1>
              <span className="text-[11px] font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded">
                Soft-Delete Safety Net
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Leads deleted from Combined Outreach or Instagram are safely archived here with all sequence messages, prompts, and warm-up progress preserved. Restore any selection with one click, or permanently delete when you are sure.
            </p>
          </div>
        </div>

        {/* Summary Metrics Strip */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-300 self-start lg:self-auto bg-slate-950/60 px-4 py-2.5 rounded-xl border border-white/10 shrink-0">
          <div>
            <span className="text-slate-500 block text-[10px] font-sans">Archived</span>
            <strong className="text-white tabular-nums">{counts.total}</strong>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <span className="text-slate-500 block text-[10px] font-sans">Combined</span>
            <strong className="text-indigo-300 tabular-nums">{counts.combined}</strong>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <span className="text-slate-500 block text-[10px] font-sans">Instagram</span>
            <strong className="text-pink-300 tabular-nums">{counts.ig}</strong>
          </div>
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Primary Restore & Permanent Delete Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleRestoreUids(Array.from(selectedUids))}
              disabled={selectedUids.size === 0}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-white/5 text-white text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 whitespace-nowrap"
            >
              <span>♻️ Restore Selected to Main Workspace</span>
              {selectedUids.size > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-white/20 text-white font-mono text-[10px] tabular-nums">
                  {selectedUids.size}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleRequestPermanentDeleteSelected}
              disabled={selectedUids.size === 0}
              className="px-3.5 py-2.5 rounded-xl border border-rose-500/35 bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-rose-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>
                Delete Selected Forever{selectedUids.size > 0 ? ` (${selectedUids.size})` : ''}
              </span>
            </button>
          </div>

          {backstageLeads.length > 0 && (
            <button
              type="button"
              onClick={handleRequestEmptyBackstage}
              className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-rose-500/15 hover:border-rose-500/30 text-slate-300 hover:text-rose-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 self-start lg:self-auto whitespace-nowrap"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Empty Backstage</span>
            </button>
          )}
        </div>

        {/* Search & Workspace Filter Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search archived leads by name, ID, or link..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950/70 rounded-xl border border-white/10 self-start sm:self-auto">
            {(
              [
                { id: 'all', label: `All (${counts.total})` },
                { id: 'combined', label: `Combined (${counts.combined})` },
                { id: 'instagram', label: `Instagram (${counts.ig})` },
              ] as { id: ChannelFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setChannelFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap tabular-nums ${
                  channelFilter === tab.id
                    ? 'bg-slate-800 text-white border border-white/15 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Archived Leads Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={visibleUids.length === 0}
                    aria-label="Select all visible archived leads"
                    className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer disabled:opacity-40"
                  />
                </th>
                <th className="py-3 px-4 text-left w-40">Original ID &amp; Workspace</th>
                <th className="py-3 px-4 text-left">Prospect Name</th>
                <th className="py-3 px-4 text-left w-36">Pipeline State</th>
                <th className="py-3 px-4 text-left w-40">Archived On</th>
                <th className="py-3 px-4 text-right w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-200 font-['Outfit']">
                        {backstageLeads.length === 0
                          ? 'Backstage is clean — no archived leads'
                          : 'No archived leads match your search or filter'}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {backstageLeads.length === 0
                          ? 'Whenever you click the trash icon (🗑️) on a lead in Combined Outreach or Instagram, it lands safely here instead of being permanently erased.'
                          : 'Try clearing your search input or switching the workspace filter above.'}
                      </p>
                      {backstageLeads.length === 0 ? (
                        <div className="flex items-center justify-center gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => onNavigateToChannel('combined')}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <span>Go to Combined Outreach</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigateToChannel('instagram')}
                            className="px-3.5 py-2 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 text-pink-200 border border-pink-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <span>Go to Instagram</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setChannelFilter('all');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const uid = lead.archiveUid || lead.id;
                  const isSelected = selectedUids.has(uid);
                  const sourceChannel: MultiChannelType =
                    (lead.archivedFromChannel || lead.channel) === 'instagram'
                      ? 'instagram'
                      : 'combined';
                  const voiceStyle = getVoiceTypeBadgeStyle(lead.voiceType ?? null);
                  const statusInfo = getStatusLabel(lead);
                  const hasSequence =
                    Boolean(lead.isSequenceConfigured) ||
                    Boolean(
                      (lead.initialDM || '').trim() &&
                        (lead.followupDM_Day7 || lead.followup3DM || '').trim()
                    );

                  return (
                    <tr
                      key={uid}
                      onClick={() => toggleSelectOne(uid)}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/25 hover:bg-emerald-950/35'
                          : 'hover:bg-white/[0.025]'
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3.5 px-4 text-left"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(uid)}
                          aria-label={`Select ${lead.name}`}
                          className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Original ID & Workspace */}
                      <td className="py-3.5 px-4 text-left whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 tabular-nums">
                            {lead.id}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                              sourceChannel === 'instagram' ? 'text-pink-300' : 'text-indigo-300'
                            }`}
                          >
                            {sourceChannel === 'instagram' ? (
                              <Instagram className="w-3.5 h-3.5" />
                            ) : (
                              <Layers className="w-3.5 h-3.5" />
                            )}
                            <span>{getChannelLabel(sourceChannel)}</span>
                          </span>
                        </div>
                      </td>

                      {/* Prospect Name & Metadata */}
                      <td className="py-3.5 px-4 text-left">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-100 font-['Outfit']">
                              {lead.name}
                            </span>
                            {lead.voiceType && (
                              <span className={`text-[10px] font-mono ${voiceStyle.pillClass} px-1.5 py-0.5 rounded border`}>
                                {getVoiceTypeDisplayLabel(lead.voiceType, sourceChannel)}
                              </span>
                            )}
                            {hasSequence && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-medium">
                                <Sparkles className="w-3 h-3" />
                                <span>Sequence Saved</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono truncate max-w-md">
                            {lead.link || lead.email || lead.facebook || lead.instagram || 'No link stored'}
                          </div>
                        </div>
                      </td>

                      {/* Status Snapshot */}
                      <td className="py-3.5 px-4 text-left whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${statusInfo.className}`}
                        >
                          {statusInfo.text}
                        </span>
                      </td>

                      {/* Archived At */}
                      <td className="py-3.5 px-4 text-left whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatArchivedTime(lead.archivedAt)}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleRestoreUids([uid])}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1"
                            title={`Restore ${lead.name} to ${getChannelLabel(sourceChannel)}`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRequestPermanentDeleteSingle(lead)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-200 border border-rose-500/25 text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1"
                            title={`Permanently delete ${lead.name}`}
                            aria-label={`Permanently delete ${lead.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
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

      {/* Permanent Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/30 p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/35 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white font-['Outfit']">
                    Confirm Permanent Deletion
                  </h3>
                  <p className="text-xs text-rose-300 font-medium">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                aria-label="Close confirmation modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-300 leading-relaxed space-y-1.5">
              <p>
                You are about to permanently erase <strong className="text-white">{confirmDelete.label}</strong> from Backstage.
              </p>
              <p className="text-slate-400">
                All saved sequence messages, prompts, schedules, and warm-up records for {confirmDelete.mode === 'single' ? 'this lead' : 'these leads'} will be permanently removed from your browser storage.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-600/30 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
