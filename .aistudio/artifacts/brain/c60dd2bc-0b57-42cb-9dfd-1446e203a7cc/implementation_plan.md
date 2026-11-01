# Video Value First Sales Strategy Upgrade & Video Verification Gate (Outreach Engine Pro)

Upgrading the CRM from traditional cold DM prospecting to a high-converting **"Video Value First"** sales workflow:
`Record Video → Post Reel (Tagging) → Send DM with Link → Follow up with Value`

---

## 1. Executive Summary & Core Quotas

### Top Dashboard Metrics (Executive Summary)
- **DMs Sent Today:** Real-time progress bar tracking against daily quota `"X / 6"` with completion percentage.
- **Reels Posted Today:** Real-time progress bar tracking against daily quota `"X / 2"` with completion percentage.
- **Videos Verified Today:** Counter showing `"X"` (how many videos were verified today through the 2-second confirmation gate).
- **Videos Pending Reel:** Counter highlighting prospects where `videoRecorded: true && !reelPosted`.
- **Current Streak:** Streak Lock enabled: only increments if **BOTH** `DMs Sent Today >= 6` AND `Videos Verified Today >= 1`.
- **Best Streak:** All-time execution record preserved.

---

## 2. Lead Data Schema & Table Workflow Columns

### Extended Lead Schema
- `videoRecorded`: boolean
- `videoRecordedAt`: string (ISO timestamp)
- `videoVerifiedAt`: string (ISO timestamp of 2-second proof confirmation)
- `reelPosted`: boolean (with `reelPostedAt` timestamp and optional `reelLink` URL)
- `dmSent`: boolean (with `dmSentAt` timestamp)
- `repliedSendIt`: boolean (with `repliedSendItAt` timestamp)
- `liveLinkSent`: boolean (with `liveLinkSentAt` timestamp)
- `city`: string (for contextual location replacement in templates)
- `followup3Date`: string (Day 30 Breakup trigger)

### Leads Table Workflow Columns
- Added 5 interactive workflow toggle buttons with subtle icon + status dot directly alongside the "Details" action in the Leads table:
  1. 🎥 **Video Recorded** (Cyan dot) — Gated with 2-second confirmation modal
  2. 📱 **Reel Posted** (Pink dot)
  3. ✈️ **DM Sent** (Indigo dot)
  4. 💬 **Replied "Send it"** (Amber dot)
  5. 🔗 **Live Link Sent** (Emerald dot)
- Toggling automatically updates timestamp and state in localStorage without altering lead order or losing existing data.

---

## 3. The "2-Second" Video Verification Gate

### Verification Modal ("🎥 Video Recorded — Confirm")
- Clicking the "Video Recorded" checkbox on a lead (`videoRecorded: false -> true`) opens the verification modal.
- **Label:** *"Type the restaurant's name to confirm you recorded the video."*
- Displays expected name below the input with a 1-click **Copy Name** button.
- Single text input (auto-focused, submits on Enter).
- **"Confirm"** and **"Cancel"** action buttons.

### Validation & Toast Feedback
- **Case-insensitive, trimmed comparison**: `input.trim().toLowerCase() === lead.name.trim().toLowerCase()`.
- **Mismatch**: Shows error toast: *"❌ Name doesn't match. Please try again."* Modal stays open.
- **Match**:
  - Sets `videoRecorded: true`, `videoRecordedAt: nowIso`, `videoVerifiedAt: nowIso`.
  - Records verification event in persistent storage (`recordVideoVerification`).
  - Closes modal.
  - Displays success toast: *"✅ Video verified."*

---

## 4. The Streak Lock Logic

- In `calculateStreaks` (`src/utils/historyStorage.ts`):
  - Today only increments `currentStreak` if:
    - `DMs Sent Today >= 6` AND
    - `Videos Verified Today >= 1` (verified today through the modal)
  - If a lead had `videoRecorded: true` prior to today but no verification was logged today, the streak does not increment.
  - Sunday Rest Mode is strictly preserved (rest day; continues streak without breaking or incrementing).

---

## 5. Video Value First Script Generator ("⚡ Script" / Warm-Up)

Mounted a dedicated **Video Value First Script Generator** modal:
- **Milestone Progress Bar:** Highlights current step.
- **Stage A Script (Initial Contact - Day 1):**
  > *"Hey [Lead Name]! I just posted a quick video on my story/feed breaking down your menu design/website and how you could easily add 15-20 more covers this weekend. Tagged you guys! Mind if I send the direct link to the full breakdown here?"*
- **Stage B Script (Post-Reaction - "Send it"):**
  > *"Here you go: [Live Link]. Let me know what you think of the online ordering tip at 1:12! If you want the full kitchen ticket PDF I mentioned, happy to send that over too."*

---

## 6. Dedicated "Reel Queue" Sub-Tab

- Dedicated sub-page right next to "Follow-Up Schedule".
- Shows count of videos recorded and pending reel posting.
- Helper Banner: *"You have [X] videos waiting to be posted. Goal: Post 2 today. Save the rest for tomorrow."*
- Card list with handle link, optional Reel link input, and 1-click "Mark as Posted" button.

---

## 7. Value-Based Follow-Up Timeline (Day 7, Day 14, Day 30)

1. **Day 7 Trigger (Value Check-In):** Friday night kitchen ticket speed-up PDF.
2. **Day 14 Trigger (Social Proof):** Area takeout order surge (+12%) case study.
3. **Day 30 Trigger (Breakup / Loom):** Archiving notice with 60-second mobile checkout Loom offer.

---

## 8. Verification & Data Safety

- Existing leads across Email, Instagram, and Facebook workspaces preserved intact.
- TypeScript compilation and linter verified with 0 errors.
- Dark theme styling and Sunday Rest Mode preserved.
