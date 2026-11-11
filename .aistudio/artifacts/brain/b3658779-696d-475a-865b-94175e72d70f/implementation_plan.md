# Streamlined Voice Type Engine & Workspace Filtering

A lightweight, distraction-free workflow that groups leads by assigned voice persona (`IG-1` to `IG-6` for Instagram, `Email-1` to `Email-4` for Combined/Email) with zero clutter. Operators filter leads using a clean dropdown next to the search bar and inspect or reassign types directly from the prospect table.

---

### Core Fixes & Enhancements

1. **Removed the "Copy Batch" Button**
   - Completely deleted the `Copy Batch for DeepSeek` button and its associated state/handlers from the toolbar.
   - Individual message editing and prompt workflows remain focused on single-lead generation.

2. **Replaced Horizontal Filter Bar with a Clean Dropdown**
   - Removed the bulky, horizontal scrollable `[ All ] [ IG-1 ] [ IG-2 ]...` bar entirely.
   - Added a compact, standard dropdown next to the search bar labeled:
     `Filter by Type: [All Types]` (dynamically displays the active selection, e.g. `Type 2` or `Email-1`).
   - Clicking opens a backdrop-dismissable menu with color indicators, count badges, and checkmarks.

3. **Workspace-Specific Logic (Strict Workspace Segregation)**
   - **Instagram Workspace (`channel === 'instagram'`):**
     - Filter dropdown ONLY displays: `All Types`, `Type 1` through `Type 6`.
     - Lead table row badge dropdown ONLY displays: `Type 1 (IG-1)` through `Type 6 (IG-6)`.
     - Zero Email types appear in the Instagram workspace.
   - **Combined Outreach Workspace (`channel === 'combined'`):**
     - Filter dropdown ONLY displays: `All Types`, `Email-1` through `Email-4`.
     - Lead table row badge dropdown ONLY displays: `Email-1` through `Email-4`.
     - Zero Instagram types appear in the Combined workspace.

4. **Prospect Name Table Badge**
   - Kept the compact, color-coded badge next to the Prospect Name (e.g. `IG-1`, `Email-2`).
   - Clicking the badge opens a workspace-constrained popover to quickly reassign the lead's voice persona in 1 click.
