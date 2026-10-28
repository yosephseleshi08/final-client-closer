import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Copy, 
  Check, 
  Sparkles, 
  Send, 
  HelpCircle, 
  MessageSquare, 
  DollarSign, 
  Users, 
  Clock, 
  RotateCcw 
} from 'lucide-react';
import { Lead } from '../types';

interface ObjectionBusterProps {
  isOpen: boolean;
  onClose: () => void;
  currentLead: Lead | null;
}

export const ObjectionBuster: React.FC<ObjectionBusterProps> = ({
  isOpen,
  onClose,
  currentLead,
}) => {
  const [activeObjection, setActiveObjection] = useState<string>('too_expensive');
  const [customObjection, setCustomObjection] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [customResult, setCustomResult] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const objectionPresets: Record<
    string,
    { title: string; category: string; icon: any; reframe: string; script: string; close: string }
  > = {
    too_expensive: {
      title: '“It’s too expensive / Not in our budget”',
      category: 'Pricing & ROI',
      icon: DollarSign,
      reframe: 'Shift from an expense to an asset: $0 upfront for 3 Case Study spots, and just $99/month.',
      script: `I completely understand. That's why we offer our Founding Partner program: $0 upfront setup (we waive our normal $299 build fee completely), and just $99/month with no lock-in contracts. Saving DoorDash's 30% cut on just 2 to 3 direct takeaway orders covers the entire $99 fee. Everything else is 100% profit in your bank account.`,
      close: `If we waive the $299 setup fee and launch everything for $0 down, would you like us to turn it live for this weekend?`,
    },
    already_have_a_guy: {
      title: '“I already have a web guy / my nephew does it”',
      category: 'Loyalty / Status Quo',
      icon: Users,
      reframe: 'Compliment their existing support, but expose slow turnaround and lost reservation revenue.',
      script: `That’s great that you have help! The reason busy owners work with us is turnaround speed and direct reservation conversion. Most web guys take 4 to 6 weeks to change a menu or link, whereas we have your interactive booking live in 48 hours with zero effort from your staff.`,
      close: `Can I send you the 30-second mobile comparison so you can see how much faster our booking flow loads compared to the current site?`,
    },
    send_me_an_email: {
      title: '“Just send me an email with information”',
      category: 'Brush-Off Deflection',
      icon: MessageSquare,
      reframe: 'Prevent getting lost in the email graveyard by securing a 3-minute follow-up commitment.',
      script: `I’ll happily email that over! My email includes your custom live mockup and a 45-second video audit. What’s the best email address for you?`,
      close: `I’ll send it right now. Can I send you a 1-sentence text tomorrow around 2 PM just to make sure the link opened cleanly for you?`,
    },
    need_to_think: {
      title: '“I need to think about it / talk to partners”',
      category: 'Procrastination & Hidden Doubt',
      icon: Clock,
      reframe: 'Isolate the real hesitation (Trust in results vs Budget).',
      script: `Totally fair—most of our happiest restaurant clients said that at first. Since there's zero upfront fee ($0 down) for our 3 case study spots, and just $99/mo with no long-term contracts, there's literally zero financial risk. Is it the timing, or would you like to see how the checkout looks?`,
      close: `If we handle 100% of the menu setup so your staff doesn't lift a finger, would you be open to trying it for 30 days?`,
    },
    word_of_mouth: {
      title: '“We get all our business through word-of-mouth”',
      category: 'Perceived Satisfaction',
      icon: Sparkles,
      reframe: 'Show that word-of-mouth recommendations still verify menus on smartphones before visiting.',
      script: `That’s the best kind of business to have! The catch is, even when someone recommends ${currentLead?.restaurantName || 'your place'} to a friend, the very first thing that friend does is search your Instagram or website on their phone. If the menu is an unreadable PDF or the booking link is broken, they pick somewhere else for Friday night.`,
      close: `Why not let the live mockup capture those recommended diners instead of losing them to competitors?`,
    },
    guarantee: {
      title: '“Can you guarantee this will bring more customers?”',
      category: 'Risk Reversal',
      icon: ShieldCheck,
      reframe: 'Remove 100% of the risk with a simple performance launch condition.',
      script: `Absolutely. We don’t expect you to take any risk. We build the entire interactive website and booking flow first. If you don't love the preview or feel it's an immediate upgrade for ${currentLead?.restaurantName || 'your restaurant'}, you pay $0. Zero strings attached.`,
      close: `Does that sound fair enough to take a look at the mockup?`,
    },
  };

  const handleResolveCustom = () => {
    if (!customObjection.trim()) return;
    setIsResolving(true);
    setCustomResult(null);

    const name = currentLead?.restaurantName || 'your spot';
    setTimeout(() => {
      setCustomResult({
        reframe: 'Reframe to immediate weekend booking revenue and zero owner workload.',
        response: `I hear you completely on "${customObjection.trim()}". Our setup for ${name} is 100% turnkey and designed to capture high-margin weekend orders without taking any of your team's time.`,
        closeQuestion: 'Would you be open to taking 30 seconds to click through the live interactive preview?',
        source: 'preset',
      });
      setIsResolving(false);
    }, 250);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const currentObj = objectionPresets[activeObjection];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
                  Live Objection Buster & Battle Board
                </h3>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                  INSTANT CLOSER
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Overcome client hesitation on live calls and DM conversations with high-impact reframes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Objections Selector Pills */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Common Client Objections:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.keys(objectionPresets).map((key) => {
                const item = objectionPresets[key];
                const isSelected = activeObjection === key && !customResult;
                const Icon = item.icon;

                return (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveObjection(key);
                      setCustomResult(null);
                    }}
                    className={`rounded-xl p-2.5 text-left border transition flex items-center gap-2.5 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-950/40 text-white shadow-md'
                        : 'border-white/5 bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:border-white/15'
                    }`}
                  >
                    <Icon className="h-4 w-4 text-amber-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-xs font-bold block truncate">{item.title}</span>
                      <span className="text-[10px] text-slate-500 block">{item.category}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Objection Solution Card */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  {customResult ? 'AI Custom Resolution' : currentObj.category}
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {customResult ? `Client: "${customObjection}"` : currentObj.title}
                </h4>
              </div>

              <button
                onClick={() =>
                  handleCopy(
                    customResult
                      ? `${customResult.response}\n\n${customResult.closeQuestion}`
                      : `${currentObj.script}\n\n${currentObj.close}`,
                    'full_script'
                  )
                }
                className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition"
              >
                {copiedKey === 'full_script' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === 'full_script' ? 'Copied Full Script!' : 'Copy Script'}</span>
              </button>
            </div>

            {/* Reframe */}
            <div className="rounded-xl bg-slate-900/80 p-3 border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                Psychological Reframe (The Mental Shift):
              </span>
              <p className="text-xs text-slate-300">
                {customResult ? customResult.reframe : currentObj.reframe}
              </p>
            </div>

            {/* Word-For-Word Closer Script */}
            <div>
              <span className="text-xs font-bold text-slate-300 block mb-1">
                Word-For-Word Script (Speak or Text This):
              </span>
              <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-100 font-sans leading-relaxed border border-white/10">
                {customResult ? customResult.response : currentObj.script}
              </div>
            </div>

            {/* The Low-Friction Closing Question */}
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/20 p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
                Low-Friction Closing Question (Lock It In):
              </span>
              <p className="text-sm font-semibold text-emerald-200">
                “{customResult ? customResult.closeQuestion : currentObj.close}”
              </p>
            </div>
          </div>

          {/* Instant Custom Objection Reframe */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">⚡</span>
              <span className="text-xs font-bold text-white">
                Faced an unusual objection? Get an instant battle-tested closer reframe:
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customObjection}
                onChange={(e) => setCustomObjection(e.target.value)}
                placeholder="e.g. 'We are closing for renovation in November so not right now'..."
                className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleResolveCustom}
                disabled={isResolving || !customObjection.trim()}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isResolving ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Solve</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
