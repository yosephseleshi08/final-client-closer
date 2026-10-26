import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Save,
  FileText,
  Zap,
  ExternalLink,
  ClipboardPaste,
  Trash2,
  Clock,
} from 'lucide-react';
export interface AnalyzableLead {
  id: string | number;
  name: string;
  link: string;
  channel?: string;
  leadAnalysis?: string;
  analysisSavedAt?: string;
}

interface LeadAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: AnalyzableLead | null;
  channel?: string;
  onSaveAnalysis: (leadId: string, analysisText: string) => void;
}

export const LeadAnalysisModal: React.FC<LeadAnalysisModalProps> = ({
  isOpen,
  onClose,
  lead,
  channel,
  onSaveAnalysis,
}) => {
  const [analysisText, setAnalysisText] = useState('');
  const [copiedType, setCopiedType] = useState<'raw' | 'deepseek' | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (lead) {
      setAnalysisText(lead.leadAnalysis || '');
      setCopiedType(null);
      setJustSaved(false);
    }
  }, [lead, isOpen]);

  if (!isOpen || !lead) return null;

  const currentChannel = channel || lead.channel || 'Instagram';

  const wordCount = analysisText.trim() ? analysisText.trim().split(/\s+/).length : 0;
  const charCount = analysisText.length;

  const handleSave = () => {
    onSaveAnalysis(String(lead.id), analysisText.trim());
    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
    }, 2500);
  };

  const copyToClipboard = async (text: string, type: 'raw' | 'deepseek') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleCopyRaw = () => {
    if (!analysisText.trim()) return;
    copyToClipboard(analysisText.trim(), 'raw');
  };

  const handleCopyDeepSeekPrompt = () => {
    const rawAnalysis = analysisText.trim() || 'No specific analysis notes provided yet.';
    const promptText = `Act as an elite B2B sales copywriter and cold DM closer.
Using the following Gemini Lead Analysis for the prospect below, craft a punchy, personalized 3-step outreach sequence:

PROSPECT INFORMATION:
- Business / Prospect Name: ${lead.name}
- Channel / Platform: ${currentChannel.charAt(0).toUpperCase() + currentChannel.slice(1)}
- Link / Profile: ${lead.link}

GEMINI LEAD RESEARCH & ANALYSIS:
${rawAnalysis}

STRICT SEQUENCE CONSTRAINTS:
1. Message 1 (Initial DM - Day 1): High-converting personalized hook highlighting specific opportunities from the analysis. Under 45 words. Low-friction call-to-action (e.g. asking if they want a 30-sec preview or waiving the setup fee).
2. Message 2 (Day 3 Follow-Up Bump): Polite, ultra-casual follow-up checking if they saw the preview link. Under 25 words.
3. Message 3 (Day 7 Breakup / Loom Offer): Respectful final touch offering a 45-sec walkthrough or leaving them alone. Under 30 words.

OUTPUT FORMAT:
Provide ONLY the 3 ready-to-paste messages with labels:
[INITIAL DM]
[DAY 3 FOLLOWUP]
[DAY 7 BREAKUP]`;

    copyToClipboard(promptText, 'deepseek');
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setAnalysisText(text);
      }
    } catch {
      // User browser might restrict clipboard.readText; no-op
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-['Outfit']">
                  Lead Analysis &amp; Prompt Hub
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  {lead.id}
                </span>
                {lead.leadAnalysis && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Analysis Ready
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{lead.name}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 truncate max-w-xs">{lead.link}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Quick instructions / Status bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/70 border border-white/[0.07] text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Paste your raw <strong>Gemini Lead Research</strong> below. Generate DM sequences via DeepSeek in 1 click.
              </span>
            </div>
            {lead.analysisSavedAt && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                Updated {new Date(lead.analysisSavedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Action Toolbar above textarea */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>Gemini Lead Analysis Block</span>
              <span className="text-slate-500 font-normal font-mono text-[11px]">
                ({wordCount} words / {charCount} chars)
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition cursor-pointer"
                title="Paste from clipboard"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
                <span>Paste</span>
              </button>
              {analysisText && (
                <button
                  type="button"
                  onClick={() => setAnalysisText('')}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 text-xs font-medium transition cursor-pointer"
                  title="Clear text"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              value={analysisText}
              onChange={(e) => setAnalysisText(e.target.value)}
              rows={12}
              placeholder="Paste Gemini Lead Analysis here... (e.g. Website menu load issues, slow mobile UX, customer review quotes, key pain points, high ticket menu items, social engagement stats)"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 p-4 text-xs font-mono leading-relaxed text-slate-100 placeholder-slate-600 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 focus:outline-none transition resize-y min-h-[220px]"
            />
          </div>

          {/* Quick Copy Action Bar */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Quick Copy to DeepSeek
              </span>
              <span className="text-[11px] text-slate-400">
                Generate 3-step sequence instantly
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Copy Raw Analysis */}
              <button
                type="button"
                disabled={!analysisText.trim()}
                onClick={handleCopyRaw}
                className="w-full py-2.5 px-3 rounded-xl border border-white/10 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                {copiedType === 'raw' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 animate-in zoom-in" />
                    <span className="text-emerald-400">Copied Raw Analysis!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Copy Raw Analysis</span>
                  </>
                )}
              </button>

              {/* Copy DeepSeek Sequence Prompt */}
              <button
                type="button"
                disabled={!analysisText.trim()}
                onClick={handleCopyDeepSeekPrompt}
                className="w-full py-2.5 px-3 rounded-xl border border-indigo-500/40 bg-indigo-600/30 hover:bg-indigo-600/50 disabled:opacity-40 text-indigo-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                {copiedType === 'deepseek' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 animate-in zoom-in" />
                    <span className="text-emerald-400">Copied DeepSeek Prompt!</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>⚡ Copy DeepSeek Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            {justSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 animate-fade-in">
                <Check className="w-4 h-4" />
                Saved to lead!
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 hover:brightness-110 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Lead Analysis</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
