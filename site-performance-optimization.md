# Site Performance Optimization

## Goal
Remove artificial render delays and keep non-critical code/data out of the landing page's initial load.

## Tasks
- [x] Remove the HTML/video loader and reveal the React app without user-agent-specific delays. → Verify: initial HTML no longer references loader media.
- [x] Keep the public home route visible while auth restores in the background. → Verify: `/` does not render the auth splash branch.
- [x] Restrict the React vendor chunk rule to exact framework packages. → Verify: lazy Lottie/phone libraries are absent from initial chunks.
- [x] Mount auth/cart modals only when opened and defer cart settings realtime work until needed. → Verify: closed landing page does not request modal chunks or site settings.
- [x] Self-host the Baloo 2 variable font and remove the Google Fonts render-blocking request. → Verify: built HTML has no `fonts.googleapis.com` stylesheet.
- [x] Run lint, typecheck, tests, production build, bundle budget comparison, and Lighthouse. → Verify: checks pass and initial transfer/render metrics improve.

## Done When
- [x] The landing page has no forced splash delay, initial JS is materially smaller, and validation passes.
