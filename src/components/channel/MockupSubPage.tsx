import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Download,
  Trash2,
  ExternalLink,
  Eye,
  X,
  RefreshCw,
  FileCode,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import {
  saveMockupImage,
  getMockupImage,
  deleteMockupImage,
  getMockupStorageKey,
} from '../../utils/indexedDbVault';
import { getChannelLabel, getPlatformLink, getLeadEmail } from '../../utils/channelStorage';

interface MockupSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
}

export function MockupSubPage({ channel, leads, onUpdateLeads }: MockupSubPageProps) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<{
    url: string;
    leadId: string;
    leadName: string;
  } | null>(null);
  const [activeHtmlPreview, setActiveHtmlPreview] = useState<{
    html: string;
    leadId: string;
    leadName: string;
  } | null>(null);
  const [confirmDeleteLeadId, setConfirmDeleteLeadId] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadThumbnails() {
      const loaded: Record<string, string> = {};
      for (const lead of leads) {
        if (lead.hasMockup) {
          const key = getMockupStorageKey(channel, lead.id);
          try {
            const dataUrl = await getMockupImage(key);
            if (dataUrl && isMounted) {
              loaded[lead.id] = dataUrl;
            }
          } catch (e) {
            console.warn(`Error loading mockup for ${lead.id}:`, e);
          }
        }
      }
      if (isMounted) {
        setThumbnails(loaded);
      }
    }

    loadThumbnails();

    return () => {
      isMounted = false;
    };
  }, [channel, leads]);

  const handleFileUpload = async (leadId: string, file: File) => {
    if (!file) return;
    setErrorMsg(null);

    const isHtml = file.name.toLowerCase().endsWith('.html') || file.type === 'text/html';
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isHtml) {
      setErrorMsg('Please upload an image (PNG, JPG, WebP) or an HTML mockup file.');
      return;
    }

    setLoadingKeys((prev) => ({ ...prev, [leadId]: true }));

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        const nowIso = new Date().toISOString();

        if (isHtml) {
          const updated = leads.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  mockupHtml: result,
                  mockupHtmlName: file.name,
                  mockupHtmlUploadedAt: nowIso,
                  hasMockup: true,
                }
              : l
          );
          onUpdateLeads(updated);
          setLoadingKeys((prev) => ({ ...prev, [leadId]: false }));
          return;
        }

        const key = getMockupStorageKey(channel, leadId);
        await saveMockupImage(key, result);
        setThumbnails((prev) => ({ ...prev, [leadId]: result }));

        const updated = leads.map((l) =>
          l.id === leadId
            ? {
                ...l,
                hasMockup: true,
                mockupFileName: file.name,
                mockupUploadedAt: nowIso,
              }
            : l
        );
        onUpdateLeads(updated);
        setLoadingKeys((prev) => ({ ...prev, [leadId]: false }));
      };

      if (isHtml) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Failed to process mockup upload:', err);
      setLoadingKeys((prev) => ({ ...prev, [leadId]: false }));
      setErrorMsg('Failed to save mockup. Please try a smaller file.');
    }
  };

  const handleConfirmDeleteMockup = async (leadId: string) => {
    const key = getMockupStorageKey(channel, leadId);
    await deleteMockupImage(key);

    setThumbnails((prev) => {
      const next = { ...prev };
      delete next[leadId];
      return next;
    });

    const updated = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            hasMockup: false,
            mockupFileName: undefined,
            mockupUploadedAt: undefined,
            mockupHtml: undefined,
            mockupHtmlName: undefined,
            mockupHtmlUploadedAt: undefined,
          }
        : l
    );

    onUpdateLeads(updated);
    setConfirmDeleteLeadId(null);
  };

  const handleDownloadMockup = (lead: ChannelLead) => {
    const dataUrl = thumbnails[lead.id];
    if (dataUrl) {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${channel}_mockup_${lead.id}_${lead.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    if (lead.mockupHtml) {
      const blob = new Blob([lead.mockupHtml], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = lead.mockupHtmlName || `${lead.id}_mockup.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const mockupsCount = leads.filter((l) => Boolean(l.hasMockup || l.mockupHtml)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-white font-['Outfit']">
            {getChannelLabel(channel)} Mockup &amp; Prototype Vault
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Store, preview, and download custom image screenshots or HTML mockups bound to each Lead ID.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Mockups ready:{' '}
          <span className="text-indigo-400 font-bold">{mockupsCount}</span> / {leads.length}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-300 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
          <ImageIcon className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No leads available for mockups</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add prospect leads in the &quot;Leads&quot; sub-tab first to upload mockups here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 text-left w-32">Lead ID</th>
                  <th className="py-3 px-4 text-left w-52">Prospect Name</th>
                  <th className="py-3 px-4 text-left">Saved Mockup Preview</th>
                  <th className="py-3 px-4 text-right w-56">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leads.map((lead) => {
                  const thumbnail = thumbnails[lead.id];
                  const hasHtml = Boolean(lead.mockupHtml);
                  const isLoading = loadingKeys[lead.id];
                  const cleanEmail = getLeadEmail(lead);
                  const href = getPlatformLink(cleanEmail || lead, cleanEmail ? 'email' : channel);

                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 text-left font-mono text-xs tabular-nums">
                        <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                          {lead.id}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-left">
                        <div className="font-medium text-sm text-slate-100 font-['Outfit'] truncate max-w-xs">
                          {lead.name}
                        </div>
                        {href && (
                          <a
                            href={href}
                            target={href.startsWith('mailto:') ? '_self' : '_blank'}
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition-colors mt-0.5 truncate max-w-xs"
                          >
                            <span className="truncate">{cleanEmail || lead.link}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-left">
                        {isLoading ? (
                          <div className="flex items-center gap-2 text-xs text-indigo-400">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Saving mockup...</span>
                          </div>
                        ) : thumbnail ? (
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() =>
                                setActiveLightboxImage({
                                  url: thumbnail,
                                  leadId: lead.id,
                                  leadName: lead.name,
                                })
                              }
                              className="relative group/thumb cursor-pointer w-20 h-14 rounded-lg overflow-hidden border border-white/10 bg-black/40 shadow-md shrink-0"
                              title="Click to preview full size"
                            >
                              <img
                                src={thumbnail}
                                alt={`Mockup for ${lead.name}`}
                                className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-4 h-4" />
                              </div>
                            </div>
                            <div className="text-xs space-y-0.5">
                              <span className="font-medium text-slate-200 truncate block max-w-xs">
                                {lead.mockupFileName || 'mockup_screenshot.png'}
                              </span>
                              {lead.mockupUploadedAt && (
                                <span className="text-[10px] text-slate-500 block">
                                  Saved {new Date(lead.mockupUploadedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : hasHtml ? (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveHtmlPreview({
                                html: lead.mockupHtml || '',
                                leadId: lead.id,
                                leadName: lead.name,
                              })
                            }
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer"
                          >
                            <FileCode className="w-4 h-4" />
                            <span>{lead.mockupHtmlName || 'Interactive HTML Mockup'}</span>
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <ImageIcon className="w-4 h-4 opacity-40" />
                            <span>No mockup uploaded</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,.html,text/html"
                            ref={(el) => {
                              fileInputRefs.current[lead.id] = el;
                            }}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(lead.id, file);
                            }}
                          />

                          {thumbnail || hasHtml ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDownloadMockup(lead)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer flex items-center gap-1"
                                title="Download mockup"
                              >
                                <Download className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="hidden sm:inline">Download</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[lead.id]?.click()}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                                title="Replace mockup"
                              >
                                <Upload className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setConfirmDeleteLeadId(lead.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                title="Delete mockup"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[lead.id]?.click()}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Mockup</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {activeLightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30 mr-2">
                  {activeLightboxImage.leadId}
                </span>
                <span className="font-bold font-['Outfit'] text-sm">
                  {activeLightboxImage.leadName} Mockup Preview
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveLightboxImage(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-white/15 bg-black/50 shadow-2xl max-h-[75vh]">
              <img
                src={activeLightboxImage.url}
                alt="Full Mockup Preview"
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* HTML Mockup Preview Modal */}
      {activeHtmlPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-5xl h-[85vh] rounded-2xl bg-slate-900 border border-white/10 flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                  {activeHtmlPreview.leadId}
                </span>
                <span className="text-sm font-bold text-white">{activeHtmlPreview.leadName} HTML Prototype</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveHtmlPreview(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe
              title="HTML Mockup Preview"
              srcDoc={activeHtmlPreview.html}
              sandbox="allow-scripts"
              className="w-full flex-1 bg-white"
            />
          </div>
        </div>
      )}

      {/* Delete Mockup Confirmation Modal */}
      {confirmDeleteLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-['Outfit']">Remove Mockup?</h3>
            <p className="text-xs text-slate-400">
              Remove the saved mockup for lead <strong className="text-slate-200">{confirmDeleteLeadId}</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDeleteLeadId(null)}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteMockup(confirmDeleteLeadId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
