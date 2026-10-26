# Quick Notes System for Today's Schedule & Outreach Leads

A fast, low-friction **Quick Notes** system across Today's Execution Schedule, Sent Today log, Follow-Up queues, and channel Leads tables, allowing operators to capture high-value prospect intelligence (call times, owner objections, gatekeeper details) immediately after sending DMs.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product decisions were confirmed during the interactive clarification phase:

- **Confirmed Decision 1 (Scope & Ubiquity)**: Quick Notes will be accessible **everywhere**—both across all sections of Today's Schedule (Sent Today log, Follow-Ups Due, Overdue, and New Outreach) and directly in the Channel Leads tables.
- **Confirmed Decision 2 (Visual Presentation)**: Leads with saved notes will display a prominent **Amber Sticky Note Box** directly on their cards showing full note text, timestamp, and a quick-edit trigger for instant reading without modal clicks.
- **Confirmed Decision 3 (Preset Tags)**: The note editor modal will feature **1-click quick-tag buttons** (`Call Booked`, `Gatekeeper`, `Check Next Week`, `Pricing Question`, `Owner Direct`) to rapidly append standardized context with a single tap.

---

## 1. Overview & Core Concept

- **What It Does**: Enables sales operators to record qualitative prospect responses and outreach context in real time. Clicking `"📝 Add Note"` on any lead card opens an editor with 1-click preset tag chips and a note text area. Saved notes render immediately as amber sticky notes on the card and persist across all browser sessions in `localStorage`.
- **Target Persona**: High-velocity agency closers and SDRs who need immediate note capture without opening heavyweight CRM profile screens or interrupting their daily dispatch flow.
- **Key Value**: Prevents context loss between Day 1 outreach and Day 3/Day 7 follow-ups, ensuring operators remember previous interactions and scheduled call times.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Adding a Note After Sending a DM**:
   - Operator clicks `"Mark Initial Sent"` on a prospect in *Today's Schedule*.
   - Lead transitions to the **"✅ Sent Today"** log.
   - Operator clicks `"📝 Add Note"` on the card.
   - The **Quick Note Modal** appears with prospect details, 1-click preset tag chips (`Call Booked`, `Gatekeeper`, etc.), and a focused text area.
   - Operator clicks a preset or types: `"Owner said call Tuesday 2 PM"` and clicks `"Save Note"`.
   - The card instantly renders the **Amber Sticky Note Box** with full text and a small note icon.

2. **Reading at a Glance During Follow-Ups**:
   - When reviewing **Follow-Ups Due Today** or the **3-Day Follow-Up** queue, operator immediately sees the amber note box on the lead card.
   - No need to click modals or switch tabs to recall who they spoke to or what was agreed upon.

3. **Editing or Deleting a Note**:
   - Operator clicks `"✏️ Edit Note"` or the sticky note box directly.
   - Modal opens with existing text populated.
   - Operator can modify text and save, or click `"Delete Note"` to remove it cleanly.

### Visual Styling & Theme

- **Aesthetic Direction**: Utilitarian, high-contrast dark operations console (`#080c14`, `slate-900`, `slate-950`).
- **Amber Sticky Note Box**:
  - Background: `bg-amber-950/30 border border-amber-500/30` with subtle golden glow.
  - Icon: `StickyNote` icon in `text-amber-400`.
  - Typography: Crisp, high-contrast text in `text-amber-200/90` with font-mono metadata footer showing save timestamp.
- **Modal Design**:
  - Backdrop blur overlay (`backdrop-blur-md bg-slate-950/80`).
  - Preset tag pills: subtle hover states (`bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30`).
  - Delete button: `text-rose-400 hover:bg-rose-500/10 border border-rose-500/30`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct On-Card Sticky Note vs. Hover Tooltip**:
  - *Chosen Approach*: Render an on-card amber sticky note box displaying the full note text.
  - *Why*: In high-speed outbound workflows, hover tooltips create friction and fail on touch devices. Having the text readable directly on the card allows zero-click scanning.
- **Decision 2: Preset Tag Append System**:
  - *Chosen Approach*: Clicking preset tag chips appends them to the note with clean bracket formatting (e.g., `[Call Booked] ...`).
  - *Why*: Allows rapid categorization without restricting custom freeform typing.
- **Decision 3: Universal Channel Storage Integration**:
  - *Chosen Approach*: Persist `quickNote` and `quickNoteSavedAt` inside the `ChannelLead` and `Lead` objects via existing `saveChannelLeads` and `localStorage`.
  - *Why*: Eliminates secondary state stores, avoids synchronization lag, and guarantees persistence across all views.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Quick Notes Architecture                        │
│                                                                        │
│  ┌───────────────────────┐      ┌───────────────────────────────────┐  │
│  │ ChannelLead Model     │      │ QuickNoteModal Component          │  │
│  │  - quickNote?: string │ ───► │  - Preset Tags (1-click append)   │  │
│  │  - quickNoteSavedAt?  │      │  - Freeform Text Area             │  │
│  └───────────────────────┘      │  - Save / Delete / Cancel Actions │  │
│             │                   └───────────────────────────────────┘  │
│             ▼                                     │                    │
│  ┌──────────────────────────────────────────────┐ │ (State Mutation)   │
│  │ Today's Schedule & Sent Today Cards          │ │                    │
│  │  - Amber Sticky Note Box (Full Text Preview) │◄┘                    │
│  │  - "📝 Add Note" / "✏️ Edit Note" Trigger    │                      │
│  └──────────────────────────────────────────────┘                      │
│             │                                                          │
│             ▼                                                          │
│  ┌──────────────────────────────────────────────┐                      │
│  │ Persistence Layer (localStorage)             │                      │
│  │  - email_leads_v2, instagram_leads_v2, ...   │                      │
│  └──────────────────────────────────────────────┘                      │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & State Mapping

1. **`src/types.ts`**:
   - Add `quickNote?: string;` and `quickNoteSavedAt?: string;` to `ChannelLead` and `Lead`.
2. **`src/components/QuickNoteModal.tsx`**:
   - Props: `isOpen`, `onClose`, `lead: ChannelLead | null`, `onSave: (note: string) => void`, `onDelete: () => void`.
   - Preset chips: `"Call Booked"`, `"Gatekeeper"`, `"Check Next Week"`, `"Pricing Question"`, `"Owner Direct"`.
3. **`src/components/TodaysSchedulePage.tsx`**:
   - Add `activeNoteLead: ChannelLead | null` state.
   - Render the amber sticky note box when `lead.quickNote` is present.
   - Render the `"📝 Add Note"` button when no note exists.
   - Mount `<QuickNoteModal />` with live update handler.
4. **`src/components/channel/FollowupScheduleSubPage.tsx` & `LeadsSubPage.tsx`**:
   - Render note previews and edit triggers across all channel sub-tabs.
