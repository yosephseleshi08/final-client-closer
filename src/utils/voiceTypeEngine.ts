import { ChannelLead, MultiChannelType, VoiceType } from '../types';

export const IG_VOICE_TYPES: VoiceType[] = ['IG-1', 'IG-2', 'IG-3', 'IG-4', 'IG-5', 'IG-6'];
export const EMAIL_VOICE_TYPES: VoiceType[] = ['Email-1', 'Email-2', 'Email-3', 'Email-4'];
export const ALL_VOICE_TYPES: VoiceType[] = [...IG_VOICE_TYPES, ...EMAIL_VOICE_TYPES];

/**
 * Returns allowed voice types for a given workspace channel.
 */
export function getWorkspaceVoiceTypes(channel: MultiChannelType): VoiceType[] {
  if (channel === 'instagram') {
    return IG_VOICE_TYPES;
  }
  return EMAIL_VOICE_TYPES;
}

/**
 * Returns user-facing label for a voice type in the current workspace.
 * For Instagram: IG-1 -> "Type 1", IG-2 -> "Type 2", etc.
 * For Combined: Email-1 -> "Email-1", etc.
 */
export function getVoiceTypeDisplayLabel(
  voiceType: VoiceType | 'all' | null | undefined,
  channel: MultiChannelType
): string {
  if (!voiceType || voiceType === 'all') return 'All Types';
  if (channel === 'instagram') {
    switch (voiceType) {
      case 'IG-1': return 'Type 1';
      case 'IG-2': return 'Type 2';
      case 'IG-3': return 'Type 3';
      case 'IG-4': return 'Type 4';
      case 'IG-5': return 'Type 5';
      case 'IG-6': return 'Type 6';
      default: return voiceType;
    }
  }
  return voiceType;
}

export interface WorkspaceFilterOption {
  value: VoiceType | 'all';
  label: string;
}

/**
 * Returns the exact filter dropdown options for the given workspace.
 * Instagram: All Types, Type 1 through Type 6.
 * Combined: All Types, Email-1 through Email-4.
 */
export function getWorkspaceFilterOptions(channel: MultiChannelType): WorkspaceFilterOption[] {
  if (channel === 'instagram') {
    return [
      { value: 'all', label: 'All Types' },
      { value: 'IG-1', label: 'Type 1' },
      { value: 'IG-2', label: 'Type 2' },
      { value: 'IG-3', label: 'Type 3' },
      { value: 'IG-4', label: 'Type 4' },
      { value: 'IG-5', label: 'Type 5' },
      { value: 'IG-6', label: 'Type 6' },
    ];
  }
  return [
    { value: 'all', label: 'All Types' },
    { value: 'Email-1', label: 'Email-1' },
    { value: 'Email-2', label: 'Email-2' },
    { value: 'Email-3', label: 'Email-3' },
    { value: 'Email-4', label: 'Email-4' },
  ];
}

/**
 * Returns round-robin voice type for a specific sequential index and channel.
 */
export function getRoundRobinVoiceType(index: number, channel: MultiChannelType): VoiceType {
  if (channel === 'instagram') {
    return IG_VOICE_TYPES[index % IG_VOICE_TYPES.length];
  }
  return EMAIL_VOICE_TYPES[index % EMAIL_VOICE_TYPES.length];
}

/**
 * Ensures all leads have an assigned voiceType via round-robin distribution.
 * If forceReassign is true, recalculates voiceType for all leads in order.
 * If forceReassign is false, only assigns leads that currently lack a voiceType.
 */
export function ensureVoiceTypeAssignments(
  leads: ChannelLead[],
  channel: MultiChannelType,
  forceReassign = false
): { updatedLeads: ChannelLead[]; hasChanges: boolean } {
  let hasChanges = false;
  let igCounter = 0;
  let emailCounter = 0;

  const pool = channel === 'instagram' ? IG_VOICE_TYPES : EMAIL_VOICE_TYPES;

  const updatedLeads = leads.map((lead, idx) => {
    if (!forceReassign && lead.voiceType) {
      return lead;
    }

    const assignedType =
      channel === 'instagram'
        ? IG_VOICE_TYPES[igCounter++ % IG_VOICE_TYPES.length]
        : EMAIL_VOICE_TYPES[emailCounter++ % EMAIL_VOICE_TYPES.length];

    if (lead.voiceType !== assignedType) {
      hasChanges = true;
    }

    return {
      ...lead,
      voiceType: assignedType,
    };
  });

  return { updatedLeads, hasChanges };
}

export interface VoiceTypeBadgeStyle {
  badgeClass: string;
  pillClass: string;
  activeFilterClass: string;
  dotColor: string;
  label: string;
}

/**
 * Returns visual color tokens and badge classes for any VoiceType.
 */
export function getVoiceTypeBadgeStyle(voiceType?: VoiceType | null): VoiceTypeBadgeStyle {
  switch (voiceType) {
    case 'IG-1':
      return {
        label: 'IG-1',
        badgeClass: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
        pillClass: 'bg-pink-500/20 text-pink-200 border-pink-500/40 hover:bg-pink-500/30',
        activeFilterClass: 'bg-pink-500 text-slate-950 font-black shadow-lg shadow-pink-500/30 border-pink-400',
        dotColor: 'bg-pink-400',
      };
    case 'IG-2':
      return {
        label: 'IG-2',
        badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        pillClass: 'bg-purple-500/20 text-purple-200 border-purple-500/40 hover:bg-purple-500/30',
        activeFilterClass: 'bg-purple-500 text-white font-black shadow-lg shadow-purple-500/30 border-purple-400',
        dotColor: 'bg-purple-400',
      };
    case 'IG-3':
      return {
        label: 'IG-3',
        badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
        pillClass: 'bg-violet-500/20 text-violet-200 border-violet-500/40 hover:bg-violet-500/30',
        activeFilterClass: 'bg-violet-500 text-white font-black shadow-lg shadow-violet-500/30 border-violet-400',
        dotColor: 'bg-violet-400',
      };
    case 'IG-4':
      return {
        label: 'IG-4',
        badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        pillClass: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40 hover:bg-indigo-500/30',
        activeFilterClass: 'bg-indigo-500 text-white font-black shadow-lg shadow-indigo-500/30 border-indigo-400',
        dotColor: 'bg-indigo-400',
      };
    case 'IG-5':
      return {
        label: 'IG-5',
        badgeClass: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
        pillClass: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40 hover:bg-fuchsia-500/30',
        activeFilterClass: 'bg-fuchsia-500 text-white font-black shadow-lg shadow-fuchsia-500/30 border-fuchsia-400',
        dotColor: 'bg-fuchsia-400',
      };
    case 'IG-6':
      return {
        label: 'IG-6',
        badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        pillClass: 'bg-rose-500/20 text-rose-200 border-rose-500/40 hover:bg-rose-500/30',
        activeFilterClass: 'bg-rose-500 text-white font-black shadow-lg shadow-rose-500/30 border-rose-400',
        dotColor: 'bg-rose-400',
      };
    case 'Email-1':
      return {
        label: 'Email-1',
        badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        pillClass: 'bg-blue-500/20 text-blue-200 border-blue-500/40 hover:bg-blue-500/30',
        activeFilterClass: 'bg-blue-500 text-white font-black shadow-lg shadow-blue-500/30 border-blue-400',
        dotColor: 'bg-blue-400',
      };
    case 'Email-2':
      return {
        label: 'Email-2',
        badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        pillClass: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 hover:bg-cyan-500/30',
        activeFilterClass: 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/30 border-cyan-400',
        dotColor: 'bg-cyan-400',
      };
    case 'Email-3':
      return {
        label: 'Email-3',
        badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
        pillClass: 'bg-teal-500/20 text-teal-200 border-teal-500/40 hover:bg-teal-500/30',
        activeFilterClass: 'bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/30 border-teal-400',
        dotColor: 'bg-teal-400',
      };
    case 'Email-4':
      return {
        label: 'Email-4',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        pillClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30',
        activeFilterClass: 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30 border-emerald-400',
        dotColor: 'bg-emerald-400',
      };
    default:
      return {
        label: 'Unassigned',
        badgeClass: 'bg-slate-800/80 text-slate-400 border-white/10',
        pillClass: 'bg-slate-800 text-slate-400 border-white/10 hover:bg-slate-700',
        activeFilterClass: 'bg-slate-700 text-white font-bold border-white/20',
        dotColor: 'bg-slate-500',
      };
  }
}

/**
 * Formats a clean, high-converting DeepSeek batch prompt with voice instructions
 * and numbered prospect lead analyses.
 */
export function formatDeepSeekBatchPrompt(
  leads: ChannelLead[],
  activeVoiceFilter: VoiceType | 'all',
  channel: MultiChannelType
): string {
  const targetTypeLabel: string = !activeVoiceFilter || activeVoiceFilter === 'all' ? 'Multi-Voice Batch' : activeVoiceFilter;
  const channelLabel = channel === 'instagram' ? 'Instagram DMs' : 'Email & Dual-Channel Outreach';

  const header = [
    `# DEEPSEEK BATCH OUTREACH PROMPT: ${targetTypeLabel.toUpperCase()}`,
    `Channel: ${channelLabel}`,
    `Batch Size: ${leads.length} Prospects`,
    `Voice Persona: ${targetTypeLabel}`,
    '',
    '## INSTRUCTIONS FOR DEEPSEEK:',
    `You are an elite B2B sales copywriter writing personalized outreach in the "${targetTypeLabel}" persona.`,
    'Write a concise, high-converting 4-step sequence for each prospect based on their specific Lead Analysis breakdown below:',
    '- Step 1: Initial Pitch (<280 characters for IG, punchy & conversational, value-first).',
    '- Step 2: Day 4 Follow-Up (Value Check-In: kitchen ticket PDF / quick win tip).',
    '- Step 3: Day 8 Follow-Up (Social proof / 12% takeout surge case study).',
    '- Step 4: Day 14 Final Breakup (60-second Loom audit offer or archive file notice).',
    '',
    'STRICT RULES:',
    '1. Do not use generic filler ("Hope this email finds you well", "I stumbled across your profile").',
    '2. Directly mention specific hooks, menu items, or website flaws from each prospect\'s analysis.',
    '3. Output each prospect clearly numbered with separate fields for Step 1, Step 2, Step 3, and Step 4.',
    '',
    '=================================================================',
    '## PROSPECTS TO GENERATE MESSAGES FOR:',
    '=================================================================',
    '',
  ].join('\n');

  const prospectsBlock = leads
    .map((lead, idx) => {
      const link = lead.link || lead.instagram || lead.email || 'N/A';
      const city = lead.city || 'Local area';
      const voice = lead.voiceType || targetTypeLabel;

      // Extract existing analysis or fallback details
      const analysisContent =
        lead.leadAnalysis?.trim() ||
        lead.prompt?.trim() ||
        lead.customPitch?.trim() ||
        (lead.rawDetails ? JSON.stringify(lead.rawDetails, null, 2) : 'No lead analysis text currently recorded.');

      return [
        `### PROSPECT ${idx + 1}: ${lead.name}`,
        `- Lead ID: ${lead.id}`,
        `- Assigned Voice: ${voice}`,
        `- Channel Link: ${link}`,
        `- City / Market: ${city}`,
        `- Lead Analysis & Business Breakdown:`,
        analysisContent,
        '',
        '---',
        '',
      ].join('\n');
    })
    .join('\n');

  const footer = [
    '',
    '=================================================================',
    '## OUTPUT FORMAT REQUIRED FROM DEEPSEEK:',
    'For each Prospect (1 to ' + leads.length + '), return:',
    'Prospect [Number]: [Name]',
    '- Initial DM (Day 0): [Pitch < 280 chars]',
    '- Day 4 Follow-Up: [Value Check-In < 60 words]',
    '- Day 8 Follow-Up: [Social Proof < 60 words]',
    '- Day 14 Breakup: [Final Loom Nudge < 60 words]',
    '=================================================================',
  ].join('\n');

  return header + prospectsBlock + footer;
}
