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
  // Mockup Screenshots & Timestamp
  createdAt?: string | number;
  mockupImage1?: string;
  mockupImage2?: string;
  mockupImage1Name?: string;
  mockupImage2Name?: string;
  // General Lead Screenshot & Media Vault (isolated from mockups)
  leadScreenshots?: LeadScreenshot[];
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

// Multi-Channel Outreach Command Center Types
export type MultiChannelType = 'combined' | 'email' | 'instagram' | 'facebook';

export type GlobalNavTab =
  | 'combined'
  | 'email'
  | 'instagram'
  | 'facebook'
  | 'inbox'
  | 'today'
  | 'dashboard'
  | 'insights'
  | 'history'
  | 'backstage';

export type MultiChannelSubTab = 'leads' | 'dm' | 'schedule' | 'followup' | 'mockup';

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
  | 'Email-4';

export type DailyHistoryStatus =
  | 'full'
  | 'partial'
  | 'zero'
  | 'sunday'
  | 'frozen'
  | 'pre_launch'
  | 'empty';

export type ExecutionTier =
  | 'elite'
  | 'partial'
  | 'critical'
  | 'protected'
  | 'pre_launch'
  | 'empty';

export type ObligationZeroState = 'normal' | 'rest' | 'frozen' | 'pre_launch' | 'empty';

export type StreakStatus =
  | 'ready'
  | 'active'
  | 'in_progress'
  | 'at_risk'
  | 'broken'
  | 'protected';

export type DispatchChannel = 'instagram' | 'email' | 'facebook';
export type DispatchStep = 'D0' | 'D4' | 'D8' | 'D14';
export type DispatchSource = 'live' | 'backfill' | 'reconstruction' | 'restore';

export interface DispatchLogEntry {
  id: string;
  leadId: string;
  leadName: string;
  channel: DispatchChannel;
  step: DispatchStep;
  localDate: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  source: DispatchSource;
}

export interface DailyObligationSnapshot {
  date: string; // YYYY-MM-DD
  expectedTotal: number;
  expectedInitialIG: number;
  expectedInitialCombined: number;
  expectedFollowups: number;
  isRestDay: boolean;
  isFrozenDay: boolean;
  status: 'open' | 'locked' | 'frozen';
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

export interface DailyHistoryRecord {
  date: string; // YYYY-MM-DD
  displayDate: string;
  dmsSent: number;
  dmsTarget: number;
  percentage: number;
  isSunday: boolean;
  isFrozen?: boolean;
  status: DailyHistoryStatus;
  executionTier?: ExecutionTier;
  actualDispatched?: number;
  expectedQuota?: number;
  expectedTotal?: number;
  capacityTarget?: number;
  backlog?: number;
  supplyGap?: boolean;
  removedMidDay?: number;
  zeroState?: ObligationZeroState;
  igDispatched?: number;
  igExpected?: number;
  combinedDispatched?: number;
  combinedExpected?: number;
  shortfallReason?: string;
  notes?: string;
  updatedAt?: string;
  initialDmsSent?: number;
  initialDmsTarget?: number;
  followupsSent?: number;
  followupsTarget?: number;
  videosVerified?: number;
  storiesPosted?: number;
  reelsPosted?: number;
  warmupCompleted?: number;
  warmupTarget?: number;
  warmupPercentage?: number;
}

export interface HistoryStreakStats {
  currentStreak: number;
  bestStreak: number;
  completedDaysCount: number;
  protectedDaysCount?: number;
  averageCompletionRate: number;
  totalDMsSent: number;
  streakStatus: StreakStatus;
  streakThreshold: number;
  atRiskReason?: string;
  videosVerifiedToday?: number;
  storiesPostedToday?: number;
  reelsPostedToday?: number;
}

export interface InboxLead {
  id: string;
  name: string;
  platform: 'Instagram' | 'Facebook' | 'Email' | 'Other';
  rawPlatform?: string;
  profileLink?: string;
  platformLink?: string;
  instagram?: string;
  facebook?: string;
  email?: string;
  prompt: string;
  uploadedAt: string;
  rawDetails?: Record<string, any>;
}

export interface ChannelLead {
  id: string; // e.g. "IG-1", "CM-1", "EM-1", "FB-1"
  numericId: number; // integer for next ID calculation
  name: string; // Business or contact name
  link: string; // URL / social handle / website / email
  platformLink?: string;
  email?: string;
  hasInvalidEmail?: boolean;
  facebook?: string;
  instagram?: string;
  city?: string;
  notes?: string;
  rawDetails?: Record<string, any>;
  channel: MultiChannelType;
  sortOrder: number; // rank for drag-and-drop ordering
  createdAt: string;

  // Voice & Prompt / Analysis
  voiceType?: VoiceType;
  isVoiceTypeOverridden?: boolean;
  prompt?: string;
  leadAnalysis?: string;
  analysisSavedAt?: string;

  // Sub-page B: DM Pitch & Pre-Configured Sequence
  customPitch?: string;
  pitchSavedAt?: string;
  initialDM?: string;
  stagedDmMiniPitch?: string;
  followupDM_Day4?: string;
  followupDM_Day7?: string;
  followup3DM?: string;
  followupDM_Day8?: string;
  followupDM_Day14?: string;
  followup7DM?: string;
  breakupDM_Day14?: string;
  breakupDM_Day30?: string;
  isSequenceConfigured?: boolean;

  // Sub-page C: Schedule Date
  scheduledDate?: string; // YYYY-MM-DD format (planned initial outreach date)

  // Sub-page D: Follow-up & Cadence Status
  isCompleted?: boolean;
  completedAt?: string;
  leadStatus?: CadenceLeadStatus; // 'not_sent' | 'waiting_reply' | 'seen' | 'replied' | 'completed'
  status?: string;
  isSeen?: boolean; // Seen toggle (retains cadence timers)
  initialSentDate?: string; // YYYY-MM-DD
  dispatchDate?: string;
  dispatchedAt?: string;
  lastContactDate?: string;
  dmSent?: boolean;
  dmSentAt?: string;
  followup1Date?: string; // initialSentDate + 4 days (shifted off Sunday/Frozen)
  followup2Date?: string; // initialSentDate + 8 days (shifted off Sunday/Frozen)
  followup3Date?: string; // initialSentDate + 14 days (shifted off Sunday/Frozen)
  followup1SentDate?: string;
  followup2SentDate?: string;
  followup3SentDate?: string;
  followupCount?: number; // 0 = initial, 1 = Day 4 sent, 2 = Day 8 sent, 3 = Day 14 sent
  repliedAt?: string;
  dismissedDate?: string; // YYYY-MM-DD: date when lead was removed/dismissed from daily queue

  // Warm-Up & Video Workflow
  warmupStatus?: 'locked' | 'warmed';
  isWarmedUp?: boolean;
  warmedUpAt?: string;
  videoRecorded?: boolean;
  videoRecordedAt?: string;
  videoVerifiedAt?: string;
  reelPosted?: boolean;
  reelPostedAt?: string;
  storyPosted?: boolean;
  storyPostedAt?: string;
  repliedSendIt?: boolean;
  repliedSendItAt?: string;
  liveLinkSent?: boolean;
  liveLinkSentAt?: string;

  // Quick Note
  quickNote?: string;
  quickNoteSavedAt?: string;

  // Sub-page E: Mockup
  hasMockup?: boolean;
  mockupFileName?: string;
  mockupUploadedAt?: string;
  mockupLink?: string;
  mockupHtml?: string;
  mockupHtmlName?: string;
  mockupHtmlUploadedAt?: string;
  mockupGeneratedAt?: string;

  // Routing / Restrictions
  fb_message_restricted?: boolean;

  // Backstage Archive & Lifecycle
  isArchived?: boolean;
  lifecycle?: 'active' | 'archived';
  archivedAt?: string;
  archivedFromChannel?: 'combined' | 'instagram';
  archiveUid?: string;
  cadenceStatus?: 'running' | 'completed' | 'cancelled';
  cancelledReason?: string;
  cancelledAt?: string;
  possibleDuplicateOf?: string;
  restoredAt?: string;
  restoredNote?: string;
}



