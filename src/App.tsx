import React, { useState } from 'react';
import { Header } from './components/Header';
import { ChannelWorkspace } from './components/channel/ChannelWorkspace';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { AnalyticsView } from './components/AnalyticsView';
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

export default function App() {
  const [activeNavTab, setActiveNavTab] = useState<GlobalNavTab>('instagram');

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

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      <OfflineIndicator />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Strictly 5 Global Top Navigation Buttons */}
        <Header
          activeTab={activeNavTab}
          setActiveTab={setActiveNavTab}
          emailLeadCount={emailLeads.length}
          instagramLeadCount={instagramLeads.length}
          facebookLeadCount={facebookLeads.length}
        />

        {/* Workspace or Overview Views */}
        <main className="transition-all duration-150">
          {activeNavTab === 'email' && (
            <ChannelWorkspace
              channel="email"
              leads={emailLeads}
              onUpdateLeads={handleUpdateEmailLeads}
            />
          )}

          {activeNavTab === 'instagram' && (
            <ChannelWorkspace
              channel="instagram"
              leads={instagramLeads}
              onUpdateLeads={handleUpdateInstagramLeads}
            />
          )}

          {activeNavTab === 'facebook' && (
            <ChannelWorkspace
              channel="facebook"
              leads={facebookLeads}
              onUpdateLeads={handleUpdateFacebookLeads}
            />
          )}

          {activeNavTab === 'dashboard' && (
            <ExecutiveDashboard
              emailLeads={emailLeads}
              instagramLeads={instagramLeads}
              facebookLeads={facebookLeads}
              onNavigateToChannel={(channel: MultiChannelType) => setActiveNavTab(channel)}
            />
          )}

          {activeNavTab === 'insights' && (
            <AnalyticsView
              emailLeads={emailLeads}
              instagramLeads={instagramLeads}
              facebookLeads={facebookLeads}
            />
          )}
        </main>
      </div>

      {/* Subtle Bottom Bar */}
      <footer className="border-t border-white/[0.06] bg-slate-950/60 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Persistent Multi-Channel Storage Active</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Email ({emailLeads.length}) · Instagram ({instagramLeads.length}) · Facebook ({facebookLeads.length})
          </span>
        </div>
      </footer>
    </div>
  );
}
