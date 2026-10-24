import React, { useState, useRef, useEffect } from 'react';
import {
  Image,
  Upload,
  Clipboard,
  Check,
  Copy,
  Trash2,
  ZoomIn,
  X,
  ExternalLink,
  Sparkles,
  Smartphone,
  Monitor,
  Download,
} from 'lucide-react';
import { Lead } from '../types';
import {
  compressImageFile,
  copyBase64ImageToClipboard,
  readImageFromClipboard,
} from '../utils/imageCompressor';
import {
  PERMISSION_PITCH_TEMPLATES,
  getPermissionPitchText,
} from '../utils/permissionScripts';

interface MockupVaultProps {
  lead: Lead;
  onUpdateLead: (updates: Partial<Lead>) => void;
  compact?: boolean;
}

export const MockupVault: React.FC<MockupVaultProps> = ({
  lead,
  onUpdateLead,
  compact = false,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState('casual_teaser');
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedImageSlot, setCopiedImageSlot] = useState<1 | 2 | null>(null);
  const [activeZoomImage, setActiveZoomImage] = useState<{ src: string; title: string } | null>(null);
  const [isProcessing1, setIsProcessing1] = useState(false);
  const [isProcessing2, setIsProcessing2] = useState(false);
  const [clipboardError, setClipboardError] = useState<string | null>(null);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, slot: 1 | 2) => {
    if (!file.type.startsWith('image/')) {
      setClipboardError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    setClipboardError(null);
    if (slot === 1) setIsProcessing1(true);
    else setIsProcessing2(true);

    try {
      const compressed = await compressImageFile(file);
      if (slot === 1) {
        onUpdateLead({
          mockupImage1: compressed,
          mockupImage1Name: file.name,
        });
      } else {
        onUpdateLead({
          mockupImage2: compressed,
          mockupImage2Name: file.name,
        });
      }
    } catch (err) {
      console.error('Error compressing image:', err);
      setClipboardError('Could not process this image.');
    } finally {
      if (slot === 1) setIsProcessing1(false);
      else setIsProcessing2(false);
    }
  };

  const handlePasteClipboard = async (slot: 1 | 2) => {
    setClipboardError(null);
    if (slot === 1) setIsProcessing1(true);
    else setIsProcessing2(true);

    try {
      const result = await readImageFromClipboard();
      if (!result) {
        setClipboardError(
          'No image found in clipboard. Copy an image or screenshot first, or use the Upload button.'
        );
        return;
      }
      if (slot === 1) {
        onUpdateLead({
          mockupImage1: result.dataUrl,
          mockupImage1Name: result.name,
        });
      } else {
        onUpdateLead({
          mockupImage2: result.dataUrl,
          mockupImage2Name: result.name,
        });
      }
    } catch (err) {
      setClipboardError('Clipboard access failed. Please select an image file directly.');
    } finally {
      if (slot === 1) setIsProcessing1(false);
      else setIsProcessing2(false);
    }
  };

  const handleCopyImageToClipboard = async (slot: 1 | 2) => {
    const src = slot === 1 ? lead.mockupImage1 : lead.mockupImage2;
    if (!src) return;
    setClipboardError(null);
    const success = await copyBase64ImageToClipboard(src);
    if (success) {
      setCopiedImageSlot(slot);
      setTimeout(() => setCopiedImageSlot(null), 2400);
    } else {
      // Fallback: trigger file download if direct OS clipboard write isn't permitted in browser
      handleDownloadImage(slot);
      setClipboardError(
        'Clipboard write blocked by browser permissions; image downloaded to your files instead.'
      );
    }
  };

  const handleDownloadImage = (slot: 1 | 2) => {
    const src = slot === 1 ? lead.mockupImage1 : lead.mockupImage2;
    if (!src) return;
    const link = document.createElement('a');
    link.href = src;
    link.download = `${lead.restaurantName.replace(/[^a-zA-Z0-9]/g, '_')}_mockup_${slot}.jpg`;
    link.click();
  };

  const handleRemoveImage = (slot: 1 | 2) => {
    if (slot === 1) {
      onUpdateLead({ mockupImage1: undefined, mockupImage1Name: undefined });
    } else {
      onUpdateLead({ mockupImage2: undefined, mockupImage2Name: undefined });
    }
  };

  const currentPitchText = getPermissionPitchText(lead, selectedTemplateId);

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(currentPitchText);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2200);
  };

  return (
    <div className="space-y-5">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Image className="w-4 h-4 text-indigo-400" />
            Mockup Screenshots & Permission Vault
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Store 2 screenshots to tease in DMs and request permission to send the interactive link.
          </p>
        </div>

        {/* Status count */}
        <div className="text-xs text-slate-400 font-mono tabular-nums flex items-center gap-1.5 self-start sm:self-auto">
          <span>{Number(!!lead.mockupImage1) + Number(!!lead.mockupImage2)} of 2 attached</span>
          {lead.mockupLink && (
            <>
              <span className="text-slate-600">·</span>
              <a
                href={lead.mockupLink}
                target="_blank"
                rel="noreferrer noopener"
                className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-0.5"
              >
                <span>Live Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </>
          )}
        </div>
      </div>

      {clipboardError && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md p-2.5 flex items-center justify-between">
          <span>{clipboardError}</span>
          <button
            onClick={() => setClipboardError(null)}
            className="text-amber-400 hover:text-amber-200 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2-Slot Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Slot 1: Desktop / Hero */}
        <div className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 relative">
          <div className="flex items-center justify-between mb-2.5 text-xs">
            <span className="font-medium text-slate-200 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              Slot 1: Hero / Desktop Mockup
            </span>
            {lead.mockupImage1 && (
              <span className="text-[11px] text-emerald-400 font-medium">Ready</span>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef1}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 1);
            }}
          />

          {lead.mockupImage1 ? (
            <div className="flex flex-col gap-2">
              <div className="relative group rounded-md overflow-hidden bg-slate-950 border border-slate-800 aspect-[16/10] flex items-center justify-center">
                <img
                  src={lead.mockupImage1}
                  alt="Slot 1 Hero Mockup"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    onClick={() =>
                      setActiveZoomImage({
                        src: lead.mockupImage1!,
                        title: `${lead.restaurantName} - Slot 1 Hero Mockup`,
                      })
                    }
                    title="Fullscreen zoom"
                    className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-100 rounded-md transition"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCopyImageToClipboard(1)}
                    title="Copy Image to Clipboard"
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition"
                  >
                    {copiedImageSlot === 1 ? (
                      <Check className="w-4 h-4 text-emerald-300" />
                    ) : (
                      <Clipboard className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDownloadImage(1)}
                    title="Download image"
                    className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-100 rounded-md transition"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveImage(1)}
                    title="Delete image"
                    className="p-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/50 text-rose-300 rounded-md transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action Bar for Slot 1 */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleCopyImageToClipboard(1)}
                  className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-md transition flex items-center justify-center gap-1.5 ${
                    copiedImageSlot === 1
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                  }`}
                >
                  {copiedImageSlot === 1 ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Copy Image for DM</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef1.current?.click()}
                  className="py-1.5 px-2 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition border border-slate-700"
                >
                  Replace
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0], 1);
              }}
              onPaste={(e) => {
                const item = Array.from(e.clipboardData.items).find((i) =>
                  i.type.startsWith('image/')
                );
                if (item) {
                  const file = item.getAsFile();
                  if (file) handleFileUpload(file, 1);
                }
              }}
              tabIndex={0}
              className="flex-1 min-h-[140px] border border-dashed border-slate-700/80 hover:border-indigo-500/60 rounded-md flex flex-col items-center justify-center p-4 text-center bg-slate-950/40 hover:bg-indigo-950/10 transition focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {isProcessing1 ? (
                <div className="text-xs text-indigo-400 flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Processing image...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-500 mb-2" />
                  <p className="text-xs font-medium text-slate-300">
                    Drag screenshot or click to upload
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">PNG, JPG or paste with Ctrl+V</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef1.current?.click()}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition border border-slate-700"
                    >
                      Browse
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePasteClipboard(1)}
                      className="px-2.5 py-1 text-xs font-medium bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 rounded-md transition border border-indigo-800/40"
                    >
                      Paste Image
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Slot 2: Mobile / Detail */}
        <div className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 relative">
          <div className="flex items-center justify-between mb-2.5 text-xs">
            <span className="font-medium text-slate-200 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              Slot 2: Mobile / Detail Mockup
            </span>
            {lead.mockupImage2 && (
              <span className="text-[11px] text-emerald-400 font-medium">Ready</span>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef2}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 2);
            }}
          />

          {lead.mockupImage2 ? (
            <div className="flex flex-col gap-2">
              <div className="relative group rounded-md overflow-hidden bg-slate-950 border border-slate-800 aspect-[16/10] flex items-center justify-center">
                <img
                  src={lead.mockupImage2}
                  alt="Slot 2 Mobile Mockup"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    onClick={() =>
                      setActiveZoomImage({
                        src: lead.mockupImage2!,
                        title: `${lead.restaurantName} - Slot 2 Mobile Mockup`,
                      })
                    }
                    title="Fullscreen zoom"
                    className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-100 rounded-md transition"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCopyImageToClipboard(2)}
                    title="Copy Image to Clipboard"
                    className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition"
                  >
                    {copiedImageSlot === 2 ? (
                      <Check className="w-4 h-4 text-emerald-300" />
                    ) : (
                      <Clipboard className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDownloadImage(2)}
                    title="Download image"
                    className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-100 rounded-md transition"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveImage(2)}
                    title="Delete image"
                    className="p-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/50 text-rose-300 rounded-md transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action Bar for Slot 2 */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleCopyImageToClipboard(2)}
                  className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-md transition flex items-center justify-center gap-1.5 ${
                    copiedImageSlot === 2
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                  }`}
                >
                  {copiedImageSlot === 2 ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Copy Image for DM</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef2.current?.click()}
                  className="py-1.5 px-2 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition border border-slate-700"
                >
                  Replace
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0], 2);
              }}
              onPaste={(e) => {
                const item = Array.from(e.clipboardData.items).find((i) =>
                  i.type.startsWith('image/')
                );
                if (item) {
                  const file = item.getAsFile();
                  if (file) handleFileUpload(file, 2);
                }
              }}
              tabIndex={0}
              className="flex-1 min-h-[140px] border border-dashed border-slate-700/80 hover:border-purple-500/60 rounded-md flex flex-col items-center justify-center p-4 text-center bg-slate-950/40 hover:bg-purple-950/10 transition focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {isProcessing2 ? (
                <div className="text-xs text-purple-400 flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span>Processing image...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-500 mb-2" />
                  <p className="text-xs font-medium text-slate-300">
                    Drag screenshot or click to upload
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">PNG, JPG or paste with Ctrl+V</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef2.current?.click()}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition border border-slate-700"
                    >
                      Browse
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePasteClipboard(2)}
                      className="px-2.5 py-1 text-xs font-medium bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 rounded-md transition border border-purple-800/40"
                    >
                      Paste Image
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Permission Ask Outreach Card */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h5 className="text-xs font-semibold text-slate-200">
              Permission Outreach Script (Send with Screenshot)
            </h5>
          </div>
          <span className="text-[11px] text-slate-400">Gets permission before sending link</span>
        </div>

        {/* Template Segmented Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 rounded-md border border-slate-800 mb-3">
          {PERMISSION_PITCH_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => setSelectedTemplateId(tmpl.id)}
              className={`px-2.5 py-1 text-xs rounded transition whitespace-nowrap ${
                selectedTemplateId === tmpl.id
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tmpl.title}
            </button>
          ))}
        </div>

        {/* Pitch Box */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-md p-3 relative group">
          <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap selection:bg-indigo-500/30">
            {currentPitchText}
          </p>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              Personalized for <strong className="text-slate-300">{lead.restaurantName}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPitch}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                  copiedPitch
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {copiedPitch ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pitch Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>

              {lead.profileUrl && (
                <a
                  href={lead.profileUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition border border-slate-700 inline-flex items-center gap-1.5"
                >
                  <span>Open Profile</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Zoom Modal */}
      {activeZoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setActiveZoomImage(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] w-full flex flex-col bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950">
              <span className="text-xs font-medium text-slate-200 truncate">
                {activeZoomImage.title}
              </span>
              <button
                onClick={() => setActiveZoomImage(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-black/50 overflow-auto flex items-center justify-center max-h-[75vh]">
              <img
                src={activeZoomImage.src}
                alt={activeZoomImage.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-slate-950 border-t border-slate-800">
              <button
                onClick={async () => {
                  await copyBase64ImageToClipboard(activeZoomImage.src);
                  setCopiedPitch(true);
                  setTimeout(() => setCopiedPitch(false), 2000);
                }}
                className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium flex items-center gap-1.5"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Copy Image to Clipboard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
