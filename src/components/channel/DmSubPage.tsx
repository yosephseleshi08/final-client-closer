import React, { useState } from 'react';
import {
  Edit3,
  ExternalLink,
  MessageSquare,
  X,
  FileText,
  Flame,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import { getChannelLabel } from '../../utils/channelStorage';
import { getLocalTodayStr, addDays } from '../../utils/cadenceEngine';
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

  const todayStr = getLocalTodayStr();
  const [year, month, day] = todayStr.split('-').map(Number);
  const todayDate = new Date(year, month - 1, day);
  const todayDayOfWeek = todayDate.getDay(); // 0 = Sun, 6 = Sat
  const tomorrowStr = addDays(todayStr, 1);

  // Sunday Rule:
  // - No warm-ups on Saturday (since Sunday is rest).
  // - Sunday warms up for Monday (tomorrowStr).
  // - Weekdays warm up for tomorrow (tomorrowStr).
  const isSaturday = todayDayOfWeek === 6;
  const isSunday = todayDayOfWeek === 0;

  const leadsNeedingWarmupToday = isSaturday
    ? []
    : leads.filter((l) => {
        if (l.isCompleted || l.initialSentDate) return false;
        return l.scheduledDate === tomorrowStr;
      });

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

  const handleToggleWarmup = (lead: ChannelLead) => {
    const nextVal = !lead.isWarmedUp;
    const nowIso = new Date().toISOString();
    const updated = leads.map((l) => {
      if (l.id === lead.id) {
        return {
          ...l,
          isWarmedUp: nextVal,
          warmedUpAt: nextVal ? nowIso : undefined,
        };
      }
      return l;
    });
    onUpdateLeads(updated);
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

  const getSequenceStepCount = (lead: ChannelLead) => {
    let count = 0;
    if (lead.initialDM || lead.customPitch) count++;
    if (lead.followup3DM) count++;
    if (lead.followup7DM) count++;
    return count;
  };

  const completeSequencesCount = leads.filter(
    (l) => (l.initialDM || l.customPitch) && l.followup3DM && l.followup7DM
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white font-['Outfit']">
            {getChannelLabel(channel)} DM Cadence &amp; Sequences
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

      {/* Warm Up Today Section */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/25 via-slate-900/90 to-slate-900 p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-sm">
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-['Outfit']">
                  🔥 Warm Up Today
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {leadsNeedingWarmupToday.length} Due for Tomorrow
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isSaturday
                  ? 'Saturday Rest Mode: No warm-ups today (Sunday outreach is paused).'
                  : isSunday
                  ? 'Sunday Warm-Up: Warming up prospects scheduled for Monday dispatch.'
                  : 'Warm up these prospects today so they recognize your profile when outreach sends tomorrow.'}
              </p>
            </div>
          </div>
        </div>

        {leadsNeedingWarmupToday.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {isSaturday
                ? 'No warm-ups needed on Saturday. Enjoy your weekend prep!'
                : 'All prospects scheduled for tomorrow are warmed up, or no leads are scheduled for tomorrow.'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {leadsNeedingWarmupToday.map((lead) => (
              <div
                key={lead.id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                  lead.isWarmedUp
                    ? 'border-emerald-500/40 bg-emerald-950/20 shadow-sm'
                    : 'border-amber-500/50 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                      {lead.id}
                    </span>
                    <span className="font-medium text-xs text-slate-200 truncate block font-['Outfit']">
                      {lead.name}
                    </span>
                  </div>
                  <a
                    href={lead.link.startsWith('http') ? lead.link : `https://${lead.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 truncate max-w-[170px]"
                  >
                    <span className="truncate">{lead.link}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleWarmup(lead)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                    lead.isWarmedUp
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/50 shadow-amber-950/40 animate-pulse'
                  }`}
                  title={lead.isWarmedUp ? 'Profile Warmed Up (Click to untoggle)' : 'Mark profile as Warmed Up'}
                >
                  <span>🔥</span>
                  <span>{lead.isWarmedUp ? 'Warmed' : 'Warm Up'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
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
                  <th className="py-3 px-4 text-right w-56">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leads.map((lead) => {
                  const stepCount = getSequenceStepCount(lead);
                  const isSavedJustNow = savedSuccessId === lead.id;
                  const initialMsg = lead.initialDM || lead.customPitch;
                  const step2Msg = lead.followup3DM;
                  const step3Msg = lead.followup7DM;

                  // Warm-Up Logic & Glow Styling:
                  // Glows when lead is in "Warm Up" status:
                  // 1) isWarmedUp is true, OR
                  // 2) Lead is due for warm up today (scheduled for tomorrow, not Saturday)
                  const isDueForWarmupToday =
                    !isSaturday &&
                    lead.scheduledDate === tomorrowStr &&
                    !lead.isCompleted &&
                    !lead.initialSentDate;
                  const isInWarmupStatus = Boolean(lead.isWarmedUp || isDueForWarmupToday);

                  return (
                    <tr
                      key={lead.id}
                      className={`transition-all duration-200 ${
                        isInWarmupStatus
                          ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30 bg-amber-950/10'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* ID */}
                      <td className="py-3.5 px-4 text-left font-mono text-xs tabular-nums">
                        <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                          {lead.id}
                        </span>
                      </td>

                      {/* Name & Link */}
                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-slate-100 font-['Outfit'] truncate max-w-xs">
                            {lead.name}
                          </span>
                          {lead.leadAnalysis && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Analysis Ready
                            </span>
                          )}
                          {lead.scheduledDate && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>{lead.scheduledDate}</span>
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

                      {/* Action Buttons: 🔥 Warm Up replaces Copy DM */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 🔥 Warm Up Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleWarmup(lead)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 border shadow-sm active:scale-95 ${
                              lead.isWarmedUp
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-950/30'
                                : isDueForWarmupToday
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300/80 hover:text-amber-200 border-amber-500/30'
                            }`}
                            title={
                              lead.isWarmedUp
                                ? 'Profile Warmed Up (Click to toggle)'
                                : isDueForWarmupToday
                                ? '🔥 Prospect scheduled for tomorrow: Warm up profile today!'
                                : 'Click to mark profile as Warmed Up'
                            }
                          >
                            <span>🔥</span>
                            <span>{lead.isWarmedUp ? 'Warmed Up' : 'Warm Up'}</span>
                          </button>

                          {/* Prompt Hub */}
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

                          {/* Write/Edit 3-Step */}
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
              {selectedLead.city && (
                <button
                  type="button"
                  onClick={() => insertToken(selectedLead.city!, '1')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-indigo-300 cursor-pointer"
                >
                  City
                </button>
              )}
            </div>

            {/* Sequence Steps Navigation Tabs */}
            <div className="flex border-b border-white/10 gap-2">
              <button
                type="button"
                onClick={() => setActiveStepTab('all')}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition ${
                  activeStepTab === 'all'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                All 3 Steps (Full View)
              </button>
              <button
                type="button"
                onClick={() => setActiveStepTab('step1')}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition ${
                  activeStepTab === 'step1'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Initial DM
              </button>
              <button
                type="button"
                onClick={() => setActiveStepTab('step2')}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition ${
                  activeStepTab === 'step2'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                2. 3-Day Bump
              </button>
              <button
                type="button"
                onClick={() => setActiveStepTab('step3')}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition ${
                  activeStepTab === 'step3'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                3. 7-Day Breakup
              </button>
            </div>

            {/* Editor Forms */}
            <div className="space-y-4">
              {/* Step 1: Initial DM */}
              {(activeStepTab === 'all' || activeStepTab === 'step1') && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <span>1. Initial Outreach DM (Day 1)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Under 75 words</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {initialDraft.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={initialDraft}
                    onChange={(e) => setInitialDraft(e.target.value)}
                    placeholder={`Hey ${selectedLead.name} team, noticed your online ordering link leads to a 404 on mobile. Made a quick clean mockup solving this. Mind if I send the live link?`}
                    className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              )}

              {/* Step 2: 3-Day Bump */}
              {(activeStepTab === 'all' || activeStepTab === 'step2') && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span>2. 3-Day Value Follow-Up</span>
                      <span className="text-[10px] text-slate-500 font-normal">Under 60 words</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {followup3Draft.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={followup3Draft}
                    onChange={(e) => setFollowup3Draft(e.target.value)}
                    placeholder={`Hey ${selectedLead.name}, put together a 30-sec video breakdown of how the checkout flow is leaking table reservations. Would that be helpful to see?`}
                    className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>
              )}

              {/* Step 3: 7-Day Breakup */}
              {(activeStepTab === 'all' || activeStepTab === 'step3') && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <span>3. 7-Day Breakup Message</span>
                      <span className="text-[10px] text-slate-500 font-normal">Under 45 words</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {followup7Draft.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={followup7Draft}
                    onChange={(e) => setFollowup7Draft(e.target.value)}
                    placeholder={`Assume this isn't a priority right now, ${selectedLead.name}. I'll archive the mockup on Friday. If you ever want to fix the booking leak, just reach out!`}
                    className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500 font-sans"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedLeadId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePitch}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Save 3-Step Sequence</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Hub Modal */}
      {promptModalLeadId && (
        <LeadAnalysisModal
          isOpen={Boolean(promptModalLeadId)}
          lead={leads.find((l) => l.id === promptModalLeadId) || null}
          onClose={() => setPromptModalLeadId(null)}
          onSaveAnalysis={handleSaveLeadAnalysis}
        />
      )}
    </div>
  );
}
