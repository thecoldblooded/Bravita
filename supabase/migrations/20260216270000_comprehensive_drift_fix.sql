
-- Final comprehensive drift resolution based on deep dive into production schema.
-- This aligns all remaining discrepancies in columns, defaults, and triggers.

BEGIN;

-- 1. email_templates: Missing columns found in production
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS allow_raw_html BOOLEAN DEFAULT false;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS is_auth_critical BOOLEAN DEFAULT false;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS allowlist_fallback_keys TEXT[] DEFAULT ARRAY[]::text[];
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS normalization_version INTEGER DEFAULT 1;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS editor_schema JSONB DEFAULT '{}'::jsonb;

-- Ensure NOT NULL where appropriate
ALTER TABLE public.email_templates ALTER COLUMN is_auth_critical SET NOT NULL;
ALTER TABLE public.email_templates ALTER COLUMN allowlist_fallback_keys SET NOT NULL;
ALTER TABLE public.email_templates ALTER COLUMN normalization_version SET NOT NULL;
ALTER TABLE public.email_templates ALTER COLUMN editor_schema SET NOT NULL;

-- 2. admin_audit_log: Align defaults and nullability
-- Production uses uuid_generate_v4() and enforces admin_user_id
ALTER TABLE public.admin_audit_log ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE public.admin_audit_log ALTER COLUMN admin_user_id SET NOT NULL;

-- 3. Missing updated_at triggers
-- email_variable_registry
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_email_variable_registry') THEN
        CREATE TRIGGER set_updated_at_email_variable_registry 
        BEFORE UPDATE ON public.email_variable_registry 
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- email_template_variables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_email_template_variables') THEN
        CREATE TRIGGER set_updated_at_email_template_variables 
        BEFORE UPDATE ON public.email_template_variables 
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- 4. Ensure handle_updated_at is using timezone('utc'::text, now()) globally
CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$function$;

-- 5. Additional column alignment for email_logs (ensure all possible columns are present)
-- (Checked earlier, but ensuring robustness)
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS template_version INTEGER;

COMMIT;
