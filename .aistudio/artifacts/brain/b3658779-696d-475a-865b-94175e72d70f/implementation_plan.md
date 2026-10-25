# Channel-Specific Link Validation & 3-Step DM Sequence Engine

1-2 concise sentences: Implement strict workspace link validation with intelligent channel routing alerts on lead intake, upgrade the DM modal into a comprehensive 3-step sequence writer (Initial, 3-Day, 7-Day), and dynamically render the exact message in Today's Schedule matching each lead's cadence stage.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed by the user during clarification:
> - **Default Message Fallback**: If a lead does not yet have custom sequence copy drafted, Today's Schedule will automatically render pre-filled, battle-tested outreach templates for each specific stage rather than leaving the card blank.
> - **AI Generation in Sequence Modal**: The 3-Step DM modal will provide manual text editing paired with a 1-click AI generation button powered by Gemini 3.8 Flash to instantly compose all three touchpoints.
> - **Actionable Channel Error Toasts**: When a lead link is pasted into the wrong workspace (e.g., an Instagram handle pasted in Facebook), the red alert will feature an immediate 1-click button to jump directly to the correct channel workspace.

---

## 1. Overview & Core Concept

- **What It Does**: 
  - Prevents channel pollution by strictly verifying links upon intake (e.g., requiring `@` or `instagram.com` in Instagram, `facebook.com` in Facebook, and valid email syntax in Email), actively guiding users to the correct workspace if mismatched.
  - Elevates the single pitch draft into a structured **3-Step DM Campaign** per lead: Message 1 (Day 1 Initial DM), Message 2 (Day 3 Follow-Up Bump), and Message 3 (Day 7 Breakup / Loom offer).
  - Intelligently connects the lead's current cadence status (`!initialSentDate`, `followupCount === 0`, or `followupCount === 1`) in **Today's Schedule** to automatically surface the corresponding message and 1-click copy action.
- **Target Audience**: High-velocity agency owners, SDRs, and client closers managing multi-channel B2B pipelines across Email, Instagram, and Facebook without accidental misrouting or manual copy-pasting friction.
- **Key Value**: Guarantees zero cross-channel link confusion, eliminates repetitive copywriting, and ensures dispatch operators always have the exact stage-appropriate message ready to fire on Days 1, 3, and 7.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Intake with Channel-Specific Validation**:
   - User navigates to a channel workspace (e.g., Facebook) and pastes a link.
   - If the user pastes an Instagram profile (`https://instagram.com/pasta` or `@pasta`), the system detects the link type, blocks the save, and triggers a red toast alert:
     `"Error: This is an Instagram link. Please switch to the Instagram workspace."` with an instant button: `[Switch to Instagram]`.
   - If user pastes a valid channel link, it proceeds through the duplicate-checking engine to confirm originality, prompts for the business name, and saves.
2. **3-Step Sequence Authoring in DM Tab**:
   - In the DM tab, the table displays the sequence completion status (e.g., `3/3 Steps Ready` or `No sequence drafted`).
   - Clicking `"Write Pitch"` opens a modal containing **3 distinct, dedicated text areas**:
     - **Step 1: Initial DM (Day 1 Outreach)**: 35–50 word value-first hook with prototype demo offer.
     - **Step 2: 3-Day Follow-Up (Quick Bump)**: Low-friction touchpoint checking if they viewed the preview.
     - **Step 3: 7-Day Breakup (Closing / Loom)**: High-scarcity final notice with Loom walkthrough.
   - Includes a 1-click `"⚡ Generate 3-Step Sequence"` AI button that populates all 3 fields simultaneously with customized copy using the business name and link.
3. **Dynamic Cadence Dispatch in Today's Schedule**:
   - On `"Today's Schedule"`, each lead card evaluates `lead.initialSentDate` and `lead.followupCount`.
   - The card dynamically renders the exact message for the active touchpoint:
     - Day 1 Initial: Renders `lead.initialDM` with `"Copy Initial DM"`.
     - Day 3 Follow-up: Renders `lead.followup3DM` with `"Copy 3-Day Follow-Up"`.
     - Day 7 Follow-up: Renders `lead.followup7DM` with `"Copy 7-Day Breakup"`.
   - If custom sequence messages have not been written, the card cleanly displays the corresponding stage default template with zero broken layouts.

### Visual Identity & Theme
- **Theme**: Deep slate neutral canvas (`#080c14` / `#0b0f19`) with sharp channel accents (Indigo for Email, Pink for Instagram, Sky Blue for Facebook, Amber for Today's Schedule).
- **Typography**: `Outfit` for bold section titles, `Plus Jakarta Sans` for dense readable message previews, and `JetBrains Mono` / `font-mono tabular-nums` for lead identifiers and counters.
- **Controls & Toasts**: High-contrast, accessibility-tested red alert banners (`border-rose-500/50 bg-rose-950/95`) with integrated inline switch actions.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Channel Detection Strategy Before Duplicate Check**
  - *Chosen Approach*: Intercept submitted links in `LeadsSubPage` and validate against channel rules before running the normalized duplicate link check.
  - *Why*: Prevents dirtying channel-specific databases with incompatible link formats, while providing immediate contextual guidance on where the link belongs.
- **Decision 2: Dedicated Fields vs Generic Array**
  - *Chosen Approach*: Use explicit fields `initialDM`, `followup3DM`, and `followup7DM` on `ChannelLead` and `Lead` rather than a loose string array.
  - *Why*: Strong TypeScript typing guarantees unambiguous mapping to cadence rules (Day 1, Day 3, Day 7) and prevents indexing off-by-one errors across the app.
- **Decision 3: Server-Side 3-Step AI Sequence Generation**
  - *Chosen Approach*: Add `/api/gemini/sequence` in `server.ts` utilizing `@google/genai` with model `gemini-3.8-flash` returning all 3 steps in structured JSON, with robust local heuristic fallbacks when keys are not configured.
  - *Why*: Gives users lightning-fast 1-click sequence drafting while keeping API keys secure on the backend.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            User Intake & Navigation                         │
│   (Email Workspace  │  Instagram Workspace  │  Facebook Workspace)          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                         [Submit Link & Press "Add"]
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Channel-Specific Validation Layer                        │
│   • Email: isEmail()                                                        │
│   • Instagram: isInstagramUrl() or startsWith('@')                          │
│   • Facebook: isFacebookUrl()                                               │
│                                                                             │
│   [Mismatch?] ──► Trigger Red Toast + "Switch to [Channel]" Action Button   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Valid)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Duplicate Link Detection Layer                           │
│   • Normalize URL (strip protocol, www, trailing slashes, params)           │
│   • Check active channel leads array                                        │
│   [Duplicate?] ──► Red Alert: "Warning: This link has already been added..."│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Unique)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   Data Persistence & 3-Step Sequence Storage                │
│   • Model: { initialDM, followup3DM, followup7DM }                          │
│   • Storage: IndexedDB & LocalStorage Channel Buckets                       │
│   • DM Modal: 3 Distinct Textareas + AI Batch Generator                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  Today's Schedule Cadence Dynamic Renderer                  │
│   • Day 1 (Initial): Renders initialDM + "Copy Initial DM"                  │
│   • Day 3 (Follow-up 1): Renders followup3DM + "Copy 3-Day Follow-Up"       │
│   • Day 7 (Follow-up 2): Renders followup7DM + "Copy 7-Day Breakup"         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Model Updates (`src/types.ts`)
```typescript
export interface ChannelLead {
  id: string;
  numericId: number;
  name: string;
  link: string;
  channel: MultiChannelType;
  sortOrder: number;
  createdAt: string;

  // 3-Step Message Sequence
  initialDM?: string;
  followup3DM?: string;
  followup7DM?: string;
  customPitch?: string; // backwards compatibility
  pitchSavedAt?: string;

  // Cadence dates & status...
}

export interface Lead {
  id: number;
  restaurantName: string;
  // ... existing fields ...
  initialDM?: string;
  followup3DM?: string;
  followup7DM?: string;
}
```

### Step-by-Step Implementation Blueprint:
1. **Extend Type Definitions** in `src/types.ts` (`initialDM`, `followup3DM`, `followup7DM` on `ChannelLead` and `Lead`).
2. **Channel Validation Engine** in `src/utils/channelStorage.ts`:
   - `validateChannelLink(rawLink, channel)`: returns `{ isValid, detectedChannel, errorMessage }`.
   - Recognizes email addresses, Instagram handles/links, and Facebook links.
3. **Upgrade `LeadsSubPage.tsx`**:
   - Check channel validation before duplicate checking.
   - If wrong channel, show red toast with inline `Switch to [Channel]` button that fires `onNavigateToChannel`.
4. **Backend Sequence Endpoint** in `server.ts`:
   - Add `/api/gemini/sequence` taking `{ leadName, link, channel }` and generating all 3 structured sequence steps using `gemini-3.8-flash`, with reliable heuristic fallback.
5. **Upgrade `DmSubPage.tsx`**:
   - Redesign modal to feature 3 distinct tabbed or stacked textareas (Initial DM, 3-Day Follow-Up, 7-Day Breakup).
   - Add 1-click `"Generate 3-Step Sequence"` AI action.
   - Update table view to show sequence readiness badges and previews.
6. **Upgrade `LeadModal.tsx`**:
   - Include the 3 sequence fields in the manual lead creation modal.
7. **Upgrade `TodaysSchedulePage.tsx`**:
   - Update message resolution logic in both Overdue and Today's Active queues:
     - Stage 0 (Initial): show `lead.initialDM || defaultTemplates.initialPitch`
     - Stage 1 (Day 3): show `lead.followup3DM || defaultTemplates.day3Bump`
     - Stage 2 (Day 7): show `lead.followup7DM || defaultTemplates.day7Loom`
   - Label copy buttons dynamically: `"Copy Initial DM"`, `"Copy 3-Day Follow-Up"`, `"Copy 7-Day Breakup"`.
8. **Verification**: Run `compile_applet`, `lint_applet`, and verify automated tests.
