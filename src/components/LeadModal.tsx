import React, { useState } from 'react';
import { X, Plus, Sparkles, Calendar, CalendarDays } from 'lucide-react';
import { Lead, LeadStatus, Weekday } from '../types';
import { calculateNextFollowupDate } from '../data/initialLeads';
import { WEEKDAYS, getTodayWeekday, getCurrentWeekKey, getNextWeekKey, formatWeekLabel } from '../utils/weeklyScheduler';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: Omit<Lead, 'id'>) => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  onAddLead,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const currentWeekKey = getCurrentWeekKey();
  const nextWeekKey = getNextWeekKey();

  const [restaurantName, setRestaurantName] = useState('');
  const [contactName, setContactName] = useState('');
  const [platform, setPlatform] = useState<Lead['platform']>('Instagram');
  const [handle, setHandle] = useState('');
  const [city, setCity] = useState('');
  const [targetWeek, setTargetWeek] = useState<string>(currentWeekKey);
  const [scheduledDay, setScheduledDay] = useState<Weekday>(getTodayWeekday());
  const [mockupCategory, setMockupCategory] = useState<Lead['mockupCategory']>('italian');
  const [status, setStatus] = useState<LeadStatus>('not_sent');
  const [mockupLink, setMockupLink] = useState('');
  const [dealValue, setDealValue] = useState(299);
  const [notes, setNotes] = useState('');
  const [pitchHook, setPitchHook] = useState('');
  const [initialDM, setInitialDM] = useState('');
  const [followup3DM, setFollowup3DM] = useState('');
  const [followup7DM, setFollowup7DM] = useState('');
  const [leadAnalysis, setLeadAnalysis] = useState('');
  const [contactDate, setContactDate] = useState(today);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName.trim()) return;

    const nextFollowup = calculateNextFollowupDate(contactDate || today, 0);
    const resolvedInitial = initialDM.trim() || pitchHook.trim();

    onAddLead({
      restaurantName: restaurantName.trim(),
      isCustomName: true,
      contactName: contactName.trim() || undefined,
      platform,
      handle: handle.trim() || `@${restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      city: city.trim() || 'New York, NY',
      targetWeek: targetWeek || currentWeekKey,
      scheduledDay,
      createdAt: new Date().toISOString(),
      mockupLink: mockupLink.trim() || `https://demo.closer.app/${restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      mockupCategory,
      dateFirstContact: contactDate || today,
      lastContactDate: status === 'not_sent' ? '' : (contactDate || today),
      nextFollowupDate: nextFollowup,
      followupCount: 0,
      status,
      notes: notes.trim(),
      leadAnalysis: leadAnalysis.trim() || undefined,
      analysisSavedAt: leadAnalysis.trim() ? new Date().toISOString() : undefined,
      pitchHook: resolvedInitial || undefined,
      stagedDmMiniPitch: resolvedInitial || undefined,
      initialDM: resolvedInitial || undefined,
      followup3DM: followup3DM.trim() || undefined,
      followup7DM: followup7DM.trim() || undefined,
      estimatedDealValue: Number(dealValue) || 299,
      auditChecklist: [false, false, false],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">Add New Lead</h3>
              <p className="text-xs text-slate-400">Automatic 2-step follow-up rhythm (Day 3 &amp; Day 7)</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
              Restaurant / Business Name *
            </label>
            <input
              type="text"
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g. Osteria del Mare"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
                Owner / Contact Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Gianluigi"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Boston, MA"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="Instagram">📸 Instagram Leads Page</option>
                <option value="Facebook">📘 Facebook Leads Page</option>
                <option value="Email">✉️ Email Leads Page</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="TikTok">TikTok</option>
                <option value="Phone">Phone</option>
              </select>

            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
                Handle / Account
              </label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@osteriadelmare"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
                Mockup Niche Theme
              </label>
              <select
                value={mockupCategory}
                onChange={(e) => setMockupCategory(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="italian">Italian / Pasta & Pizza</option>
                <option value="sushi">Japanese / Sushi & Omakase</option>
                <option value="steakhouse">Steakhouse & Grill</option>
                <option value="cafe">Patisserie & Bistro / Cafe</option>
                <option value="cocktail_bar">Cocktail Bar & Speakeasy</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1 flex items-center gap-1">
                <CalendarDays className="h-3 w-3 text-purple-400" />
                Target Outreach Week
              </label>
              <select
                value={targetWeek}
                onChange={(e) => setTargetWeek(e.target.value)}
                className="w-full rounded-xl border border-purple-500/30 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                <option value={currentWeekKey}>This Week ({formatWeekLabel(currentWeekKey, true)})</option>
                <option value={nextWeekKey}>Next Week ({formatWeekLabel(nextWeekKey, true)})</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-indigo-400" />
                Scheduled Dispatch Day
              </label>
              <select
                value={scheduledDay}
                onChange={(e) => setScheduledDay(e.target.value as Weekday)}
                className="w-full rounded-xl border border-indigo-500/30 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                {WEEKDAYS.map((wDay) => (
                  <option key={wDay} value={wDay}>
                    {wDay} (Weekly 10-pack)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
              Initial Stage / Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="not_sent">⏳ Not Sent (Queued for Dispatch)</option>
              <option value="sent">📤 Sent (Initial Outreach Dispatched)</option>
              <option value="seen">👀 Seen</option>
              <option value="replied">💬 Replied / In Conversation</option>
              <option value="mockup_sent">🎨 Mockup Sent</option>
              <option value="call_booked">📞 Call Booked</option>
              <option value="proposal_sent">📑 Proposal Sent</option>
              <option value="closed_won">🏆 Closed Won</option>
            </select>
          </div>

          {/* 3-Step Sequence Textareas */}
          <div className="space-y-3 rounded-2xl border border-indigo-500/20 bg-slate-950/60 p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-300 block">
                3-Step DM Sequence (Day 1, 3 &amp; 7)
              </label>
              <button
                type="button"
                onClick={() => {
                  const name = contactName.trim() || restaurantName.trim() || 'there';
                  const slug = (restaurantName || 'business').toLowerCase().replace(/[^a-z0-9]/g, '');
                  const initial = `Hey ${name}! Loved the vibe at ${restaurantName || 'your spot'}. Put together a 0.3s direct ordering concept for you: https://demo.closer.app/${slug}. Waiving our $299 setup fee completely for 3 local spots in exchange for a short review. Want me to send the preview?`;
                  const fu3 = `Hey ${name}, bumping this quick! Wondering if you had 30 seconds to click through the interactive demo I put together for ${restaurantName || 'your spot'}? No pressure at all!`;
                  const fu7 = `Hey ${name}, wanted to send one final quick note! Recorded a 45-second screen recording showing exactly how the setup works for ${restaurantName || 'your spot'}. Should I drop the link here or leave you be?`;
                  setInitialDM(initial);
                  setPitchHook(initial);
                  setFollowup3DM(fu3);
                  setFollowup7DM(fu7);
                }}
                className="text-[10px] text-indigo-400 hover:text-white font-bold transition cursor-pointer"
              >
                + Auto-Fill All 3 Steps
              </button>
            </div>

            {/* Step 1 */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Message 1: Initial DM (Day 1)
              </label>
              <textarea
                value={initialDM}
                onChange={(e) => {
                  setInitialDM(e.target.value);
                  setPitchHook(e.target.value);
                }}
                rows={2}
                placeholder="Initial pitch hook dispatched on Day 1..."
                className="w-full rounded-xl border border-indigo-500/30 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Step 2 */}
            <div>
              <label className="text-[11px] font-semibold text-amber-300 block mb-1">
                Message 2: 3-Day Follow-Up (Day 3)
              </label>
              <textarea
                value={followup3DM}
                onChange={(e) => setFollowup3DM(e.target.value)}
                rows={2}
                placeholder="Day +3 quick bump check-in..."
                className="w-full rounded-xl border border-amber-500/30 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Step 3 */}
            <div>
              <label className="text-[11px] font-semibold text-rose-300 block mb-1">
                Message 3: 7-Day Breakup (Day 7)
              </label>
              <textarea
                value={followup7DM}
                onChange={(e) => setFollowup7DM(e.target.value)}
                rows={2}
                placeholder="Day +7 final Loom / breakup touchpoint..."
                className="w-full rounded-xl border border-rose-500/30 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Gemini Lead Analysis Block */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Gemini Lead Analysis Block (Optional)</span>
              </label>
              {leadAnalysis && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {leadAnalysis.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              )}
            </div>
            <textarea
              value={leadAnalysis}
              onChange={(e) => setLeadAnalysis(e.target.value)}
              rows={3}
              placeholder="Paste raw Gemini Lead Analysis here to pre-load prospect research & DeepSeek sequences..."
              className="w-full rounded-xl border border-emerald-500/30 bg-slate-950 p-2.5 text-xs font-mono text-white placeholder-slate-600 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
              Custom Strategic Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Current website menu is a PDF that doesn't load on phone. Active on Instagram."
              className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 active:scale-95 transition"
            >
              Onboard Lead & Schedule Outreach
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
