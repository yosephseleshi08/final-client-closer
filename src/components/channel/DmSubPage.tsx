import React, { useState } from 'react';
import {
  Edit3,
  ExternalLink,
  X,
  FileText,
  Flame,
  CheckCircle2,
  Calendar,
  Lock,
  Unlock,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Facebook,
  Instagram,
  Mail,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import { getChannelLabel, getPlatformLink, getLeadFacebook, getLeadEmail, getBlindRouteLink } from '../../utils/channelStorage';
import { TestLinkButton } from '../TestLinkButton';
import {
  getLocalTodayStr,
  getTomorrowWarmupTargetDate,
  isLeadWarmed,
  isEmailOnlyLead,
  getTouchpointChannel,
  getTouchpointLabel,
} from '../../utils/cadenceEngine';
import { LeadAnalysisModal } from './LeadAnalysisModal';

interface DmSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
}

export function DmSubPage({ channel, leads, onUpdateLeads }: DmSubPageProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [promptModalLeadId, setPromptModalLeadId] = useState<string | null>(null);

  // 4-Step Cadence States (Manual Writing & Storage)
  const [initialDraft, setInitialDraft] = useState('');
  const [followup7Draft, setFollowup7Draft] = useState('');
  const [followup14Draft, setFollowup14Draft] = useState('');
  const [breakup30Draft, setBreakup30Draft] = useState('');
  const [activeStepTab, setActiveStepTab] = useState<'all' | 'step1' | 'step2' | 'step3' | 'step4'>('all');
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);

  const todayStr = getLocalTodayStr();
  const warmupTargetDate = getTomorrowWarmupTargetDate(todayStr);

  const [year, month, day] = todayStr.split('-').map(Number);
  const todayDate = new Date(year, month - 1, day);
  const todayDayOfWeek = todayDate.getDay(); // 0 = Sun, 6 = Sat
  const isSaturday = todayDayOfWeek === 6;
  const isSunday = todayDayOfWeek === 0;

  // STRICT RULE: This tab must ONLY display leads scheduled for TOMORROW.
  // Email-only leads do NOT require warm-up and must NOT be displayed here.
  const tomorrowLeads = leads.filter((l) => {
    if (l.isCompleted || l.initialSentDate) return false;
    if (isEmailOnlyLead(l)) return false; // Strict: Warm-Up Tab must ONLY display Instagram & Facebook leads
    return l.scheduledDate === warmupTargetDate;
  });

  const warmedCount = tomorrowLeads.filter((l) => isLeadWarmed(l)).length;
  const lockedCount = tomorrowLeads.length - warmedCount;
  const selectedLead = tomorrowLeads.find((l) => l.id === selectedLeadId);

  const handleOpenPitchEditor = (lead: ChannelLead) => {
    setSelectedLeadId(lead.id);
    setInitialDraft(lead.initialDM || lead.customPitch || '');
    setFollowup7Draft(lead.followupDM_Day7 || lead.followup3DM || '');
    setFollowup14Draft(lead.followupDM_Day14 || lead.followup7DM || '');
    setBreakup30Draft(lead.breakupDM_Day30 || '');
    setActiveStepTab('all');
  };

  const handleSavePitch = () => {
    if (!selectedLeadId) return;

    const trimmedInitial = initialDraft.trim();
    const trimmed7 = followup7Draft.trim();
    const trimmed14 = followup14Draft.trim();
    const trimmed30 = breakup30Draft.trim();

    const updated = leads.map((l) => {
      if (l.id === selectedLeadId) {
        return {
          ...l,
          initialDM: trimmedInitial || undefined,
          followupDM_Day7: trimmed7 || undefined,
          followupDM_Day14: trimmed14 || undefined,
          breakupDM_Day30: trimmed30 || undefined,
          followup3DM: trimmed7 || undefined,
          followup7DM: trimmed14 || undefined,
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

  // Warm-Up Gate Toggle: Strictly sets warmupStatus to 'warmed' or 'locked'
  const handleToggleWarmup = (lead: ChannelLead) => {
    const isCurrentlyWarmed = isLeadWarmed(lead);
    const nextVal = !isCurrentlyWarmed;
    const nowIso = new Date().toISOString();
    const updated = leads.map((l) => {
      if (l.id === lead.id) {
        return {
          ...l,
          warmupStatus: nextVal ? ('warmed' as const) : ('locked' as const),
          isWarmedUp: nextVal,
          warmedUpAt: nextVal ? nowIso : undefined,
        };
      }
      return l;
    });
    onUpdateLeads(updated);
  };

  const handleCopyDm = (lead: ChannelLead) => {
    const dmContent =
      lead.initialDM ||
      lead.customPitch ||
      `Hey ${lead.name} team, loved your restaurant! We put together a high-converting interactive web mockup for you. Would love to send over the link!`;
    navigator.clipboard.writeText(dmContent);
    setCopiedLeadId(lead.id);
    setTimeout(() => setCopiedLeadId(null), 2000);
  };

  const insertToken = (token: string, targetStep?: '1' | '2' | '3' | '4') => {
    if (!targetStep || targetStep === '1') {
      setInitialDraft((prev) => (prev ? `${prev} ${token}` : token));
    }
    if (targetStep === '2') {
      setFollowup7Draft((prev) => (prev ? `${prev} ${token}` : token));
    }
    if (targetStep === '3') {
      setFollowup14Draft((prev) => (prev ? `${prev} ${token}` : token));
    }
    if (targetStep === '4') {
      setBreakup30Draft((prev) => (prev ? `${prev} ${token}` : token));
    }
  };

  const getSequenceStepCount = (lead: ChannelLead) => {
    let count = 0;
    if (lead.initialDM || lead.customPitch) count++;
    if (lead.followupDM_Day7 || lead.followup3DM) count++;
    if (lead.followupDM_Day14 || lead.followup7DM) count++;
    if (lead.breakupDM_Day30) count++;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Header Deck: Daily Warm-Up Cycle Notice */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900/95 to-slate-900/95 p-5 sm:p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/50">
              <Flame className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                  🔥 Warm-Up Today ({getChannelLabel(channel)})
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                  Target Dispatch: {warmupTargetDate} {isSaturday ? '(Monday)' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily Cycle: Warm up tomorrow's leads today. Once warmed, their dispatch buttons unlock automatically tomorrow morning.
              </p>
            </div>
          </div>
        </div>

        {/* Status Counter Chips */}
        <div className="flex items-center gap-3 text-xs font-mono self-start md:self-auto flex-wrap">
          <div className="bg-slate-950/70 border border-white/10 px-3.5 py-2 rounded-xl flex items-center gap-2">
            <span className="text-slate-400 font-sans">Tomorrow's Leads:</span>
            <strong className="text-white font-bold">{tomorrowLeads.length}</strong>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl flex items-center gap-2 text-emerald-300 font-bold">
            <span>🔥 Warmed:</span>
            <span>{warmedCount}</span>
          </div>
          {lockedCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-xl flex items-center gap-2 text-amber-300 font-bold animate-pulse">
              <span>🔒 Need Warm-Up:</span>
              <span>{lockedCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Daily Cycle Rule Explainer Banner */}
      <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-2.5 text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="space-y-0.5">
            <span className="font-bold text-white">Strict Daily Cadence Gate:</span>
            <span className="text-slate-400 ml-1">
              Engage with these prospects on social/web today and click <strong>"Mark as Warmed"</strong>. Tomorrow morning, their dispatch buttons will be unlocked and ready for 1-click outreach.
            </span>
          </div>
        </div>
        <div className="text-[11px] font-mono text-slate-500 shrink-0">
          Future days (Wed, Thu, etc.) remain hidden until their designated warm-up eve.
        </div>
      </div>

      {/* Main Queue: ONLY Tomorrow's Leads */}
      {tomorrowLeads.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-white/10 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-200 font-['Outfit']">
              {isSunday
                ? 'Sunday Rest Mode: No warm-ups scheduled today'
                : isSaturday
                ? 'All Monday prospects are warmed up, or none are scheduled for Monday'
                : 'No leads scheduled for tomorrow (or all already warmed up)'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              This tab strictly isolates tomorrow's scheduled outreach ({warmupTargetDate}). Prospects scheduled for future days will appear here the day before their scheduled dispatch.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span className="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Tomorrow's Queue ({tomorrowLeads.length} Total Leads for {warmupTargetDate})</span>
            </span>
            <span className="text-slate-500">
              Strict Gate: Only leads scheduled for {warmupTargetDate} are accessible
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {tomorrowLeads.map((lead) => {
              const isWarmed = isLeadWarmed(lead);
              const stepCount = getSequenceStepCount(lead);
              const isSavedJustNow = savedSuccessId === lead.id;
              const initialMsg = lead.initialDM || lead.customPitch;

              const fbLink = getLeadFacebook(lead);
              const emailLink = getLeadEmail(lead);
              const warmupTargetLink = fbLink || lead.link;
              const warmupHref = getPlatformLink(warmupTargetLink, 'facebook');

              return (
                <div
                  key={lead.id}
                  className={`rounded-2xl border p-4.5 sm:p-5 transition-all shadow-xl space-y-3.5 ${
                    isWarmed
                      ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-slate-900/90 to-slate-900'
                      : 'border-amber-500/50 bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-slate-900 ring-1 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                  }`}
                >
                  {/* Lead Row Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                        {lead.id}
                      </span>
                      <h3 className="font-bold text-white text-base font-['Outfit']">
                        {lead.name}
                      </h3>

                      {/* Warm-Up Status Pill */}
                      {isWarmed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>🔥 WARMED UP (Dispatch Unlocked Tomorrow)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>🔒 LOCKED (Warm-Up Required Before Dispatch)</span>
                        </span>
                      )}

                      {lead.scheduledDate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 bg-white/5 border border-white/10">
                          <Calendar className="w-3 h-3" />
                          <span>Scheduled: {lead.scheduledDate}</span>
                        </span>
                      )}

                      {lead.fb_message_restricted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                          ✉️ Email Dispatch Default
                        </span>
                      )}
                    </div>

                    {/* Warm-Up Social Link & Test Link (Blind Route Enforcement) */}
                    {(() => {
                      const route = getBlindRouteLink(lead, 'warmup');
                      if (!route) {
                        return (
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                              ✉️ Email Dispatch Ready
                            </span>
                          </div>
                        );
                      }

                      const isFb = route.channelType === 'facebook';
                      return (
                        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                          <a
                            href={route.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 text-xs transition-colors px-3 py-1.5 rounded-xl border font-semibold ${
                              isFb
                                ? 'text-sky-300 hover:text-white bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/30'
                                : 'text-pink-300 hover:text-white bg-pink-500/15 hover:bg-pink-500/25 border-pink-500/30'
                            }`}
                            title={`${route.actionLabel}: ${route.link}`}
                          >
                            {isFb ? (
                              <Facebook className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            ) : (
                              <Instagram className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                            )}
                            <span className="font-bold text-[10px] bg-white/10 px-1 py-0.2 rounded font-mono">
                              {route.badgeLabel}
                            </span>
                            <span className="truncate max-w-xs">{route.link}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          </a>
                          <TestLinkButton lead={lead} platform={route.channelType} label={`Test ${route.badgeLabel}`} />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Warm-Up Action Bar & Message Script Preview */}
                  <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-300 font-mono text-[11px]">
                          Cadence Status:
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            stepCount === 4
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : stepCount > 0
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-white/5 text-slate-400 border-white/10'
                          }`}
                        >
                          {stepCount === 4 ? '✓ 4/4 Steps Ready' : `${stepCount}/4 Steps Set`}
                        </span>
                      </div>

                      {initialMsg && (
                        <button
                          type="button"
                          onClick={() => handleCopyDm(lead)}
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-white transition cursor-pointer"
                        >
                          {copiedLeadId === lead.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Initial DM</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {initialMsg ? (
                      <p className="text-xs text-slate-300 italic bg-slate-900/80 p-2.5 rounded-lg border border-white/5 leading-relaxed font-sans">
                        "{initialMsg}"
                      </p>
                    ) : (
                      <div className="text-xs text-slate-500 flex items-center gap-2 py-1">
                        <FileText className="w-3.5 h-3.5 opacity-60" />
                        <span>No custom pitch written yet (standard hook will be used)</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
                    <div className="text-xs text-slate-400 font-sans">
                      {isWarmed ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Profile warmed! Dispatch button will be active tomorrow morning.</span>
                        </span>
                      ) : (
                        <span className="text-amber-300 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Engage prospect profile, then click "Mark as Warmed" to unlock dispatch.</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                      {/* Write/Edit 4-Step Cadence */}
                      <button
                        type="button"
                        onClick={() => handleOpenPitchEditor(lead)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border border-white/10"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{stepCount > 0 ? 'Edit 4-Step' : 'Write 4-Step'}</span>
                      </button>

                      {/* Prompt Hub */}
                      <button
                        type="button"
                        onClick={() => setPromptModalLeadId(lead.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border shadow-sm ${
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

                      {/* THE PRIMARY GATE: Toggle Warm-Up Status */}
                      <button
                        type="button"
                        onClick={() => handleToggleWarmup(lead)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 ${
                          isWarmed
                            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-emerald-950/40'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/50 ring-2 ring-amber-400/50 animate-pulse'
                        }`}
                      >
                        <Flame className={`w-4 h-4 ${isWarmed ? 'text-emerald-400' : 'fill-slate-950 text-slate-950'}`} />
                        <span>{isWarmed ? '✓ Warmed (Click to Lock)' : '🔥 Mark as Warmed'}</span>
                      </button>
                    </div>
                  </div>

                  {isSavedJustNow && (
                    <div className="text-[11px] text-emerald-400 font-semibold">
                      ✓ 4-Step Cadence Saved Successfully!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4-Step Cadence Editor Modal */}
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
                    4-Step Cadence: {selectedLead.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Draft all 4 touchpoints across the cadence for {getChannelLabel(channel)}. Each message is intelligently routed based on prospect channels.
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
              <span className="text-[11px] font-semibold text-slate-500">Insert token:</span>
              <button
                type="button"
                onClick={() => insertToken(selectedLead.name, activeStepTab === 'step2' ? '2' : activeStepTab === 'step3' ? '3' : activeStepTab === 'step4' ? '4' : '1')}
                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-indigo-300 cursor-pointer"
              >
                Lead Name
              </button>
              {selectedLead.city && (
                <button
                  type="button"
                  onClick={() => insertToken(selectedLead.city!, activeStepTab === 'step2' ? '2' : activeStepTab === 'step3' ? '3' : activeStepTab === 'step4' ? '4' : '1')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-indigo-300 cursor-pointer"
                >
                  City
                </button>
              )}
            </div>

            {/* Cadence Steps Navigation Tabs */}
            <div className="flex border-b border-white/10 gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveStepTab('all')}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
                  activeStepTab === 'all'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                All 4 Steps
              </button>
              <button
                type="button"
                onClick={() => setActiveStepTab('step1')}
                className={`pb-2 px-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1 ${
                  activeStepTab === 'step1'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>1. Initial DM (Day 0)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStepTab('step2')}
                className={`pb-2 px-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1 ${
                  activeStepTab === 'step2'
                    ? 'border-amber-500 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>2. Day 7 Follow-Up</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStepTab('step3')}
                className={`pb-2 px-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1 ${
                  activeStepTab === 'step3'
                    ? 'border-purple-500 text-purple-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>3. Day 14 Follow-Up</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStepTab('step4')}
                className={`pb-2 px-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1 ${
                  activeStepTab === 'step4'
                    ? 'border-rose-500 text-rose-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>4. Day 30 Breakup</span>
              </button>
            </div>

            {/* Editor Forms with Limits */}
            <div className="space-y-4">
              {/* Step 1: Initial DM (Day 0) - Limit: under 280 characters */}
              {(activeStepTab === 'all' || activeStepTab === 'step1') && (() => {
                const charCount = initialDraft.length;
                const isOverLimit = charCount > 280;
                const channelLabel = getTouchpointLabel(selectedLead, 0);
                return (
                  <div className={`p-3.5 rounded-xl bg-slate-950/60 border space-y-1.5 transition ${
                    isOverLimit ? 'border-rose-500/60 ring-1 ring-rose-500/40' : 'border-white/10'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                        <span>1. Initial DM (Day 0)</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {channelLabel}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">Max 280 characters</span>
                      </label>
                      <span className={`text-[10px] font-mono font-bold ${isOverLimit ? 'text-rose-400' : 'text-slate-400'}`}>
                        {charCount} / 280 chars {isOverLimit && '⚠️ OVER LIMIT'}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={initialDraft}
                      onChange={(e) => setInitialDraft(e.target.value)}
                      placeholder={`Hey ${selectedLead.name} team! I just posted a quick video on my story/feed breaking down your menu design/website. Mind if I send the direct link here?`}
                      className={`w-full p-2.5 bg-slate-900 border rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none font-sans ${
                        isOverLimit ? 'border-rose-500 focus:border-rose-400' : 'border-white/10 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                );
              })()}

              {/* Step 2: Day 7 Follow-Up - Limit: under 60 words */}
              {(activeStepTab === 'all' || activeStepTab === 'step2') && (() => {
                const words = followup7Draft.trim().split(/\s+/).filter(Boolean).length;
                const isOverLimit = words > 60;
                const channelLabel = getTouchpointLabel(selectedLead, 1);
                return (
                  <div className={`p-3.5 rounded-xl bg-slate-950/60 border space-y-1.5 transition ${
                    isOverLimit ? 'border-rose-500/60 ring-1 ring-rose-500/40' : 'border-white/10'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-xs font-bold text-amber-300 flex items-center gap-2">
                        <span>2. Day 7 Follow-Up</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {channelLabel}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">Max 60 words</span>
                      </label>
                      <span className={`text-[10px] font-mono font-bold ${isOverLimit ? 'text-rose-400' : 'text-slate-400'}`}>
                        {words} / 60 words {isOverLimit && '⚠️ OVER LIMIT'}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={followup7Draft}
                      onChange={(e) => setFollowup7Draft(e.target.value)}
                      placeholder={`Hey ${selectedLead.name}, did you get a chance to see that breakdown video? We just put together a quick PDF on 3 ways to speed up kitchen ticket times on Friday nights—want me to drop it here?`}
                      className={`w-full p-2.5 bg-slate-900 border rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none font-sans ${
                        isOverLimit ? 'border-rose-500 focus:border-rose-400' : 'border-white/10 focus:border-amber-500'
                      }`}
                    />
                  </div>
                );
              })()}

              {/* Step 3: Day 14 Follow-Up - Limit: under 60 words */}
              {(activeStepTab === 'all' || activeStepTab === 'step3') && (() => {
                const words = followup14Draft.trim().split(/\s+/).filter(Boolean).length;
                const isOverLimit = words > 60;
                const channelLabel = getTouchpointLabel(selectedLead, 2);
                return (
                  <div className={`p-3.5 rounded-xl bg-slate-950/60 border space-y-1.5 transition ${
                    isOverLimit ? 'border-rose-500/60 ring-1 ring-rose-500/40' : 'border-white/10'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-xs font-bold text-purple-300 flex items-center gap-2">
                        <span>3. Day 14 Follow-Up</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {channelLabel}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">Max 60 words</span>
                      </label>
                      <span className={`text-[10px] font-mono font-bold ${isOverLimit ? 'text-rose-400' : 'text-slate-400'}`}>
                        {words} / 60 words {isOverLimit && '⚠️ OVER LIMIT'}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={followup14Draft}
                      onChange={(e) => setFollowup14Draft(e.target.value)}
                      placeholder={`Hey ${selectedLead.name}! Quick update—another spot in ${selectedLead.city || 'your area'} implemented that online ordering tweak from the video and saw a 12% jump in takeout orders last week. Thought of you guys!`}
                      className={`w-full p-2.5 bg-slate-900 border rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none font-sans ${
                        isOverLimit ? 'border-rose-500 focus:border-rose-400' : 'border-white/10 focus:border-purple-500'
                      }`}
                    />
                  </div>
                );
              })()}

              {/* Step 4: Day 30 Breakup - Limit: under 60 words */}
              {(activeStepTab === 'all' || activeStepTab === 'step4') && (() => {
                const words = breakup30Draft.trim().split(/\s+/).filter(Boolean).length;
                const isOverLimit = words > 60;
                const channelLabel = getTouchpointLabel(selectedLead, 3);
                return (
                  <div className={`p-3.5 rounded-xl bg-slate-950/60 border space-y-1.5 transition ${
                    isOverLimit ? 'border-rose-500/60 ring-1 ring-rose-500/40' : 'border-white/10'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-xs font-bold text-rose-300 flex items-center gap-2">
                        <span>4. Day 30 Breakup</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {channelLabel}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">Max 60 words</span>
                      </label>
                      <span className={`text-[10px] font-mono font-bold ${isOverLimit ? 'text-rose-400' : 'text-slate-400'}`}>
                        {words} / 60 words {isOverLimit && '⚠️ OVER LIMIT'}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={breakup30Draft}
                      onChange={(e) => setBreakup30Draft(e.target.value)}
                      placeholder={`Hey ${selectedLead.name}, I know you're super busy running service. I'm archiving our video breakdown this week, but I recorded a quick 60-second Loom showing the #1 leak on your mobile checkout. Should I send the Loom or close your file?`}
                      className={`w-full p-2.5 bg-slate-900 border rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none font-sans ${
                        isOverLimit ? 'border-rose-500 focus:border-rose-400' : 'border-white/10 focus:border-rose-500'
                      }`}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedLeadId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePitch}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Save 4-Step Cadence</span>
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
