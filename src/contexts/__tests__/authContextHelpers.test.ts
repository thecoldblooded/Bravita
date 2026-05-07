import {
  getInitialUserFromSession,
  hasAuthCallbackInUrl,
  normalizeSessionPhone,
} from "../authContextHelpers.ts";

const buildSession = (overrides: Record<string, unknown> = {}) => ({
  access_token: "token",
  refresh_token: "refresh",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "test@bravita.test",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-05-07T00:00:00.000Z",
    ...overrides,
  },
}) as never;

describe("normalizeSessionPhone", () => {
  it("geçerli telefonları artı ve rakam formatında normalize eder", () => {
    expect(normalizeSessionPhone("+90 (555) 111-22-33")).toBe("+905551112233");
  });

  it("artı ile başlamayan değerleri reddeder", () => {
    expect(normalizeSessionPhone("905551112233")).toBeNull();
  });

  it("string olmayan değerleri reddeder", () => {
    expect(normalizeSessionPhone(5551112233)).toBeNull();
  });
});

describe("hasAuthCallbackInUrl", () => {
  it("hash içindeki auth callback parametrelerini algılar", () => {
    expect(hasAuthCallbackInUrl({
      hash: "#access_token=e2e&type=signup",
      search: "",
    })).toBe(true);
  });

  it("query içindeki oauth code parametresini algılar", () => {
    expect(hasAuthCallbackInUrl({
      hash: "",
      search: "?code=oauth-code&type=recovery",
    })).toBe(true);
  });

  it("ilgili parametre yoksa false döner", () => {
    expect(hasAuthCallbackInUrl({
      hash: "#section=faq",
      search: "?tab=profile",
    })).toBe(false);
  });
});

describe("getInitialUserFromSession", () => {
  it("signed metadata yetkilerini ve telefon bilgisini stub kullanıcıya taşır", () => {
    const session = buildSession({
      app_metadata: { is_admin: true, is_superadmin: true },
      user_metadata: { full_name: "Bravita Admin", phone: "+90 555 111 22 33" },
      phone: "+90 555 999 88 77",
    });

    const user = getInitialUserFromSession(session);

    expect(user).not.toBeNull();
    expect(user?.is_admin).toBe(true);
    expect(user?.is_superadmin).toBe(true);
    expect(user?.phone).toBe("+905551112233");
    expect(user?.full_name).toBe("Bravita Admin");
    expect(user?.isStub).toBe(true);
  });

  it("session yoksa null döner", () => {
    expect(getInitialUserFromSession(null)).toBeNull();
  });
});
