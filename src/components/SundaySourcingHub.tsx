import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  Facebook,
  Instagram,
  Mail,
  Zap,
  Layers,
  CheckCircle2,
  TrendingUp,
  Clock,
  Target,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { Lead, Weekday } from '../types';
import { WeeklyDispatchBoard } from './WeeklyDispatchBoard';

interface SundaySourcingHubProps {
  leads: Lead[];
  onAddLead: (lead: Omit<Lead, 'id'>) => Lead;
  onBulkAddLeads: (leads: Omit<Lead, 'id'>[]) => void;
  onUpdateLead?: (updatedLead: Lead) => void;
  onUpdateStatus: (leadId: number, status: Lead['status']) => void;
  onLogFollowupSent: (leadId: number) => void;
  onDeleteLead?: (leadId: number) => void;
  onOpenMockup?: (lead: Lead) => void;
  onViewDetails?: (lead: Lead) => void;
  onSelectLeadForCopilot?: (lead: Lead) => void;
  onRescheduleLead?: (leadId: number, newDay: Weekday, targetWeek?: string) => void;
  onAutoDistributeUnassigned?: (targetWeek?: string) => void;
  onOpenWeeklyPacer?: (targetWeek?: string) => void;
  initialSubTab?: 'facebook' | 'instagram' | 'email' | 'dispatch';
}

const WEEKDAYS: Weekday[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const SundaySourcingHub: React.FC<SundaySourcingHubProps> = ({
  leads,
  onAddLead,
  onBulkAddLeads,
  onUpdateLead,
  onUpdateStatus,
  onLogFollowupSent,
  onDeleteLead,
  onOpenMockup,
  onViewDetails,
  onSelectLeadForCopilot,
  onRescheduleLead,
  onAutoDistributeUnassigned,
  onOpenWeeklyPacer,
  initialSubTab = 'facebook',
}) => {
  const [activeChannelTab, setActiveChannelTab] = useState<'facebook' | 'instagram' | 'email' | 'dispatch'>(
    initialSubTab
  );

  // Calculate weekly metrics
  const scheduledCount = leads.filter((l) => l.scheduledDay && WEEKDAYS.includes(l.scheduledDay)).length;
  const targetTotal = 70; // 10 leads/day * 7 days

  const fbCount = leads.filter((l) => l.platform.toLowerCase() === 'facebook').length;
  const igCount = leads.filter((l) => l.platform.toLowerCase() === 'instagram').length;
  const emailCount = leads.filter((l) => l.platform.toLowerCase() === 'email').length;

  return (
    <div className="space-y-6">
      {/* Sunday Sourcing Command Header */}
      <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 p-5 sm:p-7 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                SUNDAY LEAD SOURCING & BATCH HQ
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-black text-emerald-300 border border-emerald-500/30">
                70 LEADS / WEEK TARGET (10/DAY)
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-['Outfit']">
              Extract, Schedule & Store Weekly Leads
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1 leading-relaxed">
              Every Sunday: source 70 leads across <strong className="text-blue-400">Facebook</strong>, <strong className="text-pink-400">Instagram</strong>, and <strong className="text-emerald-400">Email</strong>. Automatically extracts owner contacts, generates 0.3s prototypes, and queues 10 leads per day (Mon–Sun).
            </p>
          </div>

          {/* Weekly Quota Card */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 min-w-[140px] text-center shadow-lg">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Week Pipeline
              </span>
              <div className="text-2xl font-black text-white mt-0.5 font-['Outfit']">
                {scheduledCount} <span className="text-sm text-slate-500 font-semibold">/ {targetTotal}</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                  style={{ width: `${Math.min((scheduledCount / targetTotal) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Channel Badges */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-300">
                <Facebook className="h-3.5 w-3.5" />
                <span>{fbCount} Facebook</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-pink-500/25 bg-pink-500/10 px-3 py-1.5 text-xs font-bold text-pink-300">
                <Instagram className="h-3.5 w-3.5" />
                <span>{igCount} Instagram</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                <Mail className="h-3.5 w-3.5" />
                <span>{emailCount} Email</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Outreach Board */}
      <WeeklyDispatchBoard
        leads={leads}
        onUpdateLead={onUpdateLead}
        onUpdateStatus={onUpdateStatus}
        onLogFollowupSent={onLogFollowupSent}
        onDeleteLead={onDeleteLead}
        onOpenMockup={onOpenMockup}
        onViewDetails={onViewDetails}
        onSelectLeadForCopilot={onSelectLeadForCopilot}
        onRescheduleLead={onRescheduleLead}
        onAutoDistributeUnassigned={onAutoDistributeUnassigned}
        onOpenWeeklyPacer={onOpenWeeklyPacer}
      />
    </div>
  );
};
