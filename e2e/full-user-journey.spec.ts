import { expect, type Page, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { installPageDiagnostics } from "./support/diagnostics";

const E2E_USER_ID = "00000000-0000-4000-8000-000000000001";
const E2E_ADDRESS_ID = "00000000-0000-4000-8000-000000000101";
const E2E_PRODUCT_ID = "00000000-0000-4000-8000-000000000201";
const E2E_ORDER_ID = "00000000-0000-4000-8000-000000000301";

const e2eProfile = {
  id: E2E_USER_ID,
  email: "e2e.customer@bravita.test",
  full_name: "E2E Bravita Kullanici",
  phone: "+905551112233",
  user_type: "individual",
  company_name: null,
  profile_complete: true,
  phone_verified: true,
  phone_verified_at: new Date().toISOString(),
  oauth_provider: null,
  is_admin: true,
  is_superadmin: true,
  created_at: "2026-05-06T10:00:00.000Z",
  updated_at: "2026-05-06T10:00:00.000Z",
};

const e2eSession = {
  access_token: "e2e",
  refresh_token: "e2e",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: E2E_USER_ID,
    email: e2eProfile.email,
    app_metadata: { is_admin: true, is_superadmin: true, provider: "email" },
    user_metadata: { full_name: e2eProfile.full_name, phone: e2eProfile.phone },
    aud: "authenticated",
    created_at: e2eProfile.created_at,
  },
};

const e2eAddress = {
  id: E2E_ADDRESS_ID,
  user_id: E2E_USER_ID,
  street: "E2E Mahallesi, Test Sokak No: 42",
  city: "Istanbul",
  district: "Kadikoy",
  postal_code: "34000",
  address_type: "home",
  is_default: true,
  created_at: "2026-05-06T10:05:00.000Z",
};

const e2eProduct = {
  id: E2E_PRODUCT_ID,
  name: "Bravita Multivitamin",
  slug: "bravita-multivitamin",
  price: 499,
  original_price: 699,
  stock: 25,
  reserved_stock: 0,
  max_quantity_per_order: 5,
  description: "E2E test urunu",
  image_url: null,
  is_active: true,
  created_at: "2026-05-06T10:10:00.000Z",
  updated_at: "2026-05-06T10:10:00.000Z",
};

const e2eOrder = {
  id: E2E_ORDER_ID,
  user_id: E2E_USER_ID,
  status: "pending",
  payment_method: "bank_transfer",
  payment_status: "pending",
  shipping_address_id: E2E_ADDRESS_ID,
  created_at: "2026-05-06T10:20:00.000Z",
  updated_at: "2026-05-06T10:20:00.000Z",
  order_details: {
    items: [
      {
        product_id: E2E_PRODUCT_ID,
        product_name: "Bravita Multivitamin",
        quantity: 1,
        unit_price: 499,
        subtotal: 499,
      },
    ],
    subtotal: 499,
    vat_amount: 4.99,
    shipping_cost: 0,
    discount: 50.4,
    promo_code: "E2E10",
    total: 453.59,
  },
  shipping_address: e2eAddress,
};

const hasPrimaryIdFilter = (search: string) => /(?:[?&])id=eq\./.test(search);

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

async function seedAuthenticatedUser(page: Page) {
  await page.context().addInitScript(({ session, user }) => {
    (window as Window & { __BRAVITA_E2E_AUTH_ENABLED?: boolean }).__BRAVITA_E2E_AUTH_ENABLED = true;
    window.localStorage.setItem("bravita_e2e_auth", JSON.stringify({ session, user }));
    window.localStorage.setItem("cookie_consent:v1", "accepted");
    window.localStorage.setItem("cookie_preferences:v1", JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
    }));
    window.sessionStorage.setItem("bravita_splash_shown", "true");
  }, { session: e2eSession, user: e2eProfile });
}

async function mockSupabase(page: Page) {
  await page.route("**/api/visitor-counter**", async (route) => {
    await route.fulfill(jsonResponse({ count: 1234 }));
  });

  await page.route("**/auth/v1/**", async (route) => {
    await route.fulfill(jsonResponse({ user: null, session: null }));
  });

  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();
    const search = url.search;

    if (pathname.endsWith("/site_settings")) {
      await route.fulfill(jsonResponse({
        id: 1,
        vat_rate: 0.01,
        shipping_cost: 0,
        free_shipping_threshold: 0,
        bank_name: "Turkiye Is Bankasi",
        bank_iban: "TR280006400000143730299549",
        bank_account_holder: "VALCO ILAC ARGE",
      }));
      return;
    }

    if (pathname.endsWith("/products")) {
      await route.fulfill(jsonResponse(search.includes("slug=eq.") ? e2eProduct : [e2eProduct]));
      return;
    }

    if (pathname.endsWith("/installment_rates")) {
      await route.fulfill(jsonResponse([{ installment_number: 1, commission_rate: 0, is_active: true }]));
      return;
    }

    if (pathname.endsWith("/addresses")) {
      if (method === "POST") {
        await route.fulfill(jsonResponse(e2eAddress, 201));
        return;
      }

      await route.fulfill(jsonResponse(hasPrimaryIdFilter(search) ? e2eAddress : [e2eAddress]));
      return;
    }

    if (pathname.endsWith("/profiles")) {
      await route.fulfill(jsonResponse(hasPrimaryIdFilter(search) ? e2eProfile : [e2eProfile]));
      return;
    }

    if (pathname.endsWith("/orders")) {
      await route.fulfill(jsonResponse(hasPrimaryIdFilter(search) ? e2eOrder : [e2eOrder]));
      return;
    }

    if (pathname.endsWith("/promo_codes")) {
      await route.fulfill(jsonResponse([{
        id: "promo-e2e",
        code: "E2E10",
        discount_type: "percentage",
        discount_value: 10,
        min_order_amount: 0,
        max_discount_amount: 100,
        usage_limit: 100,
        usage_count: 0,
        is_active: true,
        start_date: null,
        end_date: null,
      }]));
      return;
    }

    if (pathname.endsWith("/support_tickets")) {
      await route.fulfill(jsonResponse([{
        id: "ticket-e2e",
        user_id: E2E_USER_ID,
        name: e2eProfile.full_name,
        email: e2eProfile.email,
        category: "order",
        subject: "E2E destek talebi",
        message: "E2E destek mesaji",
        status: "open",
        created_at: "2026-05-06T10:30:00.000Z",
      }]));
      return;
    }

    if (pathname.endsWith("/admin_audit_log")) {
      await route.fulfill(jsonResponse([{
        id: "audit-e2e",
        admin_user_id: E2E_USER_ID,
        action: "E2E_SMOKE",
        target_table: "orders",
        target_id: E2E_ORDER_ID,
        details: {},
        created_at: "2026-05-06T10:40:00.000Z",
      }]));
      return;
    }

    if (pathname.endsWith("/email_templates") || pathname.endsWith("/email_logs")) {
      await route.fulfill(jsonResponse([]));
      return;
    }

    if (pathname.includes("/rpc/")) {
      await route.fulfill(jsonResponse({ success: true }));
      return;
    }

    await route.fulfill(jsonResponse([]));
  });

  await page.route("**/functions/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const body = route.request().postDataJSON() as { action?: string } | null;

    if (url.pathname.endsWith("/verify-promo-code")) {
      await route.fulfill(jsonResponse({
        valid: true,
        message: "Promosyon kodu uygulandi",
        discount_type: "percentage",
        discount_value: 10,
        min_order_amount: 0,
        max_discount_amount: 100,
      }));
      return;
    }

    if (url.pathname.endsWith("/create-bank-order")) {
      await route.fulfill(jsonResponse({
        success: true,
        order_id: E2E_ORDER_ID,
        bank_reference: "BRV-E2E-0001",
        message: "Siparis basariyla olusturuldu",
      }));
      return;
    }

    if (url.pathname.endsWith("/send-order-email")) {
      await route.fulfill(jsonResponse({ success: true }));
      return;
    }

    if (url.pathname.endsWith("/admin-rpc")) {
      if (body?.action === "getDashboardStats") {
        await route.fulfill(jsonResponse({
          success: true,
          data: {
            total_revenue: 453.59,
            order_count: 1,
            cancelled_count: 0,
            new_member_count: 1,
            active_product_count: 1,
            daily_sales: [],
            order_status_distribution: [{ status: "pending", count: 1 }],
            top_products: [{ product_name: "Bravita Multivitamin", total_quantity: 1, total_revenue: 499 }],
            recent_orders: [e2eOrder],
            recent_cancellations: [],
            recent_members: [e2eProfile],
          },
        }));
        return;
      }

      await route.fulfill(jsonResponse({ success: true, data: e2eProduct }));
      return;
    }

    await route.fulfill(jsonResponse({ success: true }));
  });
}

function readDotEnv() {
  const candidates = [".env.local", ".env"];
  const result: Record<string, string> = {};

  for (const candidate of candidates) {
    const filePath = path.resolve(process.cwd(), candidate);
    if (!fs.existsSync(filePath)) continue;

    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const match = /^([A-Z0-9_]+)=(.*)$/i.exec(line.trim());
      if (!match) continue;
      result[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }

  return result;
}

test.describe("Bravita E2E full operational journey", () => {
  let cleanupDiagnostics: (() => Promise<void>) | null = null;

  test.beforeEach(async ({ page }, testInfo) => {
    await mockSupabase(page);
    await seedAuthenticatedUser(page);
    cleanupDiagnostics = await installPageDiagnostics(page, testInfo);
  });

  test.afterEach(async () => {
    if (cleanupDiagnostics) {
      await cleanupDiagnostics();
      cleanupDiagnostics = null;
    }
  });

  test("authenticated customer completes storefront, cart, checkout, order and profile journey", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("header-buy-button")).toBeVisible();
    await page.getByLabel(/Switch language to English|Dili Turkceye cevir/).click();
    await expect(page.getByLabel(/Dili Turkceye cevir|Switch language to English/)).toBeVisible();

    await page.getByTestId("header-buy-button").click();
    await expect(page.getByRole("dialog")).toContainText(/Bravita Multivitamin|Sepet|Cart/i);

    await page.getByTestId("cart-promo-input").fill("E2E10");
    await page.getByTestId("cart-apply-promo-button").click();
    await expect(page.getByText(/Promosyon kodu uygulandi|Promosyon kodu uygulandı|applied/i)).toBeVisible();

    await page.getByTestId("cart-checkout-button").click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole("heading", { name: /Teslimat Adresi|Delivery Address/i })).toBeVisible();

    await page.getByTestId("checkout-next-button").click();
    await expect(page.getByRole("heading", { name: /Odeme Yontemi|Ödeme Yöntemi|Payment Method/i })).toBeVisible();
    await page.getByRole("button", { name: /Havale|EFT|Bank transfer/i }).click();
    await expect(page.getByRole("heading", { name: /Banka Hesap Bilgileri|Bank Transfer Details/i })).toBeVisible();

    await page.getByTestId("checkout-next-button").click();
    await expect(page.getByRole("heading", { name: /Siparis Ozeti|Sipariş Özeti|Order Summary/i })).toBeVisible();
    await page.getByRole("checkbox").click();
    await page.getByTestId("checkout-confirm-order-button").click();

    await expect(page).toHaveURL(new RegExp(`/order-confirmation/${E2E_ORDER_ID}`));
    await expect(page.getByRole("heading", { name: /Siparişiniz Alındı|Siparisiniz Alindi|Order Received/i })).toBeVisible();

    for (const tab of ["profile", "addresses", "orders", "support", "settings"]) {
      await page.goto(`/profile?tab=${tab}`);
      await expect(page.locator("body")).not.toContainText(/Sipariş Bulunamadı|Sayfa Bulunamadı|Not Found/i);
    }
  });

  test("admin can open every protected admin workspace with mocked production-shaped data", async ({ page }) => {
    const adminRoutes = [
      "/admin",
      "/admin/orders",
      `/admin/orders/${E2E_ORDER_ID}`,
      "/admin/products",
      "/admin/promotions",
      "/admin/support",
      "/admin/emails",
      "/admin/admins",
      "/admin/logs",
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      await expect(page.locator("body")).not.toContainText(/Sayfa Bulunamadı|Not Found/i);
    }
  });
});

test("live Supabase admin-rpc is deployed and still rejects anonymous admin calls", async ({ request }) => {
  const env = { ...readDotEnv(), ...process.env };
  const supabaseUrl = String(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const anonKey = String(env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? "");

  test.skip(!supabaseUrl || !anonKey, "Supabase URL/anon key not configured for live smoke test.");

  const response = await request.post(`${supabaseUrl}/functions/v1/admin-rpc`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    data: {
      action: "getDashboardStats",
      startDate: "2026-05-01T00:00:00.000Z",
      endDate: "2026-05-06T23:59:59.999Z",
    },
  });

  expect([401, 403]).toContain(response.status());
});
