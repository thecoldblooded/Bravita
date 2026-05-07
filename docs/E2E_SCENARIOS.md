# Bravita E2E Scenarios

Last updated: 2026-05-06

## Full Operational Journey

The Playwright suite in `e2e/full-user-journey.spec.ts` covers the broadest safe scenario we can run repeatedly without damaging production data.

The expanded suite in `e2e/expanded-user-actions.spec.ts` adds negative paths and secondary user operations that are safe to run repeatedly because Supabase and Edge Function calls are mocked, except for the explicit live protected-function smoke in the full journey suite.

### Customer Journey

1. Open storefront.
2. Toggle language.
3. Open buy/cart flow.
4. Load live-shaped product and site settings data.
5. Apply a promo code.
6. Continue to checkout.
7. Select a saved address.
8. Select bank transfer payment.
9. Review order summary and agreements.
10. Create an order through mocked Edge Function response.
11. Open order confirmation.
12. Visit profile tabs: profile, addresses, orders, support, settings.

### Admin Journey

1. Open admin dashboard.
2. Open order list.
3. Open order detail.
4. Open product management.
5. Open promo code management.
6. Open support management.
7. Open email management.
8. Open admin users.
9. Open audit logs.

### Expanded Customer And Operational Coverage

1. Cart quantity controls respect the product order limit.
2. Invalid promo codes show a user-facing error.
3. Checkout can add a missing delivery address.
4. Checkout blocks order submission until the agreement checkbox is accepted.
5. Bank transfer server failures keep the user on checkout and show an error.
6. Credit-card failure routing is covered through the payment-failed page.
7. Support center creates a ticket and supports customer replies to answered tickets.
8. Legal pages render safely.
9. Invalid 3D redirect payloads show a safe error state.
10. Complete-profile route renders for authenticated users.

### Live Supabase Smoke

The suite also calls the live `admin-rpc` Edge Function with an anonymous token and expects `401` or `403`. This proves the deployed function is reachable and still protected without creating or changing live data.

## Running

```bash
npm run test:e2e
```

Playwright starts Vite with `VITE_E2E_AUTH_STATE=true`, which enables a dev-only auth fixture. The fixture is ignored in production builds.

