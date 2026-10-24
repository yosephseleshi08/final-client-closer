import { Lead, FollowupLog, Weekday } from '../types';

/**
 * Escapes a cell value for standard CSV compatibility (RFC 4180).
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generates and triggers browser download of a CSV file.
 * Adds UTF-8 BOM (\uFEFF) to guarantee correct rendering in Microsoft Excel, Google Sheets, etc.
 */
export function triggerCsvDownload(csvString: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and triggers browser download of a formatted JSON file.
 */
export function triggerJsonDownload(data: any, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a comprehensive CSV containing EVERY SINGLE detail and column for given leads.
 */
export function downloadComprehensiveCsv(
  leads: Lead[],
  followupLogs: FollowupLog[] = [],
  filenamePrefix: string = 'outreach-leads-full-export'
): void {
  const headers = [
    'Lead ID',
    'Business / Restaurant Name',
    'Contact Person',
    'Platform / Channel',
    'Handle / Username',
    'Profile URL',
    'Email Address',
    'Phone Number',
    'Website URL',
    'City / Metro',
    'Full Address',
    'Category / Niche',
    'Mockup Demo Link',
    'Pipeline Status',
    'Scheduled Day',
    'Target Week',
    'Date First Contact',
    'Last Contact Date',
    'Next Follow-Up Date',
    'Follow-Up Count',
    'Estimated Deal Value ($)',
    'Lead Heat Score (1-100)',
    'Audit Milestone 1 (Friction Identified)',
    'Audit Milestone 2 (Mockup Concept Ready)',
    'Audit Milestone 3 (Ready to Close Offer)',
    'Bio / Profile Details',
    'Friction Points',
    'Sales Notes',
    'Pitch Hook',
    'Staged Mini-Pitch Draft',
    'Staged Follow-up 1 Draft',
    'Staged Follow-up 2 Draft',
    'Staged Follow-up 3 Draft',
    'Custom Message Draft',
    'Rating & Details',
    'Followup Activity Count',
    'Activity History Trail',
  ];

  const rows = leads.map((l) => {
    const logsForLead = followupLogs.filter((log) => log.leadId === l.id);
    const logsTrail = logsForLead
      .map((log) => `[${log.logDate}] ${log.actionType}: ${log.note}`)
      .join(' | ');

    const audit1 = l.auditChecklist ? (l.auditChecklist[0] ? 'Yes' : 'No') : 'No';
    const audit2 = l.auditChecklist ? (l.auditChecklist[1] ? 'Yes' : 'No') : 'No';
    const audit3 = l.auditChecklist ? (l.auditChecklist[2] ? 'Yes' : 'No') : 'No';

    return [
      escapeCsv(l.id),
      escapeCsv(l.restaurantName),
      escapeCsv(l.contactName || ''),
      escapeCsv(l.platform),
      escapeCsv(l.handle),
      escapeCsv(l.profileUrl || ''),
      escapeCsv(l.email || ''),
      escapeCsv(l.phone || ''),
      escapeCsv(l.website || ''),
      escapeCsv(l.city),
      escapeCsv(l.address || ''),
      escapeCsv(l.mockupCategory || ''),
      escapeCsv(l.mockupLink || ''),
      escapeCsv(l.status),
      escapeCsv(l.scheduledDay || ''),
      escapeCsv(l.targetWeek || ''),
      escapeCsv(l.dateFirstContact),
      escapeCsv(l.lastContactDate),
      escapeCsv(l.nextFollowupDate || ''),
      escapeCsv(l.followupCount),
      escapeCsv(l.estimatedDealValue || 299),
      escapeCsv(l.leadScore ?? 25),
      escapeCsv(audit1),
      escapeCsv(audit2),
      escapeCsv(audit3),
      escapeCsv(l.bio || ''),
      escapeCsv(Array.isArray((l as any).frictionPoints) ? (l as any).frictionPoints.join('; ') : ''),
      escapeCsv(l.notes || ''),
      escapeCsv(l.pitchHook || ''),
      escapeCsv(l.stagedDmMiniPitch || ''),
      escapeCsv(l.stagedFollowup1 || ''),
      escapeCsv(l.stagedFollowup2 || ''),
      escapeCsv(l.stagedFollowup3 || ''),
      escapeCsv(l.customMessageDraft || ''),
      escapeCsv(l.rating || ''),
      escapeCsv(logsForLead.length),
      escapeCsv(logsTrail),
    ].join(',');
  });

  const csvContent = [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  triggerCsvDownload(csvContent, `${filenamePrefix}-${dateStr}.csv`);
}

/**
 * Downloads a complete structured JSON archive of all leads and logs.
 */
export function downloadComprehensiveJson(
  leads: Lead[],
  followupLogs: FollowupLog[] = [],
  filenamePrefix: string = 'outreach-database-full-backup'
): void {
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    totalLeads: leads.length,
    totalLogs: followupLogs.length,
    statistics: {
      byChannel: {
        email: leads.filter((l) => l.platform === 'Email' || l.platform === 'Website').length,
        facebook: leads.filter((l) => l.platform === 'Facebook').length,
        instagram: leads.filter((l) => l.platform === 'Instagram').length,
        other: leads.filter((l) => !['Email', 'Website', 'Facebook', 'Instagram'].includes(l.platform)).length,
      },
      byStatus: leads.reduce((acc: Record<string, number>, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {}),
    },
    leads: leads.map((l) => {
      const logs = followupLogs.filter((log) => log.leadId === l.id);
      return {
        ...l,
        linkedActivityLogs: logs,
      };
    }),
    rawFollowupLogs: followupLogs,
  };

  const dateStr = new Date().toISOString().split('T')[0];
  triggerJsonDownload(exportPayload, `${filenamePrefix}-${dateStr}.json`);
}

/**
 * Downloads leads filtered specifically for today's outreach queue.
 */
export function downloadTodayLeadsCsv(
  leads: Lead[],
  todayWeekday: Weekday,
  followupLogs: FollowupLog[] = [],
  channelFilter?: 'Email' | 'Facebook' | 'Instagram'
): void {
  let targetLeads = leads.filter((l) => l.scheduledDay === todayWeekday);

  if (channelFilter) {
    targetLeads = targetLeads.filter((l) => {
      if (channelFilter === 'Email') return l.platform === 'Email' || l.platform === 'Website';
      if (channelFilter === 'Facebook') return l.platform === 'Facebook';
      if (channelFilter === 'Instagram') return l.platform === 'Instagram';
      return false;
    });
  }

  const channelLabel = channelFilter ? `-${channelFilter.toLowerCase()}` : '-all-channels';
  downloadComprehensiveCsv(
    targetLeads,
    followupLogs,
    `today-scheduled-leads${channelLabel}-${todayWeekday.toLowerCase()}`
  );
}
