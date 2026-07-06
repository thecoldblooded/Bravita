import {
  sendJson,
  sendInternalServerError,
  signPhoneToken,
  parseRequestBody,
} from "./_shared.js";

async function verifyFirebasePhoneToken(idToken, expectedPhone) {
  const firebaseApiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!firebaseApiKey) {
    throw new Error("Missing Firebase API key");
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return null;
  }

  const user = Array.isArray(data?.users) ? data.users[0] : null;
  const tokenPhone = typeof user?.phoneNumber === "string" ? user.phoneNumber.trim() : "";
  const inputPhone = typeof expectedPhone === "string" ? expectedPhone.trim() : "";

  if (!tokenPhone || (inputPhone && tokenPhone !== inputPhone)) {
    return null;
  }

  return {
    phone: tokenPhone,
    firebaseUid: user.localId,
    verified: true,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = parseRequestBody(req);
    const firebaseToken = typeof body.firebaseToken === "string" ? body.firebaseToken.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!firebaseToken) {
      return sendJson(res, 400, { error: "Firebase token gereklidir." });
    }
    if (!phone) {
      return sendJson(res, 400, { error: "Telefon numarası gereklidir." });
    }

    const verifiedPayload = await verifyFirebasePhoneToken(firebaseToken, phone);
    if (!verifiedPayload?.verified) {
      return sendJson(res, 400, { error: "Firebase telefon doğrulaması tamamlanamadı." });
    }

    // Phone verified! Sign the verification token
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const token = signPhoneToken(phone, supabaseAnonKey);

    return sendJson(res, 200, { success: true, token });
  } catch (error) {
    return sendInternalServerError(res, req, "verify_firebase_token_exception", error);
  }
}
