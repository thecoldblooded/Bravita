# Bravita Production Hardening Implementation Plan

Last updated: 2026-05-07

## 1. Scope

This plan implements the approved production-hardening actions for the Bravita project.

Explicit exclusions requested by the user:

- Do **not** enable Supabase leaked password protection in this sprint.
- Do **not** implement admin/superadmin 2FA in this sprint.

## 2. Architectural Decisions

### 2.1 Canonical migration history

**Decision:** Remote Supabase migration history is canonical.

Implications:

- Local documentation and runbooks must align to remote migration history.
- New schema changes must not assume local filenames are canonical when a remote history mismatch exists.
- CI and release guidance must explicitly warn against blind migration repair from this checkout until reconciliation guidance is followed.

### 2.2 Production-hardening priorities

This sprint focuses on the highest-value reliability controls that reduce long-term operational risk:

1. Strengthen release gates.
2. Align runbooks and remove documentation drift.
3. Improve operational observability and failure signaling.
4. Start low-risk auth maintainability refactoring.
5. Verify with tests and quality gates.

## 3. Deliverables

### 3.1 Release gate hardening

Planned changes:

- Make strict type checking part of the release gate.
- Make React Doctor enforce failure on actionable issues instead of reporting-only mode.
- Add a dedicated production release/smoke workflow that validates critical paths separately from the broad security gate.

Files expected:

- `package.json`
- `react-doctor.config.json`
- `.github/workflows/security-gate.yml`
- `.github/workflows/production-release-smoke.yml` (new)

### 3.2 Supabase canonical-history runbook alignment

Planned changes:

- Update the production-readiness runbook to explicitly state that remote history is canonical.
- Document safe operator behavior for drift, future migrations, and release preparation.
- Consolidate or archive the legacy urgent deployment guide so operators do not follow conflicting instructions.

Files expected:

- `docs/PRODUCTION_READINESS.md`
- `docs/DEPLOYMENT_GUIDE.md`
- optional archive note if needed

### 3.3 Operational hardening

Planned changes:

- Promote audit-log insertion failures from passive logging to actionable alerting/structured failure output.
- Improve production readiness documentation for monitoring, reconciliation, and exception handling.
- Add any lightweight code hooks needed to support operational visibility without creating new runtime fragility.

Files expected:

- `supabase/functions/admin-rpc/index.ts`
- `docs/PRODUCTION_READINESS.md`
- optional scripts/workflows if justified by existing project structure

### 3.4 Low-risk auth refactor start

Planned changes:

- Extract narrowly-scoped logic from the large auth context into reusable helpers/utilities.
- Avoid behavioral rewrites during this sprint.
- Prefer structural decomposition that reduces future regression risk while preserving runtime behavior.

Files expected:

- `src/contexts/AuthContext.tsx`
- one or more new helper files under `src/lib/auth/` or `src/contexts/`

## 4. Implementation Sequence

### Phase A — Gate and workflow hardening

1. Inspect current package scripts and workflow behavior.
2. Update release gate composition.
3. Add dedicated release/smoke workflow.
4. Verify workflow syntax and script references.

### Phase B — Runbook reconciliation

1. Update production-readiness decisions.
2. Reclassify the old deployment guide as legacy/archive or merge it into the authoritative runbook.
3. Ensure operator instructions are unambiguous.

### Phase C — Operational signaling

1. Review admin RPC audit logging path.
2. Add stronger failure signaling.
3. Document monitoring and reconciliation actions.

### Phase D — Auth maintainability

1. Identify safe extraction points in the auth context.
2. Extract pure helpers or isolated state helpers first.
3. Re-run type checks and targeted tests.

### Phase E — Verification

1. Run relevant tests and quality gates.
2. Fix discovered issues.
3. Summarize residual risk and any required manual steps.

## 5. Verification Matrix

| Deliverable | Verification |
| --- | --- |
| Release gate updates | Script/workflow inspection + quality command execution |
| Runbook updates | Manual consistency review across docs |
| Audit failure signaling | Code-path review + lint/typecheck |
| Auth refactor | Typecheck + targeted runtime-safe validation |
| Overall sprint | `security:gate`-aligned checks as far as environment allows |

## 6. Constraints

- Do not deploy to the remote server without explicit user approval.
- If database migrations are created or changed, push to Supabase via MCP after validation.
- Keep server, database, and local guidance synchronized through documentation updates in this sprint.

## 7. Out of Scope For This Sprint

- Full migration history reconciliation in Supabase.
- Supabase leaked password protection enablement.
- Admin/superadmin 2FA implementation.
- Large auth-flow rewrites.
- Broad feature work unrelated to production hardening.
