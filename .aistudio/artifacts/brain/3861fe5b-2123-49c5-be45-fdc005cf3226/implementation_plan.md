# Latest Paste Ordering & Dual Mockup Screenshot Vault

Add automatic ordering by latest pasted link with a visible sort dropdown, and equip every lead with a dual-screenshot mockup vault supporting clipboard paste, file upload, one-click image copy, and a high-converting permission-ask script generator.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed through interactive clarification and define the exact implementation:

- **Confirmed Decision 1 (Lead Ordering)**: All lead views (CRM Database, Channel Leads, and Daily Dispatch Deck) will sort by newest pasted link by default (`latest_paste`), with a clean segmented/dropdown sort selector (Newest Pasted, Heat Score, Scheduled Day, Follow-up Due).
- **Confirmed Decision 2 (Mockup Screenshot Storage)**: Each lead features two dedicated screenshot slots ("Hero / Desktop Mockup" and "Mobile / Detail Mockup"), supporting both file upload from disk/mobile and direct image paste from clipboard (`Ctrl+V` or Paste button).
- **Confirmed Decision 3 (Permission Outreach Workflow)**: Each mockup slot includes an instant preview card with 1-click "Copy Image to Clipboard" and a synchronized permission-ask outreach script generator designed to secure permission before sending interactive mockup links.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Newest-Pasted Prioritization**: When users paste Instagram, Google Maps, or website links in the Sunday Sourcing Hub or Quick Paste bar, the newest leads immediately rise to the top across the CRM table, Channel views, and Dispatch Deck, with full control to switch sort modes at any time.
  2. **Dual Mockup Screenshot Vault**: Every lead profile and card contains two persistent screenshot storage slots (Slot 1: Hero/Desktop redesign, Slot 2: Mobile/Detail view). Screenshots are compressed and stored locally in base64 data format so they remain fully accessible offline.
  3. **High-Velocity Permission Pitch**: A dedicated permission workflow allows closers to copy the image to their clipboard with one tap, copy a personalized permission-seeking DM script ("Hey [Name]! Built a quick visual redesign for your restaurant—mind if I send the link?"), and open the prospect's profile directly.

- **Target Audience / Persona**: High-velocity agency owners and cold outreach closers who design mockups on Figma/Webflow, take screenshots, and need a friction-free way to attach them and ask for permission in DMs.

- **Key Value**: Eliminates the confusion of finding recently pasted leads and streamlines the two-step permission close: send the screenshot teaser first $\rightarrow$ get permission $\rightarrow$ send the interactive mockup link.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Link Paste & Immediate Top Visibility**:
   - Closer pastes a link in the top bar or Sourcing Hub.
   - Lead is stamped with high-precision timestamp (`createdAt: Date.now()`).
   - The lead appears at the very top of the list in CRM Database and Channel view.
   - Closer can toggle sort criteria between **Newest Pasted (Default)**, **Highest Heat Score**, **Scheduled Day**, and **Follow-up Due Date**.

2. **Dual Screenshot Attachment**:
   - In the Lead Modal, Lead Details drawer, or Dispatch Deck card, the closer sees a dedicated **Mockup Screenshots** section with 2 slots:
     - *Slot 1: Desktop / Hero Mockup*
     - *Slot 2: Mobile / Detail Mockup*
   - Closer can drag-and-drop an image file, click to upload, or simply focus the slot and press `Ctrl+V` / `Cmd+V` (or click "Paste Clipboard Image").
   - Images are auto-scaled and saved with instant visual thumbnail preview, full-screen lightbox zoom, and remove/replace actions.

3. **Permission-Ask Script & Copy Engine**:
   - Beside the previewed mockup, a "Permission Outreach" card provides 3 ready-to-send permission scripts:
     - *Casual Teaser*: "Hey [Name], put together a clean mobile concept for [Business]—mind if I send over the link to take a look?"
     - *Speed & Conversion*: "Hey [Name]! Redesigned your site's mobile booking flow to boost covers. Can I shoot you the quick preview?"
     - *Custom Before/After*: "Hey [Name]! Took a screenshot of your current hero vs a modernized version. Mind if I share the interactive demo?"
   - Buttons: **"Copy Image 1"** (copies raw image binary to OS clipboard for direct pasting into Instagram/WhatsApp DMs), **"Copy Image 2"**, **"Copy Permission Script"**, and **"Open Lead Profile"**.

#### Visual Identity & Theme
- **Surface & Canvas**: Strict dark mode palette matching `#080c14` canvas, `#0f172a` structural cards, and hairline borders (`border-slate-800`).
- **Typography**: Clean display hierarchy with `Plus Jakarta Sans` and `Outfit`, accompanied by tabular figures (`font-mono tabular-nums`) for timestamps and counts.
- **Zero-Pill Discipline**: Metadata displayed as quiet typographic lines separated by `·` (e.g., `Pasted 2 mins ago · 2 Mockups Stored · $299 Offer`).
- **Control Styling**: Segmented button groups for sorting and neat dashed drop-zones with hover highlights for image uploads.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Base64 Image Compression**:
  - *Chosen Approach*: Downscale high-res screenshots on client canvas to max dimension $1280\text{px}$ at 85% JPEG quality before saving into localStorage.
  - *Why*: Enables instant offline PWA access and eliminates reliance on external image hosting services that break in sandboxed environments, while keeping localStorage usage well under standard browser quotas.
  - *Alternatives Considered*: Storing full-resolution raw blobs (risk exceeding localStorage quota) or using remote cloud image hosting (requires server credentials and fails offline).

- **Decision 2: Multi-View Sort State Synchronization**:
  - *Chosen Approach*: Support a universal `sortBy` state (`'latest_paste' | 'heat_score' | 'scheduled_day' | 'followup_due'`) with default set to `'latest_paste'` in CRM Database and Channel Leads, with persistent sorting helper utilities.
  - *Why*: Guarantees that freshly pasted leads are never buried beneath older pre-seeded leads, while allowing users to quickly return to triage or pipeline views.

- **Decision 3: Dual Mockup Strategy (Desktop & Mobile)**:
  - *Chosen Approach*: Exactly 2 explicit slots labeled *Desktop / Hero* and *Mobile / Detail*, rather than an unbounded gallery.
  - *Why*: Matches real agency outreach practice (send 1 or 2 high-impact screenshots to spark curiosity without overwhelming the prospect in Instagram DMs).

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App State & Persistence                         │
│  - leads: Lead[] (with createdAt, mockupImage1, mockupImage2)          │
│  - activeSort: 'latest_paste' | 'heat_score' | 'day' | 'followup'      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┴───────────────────────────┐
       ▼                                                        ▼
┌─────────────────────────────────────┐  ┌───────────────────────────────────┐
│     Lead Sorting & Filter Engine    │  │     Dual Mockup Image Vault       │
│  - sortLeads(leads, activeSort)     │  │  - Canvas image resizer (max 1280)│
│  - Newest pasted links at top       │  │  - Clipboard API: paste & copy    │
│  - Preserves week-aware scheduling  │  │  - Permission pitch generator     │
└──────────────────┬──────────────────┘  └─────────────────┬─────────────────┘
                   │                                       │
                   ▼                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                             UI Components                                  │
│  - CrmDatabase & ChannelLeadsPage: Sort selector toolbar                   │
│  - LeadDetailsModal & LeadModal: 2-slot image uploader & permission pitch  │
│  - DailyDispatchDeck: Quick mockup preview & 1-click clipboard copy        │
└────────────────────────────────────────────────────────────────────────────┘
```

#### Data Schema Updates (`src/types.ts`)
```typescript
export type LeadSortOption = 'latest_paste' | 'heat_score' | 'scheduled_day' | 'followup_due' | 'alphabetical';

export interface Lead {
  // Existing fields...
  createdAt?: string | number;     // ISO timestamp or ms epoch of when link was pasted/created
  mockupImage1?: string;           // Base64 data URI of Slot 1 (Desktop / Hero mockup)
  mockupImage2?: string;           // Base64 data URI of Slot 2 (Mobile / Detail mockup)
  mockupImage1Name?: string;       // Original filename or label
  mockupImage2Name?: string;       // Original filename or label
}
```

#### Core Module Changes
1. **`src/types.ts`**: Add `mockupImage1`, `mockupImage2`, `mockupImage1Name`, `mockupImage2Name`, and `LeadSortOption`.
2. **`src/utils/imageCompressor.ts`**: Utility to compress user images/canvas blobs to compact base64 strings and read/write to system clipboard (`navigator.clipboard.write([new ClipboardItem(...)])`).
3. **`src/utils/permissionScripts.ts`**: Generator for high-converting permission scripts customized with restaurant name and channel.
4. **`src/components/MockupVault.tsx`**: Reusable component providing the 2-slot upload/paste dropzone, thumbnail preview, image zoom lightbox, 1-click image copy, and permission script copy.
5. **`src/components/CrmDatabase.tsx` & `src/components/ChannelLeadsPage.tsx`**: Add sort selector dropdown with `Newest Pasted` as default; sort leads using `createdAt` / `id`.
6. **`src/components/LeadDetailsModal.tsx` & `src/components/LeadModal.tsx`**: Embed the MockupVault component.
7. **`src/components/DailyDispatchDeck.tsx`**: Display mockup status indicator and quick-copy action so closers can send mockups directly during dispatch runs.
