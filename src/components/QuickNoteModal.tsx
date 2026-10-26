import React, { useState, useEffect } from 'react';
import {
  X,
  StickyNote,
  Save,
  Trash2,
  ExternalLink,
  Clock,
  Sparkles,
  Tag,
} from 'lucide-react';
import { ChannelLead } from '../types';

interface QuickNoteModalProps {
  isOpen: boolean;
  lead: ChannelLead | null;
  onClose: () => void;
  onSave: (leadId: string, noteText: string) => void;
  onDelete: (leadId: string) => void;
}

const PRESET_TAGS = [
  { label: 'Call Booked', insertText: '[Call Booked: ' },
  { label: 'Gatekeeper', insertText: '[Gatekeeper: ' },
  { label: 'Check Next Week', insertText: '[Follow up next week] ' },
  { label: 'Pricing Question', insertText: '[Asked about pricing: ' },
  { label: 'Owner Direct', insertText: '[Spoke with Owner: ' },
];

export const QuickNoteModal: React.FC<QuickNoteModalProps> = ({
  isOpen,
  lead,
  onClose,
  onSave,
  onDelete,
}) => {
  const [noteText, setNoteText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (lead) {
      setNoteText(lead.quickNote || '');
      setConfirmDelete(false);
    }
  }, [lead, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !lead) return null;

  const handleSave = () => {
    onSave(lead.id, noteText.trim());
    onClose();
  };

  const handleDelete = () => {
    if (!confirmDelete && noteText.trim().length > 0) {
      setConfirmDelete(true);
      return;
    }
    onDelete(lead.id);
    onClose();
  };

  const handleInsertTag = (tagText: string) => {
    setNoteText((prev) => {
      if (!prev.trim()) {
        return tagText;
      }
      return `${prev}\n${tagText}`;
    });
  };

  const hasExistingNote = Boolean(lead.quickNote && lead.quickNote.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-amber-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/40">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {lead.id}
                </span>
                <h3 className="font-bold text-white text-base font-['Outfit']">
                  {lead.name}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Quick Note &amp; Dispatch Intelligence
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1-Click Preset Tags */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 font-mono">
            <Tag className="w-3 h-3 text-amber-400" />
            <span>Quick Presets (Click to append):</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESET_TAGS.map((tag) => (
              <button
                key={tag.label}
                type="button"
                onClick={() => handleInsertTag(tag.insertText)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition cursor-pointer flex items-center gap-1"
              >
                <span>+ {tag.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Area */}
        <div className="space-y-1.5">
          <textarea
            value={noteText}
            onChange={(e) => {
              setNoteText(e.target.value);
              setConfirmDelete(false);
            }}
            placeholder="e.g. Owner replied: Call Tuesday at 2 PM. Interested in the booking redesign..."
            rows={5}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/90 p-3.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition leading-relaxed resize-none font-sans"
            autoFocus
          />

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>
              {lead.quickNoteSavedAt ? `Saved: ${lead.quickNoteSavedAt}` : 'Not yet saved'}
            </span>
            <span>{noteText.length} characters</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div>
            {hasExistingNote ? (
              <button
                type="button"
                onClick={handleDelete}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  confirmDelete
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmDelete ? 'Confirm Delete?' : 'Delete Note'}</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 font-mono">
                Saves directly to database
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/30 transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
