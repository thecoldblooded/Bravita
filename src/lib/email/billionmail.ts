import { getFunctionAuthHeaders } from "@/lib/auth/functionAuth";
import { buildBillionMailFunctionHeaders, isInvalidFunctionJwtResponse } from "./billionmailFunctionAuth";

interface BillionMailContact {
    email: string;
    first_name?: string;
    last_name?: string;
    attributes?: Record<string, unknown>;
    tags?: string[];
}

type BillionMailInvokePayload = {
    success?: boolean;
    error?: string;
    message?: string;
    code?: string;
};

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

async function parseFunctionResponse(response: Response): Promise<{ data: BillionMailInvokePayload | null; text: string }> {
    const text = await response.text().catch(() => "");

    if (!text.trim()) {
        return { data: null, text: "" };
    }

    try {
        return {
            data: JSON.parse(text) as BillionMailInvokePayload,
            text,
        };
    } catch {
        return {
            data: null,
            text,
        };
    }
}

async function invokeSyncToBillionMail(contact: BillionMailContact, headers: Record<string, string>) {
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-to-billionmail`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        body: JSON.stringify({ contact }),
    });

    const parsed = await parseFunctionResponse(response);
    return {
        response,
        ...parsed,
    };
}

class BillionMailService {
    /**
     * Syncs a contact to BillionMail via Supabase Edge Function to avoid CORS and hide API keys.
     */
    async subscribeContact(contact: BillionMailContact) {
        if (!supabaseUrl || !supabaseAnonKey) {
            console.error("BillionMail: Supabase function configuration missing.");
            return null;
        }

        try {
            let authHeaders = await getFunctionAuthHeaders("billionmail:subscribeContact");
            let functionHeaders = buildBillionMailFunctionHeaders(authHeaders, supabaseAnonKey);

            if (!functionHeaders) {
                console.error("BillionMail: Missing user JWT for function invocation.");
                return null;
            }

            let result = await invokeSyncToBillionMail(contact, functionHeaders);
            const firstErrorMessage = result.data?.message ?? result.data?.error ?? result.text;

            if (!result.response.ok && isInvalidFunctionJwtResponse(result.response.status, firstErrorMessage)) {
                authHeaders = await getFunctionAuthHeaders("billionmail:subscribeContact:retry", { forceRefresh: true });
                functionHeaders = buildBillionMailFunctionHeaders(authHeaders, supabaseAnonKey);

                if (!functionHeaders) {
                    console.error("BillionMail: Retry failed to resolve function auth headers.");
                    return null;
                }

                result = await invokeSyncToBillionMail(contact, functionHeaders);
            }

            if (!result.response.ok) {
                console.error(
                    "BillionMail: Edge Function returned error.",
                    result.response.status,
                    result.data?.message ?? result.data?.error ?? result.text,
                );
                return null;
            }

            return result.data ?? { success: true };
        } catch (error) {
            console.error("BillionMail: Sync failed.", error);
            // Non-blocking for the user
            return null;
        }
    }

    /**
     * Sends a transactional email via BillionMail.
     * In the future, this can also be moved to an Edge Function for security.
     */
    async sendTransactionalEmail(templateId: string, recipient: string, params: Record<string, unknown> = {}) {
        void templateId;
        void recipient;
        void params;
        return null;
    }
}

export const billionMail = new BillionMailService();
