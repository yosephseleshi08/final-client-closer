import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  Tag,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Instagram,
  Facebook,
  FileText,
  Calendar,
  Layers,
  Edit3,
  Save,
  Link2,
  Trash2,
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { getDefaultStagedMessages } from '../utils/stagedMessageHelper';
import { MockupVault } from './MockupVault';
import { LeadScreenshotVault } from './LeadScreenshotVault';
import { Sparkles, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface LeadDetailsModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateLead?: (updatedLead: Lead) => void;
  onSelectForCopilot?: (lead: Lead) => void;
  onDeleteLead?: (leadId: number) => void;
}

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  lead,
  isOpen,
  onClose,
  onUpdateLead,
  onSelectForCopilot,
  onDeleteLead,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'screenshots' | 'mockups'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Editable Form State
  const [editPlatform, setEditPlatform] = useState<Lead['platform']>(lead?.platform || 'Instagram');
  const [editName, setEditName] = useState(lead?.restaurantName || '');
  const [editContact, setEditContact] = useState(lead?.contactName || '');
  const [editLink, setEditLink] = useState(lead?.profileUrl || lead?.handle || lead?.website || '');
  const [editPhone, setEditPhone] = useState(lead?.phone || '');
  const [editEmail, setEditEmail] = useState(lead?.email || '');
  const [editCity, setEditCity] = useState(lead?.city || '');
  const [editAddress, setEditAddress] = useState(lead?.address || '');
  const [editNotes, setEditNotes] = useState(lead?.notes || '');
  const [editServices, setEditServices] = useState(lead?.services?.join(', ') || '');
  const [editStatus, setEditStatus] = useState<LeadStatus>(lead?.status || 'sent');
  const [editDealValue, setEditDealValue] = useState<number>(lead?.estimatedDealValue || 299);

  // Staged Message Sequence State
  const defaults = lead ? getDefaultStagedMessages(lead) : { stagedDmMiniPitch: '', stagedFollowup1: '', stagedFollowup2: '', stagedFollowup3: '' };
  const [editStagedDm, setEditStagedDm] = useState(lead?.pitchHook || lead?.stagedDmMiniPitch || defaults.stagedDmMiniPitch);
  const [editStagedFu1, setEditStagedFu1] = useState(lead?.stagedFollowup1 || defaults.stagedFollowup1);
  const [editStagedFu2, setEditStagedFu2] = useState(lead?.stagedFollowup2 || defaults.stagedFollowup2);
  const [editStagedFu3, setEditStagedFu3] = useState(lead?.stagedFollowup3 || defaults.stagedFollowup3);

  // Quick Inline Pitch Editing State in View Mode
  const [editingPitchInline, setEditingPitchInline] = useState(false);
  const [inlinePitchText, setInlinePitchText] = useState(lead?.pitchHook || lead?.stagedDmMiniPitch || defaults.stagedDmMiniPitch);

  // Sync state when lead changes
  useEffect(() => {
    if (lead) {
      const defs = getDefaultStagedMessages(lead);
      setEditPlatform(lead.platform || 'Instagram');
      setEditName(lead.restaurantName || '');
      setEditContact(lead.contactName || '');
      setEditLink(lead.profileUrl || lead.handle || lead.website || '');
      setEditPhone(lead.phone || '');
      setEditEmail(lead.email || '');
      setEditCity(lead.city || '');
      setEditAddress(lead.address || '');
      setEditNotes(lead.notes || '');
      setEditServices(lead.services?.join(', ') || '');
      setEditStatus(lead.status || 'sent');
      setEditDealValue(lead.estimatedDealValue || 299);
      setEditStagedDm(lead.pitchHook || lead.stagedDmMiniPitch || defs.stagedDmMiniPitch);
      setEditStagedFu1(lead.stagedFollowup1 || defs.stagedFollowup1);
      setEditStagedFu2(lead.stagedFollowup2 || defs.stagedFollowup2);
      setEditStagedFu3(lead.stagedFollowup3 || defs.stagedFollowup3);
      setInlinePitchText(lead.pitchHook || lead.stagedDmMiniPitch || defs.stagedDmMiniPitch);
      setEditingPitchInline(false);
      setIsEditing(false);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleQuickChangePage = (newPage: 'Instagram' | 'Facebook' | 'Email') => {
    if (!onUpdateLead || !lead) return;
    setEditPlatform(newPage);
    onUpdateLead({
      ...lead,
      platform: newPage,
    });
  };

  const handleSaveChanges = () => {
    if (!onUpdateLead) return;

    const formattedServices = editServices
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: Lead = {
      ...lead,
      platform: editPlatform,
      restaurantName: editName.trim() || lead.restaurantName,
      isCustomName: true,
      contactName: editContact.trim() || undefined,
      profileUrl: editLink.trim() || undefined,
      handle: editLink.trim() || lead.handle,
      phone: editPhone.trim() || undefined,
      email: editEmail.trim() || undefined,
      city: editCity.trim() || lead.city,
      address: editAddress.trim() || undefined,
      notes: editNotes.trim(),
      services: formattedServices.length > 0 ? formattedServices : undefined,
      status: editStatus,
      estimatedDealValue: editDealValue || 299,
      stagedDmMiniPitch: editStagedDm.trim(),
      stagedFollowup1: editStagedFu1.trim(),
      stagedFollowup2: editStagedFu2.trim(),
      stagedFollowup3: editStagedFu3.trim(),
      pitchHook: editStagedDm.trim(),
    };

    onUpdateLead(updated);
    setIsEditing(false);
  };

  const storedLink = lead.profileUrl || lead.handle || lead.website || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-300">
                {lead.platform} Lead #{lead.id}
              </span>
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 uppercase">
                {lead.status.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white">{lead.restaurantName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lead.city} • Contact: <span className="text-slate-200 font-semibold">{lead.contactName || 'Owner / Decision Maker'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onUpdateLead && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  isEditing
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{isEditing ? 'Cancel Edit' : 'Edit Details'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Overview & Pitch / Screenshot Vault / Prototype Mockups) */}
        {!isEditing && (
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Overview & Pitch</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('screenshots')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'screenshots'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5 text-indigo-300" />
              <span>Screenshots Vault</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'screenshots' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'
                }`}
              >
                {lead.leadScreenshots?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mockups')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'mockups'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Prototype Mockups (2)</span>
              {(lead.mockupImage1 || lead.mockupImage2) && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>
        )}

        {/* Edit Mode vs View Mode */}
        {isEditing ? (
          /* Manual Edit Form */
          <div className="space-y-4 pt-1">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300 font-medium">
              Update manual details and choose what page to store this lead in below.
            </div>

            {/* Choose Stored Page / Destination Channel */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <span>Choose Page to Store This Lead In:</span>
                </label>
                <span className="text-[11px] font-semibold text-indigo-300">
                  Target: <strong className="text-white uppercase">{editPlatform} Leads Page</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEditPlatform('Instagram')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                    editPlatform === 'Instagram'
                      ? 'border-pink-500 bg-pink-500/20 text-white shadow-md shadow-pink-500/20 ring-1 ring-pink-500/40'
                      : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Instagram className="h-4 w-4 text-pink-400" />
                  <span>Instagram Page</span>
                  {editPlatform === 'Instagram' && <Check className="h-3.5 w-3.5 text-pink-400 ml-auto" />}
                </button>

                <button
                  type="button"
                  onClick={() => setEditPlatform('Facebook')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                    editPlatform === 'Facebook'
                      ? 'border-blue-500 bg-blue-500/20 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-500/40'
                      : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Facebook className="h-4 w-4 text-blue-400" />
                  <span>Facebook Page</span>
                  {editPlatform === 'Facebook' && <Check className="h-3.5 w-3.5 text-blue-400 ml-auto" />}
                </button>

                <button
                  type="button"
                  onClick={() => setEditPlatform('Email')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                    editPlatform === 'Email' || editPlatform === 'Website'
                      ? 'border-emerald-500 bg-emerald-500/20 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/40'
                      : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Mail className="h-4 w-4 text-emerald-400" />
                  <span>Email Page</span>
                  {(editPlatform === 'Email' || editPlatform === 'Website') && <Check className="h-3.5 w-3.5 text-emerald-400 ml-auto" />}
                </button>
              </div>
            </div>

            {/* Stored Link Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5 text-indigo-400" />
                Stored Link (Profile URL / Handle / Website)
              </label>
              <input
                type="text"
                value={editLink}
                onChange={(e) => setEditLink(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/90 py-2 px-3 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Contact / Decision Maker
                </label>
                <input
                  type="text"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  City / State
                </label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as LeadStatus)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="not_sent">Not Sent</option>
                  <option value="sent">Sent</option>
                  <option value="seen">Seen</option>
                  <option value="replied">Replied</option>
                  <option value="mockup_sent">Mockup Sent</option>
                  <option value="call_booked">Call Booked</option>
                  <option value="proposal_sent">Proposal Sent</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_dead">Closed Dead</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Services & Offerings (Comma separated)
              </label>
              <input
                type="text"
                value={editServices}
                onChange={(e) => setEditServices(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Manual Notes & Conversation History
              </label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Stored Message Vault Section in Edit Mode */}
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-400" />
                  Pre-Staged Outreach Messages Vault
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const defs = getDefaultStagedMessages({
                      ...lead,
                      restaurantName: editName || lead.restaurantName,
                      contactName: editContact || lead.contactName,
                    });
                    setEditStagedDm(defs.stagedDmMiniPitch);
                    setEditStagedFu1(defs.stagedFollowup1);
                    setEditStagedFu2(defs.stagedFollowup2);
                    setEditStagedFu3(defs.stagedFollowup3);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 hover:text-white transition cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Pre-Fill Standard Copy</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  1. Initial DM Pitch (Day 0)
                </label>
                <textarea
                  rows={2}
                  value={editStagedDm}
                  onChange={(e) => setEditStagedDm(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/90 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  2. Follow-Up #1 (Day +3 Quick Check)
                </label>
                <textarea
                  rows={2}
                  value={editStagedFu1}
                  onChange={(e) => setEditStagedFu1(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/90 p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  3. Follow-Up #2 (Day +7 Loom Video Offer)
                </label>
                <textarea
                  rows={2}
                  value={editStagedFu2}
                  onChange={(e) => setEditStagedFu2(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/90 p-2.5 text-xs text-white focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  4. Follow-Up #3 (Day +14 Breakup / Scarcity)
                </label>
                <textarea
                  rows={2}
                  value={editStagedFu3}
                  onChange={(e) => setEditStagedFu3(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/90 p-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
              {onDeleteLead ? (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteLead(lead.id);
                    onClose();
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                    editStatus === 'closed_dead' || lead.status === 'closed_dead'
                      ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-600 hover:text-white'
                      : 'border-white/10 bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{editStatus === 'closed_dead' || lead.status === 'closed_dead' ? 'Trash Dead Lead' : 'Delete Lead'}</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-lg transition cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Lead Details</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* View Mode */
          <>
            {/* Tab 2: General Screenshot & Media Vault (isolated from prototype mockups) */}
            {activeTab === 'screenshots' && (
              <LeadScreenshotVault
                lead={lead}
                onUpdateLead={(updated) => {
                  if (onUpdateLead) onUpdateLead(updated);
                }}
              />
            )}

            {/* Tab 3: Prototype Demo Mockups (2 Slots) */}
            {activeTab === 'mockups' && (
              <div className="rounded-2xl border border-purple-500/30 bg-purple-950/15 p-4 shadow-xl">
                <MockupVault
                  lead={lead}
                  onUpdateLead={(updates) => {
                    if (onUpdateLead) onUpdateLead({ ...lead, ...updates });
                  }}
                />
              </div>
            )}

            {/* Tab 1: Overview & Stored Pitch / Message Sequence / Details */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Quick Page / Channel Mover in View Mode */}
                <div className="rounded-2xl border border-indigo-500/30 bg-slate-950/80 p-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-400" />
                      <span>Choose Lead Stored Page:</span>
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-300">
                      Currently in: <strong className="text-white uppercase tracking-wide">{lead.platform} Leads Page</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickChangePage('Instagram')}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                        lead.platform === 'Instagram'
                          ? 'border-pink-500 bg-pink-500/20 text-white shadow-md shadow-pink-500/20 ring-1 ring-pink-500/40'
                          : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Instagram className="h-4 w-4 text-pink-400" />
                      <span>Instagram Page</span>
                      {lead.platform === 'Instagram' && <Check className="h-3.5 w-3.5 text-pink-400 ml-auto" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickChangePage('Facebook')}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                        lead.platform === 'Facebook'
                          ? 'border-blue-500 bg-blue-500/20 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-500/40'
                          : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Facebook className="h-4 w-4 text-blue-400" />
                      <span>Facebook Page</span>
                      {lead.platform === 'Facebook' && <Check className="h-3.5 w-3.5 text-blue-400 ml-auto" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickChangePage('Email')}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition cursor-pointer ${
                        lead.platform === 'Email' || lead.platform === 'Website'
                          ? 'border-emerald-500 bg-emerald-500/20 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/40'
                          : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Mail className="h-4 w-4 text-emerald-400" />
                      <span>Email Page</span>
                      {(lead.platform === 'Email' || lead.platform === 'Website') && <Check className="h-3.5 w-3.5 text-emerald-400 ml-auto" />}
                    </button>
                  </div>
                </div>

                {/* Stored Link Spotlight */}
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 max-w-md">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                      <Link2 className="h-3.5 w-3.5" />
                      Stored Profile / Page Link
                    </span>
                    <p className="text-xs sm:text-sm font-mono text-white truncate">
                      {storedLink || 'No direct link stored yet'}
                    </p>
                  </div>

                  {storedLink && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(storedLink, 'link')}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
                      >
                        {copiedField === 'link' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>Copy Link</span>
                      </button>
                      <a
                        href={storedLink.startsWith('http') || storedLink.startsWith('mailto:') ? storedLink : `https://${storedLink}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open Link</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Quick Access to Screenshots & Prototype Mockups */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setActiveTab('screenshots')}
                    className="p-3.5 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 hover:bg-indigo-950/40 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                          Screenshots Vault
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {lead.leadScreenshots?.length || 0} screenshot{lead.leadScreenshots?.length === 1 ? '' : 's'} stored
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-400 group-hover:underline">Open Vault &rarr;</span>
                  </div>

                  <div
                    onClick={() => setActiveTab('mockups')}
                    className="p-3.5 rounded-2xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-950/40 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                          Prototype Mockups
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {lead.mockupImage1 || lead.mockupImage2 ? '2 slots active' : '2 demo slots empty'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-purple-400 group-hover:underline">Open &rarr;</span>
                  </div>
                </div>

            {/* Stored Message Vault Spotlight in View Mode */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  Stored Outreach Message Store (Vault)
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 hover:text-white transition cursor-pointer"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Customize Vault</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {/* Initial DM Pitch with Inline Quick Edit */}
                <div className="rounded-xl border border-indigo-500/20 bg-slate-900/90 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <span>Initial Outreach Pitch (Day 0)</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {!editingPitchInline && (
                        <button
                          type="button"
                          onClick={() => {
                            setInlinePitchText(lead.pitchHook || lead.stagedDmMiniPitch || defaults.stagedDmMiniPitch);
                            setEditingPitchInline(true);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-white transition cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/20"
                        >
                          <Edit3 className="h-2.5 w-2.5" />
                          <span>Edit Pitch</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(lead.pitchHook || lead.stagedDmMiniPitch || defaults.stagedDmMiniPitch, 'stage-0')}
                        className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-white transition cursor-pointer"
                      >
                        {copiedField === 'stage-0' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedField === 'stage-0' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {editingPitchInline ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={inlinePitchText}
                        onChange={(e) => setInlinePitchText(e.target.value)}
                        placeholder="Customize what you message this lead..."
                        className="w-full rounded-xl border border-indigo-500/40 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
                      />
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 text-[10px]">
                          {inlinePitchText.trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingPitchInline(false)}
                            className="rounded-lg border border-white/10 px-2.5 py-1 text-slate-400 hover:text-white transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateLead) {
                                onUpdateLead({
                                  ...lead,
                                  pitchHook: inlinePitchText.trim(),
                                  stagedDmMiniPitch: inlinePitchText.trim(),
                                });
                              }
                              setEditingPitchInline(false);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1 font-bold text-white shadow-sm transition cursor-pointer"
                          >
                            <Save className="h-3 w-3" />
                            <span>Save Pitch</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 font-sans leading-relaxed select-all">
                      {lead.pitchHook || lead.stagedDmMiniPitch || defaults.stagedDmMiniPitch}
                    </p>
                  )}
                </div>

                {/* Follow-up Touchpoints #1, #2, #3 */}
                {[
                  { label: 'Follow-Up #1 (Day +3 Quick Check)', text: lead.stagedFollowup1 || defaults.stagedFollowup1, tag: 'Day +3' },
                  { label: 'Follow-Up #2 (Day +7 Loom Video Offer)', text: lead.stagedFollowup2 || defaults.stagedFollowup2, tag: 'Day +7' },
                  { label: 'Follow-Up #3 (Day +14 Breakup Scarcity)', text: lead.stagedFollowup3 || defaults.stagedFollowup3, tag: 'Day +14' },
                ].map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-white/5 bg-slate-900/90 p-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-300">{item.label}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.text, `stage-${idx + 1}`)}
                        className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-white transition cursor-pointer"
                      >
                        {copiedField === `stage-${idx + 1}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedField === `stage-${idx + 1}` ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed select-all">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Phone */}
              <div className="p-3.5 rounded-2xl border border-white/5 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Phone</p>
                    <p className="text-xs font-bold text-white">
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="hover:text-indigo-300">
                          {lead.phone}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </p>
                  </div>
                </div>
                {lead.phone && (
                  <button
                    onClick={() => copyToClipboard(lead.phone!, 'phone')}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    {copiedField === 'phone' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              {/* Email */}
              <div className="p-3.5 rounded-2xl border border-white/5 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="truncate max-w-[170px]">
                    <p className="text-[11px] text-slate-400 font-medium">Email</p>
                    <p className="text-xs font-bold text-white truncate">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="hover:text-purple-300">
                          {lead.email}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </p>
                  </div>
                </div>
                {lead.email && (
                  <button
                    onClick={() => copyToClipboard(lead.email!, 'email')}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    {copiedField === 'email' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              {/* Location / Address */}
              <div className="p-3.5 rounded-2xl border border-white/5 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Address</p>
                    <p className="text-xs font-bold text-white">
                      {lead.address || lead.city || 'Not specified'}
                    </p>
                  </div>
                </div>
                {(lead.address || lead.city) && (
                  <button
                    onClick={() => copyToClipboard(lead.address || lead.city, 'address')}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    {copiedField === 'address' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              {/* Estimated Value & Stage */}
              <div className="p-3.5 rounded-2xl border border-white/5 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Deal Value &amp; Stage</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-bold text-white">${lead.estimatedDealValue || 299}</span>
                      <span className="text-slate-500">•</span>
                      {onUpdateLead ? (
                        <select
                          value={lead.status}
                          onChange={(e) => onUpdateLead({ ...lead, status: e.target.value as LeadStatus })}
                          className="rounded-lg border border-white/10 bg-slate-900 px-2 py-0.5 text-xs font-bold text-emerald-400 uppercase cursor-pointer focus:outline-none focus:border-indigo-500"
                        >
                          <option value="not_sent">Not Sent</option>
                          <option value="sent">Sent</option>
                          <option value="seen">Seen</option>
                          <option value="replied">Replied</option>
                          <option value="mockup_sent">Mockup Sent</option>
                          <option value="call_booked">Call Booked</option>
                          <option value="proposal_sent">Proposal Sent</option>
                          <option value="closed_won">Closed Won</option>
                          <option value="closed_dead">Closed Dead</option>
                        </select>
                      ) : (
                        <span className="uppercase text-emerald-400 font-bold text-xs">{lead.status.replace('_', ' ')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Services & Highlights */}
            {lead.services && lead.services.length > 0 && (
              <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-pink-400" />
                  <span>Services & Offerings</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {lead.services.map((item, idx) => (
                    <span key={idx} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Manual Notes & Context</h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {lead.notes || 'No manual notes recorded.'}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/10">
              {onDeleteLead ? (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteLead(lead.id);
                    onClose();
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                    lead.status === 'closed_dead'
                      ? 'border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white shadow-sm'
                      : 'border-white/10 bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{lead.status === 'closed_dead' ? 'Trash Dead Lead' : 'Delete Lead'}</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2.5">
                {onSelectForCopilot && (
                  <button
                    onClick={() => {
                      onSelectForCopilot(lead);
                      onClose();
                    }}
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition cursor-pointer"
                  >
                    Open in Follow-Up Copilot
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
