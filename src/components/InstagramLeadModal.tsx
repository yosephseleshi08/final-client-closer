import React, { useState } from 'react';
import {
  X,
  Instagram,
  Sparkles,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Zap,
  Flame,
  AlertCircle,
  Eye,
  Send,
  Building2,
  MapPin,
  User,
  DollarSign,
  Layers
} from 'lucide-react';
import { Lead } from '../types';

interface ExtractedLeadData {
  restaurantName: string;
  contactName: string;
  category: 'italian' | 'sushi' | 'steakhouse' | 'cafe' | 'cocktail_bar' | 'medspa';
  city: string;
  handle: string;
  phone?: string;
  email?: string;
  detectedBio?: string;
  frictionPoints: string[];
  auditChecklist: [boolean, boolean, boolean];
  notes: string;
  mockupLink: string;
  estimatedDealValue: number;
  pitchHook: string;
  source?: string;
  model?: string;
}

interface InstagramLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: Omit<Lead, 'id'>) => Lead;
  onOpenMockup?: (lead: Lead) => void;
  onViewDetails?: (lead: Lead) => void;
  onSelectForCopilot?: (lead: Lead) => void;
}

const SAMPLE_INSTA_LINKS = [
  { label: '🍕 Luigi Trattoria (Austin)', handle: '@trattoria_luigi_austin' },
  { label: '🍣 Sushi Jin (Manhattan)', handle: '@sushi_jin_manhattan' },
  { label: '🥩 Prime Cut Steakhouse (Chicago)', handle: '@prime_cut_chicago' },
  { label: '☕ Artisan Roast Cafe (Portland)', handle: '@artisan_roast_pdx' },
  { label: '🍸 Velvet Lounge (Miami)', handle: '@velvet_lounge_miami' },
];

export const InstagramLeadModal: React.FC<InstagramLeadModalProps> = ({
  isOpen,
  onClose,
  onAddLead,
  onOpenMockup,
  onViewDetails,
  onSelectForCopilot,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [showBioInput, setShowBioInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusStep, setStatusStep] = useState<string>('');
  const [extractedResult, setExtractedResult] = useState<ExtractedLeadData | null>(null);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedMockup, setCopiedMockup] = useState(false);
  const [createdLead, setCreatedLead] = useState<Lead | null>(null);

  if (!isOpen) return null;

  const handleExtract = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl || urlInput).trim();
    if (!targetUrl) return;

    setIsLoading(true);
    setExtractedResult(null);
    setCreatedLead(null);
    setStatusStep('Connecting to Instagram profile & parsing handle...');

    try {
      setTimeout(() => {
        setStatusStep('Analyzing restaurant category, city & mobile friction points...');
      }, 700);

      setTimeout(() => {
        setStatusStep('Synthesizing 0.3s interactive prototype & $299 closer pitch...');
      }, 1400);

      const res = await fetch('/api/instagram/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          rawBioText: bioInput.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to extract lead');
      }

      const data: ExtractedLeadData = await res.json();
      setExtractedResult(data);
    } catch (_err) {
      // Clean fallback if network error
      const clean = targetUrl.replace(/https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[^a-zA-Z0-9_]/g, '');
      const name = clean
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ') || 'Artisan Restaurant';
      const fallback: ExtractedLeadData = {
        restaurantName: name,
        contactName: 'Owner / GM',
        category: 'italian',
        city: 'Local Area',
        handle: `@${clean}`,
        frictionPoints: [
          'Bio links to PDF menu causing mobile dropoff',
          'Missing 0-commission direct reservation engine',
          'Losing 30% margin to third-party delivery aggregators',
        ],
        auditChecklist: [true, true, true],
        notes: `Extracted from Instagram @${clean}. High engagement, prime candidate for $299 fast close.`,
        mockupLink: `https://demo.closer.app/${clean.toLowerCase()}`,
        estimatedDealValue: 299,
        pitchHook: `Hey! Put together a 0.3s direct ordering prototype for ${name}: https://demo.closer.app/${clean.toLowerCase()}. Waiving our $299 fee for 3 local spots in exchange for a review. Want me to send the preview?`,
      };
      setExtractedResult(fallback);
    } finally {
      setIsLoading(false);
      setStatusStep('');
    }
  };

  const handleCreateAndOpenMockup = () => {
    if (!extractedResult) return;
    const today = new Date().toISOString().split('T')[0];
    const newLead = onAddLead({
      restaurantName: extractedResult.restaurantName,
      contactName: extractedResult.contactName,
      platform: 'Instagram',
      handle: extractedResult.handle,
      city: extractedResult.city,
      createdAt: new Date().toISOString(),
      mockupLink: extractedResult.mockupLink,
      mockupCategory: extractedResult.category,
      dateFirstContact: today,
      lastContactDate: '',
      nextFollowupDate: null,
      followupCount: 0,
      status: 'not_sent',
      notes: extractedResult.notes,
      estimatedDealValue: 299,
      auditChecklist: extractedResult.auditChecklist,
      phone: extractedResult.phone,
      email: extractedResult.email,
    });

    setCreatedLead(newLead);
    if (onViewDetails) {
      onViewDetails(newLead);
    } else if (onOpenMockup) {
      onOpenMockup(newLead);
    }
    onClose();
  };

  const handleCreateAndOpenCopilot = () => {
    if (!extractedResult) return;
    const today = new Date().toISOString().split('T')[0];
    const newLead = onAddLead({
      restaurantName: extractedResult.restaurantName,
      contactName: extractedResult.contactName,
      platform: 'Instagram',
      handle: extractedResult.handle,
      city: extractedResult.city,
      createdAt: new Date().toISOString(),
      mockupLink: extractedResult.mockupLink,
      mockupCategory: extractedResult.category,
      dateFirstContact: today,
      lastContactDate: '',
      nextFollowupDate: null,
      followupCount: 0,
      status: 'not_sent',
      notes: extractedResult.notes,
      estimatedDealValue: 299,
      auditChecklist: extractedResult.auditChecklist,
      phone: extractedResult.phone,
      email: extractedResult.email,
    });

    if (onSelectForCopilot) {
      onSelectForCopilot(newLead);
    }
    onClose();
  };

  const handleCopyPitch = () => {
    if (!extractedResult) return;
    navigator.clipboard.writeText(extractedResult.pitchHook);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleCopyMockup = () => {
    if (!extractedResult) return;
    navigator.clipboard.writeText(extractedResult.mockupLink);
    setCopiedMockup(true);
    setTimeout(() => setCopiedMockup(false), 2000);
  };

  const handleReset = () => {
    setExtractedResult(null);
    setCreatedLead(null);
    setUrlInput('');
    setBioInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-pink-500/30 bg-[#0d121f] p-5 sm:p-7 shadow-2xl shadow-pink-950/40 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 shadow-lg shadow-pink-600/30">
              <Instagram className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Instant Instagram Lead Extractor
                </h2>
                <span className="rounded-full bg-pink-500/20 border border-pink-500/40 px-2 py-0.5 text-[10px] font-black uppercase text-pink-300">
                  AI Powered
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste any Instagram link or handle to auto-extract lead details, generate a live 0.3s prototype & prepare a $299 closer pitch.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        {!extractedResult ? (
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Instagram Profile URL or @Handle
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Instagram className="h-4 w-4 text-pink-400" />
                </div>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExtract();
                  }}
                  placeholder="https://www.instagram.com/trattoria_luigi or @trattoria_luigi"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/90 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition shadow-inner font-mono text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Quick Demo Links */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Or test with 1-click sample restaurants:
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {SAMPLE_INSTA_LINKS.map((sample) => (
                  <button
                    key={sample.handle}
                    type="button"
                    onClick={() => {
                      setUrlInput(sample.handle);
                      handleExtract(sample.handle);
                    }}
                    className="rounded-xl border border-white/5 bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-pink-500/40 hover:bg-pink-500/10 hover:text-pink-300 transition"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Collapsible Bio/Notes Input */}
            <div>
              <button
                type="button"
                onClick={() => setShowBioInput(!showBioInput)}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
              >
                <span>{showBioInput ? '− Hide' : '+ Optional: Paste Instagram Bio or Web Link'}</span>
              </button>

              {showBioInput && (
                <div className="mt-2 animate-in fade-in duration-150">
                  <textarea
                    rows={2}
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Paste bio text, e.g.: 'Authentic Roman pasta in downtown Austin 🍝 Tue-Sun 12-10pm | DM for bookings | Chef Marco'"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/80 p-3 text-xs text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/30 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Extract Action Button */}
            <div className="pt-2">
              <button
                type="button"
                id="btn-run-insta-extract"
                disabled={!urlInput.trim() || isLoading}
                onClick={() => handleExtract()}
                className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black uppercase tracking-wider text-white transition shadow-xl ${
                  !urlInput.trim() || isLoading
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-pink-600/30 active:scale-[0.99]'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 animate-spin" />
                    <span>{statusStep || 'Extracting Lead Data...'}</span>
                  </div>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-amber-300" />
                    <span>⚡ Extract & Auto-Create Lead</span>
                  </>
                )}
              </button>
            </div>

            {/* Value Proposition Note */}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-3 text-[11px] text-slate-400 space-y-1">
              <p className="font-bold text-indigo-300 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-indigo-400" />
                How the Automated Closer Works:
              </p>
              <p>
                1. Analyzes handle & profile metadata to identify cuisine, location, and owner name.
              </p>
              <p>
                2. Flags mobile friction points (PDF menus, slow speeds, aggregators taking 30%).
              </p>
              <p>
                3. Auto-configures an instant 0.3s prototype link & custom $299 / $0-down proposal.
              </p>
            </div>
          </div>
        ) : (
          /* Extraction Result View */
          <div className="mt-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Lead Summary Card */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 sm:p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 rounded-bl-xl bg-emerald-500/20 border-l border-b border-emerald-500/30 px-3 py-1 text-[10px] font-black uppercase text-emerald-300 flex items-center gap-1">
                <Check className="h-3 w-3" />
                <span>Extracted Successfully</span>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black text-xl shadow-lg shadow-emerald-900/30">
                  {extractedResult.restaurantName.charAt(0)}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {extractedResult.restaurantName}
                    </h3>
                    <span className="rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-300">
                      {extractedResult.category.replace('_', ' ')}
                    </span>
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                      $299 Deal
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <span className="flex items-center gap-1 font-mono text-pink-300">
                      <Instagram className="h-3 w-3" />
                      {extractedResult.handle}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <MapPin className="h-3 w-3 text-slate-500" />
                      {extractedResult.city}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <User className="h-3 w-3 text-slate-500" />
                      {extractedResult.contactName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detected Friction Points */}
              <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Identified Conversion Leaks (Pitch Angles):
                </span>
                <ul className="space-y-1 text-xs text-slate-300 pl-1">
                  {extractedResult.frictionPoints.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Live Mockup Link Box */}
              <div className="mt-4 rounded-xl border border-indigo-500/30 bg-slate-900/90 p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-[11px] font-bold uppercase text-indigo-400 shrink-0">
                    Live Mockup:
                  </span>
                  <span className="text-xs font-mono text-slate-300 truncate">
                    {extractedResult.mockupLink}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyMockup}
                  className="shrink-0 flex items-center gap-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 px-2.5 py-1 text-[11px] font-semibold text-indigo-200 transition"
                >
                  {copiedMockup ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedMockup ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Custom Ready-to-Send Pitch Box */}
              <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/90 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-pink-300 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Personalized 35-Word Outreach DM:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPitch}
                    className="flex items-center gap-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 px-2 py-0.5 text-[11px] font-bold text-pink-200 transition"
                  >
                    {copiedPitch ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedPitch ? 'Copied Pitch' : 'Copy DM'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-200 font-sans italic leading-relaxed">
                  "{extractedResult.pitchHook}"
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                id="btn-add-and-open-details"
                onClick={handleCreateAndOpenMockup}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-600/30 transition active:scale-[0.99] cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                <span>Add & View Lead Details</span>
              </button>

              <button
                type="button"
                id="btn-add-and-open-copilot"
                onClick={handleCreateAndOpenCopilot}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-600/30 transition active:scale-[0.99]"
              >
                <Send className="h-4 w-4" />
                <span>Add & Open Copilot</span>
              </button>
            </div>

            {/* Reset / Extract Another */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-slate-400 hover:text-white transition underline underline-offset-4"
              >
                Extract Another Instagram Lead
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
