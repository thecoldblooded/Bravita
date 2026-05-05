import { getFunctionAuthHeaders } from "@/lib/auth/functionAuth";

interface EdgeFunctionHeaderOptions {
    forceRefresh?: boolean;
}

export async function getEdgeFunctionHeaders(
    context: string,
    options: EdgeFunctionHeaderOptions = {},
): Promise<Record<string, string>> {
    const authHeaders = await getFunctionAuthHeaders(context, options);
    const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

    const headers: Record<string, string> = {
        ...authHeaders,
        ...(anonKey ? { apikey: anonKey } : {}),
    };

    if (!headers.Authorization && anonKey) {
        headers.Authorization = `Bearer ${anonKey}`;
    }

    return headers;
}

