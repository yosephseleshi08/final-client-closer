import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Download,
  Trash2,
  ZoomIn,
  X,
  Copy,
  Check,
  Plus,
  FileImage,
  Layers,
  Sparkles,
  ClipboardPaste,
  Edit2,
  Calendar,
} from 'lucide-react';
import { Lead, LeadScreenshot } from '../types';
import { compressImageFile, copyBase64ImageToClipboard } from '../utils/imageCompressor';
import { playSuccessChime } from '../utils/soundEffects';

interface LeadScreenshotVaultProps {
  lead: Lead;
  onUpdateLead: (updatedLead: Lead) => void;
}

export const LeadScreenshotVault: React.FC<LeadScreenshotVaultProps> = ({
  lead,
  onUpdateLead,
}) => {
  const screenshots = lead.leadScreenshots || [];
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadAllProgress, setDownloadAllProgress] = useState(false);
  const [activeZoomImage, setActiveZoomImage] = useState<LeadScreenshot | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionInput, setCaptionInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Temporary status message timer
  const flashStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Process and append multiple files
  const handleProcessFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      flashStatus('⚠️ Please select valid image files (PNG, JPG, WebP, GIF)');
      return;
    }

    setIsUploading(true);
    try {
      const newScreenshots: LeadScreenshot[] = [];

      for (const file of validFiles) {
        const compressedBase64 = await compressImageFile(file, 1600, 0.88);
        const approxSizeKb = Math.round((file.size / 1024));
        const cleanName = file.name || `screenshot_${Date.now()}.png`;

        const newEntry: LeadScreenshot = {
          id: `ss-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          url: compressedBase64,
          fileName: cleanName,
          uploadedAt: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          fileSize: `${approxSizeKb} KB`,
        };
        newScreenshots.push(newEntry);
      }

      const updatedScreenshots = [...(lead.leadScreenshots || []), ...newScreenshots];
      onUpdateLead({
        ...lead,
        leadScreenshots: updatedScreenshots,
      });

      playSuccessChime();
      flashStatus(`✅ Added ${newScreenshots.length} screenshot${newScreenshots.length > 1 ? 's' : ''} to vault!`);
    } catch (err) {
      console.error('Failed to compress/save screenshot:', err);
      flashStatus('❌ Failed to process some images. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Clipboard Paste Support (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            imageFiles.push(
              new File([blob], `pasted_proof_${Date.now()}.png`, { type: blob.type })
            );
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        await handleProcessFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [lead]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleProcessFiles(e.dataTransfer.files);
    }
  };

  // Single download trigger
  const handleDownloadSingle = (item: LeadScreenshot) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.fileName || `${lead.restaurantName.replace(/[^a-zA-Z0-9]/g, '_')}_screenshot.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playSuccessChime();
    flashStatus(`📥 Downloaded ${item.fileName}`);
  };

  // Download all screenshots sequentially
  const handleDownloadAll = async () => {
    if (screenshots.length === 0) return;
    setDownloadAllProgress(true);
    try {
      playSuccessChime();
      for (let i = 0; i < screenshots.length; i++) {
        const item = screenshots[i];
        const link = document.createElement('a');
        link.href = item.url;
        link.download = item.fileName || `screenshot_${i + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Small delay to allow browser download queues to process
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
      flashStatus(`📥 Initiated download for all ${screenshots.length} screenshots!`);
    } finally {
      setDownloadAllProgress(false);
    }
  };

  // Copy image to clipboard
  const handleCopyImage = async (item: LeadScreenshot) => {
    try {
      const ok = await copyBase64ImageToClipboard(item.url);
      if (ok) {
        setCopiedId(item.id);
        playSuccessChime();
        flashStatus('📋 Image copied to clipboard!');
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        flashStatus('⚠️ Could not copy directly to clipboard. You can download the image.');
      }
    } catch (_e) {
      flashStatus('⚠️ Clipboard copy unavailable in this browser. Use download.');
    }
  };

  // Delete screenshot
  const handleDeleteScreenshot = (id: string) => {
    const updated = screenshots.filter((s) => s.id !== id);
    onUpdateLead({
      ...lead,
      leadScreenshots: updated,
    });
    flashStatus('🗑️ Screenshot removed.');
  };

  // Save edited caption
  const handleSaveCaption = (id: string) => {
    const updated = screenshots.map((s) => (s.id === id ? { ...s, caption: captionInput.trim() } : s));
    onUpdateLead({
      ...lead,
      leadScreenshots: updated,
    });
    setEditingCaptionId(null);
    setCaptionInput('');
    flashStatus('💾 Note saved.');
  };

  return (
    <div className="space-y-4">
      {/* Vault Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <ImageIcon className="h-4 w-4" />
            </span>
            <h3 className="text-sm sm:text-base font-black text-white font-['Outfit']">
              Lead Screenshot & Media Vault
            </h3>
            <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[11px] font-bold text-indigo-300 font-mono">
              {screenshots.length} Stored
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Attach unlimited outreach proofs, chat history, profile screenshots, or menu captures. Strictly separated from prototype mockups.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {screenshots.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={downloadAllProgress}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50"
              title="Download all screenshots for this lead"
            >
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              <span>{downloadAllProgress ? 'Downloading...' : `Download All (${screenshots.length})`}</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleProcessFiles(e.target.files);
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isUploading ? 'Compressing...' : 'Upload Screenshots'}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3 py-2 text-xs font-bold text-indigo-300 animate-in fade-in flex items-center justify-between">
          <span>{statusMsg}</span>
          <button type="button" onClick={() => setStatusMsg(null)} className="text-indigo-300 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-500/20'
            : 'border-white/10 bg-slate-900/40 hover:border-indigo-500/40 hover:bg-slate-900/60'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-white">
              Drag & drop screenshots here, or <span className="text-indigo-400 underline">browse files</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Supports multiple PNG, JPG, WebP • You can also press <strong className="text-slate-200 font-mono">Ctrl + V / ⌘ + V</strong> anywhere to paste from clipboard
            </p>
          </div>
        </div>
      </div>

      {/* Screenshot Gallery Grid */}
      {screenshots.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {screenshots.map((ss, idx) => (
            <div
              key={ss.id || idx}
              className="group relative rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden shadow-lg hover:border-indigo-500/40 transition flex flex-col justify-between"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-[4/3] bg-black/60 overflow-hidden cursor-pointer" onClick={() => setActiveZoomImage(ss)}>
                <img
                  src={ss.url}
                  alt={ss.caption || ss.fileName}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Dark Hover Overlay with Action Buttons */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveZoomImage(ss);
                    }}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition cursor-pointer"
                    title="Zoom / Preview"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSingle(ss);
                    }}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition cursor-pointer"
                    title="Download this screenshot"
                  >
                    <Download className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyImage(ss);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                    title="Copy image to clipboard"
                  >
                    {copiedId === ss.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div className="absolute bottom-2 left-2 rounded-md bg-black/70 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                  #{idx + 1}
                </div>
              </div>

              {/* Card Meta & Caption */}
              <div className="p-3 space-y-2 border-t border-white/5 bg-slate-900/60">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-[150px] font-medium text-slate-200" title={ss.fileName}>
                    {ss.fileName}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">{ss.fileSize || ''}</span>
                </div>

                {editingCaptionId === ss.id ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={captionInput}
                      onChange={(e) => setCaptionInput(e.target.value)}
                      placeholder="Add caption or note (e.g., DM proof, menu snippet)..."
                      className="w-full rounded-lg border border-indigo-500/40 bg-black/60 px-2 py-1 text-xs text-white focus:outline-none"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingCaptionId(null)}
                        className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveCaption(ss.id)}
                        className="px-2 py-0.5 rounded bg-indigo-600 text-[10px] font-bold text-white cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setEditingCaptionId(ss.id);
                      setCaptionInput(ss.caption || '');
                    }}
                    className="group/cap flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer py-0.5"
                    title="Click to edit caption"
                  >
                    <p className="truncate text-[11px] text-slate-400 group-hover/cap:text-slate-200">
                      {ss.caption ? `“${ss.caption}”` : <span className="italic text-slate-600">+ Add caption/note</span>}
                    </p>
                    <Edit2 className="h-2.5 w-2.5 opacity-0 group-hover/cap:opacity-100 text-slate-400 ml-1 shrink-0" />
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-slate-500">
                  <span>{ss.uploadedAt}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadSingle(ss)}
                      className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      <span>Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteScreenshot(ss.id)}
                      className="text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Delete screenshot"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center space-y-2">
          <FileImage className="h-8 w-8 text-slate-600 mx-auto" />
          <div className="text-xs font-bold text-slate-300">No screenshots stored for this lead yet</div>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            You can keep infinite proof screenshots, profile grabs, or chat records here. Use the button above or simply paste with Ctrl+V.
          </p>
        </div>
      )}

      {/* Lightbox / Zoom Modal */}
      {activeZoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setActiveZoomImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] w-full flex flex-col rounded-3xl border border-white/15 bg-slate-950 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/90">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white truncate max-w-md">
                  {activeZoomImage.fileName}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {activeZoomImage.uploadedAt} {activeZoomImage.caption ? `• “${activeZoomImage.caption}”` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSingle(activeZoomImage)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveZoomImage(null)}
                  className="p-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Body Image */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/70">
              <img
                src={activeZoomImage.url}
                alt={activeZoomImage.caption || activeZoomImage.fileName}
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
