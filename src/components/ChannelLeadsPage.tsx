import React, { useState, useMemo } from 'react';
import {
  Instagram,
  Facebook,
  Mail,
  Link2,
  ExternalLink,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  Trash2,
  Edit3,
  Eye,
  Calendar,
  DollarSign,
  Phone,
  MapPin,
  User,
  Building,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Flame,
  Send,
  Download,
  AlertCircle,
  Save,
  RefreshCw,
  CheckSquare,
  Square,
  Layers,
  CalendarDays,
  List,
  TrendingUp,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { Lead, LeadStatus, Weekday } from '../types';
import { DayBadge } from './DayBadge';
import { LeadMessageVaultModal } from './LeadMessageVaultModal';
import { MockupVault } from './MockupVault';
import { getDefaultStagedMessages } from '../utils/stagedMessageHelper';
import { WEEKDAYS, WEEKDAY_CONFIG, getTodayWeekday, getCurrentWeekKey, normalizeLeadWeek, formatWeekLabel } from '../utils/weeklyScheduler';
import { parseBusinessFromUrl, isGenericPlaceholderName } from '../utils/linkLeadParser';
import {
  sortLeadsDeterministically,
  LeadSortMode,
  STATUS_ACTION_PRIORITY,
  STATUS_PIPELINE_PRIORITY,
  WEEKDAY_PRIORITY_ORDER,
} from '../utils/leadSortHelper';

export { STATUS_ACTION_PRIORITY as STATUS_PRIORITY_ORDER, WEEKDAY_PRIORITY_ORDER };

interface ChannelLeadsPageProps {
  channel: 'Instagram' | 'Facebook' | 'Email';
  leads: Lead[];
  onAddLead: (lead: Omit<Lead, 'id'>) => Lead;
  onUpdateLead: (updatedLead: Lead) => void;
  onDeleteLead: (leadId: number) => void;
  onUpdateStatus: (leadId: number, status: LeadStatus) => void;
  onViewDetails: (lead: Lead) => void;
  onSelectForCopilot: (lead: Lead) => void;
  onRescheduleLead?: (leadId: number, newDay: Weekday, targetWeek?: string) => void;
  onOpenDuplicateCleaner?: () => void;
  initialDayFilter?: string;
}

export const ChannelLeadsPage: React.FC<ChannelLeadsPageProps> = ({
  channel,
  leads,
  onAddLead,
  onUpdateLead,
  onDeleteLead,
  onUpdateStatus,
  onViewDetails,
  onSelectForCopilot,
  onRescheduleLead,
  onOpenDuplicateCleaner,
  initialDayFilter = 'ALL',
}) => {
  // Filter leads by this channel
  const channelLeads = useMemo(() => {
    return leads.filter((l) => {
      if (channel === 'Instagram') return l.platform === 'Instagram';
      if (channel === 'Facebook') return l.platform === 'Facebook';
      if (channel === 'Email') return l.platform === 'Email' || l.platform === 'Website';
      return false;
    });
  }, [leads, channel]);

  // Destination channel page selector state
  const [destinationChannel, setDestinationChannel] = useState<'Instagram' | 'Facebook' | 'Email'>(
    channel === 'Email' ? 'Email' : channel
  );

  // Sync destinationChannel when channel prop changes
  React.useEffect(() => {
    setDestinationChannel(channel === 'Email' ? 'Email' : channel);
  }, [channel]);

  // Form State for Adding a New Lead
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [businessName, setBusinessName] = useState('');

  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [pitchInput, setPitchInput] = useState('');
  const [servicesInput, setServicesInput] = useState('');
  const [estimatedValue, setEstimatedValue] = useState<number>(299);
  const [status, setStatus] = useState<LeadStatus>('not_sent');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [formScheduledDay, setFormScheduledDay] = useState<Weekday>(getTodayWeekday());

  // Quick Pitch Edit Modal
  const [quickEditPitchLead, setQuickEditPitchLead] = useState<Lead | null>(null);
  const [quickPitchText, setQuickPitchText] = useState<string>('');
  const [vaultModalLead, setVaultModalLead] = useState<Lead | null>(null);

  // Batch import toggle
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchLinksInput, setBatchLinksInput] = useState('');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeadStatus>('ALL');
  const [dayFilter, setDayFilter] = useState<string>(initialDayFilter || 'ALL');
  const [confirmingTrashDead, setConfirmingTrashDead] = useState(false);
  const [viewMode, setViewMode] = useState<'categorized_status' | 'categorized_day' | 'table'>('categorized_status');
  const [sortOrder, setSortOrder] = useState<LeadSortMode>('latest_paste');
  const [mockupModalLead, setMockupModalLead] = useState<Lead | null>(null);

  // Sync dayFilter when initialDayFilter prop changes
  React.useEffect(() => {
    if (initialDayFilter) {
      setDayFilter(initialDayFilter);
    }
  }, [initialDayFilter]);

  // Copy feedback
  const [copiedLinkLeadId, setCopiedLinkLeadId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Multi-select for Batch Page Move
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());

  const handleToggleSelectLead = (id: number) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const handleBatchMovePage = (targetChannel: 'Instagram' | 'Facebook' | 'Email') => {
    if (selectedLeadIds.size === 0) return;
    leads.forEach((l) => {
      if (selectedLeadIds.has(l.id)) {
        onUpdateLead({ ...l, platform: targetChannel });
      }
    });
    showFeedback(`Moved ${selectedLeadIds.size} leads to ${targetChannel} Page!`);
    setSelectedLeadIds(new Set());
  };

  // Channel configuration
  const channelConfig = useMemo(() => {
    switch (channel) {
      case 'Instagram':
        return {
          title: 'Instagram Leads',
          tagline: 'Store Instagram profile links and enter business details manually',
          linkPlaceholder: 'https://instagram.com/username or @username',
          linkFieldLabel: 'Instagram Profile Link / @Handle',
          accentColor: 'pink',
          gradientBg: 'from-pink-600 to-purple-600',
          borderColor: 'border-pink-500/30',
          badgeBg: 'bg-pink-500/10 text-pink-300 border-pink-500/30',
          icon: <Instagram className="h-6 w-6 text-pink-400" />,
          formatLink: (input: string) => {
            const clean = input.trim();
            if (!clean) return '';
            if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
            const handle = clean.startsWith('@') ? clean.slice(1) : clean;
            return `https://instagram.com/${handle}`;
          },
        };
      case 'Facebook':
        return {
          title: 'Facebook Leads',
          tagline: 'Store Facebook page links and enter business details manually',
          linkPlaceholder: 'https://facebook.com/pagename or group URL',
          linkFieldLabel: 'Facebook Page / Group URL',
          accentColor: 'blue',
          gradientBg: 'from-blue-600 to-indigo-600',
          borderColor: 'border-blue-500/30',
          badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
          icon: <Facebook className="h-6 w-6 text-blue-400" />,
          formatLink: (input: string) => {
            const clean = input.trim();
            if (!clean) return '';
            if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
            return `https://facebook.com/${clean}`;
          },
        };
      case 'Email':
      default:
        return {
          title: 'Email & Website Leads',
          tagline: 'Store business website links or email addresses and record manual details',
          linkPlaceholder: 'https://business.com or contact page URL',
          linkFieldLabel: 'Website Link / Contact Page URL',
          accentColor: 'emerald',
          gradientBg: 'from-emerald-600 to-teal-600',
          borderColor: 'border-emerald-500/30',
          badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
          icon: <Mail className="h-6 w-6 text-emerald-400" />,
          formatLink: (input: string) => {
            const clean = input.trim();
            if (!clean) return '';
            if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
            if (clean.includes('@') && !clean.includes('/')) return `mailto:${clean}`;
            return `https://${clean}`;
          },
        };
    }
  }, [channel]);

  // Handle Adding Single Lead
  const handleSaveSingleLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setFormError('Please enter a Business Name');
      setTimeout(() => setFormError(null), 3500);
      return;
    }

    const formattedLink = channelConfig.formatLink(linkInput);
    const today = new Date().toISOString().split('T')[0];

    const services = servicesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let cleanBusinessName = businessName.trim();
    if (/^(?:[0-9]{4,}|1000[a-z0-9]+|6155[a-z0-9]+|[0-9\-_]{5,})$/i.test(cleanBusinessName.replace(/[^a-z0-9]/gi, ''))) {
      cleanBusinessName = `${destinationChannel} Prospect`;
    }

    const newLeadData: Omit<Lead, 'id'> = {
      restaurantName: cleanBusinessName,
      contactName: contactName.trim() || undefined,
      platform: destinationChannel,
      handle: linkInput.trim() || formattedLink || '@lead',
      profileUrl: formattedLink || undefined,
      website: destinationChannel === 'Email' && formattedLink.startsWith('http') ? formattedLink : undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      city: city.trim() || 'General',
      address: address.trim() || undefined,
      notes: notes.trim() || `Manual lead entry for ${businessName.trim()}`,
      pitchHook: pitchInput.trim() || undefined,
      stagedDmMiniPitch: pitchInput.trim() || undefined,
      services: services.length > 0 ? services : undefined,
      estimatedDealValue: estimatedValue || 299,
      status: status,
      scheduledDay: formScheduledDay,
      dateFirstContact: today,
      lastContactDate: status === 'not_sent' ? '' : today,
      nextFollowupDate: nextFollowupDate || null,
      followupCount: 0,
      createdAt: new Date().toISOString(),
      extractionSource: `manual_${destinationChannel.toLowerCase()}`,
    };

    onAddLead(newLeadData);
    showFeedback(`Saved ${businessName.trim()} into ${destinationChannel} Leads page!`);


    // Reset form fields
    setLinkInput('');
    setBusinessName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setCity('');
    setAddress('');
    setNotes('');
    setPitchInput('');
    setServicesInput('');
  };

  // Handle Batch Import of Links
  const handleBatchImport = () => {
    const lines = batchLinksInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setFormError('Please paste at least one link or line');
      setTimeout(() => setFormError(null), 3500);
      return;
    }

    let addedCount = 0;
    const today = new Date().toISOString().split('T')[0];

    lines.forEach((line) => {
      // Allow format: Link, Business Name, Contact Name
      const parts = line.split(',').map((p) => p.trim());
      const rawLink = parts[0] || '';
      const customName = parts[1] || '';
      const customContact = parts[2] || '';

      const formattedLink = channelConfig.formatLink(rawLink);

      // Guess a business name if not provided
      let name = customName;
      if (!name) {
        try {
          const urlObj = new URL(formattedLink);
          const pathname = urlObj.pathname.replace(/^\/|\/$/g, '');
          name = pathname ? pathname.split('/').pop()?.replace(/[-_]/g, ' ') || 'New Lead' : urlObj.hostname;
        } catch {
          name = rawLink.replace(/^@/, '') || 'Stored Lead';
        }
      }

      const leadData: Omit<Lead, 'id'> = {
        restaurantName: name,
        contactName: customContact || undefined,
        platform: channel === 'Email' ? 'Email' : channel,
        handle: rawLink || formattedLink,
        profileUrl: formattedLink,
        website: channel === 'Email' && formattedLink.startsWith('http') ? formattedLink : undefined,
        city: 'General',
        notes: `Batch saved link: ${rawLink}`,
        status: 'not_sent',
        dateFirstContact: today,
        lastContactDate: '',
        nextFollowupDate: null,
        followupCount: 0,
        createdAt: new Date().toISOString(),
        estimatedDealValue: 299,
        extractionSource: `batch_${channel.toLowerCase()}`,
      };

      onAddLead(leadData);
      addedCount += 1;
    });

    setBatchLinksInput('');
    setIsBatchMode(false);
    showFeedback(`Successfully stored ${addedCount} links with new lead records!`);
  };

  // Copy Link Helper
  const handleCopyLink = (lead: Lead) => {
    const targetLink = lead.profileUrl || lead.handle || lead.website;
    if (!targetLink) return;
    navigator.clipboard.writeText(targetLink);
    setCopiedLinkLeadId(lead.id);
    setTimeout(() => setCopiedLinkLeadId(null), 2000);
  };

  const todayWeekday = getTodayWeekday();
  const currentWeekKey = getCurrentWeekKey();

  const todayScheduledCount = useMemo(() => {
    return channelLeads.filter(
      (l) => l.scheduledDay === todayWeekday && 
             normalizeLeadWeek(l) === currentWeekKey &&
             !['closed_won', 'closed_dead'].includes(l.status)
    ).length;
  }, [channelLeads, todayWeekday, currentWeekKey]);

  // Filtered & Deterministically Ordered Leads (First: Sent, Not Sent... Second: Day list Mon-Sun)
  const filteredLeads = useMemo(() => {
    const filtered = channelLeads.filter((lead) => {
      const matchesSearch =
        !searchTerm ||
        lead.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.contactName && lead.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.handle && lead.handle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.profileUrl && lead.profileUrl.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.city && lead.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.notes && lead.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;

      let matchesDay = true;
      if (dayFilter === 'today') {
        matchesDay = lead.scheduledDay === todayWeekday && 
                     normalizeLeadWeek(lead) === currentWeekKey && 
                     !['closed_won', 'closed_dead'].includes(lead.status);
      } else if (dayFilter !== 'ALL') {
        matchesDay = lead.scheduledDay === dayFilter;
      }

      return matchesSearch && matchesStatus && matchesDay;
    });

    return sortLeadsDeterministically(filtered, sortOrder);
  }, [channelLeads, searchTerm, statusFilter, dayFilter, todayWeekday, currentWeekKey, sortOrder]);

  // Channel Metrics
  const metrics = useMemo(() => {
    const total = channelLeads.length;
    const today = new Date().toISOString().split('T')[0];
    const dueToday = channelLeads.filter(
      (l) => l.nextFollowupDate && l.nextFollowupDate <= today && !['replied', 'closed_won', 'closed_dead'].includes(l.status)
    ).length;
    const wonCount = channelLeads.filter((l) => l.status === 'closed_won').length;
    const pipelineValue = channelLeads.reduce((acc, l) => acc + (l.estimatedDealValue || 299), 0);
    const wonRevenue = channelLeads
      .filter((l) => l.status === 'closed_won')
      .reduce((acc, l) => acc + (l.estimatedDealValue || 299), 0);
    const deadCount = channelLeads.filter((l) => l.status === 'closed_dead').length;

    return { total, dueToday, wonCount, pipelineValue, wonRevenue, deadCount, todayScheduledCount };
  }, [channelLeads, todayScheduledCount]);

  return (
    <div className="space-y-6">
      {formError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2.5 text-xs font-bold text-rose-300 animate-pulse flex items-center justify-between shadow-lg">
          <span>⚠️ {formError}</span>
          <button onClick={() => setFormError(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-2xl border border-emerald-500/40 bg-emerald-950/95 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-top-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Hero Header for this Channel */}
      <div className={`relative overflow-hidden rounded-3xl border ${channelConfig.borderColor} bg-slate-900/80 p-5 sm:p-7 backdrop-blur-xl shadow-2xl`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr ${channelConfig.gradientBg} shadow-lg`}>
              {channelConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-['Outfit']">
                  {channelConfig.title}
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${channelConfig.badgeBg}`}>
                  {channelLeads.length} STORED
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {channelConfig.tagline}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
              <div className="text-[11px] font-semibold text-slate-400">Total Leads</div>
              <div className="text-sm font-black text-white">{metrics.total}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
              <div className="text-[11px] font-semibold text-slate-400">Due Follow-up</div>
              <div className={`text-sm font-black ${metrics.dueToday > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {metrics.dueToday}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center">
              <div className="text-[11px] font-semibold text-emerald-400">Pipeline Value</div>
              <div className="text-sm font-black text-emerald-300">${metrics.pipelineValue.toLocaleString()}</div>
            </div>

            {onOpenDuplicateCleaner && (
              <button
                type="button"
                onClick={onOpenDuplicateCleaner}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-bold text-rose-300 hover:text-white transition shadow-sm cursor-pointer ml-1"
                title="Search all stored leads and remove duplicated links"
              >
                <Link2 className="h-4 w-4 text-rose-400" />
                <span>Check Duplicates</span>
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Add Lead Section: Link & Manual Information Entry */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 sm:p-7 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              {isBatchMode ? `Batch Store ${channel} Links` : `Store New ${channel} Lead & Manual Details`}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBatchMode(!isBatchMode)}
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition cursor-pointer"
            >
              {isBatchMode ? 'Switch to Single Entry' : 'Batch Paste Links'}
            </button>
            <button
              type="button"
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              {isFormOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isFormOpen && (
          <>
            {isBatchMode ? (
              /* Batch Links Input Mode */
              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-400">
                  Paste multiple {channel} links below (one per line). Optional format: <code className="text-indigo-300 font-mono text-[11px]">https://link, Business Name, Owner Name</code>
                </p>
                <textarea
                  rows={6}
                  value={batchLinksInput}
                  onChange={(e) => setBatchLinksInput(e.target.value)}
                  placeholder={`https://instagram.com/pasta_house, Pasta House, Luigi\nhttps://instagram.com/sushi_lounge\n@bar_velvet`}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBatchMode(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchImport}
                    className={`rounded-xl bg-gradient-to-r ${channelConfig.gradientBg} px-5 py-2 text-xs font-bold text-white shadow-lg transition cursor-pointer`}
                  >
                    Store All Links
                  </button>
                </div>
              </div>
            ) : (
              /* Detailed Manual Form */
              <form onSubmit={handleSaveSingleLead} className="space-y-4 pt-1">
                {/* 1. Link Input (Prominently Highlighted) */}
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Link2 className="h-4 w-4 text-indigo-400" />
                    {channelConfig.linkFieldLabel} <span className="text-slate-400 font-normal lowercase">(stored for 1-click access)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={linkInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLinkInput(val);
                        if (!businessName.trim() && val.trim()) {
                          const parsed = parseBusinessFromUrl(val);
                          if (parsed.name && !isGenericPlaceholderName(parsed.name)) {
                            setBusinessName(parsed.name);
                          }
                        }
                      }}
                      placeholder={channelConfig.linkPlaceholder}
                      className="w-full rounded-xl border border-white/15 bg-slate-950/90 py-2.5 px-3.5 text-sm text-white placeholder-slate-500 font-mono focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                {/* Target Destination Channel / Page Selection */}
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>📁 Store Lead in Page:</span>
                    </label>
                    <span className="text-[11px] font-semibold text-indigo-300">
                      Destination: <strong className="text-white uppercase tracking-wide">{destinationChannel} Leads Page</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDestinationChannel('Instagram')}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                        destinationChannel === 'Instagram'
                          ? 'border-pink-500 bg-pink-500/20 text-white shadow-md shadow-pink-500/20 ring-1 ring-pink-500/40'
                          : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Instagram className="h-4 w-4 text-pink-400" />
                      <span>Instagram Page</span>
                      {destinationChannel === 'Instagram' && <Check className="h-3.5 w-3.5 text-pink-400 ml-auto" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDestinationChannel('Facebook')}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                        destinationChannel === 'Facebook'
                          ? 'border-blue-500 bg-blue-500/20 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-500/40'
                          : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Facebook className="h-4 w-4 text-blue-400" />
                      <span>Facebook Page</span>
                      {destinationChannel === 'Facebook' && <Check className="h-3.5 w-3.5 text-blue-400 ml-auto" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDestinationChannel('Email')}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                        destinationChannel === 'Email'
                          ? 'border-emerald-500 bg-emerald-500/20 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/40'
                          : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Mail className="h-4 w-4 text-emerald-400" />
                      <span>Email Page</span>
                      {destinationChannel === 'Email' && <Check className="h-3.5 w-3.5 text-emerald-400 ml-auto" />}
                    </button>
                  </div>
                </div>


                {/* 2. Business & Contact Information Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Business / Restaurant Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Osteria Morini"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Contact / Decision Maker
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Marco Rossi (Owner)"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      City / Area
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. New York, NY"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Direct Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. (212) 555-0192"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Direct Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. marco@business.com"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Estimated Deal Value ($)
                    </label>
                    <input
                      type="number"
                      value={estimatedValue}
                      onChange={(e) => setEstimatedValue(Number(e.target.value))}
                      placeholder="299"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 3. Address & Services */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Street Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 218 Lafayette Street"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Services / Highlights (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={servicesInput}
                      onChange={(e) => setServicesInput(e.target.value)}
                      placeholder="e.g. Dine-In, Private Dining, Online Ordering"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 4. Individual Outreach Pitch */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-indigo-300">
                      Individual Outreach Pitch / Message What You Message Them
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const name = contactName.trim() || businessName.trim() || 'there';
                        const slug = (businessName || 'spot').toLowerCase().replace(/[^a-z0-9]/g, '');
                        setPitchInput(`Hey ${name}! Loved the vibe at ${businessName || 'your business'}. Put together a 0.3s direct ordering concept for you: https://demo.closer.app/${slug}. Waiving our $299 fee completely to $0 for 3 local spots in exchange for a short review. Want me to send the preview?`);
                      }}
                      className="text-[10px] text-indigo-400 hover:text-white font-bold transition cursor-pointer"
                    >
                      + Auto-Fill Pitch
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={pitchInput}
                    onChange={(e) => setPitchInput(e.target.value)}
                    placeholder="Enter the tailored pitch message to send this lead..."
                    className="w-full rounded-xl border border-indigo-500/30 bg-slate-950/70 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
                  />
                </div>

                {/* 5. Notes & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Manual Details / Notes / History
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any specific context, conversation details, what they offer, objections or next steps..."
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                        Current Stage
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as LeadStatus)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                      >
                        <option value="not_sent">Not Sent (Queued)</option>
                        <option value="sent">Initial Outreach Sent</option>
                        <option value="seen">Seen / Viewed</option>
                        <option value="replied">Replied / In Conversation</option>
                        <option value="mockup_sent">Mockup Sent</option>
                        <option value="call_booked">Call Booked</option>
                        <option value="proposal_sent">Proposal Sent</option>
                        <option value="closed_won">Closed Won ($)</option>
                        <option value="closed_dead">Closed Dead / Not Interested</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                        Next Follow-up Date
                      </label>
                      <input
                        type="date"
                        value={nextFollowupDate}
                        onChange={(e) => setNextFollowupDate(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                        Scheduled Outreach Day
                      </label>
                      <select
                        value={formScheduledDay}
                        onChange={(e) => setFormScheduledDay(e.target.value as Weekday)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                      >
                        {WEEKDAYS.map((d) => (
                          <option key={d} value={d}>
                            {d} {d === todayWeekday ? '(Today)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    id={`btn-save-${channel.toLowerCase()}-lead`}
                    className={`flex items-center gap-2 rounded-2xl bg-gradient-to-r ${channelConfig.gradientBg} px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition active:scale-95 cursor-pointer`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Store {channel} Lead with Link</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Stored Leads Table & Search Controls */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 sm:p-7 backdrop-blur-xl shadow-xl space-y-4">
        {/* Schedule & Weekday Filter Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span>Schedule Filter:</span>
            </span>

            {/* Filter 1: Today's Schedule */}
            <button
              type="button"
              onClick={() => setDayFilter('today')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-sm ${
                dayFilter === 'today'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-amber-500/30 ring-2 ring-amber-400'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
              }`}
            >
              <Flame className="h-3.5 w-3.5 fill-current" />
              <span>Today's Schedule: {todayWeekday} ({todayScheduledCount})</span>
            </button>

            {/* Filter 2: All Stored Leads */}
            <button
              type="button"
              onClick={() => setDayFilter('ALL')}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                dayFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              All Stored {channel} Leads ({channelLeads.length})
            </button>

            {/* Weekdays quick pills */}
            <div className="hidden lg:flex items-center gap-1 ml-1 border-l border-white/10 pl-2">
              {WEEKDAYS.map((wDay) => {
                const count = channelLeads.filter((l) => l.scheduledDay === wDay).length;
                return (
                  <button
                    key={wDay}
                    type="button"
                    onClick={() => setDayFilter(wDay)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                      dayFilter === wDay
                        ? 'bg-white/20 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{wDay.slice(0, 3)}</span>
                    <span className="text-[10px] text-slate-500 font-mono ml-0.5">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {dayFilter === 'today' && (
            <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              <span>📅 Showing {filteredLeads.length} of {channelLeads.length} {channel} leads scheduled for today ({todayWeekday})</span>
            </div>
          )}
        </div>
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 my-auto h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${channel} leads by name, link, city...`}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Status Filter Tabs & Trash Dead Action */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {(['ALL', 'not_sent', 'sent', 'replied', 'call_booked', 'proposal_sent', 'closed_won', 'closed_dead'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? st === 'closed_dead'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'border border-white/5 bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {st === 'ALL'
                  ? 'All Leads'
                  : st === 'not_sent'
                  ? '⏳ Not Sent'
                  : st === 'closed_dead'
                  ? `💀 Dead (${metrics.deadCount})`
                  : st.replace('_', ' ').toUpperCase()}
              </button>
            ))}

            {metrics.deadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (!confirmingTrashDead) {
                    setConfirmingTrashDead(true);
                    setTimeout(() => setConfirmingTrashDead(false), 3500);
                    return;
                  }
                  setConfirmingTrashDead(false);
                  channelLeads
                    .filter((l) => l.status === 'closed_dead')
                    .forEach((l) => onDeleteLead(l.id));
                }}
                className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition shadow-sm whitespace-nowrap cursor-pointer ${
                  confirmingTrashDead
                    ? 'border-rose-500 bg-rose-600 text-white animate-pulse'
                    : 'border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white'
                }`}
                title={confirmingTrashDead ? "Click again to confirm permanent trash" : `Trash all ${metrics.deadCount} dead ${channel} leads`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{confirmingTrashDead ? `Click again to trash (${metrics.deadCount})` : `Trash Dead (${metrics.deadCount})`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Leads Count, View Mode Switcher, and Sort Order Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 pb-1 border-t border-white/5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-white font-['Outfit']">
              Showing {filteredLeads.length} {channel} Lead{filteredLeads.length === 1 ? '' : 's'}
            </span>
            <span className="rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-mono font-bold">
              {filteredLeads.filter((l) => l.status === 'sent').length} Sent
            </span>
            <span className="rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[11px] font-mono font-bold">
              {filteredLeads.filter((l) => l.status === 'not_sent').length} Not Sent
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Unified table view"
              >
                <List className="h-3.5 w-3.5" />
                <span>Table View</span>
              </button>
            </div>

            {/* Sort Order Selector */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as LeadSortMode)}
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
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

        {/* Leads Count & Stored Leads List */}
        {filteredLeads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
              {channelConfig.icon}
            </div>
            <h4 className="text-sm font-bold text-slate-300">
              No {channel} leads found {searchTerm ? `matching "${searchTerm}"` : ''}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Use the form above to store your first {channel} lead link and manual business details.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Batch Page Mover Bar */}
            {selectedLeadIds.size > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-indigo-950/80 border border-indigo-500/40 rounded-2xl p-3 px-4 backdrop-blur-xl animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-xs font-black text-white">
                    {selectedLeadIds.size}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {selectedLeadIds.size} lead{selectedLeadIds.size === 1 ? '' : 's'} selected
                  </span>
                  <span className="text-slate-400 text-xs hidden sm:inline">• Move to page:</span>
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

            {/* Helper to render lead table */}
            {(() => {
              const renderTable = (leadSubset: Lead[]) => (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px] bg-slate-950/60">
                        <th className="py-3 px-3 w-8 text-center">
                          <button
                            type="button"
                            onClick={() => handleSelectAllVisible(leadSubset)}
                            title="Select / Deselect all visible leads in this group"
                            className="cursor-pointer text-slate-400 hover:text-white flex items-center justify-center mx-auto"
                          >
                            {selectedLeadIds.size > 0 && leadSubset.length > 0 && leadSubset.every((l) => selectedLeadIds.has(l.id)) ? (
                              <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                            ) : (
                              <Square className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-3">Business & Owner</th>
                        <th className="py-3 px-3">Stored Page</th>
                        <th className="py-3 px-3">Stored Link</th>
                        <th className="py-3 px-3">Contact Details</th>
                        <th className="py-3 px-3">Stage / Status</th>
                        <th className="py-3 px-3">Schedule / Batch</th>
                        <th className="py-3 px-3">Manual Notes</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {leadSubset.map((lead) => {
                        const leadLink = lead.profileUrl || lead.handle || lead.website || '';
                        const isCopied = copiedLinkLeadId === lead.id;
                        const isChecked = selectedLeadIds.has(lead.id);

                        return (
                          <tr key={lead.id} className={`hover:bg-white/[0.02] transition ${isChecked ? 'bg-indigo-950/20' : ''}`}>
                            {/* Checkbox */}
                            <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleToggleSelectLead(lead.id)}
                                className="cursor-pointer text-slate-400 hover:text-white flex items-center justify-center mx-auto"
                              >
                                {isChecked ? (
                                  <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                                ) : (
                                  <Square className="h-3.5 w-3.5 text-slate-600 hover:text-slate-400" />
                                )}
                              </button>
                            </td>

                            {/* Business & Owner */}
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                <span>{lead.restaurantName}</span>
                              </div>
                              <div className="text-slate-400 flex items-center gap-2 mt-0.5">
                                {lead.contactName && (
                                  <span className="flex items-center gap-1 text-[11px] text-slate-300">
                                    <User className="h-3 w-3 text-indigo-400" />
                                    {lead.contactName}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                  <MapPin className="h-3 w-3 text-slate-500" />
                                  {lead.city}
                                </span>
                              </div>
                            </td>

                            {/* Stored Page Selector */}
                            <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={lead.platform === 'Facebook' ? 'Facebook' : lead.platform === 'Email' || lead.platform === 'Website' ? 'Email' : 'Instagram'}
                                onChange={(e) => {
                                  const newPage = e.target.value as 'Instagram' | 'Facebook' | 'Email';
                                  onUpdateLead({ ...lead, platform: newPage });
                                  showFeedback(`Moved "${lead.restaurantName}" to ${newPage} Page!`);
                                }}
                                className={`rounded-lg border px-2 py-1 text-[11px] font-bold focus:outline-none cursor-pointer transition ${
                                  lead.platform === 'Instagram'
                                    ? 'border-pink-500/40 bg-pink-950/40 text-pink-300 hover:border-pink-400'
                                    : lead.platform === 'Facebook'
                                    ? 'border-blue-500/40 bg-blue-950/40 text-blue-300 hover:border-blue-400'
                                    : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:border-emerald-400'
                                }`}
                                title="Move this lead to another page"
                              >
                                <option value="Instagram">📸 Instagram</option>
                                <option value="Facebook">📘 Facebook</option>
                                <option value="Email">✉️ Email</option>
                              </select>
                            </td>

                            {/* Stored Link */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-1.5">
                                {leadLink ? (
                                  <>
                                    <a
                                      href={leadLink.startsWith('http') || leadLink.startsWith('mailto:') ? leadLink : `https://${leadLink}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 text-[11px] font-mono text-indigo-300 hover:text-indigo-200 transition max-w-[200px] truncate"
                                      title={`Open link: ${leadLink}`}
                                    >
                                      <ExternalLink className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                                      <span className="truncate">{leadLink.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyLink(lead)}
                                      title="Copy stored link"
                                      className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 p-1 text-slate-400 hover:text-white transition cursor-pointer"
                                    >
                                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-slate-500 text-[11px] italic">No link saved</span>
                                )}
                              </div>
                            </td>

                            {/* Contact Details */}
                            <td className="py-3.5 px-3">
                              <div className="space-y-0.5">
                                {lead.phone && (
                                  <div className="text-[11px] text-slate-300 flex items-center gap-1">
                                    <Phone className="h-3 w-3 text-emerald-400" />
                                    <a href={`tel:${lead.phone}`} className="hover:underline text-slate-300">
                                      {lead.phone}
                                    </a>
                                  </div>
                                )}
                                {lead.email && (
                                  <div className="text-[11px] text-slate-300 flex items-center gap-1">
                                    <Mail className="h-3 w-3 text-blue-400" />
                                    <a href={`mailto:${lead.email}`} className="hover:underline text-slate-300">
                                      {lead.email}
                                    </a>
                                  </div>
                                )}
                                {!lead.phone && !lead.email && (
                                  <span className="text-slate-500 text-[11px]">No phone/email</span>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-3">
                              <select
                                value={lead.status}
                                onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
                                className={`rounded-lg border px-2 py-1 text-[11px] font-bold focus:outline-none cursor-pointer ${
                                  lead.status === 'sent'
                                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                                    : lead.status === 'not_sent'
                                    ? 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                                    : lead.status === 'closed_won'
                                    ? 'border-emerald-500/50 bg-emerald-600 text-white'
                                    : lead.status === 'closed_dead'
                                    ? 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                                    : 'border-white/10 bg-slate-950 text-white'
                                }`}
                              >
                                <option value="not_sent">⏳ NOT SENT</option>
                                <option value="sent">📤 SENT</option>
                                <option value="seen">👀 SEEN</option>
                                <option value="replied">💬 REPLIED</option>
                                <option value="mockup_sent">🚀 MOCKUP SENT</option>
                                <option value="call_booked">📞 CALL BOOKED</option>
                                <option value="proposal_sent">📄 PROPOSAL SENT</option>
                                <option value="closed_won">🏆 CLOSED WON</option>
                                <option value="closed_dead">💀 DEAD</option>
                              </select>
                            </td>

                            {/* Schedule / Day Badge */}
                            <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                              <DayBadge
                                lead={lead}
                                allLeads={leads}
                                onRescheduleLead={onRescheduleLead}
                                size="sm"
                              />
                            </td>

                            {/* Manual Notes */}
                            <td className="py-3.5 px-3 max-w-[220px]">
                              <p className="text-[11px] text-slate-300 line-clamp-2" title={lead.notes}>
                                {lead.notes || 'No manual notes recorded.'}
                              </p>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setMockupModalLead(lead)}
                                  title="Mockup Screenshots (2 slots) & Permission Pitch"
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
                                  type="button"
                                  onClick={() => {
                                    const defs = getDefaultStagedMessages(lead);
                                    setQuickEditPitchLead(lead);
                                    setQuickPitchText(lead.pitchHook || lead.stagedDmMiniPitch || defs.stagedDmMiniPitch);
                                  }}
                                  title="Edit individual pitch for this lead"
                                  className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 text-[11px] font-bold text-indigo-300 transition cursor-pointer"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  <span>Edit Pitch</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onViewDetails(lead)}
                                  title="View & Edit Lead Details"
                                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white transition cursor-pointer"
                                >
                                  <Eye className="h-3 w-3 text-indigo-400" />
                                  <span>Details</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onSelectForCopilot(lead)}
                                  title="Open in Follow-Up Copilot"
                                  className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300 transition cursor-pointer"
                                >
                                  <Send className="h-3 w-3 text-emerald-400" />
                                  <span>Pitch</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteLead(lead.id);
                                  }}
                                  title={lead.status === 'closed_dead' ? "Trash Dead Lead" : "Delete Lead"}
                                  className={`rounded-lg transition cursor-pointer flex items-center gap-1 px-2 py-1 text-[11px] font-bold shadow-sm ${
                                    lead.status === 'closed_dead'
                                      ? 'border border-rose-500/40 bg-rose-500/20 text-rose-200 hover:bg-rose-600 hover:text-white'
                                      : 'border border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/25 hover:text-white'
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
                    </tbody>
                  </table>
                </div>
              );

              // 1. Categorized by Status: Action-needed first (Not Sent, Active Engagement, Sent, Closed)
              if (viewMode === 'categorized_status') {
                const notSentGroup = filteredLeads.filter((l) => l.status === 'not_sent');
                const activeGroup = filteredLeads.filter((l) =>
                  ['replied', 'seen', 'mockup_sent', 'call_booked', 'proposal_sent'].includes(l.status)
                );
                const sentGroup = filteredLeads.filter((l) => l.status === 'sent');
                const closedGroup = filteredLeads.filter((l) =>
                  ['closed_won', 'closed_dead'].includes(l.status)
                );

                return (
                  <div className="space-y-6">
                    {/* 1. Not Sent Leads Section (Highest Outreach Priority) */}
                    {notSentGroup.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Clock className="h-3.5 w-3.5" />
                            </div>
                            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-['Outfit']">
                              1. Not Sent / Queued for Outreach
                            </h3>
                            <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[11px] font-mono font-bold">
                              {notSentGroup.length} lead{notSentGroup.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                            Sub-ordered by Day (Mon → Sun)
                          </span>
                        </div>
                        {renderTable(notSentGroup)}
                      </div>
                    )}

                    {/* 2. In Conversation / Replies Section */}
                    {activeGroup.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <MessageSquare className="h-3.5 w-3.5" />
                            </div>
                            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-['Outfit']">
                              2. In Conversation / Active Responses
                            </h3>
                            <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-[11px] font-mono font-bold">
                              {activeGroup.length} lead{activeGroup.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                            Sub-ordered by Day (Mon → Sun)
                          </span>
                        </div>
                        {renderTable(activeGroup)}
                      </div>
                    )}

                    {/* 3. Sent Leads Section */}
                    {sentGroup.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <Send className="h-3.5 w-3.5" />
                            </div>
                            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-['Outfit']">
                              3. Sent Outreach Queue
                            </h3>
                            <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-mono font-bold">
                              {sentGroup.length} lead{sentGroup.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                            Sub-ordered by Day (Mon → Sun)
                          </span>
                        </div>
                        {renderTable(sentGroup)}
                      </div>
                    )}

                    {/* 4. Closed Deals Section */}
                    {closedGroup.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <TrendingUp className="h-3.5 w-3.5" />
                            </div>
                            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-['Outfit']">
                              4. Closed Deals & Archive
                            </h3>
                            <span className="rounded-full bg-white/10 text-slate-300 border border-white/10 px-2 py-0.5 text-[11px] font-mono font-bold">
                              {closedGroup.length} lead{closedGroup.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                        {renderTable(closedGroup)}
                      </div>
                    )}
                  </div>
                );
              }

              // 2. Categorized by Day (Monday - Sunday blocks, Sent first, then Not Sent)
              if (viewMode === 'categorized_day') {
                return (
                  <div className="space-y-6">
                    {WEEKDAYS.map((day) => {
                      const dayList = filteredLeads.filter((l) => (l.scheduledDay || 'Monday') === day);
                      if (dayFilter !== 'ALL' && dayFilter !== day) return null;
                      if (dayList.length === 0 && dayFilter !== day) return null;

                      const isToday = getTodayWeekday() === day;
                      const sentInDay = dayList.filter((l) => l.status === 'sent').length;
                      const notSentInDay = dayList.filter((l) => l.status === 'not_sent').length;

                      return (
                        <div key={day} className="space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                <Calendar className="h-3.5 w-3.5" />
                              </div>
                              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-['Outfit'] flex items-center gap-2">
                                <span>{day}</span>
                                {isToday && (
                                  <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold">
                                    Today
                                  </span>
                                )}
                              </h3>
                              <span className="rounded-full bg-white/10 text-slate-300 border border-white/10 px-2 py-0.5 text-[11px] font-mono font-bold">
                                {dayList.length} lead{dayList.length === 1 ? '' : 's'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span className="text-emerald-300 font-semibold">{sentInDay} Sent</span>
                              <span>•</span>
                              <span className="text-amber-300 font-semibold">{notSentInDay} Not Sent</span>
                              <span className="text-slate-500 hidden sm:inline">(Sent first, then Not Sent)</span>
                            </div>
                          </div>

                          {dayList.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-xs text-slate-500">
                              No leads scheduled for {day}.
                            </div>
                          ) : (
                            renderTable(dayList)
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // 3. Table View (Strictly sorted: First Sent, then Not Sent, etc., and Second by Day list)
              return renderTable(filteredLeads);
            })()}
          </div>
        )}
      </div>

      {/* Quick Edit Pitch Modal */}
      {quickEditPitchLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-indigo-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">
                  Edit Pitch for {quickEditPitchLead.restaurantName}
                </h3>
                <p className="text-xs text-slate-400">
                  Customize the exact message you will send this specific lead
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickEditPitchLead(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-indigo-300">Message Text</span>
                <button
                  type="button"
                  onClick={() => {
                    const defs = getDefaultStagedMessages(quickEditPitchLead);
                    setQuickPitchText(defs.stagedDmMiniPitch);
                  }}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Reset to Standard Copy</span>
                </button>
              </div>
              <textarea
                rows={4}
                value={quickPitchText}
                onChange={(e) => setQuickPitchText(e.target.value)}
                placeholder="Type the customized pitch message..."
                className="w-full rounded-xl border border-indigo-500/40 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{quickPitchText.trim().split(/\s+/).filter(Boolean).length} words • {quickPitchText.length} characters</span>
                <button
                  type="button"
                  onClick={() => {
                    setVaultModalLead(quickEditPitchLead);
                    setQuickEditPitchLead(null);
                  }}
                  className="text-indigo-400 hover:underline cursor-pointer"
                >
                  Open Full 4-Step Vault
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setQuickEditPitchLead(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateLead({
                    ...quickEditPitchLead,
                    pitchHook: quickPitchText.trim(),
                    stagedDmMiniPitch: quickPitchText.trim(),
                  });
                  showFeedback(`Saved customized pitch for ${quickEditPitchLead.restaurantName}!`);
                  setQuickEditPitchLead(null);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Pitch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4-Step Sequence Vault Modal */}
      <LeadMessageVaultModal
        lead={vaultModalLead}
        isOpen={!!vaultModalLead}
        onClose={() => setVaultModalLead(null)}
        onSaveLead={(updated) => onUpdateLead(updated)}
        showToast={showFeedback}
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
                onUpdateLead(updated);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
