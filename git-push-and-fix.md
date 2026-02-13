# Task: Git Push and UX/SEO Fixes

This task involves resolving identified UX and SEO issues before committing and pushing the latest changes to the repository.

## 📋 Objectives
- [ ] Fix UX Audit failures (Hick's Law, Purple removal, Accessibility labels)
- [ ] Fix SEO failures (Meta description, Title tags, OG tags)
- [ ] Verify fixes with `checklist.py`
- [ ] Stage all changes (including untracked files)
- [ ] Commit and Push to `origin master`

## 🛠️ Task Breakdown

### Phase 1: UX Fixes
- [ ] **index.html**: Reduce nav items to max 7, add labels to form inputs.
- [ ] **index.css**: Replace 'purple' colors with teal/cyan/emerald equivalents.
- [ ] **Benefits.tsx**: Replace '#A855F7' (purple) with teal/cyan/emerald.
- [ ] **confirm_signup.html**: Fix heading line-height and add status labels.

### Phase 2: SEO Fixes
- [ ] **admin.html**: Add title, meta description, and OG tags.
- [ ] **confirm_signup.html**: Add title, meta description, and OG tags.
- [ ] **order_confirmation.html**: Add title, meta description, and OG tags.
- [ ] **order_delivered.html**: Add title, meta description, and OG tags.
- [ ] **password_changed.html**: Add title, meta description, and OG tags.

### Phase 3: Verification & Shipping
- [ ] Run `python .agent/scripts/checklist.py .`
- [ ] `git add .` (Includes `public/bravita.gif` and `performance-optimization.md`)
- [ ] `git commit -m "perf: implement hCaptcha lazy loading and update loading animation, fix UX/SEO issues"`
- [ ] `git push origin master`

## 🔗 Dependencies
- `.agent/scripts/checklist.py`
- `.agent/skills/frontend-design/scripts/ux_audit.py`
- `.agent/skills/seo-fundamentals/scripts/seo_checker.py`
