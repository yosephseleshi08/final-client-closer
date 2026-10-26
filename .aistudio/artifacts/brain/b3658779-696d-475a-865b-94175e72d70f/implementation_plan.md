# Sunday Prep Mode for Today's Schedule

A dedicated Sunday experience for the outreach engine that pauses active daily outreach queues to respect rest, while keeping lead research, import, and AI prompt engineering fully active. Replaces the active schedule with a calming preparation dashboard featuring motivational rest quotes, weekly recap metrics, a locked Monday queue preview, and one-click navigation to channel lead pipelines.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following choices were confirmed during Phase 1 interactive clarification:
> - **Preview & Testing**: A dedicated "Sunday Mode Preview" toggle switch will be placed on the page so you can test and demonstrate the Sunday experience anytime, even though today is Monday.
> - **Weekly Stats Calculation**: Automatically computed from your actual lead database in localStorage (DMs sent in the last 7 days, replies logged, and mockup requests tracked) with sensible zero-state fallbacks.
> - **Prep Pipeline Navigation**: Clicking "📥 Go to Leads to Prep for Monday" directly routes to your active channel's Leads intake tab (or Instagram by default) so you can immediately begin importing and analyzing prospects.

---

## 1. Overview & Core Concept

- **What It Does**: On Sundays (or when Sunday Preview is toggled on), the Today's Schedule view transforms into **🌿 Sunday Prep Mode**. All active dispatch queues ("New Outreach Due Today", "Follow-Ups Due Today", "Overdue Priority", and "Sent Today") are tucked away safely. The user sees a restorative, emerald-and-slate workspace dedicated to sharpening tools for the week ahead.
- **Target Audience**: Solopreneurs and agency operators balancing high-volume outreach cadences who need intentional boundary protection on rest days without losing the ability to batch-prep prospects.
- **Key Value**: Prevents burnout and accidental weekend outreach mistakes while providing a frictionless launchpad to load Monday's pipeline.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Sunday Ingress / Preview Toggle**:
   - The app detects `new Date().getDay() === 0` or reads the `Sunday Mode Preview` toggle switch.
   - If active, the standard dispatch queues are hidden, and the calming **Sunday Prep Mode** card is rendered.
2. **Motivational Quote Rotation**:
   - A centered quote card displays wisdom on rest, reflection, and strategic preparation (Abraham Lincoln, Anne Lamott, John Lubbock, etc.) with a subtle "New Quote" button to cycle through selections.
3. **Weekly Performance Summary**:
   - Clean horizontal metric strip displaying:
     - **DMs Sent Last Week**: Number of initial outreach touches completed in the prior 7 days.
     - **Replies Received**: Total prospects marked as replied.
     - **Mockups / Audits**: Total leads with prompt analyses or mockup tags.
4. **Locked Monday Queue Preview**:
   - A safeguarded list displaying leads scheduled for Monday (or next in line). Each prospect displays their business name, channel origin, and a locked safeguard indicator to guarantee no accidental triggers.
5. **Pipeline Action**:
   - Prominent primary action button: `"📥 Go to Leads to Prep for Monday"` navigates straight into the active channel's lead intake view.

### Visual Identity & Theme

- **Palette**: Dark slate canvas (`#080c14`), deep forest & emerald accents (`emerald-500/10`, `emerald-500/20`, `border-emerald-500/30`, `text-emerald-300`), muted slate secondary text (`text-slate-400`).
- **Typography**: Display headings in `Outfit` / `Plus Jakarta Sans`, tabular numerals for metric counters (`font-mono tabular-nums`), clean unboxed metadata with bullet separators (`·`).
- **Zero-Pill Restraint**: No bulky colored badge sandwiches; clean inline metadata with subtle contrast borders.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Day Detection with Simulation Toggle**:
  - *Chosen Approach*: Automatic activation on Sundays (`getDay() === 0`) paired with an instant preview toggle button at the top right of the page.
  - *Why*: Allows the user to inspect and test the entire Sunday UI today (Monday) without altering machine clocks, while remaining completely automated in production.
  - *Alternatives Considered*: Pure system date check only (would leave the feature untestable until Sunday).
- **Decision 2: Non-Destructive Queue Suspension**:
  - *Chosen Approach*: Only conditionally alter the render tree in `TodaysSchedulePage.tsx`. All lead objects, time-locks, and scheduled dates remain intact in localStorage.
  - *Why*: Zero risk of data corruption or dropped cadences; queues resume automatically on Monday morning.
- **Decision 3: Retaining Channel Tabs and Workspace Sub-Pages**:
  - *Chosen Approach*: The global Header navigation (Instagram, Facebook, Email, Analytics) remains fully functional so the user can freely use the Leads table, Prompt Hub, and DM customizer.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Top Navigation (Header)                  │
│   Today's Schedule  │  Instagram  │  Facebook  │  Email ... │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │                                     │
    [Monday–Saturday]                         [Sunday]
            │                                     │
┌───────────▼──────────────┐         ┌────────────▼──────────────┐
│  Standard Daily Queues   │         │     Sunday Prep Mode      │
│  - Sent Today Log        │         │  - Restful Hero Header    │
│  - New Outreach Due      │         │  - Motivational Quotes    │
│  - Follow-Ups Due Today  │         │  - Weekly Recap Metrics   │
│  - Overdue Priority      │         │  - Locked Monday Preview  │
└──────────────────────────┘         │  - "Prep Pipeline" CTA    │
                                     └────────────┬──────────────┘
                                                  │ (Routes to)
                                     ┌────────────▼──────────────┐
                                     │ Channel Workspace (Leads) │
                                     │ - Link Intake & Analysis  │
                                     │ - DeepSeek Prompt Hub     │
                                     └───────────────────────────┘
```

### Components & Handlers

- **`src/components/SundayPrepView.tsx`** (New Component):
  - Calming hero card with emerald accents.
  - Curated collection of rest & preparation quotes with rotation state.
  - Weekly statistics calculator parsing leads from the last 7 calendar days.
  - Monday Queue preview query: filters leads with `scheduledDate` matching tomorrow (or next Monday) or unsent leads ready for launch.
  - Primary CTA button dispatching `onNavigateToChannel(activeChannel)`.
- **`src/components/TodaysSchedulePage.tsx`**:
  - Integrates `isActualSunday` detection + `forceSundayPreview` state.
  - Adds preview switch in header.
  - Conditionally renders `<SundayPrepView>` when active, bypassing the standard outreach queues.
- **`src/utils/cadenceEngine.ts`**:
  - Helper functions `isTodaySunday()`, `getMondayDateStr()`, and `getWeeklyOutreachStats(allLeads)`.
