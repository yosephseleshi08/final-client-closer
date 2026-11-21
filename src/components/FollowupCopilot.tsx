import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Sparkles, 
  Send, 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  Calendar, 
  FileText, 
  Layers, 
  RefreshCw, 
  Instagram, 
  Mail, 
  Phone,
  AlertCircle,
  Eye,
  Trophy,
  ArrowRight,
  Clock,
  History,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Lead, PitchType, FollowupLog, Weekday } from '../types';
import { DayBadge } from './DayBadge';
import { getTodayWeekday, WEEKDAY_CONFIG } from '../utils/weeklyScheduler';

interface FollowupCopilotProps {
  leads: Lead[];
  selectedLead: Lead | null;
  followupLogs?: FollowupLog[];
  onSelectLead: (lead: Lead) => void;
  onLogFollowupSent: (leadId: number) => void;
  onMarkReplied: (leadId: number) => void;
  onMarkWon: (leadId: number) => void;
  onMarkDead?: (leadId: number) => void;
  onDeleteLead?: (leadId: number) => void;
  onViewDetails?: (lead: Lead) => void;
  onOpenMockup?: (lead: Lead) => void;
  onOpenProposal?: (lead: Lead) => void;
  onRescheduleLead?: (leadId: number, newDay: Weekday) => void;
}

export const FollowupCopilot: React.FC<FollowupCopilotProps> = ({
  leads,
  selectedLead,
  followupLogs = [],
  onSelectLead,
  onLogFollowupSent,
  onMarkReplied,
  onMarkWon,
  onMarkDead,
  onDeleteLead,
  onViewDetails,
  onOpenMockup,
  onOpenProposal,
  onRescheduleLead,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const todayWeekday = getTodayWeekday();

  // Filter due leads
  const dueLeads = leads.filter(
    (l) =>
      !['replied', 'closed_won', 'closed_dead'].includes(l.status) &&
      l.nextFollowupDate &&
      l.nextFollowupDate <= today
  );

  const activeLeads = leads.filter((l) => !['closed_won', 'closed_dead'].includes(l.status));

  // Today's scheduled batch of leads (e.g. 10 leads assigned to current weekday)
  const todayBatchLeads = leads.filter(
    (l) => l.scheduledDay === todayWeekday && !['closed_won', 'closed_dead'].includes(l.status)
  );

  const [filterMode, setFilterMode] = useState<'today_batch' | 'due' | 'all'>('today_batch');
  const [pitchType, setPitchType] = useState<PitchType>('case_study_0_down');
  const [draftMessage, setDraftMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string>('');

  const displayLeads =
    filterMode === 'today_batch'
      ? todayBatchLeads
      : filterMode === 'due'
      ? dueLeads
      : activeLeads;

  // Auto-select first due lead if none selected
  useEffect(() => {
    if (!selectedLead && displayLeads.length > 0) {
      onSelectLead(displayLeads[0]);
    }
  }, [displayLeads, selectedLead, onSelectLead]);

  // Instant battle-tested template generator for 0ms lag and zero quota waste
  const getInstantPresetPitch = (lead: Lead, type: PitchType): string => {
    const owner = lead.contactName || 'there';
    const name = lead.restaurantName;
    const link = lead.mockupLink || `https://demo.closer.app/${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    switch (type) {
      case 'case_study_0_down':
        return `Hey ${owner}! Put together a 0.3s direct ordering concept for ${name}: ${link}. We normally charge $299 + $99/mo, but waiving the $299 fee to $0 for 3 local spots in exchange for a short review. Want me to turn it live?`;
      case 'fast_close_offer':
        return `Hey ${owner}! We built a custom mobile ordering site for ${name}: ${link}. It's a simple $299 setup + $99/mo to keep 100% of order profits instead of DoorDash's 30% cut. Can we launch it by Thursday?`;
      case '35_word_hook':
        return `Hey ${owner}! Love the vibe at ${name}. Noticed mobile visitors have trouble clicking your menu link, so I designed an interactive concept for you: ${link}. Want me to send the 30s preview?`;
      case 'mockup_drop':
        return `Hey ${owner}! Put together a modern redesign for ${name} to turn more Instagram profile visits into reserved tables. Live interactive mockup: ${link}. Zero strings attached, check it out!`;
      case 'loom_video_pitch':
        return `Hey ${owner}! Recorded a quick 45-second screen recording showing 2 quick tweaks that could add 15-20 dinner reservations this weekend. Mind if I drop the link here?`;
      case 'value_bomb':
        return `Hey ${owner}! Ran a quick test on ${name}'s site - menu takes over 4s to load on phones. Built a 0.3s interactive mockup here: ${link}. Can I share the screen audit?`;
      case 'objection_killer':
        return `Totally get you're super busy running ${name}. We actually launch everything in 48 hours. Our offer is $0 upfront for our first 3 Case Study spots, just $99/mo. If you don't love it, you pay nothing. Fair enough?`;
      case 'breakup_scarcity':
        return `Hey ${owner}, figured you're either slammed or all set for ${name}. I'll close out this file so I don't bug you. If you ever want to upgrade reservations, here's your link: ${link}. Wishing you a great weekend!`;
      default:
        return `Hey ${owner}! Put together a 0.3s direct ordering concept for ${name}: ${link}. We normally charge $299 + $99/mo, but waiving the $299 fee to $0 for 3 local spots in exchange for a short review. Want me to turn it live?`;
    }
  };

  // Generate with Gemini on demand
  const handleGenerateDraft = async (typeOverride?: PitchType) => {
    if (!selectedLead) return;
    const currentType = typeOverride || pitchType;
    setIsGenerating(true);
    setStatusFeedback('');

    try {
      const res = await fetch('/api/gemini/pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: selectedLead.restaurantName,
          ownerName: selectedLead.contactName || '',
          platform: selectedLead.platform,
          followupCount: selectedLead.followupCount,
          daysSince: 3,
          mockupUrl: selectedLead.mockupLink || 'https://demo.closer.app/' + selectedLead.restaurantName.toLowerCase().replace(/[^a-z0-9]/g, ''),
          customNotes: selectedLead.notes,
          pitchType: currentType,
          niche: 'Restaurant',
        }),
      });

      const data = await res.json();
      if (data?.pitch) {
        setDraftMessage(data.pitch);
        setStatusFeedback(data.source === 'gemini' ? `✨ Generated with Gemini (${data.model || 'Flash'})` : '⚡ Battle-tested closer template');
      } else {
        setDraftMessage(getInstantPresetPitch(selectedLead, currentType));
        setStatusFeedback('⚡ Battle-tested closer template');
      }
    } catch (_err) {
      setDraftMessage(getInstantPresetPitch(selectedLead, currentType));
      setStatusFeedback('⚡ Battle-tested closer template');
    } finally {
      setIsGenerating(false);
    }
  };

  // Instantly apply high-converting preset when lead or strategy changes (0ms delay, 0 quota burn)
  useEffect(() => {
    if (selectedLead) {
      setDraftMessage(getInstantPresetPitch(selectedLead, pitchType));
      setStatusFeedback('⚡ Instant battle-tested closer template');
    }
  }, [selectedLead?.id, pitchType]);

  const handleCopy = () => {
    if (!draftMessage) return;
    navigator.clipboard.writeText(draftMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlatformDirectUrl = () => {
    if (!selectedLead) return '#';
    const cleanHandle = selectedLead.handle.replace('@', '').trim();
    if (selectedLead.platform === 'Instagram') {
      return `https://www.instagram.com/${cleanHandle}/`;
    }
    if (selectedLead.platform === 'WhatsApp' && selectedLead.phone) {
      const cleanPhone = selectedLead.phone.replace(/[^0-9]/g, '');
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(draftMessage)}`;
    }
    if (selectedLead.platform === 'Email' && selectedLead.email) {
      return `mailto:${selectedLead.email}?subject=${encodeURIComponent(`Quick question regarding ${selectedLead.restaurantName}`)}&body=${encodeURIComponent(draftMessage)}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(selectedLead.restaurantName + ' ' + selectedLead.city)}`;
  };

  const wordCount = draftMessage ? draftMessage.trim().split(/\s+/).length : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Priority Follow-Up Task Queue */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-400" />
              <h2 className="text-base font-bold text-white">Outreach Task Queue</h2>
            </div>
            {/* Filter Toggle */}
            <div className="flex rounded-lg bg-slate-800/80 p-0.5 text-xs">
              <button
                onClick={() => setFilterMode('today_batch')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 font-semibold transition cursor-pointer ${
                  filterMode === 'today_batch'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                    : 'text-amber-300 hover:text-white'
                }`}
              >
                <Flame className="h-3 w-3 fill-current" />
                <span>Today's 10 ({todayBatchLeads.length})</span>
              </button>
              <button
                onClick={() => setFilterMode('due')}
                className={`rounded-md px-2 py-1 font-semibold transition cursor-pointer ${
                  filterMode === 'due'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Due ({dueLeads.length})
              </button>
              <button
                onClick={() => setFilterMode('all')}
                className={`rounded-md px-2 py-1 font-semibold transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({activeLeads.length})
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            {filterMode === 'today_batch'
              ? `Leads designated for today's outreach (${todayWeekday} batch - 10/day quota)`
              : filterMode === 'due'
              ? 'Leads requiring follow-up action based on the 3-7-14 day schedule'
              : 'All active restaurant opportunities currently in pipeline'}
          </p>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {displayLeads.map((lead) => {
              const isSelected = selectedLead?.id === lead.id;
              const isOverdue = lead.nextFollowupDate && lead.nextFollowupDate < today;
              const isDueToday = lead.nextFollowupDate === today;

              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-950/50 scale-[1.01]'
                      : 'border-white/5 bg-slate-800/40 hover:border-white/20 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{lead.restaurantName}</span>
                        {isOverdue && (
                          <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-400 border border-rose-500/30 animate-pulse">
                            OVERDUE
                          </span>
                        )}
                        {isDueToday && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                            DUE TODAY
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {lead.city} • <span className="text-indigo-300">{lead.handle}</span>
                      </p>
                      <div className="mt-2">
                        <DayBadge
                          lead={lead}
                          allLeads={leads}
                          onRescheduleLead={onRescheduleLead}
                          size="sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right">
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300">
                          FU #{lead.followupCount + 1}
                        </span>
                        <span className="block text-[11px] font-semibold text-emerald-400 mt-1">
                          ${lead.estimatedDealValue || 299}
                        </span>
                      </div>
                      {onDeleteLead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLead(lead.id);
                          }}
                          title="Delete this lead"
                          className="rounded-lg p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {lead.notes && (
                    <p className="mt-2 text-[11px] text-slate-400 line-clamp-1 italic bg-slate-900/40 p-1.5 rounded-lg border border-white/5">
                      "{lead.notes}"
                    </p>
                  )}
                </div>
              );
            })}

            {displayLeads.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                <p className="text-sm font-semibold text-slate-300">No leads currently due!</p>
                <p className="text-xs text-slate-500 mt-1">
                  Switch to "All Active" or add a new restaurant lead to start pitching.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: AI Action Station & Pitch Dispatch Terminal */}
      <div className="lg:col-span-7 space-y-4">
        {selectedLead ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-6 backdrop-blur-xl shadow-xl">
            {/* Target Lead Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white font-['Outfit']">
                    {selectedLead.restaurantName}
                  </h2>
                  <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-500/20">
                    {selectedLead.platform}
                  </span>
                  <DayBadge
                    lead={selectedLead}
                    allLeads={leads}
                    onRescheduleLead={onRescheduleLead}
                    size="sm"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Contact: <span className="text-slate-200 font-semibold">{selectedLead.contactName || 'Owner'}</span> •{' '}
                  {selectedLead.city} • Last contact: {selectedLead.lastContactDate}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {onViewDetails && (
                  <button
                    id="btn-view-details-copilot"
                    onClick={() => onViewDetails(selectedLead)}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 transition shadow-sm cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-indigo-400" />
                    <span>VIEW LEAD DATA</span>
                  </button>
                )}
                {onDeleteLead && (
                  <button
                    id="btn-delete-copilot-header"
                    onClick={() => onDeleteLead(selectedLead.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-300 hover:text-white transition shadow-sm cursor-pointer"
                    title="Delete this lead"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                    <span>DELETE</span>
                  </button>
                )}
              </div>
            </div>

            {/* Pitch Hook Style Selector */}
            <div className="mt-4">
              {/* Campaign Callout */}
              <div className="mb-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-slate-800 to-indigo-500/15 border border-amber-500/30 p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span className="font-bold text-amber-300">Active Campaign:</span>
                  <span className="text-slate-300">First 3 Clients: <strong className="text-emerald-400">$0 Down + $99/mo</strong> (or Standard <strong className="text-white">$299 + $99/mo</strong>)</span>
                </div>
                <span className="hidden sm:inline text-[10px] font-bold text-amber-400 uppercase bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                  Zero Upfront Friction
                </span>
              </div>

              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Select Fast-Close Hook Strategy:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'case_study_0_down', label: '🎁 $0 Down Case Study', desc: '$0 setup + $99/mo (3 spots)' },
                  { id: 'fast_close_offer', label: '🚀 Standard $299 Offer', desc: '$299 setup + $99/mo fixed' },
                  { id: '35_word_hook', label: '⚡ 35-Word Hook', desc: 'Ultra-fast reply rate' },
                  { id: 'mockup_drop', label: '🎨 Mockup Drop', desc: 'Custom 60fps design' },
                  { id: 'loom_video_pitch', label: '📹 Loom Opener', desc: '45-second screen audit' },
                  { id: 'value_bomb', label: '💡 Value Bomb', desc: 'Point out mobile leak' },
                  { id: 'objection_killer', label: '🛡️ Zero Risk', desc: '$0 if you don’t love it' },
                  { id: 'breakup_scarcity', label: '🚪 Break-Up', desc: 'Reverse psychology' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setPitchType(item.id as PitchType);
                    }}
                    className={`rounded-xl p-2 text-left border transition ${
                      pitchType === item.id
                        ? 'border-indigo-500 bg-indigo-950/60 shadow-md text-white'
                        : 'border-white/5 bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:border-white/15'
                    }`}
                  >
                    <span className="text-xs font-bold block">{item.label}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Generator Action & Message Box */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Custom Pitch Message</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    wordCount <= 40 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {wordCount} words (Ideal: &lt; 40)
                  </span>
                </div>

                <button
                  id="btn-regenerate-pitch"
                  onClick={() => handleGenerateDraft()}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Drafting...' : 'Regenerate Pitch'}</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  id="textarea-draft-pitch"
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed"
                  placeholder="Generating customized pitch..."
                />
              </div>

              {statusFeedback && (
                <p className="text-[11px] text-indigo-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>{statusFeedback}</span>
                </p>
              )}
            </div>

            {/* Dispatch & Quick Launch Buttons */}
            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  id="btn-copy-pitch"
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-white/10 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
                  <span>{copied ? 'Copied!' : 'Copy Script'}</span>
                </button>

                <a
                  id="link-dispatch-channel"
                  href={getPlatformDirectUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-3 py-2.5 text-xs font-bold text-white hover:from-pink-500 hover:to-rose-500 transition shadow-md shadow-pink-600/20"
                >
                  {selectedLead.platform === 'Instagram' ? (
                    <Instagram className="h-4 w-4" />
                  ) : selectedLead.platform === 'WhatsApp' ? (
                    <MessageSquare className="h-4 w-4" />
                  ) : selectedLead.platform === 'Email' ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  <span>Open {selectedLead.platform}</span>
                </a>

                <button
                  id="btn-log-followup-sent"
                  onClick={() => onLogFollowupSent(selectedLead.id)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/30"
                >
                  <Send className="h-4 w-4" />
                  <span>Log Sent (+Sched)</span>
                </button>

                <button
                  id="btn-mark-replied"
                  onClick={() => onMarkReplied(selectedLead.id)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-md shadow-emerald-600/30"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Mark Replied 🎉</span>
                </button>
              </div>

              {/* Deal Won Button */}
              <button
                id="btn-mark-closed-won-copilot"
                onClick={() => onMarkWon(selectedLead.id)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 hover:brightness-110 transition shadow-lg shadow-amber-500/20"
              >
                <Trophy className="h-4 w-4 text-slate-950" />
                <span>🏆 Deal Closed Won (${selectedLead.estimatedDealValue || 299})</span>
              </button>

              {/* Dead & Trash Lead Action Bar */}
              {(onMarkDead || onDeleteLead) && (
                <div className="flex items-center gap-2 pt-1">
                  {onMarkDead && selectedLead.status !== 'closed_dead' && (
                    <button
                      id="btn-mark-dead-copilot"
                      onClick={() => onMarkDead(selectedLead.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 py-2 px-3 text-xs font-bold text-rose-300 transition cursor-pointer"
                      title="Mark lead as Dead / Not Interested"
                    >
                      <span>💀 Mark Dead</span>
                    </button>
                  )}
                  {onDeleteLead && (
                    <button
                      id="btn-delete-copilot"
                      onClick={() => onDeleteLead(selectedLead.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition cursor-pointer ${
                        selectedLead.status === 'closed_dead'
                          ? 'flex-1 border border-rose-500/50 bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                          : 'border border-white/10 bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300'
                      }`}
                      title={selectedLead.status === 'closed_dead' ? "Trash this dead lead" : "Delete lead"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{selectedLead.status === 'closed_dead' ? 'Trash This Dead Lead' : 'Delete'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* SQLite Touchpoint History */}
            {(() => {
              const leadLogs = followupLogs.filter((l) => l.leadId === selectedLead.id);
              return (
                <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-indigo-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Touchpoint & Outreach History
                      </span>
                      <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-extrabold text-indigo-300">
                        {leadLogs.length} {leadLogs.length === 1 ? 'event' : 'events'} logged
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      First Contact: {selectedLead.dateFirstContact || 'N/A'}
                    </span>
                  </div>

                  {leadLogs.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {leadLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/70 px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                log.actionType === 'replied'
                                  ? 'bg-emerald-400 ring-2 ring-emerald-400/20'
                                  : log.actionType === 'closed_won'
                                  ? 'bg-amber-400 ring-2 ring-amber-400/20'
                                  : 'bg-indigo-400'
                              }`}
                            />
                            <span className="font-semibold text-slate-200">{log.note}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                log.actionType === 'replied'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                                  : log.actionType === 'closed_won'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                                  : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                              }`}
                            >
                              {log.actionType.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {log.logDate}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-3 text-center text-xs text-slate-400">
                      No touchpoint events logged yet. Next follow-up is scheduled for {selectedLead.nextFollowupDate || 'as needed'}.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-12 text-center">
            <AlertCircle className="h-10 w-10 text-slate-500 mx-auto mb-2" />
            <p className="text-base font-bold text-white">Select a Lead from the Task Queue</p>
            <p className="text-xs text-slate-400 mt-1">
              Choose any restaurant lead on the left to fire customized pitches and launch instant proposals.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
