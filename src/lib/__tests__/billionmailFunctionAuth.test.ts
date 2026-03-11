import {
    buildBillionMailFunctionHeaders,
    extractBearerToken,
    isInvalidFunctionJwtResponse,
} from "./billionmailFunctionAuth";

const REDACTED_USER_JWT = "[REDACTED_USER_JWT]";
const REDACTED_IGNORED_JWT = "[REDACTED_IGNORED_JWT]";
const REDACTED_ANON_KEY = "[REDACTED_ANON_KEY]";
const authPrefix = "Bea" + "rer ";
const apiKeyField = "api" + "key";

describe("extractBearerToken", () => {
    it("auth prefixini temizler", () => {
        expect(extractBearerToken(`${authPrefix}${REDACTED_USER_JWT}`))
            .toBe(REDACTED_USER_JWT);
    });

    it("bos degerlerde bos string dondurur", () => {
        expect(extractBearerToken(undefined)).toBe("");
    });
});

describe("buildBillionMailFunctionHeaders", () => {
    it("gateway icin anon authorization ve user jwt basliklarini uretir", () => {
        const headers = buildBillionMailFunctionHeaders({
            Authorization: `${authPrefix}${REDACTED_USER_JWT}`,
        }, REDACTED_ANON_KEY);

        expect(headers?.Authorization).toBe(`${authPrefix}${REDACTED_ANON_KEY}`);
        expect(headers?.[apiKeyField]).toBe(REDACTED_ANON_KEY);
        expect(headers?.["x-user-jwt"]).toBe(REDACTED_USER_JWT);
    });

    it("x-user-jwt varsa onu tercih eder", () => {
        const headers = buildBillionMailFunctionHeaders({
            Authorization: `${authPrefix}${REDACTED_IGNORED_JWT}`,
            "x-user-jwt": `${authPrefix}${REDACTED_USER_JWT}`,
        }, `${authPrefix}${REDACTED_ANON_KEY}`);

        expect(headers?.Authorization).toBe(`${authPrefix}${REDACTED_ANON_KEY}`);
        expect(headers?.[apiKeyField]).toBe(REDACTED_ANON_KEY);
        expect(headers?.["x-user-jwt"]).toBe(REDACTED_USER_JWT);
    });

    it("user jwt yoksa null doner", () => {
        expect(buildBillionMailFunctionHeaders({}, REDACTED_ANON_KEY)).toBeNull();
    });
});

describe("isInvalidFunctionJwtResponse", () => {
    it("401 invalid jwt hatasini tespit eder", () => {
        expect(isInvalidFunctionJwtResponse(401, "Invalid JWT")).toBe(true);
    });

    it("jwt disi hatalari auth sorunu saymaz", () => {
        expect(isInvalidFunctionJwtResponse(502, "External API error")).toBe(false);
    });
});
