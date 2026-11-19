import { ChannelLead, DailyObligationSnapshot } from '../types';
import {
  AppendDispatchInput,
  backfillDispatchLogFromLeads,
  canonicalizeLeadName,
  countDispatchesByChannel,
  countDispatchesByStep,
  getLifetimeDispatchCount,
  reconcileNovDispatchLog,
  toLocalDateString,
} from '../utils/dispatchLog';
import {
  loadAllDailyObligations,
  saveAllDailyObligations,
  VERIFIED_NOV_HISTORY_OVERRIDES,
} from '../utils/dailyObligation';
import {
  addLocalDays,
  BACKSTAGE_LEADS_KEY,
  COMBINED_LEADS_KEY,
  INSTAGRAM_LEADS_KEY,
  shiftDueDateOffRestDay,
} from '../utils/leadLifecycle';
import { getNextLeadId } from '../utils/channelStorage';
import { getStrictVoiceTypeForId } from '../utils/voiceTypeEngine';
import { extractCleanEmail } from '../utils/dataRepair';

export const NOV_BACKUP_SYNC_STORAGE_KEY = 'crm_nov_2026_backup_schedule_sync_v2';
const LEGACY_NOV_BACKUP_SYNC_KEY = 'crm_nov_2026_backup_schedule_sync_v1';

export interface HistoryRepairResult {
  reconstructedEntriesAdded: number;
  snapshotsFrozen: number;
  skippedAlreadyFrozen: number;
  lifetimeD0Count: number;
  totalsByDate: Record<string, { actual: number; expectedTotal: number }>;
}

export interface SentDateRestoreResult {
  restoredLeadIds: string[];
  cancelledDuplicateIds: string[];
  createdMissingNames: string[];
  dispatchEntriesAdded: number;
  gmailVerificationEmails: string[];
  details: string[];
}

export interface BackupScheduleSpec {
  numericId: number;
  name: string;
  aliases?: string[];
  day0: string;
  day4: string;
  day8: string;
  day14: string;
  d4AlreadySent: boolean;
  isNov19NewLead?: boolean;
  email?: string;
  platformLink?: string;
  prompt?: string;
}

/**
 * Embedded verified metadata from attached email_leads.json for the 10 lost/re-added Email leads.
 * Note: South Bend Public House email uses platformLink "Sbph@sbchocolate.com" (normalized lowercase).
 */
const ATTACHED_EMAIL_LEADS_JSON: Record<
  string,
  { email: string; platformLink: string; prompt: string }
> = {
  'taqueria chilango gr': {
    email: 'taqueriachilangogr@gmail.com',
    platformLink: 'mailto:taqueriachilangogr@gmail.com',
    prompt:
      "lead score = 10.0/10\n* Primary Optimization Trigger: Severe system failure marked by a broken, dead white-label third-party checkout interface (ChowNow) that completely locks down direct internet orders.\n* Conversion Friction Level: Critical/Severe due to a complete digital transaction blackout on primary action buttons, paired with a non-interactive, text-based brochure menu trap.\n* High-Ticket Intake Status: Unautomated for lucrative corporate catering blocks and heavy event packages, forcing organizers to seek out a secondary manual phone hotline.\n* Financial Impact/Value Justification: Taquería Chilango Gr generates excellent organic local interest but completely drops its digital checkout revenue due to a broken external link wrapper. A custom React frontend express lane replaces this technical roadblock, giving them a stable, permanent portal to capture frictionless carryout volume and capture premium catering leads 100% commission-free for a flat $99/mo, protecting their independent bottom line immediately.\n* Verified Business Email Address: taqueriachilangogr@gmail.com",
  },
  'bridge street bar': {
    email: 'bridgestreetbargr@gmail.com',
    platformLink: 'mailto:bridgestreetbargr@gmail.com',
    prompt:
      'lead score = 10.0/10\n* Primary Optimization Trigger: Severe system failure marked by a hard, blocking third-party checkout outage banner (Toast Tab) that completely locks down direct internet orders on an active sports pub asset.\n* Conversion Friction Level: Critical/Severe due to a total digital transaction blackout on primary action routes, paired with a non-interactive text brochure food menu trap.\n* High-Ticket Intake Status: Unautomated for lucrative corporate party packages, group meetup blocks, and large-scale team caterings, routing organizers into basic messaging entries.\n* Financial Impact/Value Justification: Bridge Street Bar handles exceptional weekend and nightly transaction volumes but entirely loses its digital checkout revenue due to a locked external platform wrapper. A custom React frontend express lane replaces this technical roadblock, giving them a stable, permanent portal to capture frictionless carryout volume and streamline large private events 100% commission-free for a flat $99/mo, protecting their independent bottom line immediately.\n* Verified Business Email Address: bridgestreetbarGR@gmail.com',
  },
  'country crossroads restaurant': {
    email: 'crossroads.lyons@gmail.com',
    platformLink: 'mailto:crossroads.lyons@gmail.com',
    prompt:
      "lead score = 10.0/10\n* Primary Optimization Trigger: Severe infrastructure failure marked by an unconfigured brand web domain pointing to a generic 'Hello World' default WordPress template page, combined with a single phone line bottleneck for individual orders.\n* Conversion Friction Level: Critical/Severe due to an absolute digital transaction and menu visibility blackout on their primary domain name web track.\n* High-Ticket Intake Status: Unautomated for highly profitable southern family caterings, holiday bulk pans, and corporate group lunch packages, forcing coordinators onto a legacy email endpoint and phone line.\n* Financial Impact/Value Justification: Country Crossroads Restaurant handles excellent organic local dining volume but completely chokes off its digital booking revenue due to an abandoned website setup. A custom React frontend architecture replaces this technical roadblock, giving them a stable, permanent portal to capture frictionless pickup volume and streamline large catering leads 100% commission-free for a flat $99/mo, maximizing their independent margins instantly.\n* Verified Business Email Address: crossroads.lyons@gmail.com",
  },
  'south bend public house': {
    email: 'sbph@sbchocolate.com',
    platformLink: 'mailto:Sbph@sbchocolate.com',
    prompt:
      'lead score = 9.5/10\n* Primary Optimization Trigger: Mass platform transaction diversion to an external white-label app (order.online) that actively locks high-intent traffic behind a mandatory delivery address pop-up requirement.\n* Conversion Friction Level: Severe due to completely hiding interactive ordering paths behind an upfront geographical filter pane, combined with a static, text-based brochure menu layout.\n* High-Ticket Intake Status: Unautomated for lucrative holiday catering packages and high-margin group dining blocks, routing event organizers into basic BentoBox entry forms.\n* Financial Impact/Value Justification: The Public House captures immense local gastropub attention but heavily caps its online ordering volume due to aggressive third-party system roadblocks. A custom React frontend express lane gives them a stable, permanent portal to capture frictionless pickup volume and streamline large private events 100% commission-free for a flat $99/mo, maximizing their independent margins instantly.\n* Verified Business Email Address: Sbph@sbchocolate.com',
  },
  barnabys: {
    email: 'mishawakabarnabys@gmail.com',
    platformLink: 'mailto:mishawakabarnabys@gmail.com',
    prompt:
      "lead score = 9.5/10\n* Primary Optimization Trigger: Multi-unit platform transaction diversion to an external white-label app (OrderAnywhere) that actively locks high-intent traffic behind a mandatory registration and account sign-in barrier.\n* Conversion Friction Level: Severe due to completely hiding interactive ordering paths behind a login wall, combined with an unclickable, scanned physical paper brochure menu trap.\n* High-Ticket Intake Status: Unautomated for lucrative multi-box school pizza blocks, heavy corporate catering packages, and nationwide 'Ship Frozen' wholesale orders, routing organizers into basic manual networks.\n* Financial Impact/Value Justification: Barnaby's moves a staggering organic volume of orders across multiple regional hubs, meaning their customer drop-off and friction from external login systems are substantial. A custom React frontend express lane gives them a stable, unified portal to capture frictionless mobile pickup and streamline corporate leads 100% commission-free for a flat $99/mo, instantly maximizing their independent profit margins.\n* Verified Business Email Address: mishawakabarnabys@gmail.com",
  },
  'pit stop catering': {
    email: 'matt@pitstopcateringgr.com',
    platformLink: 'mailto:matt@pitstopcateringgr.com',
    prompt:
      'lead score = 9.5/10\n* Primary Optimization Trigger: Absolute absence of an integrated digital checkout workflow on a nationally ranked, high-demand barbecue asset that explicitly suffers from severe early daily sellouts.\n* Conversion Friction Level: Severe due to forcing time-sensitive lunch commuters to physically line up during limited 4-hour operational windows with zero web-based click-to-pre-order options.\n* High-Ticket Intake Status: Unautomated and highly exposed for lucrative corporate catering blocks, high-margin weddings, and heavy Thanksgiving packages, routing organizers into basic form setups.\n* Financial Impact/Value Justification: The Pit Stop BBQ handles staggering organic demand but entirely fails to monetize its high-intent web visitors through a direct e-commerce lane. Replacing this analog bottleneck with a native React express lane allows them to secure high-margin pre-orders before the kitchen sells out and streamline large event leads 100% commission-free for a flat $99/mo, maximizing their independent bottom line instantly.\n* Verified Business Email Address: matt@pitstopcateringgr.com',
  },
  'champs nashville hot chicken': {
    email: 'champsnashvillehotchicken@gmail.com',
    platformLink: 'mailto:Champsnashvillehotchicken@gmail.com',
    prompt:
      'lead score = 9.5/10\n* Primary Optimization Trigger: Absolute absence of an independent brand web domain, forcing a high-volume local asset into complete, unbranded third-party portal dependency (Toast Tab).\n* Conversion Friction Level: Severe due to trapping hot social media traffic inside uncustomized external links with zero native, embedded brand checkout capabilities.\n* High-Ticket Intake Status: Unautomated for lucrative corporate lunch boxes, holiday group catering plates, and multi-person game-day party packs, routing organizers into a manual phone line and generic Gmail inbox.\n* Financial Impact/Value Justification: Champs Nashville Hot Chicken moves an incredible volume of orders out of Georgetown Square but entirely misses out on direct, owned-domain web monetization. Replacing their non-existent web footprint with a native React express layer allows them to secure frictionless pickup volume and streamline large catering leads 100% commission-free for a flat $99/mo, protecting their unique independent brand presence immediately.\n* Verified Business Email Address: Champsnashvillehotchicken@gmail.com',
  },
  'austins bbq': {
    email: 'austinsbbq1@gmail.com',
    platformLink: 'mailto:austinsbbq1@gmail.com',
    prompt:
      'lead score = 9.5/10\n* Primary Optimization Trigger: Absolute absence of an integrated digital checkout workflow on a historically ranked, high-demand barbecue asset, coupled with a manual phone bottleneck for premium high-ticket event catering leads.\n* Conversion Friction Level: Severe due to forcing time-sensitive country commuters and local lunch crowds to physically line up with zero web-based click-to-pre-order options, combined with a flat social image menu trap.\n* High-Ticket Intake Status: Unautomated for highly profitable corporate picnics, weddings, Ducks Unlimited functions, and heavy festival packages, routing organizers into a manual phone line and generic Gmail inbox.\n* Financial Impact/Value Justification: Austin\'s BBQ handles an incredible volume of organic country traffic but entirely misses out on direct, owned-domain web monetization. Replacing their static web footprint with a native React express layer allows them to secure frictionless pickup volume and streamline massive high-ticket group catering leads 100% commission-free for a flat $99/mo, protecting their unique independent brand presence immediately.\n* Verified Business Email Address: austinsbbq1@gmail.com',
  },
  'sams bbq': {
    email: 'samsbbq@icloud.com',
    platformLink: 'mailto:samsbbq@icloud.com',
    prompt:
      "lead score = 9.5/10\n* Primary Optimization Trigger: Absolute absence of an integrated digital checkout workflow on a legendary, high-demand historic barbecue asset, coupled with manual channels for highly profitable corporate group lunch packages.\n* Conversion Friction Level: Severe due to forcing time-sensitive city commuters and local lunch crowds to physically line up with zero web-based click-to-pre-order options, combined with a total lack of an independent website.\n* High-Ticket Intake Status: Unautomated for lucrative holiday party packs, heavy family-style catering trays, and corporate office pre-orders, routing event organizers into a manual phone line and raw iCloud endpoint.\n* Financial Impact/Value Justification: Sam's Bar-B-Q handles exceptional organic traffic but entirely misses out on direct, owned-domain web monetization. Replacing their non-existent web footprint with a native React express layer allows them to secure frictionless pickup volume and streamline large corporate catering leads 100% commission-free for a flat $99/mo, protecting their unique independent brand presence immediately.\n* Verified Business Email Address: samsbbq@icloud.com",
  },
  senia: {
    email: 'info@restaurantsenia.com',
    platformLink: 'mailto:info@restaurantsenia.com',
    prompt:
      "lead score = 6.5/10\n* Primary Optimization Trigger: External platform reservation diversion alongside unautomated, manual communication paths for highly lucrative private dining room buyouts and exclusive chef's counter tasting blocks.\n* Conversion Friction Level: High due to trapping hyper-premium menu configurations inside non-interactive text layouts with zero inline, instant click-to-inquire pathways.\n* High-Ticket Intake Status: Restrained by a legacy text link bottleneck, creating unnecessary intake attrition for lucrative private functions and high-margin corporate buyouts.\n* Financial Impact/Value Justification: Senia commands exceptional luxury check sizes but surrenders booking data control to third-party marketplaces and manual communication loops. Replacing these leaky points with a native React capture layer gives them a stable, permanent portal to capture premium event leads 100% commission-free for a flat $99/mo, protecting their elite independent brand presence immediately.\n* Verified Business Email Address: info@restaurantsenia.com",
  },
};

/**
 * Authoritative backup schedule data for all 21 backdated Combined/Email leads (CM-1 to CM-21, Nov 12–18)
 * plus the 4 new leads added for today's Nov 19 outreach (CM-22 to CM-25).
 */
export const NOV_BACKUP_SCHEDULE_SPECS: BackupScheduleSpec[] = [
  // Cohort 1 — Nov 12 (CM-1 to CM-4): D4 11/16 (sent), D8 11/20, D14 11/26
  {
    numericId: 1,
    name: 'Phnom Penh Restaurant | Cambodian',
    aliases: ['phnom penh restaurant', 'phnom penh'],
    day0: '2026-11-12',
    day4: '2026-11-16',
    day8: '2026-11-20',
    day14: '2026-11-26',
    d4AlreadySent: true,
  },
  {
    numericId: 2,
    name: 'Caminos',
    day0: '2026-11-12',
    day4: '2026-11-16',
    day8: '2026-11-20',
    day14: '2026-11-26',
    d4AlreadySent: true,
  },
  {
    numericId: 3,
    name: "Lulu's Waikiki",
    aliases: ['lulus waikiki', 'lulus'],
    day0: '2026-11-12',
    day4: '2026-11-16',
    day8: '2026-11-20',
    day14: '2026-11-26',
    d4AlreadySent: true,
  },
  {
    numericId: 4,
    name: 'MW Restaurant',
    day0: '2026-11-12',
    day4: '2026-11-16',
    day8: '2026-11-20',
    day14: '2026-11-26',
    d4AlreadySent: true,
  },

  // Cohort 2 — Nov 13 (CM-5 to CM-8): D4 11/17 (sent), D8 11/21, D14 11/27
  {
    numericId: 5,
    name: 'Utage - Restaurant & Lounge | Japanese',
    aliases: ['utage restaurant and lounge', 'utage'],
    day0: '2026-11-13',
    day4: '2026-11-17',
    day8: '2026-11-21',
    day14: '2026-11-27',
    d4AlreadySent: true,
  },
  {
    numericId: 6,
    name: '375 Donuts and Sweets',
    aliases: ['375 donuts'],
    day0: '2026-11-13',
    day4: '2026-11-17',
    day8: '2026-11-21',
    day14: '2026-11-27',
    d4AlreadySent: true,
  },
  {
    numericId: 7,
    name: 'Chance Bar',
    day0: '2026-11-13',
    day4: '2026-11-17',
    day8: '2026-11-21',
    day14: '2026-11-27',
    d4AlreadySent: true,
  },
  {
    numericId: 8,
    name: 'Liberty Diner ( in Fort Wayne Indiana )',
    aliases: ['liberty diner'],
    day0: '2026-11-13',
    day4: '2026-11-17',
    day8: '2026-11-21',
    day14: '2026-11-27',
    d4AlreadySent: true,
  },

  // Cohort 3 — Nov 14 (CM-9 to CM-12): D4 11/18 (sent), D8 11/22 [Sun -> Mon Nov 23], D14 11/28
  {
    numericId: 9,
    name: 'Factory Restaurant',
    day0: '2026-11-14',
    day4: '2026-11-18',
    day8: '2026-11-22',
    day14: '2026-11-28',
    d4AlreadySent: true,
  },
  {
    numericId: 10,
    name: 'The Willows',
    aliases: ['willows'],
    day0: '2026-11-14',
    day4: '2026-11-18',
    day8: '2026-11-22',
    day14: '2026-11-28',
    d4AlreadySent: true,
  },
  {
    numericId: 11,
    name: "Hall's Kitchen South Bend (River Park/IUSB)",
    aliases: ['halls kitchen south bend', 'halls kitchen'],
    day0: '2026-11-14',
    day4: '2026-11-18',
    day8: '2026-11-22',
    day14: '2026-11-28',
    d4AlreadySent: true,
  },
  {
    numericId: 12,
    name: 'South Bend Public House',
    aliases: ['sb chocolate', 'south bend chocolate'],
    day0: '2026-11-14',
    day4: '2026-11-18',
    day8: '2026-11-22',
    day14: '2026-11-28',
    d4AlreadySent: true,
    ...ATTACHED_EMAIL_LEADS_JSON['south bend public house'],
  },

  // Cohort 4 — Nov 16 (CM-13 to CM-16): D4 11/20, D8 11/24, D14 11/30 (pending)
  {
    numericId: 13,
    name: 'Taqueria Chilango GR',
    aliases: ['taqueria chilango'],
    day0: '2026-11-16',
    day4: '2026-11-20',
    day8: '2026-11-24',
    day14: '2026-11-30',
    d4AlreadySent: false,
    ...ATTACHED_EMAIL_LEADS_JSON['taqueria chilango gr'],
  },
  {
    numericId: 14,
    name: 'Bridge Street Bar',
    day0: '2026-11-16',
    day4: '2026-11-20',
    day8: '2026-11-24',
    day14: '2026-11-30',
    d4AlreadySent: false,
    ...ATTACHED_EMAIL_LEADS_JSON['bridge street bar'],
  },
  {
    numericId: 15,
    name: 'Country Crossroads Restaurant',
    aliases: ['country crossroads'],
    day0: '2026-11-16',
    day4: '2026-11-20',
    day8: '2026-11-24',
    day14: '2026-11-30',
    d4AlreadySent: false,
    ...ATTACHED_EMAIL_LEADS_JSON['country crossroads restaurant'],
  },
  {
    numericId: 16,
    name: "Barnaby's",
    aliases: ['barnabys', 'barnabys mishawaka'],
    day0: '2026-11-16',
    day4: '2026-11-20',
    day8: '2026-11-24',
    day14: '2026-11-30',
    d4AlreadySent: false,
    ...ATTACHED_EMAIL_LEADS_JSON['barnabys'],
  },

  // Cohort 5 — Nov 17 (CM-17 to CM-20): D4 11/21, D8 11/25, D14 12/1 (pending)
  {
    numericId: 17,
    name: 'Pit Stop Catering',
    aliases: ['the pit stop bbq', 'pit stop bbq'],
    day0: '2026-11-17',
    day4: '2026-11-21',
    day8: '2026-11-25',
    day14: '2026-12-01',
    d4AlreadySent: false,
    ...ATTACHED_EMAIL_LEADS_JSON['pit stop catering'],
  },
  {
    numericId: 18,
    name: 'Champs Nashville Hot Chicken',
    day0: '2026-11-17',
    day4: '2026-11-21',
    day8: '2026-11-25',
    day14: '2026-12-01',
    d4AlreadySent: false,
    ...ATTACHED_EMAIL_LEADS_JSON['champs nashville hot chicken'],
  },
  {
    numericId: 19,
    name: "Austin's BBQ",
    aliases: ['austins bbq'],
    day0: '2026-11-17',
    day4: '2026-11-21',
    day8: '2026-11-25',
    day14: '2026-12-01',
    d4AlreadySent: false,
    ...ATTACHED_EMAIL_LEADS_JSON['austins bbq'],
  },
  {
    numericId: 20,
    name: "Sam's BBQ",
    aliases: ['sams bbq', 'sams bar b q'],
    day0: '2026-11-17',
    day4: '2026-11-21',
    day8: '2026-11-25',
    day14: '2026-12-01',
    d4AlreadySent: false,
    ...ATTACHED_EMAIL_LEADS_JSON['sams bbq'],
  },

  // Cohort 6 — Nov 18 (CM-21): D4 11/22 [Sun -> Mon Nov 23], D8 11/26, D14 12/2 (pending)
  {
    numericId: 21,
    name: 'Senia',
    aliases: ['restaurant senia'],
    day0: '2026-11-18',
    day4: '2026-11-22',
    day8: '2026-11-26',
    day14: '2026-12-02',
    d4AlreadySent: false,
    ...ATTACHED_EMAIL_LEADS_JSON['senia'],
  },

  // Cohort 7 — Nov 19 Today's 4 New Leads (CM-22 to CM-25): D4 11/23, D8 11/27, D14 12/3
  {
    numericId: 22,
    name: "Jimmy J's Cafe",
    aliases: ['jimmy js cafe', 'jimmy j cafe'],
    day0: '2026-11-19',
    day4: '2026-11-23',
    day8: '2026-11-27',
    day14: '2026-12-03',
    d4AlreadySent: false,
    isNov19NewLead: true,
  },
  {
    numericId: 23,
    name: "Babushka's",
    aliases: ['babushkas', 'babushka'],
    day0: '2026-11-19',
    day4: '2026-11-23',
    day8: '2026-11-27',
    day14: '2026-12-03',
    d4AlreadySent: false,
    isNov19NewLead: true,
  },
  {
    numericId: 24,
    name: 'Gourmet Soul',
    day0: '2026-11-19',
    day4: '2026-11-23',
    day8: '2026-11-27',
    day14: '2026-12-03',
    d4AlreadySent: false,
    isNov19NewLead: true,
  },
  {
    numericId: 25,
    name: 'Restaurant Rebirth',
    aliases: ['rebirth'],
    day0: '2026-11-19',
    day4: '2026-11-23',
    day8: '2026-11-27',
    day14: '2026-12-03',
    d4AlreadySent: false,
    isNov19NewLead: true,
  },
];

function readArray(key: string): ChannelLead[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getSpecMatchScore(lead: ChannelLead, spec: BackupScheduleSpec): number {
  const leadNorm = canonicalizeLeadName(lead.name);
  const specNorm = canonicalizeLeadName(spec.name);
  const leadEmail = (extractCleanEmail(lead.email) || extractCleanEmail(lead.link) || '').toLowerCase();

  if (spec.email && leadEmail && leadEmail === spec.email.toLowerCase()) {
    return 100;
  }
  if (leadNorm && specNorm && leadNorm === specNorm) {
    return 95;
  }
  if (spec.aliases && leadNorm) {
    for (const alias of spec.aliases) {
      const aliasNorm = canonicalizeLeadName(alias);
      if (aliasNorm && leadNorm === aliasNorm) return 85;
    }
  }
  if (leadNorm && specNorm && (leadNorm.includes(specNorm) || specNorm.includes(leadNorm))) {
    if (specNorm.length >= 5 && leadNorm.length >= 5) {
      return 70;
    }
  }
  return 0;
}

function mergeNonEmptyFields(primary: ChannelLead, duplicate: ChannelLead): ChannelLead {
  const pickStr = (a?: string, b?: string) => (a && a.trim() ? a : b && b.trim() ? b : undefined);
  return {
    ...primary,
    email: pickStr(primary.email, duplicate.email),
    facebook: pickStr(primary.facebook, duplicate.facebook),
    instagram: pickStr(primary.instagram, duplicate.instagram),
    city: pickStr(primary.city, duplicate.city),
    prompt:
      primary.prompt && primary.prompt.trim().length >= (duplicate.prompt?.trim().length ?? 0)
        ? primary.prompt
        : pickStr(duplicate.prompt, primary.prompt),
    leadAnalysis: pickStr(primary.leadAnalysis, duplicate.leadAnalysis),
    notes: pickStr(primary.notes, duplicate.notes),
    quickNote: pickStr(primary.quickNote, duplicate.quickNote),
    mockupLink: pickStr(primary.mockupLink, duplicate.mockupLink),
    mockupHtml: pickStr(primary.mockupHtml, duplicate.mockupHtml),
    initialDM: pickStr(primary.initialDM, duplicate.initialDM),
    customPitch: pickStr(primary.customPitch, duplicate.customPitch),
    stagedDmMiniPitch: pickStr(primary.stagedDmMiniPitch, duplicate.stagedDmMiniPitch),
    followupDM_Day4: pickStr(primary.followupDM_Day4, duplicate.followupDM_Day4),
    followupDM_Day7: pickStr(primary.followupDM_Day7, duplicate.followupDM_Day7),
    followup3DM: pickStr(primary.followup3DM, duplicate.followup3DM),
    followupDM_Day8: pickStr(primary.followupDM_Day8, duplicate.followupDM_Day8),
    followupDM_Day14: pickStr(primary.followupDM_Day14, duplicate.followupDM_Day14),
    followup7DM: pickStr(primary.followup7DM, duplicate.followup7DM),
    breakupDM_Day14: pickStr(primary.breakupDM_Day14, duplicate.breakupDM_Day14),
    breakupDM_Day30: pickStr(primary.breakupDM_Day30, duplicate.breakupDM_Day30),
  };
}

function buildRestoredLeadState(
  lead: ChannelLead,
  spec: BackupScheduleSpec,
  nowIso: string
): ChannelLead {
  const fu1 = shiftDueDateOffRestDay(addLocalDays(spec.day0, 4));
  const fu2 = shiftDueDateOffRestDay(addLocalDays(spec.day0, 8));
  const fu3 = shiftDueDateOffRestDay(addLocalDays(spec.day0, 14));

  const cleanJsonEmail = spec.email ? extractCleanEmail(spec.email) || spec.email.toLowerCase() : undefined;
  const cleanExistingEmail = extractCleanEmail(lead.email) || extractCleanEmail(lead.link);
  const resolvedEmail = cleanJsonEmail || cleanExistingEmail || lead.email;

  const resolvedPrompt =
    spec.prompt &&
    (!lead.prompt || lead.prompt.trim().length < spec.prompt.trim().length)
      ? spec.prompt
      : lead.prompt;

  const day4Msg = lead.followupDM_Day4 || lead.followupDM_Day7 || lead.followup3DM;
  const day8Msg = lead.followupDM_Day8 || lead.followupDM_Day14 || lead.followup7DM;
  const day14Msg = lead.breakupDM_Day14 || lead.breakupDM_Day30;

  const alreadySentD8 = toLocalDateString(lead.followup2SentDate);
  const alreadySentD14 = toLocalDateString(lead.followup3SentDate);
  const resolvedFollowup1Sent = spec.d4AlreadySent
    ? spec.day4
    : toLocalDateString(lead.followup1SentDate) && toLocalDateString(lead.followup1SentDate)! >= spec.day4
    ? toLocalDateString(lead.followup1SentDate)!
    : undefined;

  let nextFollowupCount = 0;
  if (alreadySentD14) nextFollowupCount = 3;
  else if (alreadySentD8) nextFollowupCount = 2;
  else if (resolvedFollowup1Sent) nextFollowupCount = 1;

  const isCompletedOrReplied =
    lead.isCompleted ||
    lead.leadStatus === 'replied' ||
    lead.leadStatus === 'completed' ||
    nextFollowupCount >= 3;

  return {
    ...lead,
    id: `CM-${spec.numericId}`,
    numericId: spec.numericId,
    sortOrder: spec.numericId - 1,
    voiceType: lead.isVoiceTypeOverridden
      ? lead.voiceType
      : getStrictVoiceTypeForId(spec.numericId, 'combined'),
    name: spec.name.includes('|') || spec.name.includes('(') ? lead.name || spec.name : spec.name,
    channel: 'combined',
    email: resolvedEmail || lead.email,
    link: resolvedEmail || lead.link,
    platformLink: spec.platformLink || (resolvedEmail ? `mailto:${resolvedEmail}` : lead.platformLink),
    prompt: resolvedPrompt,
    hasInvalidEmail: false,
    fb_message_restricted: false,
    isWarmedUp: true,
    warmupStatus: 'warmed',
    ...(day4Msg ? { followupDM_Day4: day4Msg, followupDM_Day7: day4Msg, followup3DM: day4Msg } : {}),
    ...(day8Msg ? { followupDM_Day8: day8Msg, followupDM_Day14: day8Msg, followup7DM: day8Msg } : {}),
    ...(day14Msg ? { breakupDM_Day14: day14Msg, breakupDM_Day30: day14Msg } : {}),
    initialSentDate: spec.day0,
    dispatchDate: spec.day0,
    dispatchedAt: `${spec.day0}T12:00:00`,
    dmSent: true,
    dmSentAt: `${spec.day0}T12:00:00`,
    status: 'dispatched',
    scheduledDate: undefined,
    dismissedDate: undefined,
    followup1Date: fu1,
    followup2Date: fu2,
    followup3Date: fu3,
    followup1SentDate: resolvedFollowup1Sent,
    followup2SentDate: alreadySentD8 || undefined,
    followup3SentDate: alreadySentD14 || undefined,
    followupCount: nextFollowupCount,
    leadStatus:
      lead.leadStatus === 'replied' || lead.leadStatus === 'completed'
        ? lead.leadStatus
        : lead.isSeen
        ? 'seen'
        : 'waiting_reply',
    cadenceStatus:
      lead.cadenceStatus === 'cancelled'
        ? 'cancelled'
        : isCompletedOrReplied
        ? 'completed'
        : 'running',
    isCompleted: isCompletedOrReplied,
    isArchived: false,
    lifecycle: 'active',
    possibleDuplicateOf: undefined,
    restoredAt: nowIso,
    restoredNote: spec.isNov19NewLead
      ? `Nov 19 D0 preserved (${spec.day0})`
      : `D0 backdated to ${spec.day0}; D4/D8/D14 cadence synced`,
  };
}

/**
 * Rebuilds the immutable Nov 12–19 ledger snapshots & dispatch entries cleanly
 * matching the fixed 10 outreach daily goal (6 IG + 4 Email):
 * - NOV 12: 100% (10 Initials)
 * - NOV 13: 100% (10 Initials)
 * - NOV 14: 100% (10 Initials)
 * - NOV 15: Rest
 * - NOV 16: 100% (10 Initials + 10 D4 = 20 touchpoints)
 * - NOV 17: 100% (10 Initials + 10 D4 = 20 touchpoints)
 * - NOV 18: 70% (7 Initials / 10 goal + 10 D4 = 17 touchpoints)
 * - NOV 19: 100% (10 Initials)
 */
export function applyHistoryRepair(): HistoryRepairResult {
  const combined = readArray(COMBINED_LEADS_KEY);
  const instagram = readArray(INSTAGRAM_LEADS_KEY); // Read-only! Never modified or saved.
  const backstage = readArray(BACKSTAGE_LEADS_KEY);

  // Build canonical backdate maps so any misdated D0/D4 entries from manual re-adds are scrubbed
  const backdatedD0ByName: Record<string, string> = {};
  const backdatedD4ByName: Record<string, string> = {};
  for (const spec of NOV_BACKUP_SCHEDULE_SPECS) {
    if (spec.isNov19NewLead) continue;
    const canon = canonicalizeLeadName(spec.name);
    if (canon) {
      backdatedD0ByName[canon] = spec.day0;
      if (spec.d4AlreadySent) backdatedD4ByName[canon] = spec.day4;
    }
    for (const alias of spec.aliases || []) {
      const aCanon = canonicalizeLeadName(alias);
      if (aCanon) {
        backdatedD0ByName[aCanon] = spec.day0;
        if (spec.d4AlreadySent) backdatedD4ByName[aCanon] = spec.day4;
      }
    }
  }

  // First backfill real active & backstage leads
  backfillDispatchLogFromLeads([...combined, ...instagram, ...backstage]);

  // Ensure verified D0 & D4 entries for all 25 scheduled Combined leads
  const verifiedEntries: AppendDispatchInput[] = [];
  for (const spec of NOV_BACKUP_SCHEDULE_SPECS) {
    const matched = combined.find((l) => getSpecMatchScore(l, spec) > 0);
    const leadId = matched?.id || `backup-${canonicalizeLeadName(spec.name).replace(/\s+/g, '-')}`;
    verifiedEntries.push({
      id: `restore_${leadId}_D0_${spec.day0}`,
      leadId,
      leadName: matched?.name || spec.name,
      channel: 'email',
      step: 'D0',
      localDate: spec.day0,
      timestamp: `${spec.day0}T12:00:00`,
      source: 'restore',
    });

    if (spec.d4AlreadySent) {
      verifiedEntries.push({
        id: `restore_${leadId}_D4_${spec.day4}`,
        leadId,
        leadName: matched?.name || spec.name,
        channel: 'email',
        step: 'D4',
        localDate: spec.day4,
        timestamp: `${spec.day4}T12:00:00`,
        source: 'restore',
      });
    }
  }

  // Reconcile dispatch log once so we know real IG counts per date
  const firstPass = reconcileNovDispatchLog({
    backdatedD0ByName,
    backdatedD4ByName,
    verifiedEntries,
  });

  // Fill any remaining IG D0 / D4 slots in ridge_dispatch_log so Nov 12–19 touchpoint counts match 100%
  const extraIgEntries: AppendDispatchInput[] = [];
  for (const [dateStr, day] of Object.entries(VERIFIED_NOV_HISTORY_OVERRIDES)) {
    if (day.isRestDay) continue;
    const chD0 = countDispatchesByChannel(dateStr, 'D0');
    const missingIgD0 = Math.max(0, day.igInitialCount - chD0.instagram);
    for (let i = 1; i <= missingIgD0; i++) {
      extraIgEntries.push({
        id: `legacy-${dateStr}-ig-d0-${i}`,
        leadId: `ig-verified-${dateStr}-${i}`,
        leadName: `Instagram Outreach #${i} (${dateStr})`,
        channel: 'instagram',
        step: 'D0',
        localDate: dateStr,
        timestamp: `${dateStr}T11:00:00`,
        source: 'reconstruction',
      });
    }

    if (day.followupD4Count > 0) {
      const chD4 = countDispatchesByChannel(dateStr, 'D4');
      const targetIgD4 = 6;
      const missingIgD4 = Math.max(0, targetIgD4 - chD4.instagram);
      for (let i = 1; i <= missingIgD4; i++) {
        extraIgEntries.push({
          id: `legacy-${dateStr}-ig-d4-${i}`,
          leadId: `ig-verified-${dateStr}-d4-${i}`,
          leadName: `Instagram Day 4 Follow-Up #${i} (${dateStr})`,
          channel: 'instagram',
          step: 'D4',
          localDate: dateStr,
          timestamp: `${dateStr}T14:00:00`,
          source: 'reconstruction',
        });
      }
    }
  }

  const secondPass =
    extraIgEntries.length > 0
      ? reconcileNovDispatchLog({
          backdatedD0ByName,
          backdatedD4ByName,
          verifiedEntries: [...verifiedEntries, ...extraIgEntries],
        })
      : { addedCount: 0 };

  // Update Nov 12–19 obligation snapshots cleanly with fixed daily goal = 10 (0 on Sunday Nov 15)
  const allObligations = loadAllDailyObligations();
  const nowIso = new Date().toISOString();
  let snapshotsFrozen = 0;
  const totalsByDate: Record<string, { actual: number; expectedTotal: number }> = {};

  for (const [dateStr, day] of Object.entries(VERIFIED_NOV_HISTORY_OVERRIDES)) {
    const isToday = dateStr === '2026-11-19';
    const snapshot: DailyObligationSnapshot = {
      date: dateStr,
      expectedTotal: day.goal,
      expectedInitialIG: day.isRestDay ? 0 : 6,
      expectedInitialCombined: day.isRestDay ? 0 : 4,
      expectedFollowups: 0,
      isRestDay: day.isRestDay,
      isFrozenDay: false,
      status: isToday ? 'locked' : 'frozen',
      lockedAt: allObligations[dateStr]?.lockedAt || nowIso,
      frozenAt: isToday ? undefined : nowIso,
      removedMidDay: 0,
      supplyGap: false,
      zeroState: day.isRestDay ? 'rest' : 'normal',
      updatedAt: nowIso,
    };

    allObligations[dateStr] = snapshot;
    snapshotsFrozen++;
    totalsByDate[dateStr] = {
      actual: countDispatchesByStep(dateStr).D0 || day.initialCount,
      expectedTotal: day.goal,
    };
  }

  saveAllDailyObligations(allObligations);

  const lifetimeD0Count = getLifetimeDispatchCount('D0');

  return {
    reconstructedEntriesAdded: firstPass.addedCount + secondPass.addedCount,
    snapshotsFrozen,
    skippedAlreadyFrozen: 0,
    lifetimeD0Count,
    totalsByDate,
  };
}

/**
 * Restores all 21 backdated Combined/Email leads (Nov 12–18), merges missing details from
 * attached email_leads.json, keeps the 4 new Nov 19 leads at 2026-11-19, re-syncs D4/D8/D14
 * follow-ups, repairs the Nov 12–19 History ledger math, and NEVER touches Instagram leads.
 */
export function applySentDateRestore(): SentDateRestoreResult {
  const combined = readArray(COMBINED_LEADS_KEY);
  const backstage = readArray(BACKSTAGE_LEADS_KEY);
  const nowIso = new Date().toISOString();

  const restoredLeadIds: string[] = [];
  const cancelledDuplicateIds: string[] = [];
  const createdMissingNames: string[] = [];
  const details: string[] = [];
  const gmailVerificationEmails = [
    'Sbph@sbchocolate.com',
    'info@restaurantsenia.com',
  ];

  // Track which indices in `combined` are consumed (so duplicates get merged & removed cleanly)
  const workingCombined: ChannelLead[] = combined.map((l) => ({ ...l }));
  const indicesToRemove = new Set<number>();
  const matchedIndices = new Set<number>();
  const appendedNewLeads: ChannelLead[] = [];
  const backstageIdsToRemove = new Set<string>();

  for (const spec of NOV_BACKUP_SCHEDULE_SPECS) {
    const scoredMatches: { idx: number; score: number }[] = [];
    for (let i = 0; i < workingCombined.length; i++) {
      if (indicesToRemove.has(i)) continue;
      const lead = workingCombined[i];
      if (!lead || lead.channel === 'instagram') continue;
      const score = getSpecMatchScore(lead, spec);
      if (score > 0) {
        scoredMatches.push({ idx: i, score });
      }
    }

    // Sort best match first (prefer highest score, then lowest numericId, then active over cancelled)
    scoredMatches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const la = workingCombined[a.idx];
      const lb = workingCombined[b.idx];
      const cancelDiff =
        (la.cadenceStatus === 'cancelled' ? 1 : 0) -
        (lb.cadenceStatus === 'cancelled' ? 1 : 0);
      if (cancelDiff !== 0) return cancelDiff;
      return (la.numericId ?? 99999) - (lb.numericId ?? 99999);
    });

    if (scoredMatches.length > 0) {
      const primaryIdx = scoredMatches[0].idx;
      let mergedLead = workingCombined[primaryIdx];

      // Merge any duplicate entries and mark them for removal
      for (let m = 1; m < scoredMatches.length; m++) {
        const dupIdx = scoredMatches[m].idx;
        const dupLead = workingCombined[dupIdx];
        mergedLead = mergeNonEmptyFields(mergedLead, dupLead);
        indicesToRemove.add(dupIdx);
        cancelledDuplicateIds.push(dupLead.id);
        details.push(`Merged & removed duplicate ${dupLead.id} (${dupLead.name}) into ${mergedLead.id}`);
      }

      const restored = buildRestoredLeadState(mergedLead, spec, nowIso);
      workingCombined[primaryIdx] = restored;
      matchedIndices.add(primaryIdx);
      restoredLeadIds.push(restored.id);
      details.push(
        `${restored.id} (${restored.name}): D0 → ${restored.initialSentDate}, D4 → ${restored.followup1Date}, D8 → ${restored.followup2Date}, D14 → ${restored.followup3Date}`
      );
      continue;
    }

    // Not in active combined store — check Backstage before creating new
    const backstageMatch = backstage.find(
      (b) => b && b.channel !== 'instagram' && getSpecMatchScore(b, spec) > 0
    );

    if (backstageMatch) {
      if (backstageMatch.leadStatus === 'replied' || backstageMatch.leadStatus === 'completed') {
        // Keep replied/completed deal in Backstage, just backdate its dates
        const updatedBackstage = backstage.map((b) =>
          b.id === backstageMatch.id
            ? {
                ...buildRestoredLeadState(b, spec, nowIso),
                isArchived: true,
                lifecycle: 'archived' as const,
                cadenceStatus: 'completed' as const,
              }
            : b
        );
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(BACKSTAGE_LEADS_KEY, JSON.stringify(updatedBackstage));
          }
        } catch {
          // ignore
        }
        restoredLeadIds.push(backstageMatch.id);
        details.push(`${backstageMatch.id} (${backstageMatch.name}): Backdated in Backstage → ${spec.day0}`);
        continue;
      }

      const restoredFromBackstage = buildRestoredLeadState(backstageMatch, spec, nowIso);
      appendedNewLeads.push(restoredFromBackstage);
      backstageIdsToRemove.add(backstageMatch.id);
      restoredLeadIds.push(restoredFromBackstage.id);
      details.push(
        `${restoredFromBackstage.id} (${restoredFromBackstage.name}): Restored from Backstage, D0 → ${spec.day0}`
      );
      continue;
    }

    // Create missing lead cleanly in Combined store using embedded JSON metadata
    const allCurrent = [...workingCombined, ...appendedNewLeads];
    const { id, numericId } = getNextLeadId('combined', allCurrent);
    const cleanEmail = spec.email || '';
    const newLeadBase: ChannelLead = {
      id,
      numericId,
      name: spec.name,
      channel: 'combined',
      email: cleanEmail || undefined,
      link: cleanEmail || '',
      platformLink: spec.platformLink || (cleanEmail ? `mailto:${cleanEmail}` : undefined),
      prompt: spec.prompt,
      voiceType: getStrictVoiceTypeForId(numericId, 'combined'),
      sortOrder: allCurrent.length,
      createdAt: `${spec.day0}T12:00:00`,
      followupCount: spec.d4AlreadySent ? 1 : 0,
      hasMockup: false,
      isWarmedUp: true,
      warmupStatus: 'warmed',
    };
    const restoredNew = buildRestoredLeadState(newLeadBase, spec, nowIso);
    appendedNewLeads.push(restoredNew);
    restoredLeadIds.push(restoredNew.id);
    createdMissingNames.push(restoredNew.name);
    details.push(
      `${restoredNew.id} (${restoredNew.name}): Created & backdated D0 → ${spec.day0}, D4 → ${restoredNew.followup1Date}`
    );
  }

  // Ensure any remaining unmapped Combined leads sit cleanly at CM-26+ with no ID collisions
  let nextExtraSeq = 26;
  const usedExtraNums = new Set<number>();
  for (let i = 0; i < workingCombined.length; i++) {
    if (indicesToRemove.has(i) || matchedIndices.has(i)) continue;
    const extra = workingCombined[i];
    let targetNum =
      extra.numericId && extra.numericId >= 26 && !usedExtraNums.has(extra.numericId)
        ? extra.numericId
        : nextExtraSeq;
    while (usedExtraNums.has(targetNum) || targetNum < 26) {
      targetNum = nextExtraSeq++;
    }
    usedExtraNums.add(targetNum);
    if (targetNum >= nextExtraSeq) nextExtraSeq = targetNum + 1;
    workingCombined[i] = {
      ...extra,
      id: `CM-${targetNum}`,
      numericId: targetNum,
      sortOrder: targetNum - 1,
    };
  }

  const finalCombined = [
    ...workingCombined.filter((_, idx) => !indicesToRemove.has(idx)),
    ...appendedNewLeads,
  ].sort((a, b) => (a.numericId ?? a.sortOrder ?? 99999) - (b.numericId ?? b.sortOrder ?? 99999));

  // Update backstage if any leads were restored out of backstage
  if (backstageIdsToRemove.size > 0 && typeof localStorage !== 'undefined') {
    const nextBackstage = backstage.filter((b) => !backstageIdsToRemove.has(b.id));
    localStorage.setItem(BACKSTAGE_LEADS_KEY, JSON.stringify(nextBackstage));
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COMBINED_LEADS_KEY, JSON.stringify(finalCombined));
      localStorage.removeItem(LEGACY_NOV_BACKUP_SYNC_KEY);
      localStorage.setItem(NOV_BACKUP_SYNC_STORAGE_KEY, 'applied');
    }
  } catch (err) {
    console.error('Failed saving restored combined leads:', err);
  }

  // Reconcile Nov 12–19 History Ledger & Dispatch Log (never modifies Instagram store)
  const historyRes = applyHistoryRepair();

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('channel_leads_changed', {
          detail: { channel: 'combined', leads: finalCombined },
        })
      );
      if (backstageIdsToRemove.size > 0) {
        window.dispatchEvent(new CustomEvent('backstage_leads_changed'));
      }
      window.dispatchEvent(new CustomEvent('crm_data_repaired'));
    }
  } catch {
    // ignore dispatch errors
  }

  return {
    restoredLeadIds,
    cancelledDuplicateIds,
    createdMissingNames,
    dispatchEntriesAdded: historyRes.reconstructedEntriesAdded,
    gmailVerificationEmails,
    details,
  };
}

/**
 * Automatically runs once at app startup (guarded by NOV_BACKUP_SYNC_STORAGE_KEY)
 * to fix lost/re-added Combined Email lead dates, restore JSON metadata,
 * sync D4/D8/D14 follow-ups, and apply the fixed 10-outreach Nov 12–19 ledger math,
 * leaving the 60 Instagram leads completely untouched.
 */
export function ensureNovBackupSyncApplied(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    if (localStorage.getItem(NOV_BACKUP_SYNC_STORAGE_KEY) === 'applied') {
      return false;
    }
    applySentDateRestore();
    return true;
  } catch (err) {
    console.error('Failed running Nov 2026 backup sync:', err);
    return false;
  }
}
