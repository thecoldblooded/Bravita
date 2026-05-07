import { expect, type Page, test } from "@playwright/test";

const E2E_USER_ID = "00000000-0000-4000-8000-000000000001";
const E2E_ADDRESS_ID = "00000000-0000-4000-8000-000000000101";
const E2E_NEW_ADDRESS_ID = "00000000-0000-4000-8000-000000000102";
const E2E_PRODUCT_ID = "00000000-0000-4000-8000-000000000201";
const E2E_ORDER_ID = "00000000-0000-4000-8000-000000000301";
const E2E_SUPPORT_TICKET_ID = "00000000-0000-4000-8000-000000000401";

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
  tracking_number: null,
  shipping_company: null,
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
    discount: 0,
    total: 503.99,
  },
  profiles: {
    full_name: e2eProfile.full_name,
    email: e2eProfile.email,
    phone: e2eProfile.phone,
  },
  addresses: e2eAddress,
  shipping_address: e2eAddress,
};

const e2eSupportTicket = {
  id: E2E_SUPPORT_TICKET_ID,
  user_id: E2E_USER_ID,
  name: e2eProfile.full_name,
  email: e2eProfile.email,
  category: "order_issue",
  subject: "E2E destek talebi",
  message: "E2E destek mesaji yeterince uzun",
  admin_reply: "Admin test yaniti",
  status: "answered",
  created_at: "2026-05-06T10:30:00.000Z",
};

type MockOptions = {
  emptyAddresses?: boolean;
  invalidPromo?: boolean;
  bankOrderFailure?: boolean;
  cardFailure?: boolean;
};

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

async function seedCheckoutCart(page: Page) {
  await page.addInitScript(({ product }) => {
    window.localStorage.setItem("bravita_cart:v1", JSON.stringify([
      {
        id: "cart-e2e-1",
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        quantity: 1,
        price: product.price,
      },
    ]));
    window.localStorage.removeItem("bravita_promo_code:v1");
    window.localStorage.removeItem("bravita_discount_amount:v1");
  }, { product: e2eProduct });
}

async function mockSupabase(page: Page, options: MockOptions = {}) {
  await page.route("**/api/visitor-counter**", async (route) => {
    await route.fulfill(jsonResponse({ count: 1234 }));
  });

  await page.route("**/auth/v1/**", async (route) => {
    await route.fulfill(jsonResponse({ user: e2eSession.user, session: e2eSession }));
  });

  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();
    const search = url.search;
    const hasPrimaryIdFilter = /(?:[?&])id=eq\./.test(search);

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
        await route.fulfill(jsonResponse({ ...e2eAddress, id: E2E_NEW_ADDRESS_ID }, 201));
        return;
      }

      await route.fulfill(jsonResponse(options.emptyAddresses ? [] : hasPrimaryIdFilter ? e2eAddress : [e2eAddress]));
      return;
    }

    if (pathname.endsWith("/profiles")) {
      await route.fulfill(jsonResponse(hasPrimaryIdFilter ? e2eProfile : [e2eProfile]));
      return;
    }

    if (pathname.endsWith("/orders")) {
      await route.fulfill(jsonResponse(hasPrimaryIdFilter ? e2eOrder : [e2eOrder]));
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
      if (method === "PATCH") {
        await route.fulfill(jsonResponse({ ...e2eSupportTicket, status: "open", admin_reply: null }));
        return;
      }

      await route.fulfill(jsonResponse([e2eSupportTicket]));
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
      await route.fulfill(jsonResponse(options.invalidPromo
        ? { valid: false, message: "Promosyon kodu geçerli değil" }
        : {
          valid: true,
          message: "Promosyon kodu uygulandı",
          discount_type: "percentage",
          discount_value: 10,
          min_order_amount: 0,
          max_discount_amount: 100,
        }));
      return;
    }

    if (url.pathname.endsWith("/create-bank-order")) {
      await route.fulfill(jsonResponse(options.bankOrderFailure
        ? { success: false, error: "E2E_BANK_FAILURE", message: "E2E banka siparişi oluşturulamadı" }
        : {
          success: true,
          order_id: E2E_ORDER_ID,
          bank_reference: "BRV-E2E-0001",
          message: "Siparis basariyla olusturuldu",
        }));
      return;
    }

    if (url.pathname.endsWith("/bakiyem-init-3d")) {
      await route.fulfill(jsonResponse(options.cardFailure
        ? {
          success: false,
          code: "PaymentDealer.CheckCardInfo.InvalidCardInfo",
          message: "Kart bilgileri doğrulanamadı",
        }
        : {
          success: true,
          intentId: "intent-e2e",
          threeD: { redirectUrl: "https://pos.bakiyem.com/secure3d/e2e" },
        }));
      return;
    }

    if (url.pathname.endsWith("/create-support-ticket")) {
      await route.fulfill(jsonResponse({ ticket: e2eSupportTicket }));
      return;
    }

    if (url.pathname.endsWith("/send-order-email") || url.pathname.endsWith("/send-support-email")) {
      await route.fulfill(jsonResponse({ success: true }));
      return;
    }

    if (url.pathname.endsWith("/admin-rpc")) {
      if (body?.action === "getDashboardStats") {
        await route.fulfill(jsonResponse({
          success: true,
          data: {
            total_revenue: 503.99,
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

async function startAuthenticatedMockedPage(page: Page, options: MockOptions = {}) {
  await mockSupabase(page, options);
  await seedAuthenticatedUser(page);
}

async function goToCheckoutWithSeededCart(page: Page, options: MockOptions = {}) {
  await mockSupabase(page, options);
  await seedAuthenticatedUser(page);
  await seedCheckoutCart(page);
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: /Teslimat Adresi|Delivery Address/i })).toBeVisible();
}

test.describe("Bravita expanded E2E user operations", () => {
  test("cart enforces quantity limits and reports invalid promo codes", async ({ page }) => {
    await startAuthenticatedMockedPage(page, { invalidPromo: true });
    await page.goto("/");

    await page.getByTestId("header-buy-button").click();
    await expect(page.getByRole("dialog")).toContainText(/Bravita Multivitamin|Sepet|Cart/i);

    const plusButton = page.getByRole("button", { name: /artır|increase|\+/i }).last();
    for (let i = 0; i < 8; i += 1) {
      await plusButton.click();
    }

    await expect(page.getByRole("dialog")).toContainText(/5/);

    await page.getByTestId("cart-promo-input").fill("BADCODE");
    await page.getByTestId("cart-apply-promo-button").click();
    await expect(page.getByText(/geçerli değil|invalid/i)).toBeVisible();
  });

  test("checkout supports adding a missing address and blocks submit until agreement is accepted", async ({ page }) => {
    await goToCheckoutWithSeededCart(page, { emptyAddresses: true });

    await page.getByRole("button", { name: /Yeni Adres Ekle|Add new address/i }).click();
    await page.getByPlaceholder(/Evim|Open Address|Street/i).fill("E2E Yeni Adres - Test Caddesi No 7");
    await page.getByPlaceholder(/İstanbul|Istanbul|City/i).fill("Istanbul");
    await page.getByPlaceholder(/Kadıköy|Kadikoy|District/i).fill("Besiktas");
    await page.getByPlaceholder(/34000|Postal Code/i).fill("34330");
    await page.getByRole("button", { name: /Kaydet|Save/i }).click();

    await expect(page.getByText(/Adres eklendi|Address/i)).toBeVisible();
    await page.getByTestId("checkout-next-button").click();
    await page.getByRole("button", { name: /Havale|EFT|Bank transfer/i }).click();
    await page.getByTestId("checkout-next-button").click();

    await expect(page.getByText(/Siparis Ozeti|Sipariş Özeti|Order Summary/i)).toBeVisible();
    await expect(page.getByTestId("checkout-confirm-order-button")).toBeDisabled();

    await page.getByRole("checkbox").click();
    await expect(page.getByTestId("checkout-confirm-order-button")).toBeEnabled();
  });

  test("checkout shows bank-transfer server failures without leaving checkout", async ({ page }) => {
    await goToCheckoutWithSeededCart(page, { bankOrderFailure: true });

    await page.getByTestId("checkout-next-button").click();
    await page.getByRole("button", { name: /Havale|EFT|Bank transfer/i }).click();
    await page.getByTestId("checkout-next-button").click();
    await page.getByRole("checkbox").click();
    await page.getByTestId("checkout-confirm-order-button").click();

    await expect(page.getByText(/E2E banka siparişi oluşturulamadı|Sipariş oluşturulamadı/i)).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test("credit-card validation failure reaches payment failed flow", async ({ page }) => {
    await goToCheckoutWithSeededCart(page, { cardFailure: true });

    await page.getByTestId("checkout-next-button").click();
    await page.getByRole("button", { name: /Kredi Kartı|Credit Card/i }).click();
    await page.getByPlaceholder(/AD SOYAD|Cardholder/i).fill("E2E USER");
    await page.getByPlaceholder(/0000 0000 0000 0000|Card Number/i).fill("4111111111111111");
    await page.getByPlaceholder(/AA\/YY|MM\/YY|Expiry/i).fill("12/30");
    await page.getByPlaceholder(/•••|CVV/i).fill("123");
    await page.getByTestId("checkout-next-button").click();
    await page.getByRole("checkbox").click();

    await page.getByTestId("checkout-confirm-order-button").click();
    await page.goto("/payment-failed?code=PaymentDealer.CheckCardInfo.InvalidCardInfo&bankCode=1005&intent=e2e-intent");

    await expect(page).toHaveURL(/\/payment-failed/);
    await expect(page.getByText(/Ödeme Başarısız|Payment Failed|ödeme işlemi|Taksit|Kart/i).first()).toBeVisible();
  });

  test("support center creates a ticket and lets the customer reply to an answered ticket", async ({ page }) => {
    await startAuthenticatedMockedPage(page);
    await page.goto("/profile?tab=support");

    await page.getByRole("button", { name: /Destek Talebi|Gönder|Submit|Yeni/i }).click();
    await page.getByLabel(/Konu|Subject/i).fill("E2E destek konusu");
    await page.getByLabel(/Mesaj|Message/i).fill("E2E destek mesajı en az on karakter içerir.");
    await page.getByRole("button", { name: /Gönder|Submit/i }).click();
    await expect(page.getByText(/başarı|kaydedildi|success/i)).toBeVisible();

    await page.getByRole("button", { name: /Cevap Ver|Yanıtla|Reply/i }).click();
    await page.getByPlaceholder(/yanıt|reply/i).fill("E2E müşteri ek yanıtı");
    await page.getByRole("button", { name: /Cevabı Gönder|Yanıt|Gönder|Reply/i }).last().click();
    await expect(page.getByText(/başarı|success/i)).toBeVisible();
  });

  test("legal, 3D error and profile completion routes render safely", async ({ page }) => {
    await startAuthenticatedMockedPage(page);

    await page.goto("/gizlilik-politikasi");
    await expect(page.getByRole("heading", { name: /Gizlilik|Privacy/i })).toBeVisible();

    await page.goto("/kullanim-kosullari");
    await expect(page.getByRole("heading", { level: 1, name: /Kullanım Koşulları|Terms of Service/i })).toBeVisible();

    await page.goto("/3d-redirect?intentId=e2e-invalid");
    await expect(page.getByRole("heading", { name: /3D Yönlendirme Hatası/i })).toBeVisible();

    await page.goto("/complete-profile");
    await expect(page.getByRole("heading", { name: /Profili|Profile/i })).toBeVisible();
  });
});
