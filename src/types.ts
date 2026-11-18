export interface RejectedLeadEntry {
  id: string;
  originalUrl: string;
  normalizedUrl: string;
  businessName: string;
  platform: 'Facebook' | 'Google Maps' | 'Instagram' | 'Website' | 'Other';
  rejectedAt: string;
  rejectionReason: string;
  notes?: string;
  leadId?: number;
}

export type LeadStatus =
  | 'not_sent'
  | 'sent'
  | 'seen'
  | 'replied'
  | 'mockup_sent'
  | 'call_booked'
  | 'proposal_sent'
  | 'closed_won'
  | 'closed_dead';

export type PitchType =
  | 'case_study_0_down'
  | 'fast_close_offer'
  | '35_word_hook'
  | 'mockup_drop'
  | 'loom_video_pitch'
  | 'value_bomb'
  | 'objection_killer'
  | 'breakup_scarcity';

export interface FollowupLog {
  id: string;
  leadId: number;
  logDate: string;
  actionType: 'first_contact' | 'followup_sent' | 'replied' | 'call_booked' | 'proposal_sent' | 'closed_won' | 'closed_dead' | 'note';
  note: string;
}

export type Weekday =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export type OutreachChannel = 'Facebook' | 'Instagram' | 'Email' | 'Website' | 'Phone';

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  linkedin?: string;
  youtube?: string;
}

export interface ExtractedBusinessInfo {
  businessName: string;
  contactName: string;
  category: string;
  platform: 'Instagram' | 'Facebook' | 'Website' | 'Email' | 'GoogleMaps' | 'Yelp' | 'LinkedIn' | 'Other';
  link: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  bio?: string;
  hours?: string;
  services?: string[];
  socialLinks?: SocialLinks;
  highlights?: string[];
  priceRange?: string;
  rating?: string;
  extractedAt: string;
  rawDetails?: Record<string, any>;
}

export interface LeadScreenshot {
  id: string;
  url: string;
  fileName: string;
  uploadedAt: string;
  caption?: string;
  fileSize?: string;
}

export interface Lead {
  id: number;
  restaurantName: string;
  isCustomName?: boolean;
  contactName?: string;
  platform: 'Instagram' | 'WhatsApp' | 'TikTok' | 'Email' | 'Facebook' | 'LinkedIn' | 'Phone' | 'Website' | 'Google Maps';
  handle: string;
  city: string;
  address?: string;
  dateFirstContact: string;
  lastContactDate: string;
  nextFollowupDate: string | null;
  followupCount: number;
  followup1Date?: string;
  followup2Date?: string;
  status: LeadStatus;
  notes: string;
  pitchHook?: string;
  mockupLink?: string;
  mockupCategory?: string;
  leadScore?: number;
  estimatedDealValue?: number;
  isWarmedUp?: boolean;
  auditChecklist?: [boolean, boolean, boolean];
  phone?: string;
  email?: string;
  website?: string;
  profileUrl?: string;
  scheduledDay?: Weekday;
  targetWeek?: string;
  extractionSource?: string;
  bio?: string;
  hours?: string;
  services?: string[];
  socialLinks?: SocialLinks;
  highlights?: string[];
  priceRange?: string;
  rating?: string;
  // Stored / Pre-staged message sequence
  stagedDmMiniPitch?: string;
  stagedFollowup1?: string;
  stagedFollowup2?: string;
  stagedFollowup3?: string;
  customMessageDraft?: string;
  // 3-Step DM Sequence
  initialDM?: string;
  followup3DM?: string;
  followup7DM?: string;
  // Gemini Lead Analysis & Prompt Hub
  leadAnalysis?: string;
  analysisSavedAt?: string;
  // Quick Notes (Daily Schedule & Dispatch Log)
  quickNote?: string;
  quickNoteSavedAt?: string;
  // Mockup Screenshots & Timestamp
  createdAt?: string | number;
  mockupImage1?: string;
  mockupImage2?: string;
  mockupImage1Name?: string;
  mockupImage2Name?: string;
  // General Lead Screenshot & Media Vault (isolated from mockups)
  leadScreenshots?: LeadScreenshot[];

  // Video Value First Strategy Fields
  videoRecorded?: boolean;
  videoRecordedAt?: string;
  videoVerifiedAt?: string;
  reelPosted?: boolean;
  reelPostedAt?: string;
  reelLink?: string;
  dmSent?: boolean;
  dmSentAt?: string;
  repliedSendIt?: boolean;
  repliedSendItAt?: string;
  liveLinkSent?: boolean;
  liveLinkSentAt?: string;
  storyPosted?: boolean;
  storyPostedAt?: string;
}

export type LeadSortOption =
  | 'latest_paste'
  | 'heat_score'
  | 'scheduled_day'
  | 'followup_due'
  | 'alphabetical'
  | 'status';

export interface ObjectionData {
  key: string;
  label: string;
  reframe: string;
  response: string;
  closeQuestion: string;
}

export interface LeadResearchMapsResult {
  success: boolean;
  statusMsg: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  hours: string;
  rating: string;
  city: string;
  formattedLine: string;
  rawInput?: string;
}

export interface LeadResearchParsedProfile {
  success: boolean;
  statusMsg: string;
  name: string;
  handle: string;
  followers: string;
  city: string;
  category: string;
  notes: string;
  formattedLine: string;
  platform: 'Instagram' | 'Facebook';
}

export interface DailyDisciplineRecord {
  date: string; // YYYY-MM-DD
  dmsSent: number;
  followupsSent: number;
  targetDms: number;
  targetFollowups: number;
  streakCount: number;
  disciplineScore: number; // 0-100%
  completed: boolean;
  notes?: string;
}

export interface WeeklyAnalysisSummary {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  totalOutreachSent: number;
  totalFollowupsSent: number;
  repliesReceived: number;
  callsBooked: number;
  dealsWon: number;
  pipelineValue: number;
  wonRevenue: number;
  overallReplyRate: number; // percentage
  disciplinedDaysCount: number; // 0-7
  averageStreak: number;
  bestVelocityDay: string;
  conversionByTouchpoint: {
    touch1: number;
    touch2: number;
    touch3: number;
    touch4Plus: number;
  };
  coachInsights: string[];
}

export type MultiChannelType = 'combined' | 'instagram' | 'email' | 'facebook';

export type GlobalNavTab = 'combined' | 'instagram' | 'inbox' | 'today' | 'dashboard' | 'history' | 'backstage';

export type DailyHistoryStatus = 'full' | 'partial' | 'zero' | 'sunday' | 'frozen' | 'pre_launch' | 'empty';

export type ExecutionTier = 'elite' | 'partial' | 'critical' | 'protected' | 'pre_launch' | 'empty';

export type StreakStatus = 'active' | 'protected' | 'in_progress' | 'at_risk' | 'broken' | 'ready';

export interface DailyHistoryRecord {
  date: string; // 'YYYY-MM-DD'
  displayDate: string; // e.g. "Oct 26, 2026"
  dmsSent: number; // Actual verified dispatches on this date
  dmsTarget: number; // Expected daily quota on this date (0 on Rest/Frozen days)
  percentage: number; // Auditable completion % = Math.min(100, Math.round((actual / expected) * 100)) (100% if expected === 0)
  isSunday: boolean;
  isFrozen?: boolean;
  status: DailyHistoryStatus;
  executionTier?: ExecutionTier;
  actualDispatched?: number;
  expectedQuota?: number;
  igDispatched?: number;
  igExpected?: number;
  combinedDispatched?: number;
  combinedExpected?: number;
  shortfallReason?: string;
  notes?: string;
  updatedAt: string;
  // Breakdown of today's schedule tasks
  initialDmsSent?: number; // Initial DM sends only
  initialDmsTarget?: number;
  followupsSent?: number; // D4 + D8 + D14 follow-ups completed
  followupsTarget?: number;
  videosVerified?: number; // Count of videos verified today through the 2-second confirmation gate
  storiesPosted?: number; // Stories posted today
  reelsPosted?: number; // Reels posted today
  // Warm-Up tracking (matches dashboard Pre-Outreach Preparation progress)
  warmupCompleted?: number;
  warmupTarget?: number;
  warmupPercentage?: number;
  // Model A Obligation Ledger fields
  expectedTotal?: number;
  capacityTarget?: number;
  backlog?: number;
  supplyGap?: boolean;
  removedMidDay?: number;
  zeroState?: ObligationZeroState;
}

export interface HistoryStreakStats {
  currentStreak: number;
  bestStreak: number;
  completedDaysCount: number;
  protectedDaysCount?: number;
  averageCompletionRate: number;
  totalDMsSent: number;
  streakStatus?: StreakStatus;
  streakThreshold?: number;
  atRiskReason?: string;
  videosVerifiedToday?: number;
  storiesPostedToday?: number;
  reelsPostedToday?: number;
}

export type MultiChannelSubTab = 'leads' | 'dm' | 'schedule' | 'followup' | 'mockup';

export interface InboxLead {
  id: string;
  name: string;
  platform: 'Instagram' | 'Facebook' | 'Email' | 'Other';
  rawPlatform?: string;
  profileLink: string;
  platformLink?: string;
  instagram?: string;
  facebook?: string;
  email?: string;
  prompt: string;
  uploadedAt: string;
  rawDetails?: Record<string, any>;
}

export type CadenceLeadStatus = 'not_sent' | 'waiting_reply' | 'seen' | 'replied' | 'completed';

export type VoiceType =
  | 'IG-1'
  | 'IG-2'
  | 'IG-3'
  | 'IG-4'
  | 'IG-5'
  | 'IG-6'
  | 'Email-1'
  | 'Email-2'
  | 'Email-3'
  | 'Email-4'
  | null;

export interface ChannelLead {
  id: string; // e.g. "IG-1", "EM-1", "FB-1"
  numericId: number; // integer for next ID calculation
  name: string; // Business or contact name
  link: string; // Raw platform link / social handle / website / mailto:
  platformLink?: string; // Explicit raw platformLink value from Lead Qualification JSON
  instagram?: string; // Explicit Instagram handle or link
  facebook?: string; // Explicit Facebook page link or handle for dual-channel workflow
  email?: string; // Explicit Email address for dual-channel workflow
  hasInvalidEmail?: boolean; // Flagged true by Diagnostic Data Repair when no valid email can be extracted
  voiceType?: VoiceType; // Assigned Voice Type for DeepSeek Prompt Batching
  isVoiceTypeOverridden?: boolean; // Whether the operator manually set this voice type
  rawDetails?: Record<string, any>; // Underlying extracted details from lead qualification
  channel: MultiChannelType;
  sortOrder: number; // rank for drag-and-drop ordering
  createdAt: string;
  lastContactDate?: string;
  city?: string; // e.g. location for Day 14 social proof template
  prompt?: string; // Lead Engine / AI Prompt

  // Sub-page B: DM Pitch & 4-Step Cadence
  customPitch?: string;
  stagedDmMiniPitch?: string;
  initialDM?: string;
  followupDM_Day4?: string;
  followupDM_Day8?: string;
  breakupDM_Day14?: string;
  followupDM_Day7?: string;
  followupDM_Day14?: string;
  breakupDM_Day30?: string;
  followup3DM?: string; // backwards compatibility
  followup7DM?: string; // backwards compatibility
  pitchSavedAt?: string;
  isSequenceConfigured?: boolean; // Whether the sequence has been saved / customized

  // Gemini Lead Analysis & Prompt Hub
  leadAnalysis?: string;
  analysisSavedAt?: string;

  // Quick Notes (Daily Schedule & Dispatch Log)
  quickNote?: string;
  quickNoteSavedAt?: string;

  // Aggressive Warm-Up System
  warmupStatus?: 'locked' | 'warmed';
  isWarmedUp?: boolean;
  warmedUpAt?: string;

  // Sub-page C: Schedule Date
  scheduledDate?: string; // YYYY-MM-DD format (planned initial outreach date)

  // Video Value First Workflow Flags
  videoRecorded?: boolean;
  videoRecordedAt?: string;
  videoVerifiedAt?: string;
  reelPosted?: boolean;
  reelPostedAt?: string;
  reelLink?: string;
  dmSent?: boolean;
  dmSentAt?: string;
  repliedSendIt?: boolean;
  repliedSendItAt?: string;
  liveLinkSent?: boolean;
  liveLinkSentAt?: string;
  storyPosted?: boolean;
  storyPostedAt?: string;

  // Sub-page D: Follow-up & Cadence Status
  isCompleted?: boolean;
  completedAt?: string;
  leadStatus?: CadenceLeadStatus; // 'not_sent' | 'waiting_reply' | 'seen' | 'replied' | 'completed'
  status?: string; // Compatibility alias (e.g. 'sent' | 'dispatched')
  dispatchDate?: string; // Explicit local YYYY-MM-DD dispatch date
  dispatchedAt?: string; // ISO dispatch timestamp
  isSeen?: boolean; // 👀 Seen toggle (retains cadence timers)
  initialSentDate?: string; // YYYY-MM-DD
  followup1Date?: string; // Day 7 follow-up date
  followup2Date?: string; // Day 14 follow-up date
  followup3Date?: string; // Day 30 follow-up date
  followup1SentDate?: string;
  followup2SentDate?: string;
  followup3SentDate?: string;
  followupCount?: number; // 0 = initial, 1 = Day 7 sent, 2 = Day 14 sent, 3 = Day 30 sent
  repliedAt?: string;
  dismissedDate?: string; // YYYY-MM-DD: date when lead was removed/dismissed from daily queue

  // Sub-page E: Mockup & Breakdown Link (HTML and Screenshots)
  hasMockup?: boolean;
  mockupFileName?: string;
  mockupUploadedAt?: string;
  mockupLink?: string;
  mockupHtml?: string;
  mockupHtmlName?: string;
  mockupHtmlContent?: string;
  mockupUrl?: string;

  // Cross-Channel Routing & FB Restriction Flag
  fb_message_restricted?: boolean; // When true on FB lead, routes fallback outreach to Email
  notes?: string;

  // Soft Delete / Backstage Recycle Bin
  isArchived?: boolean;
  archivedAt?: string;
  archivedFromChannel?: MultiChannelType;
  archiveUid?: string;

  // Archive-First Lifecycle & Cancellation
  lifecycle?: 'active' | 'archived';
  cadenceStatus?: 'running' | 'completed' | 'cancelled';
  cancelledReason?: string;
  cancelledAt?: string;

  // Normalized Duplicate Detection & Historical Restoration
  possibleDuplicateOf?: string;
  restoredAt?: string;
  restoredNote?: string;
}

export type DispatchStep = 'D0' | 'D4' | 'D8' | 'D14';
export type DispatchSource = 'live' | 'backfill' | 'reconstruction' | 'restore';
export type DispatchChannel = 'instagram' | 'email' | 'facebook';

export interface DispatchLogEntry {
  id: string;
  leadId: string;
  leadName: string;
  channel: DispatchChannel;
  step: DispatchStep;
  localDate: string; // 'YYYY-MM-DD' strictly in local calendar timezone
  timestamp: string; // ISO string
  source: DispatchSource;
}

export type ObligationStatus = 'open' | 'locked' | 'frozen';
export type ObligationZeroState = 'normal' | 'rest' | 'frozen' | 'pre_launch' | 'empty';

export interface DailyObligationSnapshot {
  date: string; // 'YYYY-MM-DD'
  expectedTotal: number;
  expectedInitialIG: number;
  expectedInitialCombined: number;
  expectedFollowups: number;
  isRestDay: boolean;
  isFrozenDay: boolean;
  status: ObligationStatus;
  lockedAt?: string;
  frozenAt?: string;
  removedMidDay: number;
  supplyGap: boolean;
  zeroState: ObligationZeroState;
  updatedAt: string;
}

export interface DeletionLogEntry {
  id: string;
  leadId: string;
  leadName: string;
  channel: MultiChannelType;
  action: 'archive' | 'cancel_cadence' | 'permanent_delete';
  reason?: string;
  timestamp: string;
  localDate: string;
  hadSentHistory: boolean;
}


