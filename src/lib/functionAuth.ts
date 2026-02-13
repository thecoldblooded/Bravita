import { getSessionSafe } from "@/lib/supabase";

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Builds a stable header set for Edge Function calls:
 * - Authorization stays on anon key to avoid gateway JWT mismatch issues.
 * - User session token is forwarded via x-user-jwt for function-level auth.
 */
export async function getFunctionAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    if (anonKey && anonKey.length > 0) {
        headers.Authorization = `Bearer ${anonKey}`;
    }

    const { data } = await getSessionSafe();
    const accessToken = data?.session?.access_token;
    if (accessToken) {
        headers["x-user-jwt"] = accessToken;
    }

    return headers;
}
