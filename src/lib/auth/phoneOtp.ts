import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
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
    const auth = getFirebaseAuth();

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

type VerifyFirebaseTokenApiResponse = {
    token?: string;
    error?: string;
};

const FIREBASE_PHONE_AUTH_ERROR_MESSAGES: Record<string, string> = {
    "auth/network-request-failed": "Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.",
    "auth/too-many-requests": "Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.",
    "auth/invalid-phone-number": "Geçersiz telefon numarası. Lütfen kontrol edip tekrar deneyin.",
    "auth/quota-exceeded": "SMS kotası doldu. Lütfen daha sonra tekrar deneyin.",
    "auth/captcha-check-failed": "reCAPTCHA doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin.",
    "auth/app-not-authorized": "Telefon doğrulaması bu alan adı için yetkili değil. Lütfen site yöneticisiyle iletişime geçin.",
    "auth/unauthorized-domain": "Telefon doğrulaması bu alan adı için yetkili değil. Lütfen site yöneticisiyle iletişime geçin.",
    "auth/missing-app-credential": "Telefon doğrulaması başlatılamadı. Sayfayı yenileyip tekrar deneyin.",
    "auth/invalid-app-credential": "Telefon doğrulaması başlatılamadı. Sayfayı yenileyip tekrar deneyin.",
    "auth/missing-client-identifier": "Telefon doğrulaması başlatılamadı. Sayfayı yenileyip tekrar deneyin.",
    "auth/operation-not-allowed": "Telefon ile doğrulama şu anda kapalı görünüyor. Lütfen site yöneticisiyle iletişime geçin.",
    "auth/billing-not-enabled": "SMS gönderimi için Firebase faturalandırması etkin değil. Lütfen site yöneticisiyle iletişime geçin.",
    "auth/web-storage-unsupported": "Tarayıcınız telefon doğrulaması için gerekli depolamayı desteklemiyor veya engelliyor.",
};

export const getFirebasePhoneAuthErrorMessage = (error: unknown): string => {
    const firebaseError = error as { code?: string; message?: string };
    const code = typeof firebaseError?.code === "string" ? firebaseError.code : "";

    if (code && FIREBASE_PHONE_AUTH_ERROR_MESSAGES[code]) {
        return FIREBASE_PHONE_AUTH_ERROR_MESSAGES[code];
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return "SMS gönderilemedi. Lütfen tekrar deneyin.";
};

export const getFirebaseOtpVerificationErrorKey = (error: unknown): string => {
    const firebaseError = error as { code?: string };
    const code = typeof firebaseError?.code === "string" ? firebaseError.code : "";

    if (code === "auth/invalid-verification-code") {
        return "auth.invalid_otp";
    }

    if (code === "auth/code-expired" || code === "auth/session-expired") {
        return "auth.code_expired";
    }

    if (code === "auth/too-many-requests") {
        return "auth.otp_too_many_attempts";
    }

    return "auth.verification_failed";
};

export const sendOtp = async (rawPhone: string, containerId: string = "recaptcha-container"): Promise<SendOtpResult> => {
    const phone = normalizePhone(rawPhone);
    const auth = getFirebaseAuth();

    if (typeof window !== "undefined" && isLocalhostHostname(window.location.hostname) && !shouldUseFirebasePhoneTestMode()) {
        throw createLocalhostPhoneAuthError();
    }

    if (shouldUseFirebasePhoneTestMode()) {
        auth.settings.appVerificationDisabledForTesting = false;
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

export const exchangeFirebasePhoneToken = async (firebaseToken: string, rawPhone: string): Promise<string> => {
    const phone = normalizePhone(rawPhone);

    const response = await fetch("/api/auth/verify-firebase-token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
            firebaseToken,
            phone,
        }),
    });

    const payload = await response.json().catch(() => null) as VerifyFirebaseTokenApiResponse | null;
    const token = typeof payload?.token === "string" ? payload.token.trim() : "";

    if (!response.ok || !token) {
        const message = typeof payload?.error === "string" && payload.error.trim().length > 0
            ? payload.error.trim()
            : "Telefon doğrulaması tamamlanamadı. Lütfen tekrar deneyin.";
        throw new Error(message);
    }

    return token;
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
        const auth = getFirebaseAuth();
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
    } catch {
        // ignore
    }
};

export { normalizePhone };
