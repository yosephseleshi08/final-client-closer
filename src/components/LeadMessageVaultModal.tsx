import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Save,
  CheckCircle2,
  Copy,
  Clock,
  Send,
  RefreshCw,
  FileText,
  ShieldCheck,
  Zap,
  ExternalLink
} from 'lucide-react';
import { Lead } from '../types';
import { getDefaultStagedMessages } from '../utils/stagedMessageHelper';

interface LeadMessageVaultModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveLead: (updatedLead: Lead) => void;
  showToast: (msg: string) => void;
}

export const LeadMessageVaultModal: React.FC<LeadMessageVaultModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSaveLead,
  showToast,
}) => {
  if (!isOpen || !lead) return null;

  const defaults = getDefaultStagedMessages(lead);

  const [stagedDm, setStagedDm] = useState<string>(
    lead.stagedDmMiniPitch || defaults.stagedDmMiniPitch
  );
  const [stagedFu1, setStagedFu1] = useState<string>(
    lead.stagedFollowup1 || defaults.stagedFollowup1
  );
  const [stagedFu2, setStagedFu2] = useState<string>(
    lead.stagedFollowup2 || defaults.stagedFollowup2
  );
  const [stagedFu3, setStagedFu3] = useState<string>(
    lead.stagedFollowup3 || defaults.stagedFollowup3
  );

  const [copiedStage, setCopiedStage] = useState<string | null>(null);

  const handleCopy = (text: string, stageName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStage(stageName);
    showToast(`Copied ${stageName} to clipboard!`);
    setTimeout(() => setCopiedStage(null), 2000);
  };

  const handleResetToBestPractice = () => {
    setStagedDm(defaults.stagedDmMiniPitch);
    setStagedFu1(defaults.stagedFollowup1);
    setStagedFu2(defaults.stagedFollowup2);
    setStagedFu3(defaults.stagedFollowup3);
    showToast('Reset all 4 touchpoints to high-converting $0 down case study copy!');
  };

  const handleSave = () => {
    const updatedLead: Lead = {
      ...lead,
      stagedDmMiniPitch: stagedDm.trim(),
      stagedFollowup1: stagedFu1.trim(),
      stagedFollowup2: stagedFu2.trim(),
      stagedFollowup3: stagedFu3.trim(),
      pitchHook: stagedDm.trim(), // Keep in sync
    };

    onSaveLead(updatedLead);
    showToast(`💾 Stored all 4 outreach messages for ${lead.restaurantName}! When the day arrives, they're ready to dispatch with zero generation needed.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
                  Message Store & Sequence Vault
                </h3>
                <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                  Pre-Staged Copy
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Prospect: <strong className="text-white">{lead.restaurantName}</strong> ({lead.platform} {lead.handle})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-5 py-3 bg-indigo-950/30 border-b border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>Store your exact messages in advance. When the scheduled day arrives, they dispatch with 1 click.</span>
          </div>
          <button
            onClick={handleResetToBestPractice}
            className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 hover:text-white transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Pre-fill Standard Copy</span>
          </button>
        </div>

        {/* Scrollable Message Inputs Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Stage 1: Initial DM */}
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">1</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Initial DM Pitch (Day 0)</span>
                {lead.scheduledDay && (
                  <span className="text-[10px] text-indigo-400 font-mono">({lead.scheduledDay})</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleCopy(stagedDm, 'Initial DM')}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
              >
                {copiedStage === 'Initial DM' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedStage === 'Initial DM' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={stagedDm}
              onChange={(e) => setStagedDm(e.target.value)}
              placeholder="Enter custom DM pitch..."
              className="w-full rounded-xl border border-white/10 bg-slate-900/90 p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition leading-relaxed font-sans"
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
              <span>Goal: Get prospect to tap demo link & accept $0 setup</span>
              <span>{stagedDm.split(/\s+/).filter(Boolean).length} words</span>
            </div>
          </div>

          {/* Stage 2: Follow-up #1 */}
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white">2</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Follow-Up #1 (Day +3 Quick Check)</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(stagedFu1, 'Follow-Up #1')}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
              >
                {copiedStage === 'Follow-Up #1' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedStage === 'Follow-Up #1' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={stagedFu1}
              onChange={(e) => setStagedFu1(e.target.value)}
              placeholder="Enter custom follow-up #1..."
              className="w-full rounded-xl border border-white/10 bg-slate-900/90 p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none transition leading-relaxed font-sans"
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
              <span>Goal: Re-surface preview link without being annoying</span>
              <span>{stagedFu1.split(/\s+/).filter(Boolean).length} words</span>
            </div>
          </div>

          {/* Stage 3: Follow-up #2 */}
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">3</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Follow-Up #2 (Day +7 Value Video)</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(stagedFu2, 'Follow-Up #2')}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
              >
                {copiedStage === 'Follow-Up #2' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedStage === 'Follow-Up #2' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={stagedFu2}
              onChange={(e) => setStagedFu2(e.target.value)}
              placeholder="Enter custom follow-up #2..."
              className="w-full rounded-xl border border-white/10 bg-slate-900/90 p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-pink-500 focus:outline-none transition leading-relaxed font-sans"
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
              <span>Goal: Offer quick 45s Loom video comparing takeout commissions</span>
              <span>{stagedFu2.split(/\s+/).filter(Boolean).length} words</span>
            </div>
          </div>

          {/* Stage 4: Follow-up #3 */}
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">4</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Follow-Up #3 (Day +14 Breakup Scarcity)</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(stagedFu3, 'Follow-Up #3')}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
              >
                {copiedStage === 'Follow-Up #3' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedStage === 'Follow-Up #3' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={stagedFu3}
              onChange={(e) => setStagedFu3(e.target.value)}
              placeholder="Enter custom follow-up #3..."
              className="w-full rounded-xl border border-white/10 bg-slate-900/90 p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none transition leading-relaxed font-sans"
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
              <span>Goal: Polite scarcity - closing their file triggers replies from busy owners</span>
              <span>{stagedFu3.split(/\s+/).filter(Boolean).length} words</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/10 p-4 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            Saved automatically into <strong className="text-white">{lead.restaurantName}</strong>'s permanent vault.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95"
            >
              <Save className="h-4 w-4" />
              <span>Save Stored Sequence</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
