# Exact Day 3 & Day 7 Follow-Up Reminders & Dashboard Alert Banner

A focused enhancement that locks in strict **exact-day** follow-up reminders (Day 3 and Day 7 calculated directly from initial outreach date), adds a prominent high-visibility reminder banner to the command dashboard, and synchronizes the top notification bell to trigger on the exact scheduled follow-up dates.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following product decisions were confirmed during interactive clarification:
> - **Calculation Formula**: Follow-up 1 is strictly $\text{Send Date} + 3\text{ days}$, and Follow-up 2 is strictly $\text{Send Date} + 7\text{ days}$ (both anchored to the original outreach date).
> - **Display Filter**: Show follow-ups strictly on the exact 3rd and 7th day ($\text{Today} = \text{Followup Date}$).
> - **Reminder Experience**: A prominent high-visibility reminder alert banner on the dashboard paired with real-time alerts in the top notification bell and audio chime triggers.

---

## 1. Overview & Core Concept

### What It Delivers
1. **Exact-Day Follow-Up Anchor**: Follow-up 1 occurs exactly 3 days after sending date ($T+3$), and Follow-up 2 occurs exactly 7 days after sending date ($T+7$).
2. **Prominent Dashboard Reminder Banner**: An unmissable alert strip at the top of the command dashboard that activates whenever any leads have reached their exact Day 3 or Day 7 follow-up date today.
3. **Synchronized Top Notification Bell**: Updates `NotificationBell.tsx` so the notification badge and dropdown spotlight exact Day 3 and Day 7 follow-up touchpoints with dedicated tags and 1-click message copy/action.
4. **Clean Side-by-Side Command Hub**: Maintains the clean 2-column layout:
   - **Left**: Today's New Scheduled Outreach.
   - **Right**: Exact Day 3 and Day 7 Follow-ups Due Today (with optional lookahead tab to inspect upcoming follow-ups).

---

## 2. User Experience & Visual Design

### Key User Flows

```
[ Outreach Sent on Date T ]
       │
       ├─► Follow-up 1 Scheduled: T + 3 Days (Day 3)
       └─► Follow-up 2 Scheduled: T + 7 Days (Day 7)
               │
               ▼
   [ When Today == T + 3 (Day 3) ]
   ┌─────────────────────────────────────────────────────────────┐
   │ 🚨 DASHBOARD REMINDER BANNER: 2 leads hit Day 3 today!      │
   │    [View Day 3 Leads]  •  [Send Follow-up Quick Batch]      │
   ├─────────────────────────────────────────────────────────────┤
   │ 🔔 Notification Bell: Red indicator + "Day 3 Follow-up Due" │
   ├─────────────────────────────────────────────────────────────┤
   │ ⏰ Right Dashboard Column: Displays Day 3 card with amber   │
   │    badge, elapsed days, pre-staged copy, & "Mark Sent"      │
   └─────────────────────────────────────────────────────────────┘
               │
               ▼ User clicks "Mark FU 1 Sent"
   [ Follow-up 1 Marked Sent ]
       │
       └─► Status logged; reminder clears until Day 7
               │
               ▼
   [ When Today == T + 7 (Day 7) ]
   ┌─────────────────────────────────────────────────────────────┐
   │ 🔥 DASHBOARD REMINDER BANNER: 1 lead hits Day 7 (Final)     │
   ├─────────────────────────────────────────────────────────────┤
   │ ⏰ Right Dashboard Column: Displays Day 7 rose card with     │
   │    pre-staged Loom offer copy & "Mark FU 2 Sent"            │
   └─────────────────────────────────────────────────────────────┘
```

### Visual Styling & Notification Atmosphere
- **Banner Theme**:
  - Day 3 due: Amber ambient glass border (`border-amber-500/40 bg-amber-950/30 text-amber-200`).
  - Day 7 due: Rose alert glow (`border-rose-500/40 bg-rose-950/30 text-rose-200`).
- **Notification Dropdown**:
  - Exact Day 3 badge: `⚡ DAY 3 FOLLOW-UP` with formatted sent date and quick-copy pitch.
  - Exact Day 7 badge: `🔥 DAY 7 FINAL TOUCH` with quick-copy loom pitch.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Exact Day Matching (`Today === Scheduled Date`)
- **Chosen Approach**: Filter active follow-ups by `lead.followup1Date === today` (for count 0) and `lead.followup2Date === today` (for count 1).
- **Secondary Lookahead**: Provide an "Upcoming Follow-ups" pill so users can still preview leads scheduled for tomorrow or the rest of the week if they want to plan ahead.
- **Why**: Perfectly honors the user's explicit rule: "not 3+ or 7+ days from initial it's exact 3 day and 7 day from the sending day".

### Decision 2: Dual-Anchor Date Generation
- **Chosen Approach**: When outreach is marked sent on date $T$:
  $$\text{followup1Date} = \text{addDays}(T, 3)$$
  $$\text{followup2Date} = \text{addDays}(T, 7)$$
  Both are persisted directly onto the lead document so they never shift if follow-up 1 is acknowledged late.
- **Why**: Eliminates compounding drift where follow-up 2 would otherwise slip to $T+10$ or $T+14$.

---

## 4. Technical Architecture & Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                       App State                             │
│       leads: Lead[] (with followup1Date & followup2Date)    │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
    ┌───────────▼───────────┐     ┌───────────▼───────────┐
    │  ExecutiveDashboard   │     │   NotificationBell    │
    │  (Prominent Banner &  │     │   (Exact Day 3 / 7    │
    │   Exact-Day Column)   │     │    Dropdown Badges)   │
    └───────────────────────┘     └───────────────────────┘
```

### Modified Logic Outline

1. **`src/components/ExecutiveDashboard.tsx`**:
   - Compute `exactDay3DueLeads = leads.filter(l => l.status === 'sent' && (l.followupCount || 0) === 0 && l.followup1Date === today)`.
   - Compute `exactDay7DueLeads = leads.filter(l => l.status === 'sent' && l.followupCount === 1 && l.followup2Date === today)`.
   - Render the prominent **Top Alert Reminder Banner** when `exactDay3DueLeads.length > 0 || exactDay7DueLeads.length > 0`.
   - In the right-hand column, default to displaying leads due on the exact day.

2. **`src/components/NotificationBell.tsx`**:
   - Update `dueFollowups` to identify exact Day 3 and Day 7 leads.
   - Display distinct badges `Day 3 Follow-up` and `Day 7 Follow-up (Final)` with direct 1-click pitch copy.

3. **`src/App.tsx`**:
   - Ensure the daily reminder checker triggers the notification chime when exact Day 3 or Day 7 follow-ups are due.

---

## 5. Verification Plan

1. **Exact Date Calculation Test**:
   - Mark a lead sent today ($T$).
   - Verify `followup1Date` is set to $T+3$ and `followup2Date` is set to $T+7$.
2. **Exact Day Banner & Notification Test**:
   - When date matches $T+3$: verify prominent reminder banner appears on the dashboard and notification bell badges the lead.
   - When date matches $T+7$: verify Day 7 final touch banner and badge activate.
3. **Action Execution Test**:
   - Click "Mark FU 1 Sent": verify `followupCount` increments to 1 and reminder clears.
   - Click "Mark FU 2 Sent": verify `followupCount` increments to 2 and cadence completes.
4. **Compile & Lint**:
   - Run `compile_applet` and `lint_applet` to verify zero errors.
