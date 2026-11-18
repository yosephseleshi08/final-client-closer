import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { ChannelWorkspace } from './components/channel/ChannelWorkspace';
import { TodaysSchedulePage } from './components/TodaysSchedulePage';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { HistoryPage } from './components/HistoryPage';
import { LeadInboxView } from './components/LeadInboxView';
import { BackstagePage } from './components/BackstagePage';
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
import { loadBackstageLeads } from './utils/backstageStorage';
import {
  getLocalTodayStr,
  isDateToday,
  isDateOverdue,
  isLeadDismissedToday,
  isTodaySunday,
  isLeadWarmedBeforeToday,
  isEmailOnlyLead,
  resolveLeadCadenceStep,
} from './utils/cadenceEngine';
import { isPipelineFrozenNow, togglePipelineFreeze } from './utils/pipelineFreeze';
import { runDiagnosticDataRepair } from './utils/dataRepair';
import { backfillDispatchLogFromLeads } from './utils/dispatchLog';
import { checkAndFreezeRolloverObligations } from './utils/dailyObligation';

export default function App() {
  const [activeNavTab, setActiveNavTab] = useState<GlobalNavTab>('today');
  const [isFrozen, setIsFrozen] = useState<boolean>(() => isPipelineFrozenNow());
  const [inboxCount, setInboxCount] = useState<number>(() => loadInboxLeads().length);

  // Run auto-clean Diagnostic Data Repair, immutable dispatch backfill, and rollover freeze on startup
  useState(() => {
    runDiagnosticDataRepair(false);
    backfillDispatchLogFromLeads([
      ...loadChannelLeads('combined'),
      ...loadChannelLeads('instagram'),
      ...loadBackstageLeads(),
    ]);
    checkAndFreezeRolloverObligations(getLocalTodayStr());
  });

  // Channel Leads State (Instagram & Unified Combined Outreach)
  const [combinedLeads, setCombinedLeads] = useState<ChannelLead[]>(() =>
    loadChannelLeads('combined')
  );

  const [instagramLeads, setInstagramLeads] = useState<ChannelLead[]>(() =>
    loadChannelLeads('instagram')
  );

  const [backstageLeads, setBackstageLeads] = useState<ChannelLead[]>(() =>
    loadBackstageLeads()
  );

  const isInternalSaveRef = React.useRef(false);

  // Listen for pipeline freeze, inbox, backstage, channel storage, and diagnostic data repair changes across components
  React.useEffect(() => {
    const handleFreeze = () => setIsFrozen(isPipelineFrozenNow());
    const handleInbox = () => setInboxCount(loadInboxLeads().length);
    const handleBackstage = () => setBackstageLeads(loadBackstageLeads());
    const handleChannelLeadsChanged = (e: Event) => {
      if (isInternalSaveRef.current) return;
      const customEvent = e as CustomEvent<{ channel?: MultiChannelType; leads?: ChannelLead[] }>;
      const ch = customEvent.detail?.channel;
      if (ch === 'combined') {
        setCombinedLeads(loadChannelLeads('combined'));
      } else if (ch === 'instagram') {
        setInstagramLeads(loadChannelLeads('instagram'));
      }
    };
    const handleRepaired = () => {
      setCombinedLeads(loadChannelLeads('combined'));
      setInstagramLeads(loadChannelLeads('instagram'));
      setInboxCount(loadInboxLeads().length);
      setBackstageLeads(loadBackstageLeads());
    };
    window.addEventListener('pipeline_freeze_changed', handleFreeze);
    window.addEventListener('inbox_leads_changed', handleInbox);
    window.addEventListener('backstage_leads_changed', handleBackstage);
    window.addEventListener('channel_leads_changed', handleChannelLeadsChanged);
    window.addEventListener('crm_data_repaired', handleRepaired);
    window.addEventListener('storage', handleFreeze);
    window.addEventListener('storage', handleInbox);
    window.addEventListener('storage', handleBackstage);
    window.addEventListener('storage', handleRepaired);
    return () => {
      window.removeEventListener('pipeline_freeze_changed', handleFreeze);
      window.removeEventListener('inbox_leads_changed', handleInbox);
      window.removeEventListener('backstage_leads_changed', handleBackstage);
      window.removeEventListener('channel_leads_changed', handleChannelLeadsChanged);
      window.removeEventListener('crm_data_repaired', handleRepaired);
      window.removeEventListener('storage', handleFreeze);
      window.removeEventListener('storage', handleInbox);
      window.removeEventListener('storage', handleBackstage);
      window.removeEventListener('storage', handleRepaired);
    };
  }, []);

  const handleToggleFreeze = () => {
    const updated = togglePipelineFreeze();
    setIsFrozen(updated.isFrozen);
  };

  const handleUpdateCombinedLeads = (updated: ChannelLead[]) => {
    setCombinedLeads(updated);
    isInternalSaveRef.current = true;
    saveChannelLeads('combined', updated);
    isInternalSaveRef.current = false;
  };

  const handleUpdateInstagramLeads = (updated: ChannelLead[]) => {
    setInstagramLeads(updated);
    isInternalSaveRef.current = true;
    saveChannelLeads('instagram', updated);
    isInternalSaveRef.current = false;
  };

  const todayStr = getLocalTodayStr();

  // Calculate live daily tasks due across all channels
  const todayTaskCount = useMemo(() => {
    if (isTodaySunday() || isFrozen) return 0; // Paused on Sunday Rest Mode or Pipeline Freeze Mode
    const all = [...combinedLeads, ...instagramLeads];
    return all.filter((l) => {
      if (
        l.isCompleted ||
        l.isArchived ||
        l.cadenceStatus === 'cancelled' ||
        l.leadStatus === 'replied' ||
        l.leadStatus === 'completed'
      ) {
        return false;
      }
      if (isLeadDismissedToday(l)) return false;

      const resolved = resolveLeadCadenceStep(l, todayStr);

      // 1. Initial outreach due today: Email-only leads dispatch directly on/after scheduled date;
      // social leads require today schedule + previous-day warm-up
      if (resolved.stageNumber === 0) {
        if (!l.scheduledDate) return false;
        if (isEmailOnlyLead(l)) {
          return isDateToday(l.scheduledDate) || isDateOverdue(l.scheduledDate);
        }
        if (isDateToday(l.scheduledDate)) {
          return isLeadWarmedBeforeToday(l, todayStr);
        }
        return false;
      }

      // 2. Follow-ups (Day 4, Day 8, or Day 14 — handles skipped days automatically)
      return resolved.isFollowupDue;
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
          backstageCount={backstageLeads.length}
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
              onNavigateToBackstage={() => setActiveNavTab('backstage')}
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
              onNavigateToBackstage={() => setActiveNavTab('backstage')}
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
              onBatchAccepted={(cLeads, igLeads) => {
                handleUpdateCombinedLeads(cLeads);
                handleUpdateInstagramLeads(igLeads);
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
              onNavigateToBackstage={() => setActiveNavTab('backstage')}
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
              onNavigateToBackstage={() => setActiveNavTab('backstage')}
              isFrozen={isFrozen}
              onToggleFreeze={handleToggleFreeze}
            />
          )}

          {activeNavTab === 'history' && (
            <HistoryPage
              onNavigateToToday={() => setActiveNavTab('today')}
              combinedLeads={combinedLeads}
              instagramLeads={instagramLeads}
            />
          )}

          {activeNavTab === 'backstage' && (
            <BackstagePage
              backstageLeads={backstageLeads}
              combinedLeads={combinedLeads}
              instagramLeads={instagramLeads}
              onRestored={(updatedCombined, updatedInstagram, remainingBackstage) => {
                setCombinedLeads(updatedCombined);
                setInstagramLeads(updatedInstagram);
                setBackstageLeads(remainingBackstage);
              }}
              onBackstageUpdated={(remainingBackstage) => {
                setBackstageLeads(remainingBackstage);
              }}
              onNavigateToChannel={(ch) => setActiveNavTab(ch)}
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
