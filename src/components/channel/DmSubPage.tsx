import React, { useState } from 'react';
import {
  Edit3,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  X,
  FileText,
  Send,
  Clock,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import { getChannelLabel } from '../../utils/channelStorage';
import { LeadAnalysisModal } from './LeadAnalysisModal';

interface DmSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
}

export function DmSubPage({ channel, leads, onUpdateLeads }: DmSubPageProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [promptModalLeadId, setPromptModalLeadId] = useState<string | null>(null);

  // 3-Step Sequence States (Manual Writing & Storage)
  const [initialDraft, setInitialDraft] = useState('');
  const [followup3Draft, setFollowup3Draft] = useState('');
  const [followup7Draft, setFollowup7Draft] = useState('');
  const [activeStepTab, setActiveStepTab] = useState<'all' | 'step1' | 'step2' | 'step3'>('all');

  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  const handleOpenPitchEditor = (lead: ChannelLead) => {
    setSelectedLeadId(lead.id);
    setInitialDraft(lead.initialDM || lead.customPitch || '');
    setFollowup3Draft(lead.followup3DM || '');
    setFollowup7Draft(lead.followup7DM || '');
    setActiveStepTab('all');
  };

  const handleSavePitch = () => {
    if (!selectedLeadId) return;

    const trimmedInitial = initialDraft.trim();
    const trimmedFollowup3 = followup3Draft.trim();
    const trimmedFollowup7 = followup7Draft.trim();

    const updated = leads.map((l) => {
      if (l.id === selectedLeadId) {
        return {
          ...l,
          initialDM: trimmedInitial || undefined,
          followup3DM: trimmedFollowup3 || undefined,
          followup7DM: trimmedFollowup7 || undefined,
          // Backwards compatibility: synchronize customPitch with initialDM
          customPitch: trimmedInitial || l.customPitch,
          pitchSavedAt: new Date().toISOString(),
        };
      }
      return l;
    });

    onUpdateLeads(updated);
    setSavedSuccessId(selectedLeadId);
    setTimeout(() => setSavedSuccessId(null), 2500);
    setSelectedLeadId(null);
  };

  const handleSaveLeadAnalysis = (leadId: string, analysisText: string) => {
    const updated = leads.map((l) => {
      if (l.id === leadId) {
        return {
          ...l,
          leadAnalysis: analysisText.trim() || undefined,
          analysisSavedAt: new Date().toISOString(),
        };
      }
      return l;
    });
    onUpdateLeads(updated);
  };

  const handleCopyText = async (key: string, text?: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!text || !text.trim()) return;

    let copied = false;

    // 1. Try modern navigator.clipboard.writeText
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (err) {
        console.warn('navigator.clipboard.writeText failed, using fallback:', err);
      }
    }

    // 2. Fallback to textarea + document.execCommand('copy')
    if (!copied) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, text.length);
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          copied = true;
        }
      } catch (fallbackErr) {
        console.error('execCommand fallback copy failed:', fallbackErr);
      }
    }

    // Visual feedback ONLY changes to "Copied!" after text is actually copied
    if (copied) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const insertToken = (token: string, targetStep?: '1' | '2' | '3') => {
    if (!targetStep || targetStep === '1') {
      setInitialDraft((prev) => (prev ? `${prev} ${token}` : token));
    }
    if (targetStep === '2') {
      setFollowup3Draft((prev) => (prev ? `${prev} ${token}` : token));
    }
    if (targetStep === '3') {
      setFollowup7Draft((prev) => (prev ? `${prev} ${token}` : token));
    }
  };

  // Helper to count how many steps in the sequence are written
  const getSequenceStepCount = (lead: ChannelLead) => {
    let count = 0;
    if (lead.initialDM?.trim() || lead.customPitch?.trim()) count++;
    if (lead.followup3DM?.trim()) count++;
    if (lead.followup7DM?.trim()) count++;
    return count;
  };

  const completeSequencesCount = leads.filter((l) => getSequenceStepCount(l) === 3).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
            <span>{getChannelLabel(channel)} 3-Step Outreach Sequence</span>
            <span className="text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
              Day 1 · Day 3 · Day 7
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Craft full 3-touch cadence messages (Initial DM, 3-Day Bump, 7-Day Breakup) per prospect.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Full 3-Step Sequences:</span>
          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
            {completeSequencesCount} / {leads.length}
          </span>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No leads available for sequence authoring</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Switch to the "Leads" sub-tab to paste prospect links first. They will immediately appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 text-left w-28">Lead ID</th>
                  <th className="py-3 px-4 text-left w-56">Name &amp; Profile</th>
                  <th className="py-3 px-4 text-left">3-Step Sequence Status &amp; Previews</th>
                  <th className="py-3 px-4 text-right w-48">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leads.map((lead) => {
                  const stepCount = getSequenceStepCount(lead);
                  const isSavedJustNow = savedSuccessId === lead.id;
                  const initialMsg = lead.initialDM || lead.customPitch;
                  const step2Msg = lead.followup3DM;
                  const step3Msg = lead.followup7DM;

                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* ID */}
                      <td className="py-3.5 px-4 text-left font-mono text-xs tabular-nums">
                        <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                          {lead.id}
                        </span>
                      </td>

                      {/* Name & Link */}
                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-100 font-['Outfit'] truncate max-w-xs">
                            {lead.name}
                          </span>
                          {lead.leadAnalysis && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Analysis Ready
                            </span>
                          )}
                        </div>
                        <a
                          href={lead.link.startsWith('http') ? lead.link : `https://${lead.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition-colors mt-0.5 truncate max-w-xs"
                        >
                          <span className="truncate">{lead.link}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>

                      {/* 3-Step Sequence Status & Snippets */}
                      <td className="py-3.5 px-4 text-left">
                        <div className="space-y-2">
                          {/* Step Badges Row */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                                stepCount === 3
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : stepCount > 0
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : 'bg-white/5 text-slate-400 border-white/10'
                              }`}
                            >
                              {stepCount === 3 ? '✓ 3/3 Steps Ready' : `${stepCount}/3 Steps Set`}
                            </span>

                            {/* Mini indicator pills for each step */}
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                initialMsg
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-white/5 text-slate-500'
                              }`}
                              title={initialMsg ? `Initial DM: ${initialMsg}` : 'Initial DM not written'}
                            >
                              1. Initial
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                step2Msg
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-white/5 text-slate-500'
                              }`}
                              title={step2Msg ? `3-Day Follow-Up: ${step2Msg}` : '3-Day Follow-Up not written'}
                            >
                              2. Day 3
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                step3Msg
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-white/5 text-slate-500'
                              }`}
                              title={step3Msg ? `7-Day Breakup: ${step3Msg}` : '7-Day Breakup not written'}
                            >
                              3. Day 7
                            </span>
                          </div>

                          {/* Preview snippet of the initial DM */}
                          {initialMsg ? (
                            <p className="text-xs text-slate-300 line-clamp-2 italic bg-slate-950/40 p-2 rounded-lg border border-white/5">
                              "{initialMsg}"
                            </p>
                          ) : (
                            <span className="text-xs text-slate-500 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 opacity-60" />
                              <span>No sequence drafted yet (defaults will be used in Today's Schedule)</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {initialMsg && (
                            <button
                              type="button"
                              onClick={async (e) => await handleCopyText(`${lead.id}-step1`, initialMsg, e)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                copiedKey === `${lead.id}-step1`
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
                              }`}
                              title="Copy Initial DM"
                            >
                              {copiedKey === `${lead.id}-step1` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-[10px]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="text-[10px]">Copy DM</span>
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setPromptModalLeadId(lead.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border shadow-sm ${
                              lead.leadAnalysis?.trim()
                                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                                : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border-indigo-500/30'
                            }`}
                            title="Open Lead Analysis & Prompt Hub"
                          >
                            <span>📋</span>
                            <span>Prompt</span>
                            {lead.leadAnalysis?.trim() && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Analysis saved" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenPitchEditor(lead)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{stepCount > 0 ? 'Edit 3-Step' : 'Write 3-Step'}</span>
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

      {/* 3-Step Sequence Editor Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {selectedLead.id}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
                    3-Step Sequence: {selectedLead.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Draft the 3 sequential messages sent across the outreach cadence for {getChannelLabel(channel)}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeadId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Manual Sequence Info & Prompt Hub Access */}
            <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <FileText className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Manual 3-Step Sequence Editor</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Write tailored Day 1, Day 3, and Day 7 messages for manual outreach.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPromptModalLeadId(selectedLead.id)}
                className="px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>📋</span>
                <span>Open Prompt Hub</span>
                {selectedLead.leadAnalysis?.trim() && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            </div>

            {/* Quick Helper Tokens */}
            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500">Insert token into active step:</span>
              <button
                type="button"
                onClick={() => insertToken(selectedLead.name, '1')}
                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-indigo-300 cursor-pointer"
              >
                Lead Name
              </button>
              <button
                type="button"
                onClick={() => insertToken(selectedLead.link, '1')}
                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-indigo-300 cursor-pointer"
              >
                Link
              </button>
            </div>

            {/* 3 DISTINCT TEXTAREAS */}
            <div className="space-y-4 pt-1">
              {/* Message 1: Initial DM */}
              <div className="rounded-xl border border-indigo-500/20 bg-slate-950/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      <Send className="w-3.5 h-3.5" />
                    </span>
                    <label className="text-xs font-bold text-white uppercase tracking-wider">
                      Message 1: Initial DM (Day 1)
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Sent First
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={initialDraft}
                  onChange={(e) => setInitialDraft(e.target.value)}
                  placeholder="Hey {name}! Loved what you're doing. Built a 0.3s interactive prototype for you: mind if I share the 20-second preview?"
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Initial outreach hook tailored to their business</span>
                  <span>{initialDraft.length} chars</span>
                </div>
              </div>

              {/* Message 2: 3-Day Follow-Up */}
              <div className="rounded-xl border border-amber-500/20 bg-slate-950/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Clock className="w-3.5 h-3.5" />
                    </span>
                    <label className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Message 2: 3-Day Follow-Up (Day 3)
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Day +3 Bump
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={followup3Draft}
                  onChange={(e) => setFollowup3Draft(e.target.value)}
                  placeholder="Hey {name}, bumping this quick! Wondering if you had 30 seconds to click through the interactive demo I put together for you? No pressure at all!"
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Quick low-friction check-in with zero pressure</span>
                  <span>{followup3Draft.length} chars</span>
                </div>
              </div>

              {/* Message 3: 7-Day Breakup */}
              <div className="rounded-xl border border-rose-500/20 bg-slate-950/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <HeartHandshake className="w-3.5 h-3.5" />
                    </span>
                    <label className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                      Message 3: 7-Day Breakup (Day 7)
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    Day +7 Final
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={followup7Draft}
                  onChange={(e) => setFollowup7Draft(e.target.value)}
                  placeholder="Hey {name}, wanted to send one final quick note! Recorded a 45-second screen recording showing exactly how the setup works for your spot. Should I drop the link here or leave you be?"
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed font-sans"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Final touch offering a personalized video preview or graceful signoff</span>
                  <span>{followup7Draft.length} chars</span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-xs text-slate-400">
                All 3 messages will dynamically appear in <strong>Today's Schedule</strong> when cadence reaches each day.
              </span>
              <div className="flex items-center gap-2.5">
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
                  <span>Save 3-Step Sequence</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lead Analysis & Prompt Hub Modal */}
      <LeadAnalysisModal
        isOpen={!!promptModalLeadId}
        onClose={() => setPromptModalLeadId(null)}
        lead={leads.find((l) => l.id === promptModalLeadId) || null}
        channel={channel}
        onSaveAnalysis={handleSaveLeadAnalysis}
      />
    </div>
  );
}
