-- Initial Schema for Bravita
-- Created: 2026-02-01

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) PRIMARY KEY,
    email character varying(255) UNIQUE NOT NULL,
    full_name character varying(255),
    phone character varying(20),
    user_type character varying(50) DEFAULT 'individual'::character varying,
    profile_complete boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Addresses Table
CREATE TABLE IF NOT EXISTS public.addresses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    street character varying NOT NULL,
    city character varying NOT NULL,
    postal_code character varying NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    price numeric NOT NULL,
    image_url text,
    stock integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    shipping_address_id uuid REFERENCES public.addresses(id),
    status character varying(50) DEFAULT 'pending'::character varying,
    payment_method character varying(50) DEFAULT 'credit_card'::character varying,
    payment_status character varying(50) DEFAULT 'pending'::character varying,
    currency text DEFAULT 'TL'::text,
    order_details jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 5. Order Status History Table
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    status character varying NOT NULL,
    note text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
