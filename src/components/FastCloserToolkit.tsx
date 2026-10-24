import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Zap,
  Calculator,
  DollarSign,
  TrendingUp,
  Copy,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Sparkles,
  FileCheck,
  Send,
  ExternalLink,
  Flame,
  ArrowRight,
  Clock,
  Check,
  Trophy
} from 'lucide-react';
import { Lead } from '../types';
import { playSuccessChime, playGoalAccomplishedFanfare } from '../utils/soundEffects';

interface FastCloserToolkitProps {
  leads: Lead[];
  selectedLead: Lead | null;
  onSelectLead: (lead: Lead) => void;
  onUpdateLeadStatus?: (leadId: number, status: any) => void;
  showToast: (msg: string) => void;
}

export const FastCloserToolkit: React.FC<FastCloserToolkitProps> = ({
  leads,
  selectedLead,
  onSelectLead,
  onUpdateLeadStatus,
  showToast,
}) => {
  const currentLead = selectedLead || leads[0] || null;

  // Active sub-tool tab
  const [activeTool, setActiveTool] = useState<'roi' | 'mockup' | 'defuser' | 'agreement'>('roi');

  // ROI Calculator State
  const [weeklyOrders, setWeeklyOrders] = useState<number>(30);
  const [avgTicket, setAvgTicket] = useState<number>(45);
  const [commissionRate, setCommissionRate] = useState<number>(30); // 30% DoorDash/UberEats
  const [closerFee, setCloserFee] = useState<number>(99); // $99/mo direct engine

  // Calculations
  const monthlyTakeoutVolume = weeklyOrders * 4.33 * avgTicket;
  const monthlyCommissionLost = monthlyTakeoutVolume * (commissionRate / 100);
  const annualCommissionLost = monthlyCommissionLost * 12;
  const netMonthlySavings = Math.max(monthlyCommissionLost - closerFee, 0);
  const annualProfitAdded = netMonthlySavings * 12;

  // Copied feedback states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string, toastMsg: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(toastMsg);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Generate Personalized ROI Pitch
  const getRoiPitchText = () => {
    const restaurant = currentLead?.restaurantName || 'your restaurant';
    const contact = currentLead?.contactName && currentLead?.contactName !== 'Owner' ? currentLead.contactName : 'team';
    const mockup = currentLead?.mockupLink || `https://demo.closer.app/${restaurant.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    return `Hey ${contact}! Ran the numbers for ${restaurant}: at ~${weeklyOrders} takeout orders/wk ($${avgTicket} avg), DoorDash pockets over $${Math.round(monthlyCommissionLost).toLocaleString()}/month in fees ($${Math.round(annualCommissionLost).toLocaleString()}/yr). We built a 0.3s direct ordering concept (${mockup}) where you keep 100% of profits. We waive the $299 setup to $0 for 3 local spots, just $99/mo. You'd save ~$${Math.round(netMonthlySavings).toLocaleString()}/mo in pure profit. Want to launch before Friday?`;
  };

  // Fast Rebuttal Presets
  const fastRebuttals = [
    {
      trigger: 'How much does this cost?',
      reframe: 'Anchor to $0 upfront and show that saving 2 orders covers the entire month.',
      script: `Our normal build is $299 + $99/mo, but right now we waive the $299 fee completely to $0 for 3 local spots as Case Study partners in exchange for a short review. Saving DoorDash fees on just 2 orders pays for the whole $99 month. Can we get it live for this weekend?`,
    },
    {
      trigger: 'We already use DoorDash / UberEats',
      reframe: 'Position as a profit recapturer rather than a replacement.',
      script: `Keep DoorDash for cold discovery! The problem is when regular local customers order on DoorDash, you lose 30% margin for zero reason. Our direct link sits on your Instagram & Google Maps so your loyal diners order direct and you pocket 100% of profit. Check out the 30s demo here: ${currentLead?.mockupLink || 'demo link'}.`,
    },
    {
      trigger: 'Send me an email / I need to think about it',
      reframe: 'Eliminate friction with micro-commitment.',
      script: `I will send it right over! Because we only have 3 spots for our $0 setup program this month, I went ahead and already built your live preview: ${currentLead?.mockupLink || 'preview'}. Take 30 seconds to click it on your phone — if you don't love it, you pay zero. Fair enough?`,
    },
    {
      trigger: 'We don\'t have budget right now',
      reframe: 'Zero upfront financial risk ($0 down).',
      script: `That is exactly why we structured this with $0 upfront setup. We handle 100% of the build, menus, and photos. You only pay $99/mo once you see the direct reservations coming in. If it doesn't bring you diners, you can cancel anytime. Open to testing it?`,
    },
    {
      trigger: 'We already have a website guy',
      reframe: 'Speed & conversion comparison.',
      script: `That's great! Most web designers build slow brochure sites that take 4 seconds to load PDF menus. We specialize specifically in 0.3s mobile ordering that captures hungry diners in 2 taps. Mind if I send you the side-by-side speed test?`,
    },
  ];

  // Agreement Pitch
  const getAgreementText = () => {
    const restaurant = currentLead?.restaurantName || 'Restaurant Partner';
    const contact = currentLead?.contactName || 'Owner';

    return `🤝 FOUNDING PARTNER AGREEMENT — ${restaurant.toUpperCase()}\n\n` +
      `Hey ${contact}! Here are the simple terms to launch ${restaurant} live:\n` +
      `• Initial Build Fee: $0 (Standard $299 setup fee waived 100%)\n` +
      `• Monthly Direct Engine: $99/month (No long-term contracts, cancel anytime)\n` +
      `• Direct Order Margin: 100% kept by ${restaurant} (0% delivery commission)\n` +
      `• Turnaround Speed: Live in 48 hours\n` +
      `• Partner Exchange: A 2-sentence written review once you see direct orders roll in.\n\n` +
      `Reply "LET'S LAUNCH" and we will turn your direct reservation portal live today!`;
  };

  const handleMarkWon = () => {
    if (!currentLead) return;
    if (onUpdateLeadStatus) {
      onUpdateLeadStatus(currentLead.id, 'closed_won');
    }
    playGoalAccomplishedFanfare();
    confetti({
      particleCount: 120,
      spread: 85,
      origin: { y: 0.6 },
    });
    showToast(`🏆 CLOSED WON: ${currentLead.restaurantName} marked as closed partner ($299 + $99/mo)!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Closer Command Bar */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-5 sm:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-md shadow-rose-500/25">
                <Zap className="h-4 w-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] tracking-tight">
                HIGH-VELOCITY <span className="bg-gradient-to-r from-amber-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">CLOSER TOOLKIT</span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Weaponized conversion tools designed to overcome objections, demonstrate mathematical ROI, and close hospitality clients in 1 single conversation.
            </p>
          </div>

          {/* Active Lead Selector Pill */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs text-slate-400">Target Lead:</span>
            <select
              value={currentLead?.id || ''}
              onChange={(e) => {
                const found = leads.find((l) => l.id === Number(e.target.value));
                if (found) onSelectLead(found);
              }}
              className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-xs font-bold text-white focus:border-indigo-500 focus:outline-none"
            >
              {leads.slice(0, 40).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.restaurantName} ({l.platform})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toolkit Tabs */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {[
            { id: 'roi', label: 'DoorDash Savings ROI Calculator', icon: <Calculator className="h-4 w-4" /> },
            { id: 'mockup', label: 'Interactive Mobile Mockup View', icon: <Smartphone className="h-4 w-4" /> },
            { id: 'defuser', label: 'Emergency Objection Defusers', icon: <ShieldCheck className="h-4 w-4" /> },
            { id: 'agreement', label: '1-Click Agreement & Fast Close', icon: <FileCheck className="h-4 w-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTool(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                activeTool === tab.id
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tool 1: DoorDash Commission ROI Calculator */}
      {activeTool === 'roi' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm space-y-4">
            <h3 className="text-sm font-bold text-white font-['Outfit'] uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Calculator className="h-4 w-4" /> Takeout Commission Parameters
            </h3>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300">Weekly Delivery Orders</span>
                <span className="font-mono text-white font-bold">{weeklyOrders} orders/wk</span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={weeklyOrders}
                onChange={(e) => setWeeklyOrders(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300">Average Ticket Size</span>
                <span className="font-mono text-white font-bold">${avgTicket}</span>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                step="5"
                value={avgTicket}
                onChange={(e) => setAvgTicket(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300">3rd-Party App Cut</span>
                <span className="font-mono text-rose-400 font-bold">{commissionRate}% cut</span>
              </div>
              <input
                type="range"
                min="15"
                max="35"
                step="1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-white/10 text-[11px] text-slate-400 leading-relaxed">
              Based on standard DoorDash & UberEats restaurant commission schedules (15% - 30% per order).
            </div>
          </div>

          {/* Results & Live Copy Breakdown */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-900/80 p-5 sm:p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between space-y-5">
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5">
                  <div className="text-[11px] font-bold text-rose-300 uppercase">DoorDash Fees Lost</div>
                  <div className="text-2xl font-black text-white mt-1 font-mono">${Math.round(monthlyCommissionLost).toLocaleString()}</div>
                  <div className="text-[10px] text-rose-400/80 mt-0.5">${Math.round(annualCommissionLost).toLocaleString()} / year</div>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                  <div className="text-[11px] font-bold text-emerald-300 uppercase">Direct Engine Net Savings</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">+${Math.round(netMonthlySavings).toLocaleString()}</div>
                  <div className="text-[10px] text-emerald-300/80 mt-0.5">Every month saved</div>
                </div>

                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5">
                  <div className="text-[11px] font-bold text-indigo-300 uppercase">1-Year Added Cash</div>
                  <div className="text-2xl font-black text-indigo-300 mt-1 font-mono">+${Math.round(annualProfitAdded).toLocaleString()}</div>
                  <div className="text-[10px] text-indigo-200/80 mt-0.5">Pure profit in their bank</div>
                </div>
              </div>

              {/* Ready-to-Send ROI Pitch Box */}
              <div className="rounded-xl border border-white/10 bg-black/50 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Sparkles className="h-3.5 w-3.5" /> High-Impact Math Pitch for {currentLead?.restaurantName || 'Prospect'}
                  </span>
                  <span className="text-[10px] text-slate-500">Unarguable ROI Hook</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed select-all">
                  {getRoiPitchText()}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
              <span className="text-xs text-slate-400">
                Dropping real math into DMs removes price friction completely.
              </span>
              <button
                onClick={() => handleCopy(getRoiPitchText(), 'roi_pitch', 'Copied ROI savings message to clipboard!')}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition cursor-pointer active:scale-95"
              >
                {copiedKey === 'roi_pitch' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedKey === 'roi_pitch' ? 'Copied Pitch!' : 'Copy Mathematical ROI Pitch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tool 2: Interactive Mobile Mockup View */}
      {activeTool === 'mockup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Mockup Preview Phone Frame */}
          <div className="flex justify-center">
            <div className="w-[300px] h-[550px] rounded-[42px] border-4 border-slate-700 bg-slate-950 shadow-2xl p-3 flex flex-col relative overflow-hidden">
              {/* Speaker / Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3.5 w-24 bg-slate-800 rounded-full z-20" />

              {/* Screen Content */}
              <div className="flex-1 rounded-[32px] bg-slate-900 border border-white/10 overflow-y-auto p-4 pt-6 space-y-4 text-slate-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Zap className="h-2.5 w-2.5" /> 0.28s Load Speed
                    </span>
                    <span>100% Mobile Ready</span>
                  </div>

                  {/* Restaurant Brand Banner */}
                  <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-4 text-white shadow-lg">
                    <h4 className="text-base font-black font-['Outfit']">{currentLead?.restaurantName || 'Artisan Bistro'}</h4>
                    <p className="text-[11px] opacity-90">{currentLead?.city || 'Downtown Metro'} • Direct Table Booking</p>
                  </div>

                  {/* 1-Click Fast Table Booking Action */}
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                    <div className="text-[11px] font-bold text-white">Instant Table Reservation</div>
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-bold">
                      <span className="bg-indigo-600 rounded-lg py-1 text-white">Today 7 PM</span>
                      <span className="bg-white/10 rounded-lg py-1 text-slate-300">Today 8 PM</span>
                      <span className="bg-white/10 rounded-lg py-1 text-slate-300">Fri 7:30 PM</span>
                    </div>
                  </div>

                  {/* Direct Takeaway Menu Highlights */}
                  <div className="mt-3 space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Direct Specials (0% DoorDash Fee)</div>
                    {[
                      { name: 'Chef Signature Tasting', price: '$42.00', tag: 'Direct Exclusive' },
                      { name: 'House Woodfired Pizza', price: '$22.00', tag: '15 min pickup' },
                    ].map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-xl bg-white/5 p-2 text-xs border border-white/5">
                        <div>
                          <div className="font-bold text-white text-[11px]">{m.name}</div>
                          <div className="text-[9px] text-emerald-400">{m.tag}</div>
                        </div>
                        <span className="font-mono font-bold text-white text-[11px]">{m.price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instant Checkout CTA */}
                <div className="pt-2">
                  <button className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-xs font-black text-slate-950 uppercase tracking-wider shadow-lg">
                    1-Tap Reserve Table
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Controls & Pitch Copy */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white font-['Outfit']">Interactive Concept Link</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Show prospects what their high-speed direct ordering site looks like in reality. Dropping this preview link into an Instagram DM or Facebook Messenger demonstrates immediate proof before you ever ask for money.
            </p>

            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-3.5 flex items-center justify-between">
              <span className="text-xs font-mono text-indigo-300 truncate">
                {currentLead?.mockupLink || `https://demo.closer.app/${currentLead?.restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
              </span>
              <button
                onClick={() =>
                  handleCopy(
                    currentLead?.mockupLink || `https://demo.closer.app/${currentLead?.restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                    'demo_link',
                    'Copied interactive demo link!'
                  )
                }
                className="shrink-0 flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer ml-2"
              >
                {copiedKey === 'demo_link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === 'demo_link' ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>

            <div className="pt-3 border-t border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">35-Word Mockup Drop DM</h4>
              <div className="rounded-xl bg-black/40 p-3 text-xs text-slate-200 select-all leading-relaxed">
                {`Hey! Put together a modern redesign for ${currentLead?.restaurantName || 'your restaurant'} to turn more mobile profile visitors into direct reservations without DoorDash's 30% fee. Live preview: ${currentLead?.mockupLink || 'demo link'}. Check it out!`}
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    `Hey! Put together a modern redesign for ${currentLead?.restaurantName || 'your restaurant'} to turn more mobile profile visitors into direct reservations without DoorDash's 30% fee. Live preview: ${currentLead?.mockupLink || 'demo link'}. Check it out!`,
                    'mockup_dm',
                    'Copied mockup drop DM!'
                  )
                }
                className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-bold text-slate-200 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Mockup Drop DM</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tool 3: Emergency Objection Defusers */}
      {activeTool === 'defuser' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 flex items-center justify-between">
            <span className="text-xs text-slate-300">
              Click any response to instantly copy the exact verbatim closer script to reply to prospects on chat or calls:
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fastRebuttals.map((r, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl hover:border-amber-500/30 transition group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-amber-400" />
                      Objection: "{r.trigger}"
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                      Rebuttal #{idx + 1}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic mb-3">
                    Strategy: {r.reframe}
                  </p>
                  <div className="rounded-xl bg-black/40 p-3 text-xs text-slate-200 select-all leading-relaxed font-sans">
                    {r.script}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-end">
                  <button
                    onClick={() => handleCopy(r.script, `reb_${idx}`, 'Copied rebuttal script!')}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-1.5 text-xs font-bold text-amber-300 transition cursor-pointer"
                  >
                    {copiedKey === `reb_${idx}` ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === `reb_${idx}` ? 'Copied Script!' : 'Copy Script'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tool 4: 1-Click Agreement & Fast Close */}
      {activeTool === 'agreement' && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">Founding Partner Agreement (Instant Close)</h3>
              <p className="text-xs text-slate-400">
                When an owner says "Sounds good" or "Send details", paste this clean agreement to lock in the deal immediately.
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
              $299 Deal Value
            </span>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/60 p-4 text-xs font-mono text-slate-200 whitespace-pre-line leading-relaxed select-all">
            {getAgreementText()}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
            <button
              onClick={() => handleCopy(getAgreementText(), 'agreement_text', 'Copied agreement terms to clipboard!')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 transition cursor-pointer"
            >
              {copiedKey === 'agreement_text' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedKey === 'agreement_text' ? 'Copied Agreement!' : 'Copy Agreement Text'}</span>
            </button>

            <button
              onClick={handleMarkWon}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:brightness-110 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer active:scale-95"
            >
              <Trophy className="h-4 w-4" />
              <span>Mark Deal as Closed Won (+$299)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
