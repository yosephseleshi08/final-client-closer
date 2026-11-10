import React, { useState } from 'react';
import {
  Mail,
  Instagram,
  Facebook,
  Users,
  MessageSquare,
  Calendar,
  Clock,
  Image as ImageIcon,
  Layers,
  Flame,
} from 'lucide-react';
import { ChannelLead, MultiChannelType, MultiChannelSubTab } from '../../types';
import { LeadsSubPage } from './LeadsSubPage';
import { DmSubPage } from './DmSubPage';
import { ScheduleSubPage } from './ScheduleSubPage';
import { FollowupScheduleSubPage } from './FollowupScheduleSubPage';
import { MockupSubPage } from './MockupSubPage';
import { getChannelLabel } from '../../utils/channelStorage';
import { getLocalTodayStr, getTomorrowWarmupTargetDate, isEmailOnlyLead } from '../../utils/cadenceEngine';

interface ChannelWorkspaceProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
  onNavigateToChannel?: (channel: MultiChannelType) => void;
  allLeads?: {
    combined?: ChannelLead[];
    instagram?: ChannelLead[];
    facebook?: ChannelLead[];
    email?: ChannelLead[];
  };
  onUpdateEmailLeads?: (leads: ChannelLead[]) => void;
  onUpdateInstagramLeads?: (leads: ChannelLead[]) => void;
  onUpdateFacebookLeads?: (leads: ChannelLead[]) => void;
}

export function ChannelWorkspace({
  channel,
  leads,
  onUpdateLeads,
  onNavigateToChannel,
  allLeads,
  onUpdateEmailLeads,
  onUpdateInstagramLeads,
  onUpdateFacebookLeads,
}: ChannelWorkspaceProps) {
  const [activeSubTab, setActiveSubTab] = useState<MultiChannelSubTab>('leads');

  const getChannelIcon = () => {
    switch (channel) {
      case 'combined':
        return <Layers className="w-5 h-5 text-indigo-400" />;
      case 'email':
        return <Mail className="w-5 h-5 text-indigo-400" />;
      case 'instagram':
        return <Instagram className="w-5 h-5 text-pink-400" />;
      case 'facebook':
        return <Facebook className="w-5 h-5 text-sky-400" />;
    }
  };

  const getChannelTheme = () => {
    switch (channel) {
      case 'combined':
        return {
          gradient: 'from-indigo-500/20 via-sky-500/10 to-transparent',
          border: 'border-indigo-500/30',
          badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
          activeTab: 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-indigo-600/30',
        };
      case 'email':
        return {
          gradient: 'from-indigo-500/20 via-indigo-500/5 to-transparent',
          border: 'border-indigo-500/30',
          badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
          activeTab: 'bg-indigo-600 text-white shadow-indigo-600/30',
        };
      case 'instagram':
        return {
          gradient: 'from-pink-500/20 via-pink-500/5 to-transparent',
          border: 'border-pink-500/30',
          badge: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
          activeTab: 'bg-pink-600 text-white shadow-pink-600/30',
        };
      case 'facebook':
        return {
          gradient: 'from-sky-500/20 via-sky-500/5 to-transparent',
          border: 'border-sky-500/30',
          badge: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
          activeTab: 'bg-sky-600 text-white shadow-sky-600/30',
        };
    }
  };

  const theme = getChannelTheme();
  const todayStr = getLocalTodayStr();
  const warmupTargetDate = getTomorrowWarmupTargetDate(todayStr);

  // Leads scheduled for tomorrow that are not yet sent (excluding Email-only leads which require no warm-up)
  const tomorrowLeadsNeedingWarmup = leads.filter(
    (l) => !l.isCompleted && !l.initialSentDate && l.scheduledDate === warmupTargetDate && !isEmailOnlyLead(l)
  );
  const tomorrowLockedCount = tomorrowLeadsNeedingWarmup.filter(
    (l) => l.warmupStatus !== 'warmed' && !l.isWarmedUp
  ).length;

  // Calculate actionable items in this channel for badge (Initial due + Day 7 + Day 14 + Day 30)
  const urgentCount = leads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
    if (!l.initialSentDate && l.scheduledDate && l.scheduledDate <= todayStr) return true;
    if (l.initialSentDate && (l.followupCount === 0 || l.followupCount === undefined) && l.followup1Date && l.followup1Date <= todayStr) return true;
    if (l.initialSentDate && l.followupCount === 1 && l.followup2Date && l.followup2Date <= todayStr) return true;
    return false;
  }).length;

  const subTabs: { id: MultiChannelSubTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'leads',
      label: 'Leads',
      icon: <Users className="w-4 h-4" />,
      badge: leads.length,
    },
    {
      id: 'dm',
      label: '🔥 Warm-Up Today',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      badge: tomorrowLockedCount > 0 ? tomorrowLockedCount : tomorrowLeadsNeedingWarmup.length > 0 ? tomorrowLeadsNeedingWarmup.length : undefined,
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: <Calendar className="w-4 h-4" />,
      badge: leads.filter((l) => !!l.scheduledDate).length,
    },
    {
      id: 'followup',
      label: 'Follow-Up Schedule',
      icon: <Clock className="w-4 h-4" />,
      badge: urgentCount > 0 ? urgentCount : undefined,
    },
    {
      id: 'mockup',
      label: 'Mockup',
      icon: <ImageIcon className="w-4 h-4" />,
      badge: leads.filter((l) => !!l.hasMockup || !!l.mockupHtml).length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Channel Header Banner */}
      <div
        className={`rounded-2xl border ${theme.border} bg-gradient-to-r ${theme.gradient} p-5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-lg">
            {getChannelIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white font-['Outfit']">
                {getChannelLabel(channel)} Workspace
              </h1>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${theme.badge}`}>
                {channel === 'combined' ? 'Unified Pipeline · 4 Daily Quota' : 'Independent Store'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {channel === 'combined'
                ? 'Unified outreach pipeline for Email & Facebook prospects. Daily Quota: 4 touchpoints.'
                : `Strictly isolated data pipeline for ${getChannelLabel(channel)} outreach and client acquisition.`}
            </p>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-300 self-start sm:self-auto bg-slate-950/40 px-4 py-2 rounded-xl border border-white/5">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Total</span>
            <strong className="text-slate-100 tabular-nums">{leads.length}</strong>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-sans">DMs Ready</span>
            <strong className="text-indigo-300 tabular-nums">{leads.filter((l) => !!l.customPitch).length}</strong>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Scheduled</span>
            <strong className="text-slate-100 tabular-nums">{leads.filter((l) => !!l.scheduledDate).length}</strong>
          </div>
        </div>
      </div>

      {/* Internal Sub-Navigation Tabs (The 5 Sub-Pages) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-white/10 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          const isUrgentBadge = tab.id === 'followup' && urgentCount > 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? `${theme.activeTab} shadow-lg`
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.badge !== 'undefined' && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                    isUrgentBadge
                      ? 'bg-rose-500 text-white animate-pulse'
                      : isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Sub-Page Content */}
      <div className="transition-opacity duration-150">
        {activeSubTab === 'leads' && (
          <LeadsSubPage
            channel={channel}
            leads={leads}
            onUpdateLeads={onUpdateLeads}
            onNavigateToChannel={onNavigateToChannel}
          />
        )}

        {activeSubTab === 'dm' && (
          <DmSubPage
            channel={channel}
            leads={leads}
            onUpdateLeads={onUpdateLeads}
          />
        )}

        {activeSubTab === 'schedule' && (
          <ScheduleSubPage
            channel={channel}
            leads={leads}
            onUpdateLeads={onUpdateLeads}
          />
        )}

        {activeSubTab === 'followup' && (
          <FollowupScheduleSubPage
            channel={channel}
            leads={leads}
            onUpdateLeads={onUpdateLeads}
            onNavigateToSchedule={() => setActiveSubTab('schedule')}
          />
        )}

        {activeSubTab === 'mockup' && (
          <MockupSubPage
            channel={channel}
            leads={leads}
            onUpdateLeads={onUpdateLeads}
          />
        )}
      </div>
    </div>
  );
}
