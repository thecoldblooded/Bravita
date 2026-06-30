import { createHash } from "node:crypto";
import { parseRequestBody, sendJson, sendInternalServerError, signPhoneToken } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = parseRequestBody(req);
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!phone || !code || code.length !== 6) {
      return sendJson(res, 400, { error: "Telefon numarası ve 6 haneli doğrulama kodu gereklidir." });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Query OTP record from Supabase database
    const dbQueryResponse = await fetch(`${supabaseUrl}/rest/v1/whatsapp_otps?phone_number=eq.${encodeURIComponent(phone)}`, {
      method: "GET",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Accept": "application/json",
      },
    });

    if (!dbQueryResponse.ok) {
      const dbErrText = await dbQueryResponse.text();
      throw new Error(`Database query failed: ${dbErrText}`);
    }

    const records = await dbQueryResponse.json();
    const otpRecord = records[0];

    if (!otpRecord) {
      return sendJson(res, 400, { error: "Aktif doğrulama kodu bulunamadı. Lütfen yeni bir kod isteyin." });
    }

    // Check brute force attempts
    if (otpRecord.attempts_left <= 0) {
      return sendJson(res, 400, { error: "Çok fazla hatalı deneme yaptınız. Lütfen yeni bir kod isteyin." });
    }

    // Check expiration
    if (new Date(otpRecord.expires_at) < new Date()) {
      return sendJson(res, 400, { error: "Doğrulama kodunun süresi dolmuş. Lütfen yeni bir kod isteyin." });
    }

    // Kıyaslama
    const enteredHash = createHash("sha256").update(code).digest("hex");
    if (otpRecord.otp_hash !== enteredHash) {
      const newAttempts = otpRecord.attempts_left - 1;

      // Decrement attempts_left in DB
      await fetch(`${supabaseUrl}/rest/v1/whatsapp_otps?id=eq.${otpRecord.id}`, {
        method: "PATCH",
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attempts_left: newAttempts,
        }),
      });

      return sendJson(res, 400, {
        error: "Girdiğiniz kod hatalı.",
        attempts_left: newAttempts,
      });
    }

    // Verification successful: Delete OTP record
    await fetch(`${supabaseUrl}/rest/v1/whatsapp_otps?id=eq.${otpRecord.id}`, {
      method: "DELETE",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
      },
    });

    // Generate secure validation token using the shared secret
    const verificationToken = signPhoneToken(phone, supabaseAnonKey);

    return sendJson(res, 200, {
      success: true,
      message: "Telefon numarası başarıyla doğrulandı.",
      token: verificationToken,
    });
  } catch (error) {
    return sendInternalServerError(res, req, "verify_otp_exception", error);
  }
}
