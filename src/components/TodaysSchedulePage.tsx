import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Mail,
  Instagram,
  Facebook,
  X,
  RotateCcw,
  Target,
  Trophy,
  Sparkles,
  StickyNote,
  Coffee,
  AlertTriangle,
  Snowflake,
  Play,
  Flame,
  Layers,
  ArrowRight,
  Lock,
  Timer,
  Bell,
  Zap,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../types';
import { QuickNoteModal } from './QuickNoteModal';
import { SundayPrepView } from './SundayPrepView';
import { TestLinkButton } from './TestLinkButton';
import { recordTodayCompletion } from '../utils/historyStorage';
import {
  playSuccessChime,
  playNotificationChime,
  playGoalAccomplishedFanfare,
} from '../utils/soundEffects';
import {
  getPlatformLink,
  getBlindRouteLink,
} from '../utils/channelStorage';
import {
  getLocalTodayStr,
  normalizeToLocalDateStr,
  isDateToday,
  isDateOverdue,
  addDays,
  isTodaySunday,
  markInitialSent,
  markFollowupSent,
  toggleLeadSeen,
  isLeadDismissedToday,
  isInitialSentToday,
  isDay4FollowupDue,
  isDay8FollowupDue,
  isDay14FollowupDue,
  revertInitialSent,
  getCadenceMessageTemplates,
  isEmailOnlyLead,
  isLeadWarmedBeforeToday,
  isLeadWarmedToday,
  getTomorrowWarmupTargetDate,
} from '../utils/cadenceEngine';
import {
  getChannelCooldownRemaining,
  startChannelCooldown,
  formatCooldownTime,
} from '../utils/antiSpamLock';

interface TodaysSchedulePageProps {
  combinedLeads?: ChannelLead[];
  emailLeads?: ChannelLead[];
  instagramLeads: ChannelLead[];
  facebookLeads?: ChannelLead[];
  onUpdateCombinedLeads?: (leads: ChannelLead[]) => void;
  onUpdateEmailLeads?: (leads: ChannelLead[]) => void;
  onUpdateInstagramLeads: (leads: ChannelLead[]) => void;
  onUpdateFacebookLeads?: (leads: ChannelLead[]) => void;
  onNavigateToChannel: (channel: MultiChannelType) => void;
  isFrozen?: boolean;
  onToggleFreeze?: () => void;
}

export const TodaysSchedulePage: React.FC<TodaysSchedulePageProps> = ({
  combinedLeads,
  emailLeads = [],
  instagramLeads,
  facebookLeads = [],
  onUpdateCombinedLeads,
  onUpdateEmailLeads,
  onUpdateInstagramLeads,
  onUpdateFacebookLeads,
  onNavigateToChannel,
  isFrozen = false,
  onToggleFreeze,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [noteModalLead, setNoteModalLead] = useState<ChannelLead | null>(null);
  const [showFrozenOverride, setShowFrozenOverride] = useState(false);

  // Dedicated Modal State for Requirement 2
  // 'none' | 'ig_leads' | 'combined_leads' | 'warmup_leads'
  const [activeModal, setActiveModal] = useState<'none' | 'ig_leads' | 'combined_leads' | 'warmup_leads'>('none');

  // Verification Toast for Warm-Up Actions
  const [warmupToast, setWarmupToast] = useState<{
    id: string;
    leadName: string;
    action: 'warmed' | 'locked';
    channel: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    if (!warmupToast) return;
    const timer = setTimeout(() => {
      setWarmupToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [warmupToast]);

  // Anti-Spam 12-Minute Countdown Cooldown Timers (Requirement 5)
  const [igCooldownMs, setIgCooldownMs] = useState<number>(() => getChannelCooldownRemaining('instagram'));
  const [combinedCooldownMs, setCombinedCooldownMs] = useState<number>(() => getChannelCooldownRemaining('combined'));

  // Ticking cooldown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setIgCooldownMs(getChannelCooldownRemaining('instagram'));
      setCombinedCooldownMs(getChannelCooldownRemaining('combined'));
    }, 1000);

    const handleCooldownChange = () => {
      setIgCooldownMs(getChannelCooldownRemaining('instagram'));
      setCombinedCooldownMs(getChannelCooldownRemaining('combined'));
    };

    window.addEventListener('outreach_cooldown_changed', handleCooldownChange);
    return () => {
      clearInterval(timer);
      window.removeEventListener('outreach_cooldown_changed', handleCooldownChange);
    };
  }, []);

  const isActualSunday = isTodaySunday();
  const [forceSundayPreview, setForceSundayPreview] = useState<boolean>(() => isActualSunday);
  const [showQueuesOverride, setShowQueuesOverride] = useState<boolean>(false);

  const todayStr = getLocalTodayStr();
  const isSundayMode = (isActualSunday || forceSundayPreview) && !showQueuesOverride;

  const handleToggleSundayMode = () => {
    if (isSundayMode) {
      setForceSundayPreview(false);
      setShowQueuesOverride(true);
    } else {
      setForceSundayPreview(true);
      setShowQueuesOverride(false);
    }
  };

  const effectiveCombinedLeads = combinedLeads ?? [...emailLeads, ...facebookLeads];

  // Helper to accurately update a lead in its respective channel store
  const handleUpdateLead = (updated: ChannelLead) => {
    // 1. Check if lead belongs to Instagram
    const isInstagram = updated.channel === 'instagram' || instagramLeads.some((l) => l.id === updated.id);
    if (isInstagram) {
      onUpdateInstagramLeads(instagramLeads.map((l) => (l.id === updated.id ? updated : l)));
      return;
    }

    // 2. Combined Leads Store (unified FB + Email pipeline)
    if (onUpdateCombinedLeads) {
      onUpdateCombinedLeads(effectiveCombinedLeads.map((l) => (l.id === updated.id ? updated : l)));
      return;
    }

    // 3. Fallback for standalone legacy stores if provided
    if (updated.channel === 'email' && onUpdateEmailLeads) {
      onUpdateEmailLeads(emailLeads.map((l) => (l.id === updated.id ? updated : l)));
      return;
    }
    if (updated.channel === 'facebook' && onUpdateFacebookLeads) {
      onUpdateFacebookLeads(facebookLeads.map((l) => (l.id === updated.id ? updated : l)));
      return;
    }
  };

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleUndoSent = (lead: ChannelLead) => {
    const updated = revertInitialSent(lead);
    handleUpdateLead(updated);
  };

  const handleSaveQuickNote = (leadId: string, noteText: string) => {
    const targetLead = allLeads.find((l) => l.id === leadId);
    if (!targetLead) return;
    const updated: ChannelLead = {
      ...targetLead,
      quickNote: noteText || undefined,
      quickNoteSavedAt: noteText ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    };
    handleUpdateLead(updated);
  };

  const handleDeleteQuickNote = (leadId: string) => {
    const targetLead = allLeads.find((l) => l.id === leadId);
    if (!targetLead) return;
    const updated: ChannelLead = {
      ...targetLead,
      quickNote: undefined,
      quickNoteSavedAt: undefined,
    };
    handleUpdateLead(updated);
  };

  const allLeads: (ChannelLead & { channelLabel: string })[] = [
    ...effectiveCombinedLeads.map((l) => ({ ...l, channelLabel: 'Combined Outreach' })),
    ...instagramLeads.map((l) => ({ ...l, channelLabel: 'Instagram' })),
  ];

  // 1. Sent Today Counts
  const sentTodayLeads = allLeads.filter((l) => isInitialSentToday(l, todayStr));
  const initialSentTodayCount = sentTodayLeads.length;

  const day4SentTodayLeads = allLeads.filter(
    (l) => normalizeToLocalDateStr(l.followup1SentDate) === todayStr
  );
  const day8SentTodayLeads = allLeads.filter(
    (l) => normalizeToLocalDateStr(l.followup2SentDate) === todayStr
  );
  const day14SentTodayLeads = allLeads.filter(
    (l) => normalizeToLocalDateStr(l.followup3SentDate) === todayStr
  );
  const followupsSentTodayCount = day4SentTodayLeads.length + day8SentTodayLeads.length + day14SentTodayLeads.length;
  const totalTasksCompletedToday = initialSentTodayCount + followupsSentTodayCount;

  // Automated Daily Rollover:
  // If an initial social lead is scheduled for today or earlier, but was NOT warmed up yesterday,
  // it CANNOT be sent today. It automatically rolls over to tomorrow (the next dispatch day)
  // so the user can warm it up today in the Warm-Up queue!
  useEffect(() => {
    const targetTomorrow = getTomorrowWarmupTargetDate(todayStr);
    let igNeedsUpdate = false;
    const nextIgLeads = instagramLeads.map((lead) => {
      if (lead.isCompleted || lead.initialSentDate) return lead;
      if (!lead.scheduledDate) return lead;
      // If scheduled for today or overdue, but wasn't warmed up before today
      if (lead.scheduledDate <= todayStr && !isLeadWarmedBeforeToday(lead, todayStr)) {
        igNeedsUpdate = true;
        return {
          ...lead,
          scheduledDate: targetTomorrow,
          warmupStatus: 'locked' as const,
          isWarmedUp: false,
        };
      }
      return lead;
    });

    if (igNeedsUpdate) {
      onUpdateInstagramLeads(nextIgLeads);
    }

    if (onUpdateCombinedLeads) {
      let combinedNeedsUpdate = false;
      const nextCombinedLeads = effectiveCombinedLeads.map((lead) => {
        if (lead.isCompleted || lead.initialSentDate) return lead;
        if (!lead.scheduledDate) return lead;
        if (isEmailOnlyLead(lead)) return lead;
        if (lead.scheduledDate <= todayStr && !isLeadWarmedBeforeToday(lead, todayStr)) {
          combinedNeedsUpdate = true;
          return {
            ...lead,
            scheduledDate: targetTomorrow,
            warmupStatus: 'locked' as const,
            isWarmedUp: false,
          };
        }
        return lead;
      });

      if (combinedNeedsUpdate) {
        onUpdateCombinedLeads(nextCombinedLeads);
      }
    }
  }, [todayStr]);

  // 2. Initial Outreach Due Today
  // STRICT RULE: Social leads (IG / FB) MUST have been warmed up BEFORE today (yesterday or older).
  // Same-day warm-up or un-warmed leads cannot be dispatched today.
  const newOutreachDueToday = allLeads.filter((l) => {
    if (l.isCompleted || l.initialSentDate) return false;
    if (isLeadDismissedToday(l)) return false;
    if (!l.scheduledDate || !isDateToday(l.scheduledDate)) return false;
    if (isEmailOnlyLead(l)) return true;
    return isLeadWarmedBeforeToday(l, todayStr);
  });

  // 3. Follow-Ups Due Today
  const followupsDueToday = allLeads.filter((l) => {
    if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
    if (isLeadDismissedToday(l)) return false;
    if (!l.initialSentDate) return false;

    if (l.followupCount === 0 && (isDateToday(l.followup1Date) || isDateOverdue(l.followup1Date) || isDay4FollowupDue(l, todayStr))) return true;
    if (l.followupCount === 1 && (isDateToday(l.followup2Date) || isDateOverdue(l.followup2Date) || isDay8FollowupDue(l, todayStr))) return true;
    if (l.followupCount === 2 && (isDateToday(l.followup3Date) || isDateOverdue(l.followup3Date) || isDay14FollowupDue(l, todayStr))) return true;

    return false;
  });

  const newDueTodayCount = newOutreachDueToday.length;
  const followupsDueTodayCount = followupsDueToday.length;
  const totalTasksRemainingToday = newDueTodayCount + followupsDueTodayCount;
  const dailyTargetTotal = totalTasksCompletedToday + totalTasksRemainingToday;

  const progressPercent = dailyTargetTotal > 0
    ? Math.min(100, Math.round((totalTasksCompletedToday / dailyTargetTotal) * 100))
    : (totalTasksCompletedToday > 0 ? 100 : 100);
  const isGoalFinished = dailyTargetTotal > 0 && totalTasksCompletedToday >= dailyTargetTotal;

  // 4. WARM-UP NEEDS TODAY (Tracking for tomorrow's dispatch)
  const [schedY, schedM, schedD] = todayStr.split('-').map(Number);
  const schedTodayDate = new Date(schedY, schedM - 1, schedD);
  const schedDayOfWeek = schedTodayDate.getDay();
  const isSchedSaturday = schedDayOfWeek === 6;
  const isSchedSunday = schedDayOfWeek === 0;
  const warmupTargetDateStr = isSchedSunday
    ? null
    : getTomorrowWarmupTargetDate(todayStr);

  // Warm-up targets only Instagram and Facebook leads with social profiles.
  // Email-only leads are excluded.
  const warmupForTomorrowLeads = useMemo(() => {
    if (!warmupTargetDateStr) return [];
    return allLeads.filter((l) => {
      if (l.isCompleted || l.initialSentDate) return false;
      if (l.scheduledDate !== warmupTargetDateStr) return false;
      if (isEmailOnlyLead(l)) return false;
      return getBlindRouteLink(l, 'warmup') !== null;
    });
  }, [allLeads, warmupTargetDateStr]);

  const warmupCompletedCount = warmupForTomorrowLeads.filter(
    (l) => l.warmupStatus === 'warmed' || l.isWarmedUp
  ).length;

  const warmupTotalNeeded = warmupForTomorrowLeads.length;
  const warmupPercent = warmupTotalNeeded > 0
    ? Math.min(100, Math.round((warmupCompletedCount / warmupTotalNeeded) * 100))
    : 100;
  const isWarmupFinished = warmupTotalNeeded > 0 && warmupCompletedCount >= warmupTotalNeeded;

  const handleToggleLeadWarmup = (lead: ChannelLead) => {
    const isCurrentlyWarmed = lead.warmupStatus === 'warmed' || Boolean(lead.isWarmedUp);
    const nextVal = !isCurrentlyWarmed;
    const targetTomorrow = getTomorrowWarmupTargetDate(todayStr);

    const updated: ChannelLead = {
      ...lead,
      warmupStatus: nextVal ? 'warmed' : 'locked',
      isWarmedUp: nextVal,
      warmedUpAt: nextVal ? new Date().toISOString() : undefined,
      // If warming up today, strictly set scheduled date to tomorrow's dispatch date
      scheduledDate: nextVal
        ? (lead.scheduledDate && lead.scheduledDate > todayStr ? lead.scheduledDate : targetTomorrow)
        : lead.scheduledDate,
    };
    handleUpdateLead(updated);

    if (nextVal) {
      if (warmupCompletedCount + 1 >= warmupTotalNeeded && warmupTotalNeeded > 0) {
        playGoalAccomplishedFanfare();
      } else {
        playSuccessChime();
      }
    } else {
      playNotificationChime();
    }

    setWarmupToast({
      id: lead.id,
      leadName: lead.name,
      action: nextVal ? 'warmed' : 'locked',
      channel: lead.channel,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  };

  // Channel Specific Lists for Dedicated Modals
  // STRICT RULE: Initial social leads MUST have been warmed up BEFORE today (yesterday or older).
  const todayIgLeads = useMemo(() => {
    return instagramLeads.filter((l) => {
      if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
      if (isLeadDismissedToday(l)) return false;
      // Initial due: MUST be scheduled for today AND warmed up before today!
      if (!l.initialSentDate) {
        if (!l.scheduledDate || !isDateToday(l.scheduledDate)) return false;
        return isLeadWarmedBeforeToday(l, todayStr);
      }
      // Follow-ups due
      if (l.initialSentDate) {
        if (l.followupCount === 0 && (isDateToday(l.followup1Date) || isDateOverdue(l.followup1Date) || isDay4FollowupDue(l, todayStr))) return true;
        if (l.followupCount === 1 && (isDateToday(l.followup2Date) || isDateOverdue(l.followup2Date) || isDay8FollowupDue(l, todayStr))) return true;
        if (l.followupCount === 2 && (isDateToday(l.followup3Date) || isDateOverdue(l.followup3Date) || isDay14FollowupDue(l, todayStr))) return true;
      }
      return false;
    });
  }, [instagramLeads, todayStr]);

  const todayCombinedLeads = useMemo(() => {
    return effectiveCombinedLeads.filter((l) => {
      if (l.isCompleted || l.leadStatus === 'replied' || l.leadStatus === 'completed') return false;
      if (isLeadDismissedToday(l)) return false;
      // Initial due
      if (!l.initialSentDate) {
        if (!l.scheduledDate || !isDateToday(l.scheduledDate)) return false;
        if (isEmailOnlyLead(l)) return true;
        return isLeadWarmedBeforeToday(l, todayStr);
      }
      // Follow-ups due
      if (l.initialSentDate) {
        if (l.followupCount === 0 && (isDateToday(l.followup1Date) || isDateOverdue(l.followup1Date) || isDay4FollowupDue(l, todayStr))) return true;
        if (l.followupCount === 1 && (isDateToday(l.followup2Date) || isDateOverdue(l.followup2Date) || isDay8FollowupDue(l, todayStr))) return true;
        if (l.followupCount === 2 && (isDateToday(l.followup3Date) || isDateOverdue(l.followup3Date) || isDay14FollowupDue(l, todayStr))) return true;
      }
      return false;
    });
  }, [effectiveCombinedLeads, todayStr]);

  // Quota and Stats
  const igInitialDue = todayIgLeads.filter((l) => !l.initialSentDate).length;
  const igFollowupsDue = todayIgLeads.filter((l) => Boolean(l.initialSentDate)).length;

  const combinedInitialDue = todayCombinedLeads.filter((l) => !l.initialSentDate).length;
  const combinedFollowupsDue = todayCombinedLeads.filter((l) => Boolean(l.initialSentDate)).length;

  // Requirement 5: "Mark as Sent" with 12-Minute Spaced Out Cooldown
  const handleMarkLeadSentWithCooldown = (lead: ChannelLead, stepNumber: 0 | 1 | 2 | 3 = 0) => {
    const channelKey = lead.channel === 'instagram' ? 'instagram' : 'combined';
    const currentCooldown = getChannelCooldownRemaining(channelKey);

    if (currentCooldown > 0) {
      alert(`⏱️ 12-Minute Spaced Out Lock Active! Please wait ${formatCooldownTime(currentCooldown)} before sending the next DM.`);
      return;
    }

    let updated: ChannelLead;
    if (stepNumber === 0) {
      updated = markInitialSent(lead, todayStr);
    } else {
      updated = markFollowupSent(lead, stepNumber as 1 | 2 | 3, todayStr);
    }

    handleUpdateLead(updated);

    // Trigger the 12-minute anti-spam cooldown for this channel!
    startChannelCooldown(channelKey);
    if (channelKey === 'instagram') {
      setIgCooldownMs(12 * 60 * 1000);
    } else {
      setCombinedCooldownMs(12 * 60 * 1000);
    }
  };

  // Sync today's full schedule progress to persistent daily history
  useEffect(() => {
    recordTodayCompletion({
      totalCompleted: totalTasksCompletedToday,
      totalRemainingDue: totalTasksRemainingToday,
      initialSent: initialSentTodayCount,
      initialRemainingDue: newDueTodayCount,
      followupsSent: followupsSentTodayCount,
      followupsRemainingDue: followupsDueTodayCount,
    });
  }, [
    totalTasksCompletedToday,
    totalTasksRemainingToday,
    initialSentTodayCount,
    newDueTodayCount,
    followupsSentTodayCount,
    followupsDueTodayCount,
  ]);

  // Dedicated Freeze Mode Screen
  if (isFrozen && !showFrozenOverride) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-r from-cyan-950/70 via-slate-900/95 to-slate-900/95 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-xl shadow-cyan-950/50 shrink-0">
                <Snowflake className="w-7 h-7 text-cyan-400 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
                    Pipeline Frozen For This Week
                  </h1>
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    PAUSED &amp; STREAK PROTECTED
                  </span>
                </div>
                <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                  You paused outreach for this week. No daily tasks count as missed or overdue, and your streak is 100% protected.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {onToggleFreeze && (
                <button
                  type="button"
                  onClick={onToggleFreeze}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-950/60 transition cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Resume / Start Pipeline</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFrozenOverride(true)}
                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>👁️ View Dashboard Anyway</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sunday Prep Screen
  if (isSundayMode) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-900/90 p-5 sm:p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-lg shadow-emerald-950/40">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                    Sunday Rest &amp; Strategy Mode
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                    {isActualSunday ? `${todayStr} (Rest)` : `${todayStr} (Preview)`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rest day active. Outreach triggers are paused to protect energy. Lead research and prompt drafting remain active.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleToggleSundayMode}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-md"
            >
              <Coffee className="w-3.5 h-3.5 text-emerald-400" />
              <span>🌿 Sunday Mode: ON</span>
            </button>
          </div>
        </div>

        <SundayPrepView
          emailLeads={emailLeads}
          instagramLeads={instagramLeads}
          facebookLeads={facebookLeads}
          onNavigateToChannel={onNavigateToChannel}
          isPreviewMode={!isActualSunday && forceSundayPreview}
          onExitPreview={() => {
            setForceSundayPreview(false);
            setShowQueuesOverride(true);
          }}
          onShowQueuesAnyway={() => setShowQueuesOverride(true)}
        />
      </div>
    );
  }

  // Live pending actions count across all queues
  const pendingActionsCount =
    newDueTodayCount +
    followupsDueTodayCount +
    Math.max(0, warmupTotalNeeded - warmupCompletedCount);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* VERIFICATION TOAST BANNER (Requirement 1 Fix)                             */}
      {/* ========================================================================= */}
      {warmupToast && (
        <div
          className={`p-4 rounded-2xl border shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200 ${
            warmupToast.action === 'warmed'
              ? 'border-emerald-500/50 bg-gradient-to-r from-emerald-950/90 via-slate-900/95 to-slate-900/95 text-emerald-200'
              : 'border-amber-500/50 bg-gradient-to-r from-amber-950/90 via-slate-900/95 to-slate-900/95 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-lg ${
                warmupToast.action === 'warmed'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-emerald-950/50'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-amber-950/50'
              }`}
            >
              {warmupToast.action === 'warmed' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Lock className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                <span>
                  {warmupToast.action === 'warmed'
                    ? '🔥 Warm-Up Verified & Saved!'
                    : '🔒 Warm-Up Reverted to Locked'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                  {warmupToast.timestamp}
                </span>
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                  {warmupToast.channel}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {warmupToast.action === 'warmed' ? (
                  <>
                    Lead <strong className="text-white font-semibold">"{warmupToast.leadName}"</strong> is verified as warmed up. Tomorrow's dispatch lock is released and warm-up progress is updated.
                  </>
                ) : (
                  <>
                    Lead <strong className="text-white font-semibold">"{warmupToast.leadName}"</strong> returned to locked status.
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWarmupToast(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 0: TODAY'S ACTION DIRECTIVES & NOTIFICATIONS (Requirement 2 Fix)   */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-900/95 via-indigo-950/20 to-slate-900/95 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-950/50">
              <Bell className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white font-['Outfit']">
                  Today's Action Directives &amp; Notifications
                </h2>
                {pendingActionsCount > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono flex items-center gap-1.5 animate-pulse shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {pendingActionsCount} Actions Required Today
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    All Queues Cleared
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Priority notifications and 1-click execution queues for today's cadence.
              </p>
            </div>
          </div>

          {(igCooldownMs > 0 || combinedCooldownMs > 0) && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-mono font-bold self-start sm:self-auto shadow-sm">
              <Timer className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <span>
                12-Min Spacing Active:{' '}
                {igCooldownMs > 0 ? `IG (${formatCooldownTime(igCooldownMs)})` : ''}
                {igCooldownMs > 0 && combinedCooldownMs > 0 ? ' · ' : ''}
                {combinedCooldownMs > 0 ? `Combined (${formatCooldownTime(combinedCooldownMs)})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Action Directives Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Directive 1: Instagram Outreach */}
          <div
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
              todayIgLeads.length > 0
                ? 'border-pink-500/40 bg-pink-950/20 shadow-md'
                : 'border-white/5 bg-slate-950/40 opacity-70'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold font-['Outfit'] text-pink-300">
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                  Instagram Dispatch
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    todayIgLeads.length > 0
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {todayIgLeads.length} Due
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-snug">
                {todayIgLeads.length > 0
                  ? `${igInitialDue} Initial DMs and ${igFollowupsDue} follow-ups scheduled for dispatch.`
                  : 'All Instagram outreach tasks are finished for today.'}
              </p>
            </div>
            {todayIgLeads.length > 0 ? (
              <button
                type="button"
                onClick={() => setActiveModal('ig_leads')}
                className="w-full py-2 px-3 rounded-xl bg-pink-600/80 hover:bg-pink-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
              >
                <span>⚡ Launch IG Outreach</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 py-1">
                <Check className="w-3.5 h-3.5" /> IG Dispatches Up to Date
              </span>
            )}
          </div>

          {/* Directive 2: Combined Outreach */}
          <div
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
              todayCombinedLeads.length > 0
                ? 'border-indigo-500/40 bg-indigo-950/20 shadow-md'
                : 'border-white/5 bg-slate-950/40 opacity-70'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold font-['Outfit'] text-indigo-300">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Combined Outreach
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    todayCombinedLeads.length > 0
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {todayCombinedLeads.length} Due
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-snug">
                {todayCombinedLeads.length > 0
                  ? `${combinedInitialDue} Initial DMs and ${combinedFollowupsDue} follow-ups (FB & Email).`
                  : 'All Combined outreach tasks are finished for today.'}
              </p>
            </div>
            {todayCombinedLeads.length > 0 ? (
              <button
                type="button"
                onClick={() => setActiveModal('combined_leads')}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
              >
                <span>⚡ Launch Combined Outreach</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 py-1">
                <Check className="w-3.5 h-3.5" /> Combined Dispatches Up to Date
              </span>
            )}
          </div>

          {/* Directive 3: Warm-Up Queue */}
          <div
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
              warmupTotalNeeded - warmupCompletedCount > 0
                ? 'border-amber-500/50 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                : 'border-white/5 bg-slate-950/40 opacity-70'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold font-['Outfit'] text-amber-300">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Pre-Outreach Warm-Up
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    warmupTotalNeeded - warmupCompletedCount > 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {warmupCompletedCount} / {warmupTotalNeeded} Verified
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-snug">
                {warmupTotalNeeded - warmupCompletedCount > 0
                  ? `${warmupTotalNeeded - warmupCompletedCount} leads need warm-up today to unlock tomorrow's dispatch.`
                  : warmupTotalNeeded > 0
                  ? 'All prospects scheduled for tomorrow are verified and unlocked!'
                  : 'No warm-ups needed today.'}
              </p>
            </div>
            {warmupTotalNeeded - warmupCompletedCount > 0 ? (
              <button
                type="button"
                onClick={() => setActiveModal('warmup_leads')}
                className="w-full py-2 px-3 rounded-xl bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
              >
                <span>🔥 Verify Pending Warm-Ups</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 py-1">
                <Check className="w-3.5 h-3.5" /> All Tomorrow Leads Prepped
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: TWO PROGRESS BARS (Today's Progress + Warm-Up Progress)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Progress Bar 1: Today's Outreach Progress */}
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/95 to-slate-900/95 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-md">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                  Outreach Completion
                </span>
                <h3 className="text-base sm:text-lg font-black text-white font-['Outfit'] flex items-center gap-2 mt-0.5">
                  <span>Today's Progress:</span>
                  <span className="font-mono text-emerald-400">
                    {totalTasksCompletedToday} / {dailyTargetTotal}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-semibold">
                    ({progressPercent}%)
                  </span>
                </h3>
              </div>
            </div>

            {isGoalFinished && dailyTargetTotal > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono shrink-0">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>100% Hit</span>
              </span>
            )}
          </div>

          <div className="w-full h-3 bg-slate-950/80 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isGoalFinished && dailyTargetTotal > 0
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-lg shadow-emerald-500/60'
                  : 'bg-gradient-to-r from-indigo-500 via-emerald-500 to-teal-400'
              }`}
              style={{ width: `${dailyTargetTotal === 0 ? 0 : progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>{newDueTodayCount} Initial · {followupsDueTodayCount} Follow-Ups Due</span>
            <span className="text-emerald-300">{initialSentTodayCount} Initial · {followupsSentTodayCount} Follow-Ups Sent</span>
          </div>
        </div>

        {/* Progress Bar 2: Warm-Up Progress (Requirement 2) */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/95 to-slate-900/95 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-md">
                <Flame className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                  Pre-Outreach Preparation
                </span>
                <h3 className="text-base sm:text-lg font-black text-white font-['Outfit'] flex items-center gap-2 mt-0.5">
                  <span>Warm-Up Progress:</span>
                  <span className="font-mono text-amber-400">
                    {warmupCompletedCount} / {warmupTotalNeeded}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-semibold">
                    ({warmupPercent}%)
                  </span>
                </h3>
              </div>
            </div>

            {isWarmupFinished && warmupTotalNeeded > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Prepped!</span>
              </span>
            )}
          </div>

          <div className="w-full h-3 bg-slate-950/80 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-300 shadow-md shadow-amber-500/40"
              style={{ width: `${warmupTotalNeeded === 0 ? 0 : warmupPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Needed {isSchedSaturday ? 'for Monday' : 'for tomorrow'}: {warmupTotalNeeded} Leads</span>
            <span className="text-amber-300">{warmupCompletedCount} Warmed Up</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: 3 MAIN CARDS (Instagram, Combined Outreach, Warm-Up Today)     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Instagram */}
        <div className="rounded-3xl border border-pink-500/30 bg-gradient-to-br from-pink-950/25 via-slate-900/90 to-slate-900 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-5 group hover:border-pink-500/50 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center shadow-lg shadow-pink-950/50">
                  <Instagram className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg font-['Outfit']">Instagram</h3>
                  <span className="text-xs font-mono text-pink-300/80 uppercase font-semibold">Quota: 6 DMs/Day</span>
                </div>
              </div>
              {igCooldownMs > 0 && (
                <span className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 animate-spin" />
                  <span>{formatCooldownTime(igCooldownMs)}</span>
                </span>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
              <div className="text-base sm:text-lg font-bold text-white font-mono tracking-tight">
                <span className="text-pink-300 font-black text-xl">{igInitialDue}</span> Initial DMs ·{' '}
                <span className="text-pink-300 font-black text-xl">{igFollowupsDue}</span> Follow-Ups
              </div>
              <p className="text-[11px] text-slate-400">
                Scheduled for today in your local timezone.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('ig_leads')}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-pink-600/25 active:scale-95"
          >
            <span>View IG Leads</span>
            <span>→</span>
          </button>
        </div>

        {/* Card 2: Combined Outreach */}
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/25 via-slate-900/90 to-slate-900 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-5 group hover:border-indigo-500/50 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-950/50">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg font-['Outfit']">Combined Outreach</h3>
                  <span className="text-xs font-mono text-indigo-300/80 uppercase font-semibold">Quota: 4 Messages/Day (FB + Email)</span>
                </div>
              </div>
              {combinedCooldownMs > 0 && (
                <span className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 animate-spin" />
                  <span>{formatCooldownTime(combinedCooldownMs)}</span>
                </span>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
              <div className="text-base sm:text-lg font-bold text-white font-mono tracking-tight">
                <span className="text-indigo-300 font-black text-xl">{combinedInitialDue}</span> Initial DMs ·{' '}
                <span className="text-indigo-300 font-black text-xl">{combinedFollowupsDue}</span> Follow-Ups
              </div>
              <p className="text-[11px] text-slate-400">
                Intelligently routes FB &amp; Email leads.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('combined_leads')}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/25 active:scale-95"
          >
            <span>View Combined Leads</span>
            <span>→</span>
          </button>
        </div>

        {/* Card 3: Warm-Up Needs Today */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/25 via-slate-900/90 to-slate-900 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-5 group hover:border-amber-500/50 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-950/50">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg font-['Outfit']">Warm-Up Needs Today</h3>
                  <span className="text-xs font-mono text-amber-300/80 uppercase font-semibold">Prep for Tomorrow</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
                {warmupTotalNeeded} Due
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1">
              <div className="text-base sm:text-lg font-bold text-amber-200 font-mono tracking-tight">
                <span className="text-amber-300 font-black text-xl">{warmupTotalNeeded}</span> leads to warm up {isSchedSaturday ? 'for Monday' : 'for tomorrow'}
              </div>
              <p className="text-[11px] text-slate-400">
                Engage stories/posts today to unlock tomorrow's dispatch.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('warmup_leads')}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-600/25 active:scale-95"
          >
            <span>Engage Leads</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: WARM UP FOR TOMORROW QUICK LIST                                */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/25 via-slate-900/90 to-slate-900 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-500/20 pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Flame className="w-5 h-5 text-amber-400" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-['Outfit'] flex items-center gap-2">
                <span>🔥 Warm Up for Tomorrow</span>
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-500/30">
                  {warmupTotalNeeded} Due Today
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSchedSaturday
                  ? 'Saturday Rest Mode: No warm-ups today since Sunday is a rest day.'
                  : 'Engage these prospects today so they recognize your profile when outreach sends tomorrow.'}
              </p>
            </div>
          </div>
        </div>

        {warmupTotalNeeded === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-slate-300 font-semibold">
              {isSchedSaturday
                ? 'No warm-ups needed on Saturday. Sunday is rest!'
                : 'All prospects scheduled for tomorrow are warmed up, or no leads scheduled for tomorrow.'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {warmupForTomorrowLeads.map((lead) => (
              <div
                key={`warmup-${lead.channel}-${lead.id}`}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  lead.isWarmedUp
                    ? 'border-emerald-500/40 bg-emerald-950/20 shadow-sm'
                    : 'border-amber-500/50 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {lead.id}
                    </span>
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400">{lead.channel}</span>
                  </div>
                  <div className="font-semibold text-sm text-slate-100 truncate font-['Outfit']">
                    {lead.name}
                  </div>
                  {(() => {
                    const route = getBlindRouteLink(lead, 'warmup');
                    if (!route) return null;

                    const isFb = route.channelType === 'facebook';
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <a
                          href={route.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-[11px] truncate max-w-full font-medium ${
                            isFb ? 'text-sky-400 hover:text-sky-300' : 'text-pink-400 hover:text-pink-300'
                          }`}
                          title={`${route.actionLabel}: ${route.link}`}
                        >
                          {isFb ? (
                            <Facebook className="w-3 h-3 text-sky-400 shrink-0" />
                          ) : (
                            <Instagram className="w-3 h-3 text-pink-400 shrink-0" />
                          )}
                          <span className="font-bold text-[10px] bg-white/10 px-1 rounded font-mono">
                            {route.badgeLabel}
                          </span>
                          <span className="truncate max-w-[130px]">{route.link}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        <TestLinkButton lead={lead} platform={route.channelType} label={`Test ${route.badgeLabel}`} />
                      </div>
                    );
                  })()}
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleLeadWarmup(lead)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                    lead.isWarmedUp
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/50 shadow-amber-950/40 animate-pulse'
                  }`}
                  title={lead.isWarmedUp ? 'Profile Warmed Up (Click to toggle)' : 'Mark profile as Warmed Up'}
                >
                  <span>🔥</span>
                  <span>{lead.isWarmedUp ? 'Warmed' : 'Warm Up'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: TODAY'S INSTAGRAM LEADS (Requirement 2 & 5)                      */}
      {/* ========================================================================= */}
      {activeModal === 'ig_leads' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-pink-500/30 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-pink-400 bg-pink-500/10 px-2.5 py-0.5 rounded border border-pink-500/20">
                    Instagram Workspace
                  </span>
                  <span className="text-xs font-mono text-pink-300/80 font-bold">
                    Quota: 6 DMs/Day
                  </span>
                </div>
                <h3 className="text-xl font-black text-white font-['Outfit'] mt-1">
                  Today's Instagram Leads Queue ({todayIgLeads.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Anti-Spam Cooldown Active Notice */}
            {igCooldownMs > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-mono flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <Timer className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
                  <div>
                    <strong className="text-white block font-sans">⏱️ 12-Minute Spaced Out Lock Active</strong>
                    <span>Anti-spam protection running. Next DM dispatch unlocks in {formatCooldownTime(igCooldownMs)}.</span>
                  </div>
                </div>
                <span className="text-lg font-black font-mono text-amber-300 tabular-nums">
                  {formatCooldownTime(igCooldownMs)}
                </span>
              </div>
            )}

            {todayIgLeads.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm space-y-2.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                <div className="text-white font-bold text-base font-['Outfit']">No Instagram Leads Ready for Dispatch Today</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Initial DMs require previous-day warm-up verification. Un-warmed leads have rolled forward to tomorrow's schedule so you can warm them up today.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveModal('warmup_leads')}
                  className="mt-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <span>🔥 Open Warm-Up Command Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {todayIgLeads.map((lead) => {
                  const stageNumber: 0 | 4 | 8 | 14 =
                    !lead.initialSentDate
                      ? 0
                      : lead.followupCount === 0
                      ? 4
                      : lead.followupCount === 1
                      ? 8
                      : 14;

                  const blindRoute = getBlindRouteLink(lead, 'dispatch', stageNumber);
                  const templates = getCadenceMessageTemplates(lead);
                  const activeMessage =
                    stageNumber === 0
                      ? lead.initialDM || lead.customPitch || templates.stageAMessage
                      : stageNumber === 4
                      ? lead.followupDM_Day7 || lead.followup3DM || templates.day4Message
                      : stageNumber === 8
                      ? lead.followupDM_Day14 || lead.followup7DM || templates.day8Message
                      : lead.breakupDM_Day30 || templates.day14Message;

                  const isWarmedBeforeToday = isLeadWarmedBeforeToday(lead, todayStr);
                  const isLockedByWarmup = !isWarmedBeforeToday && stageNumber === 0;
                  const isLockedByTimer = igCooldownMs > 0;
                  const canSend = !isLockedByWarmup && !isLockedByTimer;

                  return (
                    <div
                      key={lead.id}
                      className="p-5 rounded-2xl border border-white/10 bg-slate-950/70 space-y-3.5 shadow-lg"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-pink-400 bg-pink-500/10 px-2.5 py-0.5 rounded border border-pink-500/20">
                            {lead.id}
                          </span>
                          <span className="text-base font-bold text-white font-['Outfit']">
                            {lead.name}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-slate-300">
                            {stageNumber === 0
                              ? 'Day 0 Initial DM'
                              : `Day ${stageNumber} Follow-Up`}
                          </span>
                        </div>

                        {/* Requirement 6: Blind Route Link (ONLY one link shown) */}
                        {blindRoute && (
                          <div className="flex items-center gap-2">
                            <a
                              href={blindRoute.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-pink-500/15 text-pink-300 hover:text-white border border-pink-500/30 text-xs font-bold font-mono transition"
                            >
                              <Instagram className="w-3.5 h-3.5" />
                              <span>Open IG Profile</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <TestLinkButton lead={lead} platform="instagram" label="Test Link" />
                          </div>
                        )}
                      </div>

                      {/* Auto-Served Message Copy */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>Pre-Configured Message for Today:</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(`dm-${lead.id}`, activeMessage)}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-indigo-300 hover:text-white flex items-center gap-1 transition"
                          >
                            {copiedKey === `dm-${lead.id}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Message</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                          {activeMessage}
                        </p>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateLead(toggleLeadSeen(lead))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              lead.isSeen
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                            }`}
                          >
                            <span>{lead.isSeen ? '👁️ Seen' : 'Mark Seen'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setNoteModalLead(lead)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                            <span>{lead.quickNote ? 'Edit Note' : 'Add Note'}</span>
                          </button>
                        </div>

                        {/* Dispatch Button with 12-Minute Timer & Warm-Up Lock */}
                        {isLockedByWarmup ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-amber-300 font-mono font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Must be warmed up day before (moved to tomorrow)</span>
                            </span>
                          </div>
                        ) : isLockedByTimer ? (
                          <button
                            type="button"
                            disabled
                            className="px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-slate-400 text-xs font-bold flex items-center gap-2 cursor-not-allowed"
                            title={`Locked for 12 minutes to prevent spam. Unlocks in ${formatCooldownTime(igCooldownMs)}`}
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            <span>⏱️ Locked ({formatCooldownTime(igCooldownMs)})</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkLeadSentWithCooldown(lead, stageNumber === 0 ? 0 : (lead.followupCount === 0 ? 1 : lead.followupCount === 1 ? 2 : 3))}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Mark as Sent</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TODAY'S COMBINED LEADS (Requirement 2 & 5)                       */}
      {/* ========================================================================= */}
      {activeModal === 'combined_leads' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-indigo-500/30 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                    Combined Outreach Workspace
                  </span>
                  <span className="text-xs font-mono text-indigo-300/80 font-bold">
                    Quota: 4 Messages/Day (Email + FB)
                  </span>
                </div>
                <h3 className="text-xl font-black text-white font-['Outfit'] mt-1">
                  Today's Combined Outreach Queue ({todayCombinedLeads.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Anti-Spam Cooldown Active Notice */}
            {combinedCooldownMs > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-mono flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <Timer className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
                  <div>
                    <strong className="text-white block font-sans">⏱️ 12-Minute Spaced Out Lock Active</strong>
                    <span>Anti-spam protection running. Next dispatch unlocks in {formatCooldownTime(combinedCooldownMs)}.</span>
                  </div>
                </div>
                <span className="text-lg font-black font-mono text-amber-300 tabular-nums">
                  {formatCooldownTime(combinedCooldownMs)}
                </span>
              </div>
            )}

            {todayCombinedLeads.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm space-y-2.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                <div className="text-white font-bold text-base font-['Outfit']">No Combined Outreach Leads Ready for Dispatch Today</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Facebook initial DMs require previous-day warm-up verification. Un-warmed leads have rolled forward to tomorrow's schedule so you can warm them up today.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveModal('warmup_leads')}
                  className="mt-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <span>🔥 Open Warm-Up Command Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {todayCombinedLeads.map((lead) => {
                  const stageNumber: 0 | 4 | 8 | 14 =
                    !lead.initialSentDate
                      ? 0
                      : lead.followupCount === 0
                      ? 4
                      : lead.followupCount === 1
                      ? 8
                      : 14;

                  const blindRoute = getBlindRouteLink(lead, 'dispatch', stageNumber);
                  const templates = getCadenceMessageTemplates(lead);
                  const activeMessage =
                    stageNumber === 0
                      ? lead.initialDM || lead.customPitch || templates.stageAMessage
                      : stageNumber === 4
                      ? lead.followupDM_Day7 || lead.followup3DM || templates.day4Message
                      : stageNumber === 8
                      ? lead.followupDM_Day14 || lead.followup7DM || templates.day8Message
                      : lead.breakupDM_Day30 || templates.day14Message;

                  const isFbLead = Boolean(lead.facebook || lead.channel === 'facebook');
                  const isWarmedBeforeToday = isLeadWarmedBeforeToday(lead, todayStr);
                  const isLockedByWarmup = isFbLead && !isWarmedBeforeToday && stageNumber === 0;
                  const isLockedByTimer = combinedCooldownMs > 0;

                  return (
                    <div
                      key={lead.id}
                      className="p-5 rounded-2xl border border-white/10 bg-slate-950/70 space-y-3.5 shadow-lg"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                            {lead.id}
                          </span>
                          <span className="text-base font-bold text-white font-['Outfit']">
                            {lead.name}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-slate-300">
                            {stageNumber === 0
                              ? 'Day 0 Initial Email'
                              : `Day ${stageNumber} Email`}
                          </span>
                        </div>

                        {/* Requirement 6: Blind Route Link (ONLY one link shown) */}
                        {blindRoute && (
                          <div className="flex items-center gap-2">
                            <a
                              href={blindRoute.href}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/15 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold font-mono transition"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Send Email</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <TestLinkButton lead={lead} platform="email" label="Test Email" />
                          </div>
                        )}
                      </div>

                      {/* Auto-Served Message Copy */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>Pre-Configured Message for Today:</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(`dm-${lead.id}`, activeMessage)}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-indigo-300 hover:text-white flex items-center gap-1 transition"
                          >
                            {copiedKey === `dm-${lead.id}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Message</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                          {activeMessage}
                        </p>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateLead(toggleLeadSeen(lead))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              lead.isSeen
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                            }`}
                          >
                            <span>{lead.isSeen ? '👁️ Seen' : 'Mark Seen'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setNoteModalLead(lead)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                            <span>{lead.quickNote ? 'Edit Note' : 'Add Note'}</span>
                          </button>
                        </div>

                        {/* Dispatch Button with 12-Minute Timer & Warm-Up Lock */}
                        {isLockedByWarmup ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-amber-300 font-mono font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                              <span>FB must be warmed up day before (moved to tomorrow)</span>
                            </span>
                          </div>
                        ) : isLockedByTimer ? (
                          <button
                            type="button"
                            disabled
                            className="px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-slate-400 text-xs font-bold flex items-center gap-2 cursor-not-allowed"
                            title={`Locked for 12 minutes to space out outreach. Unlocks in ${formatCooldownTime(combinedCooldownMs)}`}
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            <span>⏱️ Locked ({formatCooldownTime(combinedCooldownMs)})</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkLeadSentWithCooldown(lead, stageNumber === 0 ? 0 : (lead.followupCount === 0 ? 1 : lead.followupCount === 1 ? 2 : 3))}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Mark as Sent</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ENGAGE WARM-UP LEADS (Requirement 2 & 6)                         */}
      {/* ========================================================================= */}
      {activeModal === 'warmup_leads' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-amber-500/30 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                    Warm-Up Command Center
                  </span>
                  <span className="text-xs font-mono text-amber-300 font-bold">
                    Target: {isSchedSaturday ? 'Monday Outreach' : 'Tomorrow Outreach'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white font-['Outfit'] mt-1">
                  Engage Prospects Scheduled for Tomorrow ({warmupTotalNeeded})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Categorized by Instagram and Combined leads. Email-only leads do not require social warm-up and are excluded.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {warmupTotalNeeded === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No leads needing warm-up for tomorrow. You are fully prepped!
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Instagram Warm-Up Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-pink-300 font-bold text-sm font-['Outfit'] border-b border-white/5 pb-1">
                    <Instagram className="w-4 h-4" />
                    <span>Instagram Leads (for Tomorrow)</span>
                  </div>
                  {warmupForTomorrowLeads.filter((l) => l.channel === 'instagram').length === 0 ? (
                    <p className="text-xs text-slate-500 italic pl-1">No Instagram leads scheduled for tomorrow.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {warmupForTomorrowLeads
                        .filter((l) => l.channel === 'instagram')
                        .map((lead) => {
                          const route = getBlindRouteLink(lead, 'warmup');
                          return (
                            <div
                              key={lead.id}
                              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                                lead.isWarmedUp
                                  ? 'border-emerald-500/40 bg-emerald-950/20'
                                  : 'border-pink-500/40 bg-pink-950/20 shadow-md'
                              }`}
                            >
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                                    {lead.id}
                                  </span>
                                  <span className="text-sm font-bold text-white truncate font-['Outfit']">
                                    {lead.name}
                                  </span>
                                </div>
                                {route && (
                                  <a
                                    href={route.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-mono text-pink-300 hover:text-white flex items-center gap-1 truncate"
                                  >
                                    <Instagram className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{route.link}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleLeadWarmup(lead)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                                  lead.isWarmedUp
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/50'
                                }`}
                              >
                                {lead.isWarmedUp ? '✅ Warmed' : '🔥 Warm Up'}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* 2. Combined (Facebook) Warm-Up Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sky-300 font-bold text-sm font-['Outfit'] border-b border-white/5 pb-1">
                    <Facebook className="w-4 h-4" />
                    <span>Combined Outreach (Facebook - for Tomorrow)</span>
                  </div>
                  {warmupForTomorrowLeads.filter((l) => l.channel !== 'instagram').length === 0 ? (
                    <p className="text-xs text-slate-500 italic pl-1">No Facebook leads scheduled for tomorrow.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {warmupForTomorrowLeads
                        .filter((l) => l.channel !== 'instagram')
                        .map((lead) => {
                          const route = getBlindRouteLink(lead, 'warmup');
                          return (
                            <div
                              key={lead.id}
                              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                                lead.isWarmedUp
                                  ? 'border-emerald-500/40 bg-emerald-950/20'
                                  : 'border-sky-500/40 bg-sky-950/20 shadow-md'
                              }`}
                            >
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                    {lead.id}
                                  </span>
                                  <span className="text-sm font-bold text-white truncate font-['Outfit']">
                                    {lead.name}
                                  </span>
                                </div>
                                {route && (
                                  <a
                                    href={route.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-mono text-sky-300 hover:text-white flex items-center gap-1 truncate"
                                  >
                                    <Facebook className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{route.link}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleLeadWarmup(lead)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                                  lead.isWarmedUp
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/50'
                                }`}
                              >
                                {lead.isWarmedUp ? '✅ Warmed' : '🔥 Warm Up'}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Done Engaging
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Note Modal */}
      <QuickNoteModal
        isOpen={Boolean(noteModalLead)}
        lead={noteModalLead}
        onClose={() => setNoteModalLead(null)}
        onSave={handleSaveQuickNote}
        onDelete={handleDeleteQuickNote}
      />
    </div>
  );
};
