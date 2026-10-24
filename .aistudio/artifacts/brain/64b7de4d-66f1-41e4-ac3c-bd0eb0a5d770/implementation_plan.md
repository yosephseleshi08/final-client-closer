# Lead Ordering, Categorization & Pipeline Stabilization Engine

A deterministic status-first and weekday-second ordering architecture across all lead views (CRM Database table, Channel Pages, and Executive Dashboard) paired with comprehensive multi-channel exports, strict tie-breaking to eliminate random list jitter, and complete error auditing.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed via interactive clarification and will govern the ordering and display behavior across all views:

- **Confirmed Sorting Hierarchy**: Status priority first as the primary sort dimension, followed by Scheduled Weekday (Monday through Sunday) as the secondary sort dimension, with a deterministic ID/name tiebreaker so rows never randomly shift or swap positions.
- **Confirmed Status Priority Sequence**: Action-needed priority flow (`Not Sent` ➔ `Seen` ➔ `Replied` ➔ `Sent` ➔ `Mockup Sent` ➔ `Call Booked` ➔ `Proposal Sent` ➔ `Closed Won` ➔ `Closed Dead`). This keeps pending outreach and hot engagement at the very top of every list while preserving pipeline integrity.
- **Confirmed Scope of Application**: Applied universally across the main CRM Database table, all Channel Leads views (Instagram, Facebook, Email), and the Executive Dashboard today's outreach queue.
- **Export & Download Center**: Instant 1-click comprehensive CSV and JSON downloads containing every single detail (37 complete data columns, notes, audit checklists, pitch hooks, and full touchpoint activity history trails).

---

### 1. Overview & Core Concept

- **What It Does**: Replaces non-deterministic and fragmented lead sorting with a unified, centralized sorting engine (`leadSortHelper.ts`). Leads are categorized and ordered by Action-Needed Status first (`not_sent` ➔ `seen` ➔ `replied` ➔ `sent` ➔ pipeline milestones ➔ `closed`), then ordered chronologically by scheduled day (`Monday` through `Sunday`), and permanently stabilized with a deterministic fallback tiebreaker (`id`).
- **Target Audience / Persona**: High-velocity solo agency owners, sales closers, and outreach operators who cannot afford random row shifting when working through daily outreach queues and switching tabs.
- **Key Value**: Predictable, rock-solid outreach rhythm where unsent leads and urgent responses are always immediately visible and reachable without manual digging, with 100% data exportability whenever needed.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Dashboard Today's Outreach Queue*: The user opens the Dashboard and sees today's scheduled outreach clearly separated by channel (Email, Facebook, Instagram) with actionable leads sorted strictly with `Not Sent` first, followed by active touchpoints.
  2. *CRM Database & Channel Pages*: When navigating the CRM table or switching between Instagram, Facebook, and Email views, leads stay anchored in their deterministic status order. Users can optionally toggle the sort mode via a clean segmented header control if they want to view by weekday or name.
  3. *Zero-Jitter Status Progression*: When the user clicks "Mark Sent" or logs a reply, the lead transitions smoothly to its new status section without erratic flickering or randomized sitting.
  4. *On-Demand Full Data Export*: The user clicks "Download All Lead Details" from the Dashboard or CRM header to instantly receive a complete 37-column CSV or full JSON backup with zero data truncation.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Utilitarian SaaS high-density command center with dark slate elevation (`#080c14` background, `#0d1322` card containers, and `#1e293b` subtle borders).
  - *Color Discipline*: 60% deep neutral slate canvas, 30% structural table surfaces with 1px hairline dividers, 10% purposeful accents (Indigo `#6366f1` for primary actions, Emerald `#10b981` for closed/active, Sky `#0284c7` for pending status).
  - *Zero-Pill Discipline*: Lead status indicators and weekday stamps are rendered as high-legibility clean badges with subtle hairline borders, avoiding garish candy capsules or excessive dot scatter.
  - *Tabular Figures*: All counts, financial figures (`$299`), percentages, and lead IDs strictly use monospace tabular numerals (`font-mono tabular-nums`) to ensure strict vertical column alignment.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Centralized Sorting Helper vs. Component-Local Sorts**
  - *Chosen Approach*: Create a single authoritative sorting utility (`src/utils/leadSortHelper.ts`) that defines `STATUS_ACTION_PRIORITY`, `WEEKDAY_PRIORITY`, and `sortLeadsDeterministically(...)`, consumed by all views.
  - *Why*: Eliminates discrepancies where one page sorted `sent` first while another sorted `not_sent` first, preventing leads from appearing to "randomly sit" when switching between pages.
  - *Alternatives Considered*: Independent sorting logic inside each component (passed over because it caused fragmented state and sorting drift).

- **Decision 2: Deterministic Tiebreaker Strategy**
  - *Chosen Approach*: Composite secondary and tertiary ordering: `status priority` ➔ `weekday order (Mon-Sun)` ➔ `descending lead ID (b.id - a.id)`.
  - *Why*: Ensures mathematical stability across all array mutations, filter changes, and status updates.
  - *Alternatives Considered*: Alphabetical restaurant name tiebreaker (passed over because leads with identical or missing names would still have non-deterministic order).

- **Decision 3: Export Architecture**
  - *Chosen Approach*: Comprehensive 37-column CSV with UTF-8 BOM encoding and standard RFC-4180 quotation escaping, alongside raw JSON backup.
  - *Why*: Guarantees seamless compatibility with Microsoft Excel, Apple Numbers, and Google Sheets without special character corruption.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App State (leads, logs)                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                   ┌────────────────┴────────────────┐
                   ▼                                 ▼
      ┌─────────────────────────┐       ┌─────────────────────────┐
      │   leadSortHelper.ts     │       │     exportService.ts    │
      │  - STATUS_ACTION_ORDER  │       │  - Full 37-Column CSV   │
      │  - WEEKDAY_ORDER        │       │  - Full JSON Backup     │
      │  - Deterministic Sorter │       │  - UTF-8 BOM Generator  │
      └────────────┬────────────┘       └────────────┬────────────┘
                   │                                 │
         ┌─────────┼─────────────────────────┐       │
         ▼         ▼                         ▼       ▼
┌──────────────┐ ┌───────────────────┐ ┌───────────────────────────┐
│ Executive    │ │ CrmDatabase.tsx   │ │ ChannelLeadsPage.tsx      │
│ Dashboard    │ │ - Status & Day    │ │ - Channel-Specific Queue  │
│ - Today Queue│ │   Structured View │ │ - Deterministic Ordering  │
│ - Channel CTA│ │ - Segmented Sort  │ │ - 1-Click Action Flow     │
└──────────────┘ └───────────────────┘ └───────────────────────────┘
```

- **Data Model & State**:
  - `STATUS_ACTION_ORDER`: `not_sent: 1`, `seen: 2`, `replied: 3`, `sent: 4`, `mockup_sent: 5`, `call_booked: 6`, `proposal_sent: 7`, `closed_won: 8`, `closed_dead: 9`.
  - `WEEKDAY_ORDER`: `Monday: 1`, `Tuesday: 2`, `Wednesday: 3`, `Thursday: 4`, `Friday: 5`, `Saturday: 6`, `Sunday: 7`, `Unassigned: 8`.
  - `Tiebreaker`: Strict `b.id - a.id` ensuring mathematical determinism across React render cycles.
- **Interactive Component Mapping**:
  - `ExecutiveDashboard.tsx`: Updates `todayScheduledLeads` and channel sub-queues with the canonical action-needed sorting; maintains rapid download buttons.
  - `CrmDatabase.tsx`: Updates table sort modes with `Status Priority (Action First)` as default, with clean segmented controls to view by weekday or alphabetical.
  - `ChannelLeadsPage.tsx`: Normalizes Instagram, Facebook, and Email queues to use the unified sorter.
  - `DailyDispatchDeck.tsx`: Stabilizes both the DM queue and the follow-up overdue queue with deterministic status and day sorting.
