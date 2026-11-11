# Previous-Day Warm-Up Law: Midnight Calendar Unlock Engine

Transition Outreach Engine Pro from rolling 24-hour timestamp locks to strict local calendar date comparisons (`YYYY-MM-DD`). Leads warmed up today remain strictly locked until midnight, and automatically unlock at 00:00 on their scheduled dispatch day without requiring an artificial 24-hour wait.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following behaviors are strictly enforced:

- **Strict Today Lock (Zero Accidental Early Unlocks)**: Any lead warmed up TODAY, or any lead marked as warmed that lacks an explicit timestamp, strictly defaults to `isLeadWarmedToday = true` and `isLeadWarmedBeforeToday = false`. They are never unlocked on the same day.
- **Dispatch Button State**: The dispatch button for leads warmed today is **disabled** with the explicit state: `🔒 Locked - Unlocks at Midnight`.
- **Automatic Midnight Unlock**: The moment the local system clock advances to 12:00 AM midnight (`warmedDate < todayStr`), dispatch automatically unlocks with the emerald action: `Send / Mark as Sent`.
- **Manual Testing Override**: A dedicated "CRM Settings & Testing Station" modal is accessible from the header and schedule views. If the user needs to test dispatch buttons or QA links without waiting until midnight, they can toggle `⚡ Unlock for Testing`. Default state is strictly LOCKED.

---

### 1. Overview & Core Concept

- **What It Does**: Replaces rolling 24-hour hourly duration checks and UTC offset regex mismatches with pure local calendar date arithmetic. If a user warms up a prospect at any time today (morning, afternoon, or 11:59 PM), that prospect remains locked for today and unlocks first thing tomorrow morning (at 12:00 AM midnight).
- **Target Audience**: High-volume B2B outreach operators running daily cold DM and email pipelines with strict warm-up safety protocols to prevent account bans.
- **Key Value**: 100% predictable operating rhythm. Warm today, dispatch tomorrow.

---

### 2. User Experience & Visual Design

- **The Daily Cycle UX**:
  1. **Night-Before / Same-Day Warm-Up**: User engages profiles and clicks "Mark as Warmed".
  2. **Strict Lock State**: The dispatch button for those leads is disabled with the amber indicator: `🔒 Locked - Unlocks at Midnight`.
  3. **Midnight Automatic Unlock**: At 00:00 (or on app reload tomorrow), the lead's warmed date (`YYYY-MM-DD`) is strictly `< todayStr`. The dispatch button unlocks immediately with the emerald action: `Send / Mark as Sent`.
  4. **Settings Testing Override**: User can click "Settings" in the top bar to toggle testing mode if they need to dry-run sends.

- **Visual State Indicators**:
  - *Locked (Warmed Today)*: `px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center gap-2 cursor-not-allowed` with `Lock` icon and `🔒 Locked - Unlocks at Midnight`.
  - *Unlocked & Ready (Warmed Yesterday or Earlier)*: `bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs` with `Send` icon.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Strict Same-Day Lockout**
  - *Chosen Approach*: `isLeadWarmedToday(lead)` returns `true` if `warmedUpAt` is missing, equal to today, or in the future.
  - *Why*: Prevents same-day outreach on fresh warm-ups, eliminating the risk of Instagram/Facebook spam bans.
- **Decision 2: Manual Testing Station**
  - *Chosen Approach*: `SettingsModal` with localStorage flag `crm_warmup_manual_override_unlocked`.
  - *Why*: Allows instant QA testing without compromising production safety defaults.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌─────────────────────────────────────────────────────────────┐
│                    User Local Timezone                      │
│                  getLocalTodayStr() -> YYYY-MM-DD           │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
     Warm-Up Today Tab              Today's Schedule Dispatch
  ────────────────────────        ─────────────────────────────
  Mark profile as engaged         Evaluate: isLeadWarmedToday?
  warmedUpAt: todayStr                     │
                                           ├─ Missing / Today / Future ──► [ LOCKED ]
                                           │                              "🔒 Locked - Unlocks
                                           │                                   at Midnight"
                                           │
                                           └─ Past (Yesterday/Older) ───► [ UNLOCKED ]
                                                                          "Send / Mark as Sent"
```

#### Core Engine Functions (`src/utils/cadenceEngine.ts`):
1. **`isLeadWarmedToday(lead, referenceDateStr)`**:
   - Returns `true` if `!lead.warmedUpAt` or `warmedDate >= referenceDateStr`.
   - Returns `false` only if `warmedDate < referenceDateStr` or manual override is enabled.
2. **`isLeadWarmedBeforeToday(lead, referenceDateStr)`**:
   - Returns `false` if `isLeadWarmedToday(lead)` is true.
   - Returns `true` only if `warmedDate < referenceDateStr` or manual override is enabled.
3. **`isLeadDispatchLocked(lead, referenceDateStr)`**:
   - Returns `true` for all social leads until midnight rollover.
