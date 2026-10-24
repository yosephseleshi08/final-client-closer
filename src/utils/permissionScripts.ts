import { Lead } from '../types';

export interface PermissionPitchOption {
  id: string;
  title: string;
  tagline: string;
  template: (lead: Partial<Lead>) => string;
}

export const PERMISSION_PITCH_TEMPLATES: PermissionPitchOption[] = [
  {
    id: 'casual_teaser',
    title: 'Visual Curiosity Teaser',
    tagline: 'Casual & friendly — highest reply rate on Instagram & WhatsApp',
    template: (lead) => {
      const name = lead.contactName || lead.restaurantName || 'there';
      const biz = lead.restaurantName || 'your restaurant';
      return `Hey ${name}! Just put together a clean mobile concept redesign for ${biz} (attaching a quick snapshot above). Mind if I send over the interactive demo link to check out? No pitch or catch at all!`;
    },
  },
  {
    id: 'mobile_covers',
    title: 'Mobile Covers & Booking Fix',
    tagline: 'Focuses on mobile guest friction and easy reservations',
    template: (lead) => {
      const name = lead.contactName || lead.restaurantName || 'there';
      const biz = lead.restaurantName || 'your place';
      return `Hey ${name}! Noticed ${biz}'s current site was a bit clunky on mobile dinner reservations, so I designed a lightning-fast 1-tap booking mockup for you (attached screenshot). Would love to send the live link if you want to take a 30-sec look?`;
    },
  },
  {
    id: 'before_after_proof',
    title: 'Before / After Upgrade',
    tagline: 'Direct visual comparison showing modern styling',
    template: (lead) => {
      const name = lead.contactName || lead.restaurantName || 'there';
      const biz = lead.restaurantName || 'your brand';
      return `Hey ${name}! Re-imagined ${biz} with a modern food photography layout and clean menu hierarchy (screenshot attached). Mind if I shoot over the live preview link so you can tap through it?`;
    },
  },
  {
    id: 'fixed_price_clarity',
    title: 'The $299 Fast Launch Angle',
    tagline: 'Direct, transparent and risk-free for local owners',
    template: (lead) => {
      const name = lead.contactName || lead.restaurantName || 'there';
      const biz = lead.restaurantName || 'your business';
      return `Hey ${name}! Built out a modernized mobile experience for ${biz} (see screenshot). I do these turnkey for $299 all-inclusive. Mind if I share the interactive demo link so you can test drive it?`;
    },
  },
];

export function getPermissionPitchText(lead: Partial<Lead>, optionId = 'casual_teaser'): string {
  const selected =
    PERMISSION_PITCH_TEMPLATES.find((t) => t.id === optionId) || PERMISSION_PITCH_TEMPLATES[0];
  return selected.template(lead);
}
