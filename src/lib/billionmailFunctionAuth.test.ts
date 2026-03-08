import {
    buildBillionMailFunctionHeaders,
    extractBearerToken,
    isInvalidFunctionJwtResponse,
} from "./billionmailFunctionAuth";

describe("extractBearerToken", () => {
    it("Bearer prefixini temizler", () => {
        expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    });

    it("bos degerlerde bos string dondurur", () => {
        expect(extractBearerToken(undefined)).toBe("");
    });
});

describe("buildBillionMailFunctionHeaders", () => {
    it("gateway icin anon Authorization ve user jwt basliklarini uretir", () => {
        const headers = buildBillionMailFunctionHeaders({
            Authorization: "Bearer user.jwt.token",
        }, "anon.jwt.token");

        expect(headers).toEqual({
            Authorization: "Bearer anon.jwt.token",
            apikey: "anon.jwt.token",
            "x-user-jwt": "user.jwt.token",
        });
    });

    it("x-user-jwt varsa onu tercih eder", () => {
        const headers = buildBillionMailFunctionHeaders({
            Authorization: "Bearer ignored.jwt.token",
            "x-user-jwt": "Bearer user.jwt.token",
        }, "Bearer anon.jwt.token");

        expect(headers).toEqual({
            Authorization: "Bearer anon.jwt.token",
            apikey: "anon.jwt.token",
            "x-user-jwt": "user.jwt.token",
        });
    });

    it("user jwt yoksa null doner", () => {
        expect(buildBillionMailFunctionHeaders({}, "anon.jwt.token")).toBeNull();
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
