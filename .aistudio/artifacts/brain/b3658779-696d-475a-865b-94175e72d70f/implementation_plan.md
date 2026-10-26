# Prompt / Lead Analysis Hub & DeepSeek Sequencing

Add a dedicated **Prompt / Analysis** workflow to the Leads view and data models, enabling operators to paste and persist detailed Gemini Lead Analyses, visually identify outreach-ready prospects with green indicator badges, and 1-click copy formatted prompts for DeepSeek 3-step sequence generation.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product decisions were confirmed during the interactive clarification phase:

- **Confirmed Decision 1 (Button Location)**: The "📋 Prompt" button will be placed directly in the table's Action column alongside existing action controls for quick 1-click access.
- **Confirmed Decision 2 (Visual Indicator)**: Leads with saved analysis will display an emerald status dot alongside an **"Analysis Ready"** badge, allowing instant visual filtering of qualified prospects.
- **Confirmed Decision 3 (Quick Copy Options)**: The modal will offer two copy utilities:
  1. **"Copy Analysis"**: Copies the clean, raw pasted Gemini analysis text.
  2. **"Copy DeepSeek Sequence Prompt"**: Pre-wraps the analysis into an optimized prompt template instructing DeepSeek to craft the exact 3-step DM sequence (Day 1 Initial, Day 3 Bump, Day 7 Breakup).

---

## 1. Overview & Core Concept

- **What It Does**: Bridges prospect intelligence and outreach messaging. Operators paste Gemini's deep analysis (business strengths, conversion gaps, pain points) into a lead's record. This persists across sessions, marks the lead as "Analysis Ready", and provides 1-click clipboard bridges into DeepSeek to draft hyper-personalized 3-step DM sequences.
- **Target Persona**: High-velocity agency closers and B2B SDRs who analyze prospects using Gemini and generate personalized outreach sequences with DeepSeek.
- **Key Value**: Eliminates copy-paste context loss and tab switching friction, guaranteeing every DM sequence is grounded in rich prospect research.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Viewing the Leads Table**:
   - The table displays an emerald indicator dot and `Analysis Ready` tag next to leads that already possess saved intelligence.
   - Leads lacking analysis display a subtle muted indicator (`Pending Analysis`).
   - The Action column includes a distinct `📋 Prompt` button.

2. **Opening the Prompt / Analysis Modal**:
   - Clicking `📋 Prompt` opens a high-contrast dark modal containing:
     - Header with Lead ID, prospect business name, channel icon, and direct profile link.
     - Large monospaced/sans text area with syntax-friendly styling for pasting long-form Gemini research.
     - Live word and character counters.
     - Dual 1-click copy action bar:
       - **Copy Raw Analysis** (copies clean pasted intelligence).
       - **Copy for DeepSeek** (formats intelligence into a structured system prompt requesting Day 1, Day 3, and Day 7 hooks).
     - Save & Close controls with instant feedback.

3. **Status Persistence & Feedback**:
   - Saving immediately updates state and persists to channel storage (`localStorage` & IndexedDB).
   - A success toast confirms persistence, and the row immediately reflects the emerald `Analysis Ready` badge.

### Visual Styling & Theme

- **Aesthetic Direction**: Utilitarian, mission-critical operations deck adhering to dark mode (`#080c14`, `slate-900`, `slate-950`).
- **Color Accents**:
  - Emerald (`emerald-400`, `emerald-500/20`) for ready indicators and confirmed copy actions.
  - Indigo/Violet (`indigo-500`, `purple-500`) for the DeepSeek prompt generator and primary save buttons.
  - Slate/Zinc (`slate-400`, `slate-700`) for secondary controls and meta labels.
- **Typography**: Clean sans-serif (`Outfit`, `Inter`) for headings and controls; monospaced font for Lead IDs and token tags.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Data Model Extension (`ChannelLead` and `Lead`)**:
  - *Chosen Approach*: Add `leadAnalysis?: string;` and `analysisSavedAt?: string;` to both `ChannelLead` (used in the 3 channel workspaces) and `Lead` (used across CRM Database and Lead Details modal).
  - *Why*: Guarantees seamless compatibility across all app views (Leads tab, DM tab, Schedule, CRM database) without data fragmentation.
- **Decision 2: DeepSeek Prompt Formatting Engine**:
  - *Chosen Approach*: Provide a built-in formatting utility that structures the lead's name, link, channel, and analysis into a turnkey prompt optimized for DeepSeek's conversational model.
  - *Why*: Reduces operator prompt engineering overhead to zero clicks—paste analysis once, copy prompt into DeepSeek, paste back into the 3-step sequence editor.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Lead Intake & View                   │
│          src/components/channel/LeadsSubPage.tsx       │
└──────────────────────────┬─────────────────────────────┘
                           │
             Clicks "📋 Prompt" Button
                           ▼
┌────────────────────────────────────────────────────────┐
│               LeadAnalysisModal.tsx                    │
│  - Textarea: leadAnalysis (persisted)                  │
│  - Button: "Copy Analysis"                             │
│  - Button: "⚡ Copy DeepSeek Prompt"                   │
└────────────┬─────────────────────────────┬─────────────┘
             │                             │
    Save State Mutation           Clipboard API
             ▼                             ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│  outreach_channel_leads │   │   User pastes into       │
│  localStorage / Indexed │   │   DeepSeek / LLM         │
└─────────────────────────┘   └──────────────────────────┘
```

### Component & State Mapping

1. **`src/types.ts`**:
   - Add `leadAnalysis?: string;` and `analysisSavedAt?: string;` to `ChannelLead` and `Lead`.
2. **`src/components/channel/LeadAnalysisModal.tsx`**:
   - Dedicated modal component managing draft state, clipboard triggers, DeepSeek prompt templating, and save mutations.
3. **`src/components/channel/LeadsSubPage.tsx`**:
   - Add `📋 Prompt` button in the actions column.
   - Render the `Analysis Ready` emerald badge and status indicator.
   - Wire modal open/close handlers and state sync.
4. **`src/components/LeadModal.tsx` & `LeadDetailsModal.tsx`**:
   - Include `leadAnalysis` view/edit fields for full consistency.
