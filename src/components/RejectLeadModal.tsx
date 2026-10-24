import React, { useState } from 'react';
import { X, ShieldAlert, Ban, Check, AlertTriangle } from 'lucide-react';
import { Lead } from '../types';

interface RejectLeadModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReject: (lead: Lead, reason: string, notes: string) => void;
}

const COMMON_REASONS = [
  'Not interested / Declined outreach',
  'Already has modern website & custom online ordering',
  'Permanently closed / Out of business',
  'Too small / Low budget (Cannot afford $299)',
  'Wrong contact info / Inactive Facebook or Google Maps page',
  'Spam / Rude response / Do Not Contact',
  'Duplicate restaurant under different location',
];

export const RejectLeadModal: React.FC<RejectLeadModalProps> = ({
  lead,
  isOpen,
  onClose,
  onConfirmReject,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  if (!isOpen || !lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Custom' ? customReason.trim() || 'Custom Rejection' : selectedReason;
    onConfirmReject(lead, finalReason, additionalNotes);
    onClose();
  };

  const linkUrl = lead.profileUrl || lead.handle || lead.website || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl border border-rose-500/30 bg-slate-900 p-6 sm:p-7 text-white shadow-2xl shadow-rose-950/50">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-rose-500/20 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Ban className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  REJECT & BLACKLIST
                </span>
                <span className="text-xs text-slate-400 font-semibold">{lead.platform}</span>
              </div>
              <h3 className="text-lg font-black text-white font-['Outfit'] mt-0.5">
                Reject "{lead.restaurantName}"
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

        {/* Warning notification */}
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-950/30 p-3.5 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-200 leading-relaxed">
            <strong className="text-white block font-bold mb-0.5">Smart Duplicate Prevention Enabled</strong>
            If you ever copy or paste this {lead.platform} link again in the future, the app will instantly alert you that it was rejected and prevent duplicate outreach!
          </div>
        </div>

        {linkUrl && (
          <div className="mt-3 rounded-xl bg-black/40 px-3 py-2 border border-white/5 text-[11px] font-mono text-slate-400 truncate">
            🔗 {linkUrl}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Select Rejection Reason
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {COMMON_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 rounded-xl p-2.5 text-xs font-medium cursor-pointer transition border ${
                    selectedReason === reason
                      ? 'border-rose-500/50 bg-rose-500/15 text-white'
                      : 'border-white/5 bg-slate-950/40 text-slate-300 hover:border-white/15'
                  }`}
                >
                  <input
                    type="radio"
                    name="rejectionReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-rose-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              <label
                className={`flex items-center gap-2.5 rounded-xl p-2.5 text-xs font-medium cursor-pointer transition border ${
                  selectedReason === 'Custom'
                    ? 'border-rose-500/50 bg-rose-500/15 text-white'
                    : 'border-white/5 bg-slate-950/40 text-slate-300 hover:border-white/15'
                }`}
              >
                <input
                  type="radio"
                  name="rejectionReason"
                  value="Custom"
                  checked={selectedReason === 'Custom'}
                  onChange={() => setSelectedReason('Custom')}
                  className="accent-rose-500"
                />
                <span>Other / Custom reason...</span>
              </label>
            </div>
          </div>

          {selectedReason === 'Custom' && (
            <div>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Type specific reason for rejection..."
                className="w-full rounded-xl border border-white/15 bg-black/50 p-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Strategic Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Owner name was Mike, spoke on phone, said call back in 6 months..."
              className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-600/30 transition cursor-pointer active:scale-95"
            >
              <Ban className="h-4 w-4" />
              <span>Confirm Rejection & Store</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
