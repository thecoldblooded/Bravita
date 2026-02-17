import { getSessionSafe } from "@/lib/supabase";

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Builds auth headers for Edge Function calls:
 * - Prefer session access token in Authorization when available.
 * - Keep x-user-jwt for backward compatibility with existing function auth extraction.
 * - Fallback to anon Authorization only when user session is absent.
 */
export async function getFunctionAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    const { data } = await getSessionSafe();
    const accessToken = data?.session?.access_token;

    if (accessToken && accessToken.length > 0) {
        headers.Authorization = `Bearer ${accessToken}`;
        headers["x-user-jwt"] = accessToken;
        return headers;
    }

    if (anonKey && anonKey.length > 0) {
        headers.Authorization = `Bearer ${anonKey}`;
    }

    return headers;
}
