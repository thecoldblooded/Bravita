// Supabase and common error message translations
// Maps English error messages to i18n keys

const ERROR_MAP: Record<string, string> = {
    // Supabase Auth errors
    "Invalid login credentials": "errors.invalid_login_credentials",
    "Email not confirmed": "errors.email_not_confirmed",
    "User not found": "errors.user_not_found",
    "Invalid email or password": "errors.invalid_login_credentials",
    "User already registered": "errors.user_already_exists",
    "Email already registered": "errors.user_already_exists",
    "Signup requires a valid password": "errors.password_required",
    "Password should be at least 6 characters": "errors.password_min",
    "Unable to validate email address: invalid format": "errors.email_invalid",
    "Email rate limit exceeded": "errors.rate_limit_exceeded",
    "Password recovery requires an email": "errors.email_required",
    "New password should be different from the old password": "errors.password_same_as_old",
    "Auth session missing!": "errors.session_expired",
    "Token has expired or is invalid": "errors.token_expired",
    "For security purposes, you can only request this after": "errors.rate_limit_exceeded",

    // General errors
    "Network request failed": "errors.network_error",
    "Failed to fetch": "errors.network_error",
    "No user returned from signup": "errors.signup_failed",
    "Login failed": "errors.login_failed",
    "Signup failed": "errors.signup_failed",
    "Google signup failed": "errors.google_signup_failed",

    // Database errors
    "duplicate key value violates unique constraint": "errors.duplicate_entry",
    "violates foreign key constraint": "errors.invalid_reference",

    // Orders & Checkout
    "Insufficient stock": "errors.insufficient_stock",
    "Product not found": "errors.product_not_found",
    "Invalid promo code": "errors.invalid_promo_code",
    "Promo code expired": "errors.promo_code_expired",
    "Promo code limit reached": "errors.promo_code_limit_reached",
};

/**
 * Translates error messages using i18n
 * Falls back to original message if no translation found
 */
export function translateError(
    error: Error | string | null | undefined,
    t: (key: string) => string
): string {
    if (!error) return t("errors.unknown");

    const message = typeof error === "string" ? error : error.message;

    // Check for exact match
    if (ERROR_MAP[message]) {
        return t(ERROR_MAP[message]);
    }

    // Check for partial matches
    for (const [pattern, key] of Object.entries(ERROR_MAP)) {
        if (message.toLowerCase().includes(pattern.toLowerCase())) {
            return t(key);
        }
    }

    // Check if already translated (Turkish text)
    if (/[ığüşöçİĞÜŞÖÇ]/.test(message)) {
        return message;
    }

    // Return generic error for unknown English errors
    return t("errors.unknown");
}

/**
 * Gets the i18n key for an error message
 * Useful when you need just the key, not the translated string
 */
export function getErrorKey(error: Error | string | null | undefined): string {
    if (!error) return "errors.unknown";

    const message = typeof error === "string" ? error : error.message;

    if (ERROR_MAP[message]) {
        return ERROR_MAP[message];
    }

    for (const [pattern, key] of Object.entries(ERROR_MAP)) {
        if (message.toLowerCase().includes(pattern.toLowerCase())) {
            return key;
        }
    }

    return "errors.unknown";
}
