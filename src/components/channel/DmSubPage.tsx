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
import { getChannelLabel } from '../../utils/channelStorage';

interface DmSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
}

export function DmSubPage({ channel, leads, onUpdateLeads }: DmSubPageProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [pitchDraft, setPitchDraft] = useState('');
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  const handleOpenPitchEditor = (lead: ChannelLead) => {
    setSelectedLeadId(lead.id);
    setPitchDraft(lead.customPitch || '');
  };

  const handleSavePitch = () => {
    if (!selectedLeadId) return;

    const updated = leads.map((l) => {
      if (l.id === selectedLeadId) {
        return {
          ...l,
          customPitch: pitchDraft.trim(),
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

  const handleCopyPitch = (lead: ChannelLead) => {
    if (!lead.customPitch) return;
    navigator.clipboard.writeText(lead.customPitch);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const insertToken = (token: string) => {
    setPitchDraft((prev) => `${prev} ${token} `);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white font-['Outfit']">
            {getChannelLabel(channel)} Direct Messages & Outreach Pitches
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Craft, customize, and bind dedicated pitches directly to each Lead ID.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Pitches written:{' '}
          <span className="text-indigo-400 font-bold">
            {leads.filter((l) => !!l.customPitch).length}
          </span>{' '}
          / {leads.length}
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No leads available for DM authoring</p>
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
                  <th className="py-3 px-4 text-left w-32">Lead ID</th>
                  <th className="py-3 px-4 text-left w-64">Name</th>
                  <th className="py-3 px-4 text-left">Pitch Status & Preview</th>
                  <th className="py-3 px-4 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leads.map((lead) => {
                  const hasPitch = Boolean(lead.customPitch && lead.customPitch.trim().length > 0);
                  const isSavedJustNow = savedSuccessId === lead.id;
                  const isCopied = copiedId === lead.id;

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
                        <div className="font-medium text-sm text-slate-100 font-['Outfit'] truncate max-w-xs">
                          {lead.name}
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

                      {/* Pitch Status & Snippet */}
                      <td className="py-3.5 px-4 text-left">
                        {hasPitch ? (
                          <div className="space-y-1">
                            <p className="text-xs text-slate-300 line-clamp-2 italic bg-slate-950/40 p-2 rounded-lg border border-white/5">
                              "{lead.customPitch}"
                            </p>
                            {lead.pitchSavedAt && (
                              <span className="text-[10px] text-slate-500">
                                Saved {new Date(lead.pitchSavedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 opacity-60" />
                            <span>No pitch drafted yet</span>
                          </span>
                        )}
                      </td>

                      {/* Action: Edit Pitch Button & Copy */}
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
                              title="Copy pitch to clipboard"
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
                            <span>{hasPitch ? 'Edit Pitch' : 'Write Pitch'}</span>
                          </button>
                        </div>

                        {isSavedJustNow && (
                          <div className="text-[10px] text-emerald-400 font-semibold mt-1">
                            Pitch Saved!
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

      {/* Pitch Editor Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
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
                  Compose the custom DM copy that will persist and stay bound to Lead #{selectedLead.id}.
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

            {/* Quick Helper Tokens */}
            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500">Insert:</span>
              <button
                type="button"
                onClick={() => insertToken(selectedLead.name)}
                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-indigo-300 cursor-pointer"
              >
                {selectedLead.name}
              </button>
              <button
                type="button"
                onClick={() => insertToken(selectedLead.link)}
                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-indigo-300 cursor-pointer"
              >
                Link
              </button>
              <button
                type="button"
                onClick={() =>
                  setPitchDraft(
                    `Hey ${selectedLead.name}! Love what you're doing. Built a 0.3s interactive prototype for you: mind if I share the 20-second preview?`
                  )
                }
                className="px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-[11px] text-indigo-300 cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Quick Template</span>
              </button>
            </div>

            {/* Textarea */}
            <div>
              <textarea
                rows={6}
                value={pitchDraft}
                onChange={(e) => setPitchDraft(e.target.value)}
                placeholder="Write your custom outreach DM here..."
                className="w-full p-4 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                <span>
                  Words: <strong className="text-slate-400">{pitchDraft.trim() ? pitchDraft.trim().split(/\s+/).length : 0}</strong>
                </span>
                <span>
                  Characters: <strong className="text-slate-400">{pitchDraft.length}</strong>
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
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
                <span>Save Pitch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
