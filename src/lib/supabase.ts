import { createClient, Session } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const useBffAuth = import.meta.env.VITE_USE_BFF_AUTH === "true";

const authMemoryStore = new Map<string, string>();

const inMemoryAuthStorage = {
  getItem: (key: string): string | null => authMemoryStore.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    authMemoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    authMemoryStore.delete(key);
  },
};

function resolveAuthStorage() {
  if (typeof window === "undefined") {
    return inMemoryAuthStorage;
  }

  if (useBffAuth) {
    return inMemoryAuthStorage;
  }

  try {
    const probeKey = "__bravita_auth_storage_probe__";
    window.sessionStorage.setItem(probeKey, "1");
    window.sessionStorage.removeItem(probeKey);
    return window.sessionStorage;
  } catch {
    return inMemoryAuthStorage;
  }
}

const authStorage = resolveAuthStorage();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please copy .env.local.example to .env.local and add your Supabase credentials."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: !useBffAuth,
    autoRefreshToken: !useBffAuth,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: authStorage,
    storageKey: 'bravita-session-token',
  }
});

// Singleton session promise to avoid parallel lock acquisition attempts
let initialSessionPromise: Promise<{ data: { session: Session | null }; error: unknown }> | null = null;
export async function getSessionSafe() {
  if (initialSessionPromise) return initialSessionPromise;

  initialSessionPromise = (async () => {
    try {
      return await supabase.auth.getSession();
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message?.includes('AbortError'))) {
        console.warn("getSessionSafe: Auth lock aborted, returning null session.");
        return { data: { session: null }, error: null };
      }
      throw err;
    }
  })().finally(() => {
    setTimeout(() => { initialSessionPromise = null }, 500);
  });

  return initialSessionPromise;
}

/**
 * Wrapper for queries to handle AbortError gracefully
 */
export async function safeQuery<T>(promise: PromiseLike<{ data: T | null; error: unknown; count?: number | null }>): Promise<{ data: T | null; error: { message: string; isAborted?: boolean } | null; count: number }> {
  try {
    const { data, error, count } = await promise;
    if (error) {
      const errorStr = String(error).toLowerCase();
      const errorMessage = (error as { message?: string })?.message?.toLowerCase() || '';
      const isAborted = errorStr.includes('aborterror') ||
        errorStr.includes('aborted') ||
        errorMessage.includes('aborterror') ||
        errorMessage.includes('aborted');
      if (isAborted) {
        return { data: null, error: { message: 'Aborted', isAborted: true }, count: 0 };
      }
      return { data, error: error as { message: string; isAborted?: boolean } | null, count: count || 0 };
    }
    return { data, error: null, count: count || 0 };
  } catch (err: unknown) {
    const errStr = String(err).toLowerCase();
    const errMessage = (err as { message?: string })?.message?.toLowerCase() || '';
    if (errStr.includes('aborterror') ||
      errStr.includes('aborted') ||
      errMessage.includes('aborterror') ||
      errMessage.includes('aborted')) {
      return { data: null, error: { message: 'Aborted', isAborted: true }, count: 0 };
    }
    throw err;
  }
}

// Auth helper types
export type UserType = "individual" | "company";

export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  user_type: UserType;
  full_name: string | null;
  company_name: string | null;
  profile_complete: boolean;
  phone_verified: boolean | null;
  phone_verified_at: string | null;
  oauth_provider: string | null;
  is_admin: boolean;
  is_superadmin?: boolean;
  isStub?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAddress {
  id: string;
  user_id: string;
  street: string;
  city: string;
  postal_code: string;
  is_default: boolean;
  created_at: string;
}
