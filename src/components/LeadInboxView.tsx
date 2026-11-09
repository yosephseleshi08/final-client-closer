import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  Inbox,
  Sparkles,
  FileText,
  AlertCircle,
  Trash2,
  Instagram,
  Facebook,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { InboxLead, MultiChannelType, ChannelLead } from '../types';
import {
  loadInboxLeads,
  saveInboxLeads,
  parseQualifiedLeadsJson,
  acceptInboxLeadIntoCrm,
  removeInboxLead,
  clearAllInboxLeads,
} from '../utils/inboxStorage';
import { getPlatformLink } from '../utils/channelStorage';
import { TestLinkButton } from './TestLinkButton';

interface LeadInboxViewProps {
  onLeadAccepted?: (targetChannel: MultiChannelType, updatedLeads: ChannelLead[]) => void;
  onNavigateToChannel?: (channel: MultiChannelType) => void;
  // Optional preloaded channel leads
  channelLeads?: {
    combined?: ChannelLead[];
    instagram?: ChannelLead[];
    facebook?: ChannelLead[];
    email?: ChannelLead[];
  };
}

interface ToastMessage {
  id: number;
  text: string;
  type: 'accept' | 'reject' | 'info' | 'error';
}

export const LeadInboxView: React.FC<LeadInboxViewProps> = ({
  onLeadAccepted,
  onNavigateToChannel,
  channelLeads,
}) => {
  const [inboxLeads, setInboxLeads] = useState<InboxLead[]>(() => loadInboxLeads());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when storage changes across tabs or windows
  useEffect(() => {
    const handleInboxChange = () => {
      setInboxLeads(loadInboxLeads());
    };
    window.addEventListener('inbox_leads_changed', handleInboxChange);
    window.addEventListener('storage', handleInboxChange);
    return () => {
      window.removeEventListener('inbox_leads_changed', handleInboxChange);
      window.removeEventListener('storage', handleInboxChange);
    };
  }, []);

  // Toast timer
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (text: string, type: 'accept' | 'reject' | 'info' | 'error') => {
    setToast({
      id: Date.now(),
      text,
      type,
    });
  };

  // Trigger file picker
  const handleOpenUpload = () => {
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Process selected file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setParseError(null);
    try {
      const text = await file.text();
      const parsedLeads = parseQualifiedLeadsJson(text);

      if (parsedLeads.length === 0) {
        setParseError('The file did not contain any valid lead entries.');
        showToast('No leads found in file.', 'error');
        setIsProcessing(false);
        return;
      }

      // Merge new leads at the top of the inbox
      const updated = [...parsedLeads, ...inboxLeads];
      saveInboxLeads(updated);
      setInboxLeads(updated);
      showToast(`📥 Uploaded ${parsedLeads.length} qualified lead${parsedLeads.length === 1 ? '' : 's'}!`, 'info');
    } catch (err: any) {
      console.error('File parsing error:', err);
      const msg = err?.message || 'Could not parse JSON file. Please check file format.';
      setParseError(msg);
      showToast(`Error: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Accept a lead
  const handleAccept = (lead: InboxLead) => {
    try {
      const result = acceptInboxLeadIntoCrm(lead, channelLeads);

      if (result.isDuplicate) {
        showToast('Lead already exists in the pipeline.', 'error');
        return;
      }
      
      // Update local state
      const remaining = inboxLeads.filter((l) => l.id !== lead.id);
      setInboxLeads(remaining);

      // Notify parent callback to update CRM leads in real time
      if (onLeadAccepted) {
        onLeadAccepted(result.targetChannel, result.updatedLeads);
      }

      showToast(`✅ Lead ${lead.name} added to CRM!`, 'accept');
    } catch (err) {
      console.error('Failed to accept lead:', err);
      showToast(`Failed to add ${lead.name} to CRM.`, 'error');
    }
  };

  // Reject a lead
  const handleReject = (lead: InboxLead) => {
    removeInboxLead(lead.id);
    const remaining = inboxLeads.filter((l) => l.id !== lead.id);
    setInboxLeads(remaining);

    // Mandatory Toast Rule: "❌ Lead [Name] rejected."
    showToast(`❌ Lead ${lead.name} rejected.`, 'reject');
  };

  // Batch Accept All
  const handleAcceptAll = () => {
    if (inboxLeads.length === 0) return;
    let acceptedCount = 0;
    let duplicateCount = 0;

    const remaining: InboxLead[] = [];

    [...inboxLeads].forEach((lead) => {
      const result = acceptInboxLeadIntoCrm(lead, channelLeads);
      if (result.isDuplicate) {
        duplicateCount++;
        remaining.push(lead);
      } else {
        acceptedCount++;
        if (onLeadAccepted) {
          onLeadAccepted(result.targetChannel, result.updatedLeads);
        }
      }
    });

    setInboxLeads(remaining);

    if (duplicateCount > 0) {
      showToast('Lead already exists in the pipeline.', 'error');
    }
    if (acceptedCount > 0) {
      showToast(`✅ Accepted ${acceptedCount} leads into CRM!`, 'accept');
    }
  };

  // Batch Clear
  const handleClearAll = () => {
    if (window.confirm('Clear all pending leads from the Lead Inbox?')) {
      clearAllInboxLeads();
      setInboxLeads([]);
      showToast('❌ Lead Inbox cleared.', 'reject');
    }
  };

  // Copy Prompt
  const handleCopyPrompt = (id: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy Link
  const handleCopyLink = (id: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const getPlatformBadge = (platform: InboxLead['platform'], rawPlatform?: string) => {
    const isIG = platform === 'Instagram' || (rawPlatform && /ig|insta/i.test(rawPlatform));
    const isFB = platform === 'Facebook' || (rawPlatform && /fb|face/i.test(rawPlatform));
    const isEM = platform === 'Email' || (rawPlatform && /mail|email/i.test(rawPlatform));

    if (isIG) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-pink-500/15 text-pink-300 border border-pink-500/30">
          <Instagram className="w-3.5 h-3.5 text-pink-400" />
          <span>IG</span>
        </span>
      );
    }

    if (isFB) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-sky-500/15 text-sky-300 border border-sky-500/30">
          <Facebook className="w-3.5 h-3.5 text-sky-400" />
          <span>FB</span>
        </span>
      );
    }

    if (isEM) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <Mail className="w-3.5 h-3.5 text-emerald-400" />
          <span>Email</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-purple-500/15 text-purple-300 border border-purple-500/30">
        <span>{platform}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Container */}
      {toast && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed top-6 right-6 z-50 max-w-md w-[calc(100vw-3rem)] rounded-2xl border px-4 py-3 text-xs sm:text-sm font-bold shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 flex items-center justify-between gap-3 ${
            toast.type === 'accept'
              ? 'border-emerald-500/50 bg-emerald-950/95 text-emerald-100 shadow-emerald-950/60'
              : toast.type === 'reject'
              ? 'border-rose-500/50 bg-rose-950/95 text-rose-100 shadow-rose-950/60'
              : toast.type === 'error'
              ? 'border-amber-500/50 bg-amber-950/95 text-amber-100 shadow-amber-950/60'
              : 'border-indigo-500/50 bg-indigo-950/95 text-indigo-100 shadow-indigo-950/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'accept' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'reject' && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
            {toast.type === 'info' && <Inbox className="w-4 h-4 text-indigo-400 shrink-0" />}
            <span>{toast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white p-1 rounded-lg transition cursor-pointer"
            aria-label="Dismiss toast"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hidden File Picker Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Banner Zone */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-purple-500/20 via-indigo-500/10 to-transparent p-5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-purple-500/30 flex items-center justify-center text-2xl shadow-lg">
            📥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                Lead Inbox
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {inboxLeads.length} Pending
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and intake verified leads from your Lead Engine (<code className="text-indigo-300 font-mono">qualified-leads.json</code>) into your active pipeline.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {inboxLeads.length > 1 && (
            <>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Accept All ({inboxLeads.length})</span>
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-300 text-slate-400 text-xs font-semibold transition cursor-pointer"
                title="Clear all leads from inbox"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Mandatory Button: 📤 Upload Qualified Leads */}
          <button
            type="button"
            onClick={handleOpenUpload}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-white" />
            <span>{isProcessing ? 'Processing...' : '📤 Upload Qualified Leads'}</span>
          </button>
        </div>
      </div>

      {/* Parse Error Notification */}
      {parseError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs text-rose-200 flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{parseError}</span>
          </div>
          <button
            type="button"
            onClick={() => setParseError(null)}
            className="text-rose-400 hover:text-white p-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Drag & Drop Upload Dropzone Overlay (Active during drag) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-3xl transition-all duration-200 ${
          isDraggingFile
            ? 'ring-2 ring-indigo-500 bg-indigo-950/30 border-2 border-dashed border-indigo-400 p-8 text-center'
            : ''
        }`}
      >
        {isDraggingFile && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Upload className="w-10 h-10 text-indigo-400 animate-bounce" />
            <p className="text-base font-bold text-white">Drop qualified-leads.json here to import</p>
          </div>
        )}

        {!isDraggingFile && (
          <>
            {/* Empty State */}
            {inboxLeads.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-12 sm:p-16 text-center backdrop-blur-xl shadow-xl space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl shadow-inner">
                  📥
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-lg font-bold text-white font-['Outfit']">
                    No new leads in your inbox.
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Upload a qualified leads file to get started.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOpenUpload}
                    className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>📤 Upload Qualified Leads</span>
                  </button>
                </div>
              </div>
            ) : (
              /* The Dark Premium List */
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>
                    Showing <strong className="text-slate-200">{inboxLeads.length}</strong> lead{inboxLeads.length === 1 ? '' : 's'} awaiting review
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Accept routes automatically to IG / FB Leads table
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {inboxLeads.map((lead, index) => {
                    const displayLink = lead.platformLink || lead.profileLink || '';
                    const resolvedHref = getPlatformLink(displayLink, lead.platform);
                    const isMail = resolvedHref.startsWith('mailto:');

                    return (
                      <div
                        key={lead.id}
                        className="group relative rounded-2xl border border-white/10 bg-slate-900/80 hover:bg-slate-900/95 hover:border-indigo-500/40 p-4 sm:p-5 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-200 flex flex-col md:flex-row md:items-start justify-between gap-4"
                      >
                        {/* Left Side: Name, Platform, Profile Link, Prompt */}
                        <div className="space-y-3 flex-1 min-w-0">
                          {/* Top Row: Name & Platform */}
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-500">
                              #{index + 1}
                            </span>
                            <h2 className="text-base sm:text-lg font-bold text-white font-['Outfit'] tracking-tight truncate">
                              {lead.name}
                            </h2>
                            {getPlatformBadge(lead.platform, lead.rawPlatform)}
                          </div>

                          {/* Profile Link */}
                          {displayLink && (
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Link:</span>
                              <a
                                href={resolvedHref || '#'}
                                target={isMail ? '_self' : '_blank'}
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors font-mono max-w-md truncate group/link"
                                title={`Open ${displayLink}`}
                              >
                                <span className="truncate">{displayLink}</span>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover/link:opacity-100" />
                              </a>
                              <TestLinkButton url={displayLink} platform={lead.platform} />
                              <button
                                type="button"
                                onClick={() => handleCopyLink(lead.id, displayLink)}
                                className="p-1 rounded text-slate-500 hover:text-slate-300 transition cursor-pointer"
                                title="Copy profile link"
                              >
                                {copiedLinkId === lead.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}

                          {/* Prompt Block */}
                          {lead.prompt ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                                <span className="flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                  <span>Generated Outreach Prompt / Pitch:</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPrompt(lead.id, lead.prompt)}
                                  className="text-[11px] text-indigo-400 hover:text-white flex items-center gap-1 transition cursor-pointer font-sans"
                                >
                                  {copiedId === lead.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400 font-bold">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy Prompt</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="rounded-xl border border-white/5 bg-black/40 p-3 text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto selection:bg-purple-500/30">
                                {lead.prompt}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 italic">
                              No prompt attached to this lead entry.
                            </div>
                          )}
                        </div>

                        {/* Right Side: The Two Action Buttons: "✅ Accept" & "❌ Reject" */}
                        <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                          {/* Mandatory Button: ✅ Accept */}
                          <button
                            type="button"
                            onClick={() => handleAccept(lead)}
                            className="flex-1 md:flex-initial w-full md:w-32 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                            title={`Accept ${lead.name} into CRM`}
                          >
                            <span>✅</span>
                            <span>Accept</span>
                          </button>

                          {/* Mandatory Button: ❌ Reject */}
                          <button
                            type="button"
                            onClick={() => handleReject(lead)}
                            className="flex-1 md:flex-initial w-full md:w-32 py-2.5 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                            title={`Reject and remove ${lead.name}`}
                          >
                            <span>❌</span>
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
