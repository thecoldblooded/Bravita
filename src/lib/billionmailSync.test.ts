import {
    buildBillionMailContactFromProfile,
    shouldSyncConfirmedSignupToBillionMail,
} from "./billionmailSync";

describe("shouldSyncConfirmedSignupToBillionMail", () => {
    it("yeni doğrulanmış kayıt için senkronu etkinleştirir", () => {
        const shouldSync = shouldSyncConfirmedSignupToBillionMail({
            email: "yeni@example.com",
            email_confirmed_at: "2026-03-08T10:05:00.000Z",
            last_sign_in_at: "2026-03-08T10:05:25.000Z",
        });

        expect(shouldSync).toBe(true);
    });

    it("eski kullanıcı girişlerinde geçmişe dönük senkron başlatmaz", () => {
        const shouldSync = shouldSyncConfirmedSignupToBillionMail({
            email: "mevcut@example.com",
            email_confirmed_at: "2026-02-01T09:00:00.000Z",
            last_sign_in_at: "2026-03-08T10:05:25.000Z",
        });

        expect(shouldSync).toBe(false);
    });

    it("e-posta doğrulanmamışsa senkron başlatmaz", () => {
        const shouldSync = shouldSyncConfirmedSignupToBillionMail({
            email: "beklemede@example.com",
            email_confirmed_at: null,
            last_sign_in_at: "2026-03-08T10:05:25.000Z",
        });

        expect(shouldSync).toBe(false);
    });
});

describe("buildBillionMailContactFromProfile", () => {
    it("profili BillionMail abone payloadına dönüştürür", () => {
        const contact = buildBillionMailContactFromProfile({
            email: "uye@example.com",
            full_name: "Ada Lovelace",
            phone: "+905551112233",
            user_type: "individual",
            company_name: null,
        });

        expect(contact).toEqual({
            email: "uye@example.com",
            first_name: "Ada",
            last_name: "Lovelace",
            attributes: {
                user_type: "individual",
                company_name: null,
                phone: "+905551112233",
            },
            tags: ["website_signup", "individual"],
        });
    });
});
