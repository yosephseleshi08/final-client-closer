# Video Value First Sales Strategy Upgrade (Outreach Engine Pro)

Upgrading the CRM from traditional cold DM prospecting to a high-converting **"Video Value First"** sales workflow:
`Record Video → Post Reel (Tagging) → Send DM with Link → Follow up with Value`

---

## 1. Executive Summary & Core Quotas

### Top Dashboard Metrics (Executive Summary)
- **DMs Sent Today:** Real-time progress bar tracking against daily quota `"X / 6"` with completion percentage.
- **Reels Posted Today:** Real-time progress bar tracking against daily quota `"X / 2"` with completion percentage.
- **Videos Pending Reel:** Counter highlighting prospects where `videoRecorded: true && !reelPosted`.
- **Preserved Metrics:** Current Streak and Best Streak counter cards preserved intact.

---

## 2. Lead Data Schema & Table Workflow Columns

### Extended Lead Schema
- `videoRecorded`: boolean (with `videoRecordedAt` ISO timestamp)
- `reelPosted`: boolean (with `reelPostedAt` timestamp and optional `reelLink` URL)
- `dmSent`: boolean (with `dmSentAt` timestamp)
- `repliedSendIt`: boolean (with `repliedSendItAt` timestamp)
- `liveLinkSent`: boolean (with `liveLinkSentAt` timestamp)
- `city`: string (for contextual location replacement in templates)
- `followup3Date`: string (Day 30 Breakup trigger)

### Leads Table Workflow Columns
- Added 5 interactive workflow toggle buttons with subtle icon + status dot directly alongside the "Details" action in the Leads table:
  1. 🎥 **Video Recorded** (Cyan dot)
  2. 📱 **Reel Posted** (Pink dot)
  3. ✈️ **DM Sent** (Indigo dot)
  4. 💬 **Replied "Send it"** (Amber dot)
  5. 🔗 **Live Link Sent** (Emerald dot)
- Toggling automatically updates timestamp and state in localStorage without altering lead order or losing existing data.

---

## 3. Video Value First Script Generator ("⚡ Script" / Warm-Up)

Mounted a dedicated **Video Value First Script Generator** modal and quick drawer accessible directly via the `"⚡ Script"` button next to Details:
- **Milestone Progress Bar:** Highlights current step (Stage A Pending → Video Recorded → Reel Posted → Stage A Sent → Lead Replied "Send it" → Stage B Sent).
- **Stage A Script (Initial Contact - Day 1):**
  > *"Hey [Lead Name]! I just posted a quick video on my story/feed breaking down your menu design/website and how you could easily add 15-20 more covers this weekend. Tagged you guys! Mind if I send the direct link to the full breakdown here?"*
- **Stage B Script (Post-Reaction - "Send it"):**
  > *"Here you go: [Live Link]. Let me know what you think of the online ordering tip at 1:12! If you want the full kitchen ticket PDF I mentioned, happy to send that over too."*
- Features instant 1-click clipboard copy and auto-population of `[Live Link]`, `[Lead Name]`, and customizable placeholders.

---

## 4. Dedicated "Reel Queue" Sub-Tab

Added a new dedicated sub-page right next to "Follow-Up Schedule":
- **Badge Indicator:** Shows count of videos recorded but not yet posted on social feed.
- **Helper Banner:** *"You have [X] videos waiting to be posted. Goal: Post 2 today. Save the rest for tomorrow."*
- **Queue Cards:**
  - Lead Name, Channel handle link, and recording timestamp.
  - Optional Reel URL input field.
  - One-click `"Mark as Posted"` button that sets `reelPosted = true` and updates state in real time.
- Filter toggle to toggle between pending queue and already-posted reels.

---

## 5. Value-Based Follow-Up Timeline (Day 7, Day 14, Day 30)

Replaced generic follow-up copy with high-converting value milestones:
1. **Day 7 Trigger (Value Check-In):**
   > *"Hey [Lead Name], did you get a chance to see that breakdown video? We just put together a quick PDF on 3 ways to speed up kitchen ticket times on Friday nights—want me to drop it here?"*
2. **Day 14 Trigger (Social Proof / Case Study):**
   > *"Hey [Lead Name]! Quick update—another spot in [City/Area] implemented that online ordering tweak from the video we tagged you in and saw a 12% jump in takeout orders last week. Thought of you guys!"*
3. **Day 30 Trigger (The "Breakup" / Final Audit):**
   > *"Hey [Lead Name], I know you're super busy running service. I'm archiving our video breakdown this week, but I recorded a quick 60-second Loom showing the #1 leak on your mobile checkout. Should I send the Loom or would you rather I close your file?"*
- Integrated seamlessly into both the **Follow-Up Schedule** sub-tab and the unified **Today's Execution Schedule** page.

---

## 6. Verification & Data Safety

- Strict adherence to non-destructive updates: existing leads in Instagram, Facebook, and Email remain intact.
- TypeScript compilation (`compile_applet`) and linting (`tsc --noEmit`) verified clean with 0 errors.
- Dark theme styling and Sunday Rest Mode preserved intact.
