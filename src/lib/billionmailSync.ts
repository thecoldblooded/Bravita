import type { UserProfile } from "./supabase";

type CompletedProfileSyncCandidate = {
    email?: string | null;
    profile_complete?: boolean | null;
    previous_profile_complete?: boolean | null;
};

type BillionMailContactPayload = {
    email: string;
    first_name?: string;
    last_name?: string;
    attributes: {
        user_type: UserProfile["user_type"];
        company_name: UserProfile["company_name"];
        phone: UserProfile["phone"];
    };
    tags: [string, UserProfile["user_type"]];
};

const normalizeEmail = (value: string | null | undefined): string | null => {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.includes("@") ? normalized : null;
};

const splitName = (fullName: string | null | undefined): { firstName?: string; lastName?: string } => {
    if (typeof fullName !== "string") {
        return {};
    }

    const parts = fullName
        .split(" ")
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return {};
    }

    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(" ") || undefined,
    };
};

export function shouldSyncCompletedProfileToBillionMail(
    candidate: CompletedProfileSyncCandidate,
): boolean {
    if (!normalizeEmail(candidate.email)) {
        return false;
    }

    if (candidate.profile_complete !== true) {
        return false;
    }

    return candidate.previous_profile_complete !== true;
}

export function buildBillionMailContactFromProfile(
    profile: Pick<UserProfile, "email" | "full_name" | "phone" | "user_type" | "company_name">,
): BillionMailContactPayload {
    const normalizedEmail = normalizeEmail(profile.email);
    if (!normalizedEmail) {
        throw new Error("BillionMail contact email is required");
    }

    const { firstName, lastName } = splitName(profile.full_name);

    return {
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        attributes: {
            user_type: profile.user_type,
            company_name: profile.company_name,
            phone: profile.phone,
        },
        tags: ["website_signup", profile.user_type],
    };
}
