import {
    buildBillionMailContactFromProfile,
    shouldSyncCompletedProfileToBillionMail,
} from "../email/billionmailSync";

describe("shouldSyncCompletedProfileToBillionMail", () => {
    it("profil ilk kez complete olduğunda senkronu etkinleştirir", () => {
        const shouldSync = shouldSyncCompletedProfileToBillionMail({
            email: "yeni@example.com",
            profile_complete: true,
            previous_profile_complete: false,
        });

        expect(shouldSync).toBe(true);
    });

    it("profil henüz complete değilse senkron başlatmaz", () => {
        const shouldSync = shouldSyncCompletedProfileToBillionMail({
            email: "beklemede@example.com",
            profile_complete: false,
            previous_profile_complete: false,
        });

        expect(shouldSync).toBe(false);
    });

    it("zaten complete olan profil için tekrar senkron başlatmaz", () => {
        const shouldSync = shouldSyncCompletedProfileToBillionMail({
            email: "mevcut@example.com",
            profile_complete: true,
            previous_profile_complete: true,
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
