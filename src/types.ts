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
  // 3-Step DM Sequence
  initialDM?: string;
  followup3DM?: string;
  followup7DM?: string;
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
export type MultiChannelType = 'email' | 'instagram' | 'facebook';

export type GlobalNavTab = 'email' | 'instagram' | 'facebook' | 'today' | 'dashboard' | 'insights';

export type MultiChannelSubTab = 'leads' | 'dm' | 'schedule' | 'followup' | 'mockup';

export type CadenceLeadStatus = 'not_sent' | 'waiting_reply' | 'seen' | 'replied' | 'completed';

export interface ChannelLead {
  id: string; // e.g. "IG-1", "EM-1", "FB-1"
  numericId: number; // integer for next ID calculation
  name: string; // Business or contact name
  link: string; // URL / social handle / website
  channel: MultiChannelType;
  sortOrder: number; // rank for drag-and-drop ordering
  createdAt: string;

  // Sub-page B: DM Pitch & 3-Step Sequence
  customPitch?: string;
  initialDM?: string;
  followup3DM?: string;
  followup7DM?: string;
  pitchSavedAt?: string;

  // Sub-page C: Schedule Date
  scheduledDate?: string; // YYYY-MM-DD format (planned initial outreach date)

  // Sub-page D: Follow-up & Cadence Status
  isCompleted?: boolean;
  completedAt?: string;
  leadStatus?: CadenceLeadStatus; // 'not_sent' | 'waiting_reply' | 'seen' | 'replied' | 'completed'
  isSeen?: boolean; // 👀 Seen toggle (retains cadence timers)
  initialSentDate?: string; // YYYY-MM-DD
  followup1Date?: string; // exactly initialSentDate + 3 days
  followup2Date?: string; // exactly initialSentDate + 7 days
  followup1SentDate?: string;
  followup2SentDate?: string;
  followupCount?: number; // 0 = initial, 1 = Day 3 sent, 2 = Day 7 sent
  repliedAt?: string;
  dismissedDate?: string; // YYYY-MM-DD: date when lead was removed/dismissed from daily queue

  // Sub-page E: Mockup
  hasMockup?: boolean;
  mockupFileName?: string;
  mockupUploadedAt?: string;
}


