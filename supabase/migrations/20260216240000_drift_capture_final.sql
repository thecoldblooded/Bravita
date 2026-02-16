
-- Final Schema Reconciliation to capture all manual changes and resolve persistent CI drift.
-- This migration ensures that every column and constraint found in production is properly documented in the migration history.

-- 1. Profiles Table Alignment
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS company_name character varying(255);

-- 2. Addresses Table Alignment
ALTER TABLE public.addresses 
    ADD COLUMN IF NOT EXISTS address_type character varying(20) DEFAULT 'home' NOT NULL;

-- 3. Products Table Alignment
ALTER TABLE public.products 
    ADD COLUMN IF NOT EXISTS max_quantity_per_order INTEGER DEFAULT 10 NOT NULL,
    ADD COLUMN IF NOT EXISTS reserved_stock INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS original_price NUMERIC;

-- 4. Orders Table Alignment
ALTER TABLE public.orders 
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 5. Final Audit: Ensure all expected extensions are strictly enabled
-- These are already in 20260216230000, but we re-verify here for documentation.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 6. Trigger Consistency (Documentation/Precaution)
-- Ensure updated_at triggers use handle_updated_at() everywhere.
DO $$
BEGIN
    -- profiles
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_profiles') THEN
        CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
    END IF;
    -- products
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_products') THEN
        CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
    END IF;
END $$;
