import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Clock,
  Zap,
  CheckCircle2,
  Copy,
  DollarSign,
  Sliders,
  Mail,
  Instagram,
  Facebook,
  Users,
  Target,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../types';

interface AnalyticsViewProps {
  emailLeads: ChannelLead[];
  instagramLeads: ChannelLead[];
  facebookLeads: ChannelLead[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  emailLeads,
  instagramLeads,
  facebookLeads,
}) => {
  const [conversionRate, setConversionRate] = useState<number>(25); // 0-100%
  const [monthlyRetainer, setMonthlyRetainer] = useState<number>(99); // $/mo
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [analyticsToast, setAnalyticsToast] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const allLeads = useMemo(
    () => [...emailLeads, ...instagramLeads, ...facebookLeads],
    [emailLeads, instagramLeads, facebookLeads]
  );

  const totalLeads = allLeads.length;
  const completedLeads = allLeads.filter((l) => l.isCompleted).length;
  const pitchesReady = allLeads.filter((l) => !!l.customPitch).length;
  const mockupsReady = allLeads.filter((l) => !!l.hasMockup).length;
  const scheduledCount = allLeads.filter((l) => !!l.scheduledDate).length;

  // Projections
  const effectiveBase = totalLeads > 0 ? totalLeads : 10;
  const expectedClientsWon = Math.max(0.5, (effectiveBase * conversionRate) / 100);
  const potentialMrr = Math.round(expectedClientsWon * monthlyRetainer);
  const potentialArr = potentialMrr * 12;
  const potentialUpfront = Math.round(expectedClientsWon * 299);
  const potentialTotalYearOne = potentialArr + potentialUpfront;

  const handleCopySummary = () => {
    const text = `Outreach Command Center Summary:
Total Leads: ${totalLeads} (Email: ${emailLeads.length}, Instagram: ${instagramLeads.length}, Facebook: ${facebookLeads.length})
DMs Ready: ${pitchesReady}
Dispatches Completed: ${completedLeads}
Mockups Stored: ${mockupsReady}
Projected MRR: $${potentialMrr}/mo`;
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleRefreshAnalytics = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setAnalyticsToast(true);
      setTimeout(() => setAnalyticsToast(false), 2500);
    }, 350);
  };

  const channelComparison = [
    {
      name: 'Email',
      icon: <Mail className="w-4 h-4 text-indigo-400" />,
      leads: emailLeads,
      color: 'indigo',
    },
    {
      name: 'Instagram',
      icon: <Instagram className="w-4 h-4 text-pink-400" />,
      leads: instagramLeads,
      color: 'pink',
    },
    {
      name: 'Facebook',
      icon: <Facebook className="w-4 h-4 text-sky-400" />,
      leads: facebookLeads,
      color: 'sky',
    },
  ];

  return (
    <div className="space-y-6">
      {analyticsToast && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-xs font-bold text-indigo-300 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-indigo-400" />
          <span>Analytics updated across all 3 channels!</span>
        </div>
      )}

      {/* Revenue Projection & Model Header */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-[#0d1322]/95 via-[#0e1726]/95 to-[#0b1b1f]/90 backdrop-blur-xl shadow-2xl p-6 sm:p-7 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] tracking-tight">
                  Revenue & Funnel Projections
                </h2>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-300 flex items-center gap-1 font-mono">
                  <DollarSign className="h-3 w-3" />
                  $299 + Retainer
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Simulate monthly recurring revenue and cash flow based on cross-channel closing velocity.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
          >
            <Copy className="h-3.5 w-3.5 text-emerald-400" />
            <span>{copiedNotification ? 'Copied!' : 'Copy Summary'}</span>
          </button>
        </div>

        {/* 4 Core Financial Projection Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* 1. Potential MRR */}
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Potential MRR</span>
              <span className="text-emerald-400 text-sm">📈</span>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent font-['Outfit']">
              ${potentialMrr.toLocaleString()}
              <span className="text-sm font-bold text-emerald-400/80 font-sans ml-1">/mo</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>${monthlyRetainer}/mo per client</span>
              <span className="text-emerald-400 font-semibold font-mono">Monthly Recurring</span>
            </div>
          </div>

          {/* 2. Potential ARR */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Projected ARR</span>
              <span className="text-indigo-400 text-sm">🗓️</span>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-black text-indigo-300 font-['Outfit']">
              ${potentialArr.toLocaleString()}
              <span className="text-sm font-bold text-slate-400 font-sans ml-1">/yr</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>12-month contract value</span>
              <span className="text-indigo-400 font-semibold font-mono">Annualized</span>
            </div>
          </div>

          {/* 3. Expected Closed Clients */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Expected Closed Deals</span>
              <span className="text-purple-400 text-sm">🤝</span>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-black text-white font-['Outfit']">
              {expectedClientsWon.toFixed(1)}
              <span className="text-sm font-bold text-slate-400 font-sans ml-1">Clients</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{conversionRate}% of pipeline</span>
              <span className="text-purple-400 font-semibold font-mono">Win Probability</span>
            </div>
          </div>

          {/* 4. Total First-Year Cash */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Total 1st-Year Value</span>
              <span className="text-amber-400 text-sm">💰</span>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-black text-amber-300 font-['Outfit']">
              ${potentialTotalYearOne.toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>+${potentialUpfront.toLocaleString()} upfront setup ($299)</span>
              <span className="text-amber-400 font-semibold font-mono">Gross Lifetime</span>
            </div>
          </div>
        </div>

        {/* Interactive Slider */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label htmlFor="conversion-slider" className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-400" />
                <span>Outreach Conversion Rate Simulation</span>
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Adjust slider to test conservative vs. top closer closing ratios on outreach campaigns
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-slate-400 font-semibold">Closing Ratio:</span>
              <span className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3.5 py-1 text-base font-black text-emerald-300 font-mono">
                {conversionRate}%
              </span>
            </div>
          </div>

          <input
            id="conversion-slider"
            type="range"
            min={1}
            max={100}
            step={1}
            value={conversionRate}
            onChange={(e) => setConversionRate(Number(e.target.value))}
            className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: '10% Baseline', value: 10 },
                { label: '25% Standard', value: 25 },
                { label: '50% High Velocity', value: 50 },
                { label: '75% Elite Closer', value: 75 },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setConversionRate(p.value)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    conversionRate === p.value
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Monthly Retainer:</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">$</span>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={monthlyRetainer}
                  onChange={(e) => setMonthlyRetainer(Math.max(1, Number(e.target.value)))}
                  className="w-20 rounded-xl border border-white/10 bg-slate-950 pl-6 pr-2 py-1 text-xs font-bold text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <span className="text-[11px] text-slate-400">/mo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Channel Distribution Comparison Table */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1322]/90 backdrop-blur-xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5 text-base font-bold text-white font-['Outfit']">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Channel Pipeline Comparison</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Total Channels: 3
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="bg-[#111827] border-b border-white/10 text-xs font-bold text-slate-300">
              <tr>
                <th className="py-3.5 px-4 font-bold text-white">Channel</th>
                <th className="py-3.5 px-4 font-bold text-white">Leads</th>
                <th className="py-3.5 px-4 font-bold text-white">Pitches Drafted</th>
                <th className="py-3.5 px-4 font-bold text-white">Scheduled</th>
                <th className="py-3.5 px-4 font-bold text-white">Dispatched</th>
                <th className="py-3.5 px-4 font-bold text-white">Mockup Ready</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-[#0b0f19]">
              {channelComparison.map((item) => {
                const total = item.leads.length;
                const pitches = item.leads.filter((l) => !!l.customPitch).length;
                const scheduled = item.leads.filter((l) => !!l.scheduledDate).length;
                const sent = item.leads.filter((l) => !!l.isCompleted).length;
                const mockups = item.leads.filter((l) => !!l.hasMockup).length;

                return (
                  <tr key={item.name} className="hover:bg-white/5 transition">
                    <td className="py-3 px-4 font-medium text-slate-200 flex items-center gap-2">
                      {item.icon}
                      <span className="font-semibold">{item.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono tabular-nums">{total}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono tabular-nums">
                      {pitches} {total > 0 && `(${Math.round((pitches / total) * 100)}%)`}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono tabular-nums">{scheduled}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono tabular-nums">
                      <span className={sent > 0 ? 'text-emerald-400 font-bold' : ''}>{sent}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono tabular-nums">{mockups}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fresh Generation Trigger */}
      <button
        type="button"
        onClick={handleRefreshAnalytics}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-[0.99] cursor-pointer"
      >
        <Zap className={`h-4 w-4 text-amber-300 ${isGenerating ? 'animate-bounce' : ''}`} />
        <span>Generate Fresh Multi-Channel Velocity Report</span>
      </button>
    </div>
  );
};
