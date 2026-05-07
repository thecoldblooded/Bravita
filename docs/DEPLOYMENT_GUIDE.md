# Bravita Deployment Guide

Last reviewed: 2026-05-07

## Status

This document is **archived as a legacy emergency guide**.

Do **not** use the old SQL-editor hotfix steps in this file as the primary production procedure anymore.

The authoritative sources are now:

- [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md)
- [`implementation_plan.md`](implementation_plan.md)

## Why this document was archived

The previous version of this guide described an urgent security-fix rollout from February 2026. That content was useful during the emergency window, but it is no longer safe as the main production playbook because:

- the repository now has a newer canonical production runbook
- Supabase migration history is known to have local/remote version mismatches
- blindly replaying historical SQL steps can create drift or duplicate remediation
- operational responsibility has moved from one-time patching to repeatable gated releases

## Current operator policy

Use [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md) for:

- release gates
- Supabase drift handling
- migration-history rules
- monitoring and alerting
- production reconciliation checks
- environment inventory

## Historical note

The older emergency content covered:

- initial RLS repair verification
- first-admin bootstrap guidance
- localStorage manipulation checks
- manual SQL validation steps

Those topics are now either already implemented, superseded by migrations, or should be validated through the modern release gate and runbook instead of manual ad-hoc replay.

## If you need the historical emergency procedure

Recover it from Git history rather than reusing this file as-is. That preserves traceability while preventing operators from following outdated instructions during a live release.
