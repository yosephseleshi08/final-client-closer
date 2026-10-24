import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, Flame } from 'lucide-react';
import { Lead, Weekday } from '../types';
import {
  WEEKDAYS,
  WEEKDAY_CONFIG,
  getTodayWeekday,
  getLeadDayPosition,
  getCurrentWeekKey,
  getNextWeekKey,
  normalizeLeadWeek,
  formatWeekLabel,
} from '../utils/weeklyScheduler';

interface DayBadgeProps {
  lead: Lead;
  allLeads?: Lead[];
  onRescheduleLead?: (leadId: number, newDay: Weekday, targetWeek?: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showPosition?: boolean;
  interactive?: boolean;
}

export const DayBadge: React.FC<DayBadgeProps> = ({
  lead,
  allLeads = [],
  onRescheduleLead,
  size = 'md',
  showPosition = true,
  interactive = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownTab, setDropdownTab] = useState<'current' | 'next'>('current');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentWeekKey = getCurrentWeekKey();
  const nextWeekKey = getNextWeekKey();
  const leadWeek = normalizeLeadWeek(lead);
  const isNextWeek = leadWeek === nextWeekKey;

  const day = lead.scheduledDay;
  const config = day && WEEKDAY_CONFIG[day] ? WEEKDAY_CONFIG[day] : null;
  const todayWeekday = getTodayWeekday();
  const isToday = day === todayWeekday && leadWeek === currentWeekKey;

  const { position, totalForDay } = allLeads.length > 0
    ? getLeadDayPosition(lead, allLeads, leadWeek)
    : { position: 1, totalForDay: 10 };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const targetDropdownWeek = dropdownTab === 'current' ? currentWeekKey : nextWeekKey;

  if (!day || !config) {
    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (interactive && onRescheduleLead) setIsOpen(!isOpen);
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:border-slate-500 transition cursor-pointer"
        >
          <Calendar className="h-3 w-3" />
          <span>Unassigned</span>
          {interactive && onRescheduleLead && <ChevronDown className="h-2.5 w-2.5 opacity-60" />}
        </button>

        {isOpen && onRescheduleLead && (
          <div
            className="absolute left-0 mt-1 z-50 w-52 rounded-xl border border-white/10 bg-slate-900 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 p-0.5 mb-1.5 bg-slate-950 rounded-lg border border-white/5">
              <button
                type="button"
                onClick={() => setDropdownTab('current')}
                className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${
                  dropdownTab === 'current' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setDropdownTab('next')}
                className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${
                  dropdownTab === 'next' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Next Week
              </button>
            </div>

            <div className="px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 mb-1">
              Assign to {formatWeekLabel(targetDropdownWeek, true)} (10/day)
            </div>

            {WEEKDAYS.map((wDay) => {
              const wConfig = WEEKDAY_CONFIG[wDay];
              const count = allLeads.filter(
                (l) => l.scheduledDay === wDay && normalizeLeadWeek(l) === targetDropdownWeek
              ).length;
              return (
                <button
                  key={wDay}
                  type="button"
                  onClick={() => {
                    onRescheduleLead(lead.id, wDay, targetDropdownWeek);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${wConfig.dotColor}`} />
                    <span className="font-semibold">{wDay}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">({count}/10)</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const isSmall = size === 'sm';

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (interactive && onRescheduleLead) {
            setDropdownTab(isNextWeek ? 'next' : 'current');
            setIsOpen(!isOpen);
          }
        }}
        title={`Scheduled for ${day} in ${formatWeekLabel(leadWeek, true)} (Lead #${position} of ${totalForDay})${isToday ? ' - TODAY!' : ''}`}
        className={`inline-flex items-center gap-1.5 rounded-lg border font-bold transition shadow-sm cursor-pointer ${config.bgLight} ${config.textLight} ${config.borderLight} ${
          isToday ? 'ring-2 ring-indigo-400/50 shadow-indigo-500/20' : ''
        } ${isSmall ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'}`}
      >
        {isToday ? (
          <span className="flex items-center gap-0.5 text-amber-300 font-black">
            <Flame className="h-3 w-3 text-amber-400 animate-bounce" />
            <span className="uppercase text-[9px] tracking-wider bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30">TODAY</span>
          </span>
        ) : (
          <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
        )}

        <span>{config.short}</span>

        {isNextWeek && (
          <span className="rounded bg-purple-500/20 px-1 py-0.2 text-[9px] font-black text-purple-300 border border-purple-500/30">
            Next Wk
          </span>
        )}

        {showPosition && (
          <span className="font-mono text-[10px] opacity-80 border-l border-white/15 pl-1">
            #{position}
          </span>
        )}

        {interactive && onRescheduleLead && (
          <ChevronDown className="h-2.5 w-2.5 opacity-60 ml-0.5" />
        )}
      </button>

      {isOpen && onRescheduleLead && (
        <div
          className="absolute left-0 mt-1 z-50 w-52 rounded-xl border border-white/10 bg-slate-900 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Week Tab Switcher */}
          <div className="flex items-center gap-1 p-0.5 mb-1.5 bg-slate-950 rounded-lg border border-white/5">
            <button
              type="button"
              onClick={() => setDropdownTab('current')}
              className={`flex-1 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                dropdownTab === 'current' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setDropdownTab('next')}
              className={`flex-1 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                dropdownTab === 'next' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Next Week
            </button>
          </div>

          <div className="px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 mb-1">
            Move to Day in {formatWeekLabel(targetDropdownWeek, true)}
          </div>

          {WEEKDAYS.map((wDay) => {
            const wConfig = WEEKDAY_CONFIG[wDay];
            const isCurrent = lead.scheduledDay === wDay && leadWeek === targetDropdownWeek;
            const count = allLeads.filter(
              (l) => l.scheduledDay === wDay && normalizeLeadWeek(l) === targetDropdownWeek
            ).length;
            const isDayToday = wDay === todayWeekday && targetDropdownWeek === currentWeekKey;

            return (
              <button
                key={wDay}
                type="button"
                onClick={() => {
                  onRescheduleLead(lead.id, wDay, targetDropdownWeek);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-600/30 text-white font-bold'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${wConfig.dotColor}`} />
                  <span>{wDay}</span>
                  {isDayToday && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-black">
                      TODAY
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono ${count >= 10 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                    {count}/10
                  </span>
                  {isCurrent && <Check className="h-3 w-3 text-indigo-400" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
