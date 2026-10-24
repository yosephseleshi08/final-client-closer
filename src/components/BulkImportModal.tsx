import React, { useState } from 'react';
import { X, Upload, Check, AlertCircle, Calendar, Sparkles, CalendarDays } from 'lucide-react';
import { Lead, Weekday } from '../types';
import { calculateNextFollowupDate } from '../data/initialLeads';
import { WEEKDAYS, WEEKDAY_CONFIG, getCurrentWeekKey, getNextWeekKey, formatWeekLabel } from '../utils/weeklyScheduler';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkAdd: (leads: Omit<Lead, 'id'>[]) => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onBulkAdd,
}) => {
  const defaultSample = `Mario's Pizzeria, 2026-09-14, sent, Instagram, @mariospizza_ny, NYC
Luna Cafe, 2026-09-15, seen, TikTok, @lunacafe_la, Los Angeles
Tokyo Omakase Club, 2026-09-16, replied, Instagram, @tokyo_omakase, Chicago
The Rusty Anchor, 2026-09-17, sent, WhatsApp, @rustyanchor_pub, Miami`;

  const currentWeekKey = getCurrentWeekKey();
  const nextWeekKey = getNextWeekKey();

  const [csvText, setCsvText] = useState(defaultSample);
  const [errorMsg, setErrorMsg] = useState('');
  const [targetWeek, setTargetWeek] = useState<string>(currentWeekKey);
  const [autoPaceWeekly, setAutoPaceWeekly] = useState<boolean>(true);
  const [dailyQuota, setDailyQuota] = useState<number>(10);

  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];
  const detectedRows = csvText.trim().split('\n').filter((l) => l.trim().length > 0).length;

  const handleProcess = () => {
    if (!csvText.trim()) {
      setErrorMsg('Please enter at least one line of CSV data.');
      return;
    }

    const lines = csvText.trim().split('\n');
    const newLeads: Omit<Lead, 'id'>[] = [];

    let validCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map((p) => p.trim());
      const name = parts[0];
      const date = parts[1] || today;
      const statusRaw = (parts[2] || 'not_sent').toLowerCase();
      const platformRaw = parts[3] || 'Instagram';
      const handle = parts[4] || `@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const city = parts[5] || 'United States';

      if (!name) continue;

      const validStatuses: Lead['status'][] = ['not_sent', 'sent', 'seen', 'replied', 'mockup_sent', 'closed_won', 'closed_dead'];
      const status = validStatuses.includes(statusRaw as any) ? (statusRaw as Lead['status']) : 'not_sent';
      const nextFollowup = ['replied', 'mockup_sent', 'closed_won', 'closed_dead'].includes(status)
        ? null
        : calculateNextFollowupDate(date, 0);

      // Auto-schedule day if enabled (e.g. 10 per day: Mon-Sun)
      let assignedDay: Weekday | undefined = undefined;
      if (autoPaceWeekly) {
        const dayIdx = Math.floor(validCount / dailyQuota) % WEEKDAYS.length;
        assignedDay = WEEKDAYS[dayIdx];
      }

      newLeads.push({
        restaurantName: name,
        createdAt: new Date().toISOString(),
        dateFirstContact: date,
        lastContactDate: status === 'not_sent' ? '' : date,
        nextFollowupDate: nextFollowup,
        followupCount: 0,
        status,
        platform: (platformRaw as any) || 'Instagram',
        handle,
        city,
        targetWeek: targetWeek || currentWeekKey,
        scheduledDay: assignedDay,
        mockupLink: `https://demo.closer.app/${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        mockupCategory: 'italian',
        estimatedDealValue: 299,
        notes: autoPaceWeekly && assignedDay
          ? `Bulk imported - Scheduled for ${assignedDay} (Lead #${(validCount % dailyQuota) + 1}/${dailyQuota})`
          : 'Bulk imported opportunity',
        auditChecklist: [false, false, false],
      });

      validCount++;
    }

    if (newLeads.length === 0) {
      setErrorMsg('No valid lead rows could be parsed.');
      return;
    }

    onBulkAdd(newLeads);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">Bulk Lead Batch Import</h3>
              <p className="text-xs text-slate-400">
                Paste leads line by line: <code className="text-purple-300">Name, Date, Status, Platform, Handle, City</code>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <textarea
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setErrorMsg('');
            }}
            rows={8}
            placeholder="Restaurant Name, 2026-09-18, sent, Instagram, @handle, City"
            className="w-full font-mono rounded-xl border border-white/10 bg-slate-950 p-4 text-xs text-slate-200 placeholder-slate-600 focus:border-purple-500 focus:outline-none leading-relaxed"
          />

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 70-Lead Weekly Pacer Setting */}
          <div className="rounded-2xl border border-indigo-500/25 bg-indigo-950/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPaceWeekly}
                  onChange={(e) => setAutoPaceWeekly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  Auto-Pace Weekly Quota ({dailyQuota} leads/day across Mon–Sun)
                </span>
              </label>

              {autoPaceWeekly && (
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-400">Daily:</span>
                  {[5, 10, 14].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setDailyQuota(q)}
                      className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                        dailyQuota === q
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Target Week Toggle */}
            <div className="flex items-center gap-1.5 pt-1 text-xs border-t border-white/5">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <CalendarDays className="h-3 w-3 text-indigo-400" />
                Target Week:
              </span>
              <button
                type="button"
                onClick={() => setTargetWeek(currentWeekKey)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  targetWeek === currentWeekKey ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                This Week ({formatWeekLabel(currentWeekKey, true)})
              </button>
              <button
                type="button"
                onClick={() => setTargetWeek(nextWeekKey)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  targetWeek === nextWeekKey ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Next Week ({formatWeekLabel(nextWeekKey, true)})
              </button>
            </div>

            {autoPaceWeekly && (
              <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-white/5 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-indigo-300">
                    {detectedRows} lead{detectedRows === 1 ? '' : 's'} will be distributed across the week:
                  </span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {Math.min(detectedRows, dailyQuota * 7)} / {dailyQuota * 7} target paced
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1 text-[10px] font-mono">
                  {WEEKDAYS.map((d, i) => {
                    const from = i * dailyQuota + 1;
                    const to = Math.min((i + 1) * dailyQuota, detectedRows);
                    const hasLeads = from <= detectedRows;
                    const countForDay = hasLeads ? Math.max(0, to - from + 1) : 0;
                    return (
                      <span
                        key={d}
                        className={`px-1.5 py-0.5 rounded border ${
                          hasLeads
                            ? countForDay >= dailyQuota
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                            : 'bg-slate-900 border-white/5 text-slate-600'
                        }`}
                      >
                        {d.slice(0, 3)}: {countForDay}/{dailyQuota}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              {csvText.trim().split('\n').filter(Boolean).length} rows ready for import
            </span>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleProcess}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                Process Batch Import
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
