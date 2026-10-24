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
  const [contactDate, setContactDate] = useState(today);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName.trim()) return;

    const nextFollowup = calculateNextFollowupDate(contactDate || today, 0);
    const trimmedPitch = pitchHook.trim();

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
      pitchHook: trimmedPitch || undefined,
      stagedDmMiniPitch: trimmedPitch || undefined,
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-300 block">
                Individual Outreach Pitch / Message
              </label>
              <button
                type="button"
                onClick={() => {
                  const name = contactName.trim() || restaurantName.trim() || 'there';
                  const slug = (restaurantName || 'business').toLowerCase().replace(/[^a-z0-9]/g, '');
                  setPitchHook(`Hey ${name}! Loved the vibe at ${restaurantName || 'your spot'}. Put together a 0.3s direct ordering concept for you: https://demo.closer.app/${slug}. Waiving our $299 setup fee completely for 3 local spots in exchange for a short review. Want me to send the preview?`);
                }}
                className="text-[10px] text-indigo-400 hover:text-white font-bold transition cursor-pointer"
              >
                + Auto-Fill Pitch
              </button>
            </div>
            <textarea
              value={pitchHook}
              onChange={(e) => setPitchHook(e.target.value)}
              rows={2}
              placeholder="Custom tailored pitch message you want to send this specific lead..."
              className="w-full rounded-xl border border-indigo-500/30 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
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
