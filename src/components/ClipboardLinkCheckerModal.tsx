import React, { useState, useEffect } from 'react';
import {
  X,
  ClipboardCheck,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Facebook,
  MapPin,
  Instagram,
  Globe,
  ArrowRight,
  Copy,
  Check,
  Search
} from 'lucide-react';
import { Lead, RejectedLeadEntry } from '../types';
import { checkLeadUrlStatus, removeRejectedLead, LinkValidationResult } from '../utils/linkDeduplicator';
import { buildOutreachPitch } from '../utils/linkLeadParser';
import { playWarningChime, playSuccessChime } from '../utils/soundEffects';

interface ClipboardLinkCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  onAddLead: (lead: Omit<Lead, 'id'>) => Lead | void;
  onUpdateLead?: (updated: Lead) => void;
  showToast: (msg: string) => void;
  initialUrl?: string;
}

export const ClipboardLinkCheckerModal: React.FC<ClipboardLinkCheckerModalProps> = ({
  isOpen,
  onClose,
  leads,
  onAddLead,
  showToast,
  initialUrl = '',
}) => {
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [result, setResult] = useState<LinkValidationResult | null>(null);
  const [destinationPage, setDestinationPage] = useState<'Instagram' | 'Facebook' | 'Email'>('Instagram');
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [isReadingClipboard, setIsReadingClipboard] = useState(false);

  // When opened, if initialUrl is present or if user opens, automatically test
  useEffect(() => {
    if (isOpen) {
      if (initialUrl) {
        setInputUrl(initialUrl);
        analyzeUrl(initialUrl);
      } else {
        readClipboardAutomatically();
      }
    } else {
      setResult(null);
      setInputUrl('');
    }
  }, [isOpen, initialUrl]);

  const readClipboardAutomatically = async () => {
    setIsReadingClipboard(true);
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setInputUrl(text.trim());
          analyzeUrl(text.trim());
        }
      }
    } catch (_e) {
      // Permission denied or not supported; user can manually paste into the input
    } finally {
      setIsReadingClipboard(false);
    }
  };

  const analyzeUrl = (url: string) => {
    const check = checkLeadUrlStatus(url, leads);
    setResult(check);
    if (check.isRejected) {
      playWarningChime();
    }
    // Auto-select initial destination page based on link type
    const lower = url.toLowerCase().trim();
    if (lower.includes('instagram.com') || lower.startsWith('@')) {
      setDestinationPage('Instagram');
    } else if (lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.me')) {
      setDestinationPage('Facebook');
    } else {
      setDestinationPage('Email');
    }
  };

  const handleInputChange = (val: string) => {
    setInputUrl(val);
    if (val.trim()) {
      analyzeUrl(val.trim());
    } else {
      setResult(null);
    }
  };

  const handleUnreject = (rejectedEntry: RejectedLeadEntry) => {
    removeRejectedLead(rejectedEntry.id);
    showToast(`🔄 Restored "${rejectedEntry.businessName}" from rejected list!`);
    analyzeUrl(inputUrl);
  };

  const handleAddAsFreshLead = () => {
    if (!result || !result.rawUrl) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const pitch = buildOutreachPitch(result.detectedName, undefined, result.rawUrl);

    onAddLead({
      restaurantName: result.detectedName,
      platform: destinationPage,
      profileUrl: result.rawUrl,
      handle: result.rawUrl,
      city: 'Local Area',
      createdAt: new Date().toISOString(),
      dateFirstContact: todayStr,
      lastContactDate: '',
      nextFollowupDate: null,
      followupCount: 0,
      status: 'not_sent',
      notes: `Imported via Copied Link Inspector to ${destinationPage} Leads on ${todayStr}`,
      pitchHook: pitch,
      stagedDmMiniPitch: pitch,
    });

    playSuccessChime();
    showToast(`✅ Saved ${result.detectedName} (Not Sent) directly to ${destinationPage} Leads page!`);
    onClose();
  };


  const handleCopyPitchOnly = () => {
    if (!result) return;
    const pitch = buildOutreachPitch(result.detectedName, undefined, result.rawUrl);
    navigator.clipboard.writeText(pitch);
    setCopiedPitch(true);
    showToast(`📋 Copied outreach pitch for "${result.detectedName}"!`);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-7 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
              <ClipboardCheck className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  LINK DEDUPLICATOR & REJECTION DETECTOR
                </span>
              </div>
              <h3 className="text-xl font-black text-white font-['Outfit'] mt-0.5">
                Inspect Copied Link
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search / Paste Input */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Paste any Facebook or Google Maps URL to check:</span>
            <button
              type="button"
              onClick={readClipboardAutomatically}
              disabled={isReadingClipboard}
              className="text-indigo-400 hover:text-indigo-300 font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span>{isReadingClipboard ? 'Reading...' : 'Paste from Clipboard'}</span>
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="e.g. https://www.facebook.com/joespizza or https://maps.app.goo.gl/..."
              className="w-full rounded-2xl border border-white/15 bg-black/60 py-3.5 pl-4 pr-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono shadow-inner"
              autoFocus
            />
            {inputUrl && (
              <button
                type="button"
                onClick={() => {
                  setInputUrl('');
                  setResult(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Inspection Results Display */}
        <div className="mt-5">
          {!result || result.status === 'empty' ? (
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-6 text-center text-slate-400">
              <Search className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs">
                Copy a link from Facebook or Google Maps, then click <strong>"Paste from Clipboard"</strong> or paste it above to see if you previously reached out or rejected it.
              </p>
            </div>
          ) : result.status === 'rejected' ? (
            /* 1. REJECTED LEAD ALERT */
            <div className="rounded-3xl border-2 border-rose-500/50 bg-gradient-to-b from-rose-950/40 to-slate-950/80 p-5 shadow-xl shadow-rose-950/30 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-600/40 shrink-0">
                  <Ban className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      ALREADY REJECTED LEAD DETECTED
                    </span>
                    <span className="text-xs text-rose-300 font-bold">
                      {result.rejectedEntry?.platform || result.platform}
                    </span>
                  </div>

                  <h4 className="text-xl font-black text-white font-['Outfit'] mt-1">
                    {result.rejectedEntry?.businessName || result.detectedName}
                  </h4>

                  <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-950/30 p-3 space-y-1.5 text-xs text-rose-200">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Date Rejected:</span>
                      <strong className="text-white font-mono">
                        {result.rejectedEntry?.rejectedAt || 'Previously'}
                      </strong>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-400">Rejection Reason:</span>
                      <strong className="text-rose-300 text-right font-medium">
                        "{result.rejectedEntry?.rejectionReason || 'Closed Dead / Not Interested'}"
                      </strong>
                    </div>
                    {result.rejectedEntry?.notes && (
                      <div className="text-[11px] text-slate-300 italic pt-1 border-t border-rose-500/20">
                        Notes: {result.rejectedEntry.notes}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 rounded-xl bg-black/40 p-2.5 border border-white/5 text-[11px] font-mono text-slate-400 truncate">
                    🔗 {result.rawUrl}
                  </div>

                  <p className="mt-3 text-xs text-rose-300 font-semibold leading-relaxed">
                    ⚠️ You already copied this exact {result.platform} link and marked it as rejected. Skipping outreach saves your precious time!
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/10">
                    {result.rejectedEntry && (
                      <button
                        type="button"
                        onClick={() => handleUnreject(result.rejectedEntry!)}
                        className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-bold text-slate-200 transition cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                        <span>Un-reject / Restore Lead</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2 text-xs font-black text-white shadow-lg shadow-rose-600/30 transition cursor-pointer active:scale-95"
                    >
                      <Check className="h-4 w-4" />
                      <span>Good Catch, Skip Lead</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : result.status === 'duplicate_active' ? (
            /* 2. ALREADY IN PIPELINE (ACTIVE DUPLICATE) */
            <div className="rounded-3xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/30 to-slate-950/80 p-5 shadow-xl shadow-amber-950/30 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-lg shadow-amber-600/40 shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      LEAD ALREADY IN PIPELINE
                    </span>
                    <span className="text-xs text-amber-300 font-bold">
                      Stage: {result.existingLead?.status.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="text-xl font-black text-white font-['Outfit'] mt-1">
                    {result.detectedName}
                  </h4>

                  <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-950/30 p-3 space-y-1 text-xs text-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">First Contacted:</span>
                      <strong className="text-white font-mono">{result.existingLead?.dateFirstContact || 'N/A'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Touchpoints:</span>
                      <strong className="text-white font-mono">{result.existingLead?.followupCount || 0} sent</strong>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-amber-300 leading-relaxed">
                    This business is already in your active outreach CRM. You don't need to add it again.
                  </p>

                  <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2 text-xs font-black text-white shadow-lg transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 3. FRESH LEAD (READY TO SAVE) */
            <div className="rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-b from-emerald-950/30 to-slate-950/80 p-5 shadow-xl shadow-emerald-950/30 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      100% FRESH LEAD (NEVER REJECTED)
                    </span>
                    <span className="text-xs text-emerald-300 font-bold">{result.platform}</span>
                  </div>

                  <h4 className="text-xl font-black text-white font-['Outfit'] mt-1">
                    {result.detectedName}
                  </h4>

                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    Awesome! This lead is brand new and not in your active CRM or rejected archive.
                  </p>

                  {/* Choose destination page */}
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">
                        📁 Store In Page:
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-400">
                        {destinationPage} Leads Page
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDestinationPage('Instagram')}
                        className={`rounded-xl py-1.5 px-2 text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          destinationPage === 'Instagram'
                            ? 'border-pink-500 bg-pink-500/20 text-white'
                            : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Instagram className="h-3.5 w-3.5 text-pink-400" />
                        <span>Instagram</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDestinationPage('Facebook')}
                        className={`rounded-xl py-1.5 px-2 text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          destinationPage === 'Facebook'
                            ? 'border-blue-500 bg-blue-500/20 text-white'
                            : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Facebook className="h-3.5 w-3.5 text-blue-400" />
                        <span>Facebook</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDestinationPage('Email')}
                        className={`rounded-xl py-1.5 px-2 text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          destinationPage === 'Email'
                            ? 'border-emerald-500 bg-emerald-500/20 text-white'
                            : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Globe className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Email</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={handleCopyPitchOnly}
                      className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-bold text-slate-200 transition cursor-pointer"
                    >
                      {copiedPitch ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      <span>{copiedPitch ? 'Copied Pitch!' : 'Copy Pitch'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddAsFreshLead}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 px-5 py-2 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer active:scale-95"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Save into {destinationPage} Leads</span>
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
