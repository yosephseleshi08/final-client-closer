import React from 'react';
import {
  Instagram,
  CalendarDays,
  LayoutDashboard,
  LineChart,
  Layers,
  History,
  Inbox,
} from 'lucide-react';
import { GlobalNavTab } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: GlobalNavTab;
  setActiveTab: (tab: GlobalNavTab) => void;
  combinedLeadCount?: number;
  instagramLeadCount?: number;
  inboxCount?: number;
  todayTaskCount?: number;
  isFrozen?: boolean;
  onToggleFreeze?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  combinedLeadCount = 0,
  instagramLeadCount = 0,
  inboxCount = 0,
  todayTaskCount = 0,
  isFrozen = false,
  onToggleFreeze,
}) => {
  const navButtons: {
    id: GlobalNavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
    colorClass: string;
  }[] = [
    {
      id: 'combined',
      label: 'Combined Outreach',
      icon: <Layers className="w-4 h-4" />,
      badge: combinedLeadCount,
      colorClass: 'text-indigo-400',
    },
    {
      id: 'instagram',
      label: 'Instagram',
      icon: <Instagram className="w-4 h-4" />,
      badge: instagramLeadCount,
      colorClass: 'text-pink-400',
    },
    {
      id: 'inbox',
      label: '📥 Lead Inbox',
      icon: <Inbox className="w-4 h-4" />,
      badge: inboxCount > 0 ? inboxCount : undefined,
      badgeColor: inboxCount > 0 ? 'bg-purple-500 text-white font-bold' : undefined,
      colorClass: 'text-purple-400',
    },
    {
      id: 'today',
      label: "Today's Schedule",
      icon: <CalendarDays className="w-4 h-4" />,
      badge: isFrozen ? '❄️ Paused' : todayTaskCount,
      badgeColor: isFrozen
        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold'
        : todayTaskCount > 0
        ? 'bg-amber-500 text-slate-950 font-black animate-pulse'
        : undefined,
      colorClass: isFrozen ? 'text-cyan-400' : 'text-amber-400',
    },
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      colorClass: 'text-purple-400',
    },
    {
      id: 'history',
      label: '📊 History',
      icon: <History className="w-4 h-4" />,
      colorClass: 'text-orange-400',
    },
  ];

  return (
    <header className="mb-6 rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5 backdrop-blur-xl shadow-2xl shadow-black/50">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Brand Zone */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 via-pink-500/20 to-sky-500/20 border border-white/10 flex items-center justify-center shadow-lg">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white font-['Outfit']">
                  Outreach Engine Pro
                </h1>
                {isFrozen && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold font-mono">
                    ❄️ Frozen
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Multi-Channel Outreach & Sales Cadence Command Center
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            {onToggleFreeze && (
              <button
                type="button"
                onClick={onToggleFreeze}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  isFrozen
                    ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                    : 'border border-white/10 bg-white/5 text-slate-400'
                }`}
                title={isFrozen ? 'Pipeline Frozen (Click to Resume)' : 'Freeze Week'}
              >
                <span>{isFrozen ? '❄️ Frozen' : '❄️ Freeze'}</span>
              </button>
            )}
            <PWAInstallButton />
          </div>
        </div>

        {/* Global Top Navigation */}
        <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1 bg-slate-950/60 rounded-xl border border-white/5">
          {navButtons.map((btn) => {
            const isActive = activeTab === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setActiveTab(btn.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold transition-all rounded-lg cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-800 text-white border border-white/20 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className={isActive ? btn.colorClass : 'text-slate-400'}>
                  {btn.icon}
                </span>
                <span>{btn.label}</span>
                {typeof btn.badge !== 'undefined' && (typeof btn.badge === 'string' || btn.badge > 0) && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                      btn.badgeColor || 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {btn.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Desktop Utility */}
        <div className="hidden md:flex items-center gap-2.5">
          {onToggleFreeze && (
            <button
              type="button"
              onClick={onToggleFreeze}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                isFrozen
                  ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 shadow-md shadow-cyan-950/50 hover:bg-cyan-500/30'
                  : 'border border-white/10 bg-white/5 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 hover:bg-white/10'
              }`}
              title={
                isFrozen
                  ? 'Pipeline is currently frozen. Click to resume and start your week!'
                  : 'Freeze pipeline for this week: pauses daily tasks, protects streaks, and prevents missed penalties.'
              }
            >
              <span>{isFrozen ? '❄️ Frozen (Click to Resume)' : '❄️ Freeze Week'}</span>
            </button>
          )}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
