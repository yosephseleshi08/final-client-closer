import React, { useState, useEffect, useRef } from 'react';
import { Bell, Flame, CheckCircle2, ChevronRight, AlertCircle, Volume2, Sparkles, Zap } from 'lucide-react';
import { Lead } from '../types';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission } from '../utils/notificationService';
import { playNotificationChime } from '../utils/soundEffects';
import { getCurrentWeekKey, normalizeLeadWeek } from '../utils/weeklyScheduler';
import { addDays } from '../data/initialLeads';

interface NotificationBellProps {
  leads: Lead[];
  todayWeekday: string;
  onSelectLead: (lead: Lead) => void;
  onOpenDispatch: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  leads,
  todayWeekday,
  onSelectLead,
  onOpenDispatch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentWeekKey = getCurrentWeekKey();

  // Strict Exact Day 3 follow-ups due today (send date + 3 days)
  const exactDay3Followups = leads.filter(
    (l) =>
      !['replied', 'closed_won', 'closed_dead'].includes(l.status) &&
      (l.status === 'sent' || l.status === 'mockup_sent' || l.status === 'seen') &&
      (l.followupCount || 0) === 0 &&
      (l.followup1Date ? l.followup1Date === todayStr : (l.dateFirstContact && addDays(l.dateFirstContact, 3) === todayStr))
  );

  // Strict Exact Day 7 follow-ups due today (send date + 7 days)
  const exactDay7Followups = leads.filter(
    (l) =>
      !['replied', 'closed_won', 'closed_dead'].includes(l.status) &&
      (l.status === 'sent' || l.status === 'mockup_sent' || l.status === 'seen') &&
      l.followupCount === 1 &&
      (l.followup2Date ? l.followup2Date === todayStr : (l.dateFirstContact && addDays(l.dateFirstContact, 7) === todayStr))
  );

  const dueFollowups = [...exactDay3Followups, ...exactDay7Followups];

  // Today's scheduled DMs (current week's pending batch)
  const todayScheduledDms = leads.filter(
    (l) => l.scheduledDay === todayWeekday && 
           normalizeLeadWeek(l) === currentWeekKey && 
           l.status === 'not_sent'
  );

  const totalUrgentCount = dueFollowups.length + todayScheduledDms.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
  };

  const handleTestSound = () => {
    playNotificationChime();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center justify-center h-10 w-10 rounded-xl border transition cursor-pointer ${
          totalUrgentCount > 0
            ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 shadow-lg shadow-rose-950/40'
            : 'border-white/10 bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
        }`}
        title={`${totalUrgentCount} follow-ups & DMs due today`}
      >
        <Bell className={`h-5 w-5 ${totalUrgentCount > 0 ? 'text-rose-400 animate-wiggle' : 'text-slate-400'}`} />
        {totalUrgentCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-md shadow-rose-600/50 animate-pulse">
            {totalUrgentCount > 9 ? '9+' : totalUrgentCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-2xl z-50 text-slate-100">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white font-['Outfit']">Today's Action Feed</h3>
            </div>
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold text-rose-300 border border-rose-500/30">
              {totalUrgentCount} Actionable
            </span>
          </div>

          {/* Browser Notification Permission Banner */}
          {isNotificationSupported() && permission !== 'granted' && (
            <div className="mb-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-indigo-200">
                <AlertCircle className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>Enable desktop alert pings when follow-ups are due</span>
              </div>
              <button
                onClick={handleRequestPermission}
                className="shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 text-[11px] font-bold text-white transition cursor-pointer"
              >
                Allow
              </button>
            </div>
          )}

          {/* Audio Chime Test */}
          <div className="mb-3 flex items-center justify-between text-xs text-slate-400 bg-white/5 rounded-xl px-3 py-1.5 border border-white/5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Audio Reminder Chime
            </span>
            <button
              onClick={handleTestSound}
              className="flex items-center gap-1 text-[11px] font-medium text-indigo-300 hover:text-indigo-200 transition cursor-pointer"
              title="Test follow-up chime sound"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Test Audio</span>
            </button>
          </div>

          {/* Due Items List */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {dueFollowups.length === 0 && todayScheduledDms.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2 opacity-80" />
                <p className="font-semibold text-slate-300">All caught up for today!</p>
                <p className="text-[11px] text-slate-400 mt-1">Zero pending follow-ups or overdue tasks.</p>
              </div>
            ) : (
              <>
                {dueFollowups.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
                      <span>Exact Follow-ups Due Today ({dueFollowups.length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">Day 3 &amp; Day 7</span>
                    </div>
                    {dueFollowups.slice(0, 5).map((lead) => {
                      const isDay3 = (lead.followupCount || 0) === 0;
                      return (
                        <div
                          key={lead.id}
                          onClick={() => {
                            onSelectLead(lead);
                            setIsOpen(false);
                          }}
                          className={`group mb-1.5 flex items-center justify-between rounded-xl p-2.5 transition border cursor-pointer ${
                            isDay3
                              ? 'bg-amber-950/20 hover:bg-amber-950/40 border-amber-500/30 hover:border-amber-500/50'
                              : 'bg-rose-950/20 hover:bg-rose-950/40 border-rose-500/30 hover:border-rose-500/50'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-white truncate">{lead.restaurantName}</span>
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.2 rounded font-mono ${
                                  isDay3
                                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                    : 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {isDay3 ? '⚡ DAY 3' : '🔥 DAY 7 FINAL'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {lead.platform} • Sent: <span className="text-slate-300 font-mono">{lead.dateFirstContact || '3 days ago'}</span>
                            </p>
                          </div>
                          <ChevronRight className={`h-4 w-4 shrink-0 transition ${isDay3 ? 'text-amber-400' : 'text-rose-400'}`} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {todayScheduledDms.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-1">
                      <span>Today's {todayWeekday} DM Batch ({todayScheduledDms.length})</span>
                    </div>
                    {todayScheduledDms.slice(0, 3).map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => {
                          onSelectLead(lead);
                          setIsOpen(false);
                        }}
                        className="group mb-1.5 flex items-center justify-between rounded-xl bg-white/5 hover:bg-indigo-500/10 p-2.5 transition border border-white/5 hover:border-indigo-500/25 cursor-pointer"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold text-xs text-white truncate block">{lead.restaurantName}</span>
                          <p className="text-[11px] text-slate-400 truncate">
                            {lead.platform} {lead.handle} • {lead.city}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quick Action Footer */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenDispatch();
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 transition cursor-pointer"
            >
              <span>Launch Today's Battle Plan</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
