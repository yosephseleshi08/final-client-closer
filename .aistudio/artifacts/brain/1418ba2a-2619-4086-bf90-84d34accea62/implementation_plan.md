# Local Time Zone Date Normalization & Non-Destructive Queue Dismissal

Fix the date matching logic to strictly evaluate the user's local timezone date (eliminating UTC drift and normalizing formats like `MM/DD/YYYY` and `YYYY-MM-DD`), and introduce a non-destructive **"Remove" / "Dismiss"** button on daily queue cards that hides leads from today's view while keeping them safely stored in the Leads database.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The architectural decisions below synthesize the user prompt and the confirmed preferences from Phase 1 clarifications:

- **Confirmed Decision 1 (Local Time Zone Date Normalization)**:
  - Eliminate all usages of `new Date().toISOString().split('T')[0]` across all schedule, queue, and filter files, as `toISOString()` forces UTC conversion and causes date mismatch for users in local timezones (e.g. UTC-7).
  - Implement a universal `normalizeToLocalDateStr(rawInput)` that safely parses any format (`YYYY-MM-DD`, `MM/DD/YYYY`, `M/D/YYYY`, timestamps) into standard local `YYYY-MM-DD`.
  - Ensure any lead scheduled for today's local date (`2026-10-24`) immediately appears in "Today's Schedule".
- **Confirmed Decision 2 (Non-Destructive "Remove" / "Dismiss" Queue Action)**:
  - Add a dedicated **"Remove"** (or **"Dismiss"**) button to each lead card in **"Today's Schedule"** and the **"Follow-Up Schedule"** sub-tabs.
  - Clicking this action stamps `dismissedDate: localTodayStr` on the lead record.
  - The lead is immediately removed from today's active execution queue so the user can clear their deck.
  - **Zero Data Loss**: The lead remains permanently and safely stored in the "Leads" tab and database. The permanent "Delete" button remains strictly isolated to the "Leads" tab table.
  - **Next-Day Reappearance**: If the lead is still unsent tomorrow, it will automatically reappear as overdue tomorrow.
- **Confirmed Decision 3 (Accidental Dismissal Recovery)**:
  - Provide a subtle, non-intrusive "Dismissed for Today (X) · Restore" banner at the bottom of the daily queue so accidental clicks can be undone in 1 click.

---

### 1. Overview & Bug Root-Cause Analysis

#### Root Cause of the Date Matching Bug
1. `new Date().toISOString().split('T')[0]` evaluates the timestamp at UTC 00:00:00, whereas the user is in local time (e.g., PDT `UTC-07:00`). At late hours or across daylight transitions, UTC date is 1 day ahead of local date.
2. If a user manually typed or scheduled a date in format `10/24/2026`, strict string equality `dateStr === todayStr` failed because `todayStr` was formatted `2026-10-24`.

#### Bug Resolution
- Centralized date parser and generator in `src/utils/cadenceEngine.ts`:
  - `getLocalTodayStr()`: Uses `getFullYear()`, `getMonth() + 1`, and `getDate()` from the browser's local timezone.
  - `normalizeToLocalDateStr(dateStr)`: Standardizes `MM/DD/YYYY` or `YYYY-MM-DD` into a consistent local `YYYY-MM-DD` string.
  - `isDateToday(dateStr)`: Compares normalized input against `getLocalTodayStr()`.
  - Replace all remaining `toISOString().split('T')[0]` instances in `ScheduleSubPage.tsx`, `TodaysSchedulePage.tsx`, `ExecutiveDashboard.tsx`, and `ChannelWorkspace.tsx`.

---

### 2. User Experience & Visual Design

#### 1. Daily Queue Card Actions Update
Each card in **"Today's Schedule"** and **"Follow-Up Schedule"** will now display:
- **"Mark as Sent"** / **"Mark FU Sent"** (Primary action button)
- **"👀 Seen"** (Toggles seen badge without stopping cadence)
- **"Replied!"** (Marks replied and archives)
- **"Open Profile"** (External link)
- **"Dismiss / Remove"** (New button with `EyeOff` / `X` icon):
  - Label: `"Remove"` / `"Dismiss"`
  - Tooltip: *"Dismisses from today's queue only. Lead remains safely stored in your Leads database."*
  - Clicking immediately removes the card from today's view.

#### 2. Dismissed Items Counter & Restore Bar
- When any leads have been dismissed for today, display a quiet footer bar:
  - `“3 leads dismissed from today's queue · [Restore All]”`
  - Allows reviewing and restoring any dismissed prospect without having to leave the daily dashboard.

---

### 3. Data Model & Storage Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CHANNEL LEAD RECORD                              │
│  {                                                                          │
│    id: "IG-1",                                                              │
│    name: "Artisan Bakery",                                                  │
│    link: "instagram.com/artisanbakery",                                     │
│    scheduledDate: "2026-10-24", // Normalized local date                    │
│    dismissedDate: "2026-10-24", // Stamped when user clicks "Remove"        │
│    ...                                                                      │
│  }                                                                          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│ TODAY'S SCHEDULE QUEUE       │              │ LEADS TAB DATABASE           │
│ • Filter condition:          │              │ • Displays ALL leads         │
│   scheduledDate matches today│              │ • Permanent "Delete" button  │
│   AND                        │              │ • Unaffected by dismissal    │
│   dismissedDate !== today    │              │                              │
│ • "Remove" button stamps     │              └──────────────────────────────┘
│   dismissedDate = localToday │
└──────────────────────────────┘
```

#### Lifecycle State Transitions

| Lead Scheduled Date | `dismissedDate` | System Local Date | Visible in Today's Schedule? | Visible in Leads Tab? |
|---|---|---|---|---|
| `2026-10-24` | `undefined` | `2026-10-24` | **YES** (New Outreach Due) | **YES** |
| `2026-10-24` | `2026-10-24` (Clicked Remove) | `2026-10-24` | **NO** (Dismissed for today) | **YES** |
| `2026-10-24` (Unsent) | `2026-10-24` | `2026-10-25` (Tomorrow) | **YES** (Reappears as Overdue) | **YES** |

---

### 4. Technical Implementation Steps

1. **`src/utils/cadenceEngine.ts`**:
   - Add `normalizeToLocalDateStr(rawInput)` to parse `MM/DD/YYYY`, `M/D/YYYY`, and `YYYY-MM-DD` safely.
   - Refactor `getLocalTodayStr()`, `addDays()`, `getDayDifference()`, `isDateToday()`, and `isDateOverdue()` to strictly use normalized local dates.
   - Add `dismissLeadForToday(lead)` and `restoreDismissedLead(lead)` helpers.
2. **`src/types.ts`**:
   - Add `dismissedDate?: string` to `ChannelLead`.
3. **`src/components/TodaysSchedulePage.tsx`**:
   - Update queue filters to exclude leads where `lead.dismissedDate === getLocalTodayStr()`.
   - Add `"Remove"` button on every card in Overdue, New Outreach Due, and Follow-Ups Due sections.
   - Add "Dismissed for Today" drawer/banner with 1-click restore.
4. **`src/components/channel/FollowupScheduleSubPage.tsx`**:
   - Update `due_today` tab to respect `dismissedDate !== getLocalTodayStr()`.
   - Add `"Remove"` button on each card.
5. **`src/components/channel/ScheduleSubPage.tsx`**:
   - Ensure date selection and quick preset buttons (`Today`, `Tomorrow`, `+3 Days`) generate normalized local dates without UTC drift.
