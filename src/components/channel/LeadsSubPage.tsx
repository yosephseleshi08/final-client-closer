import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Trash2,
  ExternalLink,
  Download,
  Plus,
  Link as LinkIcon,
  Search,
  FileSpreadsheet,
  FileCode,
  AlertCircle,
  X,
  ArrowRight,
  Upload,
  Facebook,
  Mail,
  Edit2,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import {
  getNextLeadId,
  extractSuggestedName,
  exportChannelData,
  getChannelLabel,
  normalizeUrlForDuplicateCheck,
  formatAddedDate,
  validateChannelLink,
  resequenceLeadIds,
  loadChannelLeads,
  saveChannelLeads,
  findDuplicateLead,
  getPlatformLink,
  getLeadFacebook,
  getLeadEmail,
  hasDualChannelLinks,
  detectLinkChannel,
} from '../../utils/channelStorage';
import { TestLinkButton } from '../TestLinkButton';
import {
  getScheduleDayStyle,
  isDateToday,
  autoScheduleLeads,
  getNextAvailableScheduleDate,
  isEmailOnlyLead,
} from '../../utils/cadenceEngine';
import { playWarningChime } from '../../utils/soundEffects';

interface LeadsSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
  onNavigateToChannel?: (channel: MultiChannelType) => void;
}

interface SortableLeadRowProps {
  lead: ChannelLead;
  channel: MultiChannelType;
  onDelete: (id: string) => void;
  onToggleFbRestricted?: (id: string) => void;
  onRouteToEmail?: (lead: ChannelLead) => void;
  onEditLinks?: (lead: ChannelLead) => void;
  isJustAdded?: boolean;
}

function SortableLeadRow({
  lead,
  channel,
  onDelete,
  onToggleFbRestricted,
  onRouteToEmail,
  onEditLinks,
  isJustAdded,
}: SortableLeadRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const formattedUrl = getPlatformLink(lead.platformLink || lead.link, lead.channel || channel);
  const isMail = formattedUrl.startsWith('mailto:');

  const fbLink = getLeadFacebook(lead);
  const emailLink = getLeadEmail(lead);

  const dayStyle = getScheduleDayStyle(lead.scheduledDate);
  const isDueToday = isDateToday(lead.scheduledDate);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-white/[0.06] transition-all duration-200 group ${
        dayStyle.borderClass
      } ${dayStyle.tintClass} ${
        isDragging
          ? 'bg-indigo-950/60 shadow-xl border-indigo-500/40 opacity-95'
          : isJustAdded
          ? 'bg-indigo-950/50 ring-2 ring-indigo-500/70 border-indigo-500/40'
          : isDueToday
          ? 'ring-2 ring-emerald-500/50 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
          : ''
      }`}
    >
      {/* Drag Handle & ID */}
      <td className="py-3.5 px-4 text-left font-mono text-xs tabular-nums text-slate-300">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 transition-colors p-1 rounded hover:bg-white/5"
            title="Drag to reorder priority"
            aria-label={`Reorder lead ${lead.id}`}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {lead.id}
          </span>
          {isDueToday && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm animate-pulse">
              TODAY
            </span>
          )}
          {isJustAdded && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              NEW
            </span>
          )}
        </div>
      </td>

      {/* Prospect Name & Scheduled Day */}
      <td className="py-3.5 px-4 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-100 font-['Outfit'] truncate max-w-xs">
            {lead.name}
          </span>
          {lead.scheduledDate && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ${dayStyle.badgeClass}`}
              title={`Scheduled for ${dayStyle.dayName} (${lead.scheduledDate})`}
            >
              <span>{dayStyle.dayShort}</span>
              <span className="opacity-75">· {lead.scheduledDate.split('-').slice(1).join('/')}</span>
            </span>
          )}

          {/* Facebook Restriction Status & Smart Fallback Routing */}
          {(channel === 'facebook' || channel === 'combined') && (
            <div className="flex items-center gap-1.5 ml-1">
              {lead.fb_message_restricted ? (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    🚫 FB Restricted · Defaults to Email Dispatch
                  </span>
                  {onToggleFbRestricted && (
                    <button
                      type="button"
                      onClick={() => onToggleFbRestricted(lead.id)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer ml-1"
                      title="Clear restriction flag"
                    >
                      Clear
                    </button>
                  )}
                </>
              ) : (
                onToggleFbRestricted && (
                  <button
                    type="button"
                    onClick={() => onToggleFbRestricted(lead.id)}
                    className="text-[10px] text-slate-500 hover:text-amber-400 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-700 transition cursor-pointer"
                    title="Flag if Facebook Message button is restricted — will default to Email dispatch"
                  >
                    Flag FB Restricted
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </td>

      {/* Link & Dual-Channel Profile Links Display */}
      <td className="py-3.5 px-4 text-left text-xs text-slate-400">
        {channel === 'combined' ? (
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 1. Facebook Link & Test Link */}
            {fbLink ? (
              <div className="inline-flex items-center gap-1.5 p-1 px-2 rounded-lg bg-sky-950/40 border border-sky-500/30">
                <a
                  href={getPlatformLink(fbLink, 'facebook')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-300 hover:text-white font-medium group/fblink"
                  title={`Open Facebook Profile: ${fbLink}`}
                >
                  <Facebook className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="font-bold text-[10px] text-sky-300 bg-sky-500/20 px-1 py-0.2 rounded font-mono">
                    FB
                  </span>
                  <span className="truncate max-w-[120px] text-[11px] font-mono text-sky-200">
                    {fbLink.replace(/^https?:\/\/(?:www\.)?facebook\.com\/?/i, '') || fbLink}
                  </span>
                  <ExternalLink className="w-3 h-3 shrink-0 opacity-70 group-hover/fblink:opacity-100" />
                </a>
                <TestLinkButton lead={lead} platform="facebook" label="Test FB" />
              </div>
            ) : onEditLinks ? (
              <button
                type="button"
                onClick={() => onEditLinks(lead)}
                className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-lg border border-dashed border-sky-500/30 text-sky-400 hover:bg-sky-500/10 transition cursor-pointer"
                title="Add Facebook Profile Link"
              >
                <Plus className="w-3 h-3 text-sky-400" />
                <span>+ Add FB</span>
              </button>
            ) : null}

            {/* 2. Email Link & Test Link */}
            {emailLink ? (
              <div className="inline-flex items-center gap-1.5 p-1 px-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30">
                <a
                  href={getPlatformLink(emailLink, 'email')}
                  className="inline-flex items-center gap-1 text-indigo-300 hover:text-white font-medium group/emaillink"
                  title={`Send Email to: ${emailLink}`}
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-bold text-[10px] text-indigo-300 bg-indigo-500/20 px-1 py-0.2 rounded font-mono">
                    Email
                  </span>
                  <span className="truncate max-w-[130px] text-[11px] font-mono text-indigo-200">
                    {emailLink.replace(/^mailto:/i, '')}
                  </span>
                  <ExternalLink className="w-3 h-3 shrink-0 opacity-70 group-hover/emaillink:opacity-100" />
                </a>
                <TestLinkButton lead={lead} platform="email" label="Test Email" />
              </div>
            ) : onEditLinks ? (
              <button
                type="button"
                onClick={() => onEditLinks(lead)}
                className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-lg border border-dashed border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition cursor-pointer"
                title="Add Email Address"
              >
                <Plus className="w-3 h-3 text-indigo-400" />
                <span>+ Add Email</span>
              </button>
            ) : null}

            {/* Fallback if neither fbLink nor emailLink is detected */}
            {!fbLink && !emailLink && (
              <div className="flex items-center gap-2">
                <a
                  href={formattedUrl}
                  target={isMail ? '_self' : '_blank'}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors max-w-sm truncate"
                >
                  <span className="truncate">{lead.platformLink || lead.link}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                </a>
                <TestLinkButton lead={lead} platform={lead.channel || channel} />
              </div>
            )}

            {lead.fb_message_restricted && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                ✉️ Email Default
              </span>
            )}
          </div>
        ) : (
          /* Single channel (e.g. Instagram) */
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={
                lead.fb_message_restricted && !lead.link.includes('@')
                  ? `mailto:?subject=${encodeURIComponent(`Outreach: ${lead.name}`)}`
                  : formattedUrl
              }
              target={isMail ? '_self' : '_blank'}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors max-w-sm truncate group/link"
              title={`Open ${lead.platformLink || lead.link}`}
            >
              <span className="truncate">{lead.platformLink || lead.link}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover/link:opacity-100" />
            </a>
            <TestLinkButton lead={lead} platform={lead.channel || channel} />
            {lead.fb_message_restricted && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                ✉️ Email Default
              </span>
            )}
          </div>
        )}
      </td>

      {/* Action: ONLY Delete Button (🗑️) */}
      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => onDelete(lead.id)}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Delete lead (remaining IDs will re-sequence)"
            aria-label={`Delete ${lead.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function LeadsSubPage({ channel, leads, onUpdateLeads, onNavigateToChannel }: LeadsSubPageProps) {
  const [linkInput, setLinkInput] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingLink, setPendingLink] = useState('');
  const [pendingFb, setPendingFb] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicateAlert, setDuplicateAlert] = useState<{
    message: string;
    timestamp: number;
    detectedChannel?: MultiChannelType;
  } | null>(null);

  // Floating Action Button Centered Add Lead Modal state
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [modalLinkInput, setModalLinkInput] = useState('');
  const [modalFbInput, setModalFbInput] = useState('');
  const [modalEmailInput, setModalEmailInput] = useState('');
  const [modalNameInput, setModalNameInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [justAddedLeadId, setJustAddedLeadId] = useState<string | null>(null);

  // Batch Import Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchInputText, setBatchInputText] = useState('');
  const [batchError, setBatchError] = useState<string | null>(null);

  // Dual-Channel Link Editor Modal State
  const [editingLeadLinks, setEditingLeadLinks] = useState<ChannelLead | null>(null);
  const [editFbLink, setEditFbLink] = useState('');
  const [editEmailLink, setEditEmailLink] = useState('');
  const [editLinkError, setEditLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (!duplicateAlert) return;
    const timer = setTimeout(() => {
      setDuplicateAlert(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [duplicateAlert]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleOpenLinkEditor = (lead: ChannelLead) => {
    setEditingLeadLinks(lead);
    setEditFbLink(getLeadFacebook(lead) || (lead.link.includes('facebook') ? lead.link : ''));
    setEditEmailLink(getLeadEmail(lead) || (lead.link.includes('@') ? lead.link : ''));
    setEditLinkError(null);
  };

  const handleSaveLeadLinks = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeadLinks) return;

    const trimmedFb = editFbLink.trim();
    const trimmedEmail = editEmailLink.trim();

    if (!trimmedFb && !trimmedEmail) {
      setEditLinkError('Please provide at least a Facebook link or an Email address.');
      return;
    }

    // Check duplicate if newly introduced link conflicts with another lead
    if (trimmedFb) {
      const dup = leads.find((l) => l.id !== editingLeadLinks.id && findDuplicateLead(trimmedFb, [l]));
      if (dup) {
        setEditLinkError(`Facebook link already exists on lead ${dup.id} (${dup.name}).`);
        return;
      }
    }
    if (trimmedEmail) {
      const dup = leads.find((l) => l.id !== editingLeadLinks.id && findDuplicateLead(trimmedEmail, [l]));
      if (dup) {
        setEditLinkError(`Email address already exists on lead ${dup.id} (${dup.name}).`);
        return;
      }
    }

    const primary = trimmedFb || trimmedEmail || editingLeadLinks.link;
    const updated = leads.map((l) => {
      if (l.id === editingLeadLinks.id) {
        return {
          ...l,
          facebook: trimmedFb || undefined,
          email: trimmedEmail || undefined,
          link: primary,
          platformLink: primary,
        };
      }
      return l;
    });

    onUpdateLeads(updated);
    setEditingLeadLinks(null);
  };

  const handleBatchImportText = (rawText: string) => {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setBatchError('Please paste at least one lead link or line.');
      return;
    }

    let currentList = [...leads];
    let addedCount = 0;
    let duplicateCount = 0;

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length === 0 || !parts[0]) continue;

      let rawUrl = parts[0];
      let customName = '';
      let detectedFb: string | undefined = undefined;
      let detectedEmail: string | undefined = undefined;

      if (channel === 'combined') {
        for (const part of parts) {
          const ch = detectLinkChannel(part);
          if (ch === 'facebook' && !detectedFb) {
            detectedFb = part;
          } else if (ch === 'email' && !detectedEmail) {
            detectedEmail = part;
          } else if (!customName && !part.startsWith('http') && !part.includes('/') && !part.includes('@')) {
            customName = part;
          }
        }
        if (!detectedFb && !detectedEmail) {
          if (parts[0].includes('@')) detectedEmail = parts[0];
          else detectedFb = parts[0];
          customName = parts[1] || '';
        } else if (!customName && parts.length > 2) {
          customName = parts[parts.length - 1];
        }
        rawUrl = detectedFb || detectedEmail || parts[0];
      } else {
        customName = parts[1] || '';
      }

      // Strict duplicate check with full URL normalization across FB, Email, and primary link
      const duplicateFb = detectedFb ? findDuplicateLead(detectedFb, currentList) : undefined;
      const duplicateEmail = detectedEmail ? findDuplicateLead(detectedEmail, currentList) : undefined;
      const duplicateUrl = findDuplicateLead(rawUrl, currentList);

      if (duplicateFb || duplicateEmail || duplicateUrl) {
        duplicateCount++;
        continue;
      }

      const nextIdData = getNextLeadId(channel, currentList);
      const businessName = customName || extractSuggestedName(rawUrl);

      const draftLead: ChannelLead = {
        id: nextIdData.id,
        numericId: nextIdData.numericId,
        name: businessName,
        link: rawUrl,
        platformLink: rawUrl,
        facebook: detectedFb,
        email: detectedEmail,
        channel,
        sortOrder: currentList.length,
        createdAt: new Date().toISOString(),
      };
      const emailOnly = isEmailOnlyLead(draftLead);
      const newLead: ChannelLead = {
        ...draftLead,
        warmupStatus: emailOnly ? 'warmed' : 'locked',
        isWarmedUp: emailOnly,
      };

      currentList.push(newLead);
      addedCount++;
    }

    if (duplicateCount > 0) {
      playWarningChime();
      setDuplicateAlert({
        message: 'Lead already exists in the pipeline.',
        timestamp: Date.now(),
      });
    }

    if (addedCount > 0) {
      // Auto-schedule leads using Flat Capacity Model (4/day for Combined, 6/day for IG, skipping Sundays)
      const scheduled = autoScheduleLeads(currentList, channel);
      onUpdateLeads(scheduled);
      setBatchInputText('');
      setBatchError(null);
      setIsBatchModalOpen(false);
    } else if (duplicateCount > 0) {
      setBatchError('All pasted leads already exist in the pipeline.');
    }
  };

  const handleLinkInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkInput.trim();
    if (!trimmed) return;

    // Check if user pasted multi-line leads
    if (trimmed.includes('\n')) {
      handleBatchImportText(trimmed);
      setLinkInput('');
      return;
    }

    const validation = validateChannelLink(trimmed, channel);
    if (!validation.isValid) {
      playWarningChime();
      setDuplicateAlert({
        message: validation.errorMessage || 'Invalid link format for this channel.',
        timestamp: Date.now(),
        detectedChannel: validation.detectedChannel,
      });
      return;
    }

    // BUG 2 FIX: Strict duplicate check with normalization (https://, www., trailing slashes)
    const existingLead = findDuplicateLead(trimmed, leads);
    if (existingLead) {
      playWarningChime();
      setDuplicateAlert({
        message: 'Lead already exists in the pipeline.',
        timestamp: Date.now(),
      });
      return;
    }

    setDuplicateAlert(null);
    const suggested = extractSuggestedName(trimmed);
    setPendingLink(trimmed);
    setPendingName(suggested);

    if (channel === 'combined') {
      const chType = detectLinkChannel(trimmed);
      if (chType === 'facebook') {
        setPendingFb(trimmed);
        setPendingEmail('');
      } else if (chType === 'email') {
        setPendingEmail(trimmed);
        setPendingFb('');
      } else {
        setPendingFb(trimmed);
        setPendingEmail('');
      }
    }

    setShowNameModal(true);
  };

  const handleConfirmAddLead = (e: React.FormEvent) => {
    e.preventDefault();

    const leadLinkToValidate = channel === 'combined'
      ? (pendingFb.trim() || pendingEmail.trim() || pendingLink.trim())
      : pendingLink.trim();

    const validation = validateChannelLink(leadLinkToValidate, channel);
    if (!validation.isValid) {
      playWarningChime();
      setDuplicateAlert({
        message: validation.errorMessage || 'Invalid link format for this channel.',
        timestamp: Date.now(),
        detectedChannel: validation.detectedChannel,
      });
      setShowNameModal(false);
      return;
    }

    // Double check duplicate before saving
    if (pendingFb.trim()) {
      const existing = findDuplicateLead(pendingFb.trim(), leads);
      if (existing) {
        playWarningChime();
        setDuplicateAlert({ message: 'Lead already exists in the pipeline.', timestamp: Date.now() });
        setShowNameModal(false);
        return;
      }
    }
    if (pendingEmail.trim()) {
      const existing = findDuplicateLead(pendingEmail.trim(), leads);
      if (existing) {
        playWarningChime();
        setDuplicateAlert({ message: 'Lead already exists in the pipeline.', timestamp: Date.now() });
        setShowNameModal(false);
        return;
      }
    }

    const nextIdData = getNextLeadId(channel, leads);
    const businessName = pendingName.trim() || extractSuggestedName(leadLinkToValidate);
    const assignedDate = getNextAvailableScheduleDate(leads, channel);

    const draftLead: ChannelLead = {
      id: nextIdData.id,
      numericId: nextIdData.numericId,
      name: businessName,
      link: leadLinkToValidate,
      platformLink: leadLinkToValidate,
      facebook: channel === 'combined' && pendingFb.trim() ? pendingFb.trim() : undefined,
      email: channel === 'combined' && pendingEmail.trim() ? pendingEmail.trim() : undefined,
      channel,
      sortOrder: leads.length,
      createdAt: new Date().toISOString(),
      scheduledDate: assignedDate,
    };
    const emailOnly = isEmailOnlyLead(draftLead);
    const newLead: ChannelLead = {
      ...draftLead,
      warmupStatus: emailOnly ? 'warmed' : 'locked',
      isWarmedUp: emailOnly,
    };

    const nextLeads = [...leads, newLead];
    onUpdateLeads(nextLeads);

    setJustAddedLeadId(newLead.id);
    setTimeout(() => setJustAddedLeadId(null), 3000);

    setLinkInput('');
    setPendingLink('');
    setPendingFb('');
    setPendingEmail('');
    setPendingName('');
    setShowNameModal(false);
  };

  const handleModalAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    let businessName = modalNameInput.trim();
    let primaryLink = '';
    let fbLinkVal: string | undefined = undefined;
    let emailVal: string | undefined = undefined;

    if (channel === 'combined') {
      const fb = modalFbInput.trim();
      const em = modalEmailInput.trim();

      if (!fb && !em) {
        setModalError('Please enter at least a Facebook link or an Email address.');
        return;
      }

      if (fb) {
        const val = validateChannelLink(fb, 'facebook');
        if (!val.isValid) {
          setModalError(val.errorMessage || 'Invalid Facebook link.');
          return;
        }
        if (findDuplicateLead(fb, leads)) {
          setModalError('Facebook link already exists in the pipeline.');
          return;
        }
        fbLinkVal = fb;
      }

      if (em) {
        const val = validateChannelLink(em, 'email');
        if (!val.isValid) {
          setModalError(val.errorMessage || 'Invalid Email address.');
          return;
        }
        if (findDuplicateLead(em, leads)) {
          setModalError('Email address already exists in the pipeline.');
          return;
        }
        emailVal = em;
      }

      primaryLink = fbLinkVal || emailVal || '';
      businessName = businessName || extractSuggestedName(primaryLink);
    } else {
      const trimmedLink = modalLinkInput.trim();
      if (!trimmedLink) {
        setModalError('Please enter a valid prospect URL or handle.');
        return;
      }

      const validation = validateChannelLink(trimmedLink, channel);
      if (!validation.isValid) {
        playWarningChime();
        setModalError(validation.errorMessage || 'Invalid link for this channel.');
        return;
      }

      const existing = findDuplicateLead(trimmedLink, leads);
      if (existing) {
        playWarningChime();
        setDuplicateAlert({
          message: 'Lead already exists in the pipeline.',
          timestamp: Date.now(),
        });
        setModalError('Lead already exists in the pipeline.');
        return;
      }

      primaryLink = trimmedLink;
      businessName = businessName || extractSuggestedName(trimmedLink);
    }

    const nextIdData = getNextLeadId(channel, leads);
    const assignedDate = getNextAvailableScheduleDate(leads, channel);

    const draftLead: ChannelLead = {
      id: nextIdData.id,
      numericId: nextIdData.numericId,
      name: businessName,
      link: primaryLink,
      platformLink: primaryLink,
      facebook: fbLinkVal,
      email: emailVal,
      channel,
      sortOrder: leads.length,
      createdAt: new Date().toISOString(),
      scheduledDate: assignedDate,
    };
    const emailOnly = isEmailOnlyLead(draftLead);
    const newLead: ChannelLead = {
      ...draftLead,
      warmupStatus: emailOnly ? 'warmed' : 'locked',
      isWarmedUp: emailOnly,
    };

    onUpdateLeads([...leads, newLead]);

    setJustAddedLeadId(newLead.id);
    setTimeout(() => setJustAddedLeadId(null), 3000);

    setIsAddLeadModalOpen(false);
    setModalLinkInput('');
    setModalFbInput('');
    setModalEmailInput('');
    setModalNameInput('');
  };

  const handleToggleFbRestricted = (id: string) => {
    const updated = leads.map((l) =>
      l.id === id ? { ...l, fb_message_restricted: !l.fb_message_restricted } : l
    );
    onUpdateLeads(updated);
  };

  const handleRouteToEmail = (lead: ChannelLead) => {
    try {
      const emailLeads = loadChannelLeads('email');
      const nextIdData = getNextLeadId('email', emailLeads);
      const newEmailLead: ChannelLead = {
        ...lead,
        id: nextIdData.id,
        numericId: nextIdData.numericId,
        channel: 'email',
        notes: `${lead.notes ? lead.notes + ' | ' : ''}Auto-routed from FB (message button restricted)`,
        fb_message_restricted: true,
        scheduledDate: undefined,
      };
      saveChannelLeads('email', [...emailLeads, newEmailLead]);

      const updated = leads.map((l) =>
        l.id === lead.id
          ? { ...l, fb_message_restricted: true, notes: 'Routed to Email pipeline' }
          : l
      );
      onUpdateLeads(updated);

      setDuplicateAlert({
        message: `✅ Routed "${lead.name}" to Email Outreach Pipeline (${newEmailLead.id})!`,
        timestamp: Date.now(),
        detectedChannel: 'email',
      });
    } catch (err) {
      console.error('Failed to route lead to email:', err);
    }
  };

  const handleDeleteLead = (id: string) => {
    const filtered = leads.filter((l) => l.id !== id);
    const resequenced = resequenceLeadIds(filtered, channel);
    onUpdateLeads(resequenced);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = leads.findIndex((item) => item.id === active.id);
    const newIndex = leads.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(leads, oldIndex, newIndex).map((item, index) => ({
        ...item,
        sortOrder: index,
      }));
      onUpdateLeads(reordered);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.id.toLowerCase().includes(q) ||
      l.name.toLowerCase().includes(q) ||
      l.link.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert for Duplicate Link or Channel Mismatch */}
      {duplicateAlert && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-5 right-5 z-50 max-w-lg w-[calc(100vw-2.5rem)] rounded-2xl border border-rose-500/50 bg-rose-950/95 p-4 text-xs sm:text-sm font-semibold text-rose-100 shadow-2xl shadow-rose-950/60 backdrop-blur-md animate-in slide-in-from-top-3 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="leading-snug">{duplicateAlert.message}</p>
            {duplicateAlert.detectedChannel && onNavigateToChannel && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToChannel(duplicateAlert.detectedChannel!);
                  setDuplicateAlert(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <span>Switch to {getChannelLabel(duplicateAlert.detectedChannel)} Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDuplicateAlert(null)}
            className="text-rose-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Intake & Search Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 sm:p-5 backdrop-blur-sm shadow-xl space-y-4">
        <form onSubmit={handleLinkInputSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <LinkIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder={channel === 'combined' ? 'Paste Facebook link, profile URL, or email address, then press Enter...' : `Paste ${getChannelLabel(channel)} profile link or handle, then press Enter...`}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              disabled={!linkInput.trim()}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Add Lead</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBatchInputText('');
                setBatchError(null);
                setIsBatchModalOpen(true);
              }}
              className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 border border-white/10"
              title="Batch import multiple leads"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Batch Import</span>
            </button>
          </div>
        </form>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-white/[0.04]">
          <div className="relative flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads by name, ID, or link..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/50 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Export Dropdown */}
          <div className="relative self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={leads.length === 0}
              className="px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-slate-900 p-1 shadow-2xl z-30 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      exportChannelData(channel, 'csv', leads);
                      setShowExportMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left rounded-lg hover:bg-white/10 text-slate-200 hover:text-white flex items-center gap-2 transition"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Download CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportChannelData(channel, 'json', leads);
                      setShowExportMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left rounded-lg hover:bg-white/10 text-slate-200 hover:text-white flex items-center gap-2 transition"
                  >
                    <FileCode className="w-4 h-4 text-indigo-400" />
                    <span>Download JSON</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Simplified Table: ID, Name, Link, Delete ONLY */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 text-left w-32">ID</th>
                  <th className="py-3 px-4 text-left">Prospect Name</th>
                  <th className="py-3 px-4 text-left">
                    {channel === 'combined' ? 'Profile Links (FB / Email)' : 'Profile Link'}
                  </th>
                  <th className="py-3 px-4 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-slate-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <p className="text-sm font-medium text-slate-400">No leads in {getChannelLabel(channel)} yet</p>
                        <p className="text-xs text-slate-500">
                          {channel === 'combined'
                            ? 'Paste Facebook link or email address above and press Enter to intake your first dual-channel lead.'
                            : 'Paste any link or handle above and press Enter to instantly intake your first lead.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500 text-xs">
                      No leads match "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  <SortableContext
                    items={filteredLeads.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredLeads.map((lead) => (
                      <SortableLeadRow
                        key={lead.id}
                        lead={lead}
                        channel={channel}
                        onDelete={handleDeleteLead}
                        onToggleFbRestricted={channel === 'facebook' || channel === 'combined' ? handleToggleFbRestricted : undefined}
                        onRouteToEmail={channel === 'facebook' ? handleRouteToEmail : undefined}
                        onEditLinks={channel === 'combined' ? handleOpenLinkEditor : undefined}
                        isJustAdded={lead.id === justAddedLeadId}
                      />
                    ))}
                  </SortableContext>
                )}
              </tbody>
            </table>
          </DndContext>
        </div>

        {leads.length > 0 && (
          <div className="px-4 py-3 bg-slate-950/40 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>
              Total leads: <strong className="text-slate-200 font-mono">{leads.length}</strong>
            </span>
            <span className="text-[11px] text-slate-500">
              Drag rows by handle icon to reorder priority
            </span>
          </div>
        )}
      </div>

      {/* Business Name Prompt Modal (Upon Link Paste) */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">
                {channel === 'combined' ? 'Confirm Dual-Channel Lead' : 'Confirm Business Name'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {channel === 'combined'
                  ? 'Verify prospect name and channel links. Facebook will be used for warm-up, and Email for dispatch.'
                  : 'Enter or verify the name for this prospect. It will be assigned to the next available ID.'}
              </p>
            </div>

            <form onSubmit={handleConfirmAddLead} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Business / Prospect Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  placeholder="e.g. Michel's at the Colony Surf"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {channel === 'combined' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-sky-300 mb-1 flex items-center gap-1.5">
                      <Facebook className="w-3.5 h-3.5 text-sky-400" />
                      <span>Facebook Profile / Page URL (For Warm-Up)</span>
                    </label>
                    <input
                      type="text"
                      value={pendingFb}
                      onChange={(e) => setPendingFb(e.target.value)}
                      placeholder="e.g. facebook.com/michels_colony_surf"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-indigo-300 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Email Address (For Pitch Dispatch)</span>
                    </label>
                    <input
                      type="email"
                      value={pendingEmail}
                      onChange={(e) => setPendingEmail(e.target.value)}
                      placeholder="e.g. contact@michels.com"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs space-y-1">
                  <span className="text-slate-400">Intake Link:</span>
                  <p className="font-mono text-indigo-300 truncate">{pendingLink}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNameModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button Add Lead Modal */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">
                  Quick Intake
                </span>
                <h3 className="text-xl font-black text-white font-['Outfit'] mt-0.5">
                  Add New {getChannelLabel(channel)} Lead
                </h3>
                {channel === 'combined' && (
                  <p className="text-xs text-slate-400 mt-1">
                    Dual-channel workflow: Add Facebook for warm-up, and Email for dispatch.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsAddLeadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleModalAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Business / Contact Name
                </label>
                <input
                  type="text"
                  autoFocus={channel !== 'combined'}
                  value={modalNameInput}
                  onChange={(e) => setModalNameInput(e.target.value)}
                  placeholder="e.g. Michel's at the Colony Surf"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {channel === 'combined' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-sky-300 mb-1.5 flex items-center gap-1.5">
                      <Facebook className="w-3.5 h-3.5 text-sky-400" />
                      <span>Facebook Profile Link (Used for Warm-Up)</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={modalFbInput}
                      onChange={(e) => {
                        setModalFbInput(e.target.value);
                        if (!modalNameInput && e.target.value) {
                          setModalNameInput(extractSuggestedName(e.target.value));
                        }
                      }}
                      placeholder="e.g. facebook.com/michelscolonysurf"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-indigo-300 mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Email Address (Used for Dispatch)</span>
                    </label>
                    <input
                      type="email"
                      value={modalEmailInput}
                      onChange={(e) => {
                        setModalEmailInput(e.target.value);
                        if (!modalNameInput && !modalFbInput && e.target.value) {
                          setModalNameInput(extractSuggestedName(e.target.value));
                        }
                      }}
                      placeholder="e.g. contact@michels.com"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Prospect Link / Handle <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      value={modalLinkInput}
                      onChange={(e) => {
                        setModalLinkInput(e.target.value);
                        if (!modalNameInput) {
                          setModalNameInput(extractSuggestedName(e.target.value));
                        }
                      }}
                      placeholder={`e.g. instagram.com/restaurant_handle`}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dual-Channel Link Editor Modal (Add/Edit FB or Email on any lead) */}
      {editingLeadLinks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">
                  Dual-Channel Channels
                </span>
                <h3 className="text-xl font-black text-white font-['Outfit'] mt-0.5">
                  Edit Links: {editingLeadLinks.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Facebook is used for warm-up today; Email is used for dispatch tomorrow.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLeadLinks(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editLinkError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{editLinkError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLeadLinks} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-sky-300 mb-1.5 flex items-center gap-1.5">
                  <Facebook className="w-3.5 h-3.5 text-sky-400" />
                  <span>Facebook Profile / Page URL (For Warm-Up)</span>
                </label>
                <input
                  type="text"
                  value={editFbLink}
                  onChange={(e) => setEditFbLink(e.target.value)}
                  placeholder="e.g. facebook.com/michels_restaurant"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Email Address (For Dispatch)</span>
                </label>
                <input
                  type="email"
                  value={editEmailLink}
                  onChange={(e) => setEditEmailLink(e.target.value)}
                  placeholder="e.g. manager@michels.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLeadLinks(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Save Channel Links</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">
                  Batch Pipeline Intake
                </span>
                <h3 className="text-xl font-black text-white font-['Outfit'] mt-0.5">
                  Import {getChannelLabel(channel)} Leads
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Paste links line-by-line (format: <code className="text-indigo-300">URL</code> or <code className="text-indigo-300">URL, Business Name</code>).
                  Duplicates are strictly blocked, and new leads are auto-scheduled skipping Sundays.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {batchError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{batchError}</span>
              </div>
            )}

            <div className="space-y-4">
              <textarea
                rows={8}
                value={batchInputText}
                onChange={(e) => {
                  setBatchInputText(e.target.value);
                  setBatchError(null);
                }}
                placeholder={
                  channel === 'instagram'
                    ? "https://instagram.com/restaurant_one, Restaurant One\n@restaurant_two\nhttps://instagram.com/restaurant_three"
                    : "https://facebook.com/bistro_one, Bistro One\ncontact@grillhouse.com, Grill House\nhttps://facebook.com/cafe_three"
                }
                className="w-full p-3.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />

              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">⚡ Auto-Scheduler Rules Enforced:</p>
                <p>• {channel === 'instagram' ? 'Daily quota: 6 leads / day' : 'Daily quota: 4 leads / day'}</p>
                <p>• Sundays skipped completely (first date starts Monday if today is Sunday)</p>
                <p>• Strict duplicate check prevents duplicate imports</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchImportText(batchInputText)}
                  disabled={!batchInputText.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import & Auto-Schedule</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Lead Circular Button */}
      <div className="fixed bottom-20 right-6 sm:bottom-24 sm:right-8 z-40">
        <button
          type="button"
          onClick={() => {
            setModalLinkInput('');
            setModalNameInput('');
            setModalError(null);
            setIsAddLeadModalOpen(true);
          }}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white shadow-2xl shadow-indigo-950/80 hover:shadow-indigo-500/50 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer border border-indigo-400/40 group"
          title={`Add new ${getChannelLabel(channel)} lead`}
          aria-label={`Add new ${getChannelLabel(channel)} lead`}
        >
          <Plus className="w-7 h-7 text-white group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>
    </div>
  );
}
