
-- Final remaining drift resolution based on deep dive into production schema.
-- This handles foreign key delete rules, complex check constraints, and index refinements.

BEGIN;

-- 1. Profiles Check Constraints Alignment
-- Production has specific logic for company vs individual profile requirements.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_company_name_required_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_company_name_required_check 
    CHECK (user_type <> 'company' OR (company_name IS NOT NULL AND length(TRIM(company_name)) >= 1));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_full_name_min_length_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_full_name_min_length_check 
    CHECK (user_type = 'company' OR full_name IS NULL OR length(TRIM(full_name)) >= 2);

-- 2. Foreign Key "ON DELETE CASCADE" Alignment
-- production matches: orders -> profiles should cascade delete.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- production matches: profiles -> auth.users should cascade delete.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Data Type Refinement (Syncing to TIMESTAMPTZ)
ALTER TABLE public.profiles ALTER COLUMN phone_verified_at SET DATA TYPE TIMESTAMPTZ;

-- 4. Audit & Email Log Index Refinement
CREATE INDEX IF NOT EXISTS idx_email_logs_mode_blocked ON public.email_logs (mode, blocked);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs (sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_slug_sent_at ON public.email_logs (template_slug, sent_at);

-- 5. Alignment for Products defaults
ALTER TABLE public.products 
    ALTER COLUMN stock SET DEFAULT 0,
    ALTER COLUMN max_quantity_per_order SET DEFAULT 10,
    ALTER COLUMN reserved_stock SET DEFAULT 0;

COMMIT;
