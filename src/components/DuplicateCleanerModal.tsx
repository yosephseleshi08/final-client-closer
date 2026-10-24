import React, { useState, useMemo } from 'react';
import {
  X,
  Link2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  Check,
  Instagram,
  Facebook,
  Mail,
  Globe
} from 'lucide-react';
import { Lead } from '../types';
import {
  findDuplicateLeadGroups,
  autoDeduplicateLeads,
  removeSpecificDuplicateLeads,
  DuplicateGroup
} from '../utils/duplicateDetector';
import { playSuccessChime, playWarningChime } from '../utils/soundEffects';

interface DuplicateCleanerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  onSetLeads: (newLeads: Lead[]) => void;
  showToast: (msg: string, undo?: () => void) => void;
}

export const DuplicateCleanerModal: React.FC<DuplicateCleanerModalProps> = ({
  isOpen,
  onClose,
  leads,
  onSetLeads,
  showToast,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [preferredKeeps, setPreferredKeeps] = useState<Record<string, number>>({});
  const [lastRemovedLeads, setLastRemovedLeads] = useState<Lead[] | null>(null);

  // Live duplicate scan across all stored leads
  const duplicateGroups = useMemo(() => {
    return findDuplicateLeadGroups(leads);
  }, [leads]);

  // Total redundant duplicates that can be removed
  const totalRedundantDuplicates = useMemo(() => {
    return duplicateGroups.reduce((acc, g) => acc + (g.leads.length - 1), 0);
  }, [duplicateGroups]);

  // Filtered groups by user search
  const filteredGroups = useMemo(() => {
    if (!searchFilter.trim()) return duplicateGroups;
    const q = searchFilter.toLowerCase();
    return duplicateGroups.filter(
      (g) =>
        g.displayName.toLowerCase().includes(q) ||
        g.normalizedUrl.toLowerCase().includes(q) ||
        g.leads.some((l) => l.restaurantName.toLowerCase().includes(q) || l.handle.toLowerCase().includes(q))
    );
  }, [duplicateGroups, searchFilter]);

  if (!isOpen) return null;

  // Handle removing all redundant duplicates in one click
  const handleRemoveAllDuplicates = () => {
    if (duplicateGroups.length === 0) return;

    const previousLeads = [...leads];
    const { deduplicatedLeads, removedLeads, removedCount } = autoDeduplicateLeads(leads, preferredKeeps);

    onSetLeads(deduplicatedLeads);
    setLastRemovedLeads(removedLeads);
    playSuccessChime();

    showToast(`🧹 Cleaned ${removedCount} duplicate links! Stored leads are now 100% unique.`, () => {
      onSetLeads(previousLeads);
      showToast('↩️ Restored removed duplicate leads.');
    });
  };

  // Handle removing a single specific duplicate lead
  const handleRemoveSingleDuplicate = (leadIdToRemove: number, leadName: string) => {
    const targetLead = leads.find((l) => l.id === leadIdToRemove);
    const previousLeads = [...leads];
    const updated = leads.filter((l) => l.id !== leadIdToRemove);

    onSetLeads(updated);
    playWarningChime();

    showToast(`🗑️ Removed duplicate copy of "${leadName}" (Lead #${leadIdToRemove}).`, () => {
      if (targetLead) {
        onSetLeads(previousLeads);
        showToast(`↩️ Restored "${leadName}"!`);
      }
    });
  };

  // Switch which lead in the duplicate group should be kept
  const handleSelectKeepLead = (groupKey: string, keepLeadId: number) => {
    setPreferredKeeps((prev) => ({
      ...prev,
      [groupKey]: keepLeadId,
    }));
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Instagram':
        return <Instagram className="h-3.5 w-3.5 text-pink-400" />;
      case 'Facebook':
        return <Facebook className="h-3.5 w-3.5 text-blue-400" />;
      case 'Email':
        return <Mail className="h-3.5 w-3.5 text-emerald-400" />;
      default:
        return <Globe className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border border-white/10 bg-slate-900 text-white shadow-2xl overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4.5 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/25 text-indigo-400 border border-indigo-500/30">
              <Link2 className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  REAL-TIME DUPLICATE ENGINE
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {leads.length} Stored Leads Scanned
                </span>
              </div>
              <h3 className="text-xl font-black text-white font-['Outfit'] mt-0.5">
                Check & Remove Duplicated Links
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            {totalRedundantDuplicates > 0 ? (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-amber-300">
                    Found {duplicateGroups.length} duplicated link group{duplicateGroups.length === 1 ? '' : 's'} ({totalRedundantDuplicates} redundant lead{totalRedundantDuplicates === 1 ? '' : 's'})
                  </div>
                  <div className="text-[11px] text-slate-400">
                    You can remove all duplicates in 1-click while keeping your best primary lead copy intact.
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-300">
                    Zero Duplicates Found! 100% Unique Pipeline
                  </div>
                  <div className="text-[11px] text-slate-400">
                    All {leads.length} leads in your database have unique URLs and handles.
                  </div>
                </div>
              </>
            )}
          </div>

          {totalRedundantDuplicates > 0 && (
            <button
              onClick={handleRemoveAllDuplicates}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 active:scale-95 transition cursor-pointer shrink-0"
            >
              <Trash2 className="h-4 w-4" />
              <span>Remove All {totalRedundantDuplicates} Duplicates</span>
            </button>
          )}
        </div>

        {/* Filter Bar (if duplicate groups exist) */}
        {duplicateGroups.length > 1 && (
          <div className="px-6 py-2.5 bg-slate-900/50 border-b border-white/5 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search duplicate groups by name, link, or handle..."
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {duplicateGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold text-white font-['Outfit']">
                Your Lead Database is Clean & Deduplicated
              </h4>
              <p className="text-xs text-slate-400 max-w-md mt-1 mb-6">
                Whenever you paste new links from Instagram, Facebook, or Email, the engine automatically guards against duplicate links and prior rejections.
              </p>
              <button
                onClick={onClose}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2 text-xs font-bold text-white transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          ) : (
            filteredGroups.map((group, groupIndex) => {
              const keepId = preferredKeeps[group.key] ?? group.recommendedKeepId;
              const keepLead = group.leads.find((l) => l.id === keepId) || group.leads[0];
              const duplicateLeads = group.leads.filter((l) => l.id !== keepLead.id);

              return (
                <div
                  key={group.key}
                  className="rounded-2xl border border-amber-500/30 bg-slate-950/80 p-4 space-y-3.5 transition hover:border-amber-500/50 shadow-md"
                >
                  {/* Group Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300 border border-amber-500/30">
                        <Link2 className="h-3 w-3" />
                        {group.leads.length} Copies Found
                      </span>
                      <span className="text-xs font-bold text-white">
                        {group.displayName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({group.reason})
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const duplicateIds = duplicateLeads.map((l) => l.id);
                        const updated = removeSpecificDuplicateLeads(leads, duplicateIds);
                        onSetLeads(updated);
                        playSuccessChime();
                        showToast(`Cleaned ${duplicateIds.length} duplicate copy of "${group.displayName}"!`);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Remove all {duplicateLeads.length} duplicates in this group</span>
                    </button>
                  </div>

                  {/* Leads in this Duplicate Group */}
                  <div className="space-y-2">
                    {/* The Lead Being Kept */}
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
                          <Check className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-emerald-300">
                              ⭐ KEEPING THIS LEAD (ID #{keepLead.id})
                            </span>
                            <span className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                              {getPlatformIcon(keepLead.platform)}
                              {keepLead.platform} Page
                            </span>
                            <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300 uppercase">
                              {keepLead.status}
                            </span>
                            {keepLead.scheduledDay && (
                              <span className="text-[10px] text-slate-400">
                                • {keepLead.scheduledDay}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-white mt-0.5">
                            {keepLead.restaurantName}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-md">
                            {keepLead.profileUrl || keepLead.handle || keepLead.website || 'No link string'}
                          </div>
                          {keepLead.notes && (
                            <div className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">
                              "{keepLead.notes}"
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          Primary / Most Active
                        </span>
                      </div>
                    </div>

                    {/* Redundant Duplicate Copies */}
                    {duplicateLeads.map((dup) => (
                      <div
                        key={dup.id}
                        className="rounded-xl border border-white/5 bg-slate-900/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-rose-500/30 transition"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0 mt-0.5">
                            <Trash2 className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-rose-300">
                                🗑️ DUPLICATE COPY (ID #{dup.id})
                              </span>
                              <span className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                                {getPlatformIcon(dup.platform)}
                                {dup.platform} Page
                              </span>
                              <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 uppercase">
                                {dup.status}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                • {dup.followupCount || 0} followups
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-200 mt-0.5">
                              {dup.restaurantName}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-md">
                              {dup.profileUrl || dup.handle || dup.website || 'No link string'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleSelectKeepLead(group.key, dup.id)}
                            className="rounded-lg border border-white/10 hover:border-emerald-500/40 bg-white/5 hover:bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-emerald-300 transition cursor-pointer"
                            title="Keep this copy instead of the current primary"
                          >
                            Keep This One Instead
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSingleDuplicate(dup.id, dup.restaurantName)}
                            className="flex items-center gap-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 px-3 py-1 text-[11px] font-bold text-white transition cursor-pointer active:scale-95"
                            title="Delete this duplicate immediately"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Remove Duplicate</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-3.5 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            {totalRedundantDuplicates > 0 ? (
              <span>
                💡 Clicking <strong>Remove All Duplicates</strong> cleans the redundant copies and preserves the most advanced deal copy.
              </span>
            ) : (
              <span>✅ All links in your CRM are verified unique.</span>
            )}
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            {totalRedundantDuplicates > 0 && (
              <button
                type="button"
                onClick={handleRemoveAllDuplicates}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 px-4 py-2 text-xs font-bold text-white shadow transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clean All Duplicates</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-white transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
