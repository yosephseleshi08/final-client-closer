import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Coffee,
  Quote,
  RotateCw,
  Calendar,
  Lock,
  ArrowRight,
  TrendingUp,
  Mail,
  Instagram,
  Facebook,
  ExternalLink,
  ShieldCheck,
  Zap,
  Target,
  FileText,
  Clock,
  Compass,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../types';
import {
  getLocalTodayStr,
  getMondayDateStr,
  getWeeklyOutreachStats,
} from '../utils/cadenceEngine';

interface SundayPrepViewProps {
  emailLeads: ChannelLead[];
  instagramLeads: ChannelLead[];
  facebookLeads: ChannelLead[];
  onNavigateToChannel: (channel: MultiChannelType) => void;
  isPreviewMode?: boolean;
  onExitPreview?: () => void;
}

interface MotivationalQuote {
  quote: string;
  author: string;
  role: string;
  tag: string;
}

const SUNDAY_QUOTES: MotivationalQuote[] = [
  {
    quote: 'Give me six hours to chop down a tree and I will spend the first four sharpening the axe.',
    author: 'Abraham Lincoln',
    role: '16th U.S. President',
    tag: 'Preparation & Precision',
  },
  {
    quote: 'Almost everything will work again if you unplug it for a few minutes, including you.',
    author: 'Anne Lamott',
    role: 'Author & Speaker',
    tag: 'Rest & Mental Clarity',
  },
  {
    quote: 'Rest is not idleness, and to lie sometimes on the grass under trees listening to the murmur of the water is by no means a waste of time.',
    author: 'John Lubbock',
    role: 'Scientist & Statesman',
    tag: 'Restoration',
  },
  {
    quote: 'By failing to prepare, you are preparing to fail. High velocity closing starts with clarity before speed.',
    author: 'Benjamin Franklin',
    role: 'Polymath & Statesman',
    tag: 'Strategic Readiness',
  },
  {
    quote: 'The secret of getting ahead is getting started. The secret of getting started is breaking your complex tasks into manageable steps, and sharpening your tools first.',
    author: 'Mark Twain',
    role: 'Author',
    tag: 'Systematic Execution',
  },
  {
    quote: 'Strategic pauses prevent tactical blunders. High-performing agency operators win their entire week on Sunday afternoon.',
    author: 'The Closer Playbook',
    role: 'High-Velocity Sales Standard',
    tag: 'Conviction & Flow',
  },
  {
    quote: 'Preparation builds unshakeable conviction. When your conviction is high, prospect hesitation and friction disappear.',
    author: 'Outreach Engine Principle',
    role: 'Core Closer Axiom',
    tag: 'Mindset & Confidence',
  },
  {
    quote: 'Take rest; a field that has rested gives a bountiful crop when harvest arrives.',
    author: 'Ovid',
    role: 'Poet & Philosopher',
    tag: 'Sustainable Output',
  },
];

export const SundayPrepView: React.FC<SundayPrepViewProps> = ({
  emailLeads,
  instagramLeads,
  facebookLeads,
  onNavigateToChannel,
  isPreviewMode = false,
  onExitPreview,
}) => {
  const [quoteIndex, setQuoteIndex] = useState<number>(() =>
    Math.floor(Math.random() * SUNDAY_QUOTES.length)
  );

  const todayStr = getLocalTodayStr();
  const nextMondayStr = getMondayDateStr(todayStr);

  const allLeads: (ChannelLead & { channelLabel: string })[] = useMemo(() => [
    ...instagramLeads.map((l) => ({ ...l, channelLabel: 'Instagram' })),
    ...facebookLeads.map((l) => ({ ...l, channelLabel: 'Facebook' })),
    ...emailLeads.map((l) => ({ ...l, channelLabel: 'Email' })),
  ], [emailLeads, instagramLeads, facebookLeads]);

  // Compute live performance metrics from user's leads
  const weeklyStats = useMemo(() => {
    return getWeeklyOutreachStats(allLeads, todayStr);
  }, [allLeads, todayStr]);

  // Query leads scheduled for Monday or next in line
  const mondayQueue = useMemo(() => {
    // 1. Leads explicitly scheduled for Monday
    const scheduledForMonday = allLeads.filter((l) => {
      if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
      return l.scheduledDate === nextMondayStr;
    });

    if (scheduledForMonday.length > 0) {
      return scheduledForMonday;
    }

    // 2. Fallback: upcoming unsent leads ready for launch
    const pendingLeads = allLeads.filter((l) => {
      if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
      return !l.initialSentDate;
    });

    return pendingLeads.slice(0, 8);
  }, [allLeads, nextMondayStr]);

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % SUNDAY_QUOTES.length);
  };

  const activeQuote = SUNDAY_QUOTES[quoteIndex];

  const renderChannelBadge = (channel: MultiChannelType) => {
    switch (channel) {
      case 'instagram':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-pink-500/10 text-pink-300 border border-pink-500/20">
            <Instagram className="w-3 h-3 text-pink-400" />
            <span>Instagram</span>
          </span>
        );
      case 'facebook':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-sky-500/10 text-sky-300 border border-sky-500/20">
            <Facebook className="w-3 h-3 text-sky-400" />
            <span>Facebook</span>
          </span>
        );
      case 'email':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Mail className="w-3 h-3 text-indigo-400" />
            <span>Email</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Testing Preview Mode Banner (if toggled) */}
      {isPreviewMode && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 sm:p-4 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div className="text-xs">
              <span className="font-bold text-emerald-300">Sunday Mode Simulation Active:</span>{' '}
              <span className="text-slate-300">
                You are currently viewing the automated Sunday experience. On actual Sundays, this mode engages automatically.
              </span>
            </div>
          </div>
          {onExitPreview && (
            <button
              type="button"
              onClick={onExitPreview}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-xs font-bold transition shrink-0 cursor-pointer border border-white/10"
            >
              Exit Sunday Preview
            </button>
          )}
        </div>
      )}

      {/* Main Restful Hero Card */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-[#080c14] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
        {/* Soft atmospheric emerald ambient glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                <Coffee className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Sunday Prep Mode</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-mono">
                  Sunday Rest &amp; Focus
                </span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-['Outfit'] tracking-tight">
              Rest, Reflect &amp; Sharpen for Monday
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Active daily dispatch queues are tucked away to respect weekend boundaries and prevent burnout. Your lead research, prospect imports, and AI prompt engineering remain <strong className="text-emerald-300 font-semibold">100% active</strong> so you can prepare Monday's pipeline with zero pressure.
            </p>
          </div>

          {/* Quick Action to Prep Leads */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateToChannel('instagram')}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-900/40 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
            >
              <span>📥 Go to Leads to Prep for Monday</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Outreach unlocks Monday at 00:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Motivational Rest & Preparation Quote Card */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-7 backdrop-blur-xl shadow-2xl relative group">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
            <Quote className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Weekly Mindset &amp; Sunday Reflection</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 font-normal">{activeQuote.tag}</span>
          </div>

          <button
            type="button"
            onClick={handleNextQuote}
            className="self-start md:self-auto px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Cycle to another piece of wisdom"
          >
            <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Quote ({quoteIndex + 1}/{SUNDAY_QUOTES.length})</span>
          </button>
        </div>

        <blockquote className="space-y-3">
          <p className="text-base sm:text-lg lg:text-xl font-medium text-slate-100 font-['Outfit'] italic leading-relaxed">
            “{activeQuote.quote}”
          </p>
          <footer className="text-xs text-slate-400 flex items-center gap-2 font-mono">
            <span className="font-bold text-emerald-300">{activeQuote.author}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{activeQuote.role}</span>
          </footer>
        </blockquote>
      </div>

      {/* Weekly Performance Summary Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between font-mono">
            <span>DMs Sent Last 7 Days</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-100 font-mono tabular-nums">
            {weeklyStats.dmsSentLast7Days}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Outreaches &amp; follow-ups dispatched
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 shadow-xl">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between font-mono">
            <span>Replies Received</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-400 font-mono tabular-nums">
            {weeklyStats.repliesReceived}
          </div>
          <div className="mt-1 text-xs text-emerald-300/80">
            Active conversations &amp; warm prospects
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between font-mono">
            <span>Mockups &amp; Research Ready</span>
            <FileText className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-3 text-3xl font-black text-teal-400 font-mono tabular-nums">
            {weeklyStats.mockupsAuditsCount}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Prospects with analysis or interactive demos
          </div>
        </div>
      </div>

      {/* Locked Monday Queue Preview */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-7 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Lock className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white font-['Outfit']">
                  Monday Queue Preview (Locked Safeguard)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
                  {mondayQueue.length} Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                These prospects will automatically activate on Monday morning ({nextMondayStr}). All trigger buttons are locked today to guarantee zero accidental sends.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs text-slate-400 font-mono bg-slate-950/60 border border-white/10 px-3 py-1.5 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Target Day: <strong>Monday</strong></span>
          </div>
        </div>

        {mondayQueue.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <Compass className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-slate-300">No leads scheduled for Monday yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Use Sunday afternoon to paste prospect links, run Gemini lead research, and prepare your 3-step sequences so Monday starts with immediate velocity.
            </p>
            <button
              type="button"
              onClick={() => onNavigateToChannel('instagram')}
              className="mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold border border-white/10 transition cursor-pointer"
            >
              Start Researching Leads
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {mondayQueue.map((lead) => (
              <div
                key={`monday-${lead.channel}-${lead.id}`}
                className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 space-y-2.5 hover:border-white/20 transition shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {renderChannelBadge(lead.channel)}
                    <span className="font-mono text-xs font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      {lead.id}
                    </span>
                    <h3 className="font-bold text-white text-sm sm:text-base font-['Outfit']">
                      {lead.name}
                    </h3>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>Locked for Monday</span>
                    </span>
                  </div>

                  {lead.link && (
                    <a
                      href={lead.link.startsWith('http') ? lead.link : `https://${lead.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 self-start sm:self-auto"
                    >
                      <span className="truncate max-w-xs">{lead.link}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                </div>

                {/* Staged Message or Analysis preview snippet */}
                <div className="text-xs text-slate-400 bg-slate-900/60 border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-3">
                  <div className="truncate">
                    <span className="text-slate-500 font-mono uppercase text-[10px] mr-2">
                      Staged Hook:
                    </span>
                    <span className="italic text-slate-300">
                      {lead.initialDM?.slice(0, 85) ||
                        lead.customPitch?.slice(0, 85) ||
                        'Default 0.3s prototype hook staged and ready for Monday send.'}
                      ...
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold shrink-0">
                    {lead.leadAnalysis ? '✓ Analysis Complete' : 'Standard Pitch'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pipeline Navigation Launchpad */}
      <div className="rounded-3xl border border-indigo-500/20 bg-slate-900/70 p-6 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>Sunday Lead Intake &amp; Research Launchpad</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a channel to batch-import prospects, generate 3-step DM sequences, and upload preview mockups.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            type="button"
            onClick={() => onNavigateToChannel('instagram')}
            className="p-4 rounded-2xl border border-pink-500/20 bg-pink-950/20 hover:bg-pink-950/30 hover:border-pink-500/40 transition flex items-center justify-between group cursor-pointer text-left shadow-md"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                <Instagram className="w-4 h-4" />
                <span>Instagram Pipeline</span>
              </div>
              <p className="text-xs text-slate-400">
                {instagramLeads.length} leads in vault · Profile paste &amp; parse
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-pink-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateToChannel('facebook')}
            className="p-4 rounded-2xl border border-sky-500/20 bg-sky-950/20 hover:bg-sky-950/30 hover:border-sky-500/40 transition flex items-center justify-between group cursor-pointer text-left shadow-md"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Facebook className="w-4 h-4" />
                <span>Facebook Pipeline</span>
              </div>
              <p className="text-xs text-slate-400">
                {facebookLeads.length} leads in vault · Business page outreach
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateToChannel('email')}
            className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 hover:bg-indigo-950/30 hover:border-indigo-500/40 transition flex items-center justify-between group cursor-pointer text-left shadow-md"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Mail className="w-4 h-4" />
                <span>Email Pipeline</span>
              </div>
              <p className="text-xs text-slate-400">
                {emailLeads.length} leads in vault · Cold email cadences
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
