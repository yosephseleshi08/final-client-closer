import { Lead } from '../types';

export interface StagedMessageSequence {
  stagedDmMiniPitch: string;
  stagedFollowup1: string;
  stagedFollowup2: string;
  stagedFollowup3: string;
}

/**
 * Generates personalized, high-converting pre-staged copy for a lead
 */
export function getDefaultStagedMessages(lead: Partial<Lead>): StagedMessageSequence {
  const name = lead.contactName && lead.contactName !== 'Owner' && lead.contactName !== 'Decision Maker'
    ? lead.contactName
    : (lead.restaurantName || 'there');
  const businessName = lead.restaurantName || 'your restaurant';
  const mockup = lead.mockupLink || `https://demo.closer.app/${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  return {
    stagedDmMiniPitch:
      lead.pitchHook ||
      `Hey ${name}! Loved the vibe at ${businessName}. Built a 0.3s direct ordering concept for you: ${mockup}. We normally charge $299 + $99/mo, but waiving the $299 fee to $0 for 3 local spots in exchange for a short review. Want me to turn it live?`,

    stagedFollowup1:
      `Hey ${name}! Just making sure this didn't get buried under weekend prep: did you get a chance to open that direct ordering mockup for ${businessName}? ${mockup} — zero strings attached, let me know your thoughts!`,

    stagedFollowup2:
      `Hey ${name}! Recorded a quick 45-second screen walkthrough showing how ${businessName} can keep 100% of takeout revenue instead of paying 15-30% delivery app fees. Mind if I drop the 45s video link here?`,

    stagedFollowup3:
      `Hey ${name}, figured you're either completely slammed or all set for ${businessName}. I'll close out this file so I don't bug you! If you ever want to launch the 0.3s direct booking engine, your preview link is saved here: ${mockup}. Wishing you great dinner rushes!`,
  };
}

/**
 * Returns the active pre-stored message for a lead depending on stage/touchpoint count
 */
export function getActiveMessageForTouchpoint(
  lead: Lead,
  mode: 'dm' | 'followup'
): { text: string; isStoredCustom: boolean; touchpointLabel: string } {
  const defaults = getDefaultStagedMessages(lead);

  if (mode === 'dm') {
    const hasCustom = !!lead.stagedDmMiniPitch;
    return {
      text: lead.stagedDmMiniPitch || defaults.stagedDmMiniPitch,
      isStoredCustom: hasCustom,
      touchpointLabel: 'Initial DM Pitch',
    };
  }

  // Follow-up mode: check touchpoint count
  const count = lead.followupCount || 0;
  if (count <= 0) {
    const hasCustom = !!lead.stagedFollowup1;
    return {
      text: lead.stagedFollowup1 || defaults.stagedFollowup1,
      isStoredCustom: hasCustom,
      touchpointLabel: 'Follow-Up #1 (Day +3)',
    };
  } else if (count === 1) {
    const hasCustom = !!lead.stagedFollowup2;
    return {
      text: lead.stagedFollowup2 || defaults.stagedFollowup2,
      isStoredCustom: hasCustom,
      touchpointLabel: 'Follow-Up #2 (Day +7)',
    };
  } else {
    const hasCustom = !!lead.stagedFollowup3;
    return {
      text: lead.stagedFollowup3 || defaults.stagedFollowup3,
      isStoredCustom: hasCustom,
      touchpointLabel: `Follow-Up #${count + 1} (Breakup / Scarcity)`,
    };
  }
}
