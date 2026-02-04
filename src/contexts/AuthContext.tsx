/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase, UserProfile } from "@/lib/supabase";

interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  isLoading: boolean;
  isSplashScreenActive: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  profileComplete: boolean;
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

    }
    return null;
  };

  const getInitialUser = (session: Session | null) => {
    if (!session?.user) return null;

    // Check if we have a known complete profile
    const knownComplete = localStorage.getItem("profile_known_complete") === "true";

    // Create a minimal user immediately so UI shows user info right away

    return {
      id: session.user.id,
      email: session.user.email || "",
      full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
      phone: session.user.user_metadata?.phone || session.user.phone || null,
      profile_complete: knownComplete,
      phone_verified: false,
      user_type: "individual",
      isStub: true,
    } as any;
  };

  const initialSession = getInitialSession();
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<UserProfile | null>(getInitialUser(initialSession));
  const [isLoading, setIsLoading] = useState(true);
  const [isSplashScreenActive, setIsSplashScreenActive] = useState(() => {
    // Only active on first load of the session
    return !sessionStorage.getItem("bravita_splash_shown");
  });

  // Wrapper to persist profile_complete status
  const setUserDebug = useCallback((newUser: UserProfile | null) => {
    // Persist profile_complete status to localStorage for immediate visibility on refresh
    if (newUser?.profile_complete !== undefined) {
      localStorage.setItem("profile_known_complete", String(newUser.profile_complete));
    } else if (newUser === null) {
      localStorage.removeItem("profile_known_complete");
    }

    setUser(newUser);
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (!session?.user?.id) return;

    // TEST USER BYPASS - Return mock profile for test user
    if (session.user.id === "test-user-id-12345") {
      const mockProfile = {
        id: "test-user-id-12345",
        email: "test@test.com",
        full_name: "Test Kullanıcı",
        phone: "+905551234567",
        user_type: "individual",
        company_name: null,
        profile_complete: true,
        phone_verified: true,
        is_admin: true, // Admin for testing
      };
      setUserDebug(mockProfile as any);
      return;
    }
    // END TEST USER BYPASS

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUserDebug(profile);
      }
    } catch (error) {
      // Silently fail
    }
  }, [session?.user?.id, setUserDebug]);

  const refreshSession = useCallback(async () => {
    try {
      const {
        data: { session: newSession },
      } = await supabase.auth.refreshSession();
      setSession(newSession);
    } catch (error) {

    }
  }, []);

  const syncPendingProfile = useCallback(async (userId: string, profileData: any) => {
    // Singleton guard to prevent duplicate syncs
    if (Object.prototype.hasOwnProperty.call(window, '__isSyncingProfile')) return;
    (window as any).__isSyncingProfile = true;

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

      } else {

      }

      // Refresh profile to update context
      await refreshUserProfile();
    } catch (error) {

    } finally {
      delete (window as any).__isSyncingProfile;
    }
  }, [refreshUserProfile]);

  // Initialize session on mount
  useEffect(() => {

    const initializeAuth = async () => {
      try {


        // Add timeout to prevent infinite hang
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("getSession timeout")), 5000)
        );

        const { data: { session: initialSession } } = await Promise.race([sessionPromise, timeoutPromise]) as any;


        setSession(initialSession);

        if (initialSession?.user) {

          // TEST USER BYPASS - Skip Supabase profile fetch for test user
          if (initialSession.user.id === "test-user-id-12345") {
            const mockProfile = {
              id: "test-user-id-12345",
              email: "test@test.com",
              full_name: "Test Kullanıcı",
              phone: "+905551234567",
              user_type: "individual",
              company_name: null,
              profile_complete: true,
              phone_verified: true,
              is_admin: true, // Admin for testing
            };
            setUserDebug(mockProfile as any);
          } else {
            // END TEST USER BYPASS - Normal flow below

            const profilePromise = supabase
              .from("profiles")
              .select("*")
              .eq("id", initialSession.user.id)
              .single();

            const profileTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("profile fetch timeout")), 3000)
            );

            try {
              const { data: profile, error } = await Promise.race([profilePromise, profileTimeout]) as any;



              if (error && error.code !== "PGRST116") {

              }

              if (profile) {

                setUserDebug(profile);
              } else {
                // Profile doesn't exist - create it from user_metadata
                const metadata = initialSession.user.user_metadata || {};
                const newProfile = {
                  id: initialSession.user.id,
                  email: initialSession.user.email || "",
                  full_name: metadata.full_name || metadata.name || null,
                  phone: metadata.phone || initialSession.user.phone || null,
                  user_type: metadata.user_type || "individual",
                  company_name: metadata.company_name || null,
                  profile_complete: false,
                  phone_verified: false,
                  is_admin: false, // Default: not admin
                };

                // Try to create profile in database
                const { error: insertError } = await supabase
                  .from("profiles")
                  .insert(newProfile);

                if (!insertError) {
                  setUserDebug(newProfile as any);
                } else {
                  // Fallback to stub if insert fails
                  setUserDebug({ ...newProfile, isStub: true } as any);
                }
              }
            } catch (error) {

              const knownComplete = localStorage.getItem("profile_known_complete") === "true";
              const minimalUser = {
                id: initialSession.user.id,
                email: initialSession.user.email || "",
                full_name: initialSession.user.user_metadata?.full_name || initialSession.user.user_metadata?.name || null,
                phone: initialSession.user.user_metadata?.phone || initialSession.user.phone || null,
                profile_complete: knownComplete,
                phone_verified: false,
                user_type: "individual",
                isStub: true,
              } as any;

              setUserDebug(minimalUser);
            }
          } // End of else block for non-test users
        }

        // Check localStorage for pending profile
        const pendingProfile = localStorage.getItem("pending_profile");
        if (pendingProfile && initialSession?.user) {

          const profileData = JSON.parse(pendingProfile);
          // Keep loading true until sync completes so routing guards wait
          setIsLoading(true);
          await syncPendingProfile(initialSession.user.id, profileData);
        }
      } catch (error) {

      } finally {
        // If this is the first load of the session, wait for the splash screen
        if (isSplashScreenActive) {
          // Minimum loading time (gif duration + buffer)
          await new Promise(resolve => setTimeout(resolve, 6000));
          sessionStorage.setItem("bravita_splash_shown", "true");
          setIsSplashScreenActive(false);
        }

        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {

      setSession(newSession);

      if (newSession?.user) {

        // TEST USER BYPASS - Skip Supabase profile fetch for test user
        if (newSession.user.id === "test-user-id-12345") {
          const mockProfile = {
            id: "test-user-id-12345",
            email: "test@test.com",
            full_name: "Test Kullanıcı",
            phone: "+905551234567",
            user_type: "individual",
            company_name: null,
            profile_complete: true,
            phone_verified: true,
            is_admin: true, // Admin for testing
          };
          setUserDebug(mockProfile as any);
          setIsLoading(false);
        } else {
          // END TEST USER BYPASS - Normal flow below

          try {
            // Fetch updated profile with timeout


            const profilePromise = supabase
              .from("profiles")
              .select("*")
              .eq("id", newSession.user.id)
              .single();

            const profileTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("profile fetch timeout in onAuthStateChange")), 5000)
            );

            const { data: profile, error } = await Promise.race([profilePromise, profileTimeout]) as any;

            console.log(">>> PROFILE FETCH COMPLETE <<<", {
              hasProfile: !!profile,
              errorCode: error?.code,
              errorMessage: error?.message,
              isAdmin: profile?.is_admin
            });

            if (error) {
              console.error("Profile fetch error:", {
                code: error.code,
                message: error.message,
                hint: error.hint,
                details: error.details
              });
            }

            if (profile) {
              setUserDebug(profile);
            } else {
              // Profile doesn't exist - create it from user_metadata
              const metadata = newSession.user.user_metadata || {};
              const newProfile = {
                id: newSession.user.id,
                email: newSession.user.email || "",
                full_name: metadata.full_name || metadata.name || null,
                phone: metadata.phone || newSession.user.phone || null,
                user_type: metadata.user_type || "individual",
                company_name: metadata.company_name || null,
                profile_complete: false,
                phone_verified: false,
              };

              // Try to create profile in database
              const { error: insertError } = await supabase
                .from("profiles")
                .insert(newProfile);

              if (!insertError) {
                setUserDebug(newProfile as any);
              } else {
                // Fallback to stub if insert fails (might already exist)
                // Fallback to stub if fails (might already exist)
                setUserDebug({ ...newProfile, isStub: true } as any);
              }
            }
          } catch (err) {

            setUserDebug(((current: UserProfile | null) => {
              if (current?.id === newSession.user.id && !current.isStub) {
                return current;
              }

              const knownComplete = localStorage.getItem("profile_known_complete") === "true";
              const minimalUser = {
                id: newSession.user.id,
                email: newSession.user.email || "",
                full_name: newSession.user.user_metadata?.full_name || newSession.user.user_metadata?.name || null,
                phone: newSession.user.user_metadata?.phone || newSession.user.phone || null,
                profile_complete: knownComplete,
                phone_verified: false,
                user_type: "individual",
                isStub: true,
                is_admin: false,
                company_name: null,
                phone_verified_at: null,
                oauth_provider: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              } as UserProfile;
              return minimalUser;
            }) as any);
          } finally {

            // Check if there's pending profile data to sync
            const pendingProfile = localStorage.getItem("pending_profile");
            if (pendingProfile && newSession?.user?.id) {
              try {
                setIsLoading(true);
                const profileData = JSON.parse(pendingProfile);
                await syncPendingProfile(newSession.user.id, profileData);
              } catch (error) {

              }
            }


            setIsLoading(false);
          }
        } // End of else block for non-test users
      } else {

        setUserDebug(null);
        setIsLoading(false);
      }

    });

    return () => {
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - runs only on mount

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    isSplashScreenActive,
    isAuthenticated: !!session?.user,
    isAdmin: user?.is_admin ?? false,
    profileComplete: user?.profile_complete ?? false,
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
