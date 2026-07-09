import {
  sendJson,
  sendInternalServerError,
  signPhoneToken,
  parseRequestBody,
} from "./_shared.js";

async function verifyFirebasePhoneToken(idToken, expectedPhone, appCheckToken) {
  const firebaseApiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!firebaseApiKey) {
    console.error("[verifyFirebasePhoneToken] Missing Firebase API key");
    throw new Error("Missing Firebase API key");
  }

  console.log("[verifyFirebasePhoneToken] Input phone:", expectedPhone);
  console.log("[verifyFirebasePhoneToken] API Key:", firebaseApiKey.substring(0, 8) + "...");
  console.log("[verifyFirebasePhoneToken] App Check Token Present:", !!appCheckToken);

  const headers = { "Content-Type": "application/json" };
  if (appCheckToken) {
    headers["X-Firebase-AppCheck"] = appCheckToken;
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json().catch(() => ({}));
  console.log("[verifyFirebasePhoneToken] Google Response OK:", response.ok, "Status:", response.status);
  if (!response.ok) {
    console.error("[verifyFirebasePhoneToken] Google API error:", JSON.stringify(data));
    return null;
  }

  const user = Array.isArray(data?.users) ? data.users[0] : null;
  const tokenPhone = typeof user?.phoneNumber === "string" ? user.phoneNumber.trim() : "";
  const inputPhone = typeof expectedPhone === "string" ? expectedPhone.trim() : "";

  console.log("[verifyFirebasePhoneToken] Comparing tokenPhone:", tokenPhone, "with inputPhone:", inputPhone);

  if (!tokenPhone || (inputPhone && tokenPhone !== inputPhone)) {
    console.error("[verifyFirebasePhoneToken] Phone mismatch or missing tokenPhone");
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
    const appCheckToken = req.headers["x-firebase-appcheck"] || "";

    if (!firebaseToken) {
      return sendJson(res, 400, { error: "Firebase token gereklidir." });
    }
    if (!phone) {
      return sendJson(res, 400, { error: "Telefon numarası gereklidir." });
    }

    const verifiedPayload = await verifyFirebasePhoneToken(firebaseToken, phone, appCheckToken);
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
