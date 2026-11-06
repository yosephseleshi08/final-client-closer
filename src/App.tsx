import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { ChannelWorkspace } from './components/channel/ChannelWorkspace';
import { TodaysSchedulePage } from './components/TodaysSchedulePage';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { AnalyticsView } from './components/AnalyticsView';
import { HistoryPage } from './components/HistoryPage';
import { LeadInboxView } from './components/LeadInboxView';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  ChannelLead,
  GlobalNavTab,
  MultiChannelType,
} from './types';
import {
  loadChannelLeads,
  saveChannelLeads,
} from './utils/channelStorage';
import { loadInboxLeads } from './utils/inboxStorage';
import {
  getLocalTodayStr,
  isDateToday,
  isDateOverdue,
  isLeadDismissedToday,
  isTodaySunday,
} from './utils/cadenceEngine';
import { isPipelineFrozenNow, togglePipelineFreeze } from './utils/pipelineFreeze';

export default function App() {
  const [activeNavTab, setActiveNavTab] = useState<GlobalNavTab>('today');
  const [isFrozen, setIsFrozen] = useState<boolean>(() => isPipelineFrozenNow());
  const [inboxCount, setInboxCount] = useState<number>(() => loadInboxLeads().length);

  // Listen for pipeline freeze & inbox changes across components
  React.useEffect(() => {
    const handleFreeze = () => setIsFrozen(isPipelineFrozenNow());
    const handleInbox = () => setInboxCount(loadInboxLeads().length);
    window.addEventListener('pipeline_freeze_changed', handleFreeze);
    window.addEventListener('inbox_leads_changed', handleInbox);
    window.addEventListener('storage', handleFreeze);
    window.addEventListener('storage', handleInbox);
    return () => {
      window.removeEventListener('pipeline_freeze_changed', handleFreeze);
      window.removeEventListener('inbox_leads_changed', handleInbox);
      window.removeEventListener('storage', handleFreeze);
      window.removeEventListener('storage', handleInbox);
    };
  }, []);

  const handleToggleFreeze = () => {
    const updated = togglePipelineFreeze();
    setIsFrozen(updated.isFrozen);
  };

  // Channel Leads State (Instagram & Unified Combined Outreach)
  const [combinedLeads, setCombinedLeads] = useState<ChannelLead[]>(() =>
    loadChannelLeads('combined')
  );

  const [instagramLeads, setInstagramLeads] = useState<ChannelLead[]>(() =>
    loadChannelLeads('instagram')
  );

  const handleUpdateCombinedLeads = (updated: ChannelLead[]) => {
    setCombinedLeads(updated);
    saveChannelLeads('combined', updated);
  };

  const handleUpdateInstagramLeads = (updated: ChannelLead[]) => {
    setInstagramLeads(updated);
    saveChannelLeads('instagram', updated);
  };

  const todayStr = getLocalTodayStr();

  // Calculate live daily tasks due across all channels
  const todayTaskCount = useMemo(() => {
    if (isTodaySunday() || isFrozen) return 0; // Paused on Sunday Rest Mode or Pipeline Freeze Mode
    const all = [...combinedLeads, ...instagramLeads];
    return all.filter((l) => {
      if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
      if (isLeadDismissedToday(l)) return false;

      // 1. Initial outreach due today or overdue
      if (!l.initialSentDate && l.scheduledDate && (isDateToday(l.scheduledDate) || isDateOverdue(l.scheduledDate))) {
        return true;
      }

      // 2. Follow-Up #1 due today or overdue
      if (l.initialSentDate && (l.followupCount === 0 || l.followupCount === undefined) && l.followup1Date && (isDateToday(l.followup1Date) || isDateOverdue(l.followup1Date))) {
        return true;
      }

      // 3. Follow-Up #2 due today or overdue
      if (l.initialSentDate && l.followupCount === 1 && l.followup2Date && (isDateToday(l.followup2Date) || isDateOverdue(l.followup2Date))) {
        return true;
      }

      return false;
    }).length;
  }, [combinedLeads, instagramLeads, todayStr, isFrozen]);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      <OfflineIndicator />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Global Top Navigation (Combined Outreach, Instagram, Inbox, Today, Dashboard, Insights, History) */}
        <Header
          activeTab={activeNavTab}
          setActiveTab={setActiveNavTab}
          combinedLeadCount={combinedLeads.length}
          instagramLeadCount={instagramLeads.length}
          inboxCount={inboxCount}
          todayTaskCount={todayTaskCount}
          isFrozen={isFrozen}
          onToggleFreeze={handleToggleFreeze}
        />

        {/* Workspace or Overview Views */}
        <main className="transition-all duration-150">
          {activeNavTab === 'combined' && (
            <ChannelWorkspace
              channel="combined"
              leads={combinedLeads}
              onUpdateLeads={handleUpdateCombinedLeads}
              onNavigateToChannel={(channel) => setActiveNavTab(channel as GlobalNavTab)}
              allLeads={{ combined: combinedLeads, instagram: instagramLeads }}
              onUpdateInstagramLeads={handleUpdateInstagramLeads}
            />
          )}

          {activeNavTab === 'instagram' && (
            <ChannelWorkspace
              channel="instagram"
              leads={instagramLeads}
              onUpdateLeads={handleUpdateInstagramLeads}
              onNavigateToChannel={(channel) => setActiveNavTab(channel as GlobalNavTab)}
              allLeads={{ combined: combinedLeads, instagram: instagramLeads }}
              onUpdateInstagramLeads={handleUpdateInstagramLeads}
            />
          )}

          {activeNavTab === 'inbox' && (
            <LeadInboxView
              onLeadAccepted={(targetChannel, updatedLeads) => {
                if (targetChannel === 'combined' || targetChannel === 'email' || targetChannel === 'facebook') {
                  handleUpdateCombinedLeads(updatedLeads);
                } else if (targetChannel === 'instagram') {
                  handleUpdateInstagramLeads(updatedLeads);
                }
              }}
              onNavigateToChannel={(channel) => {
                if (channel === 'email' || channel === 'facebook') {
                  setActiveNavTab('combined');
                } else {
                  setActiveNavTab(channel as GlobalNavTab);
                }
              }}
              channelLeads={{ combined: combinedLeads, instagram: instagramLeads }}
            />
          )}

          {activeNavTab === 'today' && (
            <TodaysSchedulePage
              combinedLeads={combinedLeads}
              instagramLeads={instagramLeads}
              onUpdateCombinedLeads={handleUpdateCombinedLeads}
              onUpdateInstagramLeads={handleUpdateInstagramLeads}
              onNavigateToChannel={(channel: MultiChannelType) => {
                if (channel === 'email' || channel === 'facebook') {
                  setActiveNavTab('combined');
                } else {
                  setActiveNavTab(channel as GlobalNavTab);
                }
              }}
              isFrozen={isFrozen}
              onToggleFreeze={handleToggleFreeze}
            />
          )}

          {activeNavTab === 'dashboard' && (
            <ExecutiveDashboard
              combinedLeads={combinedLeads}
              instagramLeads={instagramLeads}
              onNavigateToChannel={(channel: MultiChannelType) => {
                if (channel === 'email' || channel === 'facebook') {
                  setActiveNavTab('combined');
                } else {
                  setActiveNavTab(channel as GlobalNavTab);
                }
              }}
              onNavigateToToday={() => setActiveNavTab('today')}
              isFrozen={isFrozen}
              onToggleFreeze={handleToggleFreeze}
            />
          )}

          {activeNavTab === 'insights' && (
            <AnalyticsView
              combinedLeads={combinedLeads}
              instagramLeads={instagramLeads}
            />
          )}

          {activeNavTab === 'history' && (
            <HistoryPage
              onNavigateToToday={() => setActiveNavTab('today')}
              combinedLeads={combinedLeads}
              instagramLeads={instagramLeads}
            />
          )}
        </main>
      </div>

      {/* Subtle Bottom Bar */}
      <footer className="border-t border-white/[0.06] bg-slate-950/60 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Cadence Engine &amp; Unified Multi-Channel Storage Active</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Combined Outreach ({combinedLeads.length}) · Instagram ({instagramLeads.length}) · Today's Queue ({todayTaskCount})
          </span>
        </div>
      </footer>
    </div>
  );
}
