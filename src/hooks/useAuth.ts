import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface SignupData {
  email: string;
  password: string;
  phone: string;
  userType: "individual" | "company";
  companyName?: string;
  fullName?: string;
}

export interface LoginData {
  email?: string;
  password?: string;
  username?: string;
  userType: "individual" | "company";
}

export function useAuthOperations() {
  const { refreshUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signupWithEmail = async (data: SignupData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Sign up with email and password - store user data in user_metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            phone: data.phone,
            full_name: data.fullName || null,
            user_type: data.userType,
            company_name: data.userType === "company" ? data.companyName : null,
          },
        },
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.includes("already registered") ||
          authError.message.includes("already exists") ||
          authError.message.includes("User already registered")) {
          throw new Error("Bu e-posta adresi ile kayıtlı bir hesap zaten var");
        }
        throw authError;
      }
      if (!authData.user) throw new Error("No user returned from signup");

      // Profile will be created by database trigger or after email confirmation
      // The user_metadata contains all necessary info for profile creation

      return { user: authData.user, session: authData.session };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Signup failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signupWithGoogle = async (data: Omit<SignupData, "email" | "password">) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/complete-profile`,
        },
      });

      if (authError) throw authError;

      // Profile will be created after OAuth callback
      return authData;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Google signup failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = async (data: LoginData) => {
    setIsLoading(true);
    setError(null);

    try {
      // TEST USER BYPASS - Remove in production!
      const TEST_EMAIL = "test@test.com";
      const TEST_PASSWORD = "test123";

      if (data.email === TEST_EMAIL && data.password === TEST_PASSWORD) {
        // Create mock session for test user
        const mockUser = {
          id: "test-user-id-12345",
          email: TEST_EMAIL,
          user_metadata: {
            full_name: "Test Kullanıcı",
            phone: "+905551234567",
            user_type: "individual",
            is_admin: true, // Mock admin access
          },
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        };

        const mockSession = {
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: "bearer",
          user: mockUser,
        };

        // Store mock session in localStorage for persistence
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const urlMatch = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/);
        if (urlMatch) {
          const projectRef = urlMatch[1];
          const storageKey = `sb-${projectRef}-auth-token`;
          localStorage.setItem(storageKey, JSON.stringify(mockSession));
        }

        // Set profile_known_complete for test user
        localStorage.setItem("profile_known_complete", "true");

        // Trigger a page reload to reinitialize auth with mock session
        window.location.reload();

        return { user: mockUser as any, session: mockSession as any };
      }
      // END TEST USER BYPASS

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email!,
        password: data.password!,
      });

      if (authError) throw authError;

      await refreshUserProfile();
      return { user: authData.user, session: authData.session };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCompany = async (data: LoginData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Query users table for company login
      const { data: companyUser, error: queryError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "company")
        .ilike("full_name", `%${data.username}%`) // Using full_name as username field
        .single();

      if (queryError || !companyUser) {
        throw new Error("Company credentials not found");
      }

      // Sign in with the company's email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: companyUser.email,
        password: data.password!,
      });

      if (authError) throw authError;

      await refreshUserProfile();
      return { user: authData.user, session: authData.session };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Company login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear our custom localStorage items first
      localStorage.removeItem("profile_known_complete");
      localStorage.removeItem("pending_profile");
      localStorage.removeItem("profile_complete_pending");
      localStorage.removeItem("profile_in_progress");
      localStorage.removeItem("oauth_provider");

      // Clear Supabase session from localStorage immediately for instant UI feedback
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const urlMatch = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (urlMatch) {
        const projectRef = urlMatch[1];
        const storageKey = `sb-${projectRef}-auth-token`;
        localStorage.removeItem(storageKey);
      }

      // Sign out from server (don't await to make logout faster)
      // Use local scope to avoid slow network request
      supabase.auth.signOut({ scope: 'local' }).catch((err) => {
        console.warn("Background signOut error (ignorable):", err);
      });

    } catch (err) {
      console.error("Logout error details:", err);
      const message = err instanceof Error ? err.message : "Logout failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resendEmailConfirmation = async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "E-posta gönderilemedi";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error("Kullanıcı bulunamadı");

      // Verify old password by attempting a sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (verifyError) {
        throw new Error("Mevcut şifreniz hatalı. Lütfen tekrar deneyin.");
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Şifre değiştirilemedi";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    signupWithEmail,
    signupWithGoogle,
    loginWithEmail,
    loginWithCompany,
    logout,
    resendEmailConfirmation,
    changePassword,
  };
}
