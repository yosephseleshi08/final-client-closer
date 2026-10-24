import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Download,
  Trash2,
  ExternalLink,
  Eye,
  X,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import {
  saveMockupImage,
  getMockupImage,
  deleteMockupImage,
  getMockupStorageKey,
} from '../../utils/indexedDbVault';
import { getChannelLabel } from '../../utils/channelStorage';

interface MockupSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
}

export function MockupSubPage({ channel, leads, onUpdateLeads }: MockupSubPageProps) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});
  const [activeLightboxImage, setActiveLightboxImage] = useState<{
    url: string;
    leadId: string;
    leadName: string;
  } | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Load mockup thumbnails from IndexedDB on mount / leads change
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

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP).');
      return;
    }

    setLoadingKeys((prev) => ({ ...prev, [leadId]: true }));

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const key = getMockupStorageKey(channel, leadId);

        // Save to IndexedDB for persistent storage
        await saveMockupImage(key, dataUrl);

        // Update local thumbnail cache
        setThumbnails((prev) => ({ ...prev, [leadId]: dataUrl }));

        // Update lead in state
        const updated = leads.map((l) => {
          if (l.id === leadId) {
            return {
              ...l,
              hasMockup: true,
              mockupFileName: file.name,
              mockupUploadedAt: new Date().toISOString(),
            };
          }
          return l;
        });

        onUpdateLeads(updated);
        setLoadingKeys((prev) => ({ ...prev, [leadId]: false }));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to process image upload:', err);
      setLoadingKeys((prev) => ({ ...prev, [leadId]: false }));
      alert('Failed to save image screenshot. Please try a smaller image.');
    }
  };

  const handleDeleteMockup = async (leadId: string) => {
    if (!window.confirm('Delete this mockup screenshot?')) return;

    const key = getMockupStorageKey(channel, leadId);
    await deleteMockupImage(key);

    setThumbnails((prev) => {
      const next = { ...prev };
      delete next[leadId];
      return next;
    });

    const updated = leads.map((l) => {
      if (l.id === leadId) {
        return {
          ...l,
          hasMockup: false,
          mockupFileName: undefined,
          mockupUploadedAt: undefined,
        };
      }
      return l;
    });

    onUpdateLeads(updated);
  };

  const handleDownloadMockup = (lead: ChannelLead) => {
    const dataUrl = thumbnails[lead.id];
    if (!dataUrl) return;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${channel}_mockup_${lead.id}_${lead.name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const mockupsCount = leads.filter((l) => Boolean(l.hasMockup)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white font-['Outfit']">
            {getChannelLabel(channel)} Mockup Screenshot Vault
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Store, preview, and download custom mockups bound to each Lead ID. Persisted in IndexedDB.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Mockups ready:{' '}
          <span className="text-indigo-400 font-bold">{mockupsCount}</span> /{' '}
          {leads.length}
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-12 text-center text-slate-400">
          <ImageIcon className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No leads available for mockups</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add prospect leads in the "Leads" sub-tab first to upload mockup screenshots here.
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
                  const isLoading = loadingKeys[lead.id];

                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* ID */}
                      <td className="py-3.5 px-4 text-left font-mono text-xs tabular-nums">
                        <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                          {lead.id}
                        </span>
                      </td>

                      {/* Name & Link */}
                      <td className="py-3.5 px-4 text-left">
                        <div className="font-medium text-sm text-slate-100 font-['Outfit'] truncate max-w-xs">
                          {lead.name}
                        </div>
                        <a
                          href={lead.link.startsWith('http') ? lead.link : `https://${lead.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition-colors mt-0.5 truncate max-w-xs"
                        >
                          <span className="truncate">{lead.link}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>

                      {/* Mockup Preview Thumbnail */}
                      <td className="py-3.5 px-4 text-left">
                        {isLoading ? (
                          <div className="flex items-center gap-2 text-xs text-indigo-400">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Saving screenshot...</span>
                          </div>
                        ) : thumbnail ? (
                          <div className="flex items-center gap-3">
                            {/* Clickable Thumbnail with Hover Zoom */}
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
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <ImageIcon className="w-4 h-4 opacity-40" />
                            <span>No mockup uploaded</span>
                          </div>
                        )}
                      </td>

                      {/* Actions: Upload / Download / Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Hidden File Input */}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            ref={(el) => {
                              fileInputRefs.current[lead.id] = el;
                            }}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(lead.id, file);
                            }}
                          />

                          {thumbnail ? (
                            <>
                              {/* Download Button */}
                              <button
                                type="button"
                                onClick={() => handleDownloadMockup(lead)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer flex items-center gap-1"
                                title="Download image screenshot"
                              >
                                <Download className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="hidden sm:inline">Download</span>
                              </button>

                              {/* Replace Button */}
                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[lead.id]?.click()}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                                title="Upload new image to replace"
                              >
                                <Upload className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteMockup(lead.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                title="Delete mockup"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            /* Upload Button */
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
            {/* Header / Close */}
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

            {/* Image Preview Container */}
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
    </div>
  );
}
