# Multi-Channel Outreach Command Center

A high-velocity, multi-channel outreach platform featuring dedicated isolated workspaces for **Email**, **Instagram**, and **Facebook**, comprehensive **Executive Dashboard** metrics, and **Insights & Analysis**, backed by persistent drag-and-drop reordering, customized DM pitch authoring, automated dispatch scheduling, and an offline-resilient mockup image vault.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The architectural decisions below synthesize the user prompt and the confirmed preferences from Phase 1 clarifications.

- **Confirmed Decision 1 (Channel Data Initialization)**: Every channel (Email, Instagram, Facebook) begins completely clean and fresh with 0 initial leads, giving the user an organized, unpolluted workspace ready for real link intake.
- **Confirmed Decision 2 (Link Intake & Business Naming)**: When a user pastes a profile or target link into the intake input box and presses Enter, an intuitive, streamlined modal prompts the user to enter or confirm the business name (pre-populated with an intelligent heuristic extraction from the URL) before auto-assigning the next sequential ID.
- **Confirmed Decision 3 (Mockup & Image Persistence)**: Mockup screenshots are stored using a client-side **IndexedDB Image Store** (`idb-keyval` / native IndexedDB API) ensuring zero-loss persistence across page refreshes even without cloud latency, coupled with Firebase sync readiness for cloud backups.
- **Confirmed Decision 4 (Drag & Drop Architecture)**: Implemented using `@dnd-kit/core` and `@dnd-kit/sortable` (with pointer and keyboard sensor fallbacks and touch action support) for smooth, native-feeling row reordering on both desktop and mobile devices.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms the client closer app into a unified multi-channel outreach control center. Users manage separate pipelines for Email, Instagram, and Facebook outreach. Each channel contains 5 dedicated sub-workflows: Leads management with draggable priority ordering, customized DM pitch drafting, exact dispatch date scheduling, chronological follow-up tracking with red-highlighted alerts for today/overdue dispatches, and a visual mockup screenshot vault.
- **Target Audience / Persona**: Growth operators, high-ticket agency founders, B2B closers, and solo sales reps who run multi-platform outbound campaigns and need strict channel isolation and instant access to pitches and mockups.
- **Key Value**: Eliminates context-switching and messy spreadsheets. Replaces brittle bookmarks with structured ID-indexed pipelines, customized pitch persistence, visual proof assets, and executive overview metrics.

---

### 2. User Experience & Visual Design

#### Global Navigation (Strict 5-Button Layout)
The header strictly adheres to the top navigation contract with exactly 5 top-level views:
1. **Email** (Workspace)
2. **Instagram** (Workspace)
3. **Facebook** (Workspace)
4. **Executive Dashboard** (Unified cross-channel metrics)
5. **Insights & Analysis** (Funnel velocity, adherence, and performance breakdown)

#### Channel Workspaces (Email, Instagram, Facebook)
Each channel workspace displays an active channel indicator (with brand-accented icon and clean typography) and an internal 5-tab sub-navigation bar:
- **Sub-page A: LEADS**
  - *Intake Input Box*: Prominent single input bar at the top with quick paste shortcut, placeholder: `"Paste link (e.g. instagram.com/handle or domain.com) and press Enter..."`.
  - *Name Modal*: Clean, focused popup prompting for the business name upon pressing Enter, auto-suggesting an extracted name from the link.
  - *Draggable Table*: High-density data grid displaying **ONLY**:
    1. **ID** (e.g. `#IG-1`, `#EM-1`, `#FB-1` with monospace tabular figures)
    2. **Name** (Bold business name, editable inline or via details)
    3. **Link** (Clean clickable external link with truncation)
    4. **Actions** (Drag handle icon on the left, Delete button with confirmation on the right)
  - *Drag & Drop*: Rows can be dragged vertically to re-rank priority. The custom order persists instantly to storage.
  - *Data Backup*: Prominent "Export Data" button offering 1-click download as CSV or formatted JSON.
- **Sub-page B: DM**
  - *Display*: Table / list of all channel leads indexed by ID and Name.
  - *Pitch Editor*: Each lead displays an "Edit Pitch" button with preview of current pitch status (Drafted vs. Empty).
  - *Modal/Inline Textarea*: Clicking opens an expansive pitch editor with copy-to-clipboard, placeholder tokens (e.g., `{name}`, `{link}`), and a persistent "Save" button uniquely bound to the Lead ID.
- **Sub-page C: SCHEDULE**
  - *Display*: Clean list of leads by ID with their current scheduled status.
  - *Date Assignment*: Dedicated modern HTML5 date picker next to each lead. Selecting a date updates and persists the schedule immediately.
- **Sub-page D: FOLLOW-UP SCHEDULE**
  - *Display*: Shows only leads that have an assigned date, sorted chronologically from earliest to latest.
  - *Visual Alerts*: Leads scheduled for **Today** or **Overdue** are highlighted with a prominent crimson warning border, badge, and light red surface glow. Leads scheduled for the future display clean neutral styling.
  - *Status Marking*: Direct "Mark as Sent/Completed" checkbox button that toggles the dispatch state and logs the completion timestamp.
- **Sub-page E: MOCKUP**
  - *Display*: List of leads by ID.
  - *Upload & Save*: File upload dropzone/button per lead supporting PNG, JPG, and WebP screenshots. Automatically compresses and persists to IndexedDB.
  - *Preview & Download*: Shows an interactive thumbnail preview next to the Lead ID. Clicking opens a full lightbox preview. Includes a direct "Download" button to save the image locally and a "Delete" button to clear the mockup.

#### Executive Dashboard & Insights
- **Executive Dashboard**: Cross-channel KPI cards (Total Pipeline Value, Active Leads, Pitches Ready, Scheduled This Week, Completed Outreaches), channel distribution charts, and quick-action alerts for pending tasks across all 3 channels.
- **Insights & Analysis**: Conversion funnel ratios, schedule adherence score, overdue resolution rate, and average response velocity.

#### Visual Styling & Theme
- **Color Discipline**: Deep void background (`#080C14`), elevated surface cards (`#0F172A` / `#162032`), hairline structural borders (`rgba(255,255,255,0.08)`), and intentional accents:
  - Email: Electric Indigo (`#6366F1`)
  - Instagram: Sunset Rose/Violet (`#EC4899`)
  - Facebook: Cerulean Sky (`#0284C7`)
  - Alerts: Vivid Crimson (`#EF4444`)
- **Typography**: Clean display sans-serif (`Plus Jakarta Sans` / `Outfit`) for headers and workspace titles, paired with readable body sans (`DM Sans`) and tabular monospace figures (`font-mono tabular-nums`) for IDs and dates.
- **Mobile Friendly**: Touch-optimized hit targets ($\ge 44\text{px}$), horizontal scrollable sub-tabs with fading indicators, and responsive card layouts for small viewports.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Channel Data Separation**
  - *Approach*: State partitioned under separate top-level keys (`leads_email`, `leads_instagram`, `leads_facebook`, `mockups_email`, etc.).
  - *Why*: Ensures strict zero-leakage isolation. Adding, sorting, or deleting a lead in Instagram will never touch or mutate Email or Facebook data.
- **Decision 2: IndexedDB for Mockup Images**
  - *Approach*: Use IndexedDB via a lightweight wrapper for large binary/base64 image storage, keeping lead metadata (IDs, links, text, dates) in fast reactive state and localStorage.
  - *Why*: LocalStorage has a strict 5MB quota that breaks when storing multiple high-res mockup screenshots. IndexedDB handles 50MB+ effortlessly, persists across sessions, and works seamlessly offline.
- **Decision 3: Drag & Drop with `@dnd-kit`**
  - *Approach*: Install and implement `@dnd-kit/core` and `@dnd-kit/sortable` with vertical sort strategy.
  - *Why*: Industry-standard, accessible, zero-dependency library that supports mouse, touch, and keyboard drag interactions reliably without breaking on modern mobile browsers.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GLOBAL HEADER NAVIGATION                              │
│   [ Email ]   [ Instagram ]   [ Facebook ]   [ Executive ]   [ Insights ]  │
└───────────────────────┬─────────────────────────────────────────────────────┘
                        │ Active View Routing
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────────────────────────────┐
│ CHANNEL WORKSPACE         │ │ OVERVIEW VIEWS                                │
│ (Email / Instagram / FB)  │ │ • Executive Dashboard (Aggregated metrics)    │
│ ┌───────────────────────┐ │ │ • Insights & Analysis (Adherence & velocity)  │
│ │ [Leads] [DM] [Sched]  │ │ └───────────────────────────────────────────────┘
│ │ [Follow-up] [Mockup]  │ │
│ └───────────┬───────────┘ │
│             │             │
│   ┌─────────┴─────────┬───────────────────┬─────────────────┐
│   ▼                   ▼                   ▼                 ▼
│ Sub-page A        Sub-page B          Sub-page C        Sub-page D / E
│ Draggable Table   DM Pitch Editor     DatePicker        Follow-up & Mockups
│ + CSV Export      (Persisted Text)    (Target Date)     (Overdue & Images)
└───────────┬─────────────────────────────────────────────────┬───────────────┘
            │                                                 │
            ▼                                                 ▼
┌───────────────────────────┐                     ┌───────────────────────────┐
│ LOCALSTORAGE SYNC STORE   │                     │ INDEXEDDB IMAGE STORE     │
│ • Channel Leads State     │                     │ • Full-res screenshots    │
│ • Custom Sort Orders      │                     │ • Thumbnail cache         │
│ • DM Pitch Drafts         │                     │ • Fast local retrieval    │
│ • Scheduled Dates & Status│                     │ • Cloud sync ready        │
└───────────────────────────┘                     └───────────────────────────┘
```

#### Core Data Entities

```typescript
export type OutreachChannel = 'email' | 'instagram' | 'facebook';

export interface ChannelLead {
  id: string; // e.g. "IG-1", "EM-12", "FB-5"
  numericId: number; // For sequential ID allocation
  name: string; // Business/prospect name
  link: string; // Profile, page, or website URL
  channel: OutreachChannel;
  sortOrder: number; // Drag-and-drop sort rank
  createdAt: string; // ISO timestamp

  // Sub-page B: DM
  customPitch?: string; // Persisted custom DM text
  pitchSavedAt?: string;

  // Sub-page C: Schedule
  scheduledDate?: string; // YYYY-MM-DD
  isScheduled?: boolean;

  // Sub-page D: Follow-up Status
  isCompleted?: boolean;
  completedAt?: string;

  // Sub-page E: Mockup
  hasMockup?: boolean;
  mockupId?: string;
  mockupUploadedAt?: string;
}

export interface MockupRecord {
  id: string;
  leadId: string;
  channel: OutreachChannel;
  dataUrl: string; // Base64 data URL stored in IndexedDB
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}
```
