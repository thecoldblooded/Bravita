import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  isBffAuthEnabled,
  loginWithBff,
  logoutBffSession,
  requestPasswordRecoveryWithBff,
  resendSignupConfirmationWithBff,
  signupWithBff,
  toSupabaseSessionInput,
} from "@/lib/bffAuth";
// BillionMail sync moved to AuthContext - only after email confirmation

export interface SignupData {
  email: string;
  password: string;
  phone: string;
  userType: "individual" | "company";
  companyName?: string;
  fullName?: string;
  captchaToken?: string;
}

export interface LoginData {
  email?: string;
  password?: string;
  username?: string;
  userType: "individual" | "company";
  captchaToken?: string;
}

export function useAuthOperations() {
  const { refreshUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signupWithEmail = async (data: SignupData) => {
    setIsLoading(true);
    setError(null);

    try {
      const profileData = {
        phone: data.phone,
        full_name: data.fullName || null,
        user_type: data.userType,
        company_name: data.userType === "company" ? data.companyName : null,
      };

      if (isBffAuthEnabled()) {
        const signupData = await signupWithBff({
          email: data.email,
          password: data.password,
          captchaToken: data.captchaToken,
          profileData,
        });

        if (!signupData?.user) {
          throw new Error("No user returned from signup");
        }

        let bridgedSession = null;
        if (signupData.session?.access_token) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession(
            toSupabaseSessionInput(signupData.session)
          );
          if (sessionError) throw sessionError;

          bridgedSession = sessionData.session;
          await refreshUserProfile();
        }

        return { user: signupData.user, session: bridgedSession };
      }

      const options = {
        data: profileData,
        ...(data.captchaToken ? { captchaToken: data.captchaToken } : {})
      };

      // Sign up with email and password - store user data in user_metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options,
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

      // BillionMail sync disabled at signup
      // Will be triggered after email confirmation in AuthContext

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
          redirectTo: `${window.location.origin}`,
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
      if (isBffAuthEnabled()) {
        const bffSession = await loginWithBff(data.email!, data.password!, data.captchaToken);
        if (!bffSession?.access_token) {
          throw new Error("BFF auth did not return a valid session");
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.setSession(
          toSupabaseSessionInput(bffSession)
        );

        if (sessionError) throw sessionError;

        await refreshUserProfile();
        return { user: sessionData.user, session: sessionData.session };
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email!,
        password: data.password!,
        options: data.captchaToken ? { captchaToken: data.captchaToken } : undefined,
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
        throw new Error("Geçersiz kullanıcı adı veya şifre");
      }

      // Sign in with the company's email
      if (isBffAuthEnabled()) {
        const bffSession = await loginWithBff(companyUser.email, data.password!, data.captchaToken);
        if (!bffSession?.access_token) {
          throw new Error("BFF auth did not return a valid company session");
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.setSession(
          toSupabaseSessionInput(bffSession)
        );

        if (sessionError) throw sessionError;

        await refreshUserProfile();
        return { user: sessionData.user, session: sessionData.session };
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: companyUser.email,
        password: data.password!,
        options: data.captchaToken ? { captchaToken: data.captchaToken } : undefined,
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

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear our custom localStorage items first
      localStorage.removeItem("profile_known_complete");
      localStorage.removeItem("pending_profile");
      localStorage.removeItem("profile_complete_pending");
      localStorage.removeItem("profile_in_progress");
      localStorage.removeItem("oauth_provider");

      sessionStorage.removeItem("bravita-session-token");
      localStorage.removeItem("bravita-session-token");

      if (isBffAuthEnabled()) {
        await logoutBffSession();
      }

      await supabase.auth.signOut({ scope: "local" });

    } catch (err) {
      console.error("Logout error details:", err);
      const message = err instanceof Error ? err.message : "Logout failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendEmailConfirmation = async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isBffAuthEnabled()) {
        await resendSignupConfirmationWithBff(email);
        return { success: true };
      }

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

  const changePassword = async (oldPassword: string, newPassword: string, captchaToken?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error("Kullanıcı bulunamadı");

      if (isBffAuthEnabled()) {
        const bffSession = await loginWithBff(user.email, oldPassword, captchaToken);
        if (!bffSession?.access_token) {
          throw new Error("Mevcut şifreniz hatalı. Lütfen tekrar deneyin.");
        }

        const { error: sessionError } = await supabase.auth.setSession(toSupabaseSessionInput(bffSession));
        if (sessionError) throw sessionError;
      } else {
        // Verify old password by attempting a sign in
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: oldPassword,
          options: {
            captchaToken: captchaToken
          }
        });

        if (verifyError) {
          throw new Error("Mevcut şifreniz hatalı. Lütfen tekrar deneyin.");
        }
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

  const resetPassword = async (email: string, captchaToken?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isBffAuthEnabled()) {
        await requestPasswordRecoveryWithBff(email, `${window.location.origin}/update-password`, captchaToken);
        return { success: true };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
        captchaToken,
      });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Şifre sıfırlama işlemi başarısız";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserPassword = async (newPassword: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Şifre güncellenemedi";
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
    resetPassword,
    updateUserPassword,
  };
}
