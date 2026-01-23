/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase, UserProfile } from "@/lib/supabase";

interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
      console.log("Could not parse stored session", e);
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
      profile_complete: knownComplete,
      phone_verified: false,
      user_type: "individual",
      isStub: true, // Mark as stub so we know it needs to be replaced
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };

  const initialSession = getInitialSession();
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<UserProfile | null>(getInitialUser(initialSession));
  const [isLoading, setIsLoading] = useState(true);

  // Add wrapper to log all setUser calls and persist profile_complete status
  const setUserDebug = useCallback((newUser: UserProfile | null) => {
    console.log("=== setUser called with:", {
      newUser: newUser ? `{id: ${newUser.id}, complete: ${newUser.profile_complete}}` : "null",
      stack: new Error().stack?.split('\n')[2]
    });

    // Persist profile_complete status to localStorage for immediate visibility on refresh
    if (newUser?.profile_complete !== undefined) {
      localStorage.setItem("profile_known_complete", String(newUser.profile_complete));
    } else if (newUser === null) {
      localStorage.removeItem("profile_known_complete");
    }

    setUser(newUser);
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (!session?.user) return;

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
      console.error("Error refreshing profile:", error);
    }
  }, [session?.user, setUserDebug]);

  const refreshSession = useCallback(async () => {
    try {
      const {
        data: { session: newSession },
      } = await supabase.auth.refreshSession();
      setSession(newSession);
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  }, []);

  const syncPendingProfile = useCallback(async (userId: string, profileData: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      console.log("Syncing pending profile to database...", profileData);

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
        console.error("Sync error:", upsertError);
        return;
      }

      console.log("Profile synced successfully");

      // Replace any previous address for this user
      const { error: deleteError } = await supabase
        .from("addresses")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        console.error("Address delete error:", deleteError);
      }

      const addressPayload = {
        user_id: userId,
        street: profileData.street,
        city: profileData.city,
        postal_code: profileData.postal_code,
        is_default: true,
      };

      const { error: addressError } = await supabase
        .from("addresses")
        .insert(addressPayload);

      if (addressError) {
        console.error("Address insert error:", addressError);
      } else {
        console.log("Address synced successfully");
      }

      // Clear localStorage after successful sync
      localStorage.removeItem("pending_profile");
      localStorage.removeItem("profile_complete_pending");

      // Refresh profile to update context
      await refreshUserProfile();
    } catch (error) {
      console.error("Sync pending profile error:", error);
    }
  }, [refreshUserProfile]);

  // Initialize session on mount
  useEffect(() => {
    console.log("=== AuthContext: initializeAuth starting ===");
    const initializeAuth = async () => {
      try {
        console.log("Getting initial session...");

        // Add timeout to prevent infinite hang
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("getSession timeout")), 5000)
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: { session: initialSession } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

        console.log("Initial session:", initialSession?.user?.id || "none");
        setSession(initialSession);

        if (initialSession?.user) {
          console.log("Fetching profile for initial session user...");

          const profilePromise = supabase
            .from("profiles")
            .select("*")
            .eq("id", initialSession.user.id)
            .single();

          const profileTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("profile fetch timeout")), 3000)
          );

          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profile, error } = await Promise.race([profilePromise, profileTimeout]) as any;

            console.log("Initial profile fetch result:", { hasProfile: !!profile, error: error?.code });

            if (error && error.code !== "PGRST116") {
              console.error("Error fetching profile:", error);
            }

            if (profile) {
              console.log("Setting initial user from profile");
              setUserDebug(profile);
            } else {
              throw new Error("No profile found");
            }
          } catch (error) {
            console.log("Profile fetch failed, creating stub user immediately");
            const knownComplete = localStorage.getItem("profile_known_complete") === "true";
            const minimalUser = {
              id: initialSession.user.id,
              email: initialSession.user.email || "",
              profile_complete: knownComplete,
              phone_verified: false,
              user_type: "individual",
              isStub: true,
               
            } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            console.log("Minimal user created:", minimalUser);
            setUserDebug(minimalUser);
          }
        }

        // Check localStorage for pending profile
        const pendingProfile = localStorage.getItem("pending_profile");
        if (pendingProfile && initialSession?.user) {
          console.log("Found pending profile in localStorage, syncing...");
          const profileData = JSON.parse(pendingProfile);
          // Keep loading true until sync completes so routing guards wait
          setIsLoading(true);
          await syncPendingProfile(initialSession.user.id, profileData);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        console.log("=== AuthContext: Setting isLoading to FALSE ===");
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log(">>> AUTH STATE CHANGE CALLBACK START <<<", event, newSession?.user?.id);
      setSession(newSession);

      if (newSession?.user) {
        console.log(">>> HAS NEW SESSION, FETCHING PROFILE <<<");
        try {
          // Fetch updated profile with timeout
          console.log(">>> About to fetch profile for user:", newSession.user.id);

          const profilePromise = supabase
            .from("profiles")
            .select("*")
            .eq("id", newSession.user.id)
            .single();

          const profileTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("profile fetch timeout in onAuthStateChange")), 5000)
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: profile, error } = await Promise.race([profilePromise, profileTimeout]) as any;

          console.log(">>> PROFILE FETCH COMPLETE <<<", {
            hasProfile: !!profile,
            errorCode: error?.code,
            errorMessage: error?.message
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
            console.log(">>> SETTING USER FROM PROFILE <<<", profile.id);
            setUserDebug(profile);
          } else if (error && error.code === "PGRST116") {
            console.log(">>> PGRST116 ERROR - CREATING MINIMAL USER <<<");
            const knownComplete = localStorage.getItem("profile_known_complete") === "true";
            const minimalUser = {
              id: newSession.user.id,
              email: newSession.user.email || "",
              profile_complete: knownComplete,
              phone_verified: false,
              user_type: "individual",
              isStub: true,
               
            } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            setUserDebug(minimalUser);
          } else {
            console.log(">>> OTHER ERROR - CREATING MINIMAL USER <<<");
            const knownComplete = localStorage.getItem("profile_known_complete") === "true";
            const minimalUser = {
              id: newSession.user.id,
              email: newSession.user.email || "",
              profile_complete: knownComplete,
              phone_verified: false,
              user_type: "individual",
              isStub: true,
               
            } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            setUserDebug(minimalUser);
          }
        } catch (err) {
          console.error(">>> EXCEPTION IN PROFILE FETCH <<<", err);
          const knownComplete = localStorage.getItem("profile_known_complete") === "true";
          const minimalUser = {
            id: newSession.user.id,
            email: newSession.user.email || "",
            profile_complete: knownComplete,
            phone_verified: false,
            user_type: "individual",
            isStub: true,
             
          } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
          setUserDebug(minimalUser);
        } finally {
          console.log(">>> FINALLY BLOCK <<<");
          // Check if there's pending profile data to sync
          const pendingProfile = localStorage.getItem("pending_profile");
          if (pendingProfile && newSession?.user?.id) {
            try {
              setIsLoading(true);
              const profileData = JSON.parse(pendingProfile);
              await syncPendingProfile(newSession.user.id, profileData);
            } catch (error) {
              console.error("Error parsing pending profile:", error);
            }
          }

          console.log(">>> SETTING isLoading to FALSE in onAuthStateChange <<<");
          setIsLoading(false);
        }
      } else {
        console.log(">>> NO SESSION <<<");
        setUserDebug(null);
        setIsLoading(false);
      }
      console.log(">>> AUTH STATE CHANGE CALLBACK END <<<");
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [syncPendingProfile, setUserDebug]);

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    isAuthenticated: !!session?.user,
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
