/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase, UserProfile, getSessionSafe } from "@/lib/supabase";
import { billionMail } from "@/lib/billionmail";

declare global {
  interface Window {
    __isSyncingProfile?: boolean;
  }
}

interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  isLoading: boolean;
  isSplashScreenActive: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  profileComplete: boolean;
  isPasswordRecovery: boolean;
  refreshSession: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Try to get initial session from localStorage immediately (synchronous)
  const getInitialSession = () => {
    try {
      // Supabase stores session in localStorage with key format: sb-{project-ref}-auth-token
      // Extract project ref from VITE_SUPABASE_URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return null;

      const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (!urlMatch) return null;

      const projectRef = urlMatch[1];
      const storageKey = `sb-${projectRef}-auth-token`;

      const storedSession = localStorage.getItem(storageKey);
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        // Supabase stores the session in a nested structure
        return parsed as Session | null;
      }
    } catch (e) {
      console.error("Initial session error:", e);
    }
    return null;
  };

  const getInitialUser = (session: Session | null) => {
    if (!session?.user) return null;

    // Check for admin status in session metadata (securely signed by Supabase)
    const isAdminFromMetadata = !!session.user.app_metadata?.is_admin || !!session.user.user_metadata?.is_admin;

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
      company_name: null,
      phone_verified_at: null,
      oauth_provider: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as UserProfile;
  };

  const initialSession = getInitialSession();
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<UserProfile | null>(getInitialUser(initialSession));
  const [isLoading, setIsLoading] = useState(true);
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
  const isInitializing = useRef(false);
  const isSplashScreenActiveRef = useRef(false);

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
      const {
        data: { session: newSession },
      } = await supabase.auth.refreshSession();
      setSession(newSession);
    } catch (error) {
      console.error("Refresh session error:", error);
    }
  }, []);

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
      // Avoid processing the same session state repeatedly if events fire back-to-back
      const sessionId = newSession?.user?.id || 'none';
      if (lastProcessedRef.current === sessionId && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        return;
      }
      lastProcessedRef.current = sessionId;

      // console.log(`Auth Event: ${event} [User: ${sessionId.substring(0, 8)}]`);

      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      } else if (event === "SIGNED_OUT") {
        setIsPasswordRecovery(false);
      }

      // Close splash screen on INITIAL_SESSION - session state is loaded
      if (event === "INITIAL_SESSION") {
        // If session is null but URL has fragment (OAuth callback), retrieve session again
        if (!newSession && window.location.hash) {
          // console.log("INITIAL_SESSION with empty session, checking URL fragment...");
          supabase.auth.getSession().then(async ({ data: { session: urlSession } }) => {
            if (urlSession && mounted) {
              // console.log("URL fragment session found, setting session");
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
        if (initialStub) {
          if (knownComplete) {
            initialStub.profile_complete = true;
          } else {
            // Fail-open for new logins too to prevent stuck states
            initialStub.profile_complete = true;
          }
        }

        setUserDebug(initialStub);

        // Immediately end loading state to reveal the app
        if (mounted) {
          setIsLoading(false);
          setIsSplashScreenActive(false);
        }

        // Background Profile Sync: Update the UI once DB responds
        (async () => {
          let userProfile = null;
          try {
            const fetchProfile = () => supabase
              .from("profiles")
              .select("id, email, full_name, phone, user_type, company_name, profile_complete, phone_verified, is_admin, oauth_provider, created_at, updated_at")
              .eq("id", newSession.user.id)
              .single();

            // Background attempt with 10s limit
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Background fetch timeout')), 10000));
            try {
              const result = (await Promise.race([fetchProfile(), timeout])) as { data: UserProfile | null; error: { message: string; code?: string } | null };
              if (result.error) throw result.error;
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
            }
          } catch (err: unknown) {
            // "Not Found" handling for completely new users
            const errorMessage = err instanceof Error ? err.message : String(err);
            const errorCode = (err as { code?: string })?.code;

            if (errorCode === "PGRST116" || errorMessage.includes("PGRST116")) {
              // console.log("Auth: Profile not found, creating background entry...");
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

    const safetyTimer = setTimeout(() => {
      if (mounted && isSplashScreenActiveRef.current) {
        // Session loading took too long, close splash screen anyway
        // console.debug("Splash screen timeout, closing.");
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

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    isSplashScreenActive,
    isAuthenticated: !!session?.user,
    isAdmin: user?.is_admin ?? false,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
