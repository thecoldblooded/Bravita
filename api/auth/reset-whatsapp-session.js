import {
  readRefreshTokenFromRequest,
  refreshSessionFromToken,
  sendJson,
  sendInternalServerError
} from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    // 1. Verify user is authenticated
    const refreshToken = readRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return sendJson(res, 401, { error: "Kimlik doğrulaması gerekiyor." });
    }

    const { response, data } = await refreshSessionFromToken(refreshToken);
    if (!response.ok || !data?.user) {
      return sendJson(res, 401, { error: "Geçersiz veya süresi dolmuş oturum." });
    }

    // 2. Query profiles table to check if is_superadmin is true
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${data.user.id}&select=is_superadmin`, {
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${data.access_token}`,
      }
    });

    if (!profileRes.ok) {
      return sendJson(res, 403, { error: "Yetki kontrolü yapılamadı." });
    }

    const profiles = await profileRes.json();
    const profile = profiles[0];
    if (!profile?.is_superadmin) {
      return sendJson(res, 403, { error: "Bu işlem için superadmin yetkisi gereklidir." });
    }

    // 3. Reset WhatsApp Session on OpenWA
    const openwaUrl = process.env.OPENWA_API_URL;
    const openwaKey = process.env.OPENWA_API_KEY;
    const sessionName = "bravita-new";

    if (!openwaUrl || !openwaKey) {
      throw new Error("Missing OpenWA API configuration");
    }

    // Find current session ID dynamically if exists
    let oldSessionId = null;
    const sessionsRes = await fetch(`${openwaUrl}/sessions`, {
      headers: { "X-API-Key": openwaKey }
    });
    if (sessionsRes.ok) {
      const sessions = await sessionsRes.json();
      const found = sessions.find(s => s.name === sessionName);
      if (found) {
        oldSessionId = found.id;
      }
    }

    // Delete old session if exists
    if (oldSessionId) {
      const deleteRes = await fetch(`${openwaUrl}/sessions/${oldSessionId}`, {
        method: "DELETE",
        headers: { "X-API-Key": openwaKey }
      });
      if (!deleteRes.ok) {
        console.error("Failed to delete old session:", await deleteRes.text());
      }
    }

    // Create new session
    const createRes = await fetch(`${openwaUrl}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": openwaKey
      },
      body: JSON.stringify({ name: sessionName })
    });
    if (!createRes.ok) {
      throw new Error(`Failed to create session: ${await createRes.text()}`);
    }
    const newSession = await createRes.json();
    const newSessionId = newSession.id;

    // Start session
    const startRes = await fetch(`${openwaUrl}/sessions/${newSessionId}/start`, {
      method: "POST",
      headers: { "X-API-Key": openwaKey }
    });
    if (!startRes.ok) {
      throw new Error(`Failed to start session: ${await startRes.text()}`);
    }

    return sendJson(res, 200, { success: true, message: "WhatsApp oturumu sıfırlandı ve yeni QR kod üretiliyor. Lütfen 3-5 saniye bekleyin." });
  } catch (error) {
    return sendInternalServerError(res, req, "reset_whatsapp_session_exception", error);
  }
}
