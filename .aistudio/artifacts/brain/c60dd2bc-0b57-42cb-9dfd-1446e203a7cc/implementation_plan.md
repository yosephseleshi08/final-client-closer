# Sunday Auto-Detection, Advanced Queue Override, and Floating Add Lead Button

Seamless Sunday cadence automation with explicit manual queue overrides, paired with a high-velocity floating action button for instant lead intake across all channels.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during Phase 1 interactive clarification:
> - **Lead Insertion Position**: Newly created leads are prepended to the top of the table (`[newLead, ...leads]` at index 0) so they appear instantly in view without scrolling down.
> - **Data Preservation**: Existing leads (including user's 17 recorded leads and localStorage records) are strictly preserved—no wipes, resets, or re-ordering of historical records.
> - **Sunday Override Banner**: Clicking "⚠️ Show My Queues Anyway (Advanced)" renders a prominent top banner on Today's Schedule allowing 1-click return to Sunday Prep Mode at any time.

---

## 1. Overview & Core Concept

This update refines the Sunday cadence experience and streamlines lead prospecting:
- **Part 1: Sunday Auto-Detection & Override**:
  - Automatically activates Sunday Prep Mode on load whenever the local day of week is Sunday (`date.getDay() === 0`).
  - Pre-initializes the "Sunday Mode Preview" toggle to `ON` if it is Sunday, or `OFF` on weekdays.
  - Adds a prominent `"⚠️ Show My Queues Anyway (Advanced)"` button at the bottom of the Sunday Prep view. Clicking it temporarily suspends Sunday mode and displays the standard daily queues ("New Outreach Due", "Follow-Ups Due", "Overdue Priority", and "Sent Today") for urgent deals.
  - While override is active, a persistent top banner clearly states that Sunday override is active, with a one-click button to re-engage Sunday Prep Mode.
  - **Zero Data Loss**: All lead queues, follow-up timers, and scheduled dates remain intact in localStorage.
- **Part 2: Floating Add Lead Button**:
  - A prominent, circular floating action button (FAB) styled in high-contrast purple/indigo (`bg-indigo-600 hover:bg-indigo-500 shadow-2xl`) fixed to the bottom-right corner.
  - Restricted to the **Leads** sub-tab across Instagram, Facebook, and Email (hidden on DM, Schedule, Follow-up, and Mockup sub-pages).
  - Clicking opens a clean, centered modal dialog (`fixed inset-0 flex items-center justify-center`) with fields for link/handle and business name.
  - Upon submission, validates channel URL format, executes duplicate check, and immediately prepends the new lead to index 0.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Sunday Landing & Default Toggle State**:
   - The user opens Today's Schedule on a Sunday: Sunday Prep Mode displays immediately by default.
   - The preview toggle displays `🌿 Sunday Mode: Active` (or `Preview: ON`).
   - On weekdays (Mon–Sat), the schedule opens to standard queues, and the toggle is available for previewing.
2. **"Show My Queues Anyway" Emergency Override**:
   - At the bottom of `SundayPrepView`, the user sees an amber/slate action card: `"⚠️ Show My Queues Anyway (Advanced)"`.
   - Clicking immediately reveals the standard execution queues (Overdue, New Outreach Due, Follow-Ups Due, and Sent Today).
   - A persistent, sticky top alert notifies: `"⚠️ Sunday Override Active — Showing Daily Queues"` with a button `"🔒 Return to Sunday Prep Mode"`.
3. **Floating Lead Intake across Channels**:
   - When viewing `Instagram > Leads`, `Facebook > Leads`, or `Email > Leads`, a circular `+` button floats at `bottom-8 right-8` (or above the bottom footer).
   - Hovering triggers a smooth scale micro-interaction (`hover:scale-105 active:scale-95`).
   - Clicking opens the centered "Add New Prospect" modal with auto-focus on the link input.
   - Entering the link automatically suggests the business name.
   - Submitting adds the lead to the very top (Row 1) with an instant highlight animation.

### Visual Identity & Theme

- **Palette**: Dark slate canvas (`#080c14`), structural card surfaces (`bg-slate-900/80`, `border-white/10`), vibrant indigo/purple action accent (`bg-indigo-600`, `shadow-indigo-600/50`), and warning amber accent (`amber-500/20`, `border-amber-500/40`, `text-amber-300`).
- **Typography**: `Outfit` for display headings, `Plus Jakarta Sans` for body, `font-mono tabular-nums` for lead IDs and dates.
- **Button Placement**: Positioned at `fixed bottom-8 right-8 z-40` with adequate clearance above the footer bar.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Sunday State Initialization & Override State**:
  - *Chosen Approach*: Track `isActualSunday = isTodaySunday()`, `forceSundayPreview` (initialized to `isActualSunday`), and `showQueuesOverride` (boolean, defaults to `false`).
  - *Calculation*: `isSundayMode = (isActualSunday || forceSundayPreview) && !showQueuesOverride`.
  - *Why*: Provides 100% automatic Sunday detection without requiring user input, while offering both simulation toggle for weekdays and emergency override for actual Sundays.
- **Decision 2: Top Insertion with Non-Destructive Preservation**:
  - *Chosen Approach*: `const updated = [newLead, ...leads]`. Newly created leads take the first position, while the rest of the array remains unchanged in memory and localStorage.
  - *Why*: Eliminates the need to scroll through existing leads to confirm an addition, matching high-velocity intake workflows.
- **Decision 3: Scoped Floating Button Visibility**:
  - *Chosen Approach*: Render the floating button directly inside `LeadsSubPage.tsx`.
  - *Why*: Since `LeadsSubPage` is only mounted when `activeSubTab === 'leads'`, the button naturally disappears on DM, Schedule, Follow-up, and Mockup tabs without complex parent prop drilling.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Top Navigation (Header)                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│     TodaysSchedulePage       │        │       ChannelWorkspace       │
│ - isActualSunday = (day===0) │        │ (Instagram, Facebook, Email) │
│ - forceSundayPreview state   │        └──────────────┬───────────────┘
│ - showQueuesOverride state   │                       │
└──────────────┬───────────────┘         ┌─────────────┴─────────────┐
               │                         ▼                           ▼
       [isSundayMode]             [Leads Sub-Tab]             [Other Sub-Tabs]
       ┌───────┴───────┐                 │                           │
  (True)               (False)           ▼                           ▼
     │                     │     ┌───────────────┐           ┌───────────────┐
     ▼                     ▼     │ LeadsSubPage  │           │ DM / Schedule │
┌──────────────┐    ┌──────────┐ │ - Leads Table │           │ Mockup Views  │
│SundayPrepView│    │ Standard │ │ - Floating +  │           │ (No FAB)      │
│- Quotes      │    │  Queues  │ │   Button (FAB)│           └───────────────┘
│- Stats       │    │- Sent    │ │ - Centered    │
│- Locked Mon  │    │- Overdue │ │   Add Modal   │
│- "Show Queues│    │- New Due │ └───────────────┘
│   Anyway"    │    │- Followup│
└──────────────┘    └──────────┘
```

### Component & Handler Specifications

1. **`src/components/SundayPrepView.tsx`**:
   - Add prop `onShowQueuesAnyway: () => void`.
   - Render a dedicated override card at the bottom:
     - Warning icon, headline: *"Need to check hot prospects or run Sunday calls?"*
     - Button: `"⚠️ Show My Queues Anyway (Advanced)"`.
2. **`src/components/TodaysSchedulePage.tsx`**:
   - Initialize `forceSundayPreview` to `isTodaySunday()`.
   - Add state `showQueuesOverride: boolean` (default `false`).
   - If `showQueuesOverride` is active, render an amber top reminder banner with `"🔒 Return to Sunday Prep Mode"`.
   - Toggle switch in header synchronizes with `forceSundayPreview` and resets `showQueuesOverride` when toggled.
3. **`src/components/channel/LeadsSubPage.tsx`**:
   - Add state `isAddLeadModalOpen: boolean`.
   - Render fixed circular FAB: `fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl flex items-center justify-center`.
   - Render centered `AddLeadModal` with inputs for Link and Name.
   - On save: prepend `[newLead, ...leads]`, update localStorage, and trigger brief highlight.
