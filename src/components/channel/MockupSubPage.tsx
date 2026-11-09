import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileCode,
  Download,
  Trash2,
  ExternalLink,
  Eye,
  X,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Code,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import {
  saveMockupImage,
  getMockupImage,
  deleteMockupImage,
  getMockupStorageKey,
} from '../../utils/indexedDbVault';
import { getChannelLabel, getPlatformLink } from '../../utils/channelStorage';
import { TestLinkButton } from '../TestLinkButton';

interface MockupSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
}

export function MockupSubPage({ channel, leads, onUpdateLeads }: MockupSubPageProps) {
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});
  const [activePreviewModal, setActivePreviewModal] = useState<{
    leadId: string;
    leadName: string;
    htmlContent: string;
    fileName: string;
  } | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleHtmlFileUpload = async (leadId: string, file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.html') && file.type !== 'text/html') {
      alert('Please upload an HTML file (.html).');
      return;
    }

    setLoadingKeys((prev) => ({ ...prev, [leadId]: true }));

    try {
      const htmlContent = await file.text();
      const blobUrl = URL.createObjectURL(new Blob([htmlContent], { type: 'text/html' }));
      const key = getMockupStorageKey(channel, leadId);

      // Persist HTML content into IndexedDB
      try {
        await saveMockupImage(key, htmlContent);
      } catch (idbErr) {
        console.warn('IndexedDB write error for HTML mockup:', idbErr);
      }

      // Update lead in state
      const nowIso = new Date().toISOString();
      const updated = leads.map((l) => {
        if (l.id === leadId) {
          return {
            ...l,
            hasMockup: true,
            mockupHtml: file.name,
            mockupHtmlName: file.name,
            mockupHtmlContent: htmlContent,
            mockupUrl: blobUrl,
            mockupFileName: file.name,
            mockupUploadedAt: nowIso,
          };
        }
        return l;
      });

      onUpdateLeads(updated);
      setLoadingKeys((prev) => ({ ...prev, [leadId]: false }));
    } catch (err) {
      console.error('Failed to process HTML mockup upload:', err);
      setLoadingKeys((prev) => ({ ...prev, [leadId]: false }));
      alert('Failed to read HTML file. Please check file permissions and try again.');
    }
  };

  const handleDeleteMockup = async (leadId: string) => {
    if (!window.confirm('Delete this mockup HTML file?')) return;

    const key = getMockupStorageKey(channel, leadId);
    try {
      await deleteMockupImage(key);
    } catch (e) {
      console.warn('IndexedDB delete error:', e);
    }

    const updated = leads.map((l) => {
      if (l.id === leadId) {
        return {
          ...l,
          hasMockup: false,
          mockupHtml: undefined,
          mockupHtmlName: undefined,
          mockupHtmlContent: undefined,
          mockupUrl: undefined,
          mockupFileName: undefined,
          mockupUploadedAt: undefined,
        };
      }
      return l;
    });

    onUpdateLeads(updated);
  };

  const handleDownloadMockupHtml = (lead: ChannelLead) => {
    const htmlContent = lead.mockupHtmlContent;
    const fileName = lead.mockupHtmlName || lead.mockupFileName || `${lead.name.replace(/\s+/g, '_')}_mockup.html`;

    if (!htmlContent) {
      alert('No HTML content available to download.');
      return;
    }

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.html') ? fileName : `${fileName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const mockupsCount = leads.filter((l) => Boolean(l.hasMockup || l.mockupHtml)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white font-['Outfit']">
            {getChannelLabel(channel)} Mockup HTML Vault
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Store, preview, and manage custom HTML mockups bound to each lead ID for instant proof-of-work delivery.
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
          <FileCode className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No leads available for mockups</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add prospect leads in the "Leads" sub-tab first to upload mockup HTML files here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 text-left w-32">Lead ID</th>
                  <th className="py-3 px-4 text-left w-64">Prospect Name &amp; Profile</th>
                  <th className="py-3 px-4 text-left">Saved Mockup HTML</th>
                  <th className="py-3 px-4 text-right w-64">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leads.map((lead) => {
                  const isLoading = loadingKeys[lead.id];
                  const hasHtml = Boolean(lead.mockupHtml || lead.mockupHtmlContent || lead.hasMockup);
                  const fileName = lead.mockupHtmlName || lead.mockupFileName || 'mockup.html';

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
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <a
                            href={getPlatformLink(lead.platformLink || lead.link, lead.channel || channel)}
                            target={getPlatformLink(lead.platformLink || lead.link, lead.channel || channel).startsWith('mailto:') ? '_self' : '_blank'}
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition-colors truncate max-w-xs"
                            title={`Open ${lead.platformLink || lead.link}`}
                          >
                            <span className="truncate">{lead.platformLink || lead.link}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          <TestLinkButton lead={lead} platform={lead.channel || channel} />
                        </div>
                      </td>

                      {/* Mockup Status Display */}
                      <td className="py-3.5 px-4 text-left">
                        {isLoading ? (
                          <div className="flex items-center gap-2 text-xs text-indigo-400">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Reading &amp; storing HTML...</span>
                          </div>
                        ) : hasHtml ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
                              <Code className="w-4 h-4" />
                            </div>
                            <div className="text-xs space-y-0.5">
                              <span className="font-mono font-bold text-orange-300 truncate block max-w-xs">
                                {fileName}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                HTML Mockup Ready
                                {lead.mockupUploadedAt && ` · ${new Date(lead.mockupUploadedAt).toLocaleDateString()}`}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <FileCode className="w-4 h-4 opacity-40" />
                            <span>No mockup HTML uploaded</span>
                          </div>
                        )}
                      </td>

                      {/* Actions: Upload Mockup HTML / Preview / Download / Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Hidden File Input strictly for .html */}
                          <input
                            type="file"
                            accept=".html,text/html"
                            ref={(el) => {
                              fileInputRefs.current[lead.id] = el;
                            }}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleHtmlFileUpload(lead.id, file);
                            }}
                          />

                          {hasHtml ? (
                            <>
                              {/* Preview HTML Button */}
                              {lead.mockupHtmlContent && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActivePreviewModal({
                                      leadId: lead.id,
                                      leadName: lead.name,
                                      htmlContent: lead.mockupHtmlContent!,
                                      fileName,
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-white border border-indigo-500/30 transition cursor-pointer flex items-center gap-1"
                                  title="Live interactive preview of mockup HTML"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Preview</span>
                                </button>
                              )}

                              {/* Download HTML Button */}
                              {lead.mockupHtmlContent && (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadMockupHtml(lead)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer flex items-center gap-1"
                                  title="Download HTML file"
                                >
                                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                                  <span className="hidden sm:inline">Download</span>
                                </button>
                              )}

                              {/* Replace Button */}
                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[lead.id]?.click()}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer border border-white/5"
                                title="Upload new HTML file to replace"
                              >
                                <Upload className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteMockup(lead.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                title="Delete mockup HTML"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            /* Upload Mockup HTML Button */
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[lead.id]?.click()}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95"
                              title="Upload HTML file for this lead"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Mockup HTML</span>
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

      {/* Live HTML Preview Modal */}
      {activePreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-5xl h-[90vh] rounded-3xl bg-slate-900 border border-white/15 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activePreviewModal.leadId}
                </span>
                <span className="font-bold text-sm text-white font-['Outfit']">
                  HTML Mockup Preview: {activePreviewModal.leadName}
                </span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  ({activePreviewModal.fileName})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([activePreviewModal.htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition flex items-center gap-1 cursor-pointer"
                  title="Open mockup in a new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open New Tab</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Live iframe Viewport */}
            <div className="flex-1 bg-white relative">
              <iframe
                title={`Mockup Preview for ${activePreviewModal.leadName}`}
                srcDoc={activePreviewModal.htmlContent}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
