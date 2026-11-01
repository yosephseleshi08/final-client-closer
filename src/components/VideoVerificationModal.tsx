import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Video, AlertCircle, Sparkles } from 'lucide-react';
import { ChannelLead } from '../types';
import { validateRestaurantNameMatch } from '../utils/videoVerification';

interface VideoVerificationModalProps {
  isOpen: boolean;
  lead: ChannelLead | null;
  onClose: () => void;
  onConfirmSuccess: (lead: ChannelLead) => void;
  onShowToast?: (type: 'success' | 'error', message: string) => void;
}

export const VideoVerificationModal: React.FC<VideoVerificationModalProps> = ({
  isOpen,
  lead,
  onClose,
  onConfirmSuccess,
  onShowToast,
}) => {
  const [inputText, setInputText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputText('');
      setErrorMessage(null);
      setIsCopied(false);
      // Auto-focus input on open
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, lead?.id]);

  if (!isOpen || !lead) return null;

  const expectedName = lead.name?.trim() || '';

  const handleCopyExpectedName = () => {
    if (!expectedName) return;
    navigator.clipboard.writeText(expectedName);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const isValid = validateRestaurantNameMatch(inputText, expectedName);

    if (!isValid) {
      const err = "❌ Name doesn't match. Please try again.";
      setErrorMessage(err);
      if (onShowToast) {
        onShowToast('error', err);
      }
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }

    // Success!
    setErrorMessage(null);
    if (onShowToast) {
      onShowToast('success', '✅ Video verified.');
    }
    onConfirmSuccess(lead);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-3xl bg-slate-900 border border-purple-500/40 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100 animate-in zoom-in-95 duration-150 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-950/40">
              <Video className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white font-['Outfit'] flex items-center gap-2">
                <span>🎥 Video Recorded — Confirm</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                2-second verification gate to confirm proof of work.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            aria-label="Close verification modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="restaurant-verify-input"
              className="block text-xs sm:text-sm font-semibold text-slate-200 leading-snug"
            >
              Type the restaurant's name to confirm you recorded the video.
            </label>

            <input
              ref={inputRef}
              id="restaurant-verify-input"
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Type restaurant name..."
              className={`w-full px-4 py-3 bg-slate-950/90 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all font-sans ${
                errorMessage
                  ? 'border-rose-500 ring-2 ring-rose-500/30'
                  : 'border-white/15 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30'
              }`}
            />

            {/* Expected Name Hint with 1-click Copy */}
            <div className="flex items-center justify-between text-xs text-slate-400 mt-1.5 bg-slate-950/60 px-3 py-2 rounded-xl border border-white/5">
              <span className="truncate">
                Expected: <strong className="text-purple-300 font-medium">{expectedName}</strong>
              </span>
              <button
                type="button"
                onClick={handleCopyExpectedName}
                className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition cursor-pointer shrink-0"
                title="Copy expected restaurant name"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Name</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message Toast / Alert inside modal */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-950/50 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Confirm</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
