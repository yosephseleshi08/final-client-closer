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

4. **Strict 4-Step Sequence Completion & Green Button Engine**
   - **Preserved Existing Edited Leads:**
     - First 6 Instagram leads (`ID 1, ID 2, ID 3, ID 4, ID 5, ID 6`) and first 4 Combined/Email leads (`CM 1, CM 2, CM 3, CM 4`) are preserved intact and marked with a **Green** button.
   - **Empty Sequences for All Other Leads:**
     - All other leads have their 4-step sequence messages (`initialDM`, `followupDM_Day7`, `followupDM_Day14`, `breakupDM_Day30`) set to empty by default.
     - Their button starts as **Blue**.
   - **Prompts & Analysis Untouched:**
     - Sourced prompts (`lead.prompt`) and deep analysis (`lead.leadAnalysis`) are preserved 100% intact across all leads.
   - **Strict All-4-Required Green Rule:**
     - The button turns **Green** ONLY if the operator writes content into **all 4 sequence steps** (Initial, Day 4, Day 8, Day 14).
     - If the operator writes 1, 2, or 3 messages and leaves even one step empty (e.g. Day 14), the button remains **Blue**.
   - **Clean Writer Modal:**
     - Textareas no longer pre-fill generic templates; they remain empty until the operator types.
     - Live progress badge inside the modal indicates: `"X / 4 Written (Fill all 4 to turn Green)"` or `"All 4 Sequences Ready (Button will be Green)"`.

5. **History Warm-Up CSV Export Calculation**
   - Corrected live warm-up percentage calculation in the CSV export so it reflects the actual real-time status (100% when all leads are warmed) rather than stale partial records.
