import { createVerify } from "node:crypto";
import { sendJson, sendInternalServerError, signPhoneToken, parseRequestBody } from "./_shared.js";

// In-memory cache for Google public keys
let cachedKeys = null;
let keysExpiresAt = 0;

async function fetchGooglePublicKeys() {
  const now = Date.now();
  if (cachedKeys && now < keysExpiresAt) {
    return cachedKeys;
  }

  const url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken-system%40system.gserviceaccount.com";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch Google public keys: ${res.statusText}`);
  }

  // Parse Cache-Control header to determine expiration
  const cacheControl = res.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3600 * 1000;

  const data = await res.json();
  cachedKeys = data;
  keysExpiresAt = now + maxAge;
  return cachedKeys;
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

    // Split JWT
    const parts = firebaseToken.split(".");
    if (parts.length !== 3) {
      return sendJson(res, 400, { error: "Geçersiz token formatı." });
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header
    const headerJson = Buffer.from(headerB64, "base64url").toString("utf8");
    const header = JSON.parse(headerJson);

    if (header.alg !== "RS256" || !header.kid) {
      return sendJson(res, 400, { error: "Uyumsuz token algoritması." });
    }

    // Fetch Google certificates
    const keys = await fetchGooglePublicKeys();
    const cert = keys[header.kid];

    if (!cert) {
      return sendJson(res, 400, { error: "Geçersiz key kimliği (kid)." });
    }

    // Verify RS256 signature
    const verify = createVerify("RSA-SHA256");
    verify.update(`${headerB64}.${payloadB64}`);
    const isSignatureValid = verify.verify(cert, signatureB64, "base64url");

    if (!isSignatureValid) {
      return sendJson(res, 400, { error: "Token imzası doğrulanamadı." });
    }

    // Decode and validate payload claims
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);

    const projectId = process.env.FIREBASE_PROJECT_ID || "bravita-327bf";
    const expectedIssuer = `https://securetoken.google.com/${projectId}`;

    // Verify exp, iss, aud
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return sendJson(res, 400, { error: "Token süresi dolmuş." });
    }
    if (payload.iss !== expectedIssuer) {
      return sendJson(res, 400, { error: "Geçersiz token yayıncısı (issuer)." });
    }
    if (payload.aud !== projectId) {
      return sendJson(res, 400, { error: "Geçersiz token hedef kitlesi (audience)." });
    }

    // Extract and match phone number
    // Firebase phone number is in E.164 format (e.g. +905321234567)
    const tokenPhone = typeof payload.phone_number === "string" ? payload.phone_number.trim() : "";
    
    // Normalize both phone numbers to raw digits for comparison
    const normTokenPhone = tokenPhone.replace(/[+\s\-()]/g, "");
    const normInputPhone = phone.replace(/[+\s\-()]/g, "");

    if (!normTokenPhone || normTokenPhone !== normInputPhone) {
      return sendJson(res, 400, { error: "Telefon numarası token ile eşleşmiyor." });
    }

    // Phone verified! Sign the verification token
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const token = signPhoneToken(phone, supabaseAnonKey);

    return sendJson(res, 200, { success: true, token });
  } catch (error) {
    return sendInternalServerError(res, req, "verify_firebase_token_exception", error);
  }
}
