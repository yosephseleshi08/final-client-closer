import React, { useState, useEffect } from 'react';
import { X, Settings, ShieldCheck, Lock, Unlock, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { isManualWarmupOverrideEnabled, setManualWarmupOverride } from '../utils/cadenceEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [overrideEnabled, setOverrideEnabled] = useState<boolean>(() => isManualWarmupOverrideEnabled());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setOverrideEnabled(isManualWarmupOverrideEnabled());
  }, [isOpen]);

  useEffect(() => {
    const handleOverrideChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      setOverrideEnabled(customEvent.detail?.enabled ?? isManualWarmupOverrideEnabled());
    };
    window.addEventListener('crm_warmup_override_changed', handleOverrideChanged);
    return () => window.removeEventListener('crm_warmup_override_changed', handleOverrideChanged);
  }, []);

  if (!isOpen) return null;

  const handleToggleOverride = (enable: boolean) => {
    setManualWarmupOverride(enable);
    setOverrideEnabled(enable);
    setStatusMessage(
      enable
        ? '⚡ Testing Mode Activated: Dispatch buttons are now unlocked for testing.'
        : '🛡️ Strict Lock Restored: Same-day dispatches are now locked until midnight.'
    );
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-7 shadow-2xl space-y-6 text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-['Outfit']">
                CRM Settings & Testing Station
              </h3>
              <p className="text-xs text-slate-400">
                Warm-up protocol safety rules & testing controls
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast inside Modal */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 transition animate-in fade-in ${
              overrideEnabled
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Section: Warm-Up Law & Midnight Calendar Unlock */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-['Outfit']">
                  Previous-Day Warm-Up Law
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    overrideEnabled
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {overrideEnabled ? '⚡ TESTING OVERRIDE' : '🛡️ STRICT LOCK (ACTIVE)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Leads warmed up today remain strictly locked until <strong>12:00 AM midnight</strong> to protect your Instagram and Facebook accounts from anti-spam rate limits.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              {overrideEnabled ? (
                <Unlock className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>
                {overrideEnabled
                  ? 'Testing Mode: Today\'s warm-up lock is bypassed.'
                  : 'Default Protection: Today\'s warm-ups show "🔒 Locked - Unlocks at Midnight".'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {overrideEnabled
                ? 'You can now click "Mark as Sent" on leads warmed today to test copy, Gmail/IG links, and logging. Turn off testing mode before real outreach.'
                : 'If you warmed up leads today, they cannot be dispatched today under any circumstances. They automatically unlock tomorrow morning at 00:00.'}
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400 font-mono">
              Manual Testing Dispatch:
            </span>
            {overrideEnabled ? (
              <button
                type="button"
                onClick={() => handleToggleOverride(false)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition cursor-pointer active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Restore Strict Lock</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleOverride(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock for Testing</span>
              </button>
            )}
          </div>
        </div>

        {/* Anti-Spam Cooldown Note */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-xs text-slate-400">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-200 block mb-0.5">Account Safety Standard:</strong>
            12-minute cooldowns between DM dispatches and 8-minute warm-up cooling breaks operate independently to keep your outreach natural and safe.
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
