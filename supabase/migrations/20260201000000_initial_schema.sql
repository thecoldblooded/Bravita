-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_superadmin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create addresses table
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    street TEXT,
    city TEXT,
    postal_code TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    max_quantity_per_order INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    shipping_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    order_details JSONB,
    currency TEXT DEFAULT 'TL',
    installment_number INTEGER DEFAULT 1,
    item_total_cents BIGINT,
    vat_total_cents BIGINT,
    shipping_total_cents BIGINT,
    discount_total_cents BIGINT,
    commission_amount_cents BIGINT,
    paid_total_cents BIGINT,
    total DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create order_status_history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Placeholder functions for downstream migrations
CREATE OR REPLACE FUNCTION public.verify_promo_code(p_code text) RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END; $$;
CREATE OR REPLACE FUNCTION public.manage_inventory() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.handle_new_order_promo() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN RETURN FALSE; END; $$;
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid) RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN RETURN FALSE; END; $$;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN RETURN FALSE; END; $$;
CREATE OR REPLACE FUNCTION public.create_order(p_items jsonb, p_shipping_address_id uuid, p_payment_method text, p_promo_code text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END; $$;
CREATE OR REPLACE FUNCTION public.admin_set_user_admin(p_user_id uuid, p_is_admin boolean) RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN RETURN FALSE; END; $$;
CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id uuid, p_new_status text) RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN RETURN FALSE; END; $$;
CREATE OR REPLACE FUNCTION public.admin_get_all_orders(p_status text DEFAULT NULL, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0) 
RETURNS TABLE (id UUID, user_id UUID, total DECIMAL, status TEXT, created_at TIMESTAMPTZ, user_email TEXT, user_name TEXT) 
LANGUAGE plpgsql AS $$ BEGIN RETURN; END; $$;
CREATE OR REPLACE FUNCTION public.sanitize_search_input(input_text text) RETURNS text LANGUAGE plpgsql AS $$ BEGIN RETURN input_text; END; $$;
CREATE OR REPLACE FUNCTION public.log_admin_action() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$;
