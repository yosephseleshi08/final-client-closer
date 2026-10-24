import fs from 'fs';
import path from 'path';
import { INITIAL_LEADS } from '../src/data/initialLeads';
import { Lead } from '../src/types';

// The 104 log entries from the user's SQLite database
export const RAW_FOLLOWUP_LOGS = [
  // Lead 20 - Viva Tequila Mexican Cocina
  { id: 'log-1', leadId: 20, logDate: '2026-09-14', actionType: 'replied', note: 'Owner replied' },
  { id: 'log-2', leadId: 20, logDate: '2026-09-14', actionType: 'replied', note: 'Owner replied' },
  { id: 'log-3', leadId: 20, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1' },
  { id: 'log-4', leadId: 20, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #2' },

  // Lead 1 - Cafe Baboy
  { id: 'log-5', leadId: 1, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-6', leadId: 1, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },
  { id: 'log-7', leadId: 1, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #3 (quick check)' },
  { id: 'log-8', leadId: 1, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Leads 2 to 13
  { id: 'log-9', leadId: 2, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-10', leadId: 3, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-11', leadId: 4, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-12', leadId: 5, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-13', leadId: 6, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-14', leadId: 7, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-15', leadId: 8, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-16', leadId: 8, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },
  { id: 'log-17', leadId: 8, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #3 (quick check)' },
  { id: 'log-18', leadId: 9, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-19', leadId: 10, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-20', leadId: 10, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },
  { id: 'log-21', leadId: 10, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #3 (quick check)' },
  { id: 'log-22', leadId: 11, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-23', leadId: 12, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-24', leadId: 13, logDate: '2026-09-14', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Lead 59 - Ichi Shabu
  { id: 'log-25', leadId: 59, logDate: '2026-09-14', actionType: 'replied', note: 'Owner replied' },

  // Leads 14 to 19
  { id: 'log-26', leadId: 14, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-27', leadId: 15, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-28', leadId: 15, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },
  { id: 'log-29', leadId: 15, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #3 (quick check)' },
  { id: 'log-30', leadId: 16, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-31', leadId: 17, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-32', leadId: 18, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-33', leadId: 18, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },
  { id: 'log-34', leadId: 18, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #3 (quick check)' },
  { id: 'log-35', leadId: 18, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #4' },
  { id: 'log-36', leadId: 19, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Lead 20 follow-up #3
  { id: 'log-37', leadId: 20, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #3 (quick check)' },

  // Leads 21 to 25
  { id: 'log-38', leadId: 21, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-39', leadId: 22, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-40', leadId: 23, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-41', leadId: 24, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-42', leadId: 25, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Lead 32 - Agave Restaurant
  { id: 'log-43', leadId: 32, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Lead 26 - JojoskitchenCravings
  { id: 'log-44', leadId: 26, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-45', leadId: 26, logDate: '2026-09-15', actionType: 'replied', note: 'Owner replied' },
  { id: 'log-46', leadId: 26, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #2' },
  { id: 'log-47', leadId: 26, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #3' },
  { id: 'log-48', leadId: 26, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #4' },
  { id: 'log-49', leadId: 26, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #5' },

  // Lead 27 - Hernandez Tacos CDMX
  { id: 'log-50', leadId: 27, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Lead 38 - NIGERIAN FOOD TRUCK IN COLORADO
  { id: 'log-51', leadId: 38, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-52', leadId: 38, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },
  { id: 'log-53', leadId: 38, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #3 (quick check)' },

  // Lead 28 - Sazón & Soul
  { id: 'log-54', leadId: 28, logDate: '2026-09-15', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Leads 29 to 31
  { id: 'log-55', leadId: 29, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-56', leadId: 30, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-57', leadId: 31, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Lead 33 - India Palace Restaurant & Bar
  { id: 'log-58', leadId: 33, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Lead 39 - Aznway | Las Vegas food truck
  { id: 'log-59', leadId: 39, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-60', leadId: 39, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },

  // Leads 34 to 37
  { id: 'log-61', leadId: 34, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-62', leadId: 35, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-63', leadId: 36, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-64', leadId: 37, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Lead 40 - DOC’s BBQ
  { id: 'log-65', leadId: 40, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-66', leadId: 40, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },

  // Lead 41 - AKH’S LAB
  { id: 'log-67', leadId: 41, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-68', leadId: 41, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },

  // Lead 42 - Alfredo's Food Truck
  { id: 'log-69', leadId: 42, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-70', leadId: 42, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },

  // Lead 43 - Ecco Wine Bar
  { id: 'log-71', leadId: 43, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-72', leadId: 43, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },

  // Leads 44 to 46
  { id: 'log-73', leadId: 44, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-74', leadId: 45, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-75', leadId: 46, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Lead 47 - Totally Baked Food Truck
  { id: 'log-76', leadId: 47, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-77', leadId: 47, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },
  { id: 'log-78', leadId: 47, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #3 (quick check)' },

  // Leads 48, 51, 52, 53
  { id: 'log-79', leadId: 48, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-80', leadId: 51, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-81', leadId: 52, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-82', leadId: 53, logDate: '2026-09-16', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Leads 54 to 66
  { id: 'log-83', leadId: 54, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-84', leadId: 55, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-85', leadId: 56, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-86', leadId: 57, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-87', leadId: 58, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-88', leadId: 59, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-89', leadId: 60, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-90', leadId: 61, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-91', leadId: 62, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-92', leadId: 63, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-93', leadId: 64, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-94', leadId: 65, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-95', leadId: 66, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Lead 67 - Off The 99 Cocktails & Eatery
  { id: 'log-96', leadId: 67, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-97', leadId: 67, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },
  { id: 'log-98', leadId: 67, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #3 (quick check)' },

  // Leads 68, 69
  { id: 'log-99', leadId: 68, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-100', leadId: 69, logDate: '2026-09-17', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },

  // Lead 70 - El Rincón Botanero Fresno
  { id: 'log-101', leadId: 70, logDate: '2026-09-18', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
  { id: 'log-102', leadId: 70, logDate: '2026-09-18', actionType: 'followup_sent', note: 'Follow-up #2 (quick check)' },
  { id: 'log-103', leadId: 70, logDate: '2026-09-18', actionType: 'followup_sent', note: 'Follow-up #3 (quick check)' },

  // Lead 71 - Fuego Fries
  { id: 'log-104', leadId: 71, logDate: '2026-09-18', actionType: 'followup_sent', note: 'Follow-up #1 (quick check)' },
];

// SQLite leads table overrides
const LEAD_UPDATES: Record<number, { lastContactDate: string; nextFollowupDate: string | null; followupCount: number; status: any }> = {
  1: { lastContactDate: '2026-09-14', nextFollowupDate: '2026-09-04', followupCount: 3, status: 'sent' },
  2: { lastContactDate: '2026-09-14', nextFollowupDate: '2026-09-05', followupCount: 1, status: 'sent' },
  3: { lastContactDate: '2026-09-14', nextFollowupDate: '2026-09-05', followupCount: 1, status: 'sent' },
  4: { lastContactDate: '2026-09-14', nextFollowupDate: '2026-09-05', followupCount: 1, status: 'sent' },
  5: { lastContactDate: '2026-09-14', nextFollowupDate: '2026-09-05', followupCount: 1, status: 'sent' },
  6: { lastContactDate: '2026-09-14', nextFollowupDate: '2026-09-05', followupCount: 1, status: 'sent' },
  7: { lastContactDate: '2026-09-14', nextFollowupDate: '2026-09-05', followupCount: 1, status: 'sent' },
  8: { lastContactDate: '2026-09-14', nextFollowupDate: '2026-09-01', followupCount: 3, status: 'seen' },
  9: { lastContactDate: '2026-09-14', nextFollowupDate: '2026-09-06', followupCount: 1, status: 'seen' },
  10: { lastContactDate: '2026-09-14', nextFollowupDate: '2026-09-02', followupCount: 3, status: 'sent' },
  11: { lastContactDate: '2026-09-14', nextFollowupDate: '2026-09-06', followupCount: 1, status: 'sent' },
  12: { lastContactDate: '2026-09-14', nextFollowupDate: '2026-09-06', followupCount: 1, status: 'sent' },
  13: { lastContactDate: '2026-09-14', nextFollowupDate: '2026-09-06', followupCount: 1, status: 'sent' },
  14: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-06', followupCount: 1, status: 'sent' },
  15: { lastContactDate: '2026-09-15', nextFollowupDate: null, followupCount: 3, status: 'closed_dead' },
  16: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-07', followupCount: 1, status: 'sent' },
  17: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-08', followupCount: 1, status: 'sent' },
  18: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-04', followupCount: 4, status: 'seen' },
  19: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-08', followupCount: 1, status: 'sent' },
  20: { lastContactDate: '2026-09-15', nextFollowupDate: null, followupCount: 3, status: 'replied' },
  21: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-09', followupCount: 1, status: 'sent' },
  22: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-10', followupCount: 1, status: 'sent' },
  23: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-10', followupCount: 1, status: 'sent' },
  24: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-10', followupCount: 1, status: 'sent' },
  25: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-10', followupCount: 1, status: 'sent' },
  26: { lastContactDate: '2026-09-15', nextFollowupDate: null, followupCount: 5, status: 'sent' },
  27: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-10', followupCount: 1, status: 'sent' },
  28: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-11', followupCount: 1, status: 'sent' },
  29: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-11', followupCount: 1, status: 'sent' },
  30: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-11', followupCount: 1, status: 'sent' },
  31: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-12', followupCount: 1, status: 'seen' },
  32: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-12', followupCount: 1, status: 'sent' },
  33: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-12', followupCount: 1, status: 'sent' },
  34: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-12', followupCount: 1, status: 'sent' },
  35: { lastContactDate: '2026-09-16', nextFollowupDate: null, followupCount: 1, status: 'replied' },
  36: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-13', followupCount: 1, status: 'sent' },
  37: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-13', followupCount: 1, status: 'sent' },
  38: { lastContactDate: '2026-09-15', nextFollowupDate: '2026-09-17', followupCount: 3, status: 'sent' },
  39: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-28', followupCount: 2, status: 'seen' },
  40: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-28', followupCount: 2, status: 'seen' },
  41: { lastContactDate: '2026-09-16', nextFollowupDate: null, followupCount: 2, status: 'replied' },
  42: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-28', followupCount: 2, status: 'sent' },
  43: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-28', followupCount: 2, status: 'seen' },
  44: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-21', followupCount: 1, status: 'seen' },
  45: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-21', followupCount: 1, status: 'seen' },
  46: { lastContactDate: '2026-09-16', nextFollowupDate: null, followupCount: 1, status: 'replied' },
  47: { lastContactDate: '2026-09-16', nextFollowupDate: null, followupCount: 3, status: 'closed_dead' },
  48: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-21', followupCount: 1, status: 'seen' },
  49: { lastContactDate: '2026-09-04', nextFollowupDate: null, followupCount: 0, status: 'replied' },
  50: { lastContactDate: '2026-09-08', nextFollowupDate: '2026-09-11', followupCount: 0, status: 'sent' },
  51: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-15', followupCount: 1, status: 'sent' },
  52: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-15', followupCount: 1, status: 'sent' },
  53: { lastContactDate: '2026-09-16', nextFollowupDate: '2026-09-15', followupCount: 1, status: 'sent' },
  54: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-15', followupCount: 1, status: 'sent' },
  55: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-15', followupCount: 1, status: 'sent' },
  56: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-15', followupCount: 1, status: 'sent' },
  57: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-15', followupCount: 1, status: 'sent' },
  58: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-15', followupCount: 1, status: 'sent' },
  59: { lastContactDate: '2026-09-17', nextFollowupDate: null, followupCount: 1, status: 'replied' },
  60: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-16', followupCount: 1, status: 'sent' },
  61: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-16', followupCount: 1, status: 'sent' },
  62: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-16', followupCount: 1, status: 'sent' },
  63: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-16', followupCount: 1, status: 'sent' },
  64: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-16', followupCount: 1, status: 'sent' },
  65: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-16', followupCount: 1, status: 'sent' },
  66: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-16', followupCount: 1, status: 'sent' },
  67: { lastContactDate: '2026-09-17', nextFollowupDate: null, followupCount: 3, status: 'sent' },
  68: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-16', followupCount: 1, status: 'sent' },
  69: { lastContactDate: '2026-09-17', nextFollowupDate: '2026-09-16', followupCount: 1, status: 'sent' },
  70: { lastContactDate: '2026-09-18', nextFollowupDate: null, followupCount: 3, status: 'sent' },
  71: { lastContactDate: '2026-09-18', nextFollowupDate: '2026-09-17', followupCount: 1, status: 'sent' },
  72: { lastContactDate: '2026-09-10', nextFollowupDate: '2026-09-13', followupCount: 0, status: 'sent' },
  73: { lastContactDate: '2026-09-10', nextFollowupDate: '2026-09-13', followupCount: 0, status: 'sent' },
  74: { lastContactDate: '2026-09-10', nextFollowupDate: '2026-09-13', followupCount: 0, status: 'sent' },
  75: { lastContactDate: '2026-09-10', nextFollowupDate: '2026-09-13', followupCount: 0, status: 'sent' },
  76: { lastContactDate: '2026-09-10', nextFollowupDate: '2026-09-13', followupCount: 0, status: 'sent' },
  77: { lastContactDate: '2026-09-10', nextFollowupDate: '2026-09-13', followupCount: 0, status: 'sent' },
  78: { lastContactDate: '2026-09-08', nextFollowupDate: null, followupCount: 0, status: 'replied' },
  79: { lastContactDate: '2026-09-09', nextFollowupDate: '2026-09-12', followupCount: 0, status: 'sent' },
  80: { lastContactDate: '2026-09-11', nextFollowupDate: '2026-09-14', followupCount: 0, status: 'sent' },
  81: { lastContactDate: '2026-09-11', nextFollowupDate: '2026-09-14', followupCount: 0, status: 'sent' },
  82: { lastContactDate: '2026-09-11', nextFollowupDate: '2026-09-14', followupCount: 0, status: 'sent' },
  83: { lastContactDate: '2026-09-11', nextFollowupDate: '2026-09-14', followupCount: 0, status: 'sent' },
  84: { lastContactDate: '2026-09-11', nextFollowupDate: '2026-09-14', followupCount: 0, status: 'sent' },
  85: { lastContactDate: '2026-09-12', nextFollowupDate: '2026-09-15', followupCount: 0, status: 'sent' },
  86: { lastContactDate: '2026-09-12', nextFollowupDate: '2026-09-15', followupCount: 0, status: 'sent' },
  87: { lastContactDate: '2026-09-12', nextFollowupDate: '2026-09-15', followupCount: 0, status: 'sent' },
  88: { lastContactDate: '2026-09-12', nextFollowupDate: '2026-09-15', followupCount: 0, status: 'sent' },
  89: { lastContactDate: '2026-09-12', nextFollowupDate: '2026-09-15', followupCount: 0, status: 'sent' },
  90: { lastContactDate: '2026-09-12', nextFollowupDate: '2026-09-15', followupCount: 0, status: 'sent' },
  91: { lastContactDate: '2026-09-12', nextFollowupDate: '2026-09-15', followupCount: 0, status: 'sent' },
  92: { lastContactDate: '2026-09-12', nextFollowupDate: '2026-09-15', followupCount: 0, status: 'sent' },
  93: { lastContactDate: '2026-09-12', nextFollowupDate: '2026-09-15', followupCount: 0, status: 'sent' },
  94: { lastContactDate: '2026-09-04', nextFollowupDate: null, followupCount: 0, status: 'replied' },
  95: { lastContactDate: '2026-09-12', nextFollowupDate: '2026-09-15', followupCount: 0, status: 'seen' },
  96: { lastContactDate: '2026-09-10', nextFollowupDate: null, followupCount: 0, status: 'replied' },
  97: { lastContactDate: '2026-09-12', nextFollowupDate: null, followupCount: 0, status: 'closed_dead' },
  98: { lastContactDate: '2026-09-08', nextFollowupDate: null, followupCount: 0, status: 'replied' },
  99: { lastContactDate: '2026-09-11', nextFollowupDate: '2026-09-14', followupCount: 0, status: 'seen' },
  100: { lastContactDate: '2026-09-10', nextFollowupDate: null, followupCount: 0, status: 'replied' },
  101: { lastContactDate: '2026-09-11', nextFollowupDate: '2026-09-14', followupCount: 0, status: 'seen' },
  102: { lastContactDate: '2026-08-29', nextFollowupDate: '2026-09-01', followupCount: 0, status: 'seen' },
  103: { lastContactDate: '2026-09-11', nextFollowupDate: '2026-09-14', followupCount: 0, status: 'seen' },
};

function main() {
  const updatedLeads: Lead[] = INITIAL_LEADS.map((lead) => {
    const update = LEAD_UPDATES[lead.id];
    if (!update) return lead;

    const count = update.followupCount;
    const auditChecklist: [boolean, boolean, boolean] = [
      count >= 1,
      count >= 2,
      count >= 3,
    ];

    return {
      ...lead,
      lastContactDate: update.lastContactDate,
      nextFollowupDate: update.nextFollowupDate,
      followupCount: update.followupCount,
      status: update.status,
      auditChecklist,
    };
  });

  // 1. Output src/data/followupLogs.ts
  const logsFileContent = `import { FollowupLog } from '../types';

export const INITIAL_FOLLOWUP_LOGS: FollowupLog[] = ${JSON.stringify(RAW_FOLLOWUP_LOGS, null, 2)};
`;
  fs.writeFileSync(path.resolve('src/data/followupLogs.ts'), logsFileContent, 'utf-8');
  console.log(`Successfully wrote ${RAW_FOLLOWUP_LOGS.length} followup logs to src/data/followupLogs.ts`);

  // 2. Output src/data/initialLeads.ts
  const leadsFileContent = `import { Lead } from '../types';

export const FOLLOWUP_SCHEDULE_DAYS = [3, 7, 14];

export function calculateNextFollowupDate(contactDateStr: string, followupCount: number): string | null {
  if (followupCount >= FOLLOWUP_SCHEDULE_DAYS.length) {
    return null;
  }
  const days = FOLLOWUP_SCHEDULE_DAYS[followupCount];
  const date = new Date(contactDateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export const INITIAL_LEADS: Lead[] = ${JSON.stringify(updatedLeads, null, 2)};
`;
  fs.writeFileSync(path.resolve('src/data/initialLeads.ts'), leadsFileContent, 'utf-8');
  console.log(`Successfully wrote ${updatedLeads.length} leads to src/data/initialLeads.ts`);
}

main();
