// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
    "https://bravita.com.tr",
    "https://www.bravita.com.tr",
    "https://bravita.vercel.app",
];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BILLIONMAIL_API_URL = Deno.env.get("BILLIONMAIL_API_URL");
const BILLIONMAIL_API_KEY = Deno.env.get("BILLIONMAIL_API_KEY");

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_REQUESTS = 5;

function getCorsHeaders(req: Request) {
    const origin = req.headers.get("Origin") || "";
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
}

function jsonResponse(req: Request, payload: unknown, status: number) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
}

function normalizeEmail(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) return null;
    return normalized;
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: getCorsHeaders(req) });
    }

    if (req.method !== "POST") {
        return jsonResponse(req, { success: false, error: "Method not allowed" }, 405);
    }

    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !BILLIONMAIL_API_URL || !BILLIONMAIL_API_KEY) {
            console.error("Missing required environment variables for sync-to-billionmail");
            return jsonResponse(req, { success: false, error: "Server configuration error" }, 500);
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return jsonResponse(req, { success: false, error: "Unauthorized" }, 401);
        }

        const authToken = authHeader.replace("Bearer ", "");
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: authData, error: authError } = await supabase.auth.getUser(authToken);

        if (authError || !authData?.user) {
            return jsonResponse(req, { success: false, error: "Unauthorized" }, 401);
        }

        const user = authData.user;
        const userEmail = normalizeEmail(user.email);
        if (!userEmail) {
            return jsonResponse(req, { success: false, error: "User email is missing" }, 400);
        }

        let body: { contact?: { email?: string } };
        try {
            body = await req.json();
        } catch {
            return jsonResponse(req, { success: false, error: "Invalid JSON body" }, 400);
        }

        const contactEmail = normalizeEmail(body?.contact?.email);
        if (!contactEmail) {
            return jsonResponse(req, { success: false, error: "contact.email is required" }, 400);
        }

        // Prevent syncing arbitrary third-party emails from the client
        if (contactEmail !== userEmail) {
            return jsonResponse(req, { success: false, error: "Forbidden" }, 403);
        }

        // Server-side rate limit per user
        const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
        const { data: recentAttempts, error: rateLimitError } = await supabase
            .from("integration_rate_limits")
            .select("id")
            .eq("integration_name", "billionmail")
            .eq("action", "sync_contact")
            .eq("actor_id", user.id)
            .gt("created_at", windowStart)
            .limit(RATE_LIMIT_MAX_REQUESTS);

        if (rateLimitError) {
            console.error("Rate limit lookup error:", rateLimitError.message);
        }

        if (recentAttempts && recentAttempts.length >= RATE_LIMIT_MAX_REQUESTS) {
            return jsonResponse(req, { success: false, error: "Too many requests, try again later" }, 429);
        }

        await supabase.from("integration_rate_limits").insert({
            integration_name: "billionmail",
            action: "sync_contact",
            actor_id: user.id,
            actor_email: userEmail,
        });

        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${BILLIONMAIL_API_KEY}`,
        };

        // 1. Find target group
        const searchUrl = `${BILLIONMAIL_API_URL}/contact/group/all?keyword=Smarter_Signup`;
        const groupsResponse = await fetch(searchUrl, { headers });
        if (!groupsResponse.ok) {
            return jsonResponse(req, { success: false, error: "External API error (group lookup)" }, 502);
        }

        const groupsText = await groupsResponse.text();
        let groupsData: any;
        try {
            groupsData = JSON.parse(groupsText);
        } catch {
            return jsonResponse(req, { success: false, error: "External API invalid JSON (group lookup)" }, 502);
        }

        if (groupsData.success === false) {
            return jsonResponse(req, { success: false, error: "External API rejected group lookup" }, 502);
        }

        const groupList = (groupsData.data?.list || []) as Array<{ id: string; name: string }>;
        const group = groupList.find((g) => g.name === "Smarter_Signup");
        if (!group) {
            return jsonResponse(req, { success: false, error: "BillionMail target group not found" }, 502);
        }

        // 2. Import contact
        const importPayload = {
            group_ids: [group.id],
            contacts: contactEmail,
            import_type: 2,
            default_active: 1,
            status: 1,
            overwrite: 1,
        };

        const importResponse = await fetch(`${BILLIONMAIL_API_URL}/contact/group/import`, {
            method: "POST",
            headers,
            body: JSON.stringify(importPayload),
        });

        if (!importResponse.ok) {
            return jsonResponse(req, { success: false, error: "External API error (contact import)" }, 502);
        }

        const importText = await importResponse.text();
        let importData: any;
        try {
            importData = JSON.parse(importText);
        } catch {
            return jsonResponse(req, { success: false, error: "External API invalid JSON (contact import)" }, 502);
        }

        if (importData.success === false) {
            return jsonResponse(req, { success: false, error: "External API rejected contact import" }, 502);
        }

        return jsonResponse(req, { success: true }, 200);
    } catch (error: unknown) {
        console.error("Unhandled exception in sync-to-billionmail:", error);
        return jsonResponse(req, { success: false, error: "Internal server error" }, 500);
    }
});
