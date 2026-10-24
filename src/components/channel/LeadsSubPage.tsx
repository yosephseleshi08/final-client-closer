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
  Check,
  FileSpreadsheet,
  FileCode,
  AlertCircle,
  X,
} from 'lucide-react';
import { ChannelLead, MultiChannelType } from '../../types';
import {
  getNextLeadId,
  extractSuggestedName,
  exportChannelData,
  getChannelLabel,
  normalizeUrlForDuplicateCheck,
  formatAddedDate,
} from '../../utils/channelStorage';
import { playWarningChime } from '../../utils/soundEffects';

interface LeadsSubPageProps {
  channel: MultiChannelType;
  leads: ChannelLead[];
  onUpdateLeads: (leads: ChannelLead[]) => void;
}

interface SortableLeadRowProps {
  lead: ChannelLead;
  onDelete: (id: string) => void;
}

function SortableLeadRow({ lead, onDelete }: SortableLeadRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const formattedUrl = lead.link.startsWith('http://') || lead.link.startsWith('https://')
    ? lead.link
    : `https://${lead.link}`;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-white/[0.06] transition-colors group ${
        isDragging
          ? 'bg-indigo-950/60 shadow-xl border-indigo-500/40 opacity-95'
          : 'hover:bg-white/[0.02]'
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
        </div>
      </td>

      {/* Name */}
      <td className="py-3.5 px-4 text-left text-sm font-medium text-slate-100">
        <span className="truncate max-w-xs block font-['Outfit']">{lead.name}</span>
      </td>

      {/* Link */}
      <td className="py-3.5 px-4 text-left text-xs text-slate-400">
        <a
          href={formattedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors max-w-sm truncate group/link"
        >
          <span className="truncate">{lead.link}</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover/link:opacity-100" />
        </a>
      </td>

      {/* Delete Button */}
      <td className="py-3.5 px-4 text-right">
        <button
          type="button"
          onClick={() => onDelete(lead.id)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          title="Delete lead"
          aria-label={`Delete ${lead.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

export function LeadsSubPage({ channel, leads, onUpdateLeads }: LeadsSubPageProps) {
  const [linkInput, setLinkInput] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingLink, setPendingLink] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicateAlert, setDuplicateAlert] = useState<{ message: string; timestamp: number } | null>(null);

  // Auto-dismiss the duplicate alert after 6 seconds
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

  const handleLinkInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkInput.trim();
    if (!trimmed) return;

    // Check if that exact URL/handle already exists in the leads array
    const normalizedInput = normalizeUrlForDuplicateCheck(trimmed, channel);
    const existingLead = leads.find((l) => {
      const lNorm = normalizeUrlForDuplicateCheck(l.link, channel);
      return lNorm && lNorm === normalizedInput;
    });

    if (existingLead) {
      // Do NOT save it. Trigger warning chime and red alert/toast message
      playWarningChime();
      const dateFormatted = formatAddedDate(existingLead.createdAt);
      setDuplicateAlert({
        message: `Warning: This link has already been added. ${existingLead.name} was added on ${dateFormatted}.`,
        timestamp: Date.now(),
      });
      return;
    }

    // Clear any previous alert
    setDuplicateAlert(null);

    // Prompt for business name upon paste (normal flow)
    const suggested = extractSuggestedName(trimmed);
    setPendingLink(trimmed);
    setPendingName(suggested);
    setShowNameModal(true);
  };

  const handleConfirmAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedInput = normalizeUrlForDuplicateCheck(pendingLink, channel);
    const existingLead = leads.find((l) => {
      const lNorm = normalizeUrlForDuplicateCheck(l.link, channel);
      return lNorm && lNorm === normalizedInput;
    });

    if (existingLead) {
      playWarningChime();
      const dateFormatted = formatAddedDate(existingLead.createdAt);
      setDuplicateAlert({
        message: `Warning: This link has already been added. ${existingLead.name} was added on ${dateFormatted}.`,
        timestamp: Date.now(),
      });
      setShowNameModal(false);
      setPendingLink('');
      setPendingName('');
      return;
    }

    const finalName = pendingName.trim() || extractSuggestedName(pendingLink) || 'Prospect';
    const { id, numericId } = getNextLeadId(channel, leads);

    const newLead: ChannelLead = {
      id,
      numericId,
      name: finalName,
      link: pendingLink,
      channel,
      sortOrder: leads.length,
      createdAt: new Date().toISOString(),
    };

    const updated = [...leads, newLead];
    onUpdateLeads(updated);

    // Reset state
    setShowNameModal(false);
    setPendingLink('');
    setPendingName('');
    setLinkInput('');
  };

  const handleDeleteLead = (id: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      const filtered = leads.filter((l) => l.id !== id);
      // Re-normalize sortOrder
      const reindexed = filtered.map((l, index) => ({ ...l, sortOrder: index }));
      onUpdateLeads(reindexed);
    }
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
      {/* Red Alert / Toast Message for Duplicate Link Prevention */}
      {duplicateAlert && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] rounded-2xl border border-rose-500/50 bg-rose-950/95 p-4 text-xs sm:text-sm font-semibold text-rose-100 shadow-2xl shadow-rose-950/60 backdrop-blur-md animate-in slide-in-from-top-3 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="leading-snug">{duplicateAlert.message}</p>
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

      {/* Inline Red Alert Banner */}
      {duplicateAlert && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/50 bg-rose-500/15 p-3.5 text-xs sm:text-sm font-semibold text-rose-200 flex items-center justify-between gap-3 shadow-lg animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{duplicateAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setDuplicateAlert(null)}
            className="text-rose-400 hover:text-white p-0.5 rounded transition cursor-pointer shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Intake Bar & Actions */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Intake Input Form */}
        <form onSubmit={handleLinkInputSubmit} className="flex-1 relative">
          <div className="relative flex items-center">
            <LinkIcon className="w-4 h-4 absolute left-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                if (duplicateAlert) setDuplicateAlert(null);
              }}
              placeholder={`Paste ${getChannelLabel(channel)} link or handle (e.g. instagram.com/handle) and press Enter...`}
              className={`w-full pl-10 pr-24 py-3 bg-slate-900/80 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all font-sans ${
                duplicateAlert
                  ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              }`}
            />
            <button
              type="submit"
              disabled={!linkInput.trim()}
              className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </form>


        {/* Search & Export Buttons */}
        <div className="flex items-center gap-2.5">
          {leads.length > 5 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads..."
                className="pl-8 pr-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 md:w-44"
              />
            </div>
          )}

          {/* Export Data Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={leads.length === 0}
              className="px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-900/80 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Data</span>
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-40 rounded-xl bg-slate-900 border border-white/10 shadow-2xl p-1 z-50 backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => {
                      exportChannelData(channel, 'csv', leads);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportChannelData(channel, 'json', leads);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Download JSON</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table Display: Shows ONLY ID, Name, Link, Delete */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 text-left w-32">ID</th>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Link</th>
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
                        Paste any link or handle above and press Enter to instantly intake your first lead.
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredLeads.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredLeads.map((lead) => (
                      <SortableLeadRow
                        key={lead.id}
                        lead={lead}
                        onDelete={handleDeleteLead}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </tbody>
          </table>
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
              <h3 className="text-lg font-bold text-white font-['Outfit']">Confirm Business Name</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter or verify the name for this prospect. It will be assigned to the next available ID.
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
                  placeholder="e.g. Acme Studio, Luigi's Kitchen"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Pasted Link
                </label>
                <div className="px-3.5 py-2 bg-slate-950/60 border border-white/5 rounded-xl text-xs text-slate-400 truncate font-mono">
                  {pendingLink}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNameModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
