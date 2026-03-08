import type { UserProfile } from "./supabase";

const RECENT_SIGNUP_SYNC_WINDOW_MS = 15 * 60 * 1000;

type ConfirmedSignupSyncCandidate = {
    email?: string | null;
    email_confirmed_at?: string | null;
    last_sign_in_at?: string | null;
    created_at?: string | null;
    isNewSignupIntent?: boolean;
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

const toTimestamp = (value: string | null | undefined): number | null => {
    if (typeof value !== "string" || value.trim().length === 0) {
        return null;
    }

    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
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

export function shouldSyncConfirmedSignupToBillionMail(
    candidate: ConfirmedSignupSyncCandidate,
): boolean {
    if (!normalizeEmail(candidate.email)) {
        return false;
    }

    const emailConfirmedAt = toTimestamp(candidate.email_confirmed_at);
    if (emailConfirmedAt === null) {
        return false;
    }

    if (candidate.isNewSignupIntent) {
        return true;
    }

    const lastSignInAt = toTimestamp(candidate.last_sign_in_at);
    if (lastSignInAt === null) {
        return false;
    }

    const firstConfirmedSession = Math.abs(lastSignInAt - emailConfirmedAt) <= RECENT_SIGNUP_SYNC_WINDOW_MS;

    return firstConfirmedSession;
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
