# History & Streaks Command Center

A permanent daily tracking system that logs outreach completion rates across 30-day cycles, visualizes historical consistency through an interactive calendar grid and chronological audit list, and calculates unbroken daily streaks with Sunday rest-day immunity. Seeded with the user's verified October 26, 2026 outreach data (6/6 DMs Sent, 100%) as the official origin day.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during Phase 1 interactive clarification:
> - **Visual Layout**: Interactive 30-day calendar matrix paired with an expandable chronological day-by-day detail log.
> - **Completion Logic**: 100% completion is awarded when all scheduled tasks for that day are fulfilled (`completedTasks === totalTasksScheduled`).
> - **October 26 Baseline & Real Data Preservation**: Rather than populating mock data, the system inspects existing leads sent on October 26, 2026 and writes an authentic 100% completion entry (`6/6 DMs Sent, 100%`) for Oct 26, 2026, establishing an immediate active streak without fabricated history.
> - **Sunday Immunity**: Sundays are designated as "⚪ Rest Day". Sundays never reset or break a streak; Monday seamlessly carries forward Saturday's streak.

---

## 1. Overview & Core Concept

- **What It Does**: Provides long-term accountability and visual momentum by recording daily outreach completion percentages, calculating active/best streaks, and rendering color-coded day states over rolling 30-day windows.
- **Target Audience**: Outbound agency operators and solopreneurs executing consistent multi-channel outreach who need permanent historical proof of work and streak gamification.
- **Key Value**: Replaces transient "today-only" memory with an unshakeable, persistent ledger that rewards discipline while respecting restful Sundays.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Top Navigation Access**:
   - The user clicks the new **"📊 History"** tab in the main header (positioned next to "Insights & Analysis").
2. **Streak Counter Dashboard**:
   - At the top of the History page, two high-impact metric cards display:
     - **🔥 Current Streak**: Active consecutive days hitting 100% (skipping Sundays). If today (Oct 27) has tasks pending, the streak reflects consecutive days completed up to yesterday (or increments to next level once today hits 100%).
     - **🏆 Best Streak**: All-time record streak count preserved across cycles.
     - **30-Day Completion Rate**: Aggregate average percentage across active working days.
3. **Interactive 30-Day Calendar Grid**:
   - A 5-week / 30-day calendar grid showing day numbers, completion badges, and status colors:
     - 🟢 **100%**: Emerald background ring/dot (`6/6 DMs Sent`).
     - 🟡 **1–99%**: Amber indicator (`Partial outreach`).
     - 🔴 **0%**: Crimson indicator (`Missed day`).
     - ⚪ **Sunday**: Slate/dimmed ring marked `Rest Day` (does not break streaks).
   - Clicking any calendar cell scrolls to or highlights that day's entry in the detailed list below.
4. **Chronological Detail Log**:
   - Clean, scannable day cards listed in reverse-chronological order (from today down to 30 days ago).
   - Each entry shows:
     - Formatted Date (e.g. `Oct 26, 2026` or `Today, Oct 27, 2026`).
     - Status dot (🟢, 🟡, 🔴, ⚪).
     - Breakdown: `100% · 6/6 DMs Sent` or `⚪ Rest Day · Sunday Protocol`.
     - Timestamp of last sync.
5. **Automatic Logging from Today's Schedule**:
   - Every time the user opens Today's Schedule or marks an outreach task as initial sent or follow-up sent, the engine recalculates today's percentage (`completed / totalDue`) and upserts today's entry in `localStorage['outreach_daily_history']`.
6. **Data Reset Modal**:
   - A "Reset History" button opens a confirmation modal requiring explicit confirmation ("Reset All History") before clearing the array.

### Visual Identity & Theme

- **Palette**: Dark slate canvas (`#080c14`), container borders (`border-white/10`), flame orange accents (`text-orange-400`, `bg-orange-500/10`), emerald highlights (`text-emerald-400`, `bg-emerald-500/10`), amber warning states (`text-amber-400`).
- **Typography**: Header titles in `Outfit`, metrics and dates in tabular monospace figures (`font-mono tabular-nums`), clean unboxed metadata with `·` separators (zero-pill discipline).
- **Accessibility**: Status dots paired with explicit text labels (`100% Complete`, `Rest Day`, `Partial`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Real-Data Baseline Initialization (Oct 26, 2026)**:
  - *Chosen Approach*: On first run of the history engine, automatically verify and insert October 26, 2026 as completed (`6/6 DMs Sent, 100%`) alongside any sent items from localStorage.
  - *Why*: Directly honors the user's specific instruction: October 26 was their official launch day with 6 sent DMs, providing an authentic 1-day starter streak.
- **Decision 2: Sunday Rest-Day Streak Immunity**:
  - *Chosen Approach*: The streak calculator iterates backwards day by day. When encountering a Sunday, it skips the day without breaking the chain and without requiring outreach.
  - *Why*: Supports sustainable work habits and aligns with the app's "Sunday Prep Mode" philosophy.
- **Decision 3: Today's Dynamic Status vs. Finished Days**:
  - *Chosen Approach*: If today is in progress (e.g., today is Tuesday Oct 27 and some DMs remain due), today's entry reflects live progress (e.g., `50% - 3/6 Sent`). The current streak counter counts completed days through yesterday, and automatically advances by +1 as soon as today hits 100%.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Global Header Navigation                        │
│   Today's Schedule  │  Instagram  │  Facebook  │  Insights  │  History │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │ (activeNavTab === 'history')
                        ┌──────────────▼──────────────┐
                        │        HistoryPage          │
                        │ ┌─────────────────────────┐ │
                        │ │ Streak & Metric Bar     │ │
                        │ │ [🔥 Streak] [🏆 Best]   │ │
                        │ └─────────────────────────┘ │
                        │ ┌─────────────────────────┐ │
                        │ │ 30-Day Calendar Matrix  │ │
                        │ └─────────────────────────┘ │
                        │ ┌─────────────────────────┐ │
                        │ │ Chronological Log List  │ │
                        │ └─────────────────────────┘ │
                        └──────────────┬──────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │   historyStorage Engine     │
                        │ - loadDailyHistory()        │
                        │ - recordTodayCompletion()   │
                        │ - calculateStreaks()        │
                        │ - initOctober26Baseline()   │
                        │ - resetHistory()            │
                        └──────────────┬──────────────┘
                                       │
                      localStorage['outreach_daily_history']
```

### Components & Modules

1. **`src/types.ts`**:
   - Extend `GlobalNavTab` to include `'history'`.
   - Define `DailyHistoryRecord`:
     ```typescript
     export interface DailyHistoryRecord {
       date: string; // 'YYYY-MM-DD'
       displayDate: string; // 'Oct 26, 2026'
       dmsSent: number;
       dmsTarget: number;
       percentage: number; // 0 to 100
       isSunday: boolean;
       status: 'full' | 'partial' | 'zero' | 'sunday';
       updatedAt: string;
     }
     ```
2. **`src/utils/historyStorage.ts`**:
   - `loadDailyHistory()`: Reads records, sorted descending by date.
   - `saveDailyHistory(records)`: Saves array to `outreach_daily_history`.
   - `initOctober26Baseline()`: Seeds Oct 26, 2026 record (`dmsSent: 6, dmsTarget: 6, percentage: 100`) if not yet present.
   - `calculateStreaks(records)`: Computes current streak and best streak respecting Sunday skips.
   - `recordTodayCompletion(sentCount, targetCount)`: Upserts today's entry with live calculations.
3. **`src/components/HistoryPage.tsx`**:
   - Top banner with streak cards: Current Streak (`🔥 X Days`), Best Streak (`🏆 Y Days`), and 30-day Completion Rate.
   - 30-day interactive calendar grid displaying week day headers (Sun to Sat) with colored indicators and percentage tooltips.
   - Chronological audit list showing full breakdown for each day.
   - Reset History modal with two-step confirmation.
4. **`src/components/Header.tsx`**:
   - Add `"📊 History"` nav tab with `History` icon.
5. **`src/App.tsx` & `src/components/TodaysSchedulePage.tsx`**:
   - Wire route rendering for `'history'`.
   - Attach automatic `recordTodayCompletion` hook on mount and task completions.
