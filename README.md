# Outreach Engine Pro (`final-client-closer.pages.dev`)

> **Production-Grade Multi-Channel Client Acquisition & Outreach CRM**  
> Built with React, TypeScript, Tailwind CSS, and resilient client-side LocalStorage architecture.

---

## 📌 Executive Overview

**Outreach Engine Pro** is an autonomous acquisition and pipeline execution workspace designed for modern outbound deal closers. The application orchestrates high-volume outreach across **Instagram**, **Email**, and **Facebook**, while maintaining strict deliverability rules, anti-spam protective time-locks, and verifiable streak persistence.

### Core Value Proposition
- **Unified Outreach Pool**: Enforces a strict global cap of **10 Combined Touchpoints/Day** across all channels, with immediate target capacity (6 IG + 4 Combined Others) from Day 1.
- **Data Integrity & Real History**: Decouples lead generation from outreach execution. Streaks, completion rates, and metrics increment **strictly upon manual verified outreach actions**.
- **Standardized Cadence Architecture**: Strict progression: `Initial Outreach` → `Day 7 (+7d)` → `Day 14 (+14d)` → `Day 30 (+30d)` with programmatic validation guards and Admin Force-Send Override.
- **Smart Channel Fallback**: Automatically identifies restricted Facebook profiles and provides 1-click routing to the Email outreach pipeline.
- **Sunday Prep Mode & Rest Protocol**: Outreach queues pause on Sundays to prevent burnout and respect business etiquette, preserving active streaks while keeping Lead Intake and Analysis active for Monday pipeline prep.

---

## 🛠 Tech Stack Details

| Layer | Technologies |
|---|---|
| **Core Framework** | React 18, TypeScript (Strict Mode) |
| **Build & Tooling** | Vite, ESBuild |
| **Styling & Design System** | Tailwind CSS (Dark theme with neon indigo, cyan, emerald, and amber accents) |
| **Icons & UI Micro-Interactions** | Lucide React |
| **Drag & Drop Interactions** | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| **Persistence Engine** | Isolated HTML5 LocalStorage with prefix-namespaced keys |
| **Audio Feedback** | Web Audio API synthetic chimes for warning and success feedback |

---

## 🚀 Installation & Local Development

### Prerequisites
- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher (or pnpm / yarn)

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/your-username/outreach-engine-pro.git

# Navigate into the project folder
cd outreach-engine-pro

# Install dependencies
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
The application will launch locally at `http://localhost:3000`.

### 3. Production Build
```bash
# Compile and package for production
npm run build

# Preview production build locally
npm run preview
```

---

## 🔬 Feature Deep-Dives

### 1. Unified Daily Quota System & Flat Capacity Model
Unlike legacy ramp-up schedules that artificially slow down deal flow over 10 days, Outreach Engine Pro utilizes the **Flat Capacity Model**:
- **Global Quota**: Enforces a cap of **10 Combined Touchpoints/Day**.
- **Per-Channel Baseline**:
  - **Instagram**: Target 6 DMs/day.
  - **Email & Facebook**: Combined 4 touchpoints/day.
  - **Flexible Allocation**: Operators can mix channels dynamically (e.g., 6 IG + 2 Email + 2 FB = 10 touchpoints).
- **Auto-Schedule Dispatch Planner**: Unscheduled leads are automatically assigned dates starting from tomorrow (preserving today for account warm-up), immediately filling up to daily target capacity while skipping Sundays.

### 2. Warm-Up Lock & Deliverability Protection
Outbound social accounts (especially fresh Instagram and Facebook profiles) get restricted when sending cold DMs without prior engagement.
- **Lock Rule**: When leads are imported or auto-scheduled, they default to `warmupStatus: 'locked'`.
- **Pre-DM Engagement Checklist**: Operators must perform 3 warm-up steps before the pitch is unlocked:
  1. Like 3 recent posts.
  2. Leave 1 thoughtful, niche-specific comment.
  3. View prospect's active Story (if available).
- **Time-Lock Release**: Once marked warmed up, the dispatch button turns active, ensuring account safety and dramatically boosting message response rates.

### 3. Standardized Follow-Up Cadence & Validation Guards
Cold leads rarely convert on message #1. Outreach Engine Pro enforces a disciplined 4-stage cadence:
1. **Initial Outreach** (Day 0) — Value pitch with personalized mockup.
2. **Day 7 Follow-Up (+7 Days)** — Kitchen Ticket / Operational Value PDF check-in.
3. **Day 14 Follow-Up (+14 Days)** — Takeout surge case study and revenue proof.
4. **Day 30 Final Follow-Up (+30 Days)** — 60-second Loom mobile audit and breakup offer.

#### Validation Guards & Admin Override
- **Guarded Windows**: System locks Day 7, Day 14, and Day 30 tasks from premature execution (e.g., preventing a Day 14 follow-up from being fired on Day 9).
- **Admin Force-Send Override**: An explicit toggle allows operators or agency managers to override the time lock with single-click manual authorization when early prospect replies warrant immediate outreach.
- **Calendar Matrix Badging**: The 30-Day Calendar Matrix renders distinct color-coded badges for each touchpoint stage:
  - 🔵 **Blue**: Initial Outreach
  - 🟣 **Purple**: Day 7 Follow-Up
  - 🟡 **Amber**: Day 14 Follow-Up
  - 🔴 **Red**: Day 30 Final Breakup

### 4. Smart Facebook Restriction & Fallback Routing
Facebook business profiles frequently hide or disable direct messenger buttons for non-friends or external regions.
- **Lead Flagging**: Leads can be flagged with `fb_message_restricted: true`.
- **1-Click Smart Routing**: Directly converts and transfers the lead into the Email workspace pipeline (`EM-XXX`), preserving prospect notes, contact links, and audit history.
- **Executive Dashboard Alerting**: The Executive Command Center highlights restricted Facebook prospects in real-time.

### 5. Sunday Prep Mode & Rest Protocol
To avoid burnout and respect commercial outreach decorum:
- **Automatic Day Detection**: Sundays are identified based on the operator's local time zone.
- **Queues Paused**: Outreach dispatches and follow-up alerts are hidden (data remains safe and intact).
- **Streak Preservation**: Sundays are recorded as Rest Days (`⚪ Rest Day`) and **never break active streaks**. Monday picks up momentum seamlessly from Saturday.
- **Active Prep Tools**: Leads intake, Gemini analysis prompt hub, DeepSeek DM sequence generators, and calendar assignment tools stay fully interactive on Sundays to prepare Monday's pipeline.

---

## 📊 Data Schema Definitions

All records are strongly typed in TypeScript and saved to isolated LocalStorage keys to avoid channel cross-contamination.

### `ChannelLead`
```typescript
export interface ChannelLead {
  id: string;                      // e.g. 'IG-001', 'EM-012', 'FB-005'
  numericId: number;               // 1, 12, 5
  name: string;                    // Prospect or business name
  link: string;                    // Profile or website URL
  channel: MultiChannelType;       // 'email' | 'instagram' | 'facebook'
  sortOrder: number;               // Priority index for dnd reordering
  createdAt: string;               // ISO 8601 timestamp

  // Scheduling & Warmup
  scheduledDate?: string;          // YYYY-MM-DD
  isWarmedUp?: boolean;
  warmupStatus?: 'locked' | 'warmed' | 'skipped';

  // Dispatch & Follow-Up Tracking
  dmSent?: boolean;
  dmSentAt?: string;
  initialSentDate?: string;        // YYYY-MM-DD
  followupCount?: number;          // 0 = Initial only, 1 = D7, 2 = D14, 3 = D30
  followup1Date?: string;          // Target YYYY-MM-DD (+7d)
  followup2Date?: string;          // Target YYYY-MM-DD (+14d)
  followup3Date?: string;          // Target YYYY-MM-DD (+30d)
  isCompleted?: boolean;
  leadStatus?: 'active' | 'replied' | 'completed' | 'not_interested';

  // Smart Channel Routing
  fb_message_restricted?: boolean; // Flagged when FB Message button is unavailable
  notes?: string;
  quickNote?: string;
  quickNoteSavedAt?: string;

  // Pitch Content
  customPitch?: string;
  initialDM?: string;
  hasMockup?: boolean;
  mockupHtml?: string;
}
```

### `DailyHistoryRecord`
```typescript
export interface DailyHistoryRecord {
  date: string;                    // YYYY-MM-DD
  displayDate: string;             // e.g. "Nov 6, 2026"
  dmsSent: number;                 // Total scheduled tasks completed today
  dmsTarget: number;               // Total scheduled tasks due today
  initialDmsSent?: number;         // Initial cold DMs dispatched today
  followupsSent?: number;          // Day 7 / 14 / 30 follow-ups completed today
  percentage: number;              // 0 to 100
  status: 'full' | 'partial' | 'zero' | 'sunday' | 'frozen';
  isSunday: boolean;
  isFrozen?: boolean;
  notes?: string;
}
```

### Storage Key Isolation Matrix
| Channel / Domain | Storage Key | Isolation Purpose |
|---|---|---|
| **Instagram Leads** | `outreach_channel_leads_instagram` | Isolated Instagram pipeline |
| **Email Leads** | `outreach_channel_leads_email` | Isolated Email pipeline |
| **Facebook Leads** | `outreach_channel_leads_facebook` | Isolated Facebook pipeline |
| **History Records** | `crm_daily_history` | Persistent 30-day completion audit log |
| **Pipeline Freeze** | `outreach_pipeline_frozen` | Weekly vacation/freeze status |

---

## 🌐 Deployment Guide

### Deploying to Cloudflare Pages (`final-client-closer.pages.dev`)
This application is optimized for zero-server static deployment on Cloudflare Pages.

1. **Connect Repository**:
   - In Cloudflare Dashboard, go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. **Build Configuration**:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version**: Specify `NODE_VERSION: 18` or higher in Environment Variables.
3. **Deploy**:
   - Click **Save and Deploy**. Cloudflare Pages will build the bundle and deploy globally to `final-client-closer.pages.dev`.

### Deploying to Vercel
1. Install Vercel CLI or import the repository in the Vercel Dashboard.
2. Settings:
   - **Framework**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Click **Deploy**.

---

## 🤝 Contributing Guidelines & Code Quality Standards

1. **TypeScript Strictness**: No implicit `any`. All props, events, and records must be explicitly typed.
2. **LocalStorage Decoupling**: Never mutate storage keys directly. Use provided utility functions in `src/utils/channelStorage.ts` and `src/utils/historyStorage.ts`.
3. **Time Zone Determinism**: Always format and compare calendar dates using local time strings (`YYYY-MM-DD`) via `getLocalTodayStr()` to avoid UTC date boundary misalignments.
4. **Tailwind Styling**: Adhere to the established dark neon design token palette (`bg-slate-950`, `bg-slate-900/80`, `border-white/10`, with emerald, sky, purple, and amber accents).
5. **History Integrity**: Never auto-seed `DailyHistoryRecord` entries upon lead import or app initialization. All history increments occur ONLY via explicit manual task completion actions in the Today's Schedule module. This preserves data authenticity and prevents phantom streak inflation.
