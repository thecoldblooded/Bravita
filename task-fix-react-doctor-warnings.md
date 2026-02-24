# Fix React Doctor Warnings

**Goal:** Resolve 222 warnings identified by `react-doctor` across 134 files to improve code quality, performance, and accessibility.

## Phase 1: Performance & Bundle Size Optimizations
- **Action:** Fix "will-change" memory leaks, lazy motion imports, and remove heavy library direct imports.
- **Rules to Address:**
  - `react-doctor/no-permanent-will-change` (2 warnings)
  - `react-doctor/use-lazy-motion` (2 warnings)
  - `react-doctor/prefer-dynamic-import` for recharts (1 warning)
  - `react-doctor/client-passive-event-listeners` (2 warnings)
- **Impact:** Reduces bundle size, saves GPU memory, and improves scroll performance.

## Phase 2: State Errors & Logic
- **Action:** Fix cascading state hook issues and replace them with `useReducer` where necessary. Prevent inline prop updates causing unnecessary re-renders.
- **Rules to Address:**
  - `react-doctor/no-cascading-set-state` (7 warnings)
  - `react-doctor/no-derived-useState` (3 warnings)
  - `react-doctor/no-effect-event-handler` (2 warnings)
  - `react-doctor/prefer-useReducer` (16 warnings in CookieConsent)
  - `react-doctor/no-inline-prop-on-memo-component` (2 warnings)
  - `react-doctor/no-array-index-as-key` (1 warning)
- **Impact:** Prevents infinite rendering loops, buggy state issues, and memoization teardowns.

## Phase 3: Accessibility & HTML Compliance
- **Action:** Ensure standard semantic HTML requirements and interactive roles are provided.
- **Rules to Address:**
  - `jsx-a11y/label-has-associated-control` (5 warnings)
  - `jsx-a11y/click-events-have-key-events` (5 warnings)
  - `jsx-a11y/no-static-element-interactions` (5 warnings)
  - `jsx-a11y/heading-has-content` (2 warnings)
  - `jsx-a11y/no-autofocus` (1 warning)
  - `react/no-unknown-property` (2 warnings)
- **Impact:** Completes screen-reader support properly according to the Web Content Accessibility Guidelines.

## Phase 4: Dead Code Elimination (Optional / Follow-up)
- **Action:** Address unused files, unused exports, and unused types.
- **Rules to Address:**
  - 75 unused files
  - 49 unused default exports
  - 27 unused types
- **Impact:** Cleans up the developer experience and project tree, but does not impact end users (Vite automatically tree-shakes unused files).

## Final Checks
- Run `npm run lint` and `react-doctor` again to confirm the absence of warnings.
