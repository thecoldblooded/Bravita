import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ALLOWED_ORIGINS = [
    'https://bravita.com.tr',
    'https://www.bravita.com.tr',
];

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('Origin') || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsHeaders(req) })
    }

    try {
        const body = await req.json();
        const { contact } = body;

        const BILLIONMAIL_API_URL = Deno.env.get('BILLIONMAIL_API_URL')
        const BILLIONMAIL_API_KEY = Deno.env.get('BILLIONMAIL_API_KEY')

        if (!BILLIONMAIL_API_URL || !BILLIONMAIL_API_KEY) {
            console.error("Configuration Missing in Supabase Secrets");
            return new Response(JSON.stringify({
                success: false,
                error: 'Server Configuration Error'
            }), {
                status: 200,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
            })
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${BILLIONMAIL_API_KEY}`,
        }

        // 1. Get Group ID
        console.log("Searching Group: Smarter_Signup...");
        const searchUrl = `${BILLIONMAIL_API_URL}/contact/group/all?keyword=Smarter_Signup`;

        const groupsResponse = await fetch(searchUrl, { headers })
        const groupsText = await groupsResponse.text();

        let groupsData;
        try {
            groupsData = JSON.parse(groupsText);
        } catch (e) {
            console.error("Invalid JSON from Group Search:", groupsText);
            return new Response(JSON.stringify({
                success: false,
                error: "External API Error (Invalid JSON)"
            }), {
                status: 200,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
            })
        }

        if (groupsData.success === false) { // Check explicit false, sometimes it's omitted
            console.error("API Logic Error (Group Search):", groupsData);
            return new Response(JSON.stringify({
                success: false,
                error: `API Error: ${groupsData.msg || 'Unknown'}`
            }), {
                status: 200,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
            })
        }

        // Safe Access
        const groupList = (groupsData.data?.list || []) as Array<{ id: string; name: string }>;
        const group = groupList.find((g) => g.name === 'Smarter_Signup');

        if (!group) {
            console.error("Group Not Found. Available:", groupList.map((g) => g.name));
            return new Response(JSON.stringify({
                success: false,
                error: `Group 'Smarter_Signup' configuration missing in BillionMail`
            }), {
                status: 200,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
            })
        }

        // 2. Import Contact
        const importPayload = {
            group_ids: [group.id],
            contacts: contact.email,
            import_type: 2,
            default_active: 1,
            status: 1,
            overwrite: 1
        };

        const response = await fetch(`${BILLIONMAIL_API_URL}/contact/group/import`, {
            method: 'POST',
            headers,
            body: JSON.stringify(importPayload),
        })

        const importText = await response.text();
        let importData;

        try {
            importData = JSON.parse(importText);
        } catch (e) {
            console.error("Invalid JSON from Import:", importText);
            return new Response(JSON.stringify({
                success: false,
                error: "External API Error (Import Invalid JSON)"
            }), {
                status: 200,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
            })
        }

        if (importData.success === false) {
            console.error("API Logic Error (Import):", importData);
            return new Response(JSON.stringify({
                success: false,
                error: `Import Failed: ${importData.msg || 'Unknown'}`
            }), {
                status: 200,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
            })
        }

        // Success!
        console.log("Import Successful:", importData);
        return new Response(JSON.stringify({ success: true, data: importData }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: unknown) {
        console.error("Unhandled Exception:", error);
        return new Response(JSON.stringify({
            success: false,
            error: "Internal Server Error" // Generic user-facing message
        }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
