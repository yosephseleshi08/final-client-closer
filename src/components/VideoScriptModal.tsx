import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Video,
  Film,
  Send,
  MessageCircleReply,
  Link2,
  ExternalLink,
  Sparkles,
  FileText,
  Clock,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../types';
import { getChannelLabel } from '../utils/channelStorage';
import { getLocalTodayStr } from '../utils/cadenceEngine';

interface VideoScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: ChannelLead | null;
  channel: MultiChannelType;
  onUpdateLead: (lead: ChannelLead) => void;
}

export const VideoScriptModal: React.FC<VideoScriptModalProps> = ({
  isOpen,
  onClose,
  lead,
  channel,
  onUpdateLead,
}) => {
  if (!isOpen || !lead) return null;

  const [activeStage, setActiveStage] = useState<'A' | 'B'>('A');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customLiveLink, setCustomLiveLink] = useState<string>(
    lead.mockupLink || (lead.link ? (lead.link.startsWith('http') ? lead.link : `https://${lead.link}`) : '')
  );

  const restaurantName = lead.name?.trim() || 'team';
  const effectiveLiveLink = customLiveLink.trim() || lead.mockupLink || lead.link || '[Live Link]';

  // Exact Stage A copy from user specification
  const stageAScript = `Hey ${restaurantName}! I just posted a quick video on my story/feed breaking down your menu design/website and how you could easily add 15-20 more covers this weekend. Tagged you guys! Mind if I send the direct link to the full breakdown here?`;

  // Exact Stage B copy from user specification
  const stageBScript = `Here you go: ${effectiveLiveLink}. Let me know what you think of the online ordering tip at 1:12! If you want the full kitchen ticket PDF I mentioned, happy to send that over too.`;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleToggleWorkflowField = (field: 'videoRecorded' | 'reelPosted' | 'dmSent' | 'repliedSendIt' | 'liveLinkSent') => {
    const nowIso = new Date().toISOString();
    const currentVal = Boolean(lead[field]);
    const nextVal = !currentVal;

    let patch: Partial<ChannelLead> = {
      [field]: nextVal,
      [`${field}At`]: nextVal ? nowIso : undefined,
    };

    if (field === 'dmSent' && nextVal && !lead.initialSentDate) {
      patch.initialSentDate = getLocalTodayStr();
    }
    if (field === 'repliedSendIt' && nextVal) {
      patch.leadStatus = 'replied';
      patch.repliedAt = nowIso;
    }
    if (field === 'liveLinkSent' && nextVal) {
      patch.isCompleted = true;
    }

    onUpdateLead({
      ...lead,
      ...patch,
      mockupLink: customLiveLink.trim() || lead.mockupLink,
    });
  };

  const handleSaveLiveLink = () => {
    onUpdateLead({
      ...lead,
      mockupLink: customLiveLink.trim() || undefined,
    });
    setCopiedKey('linkSaved');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-indigo-400 bg-indigo-500/15 px-2.5 py-0.5 rounded-lg border border-indigo-500/30 text-xs font-mono">
                {lead.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
                {getChannelLabel(channel)}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-bold font-mono flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Video Value First Strategy</span>
              </span>
            </div>
            <h3 className="text-xl font-black text-white font-['Outfit'] mt-1">
              {lead.name}
            </h3>
            <p className="text-xs text-slate-400">
              Workflow: Record Video → Post Reel (Tagging) → Send DM with Link → Follow up with Value.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Step Workflow Status Strip */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            <span>Workflow Milestones</span>
            <span className="text-indigo-400 lowercase text-[11px] font-sans font-normal">Click any step to toggle</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* 1. Video Recorded */}
            <button
              type="button"
              onClick={() => handleToggleWorkflowField('videoRecorded')}
              className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                lead.videoRecorded
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-950/40'
                  : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
              }`}
            >
              <Video className="w-4 h-4 shrink-0" />
              <span className="text-[11px] leading-tight">1. Video Done</span>
              <span className="text-[9px] font-mono opacity-80">
                {lead.videoRecorded ? '✓ Recorded' : 'Pending'}
              </span>
            </button>

            {/* 2. Reel Posted */}
            <button
              type="button"
              onClick={() => handleToggleWorkflowField('reelPosted')}
              className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                lead.reelPosted
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-sm shadow-pink-950/40'
                  : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
              }`}
            >
              <Film className="w-4 h-4 shrink-0" />
              <span className="text-[11px] leading-tight">2. Reel Posted</span>
              <span className="text-[9px] font-mono opacity-80">
                {lead.reelPosted ? '✓ Posted' : 'Queue'}
              </span>
            </button>

            {/* 3. DM Sent */}
            <button
              type="button"
              onClick={() => handleToggleWorkflowField('dmSent')}
              className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                lead.dmSent || lead.initialSentDate
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm shadow-sky-950/40'
                  : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
              }`}
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="text-[11px] leading-tight">3. DM Sent</span>
              <span className="text-[9px] font-mono opacity-80">
                {lead.dmSent || lead.initialSentDate ? '✓ Sent' : 'Unsent'}
              </span>
            </button>

            {/* 4. Replied "Send it" */}
            <button
              type="button"
              onClick={() => handleToggleWorkflowField('repliedSendIt')}
              className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                lead.repliedSendIt
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950/40'
                  : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
              }`}
            >
              <MessageCircleReply className="w-4 h-4 shrink-0" />
              <span className="text-[11px] leading-tight">4. "Send it"</span>
              <span className="text-[9px] font-mono opacity-80">
                {lead.repliedSendIt ? '✓ Replied' : 'Waiting'}
              </span>
            </button>

            {/* 5. Live Link Sent */}
            <button
              type="button"
              onClick={() => handleToggleWorkflowField('liveLinkSent')}
              className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center col-span-2 sm:col-span-1 ${
                lead.liveLinkSent
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950/40'
                  : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
              }`}
            >
              <Link2 className="w-4 h-4 shrink-0" />
              <span className="text-[11px] leading-tight">5. Link Sent</span>
              <span className="text-[9px] font-mono opacity-80">
                {lead.liveLinkSent ? '✓ Delivered' : 'Pending'}
              </span>
            </button>
          </div>
        </div>

        {/* Stage Selector Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-950/80 border border-white/10 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveStage('A')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeStage === 'A'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>STAGE A: Initial Contact (Day 1)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStage('B')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              activeStage === 'B'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>STAGE B: Post-Reaction ("Send it")</span>
          </button>
        </div>

        {/* Stage A Content */}
        {activeStage === 'A' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-slate-900/90 to-slate-900/90 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 font-mono">
                    STAGE A — Initial Contact (Day 1)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Send right after posting the breakdown Reel/Story tagging their account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy('stageA', stageAScript)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-950/50 active:scale-95"
                >
                  {copiedKey === 'stageA' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied Script!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Script</span>
                    </>
                  )}
                </button>
              </div>

              {/* Script Box */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-white/10 font-sans text-xs sm:text-sm text-slate-200 leading-relaxed select-all">
                {stageAScript}
              </div>

              {/* Quick actions for Stage A */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  Placeholder filled: <strong className="text-indigo-300 font-bold">{restaurantName}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleWorkflowField('dmSent')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    lead.dmSent || lead.initialSentDate
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>{lead.dmSent || lead.initialSentDate ? '✓ DM Marked as Sent' : 'Mark DM as Sent'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage B Content */}
        {activeStage === 'B' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-slate-900/90 to-slate-900/90 p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300 font-mono">
                    STAGE B — Post-Reaction ("Send it" / "Sure")
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Deliver the live breakdown link, highlight the 1:12 tip, and offer the kitchen ticket PDF.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy('stageB', stageBScript)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-950/50 active:scale-95"
                >
                  {copiedKey === 'stageB' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied Link Script!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link Script</span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Link Input Field */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block">
                  Live Link / Mockup Breakdown URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customLiveLink}
                    onChange={(e) => setCustomLiveLink(e.target.value)}
                    placeholder="https://... (Loom, custom mockup, or Figma breakdown)"
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveLiveLink}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition cursor-pointer shrink-0"
                  >
                    {copiedKey === 'linkSaved' ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Script Box */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-white/10 font-sans text-xs sm:text-sm text-slate-200 leading-relaxed select-all">
                {stageBScript}
              </div>

              {/* Quick actions for Stage B */}
              <div className="flex items-center justify-between pt-1 text-xs flex-wrap gap-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  Live link: <strong className="text-purple-300 font-bold truncate max-w-xs inline-block align-bottom">{effectiveLiveLink}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleWorkflowField('liveLinkSent')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    lead.liveLinkSent
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lead.liveLinkSent ? '✓ Live Link Marked as Sent' : 'Mark Live Link Sent'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-slate-400">
          <a
            href={lead.link.startsWith('http') ? lead.link : `https://${lead.link}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors font-mono max-w-sm truncate"
          >
            <span className="truncate">{lead.link}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
