import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please copy .env.local.example to .env.local and add your Supabase credentials."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
