import React, { useState } from 'react';
import {
  Edit3,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Sparkles,
  X,
  FileText,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import { getChannelLabel, getPlatformLink, getLeadEmail } from '../../utils/channelStorage';
import { getStrictVoiceTypeForId, getVoiceTypeBadgeStyle } from '../../utils/voiceTypeEngine';

interface DmSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
}

export function DmSubPage({ channel, leads, onUpdateLeads }: DmSubPageProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [initialDraft, setInitialDraft] = useState('');
  const [day4Draft, setDay4Draft] = useState('');
  const [day8Draft, setDay8Draft] = useState('');
  const [day14Draft, setDay14Draft] = useState('');
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  const handleOpenPitchEditor = (lead: ChannelLead) => {
    setSelectedLeadId(lead.id);
    setInitialDraft(lead.initialDM || lead.customPitch || lead.stagedDmMiniPitch || '');
    setDay4Draft(lead.followupDM_Day4 || lead.followupDM_Day7 || lead.followup3DM || '');
    setDay8Draft(lead.followupDM_Day8 || lead.followupDM_Day14 || lead.followup7DM || '');
    setDay14Draft(lead.breakupDM_Day14 || lead.breakupDM_Day30 || '');
  };

  const handleSavePitch = () => {
    if (!selectedLeadId) return;
    const trimmedInitial = initialDraft.trim();
    const trimmedD4 = day4Draft.trim();
    const trimmedD8 = day8Draft.trim();
    const trimmedD14 = day14Draft.trim();
    const nowIso = new Date().toISOString();

    const updated = leads.map((l) => {
      if (l.id === selectedLeadId) {
        return {
          ...l,
          customPitch: trimmedInitial,
          initialDM: trimmedInitial,
          stagedDmMiniPitch: trimmedInitial,
          followupDM_Day4: trimmedD4 || undefined,
          followupDM_Day8: trimmedD8 || undefined,
          breakupDM_Day14: trimmedD14 || undefined,
          isSequenceConfigured: Boolean(trimmedInitial && (trimmedD4 || trimmedD8 || trimmedD14)),
          pitchSavedAt: nowIso,
        };
      }
      return l;
    });

    onUpdateLeads(updated);
    setSavedSuccessId(selectedLeadId);
    setTimeout(() => setSavedSuccessId(null), 2500);
    setSelectedLeadId(null);
  };

  const handleCopyPitch = (lead: ChannelLead) => {
    const text = lead.initialDM || lead.customPitch || '';
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const insertToken = (token: string) => {
    setInitialDraft((prev) => (prev ? `${prev} ${token} ` : `${token} `));
  };

  const configuredCount = leads.filter((l) => Boolean(l.initialDM || l.customPitch)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-white font-['Outfit']">
            {getChannelLabel(channel)} 4-Step Sequence &amp; Outreach Pitches
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pre-configure Day 0 Initial, Day 4 Follow-Up, Day 8 Social Proof, and Day 14 Breakup messages directly on each Lead ID.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Pitches written:{' '}
          <span className="text-indigo-400 font-bold">{configuredCount}</span> / {leads.length}
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No leads available for DM authoring</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Switch to the &quot;Leads&quot; sub-tab to add prospect links first.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 text-left w-40">Lead ID</th>
                  <th className="py-3 px-4 text-left w-64">Prospect</th>
                  <th className="py-3 px-4 text-left">Sequence Status &amp; Preview</th>
                  <th className="py-3 px-4 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leads.map((lead) => {
                  const primaryMsg = lead.initialDM || lead.customPitch || '';
                  const hasPitch = Boolean(primaryMsg.trim().length > 0);
                  const followupsConfigured = [
                    lead.followupDM_Day4,
                    lead.followupDM_Day8,
                    lead.breakupDM_Day14,
                  ].filter((m) => Boolean(m && m.trim())).length;
                  const isSavedJustNow = savedSuccessId === lead.id;
                  const isCopied = copiedId === lead.id;
                  const voiceType = lead.voiceType || getStrictVoiceTypeForId(lead, channel);
                  const voiceStyle = getVoiceTypeBadgeStyle(voiceType);
                  const cleanEmail = getLeadEmail(lead);
                  const href = getPlatformLink(cleanEmail || lead, cleanEmail ? 'email' : channel);

                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 text-left font-mono text-xs tabular-nums">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                            {lead.id}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${voiceStyle.badgeClass}`}>
                            {voiceType}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-left">
                        <div className="font-medium text-sm text-slate-100 font-['Outfit'] truncate max-w-xs">
                          {lead.name}
                        </div>
                        {href && (
                          <a
                            href={href}
                            target={href.startsWith('mailto:') ? '_self' : '_blank'}
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition-colors mt-0.5 truncate max-w-xs"
                          >
                            <span className="truncate">{cleanEmail || lead.link}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-left">
                        {hasPitch ? (
                          <div className="space-y-1">
                            <p className="text-xs text-slate-300 line-clamp-2 italic bg-slate-950/40 p-2 rounded-lg border border-white/5">
                              &quot;{primaryMsg}&quot;
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                              <span className="text-emerald-400">
                                D0 Ready{followupsConfigured > 0 ? ` · +${followupsConfigured} follow-up${followupsConfigured === 1 ? '' : 's'}` : ''}
                              </span>
                              {lead.pitchSavedAt && (
                                <span>· Saved {new Date(lead.pitchSavedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 opacity-60" />
                            <span>No sequence drafted yet</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasPitch && (
                            <button
                              type="button"
                              onClick={() => handleCopyPitch(lead)}
                              className={`p-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                isCopied
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
                              }`}
                              title="Copy Day 0 pitch to clipboard"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="hidden sm:inline">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Copy</span>
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenPitchEditor(lead)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{hasPitch ? 'Edit Sequence' : 'Write Pitch'}</span>
                          </button>
                        </div>

                        {isSavedJustNow && (
                          <div className="text-[10px] text-emerald-400 font-semibold mt-1">
                            Sequence Saved!
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4-Step Sequence Editor Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {selectedLead.id}
                  </span>
                  <h3 className="text-lg font-bold text-white font-['Outfit']">
                    {selectedLead.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Configure the 4-step outreach sequence saved directly to {selectedLead.id}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeadId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500">Insert into Day 0:</span>
              <button
                type="button"
                onClick={() => insertToken(selectedLead.name)}
                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-indigo-300 cursor-pointer"
              >
                {selectedLead.name}
              </button>
              <button
                type="button"
                onClick={() =>
                  setInitialDraft(
                    `Hey ${selectedLead.name}! Love what you're doing. Built a 0.3s interactive prototype for you — mind if I send over the quick preview?`
                  )
                }
                className="px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-[11px] text-indigo-300 cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Quick Template</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-indigo-300 mb-1">
                  Step 1 · Day 0 Initial Outreach
                </label>
                <textarea
                  rows={4}
                  value={initialDraft}
                  onChange={(e) => setInitialDraft(e.target.value)}
                  placeholder="Write your custom Day 0 initial message..."
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Step 2 · Day 4 Follow-Up (Optional)
                </label>
                <textarea
                  rows={2}
                  value={day4Draft}
                  onChange={(e) => setDay4Draft(e.target.value)}
                  placeholder="Optional custom Day 4 message (defaults to kitchen ticket template if blank)..."
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-300 mb-1">
                  Step 3 · Day 8 Social Proof Follow-Up (Optional)
                </label>
                <textarea
                  rows={2}
                  value={day8Draft}
                  onChange={(e) => setDay8Draft(e.target.value)}
                  placeholder="Optional custom Day 8 message..."
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-300 mb-1">
                  Step 4 · Day 14 Breakup (Optional)
                </label>
                <textarea
                  rows={2}
                  value={day14Draft}
                  onChange={(e) => setDay14Draft(e.target.value)}
                  placeholder="Optional custom Day 14 breakup message..."
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setSelectedLeadId(null)}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePitch}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Sequence</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
