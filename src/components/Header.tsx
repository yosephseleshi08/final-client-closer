import React from 'react';
import {
  Mail,
  Instagram,
  Facebook,
  CalendarDays,
  LayoutDashboard,
  LineChart,
  Layers,
} from 'lucide-react';
import { GlobalNavTab } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: GlobalNavTab;
  setActiveTab: (tab: GlobalNavTab) => void;
  emailLeadCount?: number;
  instagramLeadCount?: number;
  facebookLeadCount?: number;
  todayTaskCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  emailLeadCount = 0,
  instagramLeadCount = 0,
  facebookLeadCount = 0,
  todayTaskCount = 0,
}) => {
  const navButtons: {
    id: GlobalNavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
    colorClass: string;
  }[] = [
    {
      id: 'email',
      label: 'Email',
      icon: <Mail className="w-4 h-4" />,
      badge: emailLeadCount,
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
      id: 'facebook',
      label: 'Facebook',
      icon: <Facebook className="w-4 h-4" />,
      badge: facebookLeadCount,
      colorClass: 'text-sky-400',
    },
    {
      id: 'today',
      label: "Today's Schedule",
      icon: <CalendarDays className="w-4 h-4" />,
      badge: todayTaskCount,
      badgeColor: todayTaskCount > 0 ? 'bg-amber-500 text-slate-950 font-black animate-pulse' : undefined,
      colorClass: 'text-amber-400',
    },
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      colorClass: 'text-purple-400',
    },
    {
      id: 'insights',
      label: 'Insights & Analysis',
      icon: <LineChart className="w-4 h-4" />,
      colorClass: 'text-emerald-400',
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
              <h1 className="text-xl font-black tracking-tight text-white font-['Outfit']">
                Outreach Engine Pro
              </h1>
              <p className="text-xs text-slate-400">
                Multi-Channel Outreach & Sales Cadence Command Center
              </p>
            </div>
          </div>
          <div className="md:hidden">
            <PWAInstallButton />
          </div>
        </div>

        {/* Global Top Navigation */}
        <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-slate-950/60 rounded-xl border border-white/5">
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
                {typeof btn.badge !== 'undefined' && btn.badge > 0 && (
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
        <div className="hidden md:flex items-center gap-2">
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
