# 8-Minute Platform-Independent Warm-Up Cooling Break

Add an automated 8-minute anti-spam cooling break after each prospect warm-up action, maintaining separate, independent timers for Instagram and Facebook profiles to protect outreach accounts against algorithmic flags.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product decisions were confirmed during the interactive interview:
> - **Display Placement**: Dedicated header status banner in warm-up workspaces and live countdown timers directly on locked action buttons (`⏱️ 07:49`).
> - **Platform Isolation**: Independent platform cooldowns—warming an Instagram lead triggers an 8-minute lock exclusively for Instagram warm-ups, leaving Facebook warm-ups immediately accessible (and vice-versa).
> - **Cooldown Feedback**: If a user clicks a button during an active cooling window, a friendly toast notification displays the exact remaining time (e.g. `⏱️ Instagram Cooling Break: 07:42 remaining before next warm-up`).

---

## 1. Overview & Core Concept

### What It Does
When an operator engages an Instagram or Facebook lead and clicks **"🔥 Warm Up"** or **"Mark as Warmed"**, the application records the warm-up action and starts an **8-minute countdown timer** strictly for that platform. 
- While active, all remaining leads on that platform switch to a locked cooling state showing a live countdown clock (`⏱️ 07:59`).
- The other platform remains completely unlocked and actionable.
- Once the timer reaches `00:00`, the buttons dynamically re-arm to **"🔥 Warm Up"**.

### Target Audience & Persona
High-velocity agency operators executing daily client acquisition sequences who need automated safety guardrails to comply with social platform rate limits without having to monitor external stopwatches.

### Key Value
- **Account Ban Prevention**: Eliminates burst-engagement activity that triggers Instagram and Facebook automated bot-detection algorithms.
- **Cross-Channel Efficiency**: Allows uninterrupted productivity by permitting Facebook warm-up engagements while Instagram is cooling down.
- **Persistent State**: Timers survive page refreshes, tab switches, and browser reloads via `localStorage`.

---

## 2. User Experience & Visual Design

### Key User Flows

#### A. Initiating a Warm-Up
1. The operator navigates to **"Today's Schedule"** or the **"Warm-Up Command Center"** (`activeModal === 'warmup_leads'`).
2. The operator opens an Instagram prospect's profile, likes/comments on recent posts, and clicks **"🔥 Warm Up"**.
3. **Instant Feedback**:
   - The prospect turns green with **"✅ Warmed"** and schedules for tomorrow.
   - A success toast confirms: `"✅ Lead [@handle] warmed! Instagram cooling break active for 8 minutes."`
   - All other Instagram warm-up buttons immediately lock with an amber border, timer icon, and live countdown: `⏱️ 07:59`.
   - An amber notification banner appears above the Instagram section:
     `"⏱️ Instagram Cooling Break Active (07:59 remaining) · Next profile engagement unlocks soon."`
   - Facebook prospects in the Combined section remain ready with **"🔥 Warm Up"**.

#### B. Clicking a Cooling Lead
1. If the operator accidentally clicks a locked Instagram button during the countdown:
   - A friendly floating toast notification alerts: `"⏱️ Instagram Cooling Break Active: 05:23 remaining before your next warm-up action to protect account health."`
   - The button gently highlights without triggering accidental writes or state corruption.

#### C. Expiration & Re-Arming
1. When the countdown reaches `00:00`, a clean unlock event dispatches:
   - The header notice clears.
   - Buttons smoothly transition from `⏱️ 00:00` back to `🔥 Warm Up`.

---

### Visual Identity & Theme Tokens

- **Aesthetic Direction**: Sleek, high-density dark SaaS command center with vibrant platform-specific accents.
- **Color Palette**:
  - *Instagram Warm-Up Cooldown*: Amber/Rose hues (`bg-pink-950/20`, `border-pink-500/40`, `text-pink-300`, `text-amber-400`).
  - *Facebook Warm-Up Cooldown*: Indigo/Sky hues (`bg-sky-950/20`, `border-sky-500/40`, `text-sky-300`, `text-amber-400`).
  - *Locked Countdown Chip*: Monospace numerals (`tabular-nums font-mono text-amber-300 bg-amber-500/15 border-amber-500/30`).
- **Typography & Layout Math**:
  - Unboxed inline metadata for timestamps and statuses (`·` separators).
  - Countdown buttons: `py-1.5 px-3 rounded-xl` maintaining strict minimum $40\text{px}$ touch targets.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Independent Platform Channels vs. Global Warm-Up Lock
- **Chosen Approach**: Distinct localStorage keys: `outreach_warmup_cooldown_instagram` and `outreach_warmup_cooldown_facebook`.
- **Why**: Instagram and Facebook operate on completely separate infrastructure and rate limits. A global lockout would unnecessarily force 16 minutes of idle time for 2 cross-channel tasks. Independent tracking doubles operator throughput while maintaining 100% platform safety.

### Decision 2: 8-Minute Dedicated Duration vs. 12-Minute DM Spacing
- **Chosen Approach**: 8 minutes for warm-up profiles (story views, likes, comments) and 12 minutes for outbound direct messages (`outreach_dm_cooldown_*`).
- **Why**: Profile engagements have lighter anti-bot scrutiny than cold direct messages, making 8 minutes the optimal balance between safety and workflow speed.

### Decision 3: Client-Side Persistent Event Bus
- **Chosen Approach**: Custom window events (`outreach_warmup_cooldown_changed`) paired with a 1-second `setInterval` ticker in active views.
- **Why**: Ensures all open modals, sub-tabs, and parent views stay synchronized in real time without polling backend servers.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Outreach Engine Pro                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────────────┐                 ┌────────────────────────┐   │
│   │   TodaysSchedule    │                 │  Warm-Up Modal (Cmd)   │   │
│   │   (Quick List View) │                 │  (Categorized IG / FB) │   │
│   └──────────┬──────────┘                 └───────────┬────────────┘   │
│              │                                        │                │
│              └───────────────────┬────────────────────┘                │
│                                  │                                     │
│                                  ▼                                     │
│                 ┌────────────────────────────────┐                     │
│                 │      antiSpamLock Utilities    │                     │
│                 │  - startWarmupCooldown(plat)   │                     │
│                 │  - getWarmupCooldownRemaining  │                     │
│                 │  - formatCooldownTime(ms)      │                     │
│                 └────────────────┬───────────────┘                     │
│                                  │                                     │
│                                  ▼                                     │
│                 ┌────────────────────────────────┐                     │
│                 │      Browser LocalStorage      │                     │
│                 │  • warmup_cooldown_instagram   │                     │
│                 │  • warmup_cooldown_facebook    │                     │
│                 └────────────────────────────────┘                     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & State Mapping

1. **`src/utils/antiSpamLock.ts`**:
   - `WARMUP_COOLDOWN_MS = 8 * 60 * 1000` (8 minutes).
   - `getWarmupCooldownStorageKey(platform: 'instagram' | 'facebook'): string`.
   - `getWarmupCooldownRemaining(platform: 'instagram' | 'facebook'): number`.
   - `startWarmupCooldown(platform: 'instagram' | 'facebook'): void`.
   - Emits `'outreach_warmup_cooldown_changed'` CustomEvent.

2. **`src/components/TodaysSchedulePage.tsx`**:
   - State: `igWarmupCooldownMs`, `fbWarmupCooldownMs`.
   - Event listener & 1-second ticker syncing both platform cooldowns.
   - In `handleToggleLeadWarmup(lead)`:
     - When toggling a lead to warmed, calls `startWarmupCooldown(platform)`.
   - In Section 3 ("🔥 Warm Up for Tomorrow") and Modal 3 ("Engage Warm-Up Leads"):
     - Displays platform-specific header banners if `cooldownMs > 0`.
     - Renders locked cooling buttons with live countdown `⏱️ {formatCooldownTime(ms)}`.
     - Clicking a cooling button fires a friendly toast notice with remaining time.

3. **`src/components/channel/DmSubPage.tsx` and `FollowupScheduleSubPage.tsx`**:
   - Integrated with platform-specific warm-up cooldown locks to ensure universal consistency across all views.
