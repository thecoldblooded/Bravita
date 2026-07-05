import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isLocalhostHostname } from "@/lib/captcha";

let recaptchaVerifier: RecaptchaVerifier | null = null;

function shouldUseFirebasePhoneTestMode(): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    if (!isLocalhostHostname(window.location.hostname)) {
        return false;
    }

    return String(import.meta.env.VITE_FIREBASE_PHONE_TEST_MODE ?? "false").toLowerCase() === "true";
}

function createLocalhostPhoneAuthError(): Error {
    const error = new Error(
        "Firebase telefon doğrulaması localhost üzerinde gerçek SMS ile çalışmaz. Firebase Console'da test telefon numarası tanımlayın, uygulamayı yetkili bir domain üzerinden açın ya da geliştirme için VITE_FIREBASE_PHONE_TEST_MODE=true kullanın.",
    ) as Error & { code?: string };

    error.code = "auth/localhost-phone-auth-not-supported";
    return error;
}

const getVerifier = (containerId: string = "recaptcha-container"): RecaptchaVerifier => {
    if (recaptchaVerifier) {
        try {
            recaptchaVerifier.clear();
        } catch {
            // ignore
        }
    }

    const el = typeof document !== "undefined" ? document.getElementById(containerId) : null;
    if (!el && typeof document !== "undefined") {
        const created = document.createElement("div");
        created.id = containerId;
        document.body.appendChild(created);
    }

    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: "invisible",
        callback: () => {
            // reCAPTCHA solved
        },
        "expired-callback": () => {
            // reset
        },
    });

    return recaptchaVerifier;
};

const normalizePhone = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) {
        return "";
    }

    const digits = trimmed.replace(/[^\d+]/g, "");
    if (!digits || digits === "+") {
        return "";
    }

    if (digits.startsWith("+")) return digits;
    if (digits.startsWith("00")) return "+" + digits.slice(2);
    if (digits.startsWith("90")) return "+" + digits;
    if (digits.startsWith("0")) return "+90" + digits.slice(1);
    return "+90" + digits;
};

export const arePhoneNumbersEquivalent = (left: string, right: string): boolean => {
    const normalizedLeft = normalizePhone(left);
    const normalizedRight = normalizePhone(right);

    if (!normalizedLeft && !normalizedRight) {
        return true;
    }

    return normalizedLeft === normalizedRight;
};

export type SendOtpResult = {
    confirmationResult: ConfirmationResult;
    phone: string;
};

export type VerifyOtpResult = {
    user: User;
    idToken: string;
    phone: string;
};

export const sendOtp = async (rawPhone: string, containerId: string = "recaptcha-container"): Promise<SendOtpResult> => {
    const phone = normalizePhone(rawPhone);

    if (typeof window !== "undefined" && isLocalhostHostname(window.location.hostname) && !shouldUseFirebasePhoneTestMode()) {
        throw createLocalhostPhoneAuthError();
    }

    if (shouldUseFirebasePhoneTestMode()) {
        auth.settings.appVerificationDisabledForTesting = true;
    }

    const verifier = getVerifier(containerId);
    verifier.render().catch(() => { });

    const confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
    return { confirmationResult, phone };
};

export const verifyOtp = async (confirmationResult: ConfirmationResult, code: string): Promise<VerifyOtpResult> => {
    const result = await confirmationResult.confirm(code);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken, phone: result.user.phoneNumber ?? "" };
};

export const changePhoneWithOtp = async (newRawPhone: string): Promise<SendOtpResult> => {
    // For changing phone on existing user. Production: requires fresh re-auth + admin SDK.
    return sendOtp(newRawPhone, "recaptcha-container");
};

export const confirmPhoneChange = async (confirmationResult: ConfirmationResult, code: string, isNewUser: boolean): Promise<VerifyOtpResult> => {
    const result = await confirmationResult.confirm(code);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken, phone: result.user.phoneNumber ?? "" };
};

export const resetRecaptcha = (): void => {
    if (recaptchaVerifier) {
        try {
            recaptchaVerifier.clear();
        } catch {
            // ignore
        }
        recaptchaVerifier = null;
    }
};

export const signOutFirebase = async (): Promise<void> => {
    try {
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
    } catch {
        // ignore
    }
};

export { normalizePhone };
