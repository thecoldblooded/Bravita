import { Session } from "@supabase/supabase-js";
import { UserProfile } from "../lib/supabase";

type LocationLike = {
  hash: string;
  search: string;
};

export const normalizeSessionPhone = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("+")) {
    return null;
  }

  const normalized = `+${trimmed.replace(/\D/g, "")}`;
  return /^\+[0-9]{10,15}$/.test(normalized) ? normalized : null;
};

export const hasAuthCallbackInUrl = (locationLike?: LocationLike): boolean => {
  const target = locationLike ?? (typeof window !== "undefined" ? window.location : null);
  if (!target) {
    return false;
  }

  return (
    target.hash.includes("access_token=") ||
    target.hash.includes("type=signup") ||
    target.hash.includes("type=recovery") ||
    target.search.includes("code=") ||
    target.search.includes("type=signup") ||
    target.search.includes("type=recovery")
  );
};

export const getInitialUserFromSession = (session: Session | null): UserProfile | null => {
  if (!session?.user) {
    return null;
  }

  const isAdminFromMetadata = !!session.user.app_metadata?.is_admin;
  const isSuperAdminFromMetadata = !!session.user.app_metadata?.is_superadmin;
  const metadataPhone = normalizeSessionPhone(session.user.user_metadata?.phone);
  const authUserPhone = normalizeSessionPhone(session.user.phone);
  const stubPhone = metadataPhone || authUserPhone || null;
  const timestamp = new Date().toISOString();

  return {
    id: session.user.id,
    email: session.user.email || "",
    full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
    phone: stubPhone,
    profile_complete: false,
    phone_verified: false,
    user_type: "individual",
    isStub: true,
    is_admin: isAdminFromMetadata,
    is_superadmin: isSuperAdminFromMetadata,
    company_name: null,
    phone_verified_at: null,
    oauth_provider: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
};
