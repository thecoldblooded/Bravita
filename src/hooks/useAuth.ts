import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

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
      // Sign up with email and password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        phone: data.phone,
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

      // Create profile in database
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: authData.user.id,
            email: data.email,
            phone: data.phone,
            user_type: data.userType,
            full_name: data.fullName || null,
            company_name: data.userType === "company" ? data.companyName : null,
            profile_complete: false,
            phone_verified: false,
            oauth_provider: null,
          },
        ]);

      if (profileError) {
        // Check for duplicate email in profiles
        if (profileError.code === "23505") {
          throw new Error("Bu kullanıcı zaten kayıtlı");
        }
        throw profileError;
      }

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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Logout failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const sendPhoneVerificationCode = async (phone: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          shouldCreateUser: false, // Only for existing users
        },
      });

      if (error) throw error;
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send verification code";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneCode = async (phone: string, token: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: token,
        type: "sms",
      });

      if (error) throw error;
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid verification code";
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
    sendPhoneVerificationCode,
    verifyPhoneCode,
  };
}
