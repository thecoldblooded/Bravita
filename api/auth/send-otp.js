import { createHash, randomInt } from "node:crypto";
import { assertValidAuthPostRequest, parseRequestBody, sendJson, sendInternalServerError } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  // Rate Limiting: Max 3 OTP requests per 1 minute per IP/num
  if (!assertValidAuthPostRequest(req, res, {
    rateLimit: {
      bucketKey: "auth:send-otp",
      maxRequests: 3,
      windowMs: 60 * 1000,
    },
  })) {
    return;
  }

  try {
    const body = parseRequestBody(req);
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!phone || !/^\+?[0-9]{10,15}$/.test(phone)) {
      return sendJson(res, 400, { error: "Geçersiz telefon numarası formatı." });
    }

    // Generate secure 6-digit OTP code
    const otp = randomInt(100000, 999999).toString();
    const otpHash = createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes expiration

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Delete any existing OTP records for this phone number
    await fetch(`${supabaseUrl}/rest/v1/whatsapp_otps?phone_number=eq.${encodeURIComponent(phone)}`, {
      method: "DELETE",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
    });

    // Insert new OTP record into Supabase PostgREST endpoint
    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/whatsapp_otps`, {
      method: "POST",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number: phone,
        otp_hash: otpHash,
        attempts_left: 3,
        expires_at: expiresAt.toISOString(),
      }),
    });

    if (!dbResponse.ok) {
      const dbErrText = await dbResponse.text();
      throw new Error(`Failed to save OTP to database: ${dbErrText}`);
    }

    // Make direct HTTP request to OpenWA API to send WhatsApp message
    const openwaUrl = process.env.OPENWA_API_URL;
    const openwaKey = process.env.OPENWA_API_KEY;
    const sessionName = process.env.OPENWA_SESSION_NAME || "bravita-new";

    if (!openwaUrl || !openwaKey) {
      throw new Error("Missing OpenWA API configuration");
    }

    const sanitizedPhone = phone.replace(/[+\s\-()]/g, "");
    const chatId = `${sanitizedPhone}@c.us`;
    const messageText = `Bravita kayıt kodunuz: ${otp}\nBu kod 3 dakika geçerlidir.`;

    const openwaResponse = await fetch(`${openwaUrl}/sessions/${sessionName}/messages/send-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": openwaKey,
      },
      body: JSON.stringify({
        chatId: chatId,
        text: messageText,
      }),
    });

    if (!openwaResponse.ok) {
      const openwaErrText = await openwaResponse.text();
      throw new Error(`OpenWA API responded with error: ${openwaErrText}`);
    }

    return sendJson(res, 200, { success: true, message: "Doğrulama kodu WhatsApp ile gönderildi." });
  } catch (error) {
    return sendInternalServerError(res, req, "send_otp_exception", error);
  }
}
