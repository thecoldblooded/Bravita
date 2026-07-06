import { parseRequestBody, sendJson, sendInternalServerError, readRefreshTokenFromRequest, refreshSessionFromToken, verifyFirebasePhoneToken, verifyPhoneToken, buildRefreshCookie } from "./_shared.js";

function normalizePhoneDigits(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "");
}

function arePhonesEquivalent(left, right) {
  const normalizedLeft = normalizePhoneDigits(left);
  const normalizedRight = normalizePhoneDigits(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft === normalizedRight;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    // 1. Resolve user session from cookie
    const refreshToken = readRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return sendJson(res, 401, { error: "Oturum bulunamadı. Lütfen tekrar giriş yapın." });
    }

    const { response: refreshResponse, data: sessionData } = await refreshSessionFromToken(refreshToken);
    if (!refreshResponse.ok || !sessionData?.user || !sessionData?.access_token) {
      return sendJson(res, 401, { error: "Oturum geçersiz veya süresi dolmuş." });
    }

    const user = sessionData.user;
    const body = parseRequestBody(req);

    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const phoneVerificationToken = typeof body.phoneVerificationToken === "string" ? body.phoneVerificationToken.trim() : "";

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    // 2. Fetch current profile to check if phone number is changing
    const profileQueryResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
      method: "GET",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${sessionData.access_token}`,
        "Accept": "application/json",
      },
    });

    if (!profileQueryResponse.ok) {
      const errText = await profileQueryResponse.text();
      throw new Error(`Failed to query current profile: ${errText}`);
    }

    const profiles = await profileQueryResponse.json();
    const currentProfile = profiles[0];

    if (!currentProfile) {
      return sendJson(res, 404, { error: "Kullanıcı profili bulunamadı." });
    }

    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    if (fullName) {
      updatePayload.full_name = fullName.slice(0, 120);
    }

    // 3. If phone number is being changed, verify OTP
    if (phone && phone !== currentProfile.phone) {
      if (!/^\+?[0-9]{10,15}$/.test(phone)) {
        return sendJson(res, 400, { error: "Geçersiz telefon numarası formatı." });
      }

      let verifiedPayload = null;

      if (phoneVerificationToken) {
        verifiedPayload = verifyPhoneToken(phoneVerificationToken, supabaseAnonKey);
      }

      if (!verifiedPayload) {
        verifiedPayload = await verifyFirebasePhoneToken(phoneVerificationToken, phone);
      }

      if (!verifiedPayload || !arePhonesEquivalent(verifiedPayload.phone, phone)) {
        return sendJson(res, 400, { error: "Lütfen yeni telefon numaranızı önce SMS ile doğrulayın." });
      }

      updatePayload.phone = phone;
      updatePayload.phone_verified = true;
      updatePayload.phone_verified_at = new Date().toISOString();
    }

    // 4. Update profile using user's access token to respect RLS
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
      method: "PATCH",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${sessionData.access_token}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      const errText = await updateResponse.text();
      throw new Error(`Profile update failed: ${errText}`);
    }

    // Set rotated refresh cookie
    res.setHeader("Set-Cookie", buildRefreshCookie(sessionData.refresh_token, req));

    const updatedProfiles = await updateResponse.json();
    return sendJson(res, 200, {
      success: true,
      message: "Profil başarıyla güncellendi.",
      profile: updatedProfiles[0]
    });
  } catch (error) {
    return sendInternalServerError(res, req, "update_profile_exception", error);
  }
}
