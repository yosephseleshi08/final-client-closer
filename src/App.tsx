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

  // Channel Leads State (Completely Isolated per Channel)
  const [emailLeads, setEmailLeads] = useState<ChannelLead[]>(() =>
    loadChannelLeads('email')
  );

  const [instagramLeads, setInstagramLeads] = useState<ChannelLead[]>(() =>
    loadChannelLeads('instagram')
  );

  const [facebookLeads, setFacebookLeads] = useState<ChannelLead[]>(() =>
    loadChannelLeads('facebook')
  );

  const handleUpdateEmailLeads = (updated: ChannelLead[]) => {
    setEmailLeads(updated);
    saveChannelLeads('email', updated);
  };

  const handleUpdateInstagramLeads = (updated: ChannelLead[]) => {
    setInstagramLeads(updated);
    saveChannelLeads('instagram', updated);
  };

  const handleUpdateFacebookLeads = (updated: ChannelLead[]) => {
    setFacebookLeads(updated);
    saveChannelLeads('facebook', updated);
  };

  const todayStr = getLocalTodayStr();

  // Calculate live daily tasks due across all channels
  const todayTaskCount = useMemo(() => {
    if (isTodaySunday() || isFrozen) return 0; // Paused on Sunday Rest Mode or Pipeline Freeze Mode
    const all = [...emailLeads, ...instagramLeads, ...facebookLeads];
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
  }, [emailLeads, instagramLeads, facebookLeads, todayStr, isFrozen]);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      <OfflineIndicator />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Global Top Navigation (Includes Today's Schedule & Lead Inbox) */}
        <Header
          activeTab={activeNavTab}
          setActiveTab={setActiveNavTab}
          emailLeadCount={emailLeads.length}
          instagramLeadCount={instagramLeads.length}
          facebookLeadCount={facebookLeads.length}
          inboxCount={inboxCount}
          todayTaskCount={todayTaskCount}
          isFrozen={isFrozen}
          onToggleFreeze={handleToggleFreeze}
        />

        {/* Workspace or Overview Views */}
        <main className="transition-all duration-150">
          {activeNavTab === 'email' && (
            <ChannelWorkspace
              channel="email"
              leads={emailLeads}
              onUpdateLeads={handleUpdateEmailLeads}
              onNavigateToChannel={(channel) => setActiveNavTab(channel)}
              allLeads={{ email: emailLeads, instagram: instagramLeads, facebook: facebookLeads }}
              onUpdateEmailLeads={handleUpdateEmailLeads}
              onUpdateInstagramLeads={handleUpdateInstagramLeads}
              onUpdateFacebookLeads={handleUpdateFacebookLeads}
            />
          )}

          {activeNavTab === 'instagram' && (
            <ChannelWorkspace
              channel="instagram"
              leads={instagramLeads}
              onUpdateLeads={handleUpdateInstagramLeads}
              onNavigateToChannel={(channel) => setActiveNavTab(channel)}
              allLeads={{ email: emailLeads, instagram: instagramLeads, facebook: facebookLeads }}
              onUpdateEmailLeads={handleUpdateEmailLeads}
              onUpdateInstagramLeads={handleUpdateInstagramLeads}
              onUpdateFacebookLeads={handleUpdateFacebookLeads}
            />
          )}

          {activeNavTab === 'facebook' && (
            <ChannelWorkspace
              channel="facebook"
              leads={facebookLeads}
              onUpdateLeads={handleUpdateFacebookLeads}
              onNavigateToChannel={(channel) => setActiveNavTab(channel)}
              allLeads={{ email: emailLeads, instagram: instagramLeads, facebook: facebookLeads }}
              onUpdateEmailLeads={handleUpdateEmailLeads}
              onUpdateInstagramLeads={handleUpdateInstagramLeads}
              onUpdateFacebookLeads={handleUpdateFacebookLeads}
            />
          )}

          {activeNavTab === 'inbox' && (
            <LeadInboxView
              onLeadAccepted={(targetChannel, updatedLeads) => {
                if (targetChannel === 'email') handleUpdateEmailLeads(updatedLeads);
                else if (targetChannel === 'instagram') handleUpdateInstagramLeads(updatedLeads);
                else if (targetChannel === 'facebook') handleUpdateFacebookLeads(updatedLeads);
              }}
              onNavigateToChannel={(channel) => setActiveNavTab(channel)}
              channelLeads={{ email: emailLeads, instagram: instagramLeads, facebook: facebookLeads }}
            />
          )}

          {activeNavTab === 'today' && (
            <TodaysSchedulePage
              emailLeads={emailLeads}
              instagramLeads={instagramLeads}
              facebookLeads={facebookLeads}
              onUpdateEmailLeads={handleUpdateEmailLeads}
              onUpdateInstagramLeads={handleUpdateInstagramLeads}
              onUpdateFacebookLeads={handleUpdateFacebookLeads}
              onNavigateToChannel={(channel: MultiChannelType) => setActiveNavTab(channel)}
              isFrozen={isFrozen}
              onToggleFreeze={handleToggleFreeze}
            />
          )}

          {activeNavTab === 'dashboard' && (
            <ExecutiveDashboard
              emailLeads={emailLeads}
              instagramLeads={instagramLeads}
              facebookLeads={facebookLeads}
              onNavigateToChannel={(channel: MultiChannelType) => setActiveNavTab(channel)}
              onNavigateToToday={() => setActiveNavTab('today')}
              isFrozen={isFrozen}
              onToggleFreeze={handleToggleFreeze}
            />
          )}

          {activeNavTab === 'insights' && (
            <AnalyticsView
              emailLeads={emailLeads}
              instagramLeads={instagramLeads}
              facebookLeads={facebookLeads}
            />
          )}

          {activeNavTab === 'history' && (
            <HistoryPage
              onNavigateToToday={() => setActiveNavTab('today')}
            />
          )}
        </main>
      </div>

      {/* Subtle Bottom Bar */}
      <footer className="border-t border-white/[0.06] bg-slate-950/60 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Cadence Engine &amp; Multi-Channel Storage Active</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Email ({emailLeads.length}) · Instagram ({instagramLeads.length}) · Facebook ({facebookLeads.length}) · Today's Queue ({todayTaskCount})
          </span>
        </div>
      </footer>
    </div>
  );
}
