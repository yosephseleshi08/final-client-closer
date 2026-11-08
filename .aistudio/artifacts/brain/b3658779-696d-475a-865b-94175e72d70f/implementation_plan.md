# Fresh History Initialization & Pre-Launch Protocol

Establish a clean, fresh baseline for the 30-Day History Matrix and Streak Engine by eliminating false red "0% Missed" indicators prior to outreach kickoff, introducing neutral "Pre-Launch" calendar states, and activating streak tracking dynamically on the operator's first initial outreach dispatch.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design and behavioral choices were confirmed during the interactive interview and govern this update:

- **Confirmed Decision 1 (Calendar Presentation)**: Dates prior to the operator's first initial outreach day will display as **Neutral slate dots with "Pre-Launch" status** rather than red "0% Missed" failure markers.
- **Confirmed Decision 2 (Streak & Stats Baseline)**: The Streak Counter and 30-Day Completion Rate will initialize at **0 with a prominent "Ready to Launch" badge**, activating dynamically once the first verified initial DM dispatch is recorded.
- **Confirmed Decision 3 (Ledger Reset & Purge)**: The "Reset History" action will purge legacy records and re-index the outreach kickoff date dynamically based on verified lead dispatches.

---

## 1. Overview & Core Concept

### What It Does
- **Dynamic Launch Detection**: Automatically inspects lead stores (`instagram` and `combined`) for the earliest `initialSentDate`. If no initial DMs have been dispatched yet, the entire workspace enters a clean **Pre-Launch** state.
- **Pre-Launch Matrix Differentiation**:
  - Days preceding the launch date display muted slate indicators (`⚪ Pre-Launch`) with 0% penalty and neutral borders.
  - Missed day penalties (red 🔴) only activate for business days *after* outreach kickoff where scheduled tasks were skipped.
  - Sunday Rest protocol (`🌿 Rest Day`) continues to provide 100% streak immunity.
- **One-Click Ledger Cleanse**: Empowers the operator to reset all historical logs with a single click, instantly cleaning up stale mock data or previous test runs.

### Target Persona & Context
Outbound deal closers and agency operators setting up their CRM pipelines on a Friday or weekend who want a pristine, unblemished 30-day matrix awaiting their first live dispatch on Monday morning.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ZERO-STATE / PRE-LAUNCH WORKFLOW                      │
└─────────────────────────────────────────────────────────────────────────────┘
  1. Open History Tab
     │
     ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ Executive Stats Banner:                                                 │
  │ • Current Streak: 0 Days [🚀 Ready to Launch]                           │
  │ • Best Streak: 0 Days Record                                            │
  │ • Average Completion Rate: 0% [Awaiting First Dispatch]                 │
  │ • Total Initial DMs Dispatched: 0 Initial DMs                           │
  └─────────────────────────────────────────────────────────────────────────┘
     │
     ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 30-Day Calendar Matrix:                                                 │
  │ • Past days displayed in calm slate (⚪ Pre-Launch)                      │
  │ • Sundays displayed in subtle rest styling (⚪ Rest Day)                │
  │ • Zero red '0% Missed' markers visible                                  │
  └─────────────────────────────────────────────────────────────────────────┘
     │
     ▼
  2. Mark First Initial DM as Sent in "Today's Schedule"
     │
     ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ Dynamic Activation:                                                     │
  │ • Launch date locked to today                                           │
  │ • Today marked as Active / Complete                                     │
  │ • Streak increments to 1 Day Active [🔥 Streak On]                      │
  │ • Subsequent calendar days now actively audited                         │
  └─────────────────────────────────────────────────────────────────────────┘
```

### Visual Identity & Theme Tokens
- **Pre-Launch Cells**:
  - Border: `border-white/5 hover:border-white/10`
  - Background: `bg-slate-900/30 hover:bg-slate-900/50`
  - Indicator: `bg-slate-600` (muted, anti-alarmist)
  - Text: `text-slate-400 font-mono` with label `"Pre-Launch"`
- **Streak Status Badges**:
  - Pre-Launch: `bg-indigo-500/10 text-indigo-300 border-indigo-500/20` (`🚀 Ready to Launch`)
  - Active: `bg-orange-500/15 text-orange-400 border-orange-500/30` (`🔥 Day Active`)
- **Matrix Legend Rebalancing**:
  - `🟢 100% Complete`
  - `🟡 1–99% Partial`
  - `🔴 Missed (Active Outreach Days Only)`
  - `⚪ Sunday Rest Day`
  - `⚫ Pre-Launch (Unstarted)`

---

## 3. Key Technical Decisions & Trade-Offs

| Decision | Selected Approach | Rationale | Alternatives Considered |
|---|---|---|---|
| **Launch Day Detection** | Dynamic scan of `earliestInitialSentDate` across all leads | Automatically adapts when the user sends their first real DM without requiring manual date configuration. | Hardcoded kickoff date (brittle, breaks when starting on a new date). |
| **Pre-Launch Status Type** | Add `'pre_launch'` to `DailyHistoryStatus` union type | Gives explicit, strongly typed semantics to days before kickoff so renderers and streak calculators do not mistake them for missed days. | Overloading `'zero'` with custom boolean flags (prone to edge-case bugs). |
| **Streak Calculation Guard** | Only audit days $\ge$ `earliestInitialSentDate` | Prevents days before the user ever used the system from penalizing the streak counter. | Calculating from arbitrary 30-day lookback (causes 0-streak lock). |

---

## 4. Technical Architecture & Component Mapping

### Architectural Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            STATE & LOGIC LIFECYCLE                           │
└──────────────────────────────────────────────────────────────────────────────┘
                                
  Channel Lead Stores (Instagram & Combined)
       │
       ▼
  findEarliestInitialSentDate(leads) ──► Is Launch Triggered?
       │                                     │
       ├─► NO (No DMs sent yet)              ├─► YES (DMs sent starting D_0)
       │   • All calendar dates < today      │   • Dates < D_0: 'pre_launch'
       │     evaluated as 'pre_launch'       │   • Dates >= D_0: audited
       │   • Streaks = 0 [Ready to Launch]   │   • Streaks calculated from D_0
       │   • Red missed dots suppressed      │   • Red missed dots only for
       │                                     │     skipped active business days
       ▼                                     ▼
  ┌────────────────────────────────────────────────────────────────────────────┐
  │                   HistoryPage (30-Day Matrix & Audit Log)                  │
  │  • Matrix cells render 'pre_launch' in calm slate                         │
  │  • Streak cards display verified metrics                                  │
  │  • Reset Ledger purges history & refreshes view                           │
  └────────────────────────────────────────────────────────────────────────────┘
```

### Module Modifications
1. **`src/types.ts`**:
   - Extend `DailyHistoryStatus` union: `'full' | 'partial' | 'zero' | 'sunday' | 'frozen' | 'pre_launch'`.
2. **`src/utils/historyStorage.ts`**:
   - Implement `getEarliestOutreachDate(leads)` to identify dynamic launch threshold.
   - Update `get30DayHistoryView(records, leads)` to assign `status: 'pre_launch'` for any date prior to launch.
   - Refactor `calculateStreaks(records, options)` so pre-launch days do not break streaks or lower completion rate.
   - Update `resetDailyHistory()` to wipe `outreach_daily_history` and return an empty array.
3. **`src/components/HistoryPage.tsx`**:
   - Style `'pre_launch'` calendar matrix cards and audit log entries with calm slate tokens.
   - Update Top Executive Cards to display `"🚀 Ready to Launch"` when `totalInitialDMsDispatched === 0`.
   - Update Legend to display Pre-Launch state.

---

## 5. Verification & Testing Plan

1. **Clean Zero-State Verification**:
   - Click "Reset History" in the History Tab.
   - Confirm all non-Sunday past days render with muted slate dots and "Pre-Launch" label.
   - Verify that NO red "0% Missed" dots appear in the matrix.
   - Confirm Current Streak is 0 with `"🚀 Ready to Launch"` badge.
2. **Dynamic Outreach Kickoff**:
   - Navigate to "Today's Schedule" and mark 1 initial outreach task as sent.
   - Return to "History" tab: verify that today's date transitions from Pre-Launch to Active, streak activates to 1, and prior days remain cleanly marked as Pre-Launch.
3. **Compilation & Lint Verification**:
   - Execute `compile_applet` and `lint_applet` to guarantee zero syntax or typing errors.
