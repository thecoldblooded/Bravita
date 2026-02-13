# Task: Performance Optimization & Problem Rectification

## Status
- [x] Lazy load hCaptcha in all forms
- [x] Lazy load FloatingSupport component
- [x] Fix layout shifts (CLS)
- [x] Improve loading aesthetics (Loader GIF)
- [x] Resolve ESLint `no-explicit-any` errors in CAPTCHA refs
- [x] Silence CSS v4 unknown at-rule warnings in VS Code

## Context
Lazy loading hCaptcha was implemented to improve initial bundle size and page load speed. However, using `any` for the `useRef` type triggered ESLint errors. Additionally, Tailwind CSS v4 at-rules (`@plugin`, `@theme`) are causing warnings in the IDE.

## Plan
1. **Fix CAPTCHA Refs Type**: Use `import type` from `@hcaptcha/react-hcaptcha` to avoid `any` while keeping the component lazy-loaded.
2. **Verify Lint**: Run `npm run lint` again to ensure all errors are resolved.
3. **Checklist**: Run the master checklist to confirm project health.

## Verification Criteria
- `npm run lint` passes without errors.
- hCaptcha still loads lazily (verified via Network tab).
- No unknown at-rule warnings in `index.css`.
