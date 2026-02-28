import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  isBffAuthEnabled,
  loginWithBff,
  logoutBffSession,
  requestPasswordRecoveryWithBff,
  resendSignupConfirmationWithBff,
  setBffSessionFromClient,
  signupWithBff,
  toSupabaseSessionInput,
} from "@/lib/bffAuth";
// BillionMail sync moved to AuthContext - only after email confirmation

export interface SignupData {
  email: string;
  password: string;
  phone: string;
  fullName?: string;
  captchaToken?: string;
}

export interface LoginData {
  email: string;
  password: string;
  captchaToken?: string;
}

export function useAuthOperations() {
  const { refreshUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logPwResetDiag = (step: string, details: Record<string, unknown> = {}) => {
    try {
      console.info("[PW-RESET-DIAG]", step, details);
    } catch {
      // Ignore logging failures.
    }
  };

  const signupWithEmail = async (data: SignupData) => {
    setIsLoading(true);
    setError(null);

    try {
      const profileData = {
        phone: data.phone,
        full_name: data.fullName || null,
        user_type: "individual",
      };

      if (isBffAuthEnabled()) {
        const signupData = await signupWithBff({
          email: data.email,
          password: data.password,
          captchaToken: data.captchaToken,
          profileData,
        });

        let bridgedSession = null;
        if (signupData?.session?.access_token) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession(
            toSupabaseSessionInput(signupData.session)
          );
          if (sessionError) throw sessionError;

          bridgedSession = sessionData.session;
          await refreshUserProfile();
        }

        return { user: signupData?.user ?? null, session: bridgedSession };
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
      // BillionMail sync disabled at signup
      // Will be triggered after email confirmation in AuthContext

      return { user: authData?.user ?? null, session: authData?.session ?? null };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Signup failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signupWithGoogle = async () => {
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
        const bffSession = await loginWithBff(data.email, data.password, data.captchaToken);
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
        email: data.email,
        password: data.password,
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

  const getRecoveryTokensFromHash = () => {
    if (typeof window === "undefined") {
      return null;
    }

    const rawHash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;

    const searchParams = new URLSearchParams(window.location.search);

    if (!rawHash) {
      logPwResetDiag("recovery_hash_missing", {
        hasCodeInQuery: searchParams.has("code"),
        queryType: searchParams.get("type"),
        hasTokenHashInQuery: searchParams.has("token_hash"),
      });
      return null;
    }

    const params = new URLSearchParams(rawHash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    logPwResetDiag("recovery_hash_parsed", {
      hashKeys: Array.from(params.keys()),
      hasAccessToken: Boolean(accessToken),
      hasRefreshToken: Boolean(refreshToken),
      hasCodeInQuery: searchParams.has("code"),
      queryType: searchParams.get("type"),
      hasTokenHashInQuery: searchParams.has("token_hash"),
    });

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
    };
  };

  const ensureRecoverySession = async () => {
    logPwResetDiag("ensure_recovery_session_start");

    const { data: currentSessionData } = await supabase.auth.getSession();

    if (currentSessionData.session) {
      logPwResetDiag("ensure_recovery_session_existing", {
        userId: currentSessionData.session.user?.id ?? null,
        expiresAt: currentSessionData.session.expires_at ?? null,
      });
      return currentSessionData.session;
    }

    logPwResetDiag("ensure_recovery_session_no_existing_session");

    const hashTokens = getRecoveryTokensFromHash();
    if (!hashTokens) {
      logPwResetDiag("ensure_recovery_session_no_hash_tokens");
      return null;
    }

    logPwResetDiag("ensure_recovery_session_set_session_attempt", {
      accessTokenLength: hashTokens.accessToken.length,
      refreshTokenLength: hashTokens.refreshToken.length,
    });

    const { data: hydratedSessionData, error: hydrationError } = await supabase.auth.setSession({
      access_token: hashTokens.accessToken,
      refresh_token: hashTokens.refreshToken,
    });

    if (hydrationError) {
      logPwResetDiag("ensure_recovery_session_set_session_failed", {
        errorName: hydrationError.name,
        errorMessage: hydrationError.message,
        errorStatus: (hydrationError as { status?: number }).status ?? null,
      });
      throw hydrationError;
    }

    logPwResetDiag("ensure_recovery_session_set_session_success", {
      hasHydratedSession: Boolean(hydratedSessionData.session),
      userId: hydratedSessionData.session?.user?.id ?? null,
      expiresAt: hydratedSessionData.session?.expires_at ?? null,
    });

    if (isBffAuthEnabled()) {
      await setBffSessionFromClient(hashTokens.accessToken, hashTokens.refreshToken)
        .then(() => {
          logPwResetDiag("ensure_recovery_session_bff_bridge_success");
        })
        .catch((bridgeError: unknown) => {
          logPwResetDiag("ensure_recovery_session_bff_bridge_failed", {
            errorName: bridgeError instanceof Error ? bridgeError.name : "UnknownError",
            errorMessage: bridgeError instanceof Error ? bridgeError.message : String(bridgeError),
          });
        });
    }

    return hydratedSessionData.session;
  };

  const updateUserPassword = async (newPassword: string) => {
    setIsLoading(true);
    setError(null);

    try {
      logPwResetDiag("update_password_submit_start", {
        passwordLength: newPassword.length,
      });

      const ensuredSession = await ensureRecoverySession();

      logPwResetDiag("update_password_after_ensure", {
        hasSession: Boolean(ensuredSession),
        userId: ensuredSession?.user?.id ?? null,
      });

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        logPwResetDiag("update_password_update_user_failed", {
          errorName: error.name,
          errorMessage: error.message,
          errorStatus: (error as { status?: number }).status ?? null,
        });
        throw error;
      }

      logPwResetDiag("update_password_update_user_success");
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Şifre güncellenemedi";
      logPwResetDiag("update_password_exception", {
        errorName: err instanceof Error ? err.name : "UnknownError",
        errorMessage: message,
      });
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
    logout,
    resendEmailConfirmation,
    changePassword,
    resetPassword,
    updateUserPassword,
  };
}
