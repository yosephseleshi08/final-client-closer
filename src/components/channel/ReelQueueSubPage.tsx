import React, { useState } from 'react';
import {
  Film,
  Video,
  Check,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Link2,
  Send,
  MessageSquare,
  AlertCircle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import { getChannelLabel } from '../../utils/channelStorage';
import { getLocalTodayStr, normalizeToLocalDateStr } from '../../utils/cadenceEngine';
import { VideoScriptModal } from '../VideoScriptModal';

interface ReelQueueSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
  onNavigateToLeads?: () => void;
}

export function ReelQueueSubPage({
  channel,
  leads,
  onUpdateLeads,
  onNavigateToLeads,
}: ReelQueueSubPageProps) {
  const [selectedScriptLead, setSelectedScriptLead] = useState<ChannelLead | null>(null);
  const [reelLinkInputs, setReelLinkInputs] = useState<Record<string, string>>({});
  const [justPostedId, setJustPostedId] = useState<string | null>(null);
  const [showPostedHistory, setShowPostedHistory] = useState<boolean>(false);

  const todayStr = getLocalTodayStr();

  // Pending Reels: videoRecorded === true AND !reelPosted
  const pendingReels = leads.filter(
    (l) => Boolean(l.videoRecorded) && !l.reelPosted
  );

  // Posted Reels
  const postedReels = leads.filter((l) => Boolean(l.reelPosted));
  const postedToday = postedReels.filter(
    (l) => normalizeToLocalDateStr(l.reelPostedAt) === todayStr || (!l.reelPostedAt && l.reelPosted)
  );

  const handleReelLinkChange = (leadId: string, url: string) => {
    setReelLinkInputs((prev) => ({
      ...prev,
      [leadId]: url,
    }));
  };

  const handleMarkAsPosted = (lead: ChannelLead) => {
    const inputUrl = reelLinkInputs[lead.id]?.trim() || lead.reelLink || '';
    const nowIso = new Date().toISOString();

    const updated = leads.map((l) => {
      if (l.id === lead.id) {
        return {
          ...l,
          reelPosted: true,
          reelPostedAt: nowIso,
          reelLink: inputUrl || undefined,
        };
      }
      return l;
    });

    onUpdateLeads(updated);
    setJustPostedId(lead.id);
    setTimeout(() => setJustPostedId(null), 2500);
  };

  const handleRevertPosted = (lead: ChannelLead) => {
    const updated = leads.map((l) => {
      if (l.id === lead.id) {
        return {
          ...l,
          reelPosted: false,
          reelPostedAt: undefined,
        };
      }
      return l;
    });
    onUpdateLeads(updated);
  };

  const handleUpdateSingleLead = (updatedLead: ChannelLead) => {
    const nextList = leads.map((l) => (l.id === updatedLead.id ? updatedLead : l));
    onUpdateLeads(nextList);
    if (selectedScriptLead?.id === updatedLead.id) {
      setSelectedScriptLead(updatedLead);
    }
  };

  return (
    <div className="space-y-6">
      {/* Motivational Top Helper Banner (User Requirement #4) */}
      <div className="rounded-3xl border border-pink-500/30 bg-gradient-to-r from-pink-950/40 via-purple-950/40 to-slate-900/90 p-5 sm:p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-pink-950/50">
            <Film className="w-5 h-5 text-pink-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-pink-300 uppercase tracking-wider font-mono">
                🎬 Reel Dispatch Pipeline
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-bold font-mono">
                Daily Goal: 2 Reels
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white font-['Outfit']">
              You have {pendingReels.length} videos waiting to be posted. Goal: Post 2 today. Save the rest for tomorrow.
            </h2>
            <p className="text-xs text-slate-400">
              Post the breakdown video on your feed/story, tag the restaurant handle, and click "Mark as Posted" to trigger Stage A outreach.
            </p>
          </div>
        </div>

        {/* Quota Progress Pill */}
        <div className="flex items-center gap-3 bg-slate-950/70 border border-white/10 px-4 py-3 rounded-2xl shrink-0 self-start md:self-auto">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-mono">
              Posted Today
            </span>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-2xl font-black text-pink-400 tabular-nums">
                {postedToday.length}
              </span>
              <span className="text-slate-500 text-sm font-semibold">/ 2</span>
            </div>
          </div>
          <div className="w-16 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.round((postedToday.length / 2) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* View Switcher / Sub-Filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 p-1 bg-slate-900 border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => setShowPostedHistory(false)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              !showPostedHistory
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Pending Reel Queue ({pendingReels.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPostedHistory(true)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              showPostedHistory
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Posted Reels ({postedReels.length})</span>
          </button>
        </div>

        {onNavigateToLeads && (
          <button
            type="button"
            onClick={onNavigateToLeads}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer font-semibold flex items-center gap-1"
          >
            <span>View All {getChannelLabel(channel)} Leads</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {!showPostedHistory ? (
        // Pending Queue
        <div className="space-y-4">
          {pendingReels.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-12 text-center max-w-lg mx-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                <Video className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white font-['Outfit']">
                No videos waiting to be posted
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                When you record a breakdown video for any {getChannelLabel(channel)} lead, toggle the <strong>Video Recorded</strong> button on the Leads tab. It will instantly queue up here for publishing!
              </p>
              {onNavigateToLeads && (
                <button
                  type="button"
                  onClick={onNavigateToLeads}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
                >
                  Go to Leads Table
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingReels.map((lead) => {
                const currentInput = reelLinkInputs[lead.id] ?? lead.reelLink ?? '';
                const formattedProfileUrl = lead.link.startsWith('http') ? lead.link : `https://${lead.link}`;

                return (
                  <div
                    key={lead.id}
                    className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 backdrop-blur-md shadow-xl space-y-4 transition hover:border-pink-500/30"
                  >
                    {/* Top Line: ID, Name, Link */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-pink-400 bg-pink-500/15 px-2.5 py-0.5 rounded-lg border border-pink-500/30 text-xs font-mono">
                            {lead.id}
                          </span>
                          <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            Video Ready
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white font-['Outfit'] mt-1">
                          {lead.name}
                        </h3>
                        <a
                          href={formattedProfileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-mono max-w-xs truncate"
                        >
                          <span className="truncate">{lead.link}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedScriptLead(lead)}
                        className="px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="View Stage A & Stage B Scripts"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Script</span>
                      </button>
                    </div>

                    {/* Reel URL Input */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block">
                        Published Reel / Post URL (Optional):
                      </label>
                      <input
                        type="text"
                        value={currentInput}
                        onChange={(e) => handleReelLinkChange(lead.id, e.target.value)}
                        placeholder="https://instagram.com/reel/... or FB video link"
                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
                      />
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {lead.videoRecordedAt
                          ? `Recorded ${new Date(lead.videoRecordedAt).toLocaleDateString()}`
                          : 'Recorded'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleMarkAsPosted(lead)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-pink-950/50 active:scale-95"
                      >
                        {justPostedId === lead.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Marked as Posted!</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark as Posted</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // Posted Reels History
        <div className="space-y-4">
          {postedReels.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-12 text-center max-w-lg mx-auto space-y-2">
              <p className="text-sm font-semibold text-slate-400">No reels marked as posted yet.</p>
              <p className="text-xs text-slate-500">
                Mark your published reels above to keep a record and progress toward your daily quota of 2.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {postedReels.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-2xl border border-emerald-500/20 bg-slate-900/80 p-5 space-y-3 backdrop-blur-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 text-xs font-mono">
                          {lead.id}
                        </span>
                        <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          ✓ Reel Live
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white font-['Outfit'] mt-1">
                        {lead.name}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedScriptLead(lead)}
                      className="px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Stage A DM</span>
                    </button>
                  </div>

                  {lead.reelLink && (
                    <div className="text-xs font-mono">
                      <a
                        href={lead.reelLink.startsWith('http') ? lead.reelLink : `https://${lead.reelLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-pink-400 hover:text-pink-300 underline truncate max-w-md"
                      >
                        <span className="truncate">View Published Reel</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
                    <span className="text-[11px] font-mono">
                      {lead.reelPostedAt
                        ? `Posted ${new Date(lead.reelPostedAt).toLocaleDateString()}`
                        : 'Posted'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRevertPosted(lead)}
                      className="text-xs text-slate-500 hover:text-amber-400 transition cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Re-queue</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video Script Modal */}
      <VideoScriptModal
        isOpen={Boolean(selectedScriptLead)}
        onClose={() => setSelectedScriptLead(null)}
        lead={selectedScriptLead}
        channel={channel}
        onUpdateLead={handleUpdateSingleLead}
      />
    </div>
  );
}
