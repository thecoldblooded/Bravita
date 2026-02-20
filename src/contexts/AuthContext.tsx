/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase, UserProfile } from "@/lib/supabase";
import { billionMail } from "@/lib/billionmail";
import { getBffRefreshDelayMs, isBffAuthEnabled, refreshBffSession, restoreBffSession, toSupabaseSessionInput } from "@/lib/bffAuth";

declare global {
  interface Window {
    __isSyncingProfile?: boolean;
  }
}

interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  isLoading: boolean;
  hasResolvedInitialAuth: boolean;
  isSplashScreenActive: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  profileComplete: boolean;
  isPasswordRecovery: boolean;
  refreshSession: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthDebugGlobal = typeof globalThis & {
  __bravitaAuthContextInstances?: Array<{ id: string; href: string; createdAt: string }>;
  __bravitaAuthContextProviderMounts?: number;
};

const getAuthDebugGlobal = (): AuthDebugGlobal => globalThis as AuthDebugGlobal;

const authContextInstanceId = `authctx_${Math.random().toString(36).slice(2, 10)}`;

if (typeof window !== "undefined") {
  const debugGlobal = getAuthDebugGlobal();
  debugGlobal.__bravitaAuthContextInstances = debugGlobal.__bravitaAuthContextInstances || [];
  debugGlobal.__bravitaAuthContextInstances.push({
    id: authContextInstanceId,
    href: window.location.href,
    createdAt: new Date().toISOString(),
  });

  if (debugGlobal.__bravitaAuthContextInstances.length > 1) {
    console.warn("[AuthContext] Multiple context module instances detected", debugGlobal.__bravitaAuthContextInstances);
  }
}

const getInitialUser = (session: Session | null) => {
  if (!session?.user) return null;

  // Trust only signed app_metadata for privilege hints.
  const isAdminFromMetadata = !!session.user.app_metadata?.is_admin;
  const isSuperAdminFromMetadata = !!session.user.app_metadata?.is_superadmin;

  // Create a minimal stub user - will be replaced by actual profile from DB
  return {
    id: session.user.id,
    email: session.user.email || "",
    full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
    phone: session.user.user_metadata?.phone || session.user.phone || null,
    profile_complete: false,
    phone_verified: false,
    user_type: "individual",
    isStub: true,
    is_admin: isAdminFromMetadata, // Trust signed session metadata instantly
    is_superadmin: isSuperAdminFromMetadata,
    company_name: null,
    phone_verified_at: null,
    oauth_provider: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } as UserProfile;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const bffAuthEnabled = isBffAuthEnabled();

  // Try to get initial session from localStorage immediately (synchronous)
  const getInitialSession = () => {
    if (bffAuthEnabled) {
      return null;
    }

    try {
      const storageKey = "bravita-session-token";
      const storedSession = sessionStorage.getItem(storageKey) ?? localStorage.getItem(storageKey);
      if (!storedSession) {
        return null;
      }

      const parsed = JSON.parse(storedSession);
      const candidateSession = parsed?.currentSession ?? parsed?.session ?? parsed;
      return (candidateSession as Session | null) ?? null;
    } catch (e) {
      console.error("Initial session error:", e);
    }
    return null;
  };

  const initialSession = getInitialSession();
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<UserProfile | null>(() => getInitialUser(initialSession));
  const [isLoading, setIsLoading] = useState(true);
  const [hasResolvedInitialAuth, setHasResolvedInitialAuth] = useState(false);
  const [isSplashScreenActive, setIsSplashScreenActive] = useState(() => {
    // Only active on first load of the session
    return !sessionStorage.getItem("bravita_splash_shown");
  });
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    return window.location.hash.includes("type=recovery");
  });

  // Wrapper for state updates
  const setUserDebug = useCallback((newUser: UserProfile | null) => {
    if (newUser === null) {
      localStorage.removeItem("profile_known_complete");
      localStorage.removeItem("user_is_admin"); // Clean up any old traces
    }

    setUser(newUser);
  }, []);

  const lastProcessedRef = useRef<string | null>(null);
  const hasSeenFirstAuthEventRef = useRef(false);
  const isSplashScreenActiveRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const debugGlobal = getAuthDebugGlobal();
    debugGlobal.__bravitaAuthContextProviderMounts = (debugGlobal.__bravitaAuthContextProviderMounts || 0) + 1;

    console.info("[AuthProvider] mounted", {
      instanceId: authContextInstanceId,
      mounts: debugGlobal.__bravitaAuthContextProviderMounts,
      path: window.location.pathname,
      href: window.location.href,
    });

    return () => {
      const globalRef = getAuthDebugGlobal();
      globalRef.__bravitaAuthContextProviderMounts = Math.max((globalRef.__bravitaAuthContextProviderMounts || 1) - 1, 0);
      console.info("[AuthProvider] unmounted", {
        instanceId: authContextInstanceId,
        mounts: globalRef.__bravitaAuthContextProviderMounts,
        path: window.location.pathname,
      });
    };
  }, []);

  // Safety timeout: Force loading to false if it takes too long
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        console.warn("Auth: Loading timeout triggered. Forcing completion.");
        setIsLoading(false);
        setIsSplashScreenActive(false);
      }, 20000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Keep ref in sync with state
  useEffect(() => {
    isSplashScreenActiveRef.current = isSplashScreenActive;
  }, [isSplashScreenActive]);

  const refreshUserProfile = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      let result = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      // Check for AbortError
      const errStr = String(result.error || '').toLowerCase();
      const errMsg = (result.error as { message?: string })?.message?.toLowerCase() || '';
      const isAborted = errStr.includes('aborterror') || errStr.includes('aborted') ||
        errMsg.includes('aborterror') || errMsg.includes('aborted');

      if (isAborted) {
        console.warn("refreshUserProfile: AbortError detected, retrying...");
        await new Promise(resolve => setTimeout(resolve, 200));
        result = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
      }

      if (result.error) {
        console.error("Profile fetch error:", result.error);
        return;
      }

      if (result.data) {
        setUserDebug(result.data);
      }
    } catch (error) {
      console.error("Failed to refresh user profile:", error);
    }
  }, [session?.user?.id, setUserDebug]);

  const refreshSession = useCallback(async () => {
    try {
      if (bffAuthEnabled) {
        const bffSession = await refreshBffSession();
        if (!bffSession?.access_token) {
          setSession(null);
          setUserDebug(null);
          return;
        }

        const { data, error } = await supabase.auth.setSession(toSupabaseSessionInput(bffSession));

        if (error) {
          throw error;
        }

        setSession(data.session);
        return;
      }

      const {
        data: { session: newSession },
      } = await supabase.auth.refreshSession();
      setSession(newSession);
    } catch (error) {
      console.error("Refresh session error:", error);
    }
  }, [bffAuthEnabled, setUserDebug]);

  const syncPendingProfile = useCallback(async (userId: string, profileData: { full_name?: string; phone?: string; street?: string; city?: string; postal_code?: string }) => {
    // Singleton guard to prevent duplicate syncs
    if (Object.prototype.hasOwnProperty.call(window, '__isSyncingProfile')) return;
    window.__isSyncingProfile = true;

    try {
      // Clear localStorage immediately to prevent other triggers
      localStorage.removeItem("pending_profile");
      localStorage.removeItem("profile_complete_pending");

      // Ensure a profile row exists and mark complete
      const profilePayload = {
        id: userId,
        full_name: profileData.full_name,
        phone: profileData.phone,
        phone_verified: true,
        profile_complete: true,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (upsertError) {
        return;
      }

      // Replace any previous address for this user to avoid duplicates
      const { error: deleteError } = await supabase
        .from("addresses")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        console.error("Delete address error:", deleteError);
      }

      const addressPayload = {
        user_id: userId,
        street: profileData.street || "",
        city: profileData.city || "",
        postal_code: profileData.postal_code || "",
        is_default: true,
      };

      const { error: addressError } = await supabase
        .from("addresses")
        .insert(addressPayload);

      if (addressError) {
        console.error("Address error during sync:", addressError);
      }

      // Refresh profile to update context
      await refreshUserProfile();
    } catch (error) {
      console.error("Sync profile error:", error);
    } finally {
      delete window.__isSyncingProfile;
    }
  }, [refreshUserProfile]);

  // Initialize session on mount
  // Consolidate initialization into a single atomic listener
  useEffect(() => {
    let mounted = true;

    // Supabase fires INITIAL_SESSION immediately upon subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!hasSeenFirstAuthEventRef.current) {
        hasSeenFirstAuthEventRef.current = true;
        if (mounted) {
          setHasResolvedInitialAuth(true);
        }
      }

      // Avoid processing the same session state repeatedly if events fire back-to-back
      const sessionId = newSession?.user?.id || 'none';
      if (lastProcessedRef.current === sessionId && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        return;
      }
      lastProcessedRef.current = sessionId;

      if (event === "SIGNED_IN" && newSession?.user) {
        // Log admin login
        const uid = newSession.user.id;
        // Run async check without blocking auth flow
        (async () => {
          try {
            // We can check metadata first for speed
            const isMetaAdmin = newSession.user?.app_metadata?.is_admin || newSession.user?.app_metadata?.is_superadmin;
            if (isMetaAdmin) {
              await supabase.from('admin_audit_log').insert({
                admin_user_id: uid,
                action: 'LOGIN',
                details: { method: 'auth_state_change', provider: newSession.user.app_metadata?.provider },
                target_table: 'auth',
                target_id: uid
              });
            } else {
              // Double check DB just in case metadata is stale (less likely for login but good for security)
              const { data: userData } = await supabase.from('profiles').select('is_admin, is_superadmin').eq('id', uid).maybeSingle();
              if (userData?.is_admin || userData?.is_superadmin) {
                await supabase.from('admin_audit_log').insert({
                  admin_user_id: uid,
                  action: 'LOGIN',
                  details: { method: 'auth_state_change' },
                  target_table: 'auth',
                  target_id: uid
                });
              }
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (e: any) {
            // Ignore 403 errors (permissions) to avoid console noise for non-admins
            if (e?.code !== '403' && !e?.message?.includes('403')) {
              console.error("Login logging failed", e);
            }
          }
        })();
      }

      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      } else if (event === "SIGNED_OUT") {
        if (lastProcessedRef.current && lastProcessedRef.current !== 'none') {
          // Best effort logout log - might fail if session is completely killed before this runs, 
          // but user ID is cached in ref.
          try {
            // We use a separate un-authed call or rely on the fact that we might still have a fleeting token? 
            // Actually SIGNED_OUT means no token. This is hard to log to DB without a token.
          } catch (e) { console.error(e) }
        }
        setIsPasswordRecovery(false);
      }

      // Close splash screen on INITIAL_SESSION - session state is loaded
      if (event === "INITIAL_SESSION") {
        // If session is null but URL has fragment (OAuth callback), retrieve session again
        if (!newSession && window.location.hash) {
          supabase.auth.getSession().then(async ({ data: { session: urlSession } }) => {
            if (urlSession && mounted) {
              setSession(urlSession);

              // Fetch profile for the session with AbortError handling
              try {
                let profileResult = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", urlSession.user.id)
                  .single();

                // Check for AbortError and retry
                const errStr = String(profileResult.error || '').toLowerCase();
                const errMsg = (profileResult.error as { message?: string })?.message?.toLowerCase() || '';
                const isAborted = errStr.includes('aborterror') || errStr.includes('aborted') ||
                  errMsg.includes('aborterror') || errMsg.includes('aborted');

                if (isAborted) {
                  console.warn("URL session profile fetch aborted, retrying...");
                  await new Promise(resolve => setTimeout(resolve, 200));
                  profileResult = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", urlSession.user.id)
                    .single();
                }

                if (mounted && profileResult.data) {
                  setUserDebug(profileResult.data);
                }
              } catch (err) {
                console.warn("Failed to fetch profile for URL session:", err);
              }
            }
            // Close splash screen after handling session (whether successful or not)
            if (mounted) {
              setIsSplashScreenActive(false);
              setIsLoading(false);
            }
          }).catch(err => {
            console.warn("Could not parse URL session:", err);
            if (mounted) {
              setIsSplashScreenActive(false);
              setIsLoading(false);
            }
          });
          return;
        }
        if (!newSession && !window.location.hash && !bffAuthEnabled) {
          try {
            const {
              data: { session: recoveredSession },
            } = await supabase.auth.getSession();

            if (recoveredSession?.user) {
              console.info("[AuthProvider] recovered session after INITIAL_SESSION null", {
                userId: recoveredSession.user.id,
                path: window.location.pathname,
              });

              setSession(recoveredSession);
              const recoveredStub = getInitialUser(recoveredSession);
              if (recoveredStub) {
                setUserDebug(recoveredStub);
              }

              if (mounted) {
                setIsSplashScreenActive(false);
                setIsLoading(false);
              }

              void (async () => {
                try {
                  const { data: recoveredProfile } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", recoveredSession.user.id)
                    .maybeSingle();

                  if (mounted && recoveredProfile) {
                    setUserDebug(recoveredProfile);
                    if (recoveredProfile.profile_complete) {
                      localStorage.setItem("profile_known_complete", "true");
                    }
                  }
                } catch (recoveryProfileError) {
                  console.warn("Recovered session profile fetch failed:", recoveryProfileError);
                }
              })();

              return;
            }
          } catch (recoveryError) {
            console.warn("INITIAL_SESSION fallback getSession failed:", recoveryError);
          }
        }

        // Normal case - session was in event
        setIsSplashScreenActive(false);
      }

      setSession(newSession);

      if (newSession?.user) {
        // OPTIMISTIC UPDATE: Unlock UI instantly using secure session metadata
        // This ensures the app is interactive in milliseconds even if DB is slow.
        const initialStub = getInitialUser(newSession);

        // Auto-complete stub if we've seen this user complete their profile before
        const knownComplete = localStorage.getItem("profile_known_complete") === "true";
        if (initialStub && knownComplete) {
          initialStub.profile_complete = true;
        }

        setUserDebug(initialStub);

        // Immediately end loading state to reveal the app
        if (mounted) {
          setIsLoading(false);
          setIsSplashScreenActive(false);
        }

        // Background Profile Sync: Update the UI once DB responds
        (async () => {
          let userProfile: UserProfile | null;
          try {
            const fetchProfile = () => supabase
              .from("profiles")
              .select("id, email, full_name, phone, user_type, company_name, profile_complete, phone_verified, is_admin, is_superadmin, oauth_provider, created_at, updated_at")
              .eq("id", newSession.user.id)
              .maybeSingle();

            // Background attempt with 10s limit
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Background fetch timeout')), 10000));
            try {
              const result = (await Promise.race([fetchProfile(), timeout])) as { data: UserProfile | null; error: { message: string; code?: string } | null };
              if (result.error) throw result.error;

              // Handle missing profile execution path without 406 error
              if (!result.data) {
                throw { code: "PGRST116", message: "The result contains 0 rows" };
              }

              userProfile = result.data;

              // Success - Update state and cache
              if (userProfile && mounted) {
                setUserDebug(userProfile);
                if (userProfile.profile_complete) {
                  localStorage.setItem("profile_known_complete", "true");
                }
              }
            } catch (err: unknown) {
              console.warn("Auth: Background profile fetch failed or timed out. User is operating on secure stub.", err);
              throw err;
            }
          } catch (err: unknown) {
            // "Not Found" handling for completely new users
            const errorMessage = err instanceof Error ? err.message : String(err);
            const errorCode = (err as { code?: string })?.code;

            if (errorCode === "PGRST116" || errorMessage.includes("PGRST116")) {
              const metadata = newSession.user.user_metadata || {};
              const newProfile: UserProfile = {
                id: newSession.user.id,
                email: newSession.user.email || "",
                full_name: metadata.full_name || metadata.name || null,
                phone: metadata.phone || newSession.user.phone || null,
                user_type: metadata.user_type || "individual",
                company_name: metadata.company_name || null,
                profile_complete: false,
                phone_verified: false,
                is_admin: false,
                oauth_provider: newSession.user.app_metadata?.provider || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                phone_verified_at: null
              };
              const { error: insertError } = await supabase.from("profiles").insert(newProfile);

              if (!insertError && mounted) {
                setUserDebug(newProfile);
                // Sync to BillionMail ONLY after email confirmation (first login = confirmed)
                // This ensures unconfirmed users never appear in BillionMail
                billionMail.subscribeContact({
                  email: newProfile.email,
                  first_name: newProfile.full_name?.split(" ")[0],
                  last_name: newProfile.full_name?.split(" ").slice(1).join(" "),
                  attributes: {
                    user_type: newProfile.user_type,
                    company_name: newProfile.company_name,
                    phone: newProfile.phone,
                  },
                  tags: ["website_signup", newProfile.user_type],
                }).catch(err => console.error("BillionMail sync failed:", err));
              } else if (insertError && (insertError.code === '23505' || insertError.code === '409') && mounted) {
                // Conflict detected - profile exists but initial fetch failed. Retry fetch.
                console.warn("Auth: Profile conflict detected. Retrying fetch...");
                const { data: existingProfile } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", newSession.user.id)
                  .maybeSingle();

                if (existingProfile) {
                  setUserDebug(existingProfile);
                  if (existingProfile.profile_complete) {
                    localStorage.setItem("profile_known_complete", "true");
                  }
                }
              }
            }
          }

          // Sync pending profiles if any from guest checkout
          const pendingProfile = localStorage.getItem("pending_profile");
          if (pendingProfile && mounted) {
            try {
              const profileData = JSON.parse(pendingProfile);
              await syncPendingProfile(newSession.user.id, profileData);
            } catch (pErr) {
              console.error("Pending profile sync error:", pErr);
            }
          }
        })();

        return; // UI is unlocked, background syncing is in progress
      }

      // NO SESSION CASE: Clear auth state
      if (mounted) {
        setUserDebug(null);
        setIsLoading(false);
        setIsSplashScreenActive(false);
      }
    });

    if (bffAuthEnabled) {
      // BFF mode keeps refresh token in httpOnly cookie and restores an in-memory Supabase session on load.
      void (async () => {
        try {
          const bffSession = await restoreBffSession();
          if (!mounted || !bffSession?.access_token) {
            return;
          }

          const { error } = await supabase.auth.setSession(toSupabaseSessionInput(bffSession));

          if (error) {
            console.warn("BFF bootstrap session apply failed:", error);
          }
        } catch (error) {
          console.warn("BFF bootstrap skipped:", error);
        }
      })();
    }

    const safetyTimer = setTimeout(() => {
      if (mounted && isSplashScreenActiveRef.current) {
        // Session loading took too long, close splash screen anyway
        setHasResolvedInitialAuth(true);
        setIsLoading(false);
        setIsSplashScreenActive(false);
      }
    }, 2000);

    // Handle unhandled AbortError promise rejections from Supabase internal lock
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.name === 'AbortError' ||
        String(event.reason).includes('AbortError') ||
        String(event.reason).includes('Lock')
      ) {
        // Suppress Supabase internal AbortError - it's expected during visibility changes
        event.preventDefault();
      }
    };

    // Handle global errors including those from visibility change events
    const handleGlobalError = (event: ErrorEvent) => {
      if (
        event.message?.includes('AbortError') ||
        event.error?.name === 'AbortError' ||
        event.message?.includes('Lock') ||
        event.error?.message?.includes('Lock')
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    // Explicitly handle visibility change to prevent race conditions
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && session) {
        // Optional: Debounce or throttle checks if needed
        // But usually suppressing the error is enough
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  const activeUserId = session?.user?.id;
  const activeSessionExpiry = session?.expires_at ?? null;

  useEffect(() => {
    if (!bffAuthEnabled || !activeUserId) {
      return;
    }

    const timeoutMs = getBffRefreshDelayMs(activeSessionExpiry);
    const timeoutId = window.setTimeout(() => {
      void refreshSession();
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bffAuthEnabled, activeUserId, activeSessionExpiry, refreshSession]);

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    hasResolvedInitialAuth,
    isSplashScreenActive,
    isAuthenticated: !!session?.user,
    isAdmin: user?.is_admin ?? false,
    isSuperAdmin: user?.is_superadmin ?? false,
    profileComplete: user?.profile_complete ?? false,
    isPasswordRecovery,
    refreshSession,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    if (typeof window !== "undefined") {
      const debugGlobal = getAuthDebugGlobal();
      console.error("[useAuth] missing AuthProvider", {
        instanceId: authContextInstanceId,
        path: window.location.pathname,
        href: window.location.href,
        knownInstances: debugGlobal.__bravitaAuthContextInstances || [],
        providerMounts: debugGlobal.__bravitaAuthContextProviderMounts || 0,
      });
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
