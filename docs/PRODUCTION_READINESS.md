# Bravita Production Readiness Runbook

Last reviewed: 2026-05-07

## 1. Authority And Scope

This is the authoritative production runbook for the current Bravita release process.

Operational rules for this repository:

- Remote Supabase migration history is canonical.
- Local migration filenames in this checkout are documentation and implementation inputs, but they are **not** the source of truth where late-stage version mismatches already exist.
- Do not perform blind migration repair from this checkout.
- Use this runbook instead of the legacy emergency guide in [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md).

User-approved exclusions for the current hardening sprint:

- Supabase leaked-password protection is intentionally **not** being enabled in this sprint.
- Admin/superadmin 2FA is intentionally **not** being implemented in this sprint.

## 2. Supabase Migration Posture

Supabase MCP `list_migrations` and local `npm run supabase:migration:list` agree through `20260227210300`.

The current remote database has the same late-stage migration names under different versions:

| Concern | Local file | Remote Supabase history |
| --- | --- | --- |
| Installment rates anon grant | `20260304000000_grant_anon_installment_rates.sql` | `20260304201615_grant_anon_installment_rates` |
| Stock before/after audit | `20260304112000_add_stock_before_after_audit_log.sql` | `20260304112036_add_stock_before_after_audit_log` |
| Dashboard stats v2 | `20260305120000_create_dashboard_stats_v2.sql` | `20260305122116_create_dashboard_stats_v2` |
| Security definer RPC lockdown | `20260505120000_lock_down_security_definer_rpcs.sql` | `20260505072001_lock_down_security_definer_rpcs` |

### Canonical-History Decision

**Decision:** remote Supabase history is canonical.

### Safe Operator Behavior

Until a dedicated reconciliation sprint finishes:

1. Treat the remote Supabase migration ledger as the production source of truth.
2. Do not rename remote history manually.
3. Do not run blind repair based only on local filenames.
4. Before any schema change:
   - run `npm run supabase:migration:list`
   - run `npm run supabase:drift:check`
   - confirm the intended migration does not rely on unresolved local/remote filename equivalence
5. Record every production schema change in release notes with both:
   - the remote migration version actually present in Supabase
   - the local file used as implementation context, if different

### Drift Interpretation

`npm run supabase:drift:check` currently classifies public schema drift as `cosmetic_function_replay` and non-actionable for the known mismatch state.

That does **not** mean arbitrary future drift is safe. Treat any new non-cosmetic drift as a release blocker until reviewed.

## 3. Release Gates

### Primary Gate

The main repository gate is [`npm run security:gate`](package.json:24).

It now enforces:

- Socket.dev CI scan
- `npm audit --audit-level=high`
- static security checklist
- lint
- standard typecheck
- strict typecheck
- unit tests
- Playwright E2E
- React Doctor with warning-level failure
- production build
- Supabase migration list verification
- Supabase drift check

### Release Smoke Gate

A dedicated smoke workflow exists at [`.github/workflows/production-release-smoke.yml`](.github/workflows/production-release-smoke.yml).

It is intended for production confidence checks and validates:

- lint
- standard typecheck
- strict typecheck
- unit tests
- the live protected-function Playwright smoke
- React Doctor
- build
- migration list verification
- drift check

### React Doctor Policy

[`react-doctor.config.json`](react-doctor.config.json) is configured to fail on warnings. Warnings are treated as actionable release-quality issues, not informational noise.

## 4. Supabase Advisors

### Security advisor

Current known item:

- `WARN auth_leaked_password_protection`

Status for this sprint:

- acknowledged
- intentionally deferred by product decision
- **not** a blocking task inside this hardening scope

### Performance advisor

Current known items:

- `INFO unindexed_foreign_keys`: `public.orders.orders_product_id_fkey` has no covering index
- several `unused_index` notices

Operator rule:

- do not remove unused indexes before observing at least 30 days of production traffic
- evaluate the foreign-key index during the next DB performance pass

## 5. Admin Write Policy

Admin writes should go through [`supabase/functions/admin-rpc/index.ts`](supabase/functions/admin-rpc/index.ts) instead of direct browser table mutation.

Current covered write operations:

- order status updates
- bank transfer payment confirmation
- tracking number updates
- site settings updates
- product create/update/delete/stock updates
- promo code create/update/delete
- admin role sync

Read-only admin queries may continue to use Supabase client reads when RLS allows them.

## 6. Monitoring And Alerts

### Minimum production monitoring

- Vercel deployment and function error alerts enabled for `api/auth/*` and `api/visitor-counter`
- Supabase Edge Function logs reviewed for `admin-rpc`, `bakiyem-*`, `create-bank-order`, `payment-maintenance`, and email functions
- GitHub `Payment Maintenance Cron` workflow alerting enabled; failures must page the operator because abandoned payment intents and stock reservations depend on it
- weekly `npm run security:gate` on `master`, plus one manual run before every deploy
- one manual `release smoke` run before planned production releases if the deployment is not already gated by branch policy
- Socket.dev API infrastructure failures are tolerated by default after retries so deploys are not blocked by third-party response-read outages; set `SOCKET_CI_ALLOW_API_FAILURE=false` if Socket availability must become a hard dependency

### Operational signaling added in this sprint

[`supabase/functions/admin-rpc/index.ts`](supabase/functions/admin-rpc/index.ts) now emits structured critical error logs for:

- unhandled admin RPC failures
- audit-log insertion failures

Each audited write response now carries a `requestId` in the JSON response body so operators can correlate user reports with function logs.

### Suggested daily checks during the first production week

- failed auth attempt spikes
- failed or pending payment intents
- orders with `payment_status='paid'` but non-progressed order status
- stock reservations older than the expected expiration window
- email send failures
- repeated `ADMIN_AUDIT_INSERT_FAILED` events
- repeated `ADMIN_RPC_UNHANDLED_ERROR` events

## 7. Reconciliation Queries And Manual Checks

Run these operational checks after deploys and during incident review:

### Orders paid but not progressing

```sql
select id, payment_status, status, updated_at
from public.orders
where payment_status = 'paid'
  and status in ('pending');
```

### Old stock reservations

```sql
select id, status, updated_at
from public.orders
where status = 'pending'
order by updated_at asc;
```

### Admin audit log recent failures

Review Supabase Edge Function logs for `ADMIN_AUDIT_INSERT_FAILED` and `ADMIN_RPC_UNHANDLED_ERROR` events, then correlate with returned `requestId` values from the admin UI action that triggered the issue.

## 8. Environment Inventory

Keep these in the correct secret store, never in client code:

- Vercel/Node runtime: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_URL`, `ALLOWED_AUTH_ORIGINS`, `ALLOWED_RECOVERY_REDIRECT_ORIGINS`, `HCAPTCHA_SECRET_KEY`, `COUNTERAPI_*`
- Supabase Edge Functions: `SUPABASE_SERVICE_ROLE_KEY`, `APP_BASE_URL`, `APP_ALLOWED_ORIGINS`, `APP_WEBHOOK_SECRET`, `PAYMENT_*`, `BAKIYEM_*`, `THREED_PAYLOAD_ENC_KEY`, `RESEND_API_KEY`, `BILLIONMAIL_*`, `SUPPORT_EMAIL_NOTIFY`
- GitHub Actions: `SOCKET_CLI_API_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `SUPABASE_ANON_KEY`, `PAYMENT_MAINTENANCE_SECRET`
- GitHub Actions variables: `SUPABASE_URL`
- optional CI knobs: `SOCKET_CI_ATTEMPTS`, `SOCKET_CI_ALLOW_API_FAILURE`

The tracked [`.env.local.example`](.env.local.example) is the human-readable inventory and should be updated whenever code reads a new environment variable.

## 9. Release Checklist

Before every production deploy:

1. Confirm remote Supabase history is still the canonical reference.
2. Run [`npm run security:gate`](package.json:24).
3. Run [`npm run release:smoke`](package.json:25) or the GitHub workflow equivalent.
4. Review drift evidence artifacts if Supabase drift tooling reports anything non-empty.
5. Confirm payment-maintenance cron is healthy.
6. Confirm no unresolved operational alert pattern is active in recent logs.
7. Publish release notes with any DB or environment changes.
