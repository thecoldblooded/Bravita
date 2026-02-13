# Navbar Navigation Fix
**Date:** 2026-02-13
**Status:** Resolved

## Objective
Fix the navigation links in the landing page's navbar, ensuring they correctly scroll to their respective sections on the page.

## Changes
1.  **Moved Section IDs:**
    -   In `src/pages/Index.tsx`, added `id` attributes (`#benefits`, `#ingredients`, `#usage`, `#about`) to the `LazySection` wrappers.
    -   Removed the corresponding `id` attributes from the inner components `Benefits.tsx`, `Ingredients.tsx`, `Usage.tsx`, and `About.tsx`.
    -   *Rationale:* Navigation links target specific IDs. Since the sections are lazy-loaded, the inner components might not be in the DOM when the user clicks the link (or initially). Placing the ID on the wrapper ensures the target always exists in the DOM structure, allowing `scrollIntoView` to work reliably.

2.  **Addressed Specific User Complaints:**
    -   **"Usage" Link:** Updated the "Usage" navigation link to point to `#usage-content` (the text content) rather than `#usage` (the wrapper). This ensures the user bypasses the large video introduction and lands directly on the usage instructions.
    -   **Scroll Offsets:**
        -   Added `scroll-mt-24` class to `LazySection` wrappers in `Index.tsx` for Benefits, Showcase, Ingredients, and About.
            -   *Reasoning:* Reduced from `scroll-mt-32` to `scroll-mt-24` (approx 96px) to reduce the gap between the navbar and the content, making the sections appear higher up on the screen as requested ("Faydaları, İçindekiler, Hakkımızda biraz daha yukarda olmalı").
        -   Added `scroll-mt-32` class to `#usage-content` div in `Usage.tsx` (Usage maintains a slightly larger offset to clear its specific header treatment).
    -   **Active Tab Fix:** Corrected a bug in `Header.tsx` where the active tab logic was setting the tab state to the section ID (e.g., "benefits") instead of the localized name (e.g., "Faydaları"). The logic now correctly maps the ID back to the item name.

3.  **Updated `LazySection` Component:**
    -   Modified `src/components/ui/lazy-section.tsx` to accept an optional `id` prop and pass it to the underlying `div` element.

4.  **Lint Fix:**
    -   Updated `src/components/About.tsx` to use the modern Tailwind CSS utility `bg-linear-to-r`.

## Verification
-   **Browser Test:** Browsing to sections now correctly highlights the active tab and aligns the scroll position. "Usage" scrolls to the content, and other sections are positioned higher up with less gap.
-   **Checklist:** Code passes linting and standard checks. (UX Audit flags pre-existing issues).

## Next Steps
-   None. The navigation is fully functional.
