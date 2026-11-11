# Strict ID-to-Type Engine & Leads Table UI Fixes

### Overview of Completed Fixes

1. **Fixed "Filter by Type" Dropdown Hiding Behind Table (Z-Index / Stacking Context Bug)**
   - Elevated the toolbar container with `relative z-30` and the dropdown popover with `relative z-40` / `z-50 bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/80`.
   - Constrained the table container to `relative z-10`.
   - The dropdown now floats cleanly above the table header (`ID`, `PROSPECT NAME`, `SEQUENCE CONFIGURATION`, `ACTION`) and all lead rows without clipping or visual obstruction.

2. **Strict ID-to-Type Auto-Assignment (The Round-Robin Fix)**
   - When leads are imported or auto-assigned, their type is strictly derived from their numeric ID:
     - **Instagram Leads:**
       - ID ending in 1, 7, 13, 19 (`(id - 1) % 6 === 0`) = Type 1 (`IG-1`)
       - ID ending in 2, 8, 14, 20 (`(id - 1) % 6 === 1`) = Type 2 (`IG-2`)
       - ID ending in 3, 9, 15, 21 (`(id - 1) % 6 === 2`) = Type 3 (`IG-3`)
       - ID ending in 4, 10, 16, 22 (`(id - 1) % 6 === 3`) = Type 4 (`IG-4`)
       - ID ending in 5, 11, 17, 23 (`(id - 1) % 6 === 4`) = Type 5 (`IG-5`)
       - ID ending in 6, 12, 18, 24 (`(id - 1) % 6 === 5`) = Type 6 (`IG-6`)
     - **Email / Combined Leads:**
       - ID ending in 1, 5, 9, 13 (`(id - 1) % 4 === 0`) = Type 1 (`Email-1`)
       - ID ending in 2, 6, 10, 14 (`(id - 1) % 4 === 1`) = Type 2 (`Email-2`)
       - ID ending in 3, 7, 11, 15 (`(id - 1) % 4 === 2`) = Type 3 (`Email-3`)
       - ID ending in 4, 8, 12, 16 (`(id - 1) % 4 === 3`) = Type 4 (`Email-4`)
   - Existing leads immediately align to this formula on load, while respecting manual operator overrides (`isVoiceTypeOverridden: true`).

3. **Updated Table Badge & Manual Override Dropdown**
   - Kept the small, color-coded badge next to the Prospect Name, updated to display the clean label: `Type 1`, `Type 2`, `Type 3`, etc.
   - Clicking the badge opens a dropdown allowing the operator to manually override the type in 1 click (setting `isVoiceTypeOverridden: true`).
   - Clean UI without horizontal scrolling.

4. **Visual Completion Indicator: "Prompt / Edit Sequence" Turns Green**
   - **Default State (Unconfigured):** Renders with the original blue/indigo theme (`bg-indigo-500/15`, `border-indigo-500/30`, `text-indigo-300`, `Sparkles` icon).
   - **Saved / Configured State:** Once the operator writes/saves the 4-step sequence (setting `isSequenceConfigured: true` and `pitchSavedAt`), the button turns **emerald green** (`bg-emerald-500/20`, `border-emerald-500/40`, `text-emerald-200`, `CheckCircle2` green checkmark icon, and an emerald pulse dot).
   - The operator can still click the green button at any time to inspect the lead analysis or adjust the copy.

5. **History Warm-Up CSV Export Calculation**
   - Corrected live warm-up percentage calculation in the CSV export so it reflects the actual real-time status (100% when all leads are warmed) rather than stale partial records.
