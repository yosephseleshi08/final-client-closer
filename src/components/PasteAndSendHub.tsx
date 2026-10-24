import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Link2,
  Send,
  Copy,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Plus,
  Search,
  Check,
  Facebook,
  MapPin,
  Instagram,
  Mail,
  Globe,
  Edit2,
  Edit3,
  Save,
  Sparkles,
  Settings,
  X,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Clock,
  MessageSquare,
  Ban,
  AlertTriangle,
  RotateCcw,
  ClipboardCheck,
  ShieldAlert,
  ShieldCheck,
  Archive,
  CheckSquare,
  RefreshCw,
  Calendar,
  CalendarDays,
  Layers,
  LayoutGrid,
  List,
  Image as ImageIcon
} from 'lucide-react';
import { Lead, LeadStatus, RejectedLeadEntry, Weekday } from '../types';
import { WEEKDAYS, WEEKDAY_CONFIG, getTodayWeekday } from '../utils/weeklyScheduler';
import { parseBusinessFromUrl, buildOutreachPitch, isGenericPlaceholderName } from '../utils/linkLeadParser';
import {
  checkLeadUrlStatus,
  loadRejectedLeads,
  removeRejectedLead,
  addRejectedLead,
  LinkValidationResult
} from '../utils/linkDeduplicator';
import { findDuplicateLeadGroups } from '../utils/duplicateDetector';
import { playWarningChime, playSuccessChime } from '../utils/soundEffects';
import { RejectLeadModal } from './RejectLeadModal';
import { ClipboardLinkCheckerModal } from './ClipboardLinkCheckerModal';
import { MockupVault } from './MockupVault';
import { sortLeadsDeterministically, LeadSortMode } from '../utils/leadSortHelper';

export const STATUS_PRIORITY_ORDER: Record<string, number> = {
  sent: 1,
  not_sent: 2,
  replied: 3,
  seen: 4,
  mockup_sent: 5,
  call_booked: 6,
  proposal_sent: 7,
  closed_won: 8,
  closed_dead: 9,
};

export const WEEKDAY_PRIORITY_ORDER: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

interface PasteAndSendHubProps {
  leads: Lead[];
  onAddLead: (newLead: Omit<Lead, 'id'>) => void;
  onUpdateLead: (updated: Lead) => void;
  onDeleteLead: (leadId: number) => void;
  showToast: (msg: string, undo?: () => void) => void;
  onOpenDuplicateCleaner?: () => void;
  onNavigateToTab?: (tab: string) => void;
}


const DEFAULT_PITCH_TEMPLATE =
  'Hey! Put together a 0.3s direct ordering concept for {name}. Waiving our $299 fee to $0 for 3 local spots in exchange for a short review. Want me to turn it live?';

export const PasteAndSendHub: React.FC<PasteAndSendHubProps> = ({
  leads,
  onAddLead,
  onUpdateLead,
  onDeleteLead,
  showToast,
  onOpenDuplicateCleaner,
  onNavigateToTab,
}) => {
  // Main view: Active Leads pipeline vs Rejected & Excluded archive
  const [activeMainTab, setActiveMainTab] = useState<'pipeline' | 'rejected'>('pipeline');

  // Input mode: single link vs bulk paste
  const [inputMode, setInputMode] = useState<'single' | 'bulk'>('single');
  const [singleUrl, setSingleUrl] = useState('');
  const [singleCustomName, setSingleCustomName] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');

  // Target Channel Page selector (User chooses what page to store each lead into)
  const [targetChannelPage, setTargetChannelPage] = useState<'Instagram' | 'Facebook' | 'Email'>('Instagram');
  const [bulkTargetPage, setBulkTargetPage] = useState<'auto' | 'Instagram' | 'Facebook' | 'Email'>('auto');

  // Stored duplicates scan
  const duplicateGroups = useMemo(() => findDuplicateLeadGroups(leads), [leads]);
  const duplicateRedundantCount = duplicateGroups.reduce((acc, g) => acc + (g.leads.length - 1), 0);

  // Rejected registry state
  const [rejectedList, setRejectedList] = useState<RejectedLeadEntry[]>(() => loadRejectedLeads());
  const [rejectModalLead, setRejectModalLead] = useState<Lead | null>(null);
  const [isClipboardModalOpen, setIsClipboardModalOpen] = useState(false);
  const [clipboardInitialUrl, setClipboardInitialUrl] = useState('');

  // Search & Filter for active pipeline
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEED_OUTREACH' | 'not_sent' | 'sent' | 'replied' | 'closed_won'>('ALL');
  const [dayFilter, setDayFilter] = useState<'ALL' | Weekday>('ALL');
  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'Facebook' | 'Google Maps' | 'Instagram' | 'Website'>('ALL');
  const [viewMode, setViewMode] = useState<'categorized_status' | 'categorized_day' | 'unified_list'>('categorized_status');
  const [sortOrder, setSortOrder] = useState<LeadSortMode>('latest_paste');
  const [mockupModalLead, setMockupModalLead] = useState<Lead | null>(null);
  const [scheduledDaySelection, setScheduledDaySelection] = useState<Weekday>(getTodayWeekday());
  const [isExtractingName, setIsExtractingName] = useState(false);

  // Auto-detect channel recommendation and business name when URL is typed or pasted
  const handleSingleUrlChange = (urlVal: string) => {
    // 1. Separate URL from accompanying text if user pasted "Business Name https://..."
    const urlMatch = urlVal.match(/(https?:\/\/[^\s]+)/i);
    let extractedUrl = urlVal.trim();
    let accompanyingText = '';
    if (urlMatch) {
      extractedUrl = urlMatch[1];
      accompanyingText = urlVal.replace(extractedUrl, '').replace(/^[-:\s]+|[-:\s]+$/g, '').trim();
    }

    setSingleUrl(extractedUrl);

    // 2. Recommend channel page based on URL
    const lower = extractedUrl.toLowerCase();
    if (lower.includes('instagram.com') || extractedUrl.startsWith('@')) {
      setTargetChannelPage('Instagram');
    } else if (lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.me')) {
      setTargetChannelPage('Facebook');
    } else if (lower.includes('@') && !lower.includes('/')) {
      setTargetChannelPage('Email');
    }

    // 3. Auto-populate business name
    if (accompanyingText && !isGenericPlaceholderName(accompanyingText)) {
      setSingleCustomName(accompanyingText);
    } else if (extractedUrl) {
      const parsed = parseBusinessFromUrl(extractedUrl);
      if (parsed.name && !isGenericPlaceholderName(parsed.name)) {
        setSingleCustomName(parsed.name);
      }
    }

    // 4. If Facebook link, call server Facebook extractor to fetch real OpenGraph page title
    if (lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.me')) {
      setIsExtractingName(true);
      fetch('/api/facebook/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: extractedUrl, rawText: accompanyingText }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.restaurantName && !isGenericPlaceholderName(data.restaurantName)) {
            setSingleCustomName((current) => {
              if (!current || isGenericPlaceholderName(current) || current === 'Facebook Prospect') {
                return data.restaurantName;
              }
              return current;
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsExtractingName(false);
        });
    }
  };


  // Search & Filter for rejected archive
  const [rejectedSearch, setRejectedSearch] = useState('');
  const [rejectedPlatformFilter, setRejectedPlatformFilter] = useState<string>('ALL');

  // Manual blacklist entry
  const [showAddBlacklist, setShowAddBlacklist] = useState(false);
  const [manualBlacklistUrl, setManualBlacklistUrl] = useState('');
  const [manualBlacklistName, setManualBlacklistName] = useState('');
  const [manualBlacklistReason, setManualBlacklistReason] = useState('Already has good website / Bad fit');

  // Pitch template customization
  const [pitchTemplate, setPitchTemplate] = useState<string>(() => {
    return localStorage.getItem('outreach_custom_template') || DEFAULT_PITCH_TEMPLATE;
  });
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [tempTemplate, setTempTemplate] = useState(pitchTemplate);

  // Copied states
  const [copiedPitchId, setCopiedPitchId] = useState<number | null>(null);

  // Inline editing lead name
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  // Inline editing lead custom pitch
  const [editingPitchLeadId, setEditingPitchLeadId] = useState<number | null>(null);
  const [editingPitchText, setEditingPitchText] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Real-time link validation on Single URL input
  const singleLinkValidation = useMemo(() => {
    if (!singleUrl.trim()) return null;
    return checkLeadUrlStatus(singleUrl, leads, singleCustomName);
  }, [singleUrl, leads, singleCustomName, rejectedList]);

  // Bulk Links live analysis
  const bulkAnalysis = useMemo(() => {
    const lines = bulkUrls
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return null;

    const items = lines.map((line) => {
      const parts = line.split(',');
      const url = parts[0].trim();
      const customName = parts[1]?.trim();
      const validation = checkLeadUrlStatus(url, leads, customName);
      return { line, url, validation };
    });

    const fresh = items.filter((i) => i.validation.isFresh);
    const rejected = items.filter((i) => i.validation.isRejected);
    const duplicate = items.filter((i) => i.validation.isDuplicateActive);

    return {
      total: lines.length,
      items,
      fresh,
      rejected,
      duplicate,
    };
  }, [bulkUrls, leads, rejectedList]);

  // Save single link with proactive duplicate & rejection protection
  const handleSaveSingleLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUrl.trim()) {
      showToast('⚠️ Please paste a Facebook or Google Maps link first.');
      return;
    }

    const check = checkLeadUrlStatus(singleUrl, leads, singleCustomName);

    // 1. If previously rejected
    if (check.isRejected) {
      playWarningChime();
      const shouldUnreject = window.confirm(
        `🚨 REJECTED LEAD ALERT!\n\nYou previously rejected this ${check.platform} lead (${check.rejectedEntry?.businessName || check.detectedName}) on ${check.rejectedEntry?.rejectedAt || 'previously'}!\nReason: "${check.rejectedEntry?.rejectionReason || 'Closed Dead'}".\n\nDo you want to UN-REJECT this business and add it to your pipeline anyway?`
      );

      if (!shouldUnreject) {
        showToast(`Discarded rejected link. Good catch!`);
        return;
      }

      // Unreject if confirmed
      if (check.rejectedEntry) {
        removeRejectedLead(check.rejectedEntry.id);
        setRejectedList(loadRejectedLeads());
      }
    } else if (check.isDuplicateActive) {
      playWarningChime();
      showToast(`⚠️ Already in CRM: "${check.existingLead?.restaurantName}" is currently at stage [${check.existingLead?.status.toUpperCase()}]!`);
      return;
    }

    const parsed = parseBusinessFromUrl(singleUrl, singleCustomName);
    let chosenName = (singleCustomName.trim() && !isGenericPlaceholderName(singleCustomName))
      ? singleCustomName.trim()
      : (!isGenericPlaceholderName(parsed.name) ? parsed.name : `${targetChannelPage} Prospect`);

    // Guard against saving raw ID hashes like "-10000ii298ioawuuh"
    if (/^(?:[0-9]{4,}|1000[a-z0-9]+|6155[a-z0-9]+|[0-9\-_]{5,})$/i.test(chosenName.replace(/[^a-z0-9]/gi, ''))) {
      chosenName = `${targetChannelPage} Prospect`;
    }

    const pitch = buildOutreachPitch(chosenName, pitchTemplate, parsed.url);

    // Save lead into the specific page chosen by the user (Instagram, Facebook, or Email)
    onAddLead({
      restaurantName: chosenName,
      platform: targetChannelPage,
      profileUrl: parsed.url,
      handle: parsed.url,
      city: 'Local Area',
      dateFirstContact: todayStr,
      lastContactDate: '',
      nextFollowupDate: null,
      followupCount: 0,
      status: 'not_sent',
      scheduledDay: scheduledDaySelection,
      notes: `Added from link into ${targetChannelPage} Leads page on ${todayStr} (Scheduled: ${scheduledDaySelection})`,
      pitchHook: pitch,
      stagedDmMiniPitch: pitch,
    });

    const savedTarget = targetChannelPage;
    setSingleUrl('');
    setSingleCustomName('');
    playSuccessChime();
    showToast(`✅ Saved "${chosenName}" (Not Sent • ${scheduledDaySelection}) into ${savedTarget} Leads page!`, () => {
      if (onNavigateToTab) onNavigateToTab(savedTarget.toLowerCase());
    });
  };

  // Save bulk links with automatic duplicate & rejection filtering
  const handleSaveBulkLinks = () => {
    const lines = bulkUrls
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      showToast('⚠️ Please paste at least one link.');
      return;
    }

    let addedCount = 0;
    let skippedRejected = 0;
    let skippedDuplicates = 0;

    lines.forEach((line) => {
      const parts = line.split(',');
      const url = parts[0].trim();
      const customName = parts[1]?.trim();

      if (url) {
        const check = checkLeadUrlStatus(url, leads, customName);
        if (check.isRejected) {
          skippedRejected++;
          return;
        }
        if (check.isDuplicateActive) {
          skippedDuplicates++;
          return;
        }

        const parsed = parseBusinessFromUrl(url, customName);
        const assignedPlatform =
          bulkTargetPage === 'auto'
            ? (parsed.platform as any)
            : bulkTargetPage;

        let chosenName = (customName && !isGenericPlaceholderName(customName))
          ? customName.trim()
          : (!isGenericPlaceholderName(parsed.name) ? parsed.name : `${assignedPlatform} Prospect`);

        if (/^(?:[0-9]{4,}|1000[a-z0-9]+|6155[a-z0-9]+|[0-9\-_]{5,})$/i.test(chosenName.replace(/[^a-z0-9]/gi, ''))) {
          chosenName = `${assignedPlatform} Prospect`;
        }

        const pitch = buildOutreachPitch(chosenName, pitchTemplate, parsed.url);

        onAddLead({
          restaurantName: chosenName,
          platform: assignedPlatform,
          profileUrl: parsed.url,
          handle: parsed.url,
          city: 'Local Area',
          dateFirstContact: todayStr,
          lastContactDate: '',
          nextFollowupDate: null,
          followupCount: 0,
          status: 'not_sent',
          scheduledDay: scheduledDaySelection,
          notes: `Bulk imported into ${assignedPlatform} Leads page on ${todayStr} (Scheduled: ${scheduledDaySelection})`,
          pitchHook: pitch,
          stagedDmMiniPitch: pitch,
        });
        addedCount++;
      }
    });

    setBulkUrls('');
    if (addedCount > 0) {
      playSuccessChime();
      const destinationMsg = bulkTargetPage === 'auto' ? 'their matching channel pages' : `${bulkTargetPage} Leads page`;
      if (skippedRejected > 0 || skippedDuplicates > 0) {
        showToast(`🎉 Saved ${addedCount} fresh leads (Not Sent) into ${destinationMsg}! (Filtered ${skippedRejected} rejected & ${skippedDuplicates} duplicate links)`);
      } else {
        showToast(`🎉 Successfully saved ${addedCount} fresh leads (Not Sent) into ${destinationMsg}!`);
      }
    } else {
      playWarningChime();
      showToast(`⚠️ No new leads added. All ${skippedRejected} links were already rejected or ${skippedDuplicates} duplicates!`);
    }
  };


  // 1-Click: Keep only fresh links in bulk textarea
  const handleFilterFreshOnly = () => {
    if (!bulkAnalysis) return;
    const freshLines = bulkAnalysis.fresh.map((f) => f.line);
    setBulkUrls(freshLines.join('\n'));
    showToast(`🛡️ Filtered out ${bulkAnalysis.rejected.length} rejected and ${bulkAnalysis.duplicate.length} duplicate links! Kept ${freshLines.length} fresh leads.`);
  };

  // Confirm rejection handler for RejectLeadModal
  const handleConfirmRejectLead = (lead: Lead, reason: string, notes: string) => {
    addRejectedLead({
      originalUrl: lead.profileUrl || lead.handle || lead.website,
      businessName: lead.restaurantName,
      platform: lead.platform as any,
      rejectionReason: reason,
      notes,
      leadId: lead.id,
    });
    setRejectedList(loadRejectedLeads());
    handleStatusChange(lead, 'closed_dead');
    playWarningChime();
    showToast(`🚫 Rejected "${lead.restaurantName}" & permanently blacklisted from duplicate outreach.`);
  };

  // Restore / Un-reject entry from blacklist
  const handleUnrejectEntry = (entry: RejectedLeadEntry) => {
    const updated = removeRejectedLead(entry.id);
    setRejectedList(updated);
    showToast(`🔄 Restored "${entry.businessName}" from rejected blacklist!`);
  };

  // Manual blacklist addition
  const handleAddManualBlacklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBlacklistUrl.trim() && !manualBlacklistName.trim()) {
      showToast('⚠️ Please enter at least a link or business name to blacklist.');
      return;
    }
    const parsed = manualBlacklistUrl.trim() ? parseBusinessFromUrl(manualBlacklistUrl, manualBlacklistName) : null;
    const name = manualBlacklistName.trim() || parsed?.name || 'Manual Blacklisted Spot';
    const platform = parsed?.platform || 'Other';

    addRejectedLead({
      originalUrl: manualBlacklistUrl.trim(),
      businessName: name,
      platform: platform as any,
      rejectionReason: manualBlacklistReason.trim() || 'Manual exclusion / Bad fit',
    });

    setRejectedList(loadRejectedLeads());
    setManualBlacklistUrl('');
    setManualBlacklistName('');
    setShowAddBlacklist(false);
    playWarningChime();
    showToast(`🚫 Added "${name}" to duplicate prevention blacklist!`);
  };

  // Save pitch template
  const handleSaveTemplate = () => {
    setPitchTemplate(tempTemplate);
    localStorage.setItem('outreach_custom_template', tempTemplate);
    setIsEditingTemplate(false);
    showToast('💾 Outreach pitch template updated for all leads!');
  };

  // Copy pitch
  const handleCopyPitch = (lead: Lead) => {
    const pitch = lead.pitchHook || buildOutreachPitch(lead.restaurantName, pitchTemplate, lead.profileUrl || lead.handle);
    navigator.clipboard.writeText(pitch);
    setCopiedPitchId(lead.id);
    showToast(`📋 Copied pitch for ${lead.restaurantName}! Paste it directly into their chat.`);
    setTimeout(() => setCopiedPitchId(null), 2500);
  };

  // Open link
  const handleOpenLink = (lead: Lead) => {
    const url = lead.profileUrl || lead.handle || lead.website;
    if (!url) {
      showToast('⚠️ No link saved for this lead.');
      return;
    }
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
  };

  // Mark sent toggle
  const handleToggleSent = (lead: Lead) => {
    const isAlreadySent = lead.lastContactDate === todayStr || lead.status === 'sent';

    if (isAlreadySent) {
      // Revert to not sent
      const updated: Lead = {
        ...lead,
        lastContactDate: '',
        status: 'not_sent',
        followupCount: Math.max((lead.followupCount || 1) - 1, 0),
      };
      onUpdateLead(updated);
      showToast(`Marked ${lead.restaurantName} as not sent yet.`);
    } else {
      const updated: Lead = {
        ...lead,
        lastContactDate: todayStr,
        followupCount: (lead.followupCount || 0) + 1,
        status: 'sent',
      };
      onUpdateLead(updated);
      showToast(`✅ Marked sent to ${lead.restaurantName}!`);
    }
  };

  // Quick status update
  const handleStatusChange = (lead: Lead, newStatus: LeadStatus) => {
    const updated: Lead = {
      ...lead,
      status: newStatus,
      lastContactDate: newStatus === 'not_sent' ? '' : (lead.lastContactDate || todayStr),
    };
    onUpdateLead(updated);

    if (newStatus === 'closed_won') {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      showToast(`🏆 DEAL WON: Congratulations on closing ${lead.restaurantName}!`);
    } else {
      showToast(`Status updated to ${newStatus.replace('_', ' ').toUpperCase()}`);
    }
  };

  // Inline rename
  const handleSaveRename = (lead: Lead) => {
    if (!editingNameValue.trim()) {
      setEditingLeadId(null);
      return;
    }
    const newName = editingNameValue.trim();
    const updated: Lead = {
      ...lead,
      restaurantName: newName,
      isCustomName: true,
      pitchHook: buildOutreachPitch(newName, pitchTemplate, lead.profileUrl || lead.handle),
    };
    onUpdateLead(updated);
    setEditingLeadId(null);
    showToast(`Renamed to ${newName}`);
  };

  // Day counts for pills
  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    WEEKDAYS.forEach((d) => {
      counts[d] = leads.filter((l) => l.scheduledDay === d).length;
    });
    return counts;
  }, [leads]);

  // Filtered & Deterministically Ordered Leads
  const filteredLeads = useMemo(() => {
    const matched = leads.filter((lead) => {
      // Search
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        lead.restaurantName.toLowerCase().includes(q) ||
        (lead.profileUrl && lead.profileUrl.toLowerCase().includes(q)) ||
        (lead.handle && lead.handle.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Platform filter
      if (platformFilter !== 'ALL' && lead.platform !== platformFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'NEED_OUTREACH') {
        if (lead.status === 'closed_won' || lead.status === 'closed_dead') return false;
        if (lead.status !== 'not_sent' && lead.lastContactDate === todayStr) return false;
      } else if (statusFilter !== 'ALL' && lead.status !== statusFilter) {
        return false;
      }

      // Day list filter
      if (dayFilter !== 'ALL' && lead.scheduledDay !== dayFilter) {
        return false;
      }

      return true;
    });

    return sortLeadsDeterministically(matched, sortOrder);
  }, [leads, searchTerm, platformFilter, statusFilter, dayFilter, sortOrder, todayStr]);

  // Metrics
  const totalCount = leads.length;
  const notSentCount = leads.filter((l) => l.status === 'not_sent').length;
  const needOutreachCount = leads.filter(
    (l) => (l.status === 'not_sent' || l.lastContactDate !== todayStr) && l.status !== 'closed_won' && l.status !== 'closed_dead'
  ).length;
  const sentTodayCount = leads.filter((l) => l.lastContactDate === todayStr || l.status === 'sent').length;
  const repliedCount = leads.filter((l) => l.status === 'replied').length;
  const wonCount = leads.filter((l) => l.status === 'closed_won').length;

  return (
    <div className="space-y-6">
      {/* Tab Switcher: Leads Pipeline vs Rejected Archive & Link Inspector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded-2xl border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveMainTab('pipeline')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
              activeMainTab === 'pipeline'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Link2 className="h-4 w-4" />
            <span>Outreach Pipeline ({leads.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('rejected')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
              activeMainTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
            }`}
          >
            <Ban className="h-4 w-4" />
            <span>Rejected & Excluded ({rejectedList.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Instant Duplicate Cleaner Trigger */}
          {onOpenDuplicateCleaner && (
            <button
              type="button"
              onClick={onOpenDuplicateCleaner}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition shadow-sm cursor-pointer shrink-0 ${
                duplicateRedundantCount > 0
                  ? 'border-rose-500/50 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 ring-1 ring-rose-500/30'
                  : 'border-white/10 bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
              }`}
              title="Search stored leads for duplicated links and remove duplicates"
            >
              <Link2 className="h-4 w-4 text-rose-400" />
              <span>Check & Remove Duplicates</span>
              {duplicateRedundantCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-mono text-white animate-pulse">
                  {duplicateRedundantCount}
                </span>
              )}
            </button>
          )}

          {/* Instant Clipboard Inspector Trigger */}
          <button
            onClick={() => {
              setClipboardInitialUrl('');
              setIsClipboardModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25 px-4 py-2 text-xs font-bold text-indigo-300 hover:text-white transition shadow-sm cursor-pointer shrink-0"
            title="Inspect copied Facebook or Google Maps link from clipboard"
          >
            <ClipboardCheck className="h-4 w-4 text-indigo-400" />
            <span>📋 Check Copied Link</span>
          </button>
        </div>
      </div>

      {activeMainTab === 'rejected' ? (
        /* REJECTED / EXCLUDED LINKS ARCHIVE VIEW */
        <div className="rounded-3xl border border-rose-500/20 bg-slate-900/90 p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/30">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] tracking-tight">
                  REJECTED LINKS & <span className="text-rose-400">DUPLICATE BLACKLIST</span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                Whenever you copy or paste any Facebook or Google Maps link from this list, the app automatically flags it so you never waste time pitching rejected businesses again.
              </p>
            </div>

            <button
              onClick={() => setShowAddBlacklist(!showAddBlacklist)}
              className="flex items-center gap-1.5 rounded-2xl bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600/30 px-4 py-2.5 text-xs font-bold text-rose-300 transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>{showAddBlacklist ? 'Cancel' : 'Add Link to Blacklist'}</span>
            </button>
          </div>

          {/* Add to Blacklist Form */}
          {showAddBlacklist && (
            <form onSubmit={handleAddManualBlacklist} className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Directly Blacklist Facebook / Google Maps Link
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={manualBlacklistUrl}
                  onChange={(e) => setManualBlacklistUrl(e.target.value)}
                  placeholder="Paste Facebook or Google Maps URL..."
                  className="sm:col-span-2 rounded-xl border border-white/15 bg-black/60 p-2.5 text-xs text-white placeholder-slate-500 font-mono focus:border-rose-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={manualBlacklistName}
                  onChange={(e) => setManualBlacklistName(e.target.value)}
                  placeholder="Business Name (Optional)"
                  className="rounded-xl border border-white/15 bg-black/60 p-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <input
                  type="text"
                  value={manualBlacklistReason}
                  onChange={(e) => setManualBlacklistReason(e.target.value)}
                  placeholder="Reason for rejection (e.g. Already has $20k website, Not interested...)"
                  className="flex-1 rounded-xl border border-white/15 bg-black/60 p-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2.5 text-xs font-black text-white shadow transition cursor-pointer"
                >
                  Save to Blacklist
                </button>
              </div>
            </form>
          )}

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={rejectedSearch}
                onChange={(e) => setRejectedSearch(e.target.value)}
                placeholder="Search rejected business or URL..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <select
              value={rejectedPlatformFilter}
              onChange={(e) => setRejectedPlatformFilter(e.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-xs font-bold text-slate-300 focus:border-rose-500 focus:outline-none"
            >
              <option value="ALL">All Platforms</option>
              <option value="Facebook">Facebook</option>
              <option value="Google Maps">Google Maps</option>
              <option value="Instagram">Instagram</option>
              <option value="Website">Website</option>
            </select>
          </div>

          {/* List of Rejected Entries */}
          {rejectedList.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-8 text-center text-slate-400">
              <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs">No rejected links recorded yet. Any lead marked dead or rejected will appear here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {rejectedList
                .filter((item) => {
                  const q = rejectedSearch.toLowerCase();
                  const matchesSearch =
                    item.businessName.toLowerCase().includes(q) ||
                    item.originalUrl.toLowerCase().includes(q) ||
                    item.rejectionReason.toLowerCase().includes(q);
                  if (!matchesSearch) return false;
                  if (rejectedPlatformFilter !== 'ALL' && item.platform !== rejectedPlatformFilter) return false;
                  return true;
                })
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-rose-500/20 bg-slate-950/70 p-4 shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/20">
                          {entry.platform === 'Facebook' && <Facebook className="h-3 w-3" />}
                          {entry.platform === 'Google Maps' && <MapPin className="h-3 w-3" />}
                          {entry.platform === 'Instagram' && <Instagram className="h-3 w-3" />}
                          <span>{entry.platform}</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          Rejected: {entry.rejectedAt}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white font-['Outfit']">
                        {entry.businessName}
                      </h4>

                      <div className="mt-2 text-xs text-rose-200">
                        <span className="text-slate-400 font-semibold">Reason:</span> "{entry.rejectionReason}"
                      </div>

                      {entry.notes && (
                        <div className="mt-1 text-[11px] text-slate-400 italic">
                          Notes: {entry.notes}
                        </div>
                      )}

                      {entry.originalUrl && (
                        <div className="mt-2 rounded-lg bg-black/40 px-2.5 py-1 text-[11px] font-mono text-slate-400 truncate flex items-center justify-between gap-1">
                          <span className="truncate">{entry.originalUrl}</span>
                          <a
                            href={entry.originalUrl.startsWith('http') ? entry.originalUrl : `https://${entry.originalUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-rose-400 hover:text-white shrink-0 p-0.5"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleUnrejectEntry(entry)}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
                        title="Allow outreach to this lead again"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Un-reject / Restore</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        /* OUTREACH PIPELINE VIEW */
        <>
          {/* 1. Main Action: Giant "Paste Link & Save" Center */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                    <Link2 className="h-4 w-4" />
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] tracking-tight">
                    PASTE LINK & <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">START OUTREACH</span>
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-300">
                  Paste any Facebook page link or Google Maps link. Auto-detects business & alerts you immediately if you previously rejected or contacted it!
                </p>
              </div>

              {/* Single vs Bulk Toggle */}
              <div className="flex items-center gap-1 rounded-2xl bg-black/40 p-1 border border-white/10 self-start sm:self-auto">
                <button
                  onClick={() => setInputMode('single')}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    inputMode === 'single'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Single Link
                </button>
                <button
                  onClick={() => setInputMode('bulk')}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    inputMode === 'bulk'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Paste Multiple Links
                </button>
              </div>
            </div>

            {/* Input Form */}
            <div className="pt-6">
              {inputMode === 'single' ? (
                <form onSubmit={handleSaveSingleLink} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 relative">
                      <input
                        type="text"
                        value={singleUrl}
                        onChange={(e) => handleSingleUrlChange(e.target.value)}
                        placeholder="Paste Instagram, Facebook, or Website link here (e.g. instagram.com/cafe or facebook.com/bistro...)"
                        className="w-full rounded-2xl border border-white/15 bg-black/50 py-3.5 pl-4 pr-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:bg-black/70 focus:outline-none transition shadow-inner font-mono"
                        autoFocus
                      />
                      {singleUrl && (
                        <button
                          type="button"
                          onClick={() => setSingleUrl('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={singleCustomName}
                        onChange={(e) => setSingleCustomName(e.target.value)}
                        placeholder={isExtractingName ? "Extracting business name..." : "Business Name (Auto-detected)"}
                        className="w-full rounded-2xl border border-white/15 bg-black/50 py-3.5 px-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:bg-black/70 focus:outline-none transition shadow-inner font-semibold"
                      />
                      {isExtractingName && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[11px] text-indigo-400 animate-pulse font-medium">
                          <Sparkles className="h-3.5 w-3.5 animate-spin" />
                          <span>Detecting...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Target Destination Channel / Page Selection */}
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-3 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span>📁 Choose Page to Store This Lead In:</span>
                      </label>
                      <span className="text-[11px] font-semibold text-indigo-300">
                        Storing into: <strong className="text-white uppercase tracking-wide">{targetChannelPage} Leads Page</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetChannelPage('Instagram')}
                        className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                          targetChannelPage === 'Instagram'
                            ? 'border-pink-500 bg-gradient-to-r from-pink-500/25 to-purple-500/25 text-white shadow-md shadow-pink-500/20 ring-1 ring-pink-500/40'
                            : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Instagram className="h-4 w-4 text-pink-400" />
                        <span>📸 Instagram Page</span>
                        {targetChannelPage === 'Instagram' && <Check className="h-3.5 w-3.5 text-pink-400 ml-auto" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setTargetChannelPage('Facebook')}
                        className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                          targetChannelPage === 'Facebook'
                            ? 'border-blue-500 bg-gradient-to-r from-blue-500/25 to-indigo-500/25 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-500/40'
                            : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Facebook className="h-4 w-4 text-blue-400" />
                        <span>📘 Facebook Page</span>
                        {targetChannelPage === 'Facebook' && <Check className="h-3.5 w-3.5 text-blue-400 ml-auto" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setTargetChannelPage('Email')}
                        className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                          targetChannelPage === 'Email'
                            ? 'border-emerald-500 bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/40'
                            : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Mail className="h-4 w-4 text-emerald-400" />
                        <span>✉️ Email Page</span>
                        {targetChannelPage === 'Email' && <Check className="h-3.5 w-3.5 text-emerald-400 ml-auto" />}
                      </button>
                    </div>
                  </div>

                  {/* Scheduled Day Selector */}
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-3 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                        <span>📅 Scheduled Day for Outreach:</span>
                      </label>
                      <span className="text-[11px] font-semibold text-indigo-300">
                        Assigned to: <strong className="text-white uppercase tracking-wide">{scheduledDaySelection}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {WEEKDAYS.map((day) => {
                        const isSelected = scheduledDaySelection === day;
                        const isToday = getTodayWeekday() === day;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setScheduledDaySelection(day)}
                            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                                : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span>{day.slice(0, 3)}</span>
                            {isToday && <span className="text-[9px] text-amber-300 font-normal">Today</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>


                  {/* PROACTIVE REAL-TIME DUPLICATE & REJECTION WARNING BANNER */}
                  {singleLinkValidation && singleLinkValidation.status !== 'empty' && (
                    <div className="pt-1">
                      {singleLinkValidation.isRejected ? (
                        <div className="rounded-2xl border-2 border-rose-500/60 bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 p-4 shadow-xl shadow-rose-950/40 flex items-start gap-3.5 animate-in zoom-in-95 duration-150">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shrink-0 mt-0.5 shadow-lg shadow-rose-600/40">
                            <Ban className="h-5 w-5" />
                          </span>
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                PREVIOUSLY REJECTED LEAD!
                              </span>
                              <span className="text-slate-400 font-mono text-[11px]">
                                Rejected on: {singleLinkValidation.rejectedEntry?.rejectedAt || 'Previously'}
                              </span>
                            </div>

                            <div className="text-white font-bold text-sm mt-1">
                              You already copied and rejected {singleLinkValidation.rejectedEntry?.businessName || singleLinkValidation.detectedName} ({singleLinkValidation.platform})!
                            </div>

                            <div className="text-rose-200 mt-1 font-medium">
                              <strong>Rejection reason:</strong> "{singleLinkValidation.rejectedEntry?.rejectionReason || 'Closed Dead / Not Interested'}"
                            </div>

                            {singleLinkValidation.rejectedEntry?.notes && (
                              <div className="text-slate-300 text-[11px] mt-0.5 italic">
                                Notes: {singleLinkValidation.rejectedEntry.notes}
                              </div>
                            )}

                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSingleUrl('');
                                  showToast('Discarded rejected link. Good catch!');
                                }}
                                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow transition cursor-pointer"
                              >
                                Discard & Skip
                              </button>
                              {singleLinkValidation.rejectedEntry && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    removeRejectedLead(singleLinkValidation.rejectedEntry!.id);
                                    setRejectedList(loadRejectedLeads());
                                    showToast(`🔄 Un-rejected "${singleLinkValidation.rejectedEntry!.businessName}"! You can now add it.`);
                                  }}
                                  className="rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
                                >
                                  Un-reject / Restore
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : singleLinkValidation.isDuplicateActive ? (
                        <div className="rounded-2xl border border-amber-500/50 bg-amber-950/30 p-3.5 flex items-start gap-3 animate-in zoom-in-95 duration-150">
                          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-200">
                            <strong className="text-white block font-bold">Already Active in CRM Pipeline</strong>
                            "{singleLinkValidation.existingLead?.restaurantName}" is already saved in your pipeline under stage: <span className="font-bold underline text-amber-300">{singleLinkValidation.existingLead?.status.toUpperCase()}</span>.
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/25 p-3 flex items-center gap-2 text-xs text-emerald-300 animate-in zoom-in-95 duration-150">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span>
                            <strong>Fresh Lead Detected:</strong> "{singleLinkValidation.detectedName}" ({singleLinkValidation.platform}) has never been contacted or rejected. 100% ready for outreach!
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-blue-400 font-semibold">
                        <Facebook className="h-3.5 w-3.5" /> Facebook Links
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <MapPin className="h-3.5 w-3.5" /> Google Maps Links
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-pink-400 font-semibold">
                        <Instagram className="h-3.5 w-3.5" /> Instagram Links
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 px-7 py-3 text-xs sm:text-sm font-black text-white shadow-xl shadow-indigo-600/30 transition cursor-pointer active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Save Lead & Ready to Send</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Bulk Paste Mode */
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Paste Multiple Facebook or Google Maps Links (One per line)
                      </label>
                      {bulkAnalysis && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 font-bold">
                            {bulkAnalysis.fresh.length} Fresh
                          </span>
                          {bulkAnalysis.rejected.length > 0 && (
                            <span className="rounded-full bg-rose-500/20 text-rose-300 px-2 py-0.5 font-bold flex items-center gap-1">
                              <Ban className="h-3 w-3" />
                              {bulkAnalysis.rejected.length} Rejected
                            </span>
                          )}
                          {bulkAnalysis.duplicate.length > 0 && (
                            <span className="rounded-full bg-amber-500/20 text-amber-300 px-2 py-0.5 font-bold">
                              {bulkAnalysis.duplicate.length} Active
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <textarea
                      rows={4}
                      value={bulkUrls}
                      onChange={(e) => setBulkUrls(e.target.value)}
                      placeholder={`https://www.facebook.com/joespizzatampa\nhttps://instagram.com/cafebaboy\nhttps://www.facebook.com/luigi-trattoria`}
                      className="w-full rounded-2xl border border-white/15 bg-black/50 p-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:bg-black/70 focus:outline-none transition shadow-inner font-mono leading-relaxed"
                    />
                  </div>

                  {/* Bulk Target Channel Page Selector */}
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-3 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-xs font-bold text-slate-200">
                        📁 Choose Page to Store Bulk Leads In:
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {bulkTargetPage === 'auto' ? 'Auto-routes by link type' : `All leads will be saved into ${bulkTargetPage} Leads page`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'auto', label: '⚡ Auto-Detect', desc: 'By URL type' },
                        { id: 'Instagram', label: '📸 Instagram Page', desc: 'All to Instagram' },
                        { id: 'Facebook', label: '📘 Facebook Page', desc: 'All to Facebook' },
                        { id: 'Email', label: '✉️ Email Page', desc: 'All to Email' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setBulkTargetPage(item.id as any)}
                          className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-bold border transition cursor-pointer ${
                            bulkTargetPage === item.id
                              ? 'border-indigo-500 bg-indigo-600/25 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500/40'
                              : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] font-normal text-slate-400 mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>


                  {/* Bulk Filter Warning Bar */}
                  {bulkAnalysis && (bulkAnalysis.rejected.length > 0 || bulkAnalysis.duplicate.length > 0) && (
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="text-rose-200">
                        <strong className="text-white">Deduplication Warning:</strong> Found{' '}
                        {bulkAnalysis.rejected.length > 0 && (
                          <span className="text-rose-300 font-bold underline">
                            {bulkAnalysis.rejected.length} previously rejected lead{bulkAnalysis.rejected.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {bulkAnalysis.rejected.length > 0 && bulkAnalysis.duplicate.length > 0 && ' and '}
                        {bulkAnalysis.duplicate.length > 0 && (
                          <span className="text-amber-300 font-bold underline">
                            {bulkAnalysis.duplicate.length} already active lead{bulkAnalysis.duplicate.length > 1 ? 's' : ''}
                          </span>
                        )}
                        .
                      </div>
                      <button
                        type="button"
                        onClick={handleFilterFreshOnly}
                        className="rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow transition cursor-pointer self-start sm:self-auto shrink-0"
                      >
                        🛡️ Auto-Exclude Rejected & Keep {bulkAnalysis.fresh.length} Fresh
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">
                      Tip: You can also paste <code className="text-slate-300 font-mono">link, Business Name</code> per line.
                    </p>
                    <button
                      type="button"
                      onClick={handleSaveBulkLinks}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 px-7 py-3 text-xs sm:text-sm font-black text-white shadow-xl shadow-indigo-600/30 transition cursor-pointer active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Save All Links ({bulkUrls.split('\n').filter((l) => l.trim()).length} detected)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

      {/* 2. Top Metrics Ticker */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`rounded-2xl border p-4 cursor-pointer transition ${
            statusFilter === 'ALL'
              ? 'border-indigo-500/50 bg-indigo-950/30'
              : 'border-white/5 bg-slate-900/60 hover:border-white/15'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Saved</div>
          <div className="text-2xl font-black text-white mt-1 font-mono">{totalCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'not_sent' ? 'ALL' : 'not_sent')}
          className={`rounded-2xl border p-4 cursor-pointer transition ${
            statusFilter === 'not_sent'
              ? 'border-amber-500/50 bg-amber-950/30 ring-1 ring-amber-500/40'
              : 'border-white/5 bg-slate-900/60 hover:border-white/15'
          }`}
        >
          <div className="text-[11px] font-bold text-amber-400 uppercase flex items-center gap-1">
            <Clock className="h-3 w-3" /> Not Sent
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1 font-mono">{notSentCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'sent' ? 'ALL' : 'sent')}
          className={`rounded-2xl border p-4 cursor-pointer transition ${
            statusFilter === 'sent'
              ? 'border-blue-500/50 bg-blue-950/30'
              : 'border-white/5 bg-slate-900/60 hover:border-white/15'
          }`}
        >
          <div className="text-[11px] font-bold text-blue-400 uppercase flex items-center gap-1">
            <Send className="h-3 w-3" /> Sent Today
          </div>
          <div className="text-2xl font-black text-blue-300 mt-1 font-mono">{sentTodayCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('replied')}
          className={`rounded-2xl border p-4 cursor-pointer transition ${
            statusFilter === 'replied'
              ? 'border-purple-500/50 bg-purple-950/30'
              : 'border-white/5 bg-slate-900/60 hover:border-white/15'
          }`}
        >
          <div className="text-[11px] font-bold text-purple-400 uppercase flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> Replied
          </div>
          <div className="text-2xl font-black text-purple-300 mt-1 font-mono">{repliedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('closed_won')}
          className={`col-span-2 sm:col-span-1 rounded-2xl border p-4 cursor-pointer transition ${
            statusFilter === 'closed_won'
              ? 'border-emerald-500/50 bg-emerald-950/30'
              : 'border-white/5 bg-slate-900/60 hover:border-white/15'
          }`}
        >
          <div className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Won ($299/mo)
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1 font-mono">{wonCount}</div>
        </div>
      </div>

      {/* 3. Search & Filter Bar + Pitch Template Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl backdrop-blur-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search leads by business name or link..."
            className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-sans"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as any)}
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Platforms</option>
            <option value="Facebook">Facebook</option>
            <option value="Google Maps">Google Maps</option>
            <option value="Instagram">Instagram</option>
            <option value="Website">Website</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="not_sent">⏳ Not Sent ({notSentCount})</option>
            <option value="NEED_OUTREACH">Need Outreach ({needOutreachCount})</option>
            <option value="sent">📤 Sent Today</option>
            <option value="replied">💬 Replied</option>
            <option value="closed_won">🏆 Closed Won</option>
          </select>

          {/* Pitch Template Settings Button */}
          <button
            onClick={() => {
              setTempTemplate(pitchTemplate);
              setIsEditingTemplate(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-bold text-slate-300 transition cursor-pointer"
            title="Edit standard outreach message template"
          >
            <Settings className="h-3.5 w-3.5 text-indigo-400" />
            <span>Edit Pitch Copy</span>
          </button>
        </div>
      </div>

      {/* Pitch Template Editor Modal */}
      {isEditingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" /> Default Outreach Pitch Template
              </h3>
              <button
                onClick={() => setIsEditingTemplate(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              This message is copied whenever you click <strong>"Copy Pitch"</strong>. Use <code className="text-indigo-300 font-mono">{'{name}'}</code> to automatically insert each business name.
            </p>

            <textarea
              rows={4}
              value={tempTemplate}
              onChange={(e) => setTempTemplate(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-black/60 p-3.5 text-xs text-white focus:border-indigo-500 focus:outline-none leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setTempTemplate(DEFAULT_PITCH_TEMPLATE)}
                className="text-xs text-slate-400 hover:text-indigo-300 underline cursor-pointer"
              >
                Reset to Default $0 Hook
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingTemplate(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-lg transition"
                >
                  Save Pitch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. The Outreach Queue: Categorized & Ordered Leads List */}
      {(() => {
        const renderLeadCard = (lead: Lead) => {
          const pitch = lead.pitchHook || buildOutreachPitch(lead.restaurantName, pitchTemplate, lead.profileUrl || lead.handle);
          const isCopied = copiedPitchId === lead.id;
          const isSentToday = lead.lastContactDate === todayStr;
          const linkUrl = lead.profileUrl || lead.handle || lead.website || '';

          return (
            <div
              key={lead.id}
              className={`flex flex-col justify-between rounded-3xl border p-5 shadow-xl backdrop-blur-sm transition ${
                isSentToday || lead.status === 'sent'
                  ? 'border-emerald-500/25 bg-emerald-950/15'
                  : 'border-white/10 bg-slate-900/85 hover:border-indigo-500/30'
              }`}
            >
              <div>
                {/* Top Row: Platform Badge + Scheduled Day + Status + Name */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {/* Stored Page Selector */}
                      <select
                        value={lead.platform}
                        onChange={(e) => {
                          const newPlat = e.target.value as Lead['platform'];
                          onUpdateLead({ ...lead, platform: newPlat });
                          showToast(`Lead moved to ${newPlat} Page!`);
                        }}
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold focus:outline-none cursor-pointer transition ${
                          lead.platform === 'Facebook'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : lead.platform === 'Instagram'
                            ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                            : lead.platform === 'Email'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}
                        title="Choose what page this lead is stored in"
                      >
                        <option value="Instagram">📸 Instagram Page</option>
                        <option value="Facebook">📘 Facebook Page</option>
                        <option value="Email">✉️ Email Page</option>
                        <option value="Website">🌐 Website</option>
                        <option value="Google Maps">📍 Google Maps</option>
                      </select>

                      {/* Scheduled Day Selector */}
                      <select
                        value={lead.scheduledDay || 'Monday'}
                        onChange={(e) => {
                          const newDay = e.target.value as Weekday;
                          onUpdateLead({ ...lead, scheduledDay: newDay });
                          showToast(`📅 Rescheduled "${lead.restaurantName}" to ${newDay}!`);
                        }}
                        className="rounded-md border border-indigo-500/30 bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-indigo-300 focus:outline-none cursor-pointer"
                        title="Change scheduled outreach day (Mon - Sun)"
                      >
                        {WEEKDAYS.map((d) => (
                          <option key={d} value={d}>
                            📅 {d.slice(0, 3)}
                          </option>
                        ))}
                      </select>

                      {/* Sent Status Pill */}
                      {lead.status === 'not_sent' ? (
                        <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                          ⏳ Not Sent
                        </span>
                      ) : isSentToday || lead.status === 'sent' ? (
                        <span className="rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                          ✅ Sent
                        </span>
                      ) : (
                        <span className="rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold capitalize">
                          {lead.status.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    {/* Name (with inline rename support) */}
                    {editingLeadId === lead.id ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="text"
                          value={editingNameValue}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          className="rounded-lg border border-indigo-500 bg-black px-2 py-1 text-xs text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(lead)}
                          className="rounded-lg bg-indigo-600 p-1 text-white hover:bg-indigo-500"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingLeadId(null)}
                          className="rounded-lg bg-slate-800 p-1 text-slate-400 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group/name">
                        <h3 className="text-base font-bold text-white font-['Outfit'] truncate">
                          {lead.restaurantName}
                        </h3>
                        <button
                          onClick={() => {
                            setEditingLeadId(lead.id);
                            setEditingNameValue(lead.restaurantName);
                          }}
                          className="opacity-0 group-hover/name:opacity-100 text-slate-500 hover:text-slate-300 p-0.5 transition"
                          title="Rename business"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Status Selector Dropdown */}
                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead, e.target.value as any)}
                    className="rounded-xl border border-white/10 bg-slate-950 px-2.5 py-1 text-[11px] font-bold text-slate-300 focus:border-indigo-500 focus:outline-none shrink-0"
                  >
                    <option value="sent">📤 Sent</option>
                    <option value="not_sent">⏳ Not Sent</option>
                    <option value="replied">💬 Replied</option>
                    <option value="call_booked">📞 Call Booked</option>
                    <option value="closed_won">🏆 Closed Won</option>
                    <option value="closed_dead">❌ Dead</option>
                  </select>
                </div>

                {/* The Clickable Link Bar */}
                {linkUrl && (
                  <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-[11px]">
                    <span className="font-mono text-slate-300 truncate">{linkUrl}</span>
                    <a
                      href={linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold transition"
                      title="Open Link in New Tab"
                    >
                      <span>Open</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Pre-composed Outreach Pitch Box */}
                <div className="rounded-2xl border border-white/10 bg-black/50 p-3 mb-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-indigo-400" />
                      <span>Individual Outreach Pitch</span>
                    </span>
                    <div className="flex items-center gap-1">
                      {editingPitchLeadId !== lead.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPitchLeadId(lead.id);
                            setEditingPitchText(pitch);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-white transition cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/25 px-2 py-0.5 rounded border border-indigo-500/20"
                        >
                          <Edit3 className="h-2.5 w-2.5" />
                          <span>Edit Pitch</span>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {editingPitchLeadId === lead.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={editingPitchText}
                        onChange={(e) => setEditingPitchText(e.target.value)}
                        placeholder="Custom pitch message for this lead..."
                        className="w-full rounded-xl border border-indigo-500/40 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
                      />
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 text-[10px]">
                          {editingPitchText.trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingPitchLeadId(null)}
                            className="rounded-lg border border-white/10 px-2.5 py-1 text-slate-400 hover:text-white transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateLead({
                                ...lead,
                                pitchHook: editingPitchText.trim(),
                                stagedDmMiniPitch: editingPitchText.trim(),
                              });
                              setEditingPitchLeadId(null);
                              showToast(`💾 Saved custom pitch for ${lead.restaurantName}!`);
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
                    <p className="text-xs text-slate-200 font-sans leading-relaxed select-all">
                      {pitch}
                    </p>
                  )}
                </div>

                {/* Mockup Screenshots & Permission Pitch Quick Launcher */}
                <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl border border-purple-500/25 bg-purple-950/20 px-3.5 py-2.5 text-xs shadow-inner">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                      <ImageIcon className="h-4 w-4 shrink-0" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-white text-xs block">
                        Mockup Screenshots ({Number(!!lead.mockupImage1) + Number(!!lead.mockupImage2)}/2)
                      </span>
                      <span className="text-[10px] text-purple-300/80">
                        {lead.mockupImage1 || lead.mockupImage2 ? 'Ready for permission outreach' : 'Attach screenshots to request permission'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {lead.mockupImage1 && (
                      <img
                        src={lead.mockupImage1}
                        alt="Mockup 1"
                        className="w-7 h-7 rounded-lg object-cover border border-purple-400/40 cursor-pointer hover:scale-110 transition shadow-sm"
                        onClick={() => setMockupModalLead(lead)}
                        title="View / Copy Mockup 1"
                      />
                    )}
                    {lead.mockupImage2 && (
                      <img
                        src={lead.mockupImage2}
                        alt="Mockup 2"
                        className="w-7 h-7 rounded-lg object-cover border border-purple-400/40 cursor-pointer hover:scale-110 transition shadow-sm"
                        onClick={() => setMockupModalLead(lead)}
                        title="View / Copy Mockup 2"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setMockupModalLead(lead)}
                      className="rounded-xl border border-purple-500/40 bg-purple-600/30 hover:bg-purple-600/50 px-3 py-1.5 text-xs font-bold text-purple-200 hover:text-white transition cursor-pointer shadow-sm"
                    >
                      {lead.mockupImage1 || lead.mockupImage2 ? 'Manage / Pitch' : '+ Mockup'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 Step Outreach Actions Footer */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="grid grid-cols-2 gap-2">
                  {/* Step 1: Copy Pitch */}
                  <button
                    onClick={() => handleCopyPitch(lead)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                      isCopied
                        ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                        : 'border-white/10 bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isCopied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{isCopied ? 'Pitch Copied!' : '1. Copy Pitch'}</span>
                  </button>

                  {/* Step 2: Open Facebook / Google Maps directly */}
                  <button
                    onClick={() => handleOpenLink(lead)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25 px-3 py-2 text-xs font-bold text-indigo-300 transition cursor-pointer"
                  >
                    <span>2. Open Page</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Step 3: Mark Sent Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSent(lead)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black transition cursor-pointer ${
                      isSentToday || lead.status === 'sent'
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 active:scale-98'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    <span>{isSentToday || lead.status === 'sent' ? 'Sent Today (Click to Mark Not Sent)' : '3. Mark Sent ✅'}</span>
                  </button>

                  {/* Quick Edit Pitch */}
                  <button
                    onClick={() => {
                      setEditingPitchLeadId(lead.id);
                      setEditingPitchText(pitch);
                    }}
                    className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2.5 text-indigo-300 hover:text-white hover:bg-indigo-500/20 transition cursor-pointer"
                    title="Edit individual pitch"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  {/* Reject Lead & Blacklist */}
                  <button
                    onClick={() => setRejectModalLead(lead)}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-300 hover:text-white hover:bg-rose-500/25 transition cursor-pointer"
                    title="Reject lead & save to duplicate prevention blacklist"
                  >
                    <Ban className="h-4 w-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      onDeleteLead(lead.id);
                      showToast(`Deleted ${lead.restaurantName}`);
                    }}
                    className="rounded-xl border border-white/10 bg-slate-800/80 p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Delete lead"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        };

        return (
          <div className="space-y-5">
            {/* Day Filter Bar + View Mode + Sort Order Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/70 p-3.5 rounded-2xl border border-white/10 backdrop-blur-md">
              {/* Day Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Day:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setDayFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    dayFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>All Days ({leads.length})</span>
                </button>
                {WEEKDAYS.map((day) => {
                  const count = dayCounts[day] || 0;
                  const isToday = getTodayWeekday() === day;
                  const isSelected = dayFilter === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setDayFilter(day)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span>{day.slice(0, 3)}</span>
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                        ({count})
                      </span>
                      {isToday && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 ml-0.5" title="Today" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* View Mode & Sort Controls */}
              <div className="flex items-center gap-2 flex-wrap justify-between lg:justify-end">
                {/* View Mode Switcher */}
                <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setViewMode('categorized_status')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      viewMode === 'categorized_status'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Categorize by status (Sent first, Not Sent, etc.)"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>By Status</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('categorized_day')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      viewMode === 'categorized_day'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Categorize by weekday (Mon - Sun)"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>By Day</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('unified_list')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      viewMode === 'unified_list'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Unified list ordered: Sent first, Not Sent second, then Day list"
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>List View</span>
                  </button>
                </div>

                {/* Sort Order Selector */}
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
                  title="Choose lead sorting priority"
                >
                  <option value="latest_paste">✨ Latest Pasted Link (Default - Newest First)</option>
                  <option value="heat_score">🔥 Highest Heat Score (100 → 1)</option>
                  <option value="status_then_day">⚡ Action Priority: Not Sent → Sent → Mon-Sun</option>
                  <option value="pipeline_then_day">📤 Pipeline: Sent → Not Sent → Mon-Sun</option>
                  <option value="day_then_status">📅 Scheduled Weekday: Mon → Sun</option>
                  <option value="name">🔤 Business Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Content based on View Mode */}
            {filteredLeads.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-12 text-center space-y-3">
                <Link2 className="mx-auto h-12 w-12 text-indigo-400 opacity-60" />
                <h3 className="text-base font-bold text-white font-['Outfit']">No leads in this view</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {dayFilter !== 'ALL'
                    ? `No leads scheduled for ${dayFilter}. Select a different day or paste links above!`
                    : 'Paste a Facebook or Google Maps link in the box above to immediately start sending your outreach!'}
                </p>
              </div>
            ) : viewMode === 'categorized_status' ? (
              /* Categorized by Status View (Sent first, Not Sent second, etc.) */
              <div className="space-y-8">
                {/* 1. Sent Leads Section */}
                {(() => {
                  const sentGroup = filteredLeads.filter((l) => l.status === 'sent');
                  if (sentGroup.length === 0 && statusFilter === 'sent') {
                    return (
                      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-center text-xs text-slate-400">
                        No sent leads match the current filters.
                      </div>
                    );
                  }
                  if (sentGroup.length === 0) return null;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <Send className="h-4 w-4" />
                          </div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider font-['Outfit']">
                            1. Sent Outreach Queue
                          </h3>
                          <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-xs font-mono font-bold">
                            {sentGroup.length} leads
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                          Sub-ordered by Day (Mon → Sun)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sentGroup.map(renderLeadCard)}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Not Sent Leads Section */}
                {(() => {
                  const notSentGroup = filteredLeads.filter((l) => l.status === 'not_sent');
                  if (notSentGroup.length === 0 && statusFilter === 'not_sent') {
                    return (
                      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-center text-xs text-slate-400">
                        No not-sent leads match the current filters.
                      </div>
                    );
                  }
                  if (notSentGroup.length === 0) return null;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Clock className="h-4 w-4" />
                          </div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider font-['Outfit']">
                            2. Not Sent / Queued for Outreach
                          </h3>
                          <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-xs font-mono font-bold">
                            {notSentGroup.length} leads
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                          Sub-ordered by Day (Mon → Sun)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {notSentGroup.map(renderLeadCard)}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. In Conversation / Replied Leads Section */}
                {(() => {
                  const activeGroup = filteredLeads.filter((l) =>
                    ['replied', 'seen', 'mockup_sent', 'call_booked', 'proposal_sent'].includes(l.status)
                  );
                  if (activeGroup.length === 0) return null;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <MessageSquare className="h-4 w-4" />
                          </div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider font-['Outfit']">
                            3. In Conversation / Active Responses
                          </h3>
                          <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-xs font-mono font-bold">
                            {activeGroup.length} leads
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                          Sub-ordered by Day (Mon → Sun)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeGroup.map(renderLeadCard)}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Deals Won & Closed Section */}
                {(() => {
                  const closedGroup = filteredLeads.filter((l) =>
                    ['closed_won', 'closed_dead'].includes(l.status)
                  );
                  if (closedGroup.length === 0) return null;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider font-['Outfit']">
                            4. Closed Deals & Archive
                          </h3>
                          <span className="rounded-full bg-white/10 text-slate-300 border border-white/10 px-2 py-0.5 text-xs font-mono font-bold">
                            {closedGroup.length} leads
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {closedGroup.map(renderLeadCard)}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : viewMode === 'categorized_day' ? (
              /* Categorized by Day View (Monday - Sunday blocks, Sent first, then Not Sent) */
              <div className="space-y-8">
                {WEEKDAYS.map((day) => {
                  const dayList = filteredLeads.filter((l) => (l.scheduledDay || 'Monday') === day);
                  if (dayFilter !== 'ALL' && dayFilter !== day) return null;
                  if (dayList.length === 0 && dayFilter !== day) return null;

                  const isToday = getTodayWeekday() === day;
                  const sentInDay = dayList.filter((l) => l.status === 'sent').length;
                  const notSentInDay = dayList.filter((l) => l.status === 'not_sent').length;

                  return (
                    <div key={day} className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider font-['Outfit'] flex items-center gap-2">
                            <span>{day}</span>
                            {isToday && (
                              <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold">
                                Today
                              </span>
                            )}
                          </h3>
                          <span className="rounded-full bg-white/10 text-slate-300 border border-white/10 px-2 py-0.5 text-xs font-mono font-bold">
                            {dayList.length} leads
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="text-emerald-300 font-semibold">{sentInDay} Sent</span>
                          <span>•</span>
                          <span className="text-amber-300 font-semibold">{notSentInDay} Not Sent</span>
                        </div>
                      </div>

                      {dayList.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-xs text-slate-500">
                          No leads scheduled for {day}.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {dayList.map(renderLeadCard)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Unified List View (Strictly sorted: Sent first, Not Sent second, etc., then Day list) */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLeads.map(renderLeadCard)}
              </div>
            )}
          </div>
        );
      })()}
        </>
      )}

      {/* Reject Lead Reason Modal */}
      <RejectLeadModal
        lead={rejectModalLead}
        isOpen={!!rejectModalLead}
        onClose={() => setRejectModalLead(null)}
        onConfirmReject={handleConfirmRejectLead}
      />

      {/* Clipboard Link Inspector Modal */}
      <ClipboardLinkCheckerModal
        isOpen={isClipboardModalOpen}
        onClose={() => {
          setIsClipboardModalOpen(false);
          setClipboardInitialUrl('');
        }}
        leads={leads}
        onAddLead={onAddLead}
        showToast={showToast}
        initialUrl={clipboardInitialUrl}
      />

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
                    Store 2 mockup screenshots, copy them directly, and use the 1-click permission-ask pitch script.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMockupModalLead(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <MockupVault
              lead={mockupModalLead}
              onUpdateLead={(updates) => {
                const updated = { ...mockupModalLead, ...updates };
                setMockupModalLead(updated);
                onUpdateLead(updated);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
