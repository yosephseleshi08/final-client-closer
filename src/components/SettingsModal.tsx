import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, ShieldCheck, Lock, Unlock, AlertTriangle, Check, Wrench, Target, History, RotateCcw, Mail } from 'lucide-react';
import { isManualWarmupOverrideEnabled, setManualWarmupOverride } from '../utils/cadenceEngine';
import { runDiagnosticDataRepair, DataRepairReport } from '../utils/dataRepair';
import {
  applyHistoryRepair,
  applySentDateRestore,
  HistoryRepairResult,
  SentDateRestoreResult,
} from '../data/sentDateRestore';
import {
  DEFAULT_EXECUTION_QUOTA_SETTINGS,
  getQuotaSettings,
  saveQuotaSettings,
} from '../utils/streakManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [overrideEnabled, setOverrideEnabled] = useState<boolean>(() => isManualWarmupOverrideEnabled());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [repairReport, setRepairReport] = useState<DataRepairReport | null>(null);
  const [historyRepairResult, setHistoryRepairResult] = useState<HistoryRepairResult | null>(null);
  const [sentRestoreResult, setSentRestoreResult] = useState<SentDateRestoreResult | null>(null);

  const [igQuota, setIgQuota] = useState<number>(() => getQuotaSettings().igQuota);
  const [combinedQuota, setCombinedQuota] = useState<number>(() => getQuotaSettings().combinedQuota);
  const [dailyCapacity, setDailyCapacity] = useState<number>(() => getQuotaSettings().dailyCapacity);
  const [streakThreshold, setStreakThreshold] = useState<number>(() => getQuotaSettings().streakThreshold);

  useEffect(() => {
    if (!isOpen) return;
    setOverrideEnabled(isManualWarmupOverrideEnabled());
    const currentQuota = getQuotaSettings();
    setIgQuota(currentQuota.igQuota);
    setCombinedQuota(currentQuota.combinedQuota);
    setDailyCapacity(currentQuota.dailyCapacity);
    setStreakThreshold(currentQuota.streakThreshold);
  }, [isOpen]);

  useEffect(() => {
    const handleOverrideChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      setOverrideEnabled(customEvent.detail?.enabled ?? isManualWarmupOverrideEnabled());
    };
    window.addEventListener('crm_warmup_override_changed', handleOverrideChanged);
    return () => window.removeEventListener('crm_warmup_override_changed', handleOverrideChanged);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const handleSaveQuotaSettings = () => {
    const saved = saveQuotaSettings({
      igQuota,
      combinedQuota,
      dailyCapacity,
      streakThreshold,
      streakMinPercent: streakThreshold,
    });
    setIgQuota(saved.igQuota);
    setCombinedQuota(saved.combinedQuota);
    setDailyCapacity(saved.dailyCapacity);
    setStreakThreshold(saved.streakThreshold);
    setStatusMessage(
      `✅ Model A Quota saved: ${saved.igQuota} IG · ${saved.combinedQuota} Combined · ${saved.dailyCapacity} Cap · Streak Min ${saved.streakMinPercent}%`
    );
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  const handleResetQuotaDefaults = () => {
    const saved = saveQuotaSettings(DEFAULT_EXECUTION_QUOTA_SETTINGS);
    setIgQuota(saved.igQuota);
    setCombinedQuota(saved.combinedQuota);
    setDailyCapacity(saved.dailyCapacity);
    setStreakThreshold(saved.streakThreshold);
    setStatusMessage('🔄 Restored defaults (6 IG · 4 Combined · 20 Daily Cap · 50% Streak Min).');
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const handleRunDataRepair = () => {
    const report = runDiagnosticDataRepair(true);
    setRepairReport(report);
    setStatusMessage(
      report.emailsCleaned > 0 || report.invalidFlagged > 0
        ? `🔧 Data Repair Complete: Cleaned ${report.emailsCleaned} corrupted email(s), flagged ${report.invalidFlagged} unfixable lead(s).`
        : `✅ Data Repair Complete: Scanned ${report.totalScanned} leads — all email addresses are clean!`
    );
    setTimeout(() => {
      setStatusMessage(null);
    }, 5500);
  };

  const handleRepairHistory = () => {
    const res = applyHistoryRepair();
    setHistoryRepairResult(res);
    setStatusMessage(
      `🛡️ History Repaired: Added ${res.reconstructedEntriesAdded} ledger entries, froze ${res.snapshotsFrozen} baseline snapshots. Lifetime D0: ${res.lifetimeD0Count}.`
    );
    setTimeout(() => {
      setStatusMessage(null);
    }, 6000);
  };

  const handleRestoreSentDates = () => {
    const res = applySentDateRestore();
    setSentRestoreResult(res);
    setStatusMessage(
      `♻️ Sent Dates Restored: ${res.restoredLeadIds.length} lead(s) restored to Nov D0, ${res.cancelledDuplicateIds.length} duplicate cancelled.`
    );
    setTimeout(() => {
      setStatusMessage(null);
    }, 6000);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="CRM Settings & Testing Station"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-7 shadow-2xl space-y-6 text-slate-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
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
                Auditable daily quotas, warm-up protocol safety rules &amp; testing controls
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

        {/* Section: Auditable Daily Execution Quota & Streak Threshold */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white font-['Outfit']">
                  Expected Daily Quota &amp; Streak Rules
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Daily completion % is audited directly against verified dispatches vs. expected quota. Sundays remain 100% protected rest days.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 tabular-nums">
              {igQuota + combinedQuota}/DAY
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="space-y-1">
              <span className="text-[11px] font-mono text-pink-300 font-semibold block">
                IG Quota
              </span>
              <input
                type="number"
                min={0}
                max={50}
                value={igQuota}
                onChange={(e) => setIgQuota(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm font-mono font-bold text-white tabular-nums focus:outline-none focus:border-pink-400"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-mono text-indigo-300 font-semibold block">
                Combined Quota
              </span>
              <input
                type="number"
                min={0}
                max={50}
                value={combinedQuota}
                onChange={(e) => setCombinedQuota(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm font-mono font-bold text-white tabular-nums focus:outline-none focus:border-indigo-400"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-mono text-emerald-300 font-semibold block">
                Daily Cap
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={dailyCapacity}
                onChange={(e) => setDailyCapacity(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm font-mono font-bold text-white tabular-nums focus:outline-none focus:border-emerald-400"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-mono text-amber-300 font-semibold block">
                Streak Min %
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={streakThreshold}
                onChange={(e) =>
                  setStreakThreshold(Math.min(100, Math.max(1, Number(e.target.value))))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm font-mono font-bold text-white tabular-nums focus:outline-none focus:border-amber-400"
              />
            </label>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetQuotaDefaults}
              className="text-[11px] font-mono text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Reset Default (6 IG · 4 Combined · 20 Cap · 50%)
            </button>
            <button
              type="button"
              onClick={handleSaveQuotaSettings}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Audit Quota</span>
            </button>
          </div>
        </div>

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

        {/* Section: Diagnostic Data Repair (Corrupted Scraper Emails) */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-['Outfit']">
                  Diagnostic Data Repair
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AUTO-CLEAN ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scans all stored leads for corrupted scraper email strings (e.g., <code className="text-slate-300 font-mono">map marker pin...</code>), extracts clean addresses, and flags unfixable emails without deleting leads or sequence messages.
              </p>
            </div>
          </div>

          {repairReport && (
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-[11px] font-mono text-slate-300 flex items-center justify-between flex-wrap gap-2">
              <span>
                Scanned: <strong className="text-white">{repairReport.totalScanned}</strong> · Cleaned:{' '}
                <strong className="text-emerald-400">{repairReport.emailsCleaned}</strong> · Invalid Flagged:{' '}
                <strong className={repairReport.invalidFlagged > 0 ? 'text-rose-400' : 'text-slate-400'}>
                  {repairReport.invalidFlagged}
                </strong>
              </span>
              <span className="text-slate-500">{repairReport.timestamp}</span>
            </div>
          )}

          <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400 font-mono">
              Deep Clean &amp; Validate Emails:
            </span>
            <button
              type="button"
              onClick={handleRunDataRepair}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-950/50 transition cursor-pointer active:scale-95"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Run Data Repair</span>
            </button>
          </div>
        </div>

        {/* Section: Data Recovery & Audit Repair (Immutable Ledger + Restored Nov Sent Dates) */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-emerald-500/20 space-y-3.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white font-['Outfit']">
                  Data Recovery &amp; Audit Repair
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                IDEMPOTENT
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Reconstruct immutable November ledger snapshots (Nov 14–18) or restore original November D0 sent dates on re-imported leads (CM-64–CM-74) to prevent duplicate outreach.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleRepairHistory}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 transition cursor-pointer active:scale-95"
            >
              <History className="w-3.5 h-3.5" />
              <span>Repair History</span>
            </button>

            <button
              type="button"
              onClick={handleRestoreSentDates}
              className="px-3.5 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/50 transition cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Sent Dates</span>
            </button>
          </div>

          {historyRepairResult && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-[11px] font-mono text-slate-300 space-y-1.5">
              <div className="flex items-center justify-between text-emerald-300 font-bold">
                <span>History Ledger Repaired</span>
                <span>Lifetime D0: {historyRepairResult.lifetimeD0Count}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 tabular-nums">
                <span>Nov 14: {historyRepairResult.totalsByDate['2026-11-14']?.actual ?? 0}/{historyRepairResult.totalsByDate['2026-11-14']?.expectedTotal ?? 10}</span>
                <span>Nov 16: {historyRepairResult.totalsByDate['2026-11-16']?.actual ?? 0}/{historyRepairResult.totalsByDate['2026-11-16']?.expectedTotal ?? 20}</span>
                <span>Nov 17: {historyRepairResult.totalsByDate['2026-11-17']?.actual ?? 0}/{historyRepairResult.totalsByDate['2026-11-17']?.expectedTotal ?? 20}</span>
                <span>Nov 18: {historyRepairResult.totalsByDate['2026-11-18']?.actual ?? 0}/{historyRepairResult.totalsByDate['2026-11-18']?.expectedTotal ?? 20}</span>
              </div>
            </div>
          )}

          {sentRestoreResult && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 text-[11px] font-mono text-slate-300 space-y-2">
              <div className="flex items-center justify-between text-amber-300 font-bold flex-wrap gap-1">
                <span>Restored: {sentRestoreResult.restoredLeadIds.join(', ') || 'Already clean'}</span>
                <span>Cancelled Dup: {sentRestoreResult.cancelledDuplicateIds.join(', ') || 'None'}</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Verify in Gmail Sent folder:{' '}
                  <strong className="text-white select-all">
                    {sentRestoreResult.gmailVerificationEmails.join(', ')}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Anti-Spam Cooldown Note */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-xs text-slate-400">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-200 block mb-0.5">Account Safety Standard:</strong>
            12-minute cooldowns between manual live DM dispatches and randomized 2-3 minute warm-up gaps operate independently to keep your outreach natural and safe.
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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
