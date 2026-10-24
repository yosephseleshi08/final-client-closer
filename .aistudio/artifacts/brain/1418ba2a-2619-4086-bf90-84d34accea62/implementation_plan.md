# Automated Sales Cadence & Today's Execution Dashboard

Upgrade the multi-channel outreach command center with an automated 2-step follow-up cadence engine (strict Day 3 & Day 7 timing), a cross-channel daily execution dashboard ("Today's Schedule"), and 4-tab segmented follow-up schedules inside each channel workspace.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The architectural decisions below synthesize the user prompt and the confirmed preferences from Phase 1 clarifications:

- **Confirmed Decision 1 (Top Navigation Placement)**: Added "Today's Schedule" top-level button immediately adjacent to "Executive Dashboard". The global navigation now features: **Email**, **Instagram**, **Facebook**, **Today's Schedule**, **Executive Dashboard**, and **Insights & Analysis**.
- **Confirmed Decision 2 (Overdue Priority Grouping)**: In "Today's Schedule", past-due/overdue leads are grouped into their own distinct top priority alert section, clearly distinguished from today's regular scheduled items.
- **Confirmed Decision 3 (Quick-Copy Follow-Up Pitch Templates)**: Cards in Today's Schedule and Follow-Up sub-tabs include instant 1-click copy buttons for initial DM copy, 3-Day quick check-in copy, and 7-Day Loom/breakup copy.
- **Confirmed Decision 4 (Comprehensive Card Actions & 'Seen' Badge)**: In addition to "Mark as Sent", each card provides:
  - **Mark as Sent**: Advances the cadence (calculating Day 3 and Day 7 upon initial send, or advancing to Day 7 / completed).
  - **Replied**: Immediately transitions the lead to positive reply state and clears pending timers.
  - **Seen**: Toggles the `'👀 Seen'` badge on the lead card while keeping the 3-day and 7-day follow-up timers fully active.
  - **Open Profile**: Direct 1-click external link to the lead's social profile or website.

---

### 1. Overview & Core Concept

- **What It Does**: Provides growth operators with a single daily command center to execute all outbound tasks due on any given day across Email, Instagram, and Facebook, while automating the math behind sales cadences:
  1. *Initial Send* $\rightarrow$ logs send date, calculates Follow-up #1 at exactly $+3$ days, calculates Follow-up #2 at exactly $+7$ days. Status becomes "Waiting for Reply" (or "Seen").
  2. *Day 3 Follow-up* $\rightarrow$ triggers Follow-up #1 prompt with pre-staged bump copy. Marking sent schedules Follow-up #2 for Day 7.
  3. *Day 7 Follow-up* $\rightarrow$ triggers Follow-up #2 prompt with pre-staged final breakup / Loom video copy. Marking sent moves the lead to Completed/Archived.
- **Target Audience / Persona**: High-velocity outbound closers and agency founders who need strict, zero-effort follow-up discipline without maintaining complex spreadsheet formulas.

---

### 2. User Experience & Visual Design

#### 1. Top Navigation Update
- Header navigation contains:
  1. `Email`
  2. `Instagram`
  3. `Facebook`
  4. **`Today's Schedule`** (Highlighted with daily task count badge)
  5. `Executive Dashboard`
  6. `Insights & Analysis`

#### 2. "Today's Schedule" Dashboard (Unified Daily Command Center)
- **Top Summary Banner**: Today's date, total actionable queue count, and quick stats (New Outreach Due, Follow-ups Due, Overdue).
- **Section 0: Overdue Priority Alert Queue** (rendered if any leads have scheduled dates prior to today and are incomplete):
  - Highlighted with crimson borders (`border-rose-500/50`), dark red backdrop tint, and urgent alert badges.
- **Section 1: New Outreach Due Today**
  - All prospects across Email, Instagram, and Facebook whose initial outreach was scheduled for today.
  - Displays Channel Badge, Lead ID, Business Name, Link, pre-staged custom pitch with 1-click copy.
  - Action buttons: `Mark as Sent`, `Seen` (toggles badge), `Replied`, `Open Profile`.
- **Section 2: Follow-Ups Due Today**
  - Prospects reaching their exact 3-Day mark or 7-Day mark today.
  - Badges clearly indicate: `⚡ Follow-Up #1 (Day +3)` or `🔥 Follow-Up #2 (Day +7 - Final)`.
  - Pre-staged follow-up message box with 1-click `Copy` button.
  - Action buttons: `Mark FU Sent`, `Seen` (toggles badge), `Replied`, `Open Profile`.

#### 3. Sub-Pages for Follow-Up Schedule Inside Each Channel Workspace
Inside Email, Instagram, and Facebook workspaces, the "Follow-Up Schedule" tab contains 4 internal segmented views:
1. **Due Today**: Combined view of initial outreach due today + any 3-day / 7-day follow-ups due today + overdue.
2. **3-Day Follow-Up**: Leads whose initial send was 3 days ago and are awaiting Follow-Up #1.
3. **7-Day Follow-Up**: Leads whose initial send was 7 days ago and are awaiting Follow-Up #2.
4. **Completed / Archived**: Leads marked as Replied, Completed, or won.

---

### 3. Key Product Decisions & Cadence Engine Architecture

- **Decision 1: Deterministic Date Calculations (`addDays`)**
  - *Approach*: Given an initial send date in `YYYY-MM-DD`, `followup1Date = addDays(date, 3)` and `followup2Date = addDays(date, 7)`.
  - *Why*: Eliminates timezone drift and guarantees exact day matching against the system local date `new Date().toISOString().split('T')[0]`.
- **Decision 2: State Model Expansion**
  - *Approach*: Extend `ChannelLead` with:
    - `leadStatus`: `'not_sent' | 'waiting_reply' | 'replied' | 'completed'`
    - `isSeen`: `boolean` (displays `👀 Seen` indicator)
    - `initialSentDate`: string (`YYYY-MM-DD`)
    - `followup1Date`: string (`YYYY-MM-DD`)
    - `followup2Date`: string (`YYYY-MM-DD`)
    - `followupCount`: `number` (0 = no follow-up yet, 1 = Day 3 sent, 2 = Day 7 sent)
- **Decision 3: Zero Channel Leakage in Workspace Views**
  - *Approach*: In "Today's Schedule", cards aggregate across all 3 channels with clear channel badges (`Email`, `Instagram`, `Facebook`), while inside channel workspaces, leads strictly filter to their own channel.

---

### 4. Technical Architecture & Component Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GLOBAL TOP NAVIGATION                              │
│  [Email]  [Instagram]  [Facebook]  [Today's Schedule]  [Executive] [Insights│
└───────────────────────────┬─────────────────────────────────────────────────┘
                            │
              ┌─────────────┴──────────────┐
              ▼                            ▼
┌───────────────────────────┐ ┌───────────────────────────────────────────────┐
│ CHANNEL WORKSPACE         │ │ TODAY'S SCHEDULE DASHBOARD                    │
│ • Leads (Sub-page A)      │ │ • Section 0: Overdue Priority Queue           │
│ • DM (Sub-page B)         │ │ • Section 1: New Outreach Due Today           │
│ • Schedule (Sub-page C)   │ │ • Section 2: Follow-Ups Due (Day 3 & Day 7)   │
│ • Follow-Up Schedule:     │ │ ┌───────────────────────────────────────────┐ │
│   ├─ [Due Today]          │ │ │ Action Bar:                               │ │
│   ├─ [3-Day Follow-up]    │ │ │ [Mark Sent] [Seen 👀] [Replied] [Open]    │ │
│   ├─ [7-Day Follow-up]    │ │ └───────────────────────────────────────────┘ │
│   └─ [Completed/Archive]  │ └───────────────────────────────────────────────┘
│ • Mockup (Sub-page E)     │
└───────────────────────────┘
```

#### Cadence Engine State Transitions

| Action | Current State | New State & Side Effects |
|---|---|---|
| Click "Mark as Sent" (Initial) | `status = 'not_sent'` | `initialSentDate = today`, `followup1Date = today+3`, `followup2Date = today+7`, `leadStatus = 'waiting_reply'` |
| Click "Seen" | any active lead | `isSeen = true` (retains timers, shows `👀 Seen` badge) |
| Click "Mark FU Sent" (Day 3) | `followupCount = 0` | `followupCount = 1`, `followup1SentDate = today`, stays in `waiting_reply` until Day 7 |
| Click "Mark FU Sent" (Day 7) | `followupCount = 1` | `followupCount = 2`, `followup2SentDate = today`, `leadStatus = 'completed'`, `isCompleted = true` |
| Click "Replied" | any lead | `leadStatus = 'replied'`, `isCompleted = true`, cleared from pending queues |
