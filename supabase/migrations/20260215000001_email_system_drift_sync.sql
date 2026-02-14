-- Reconcile email system drift between remote and local migrations
-- This migration captures schema differences detected by CI and aligns them with the local unification strategy.

-- 1. Align email_templates table and resolve constraint conflicts
DO $$
BEGIN
    -- Drop the restrictive old check constraint if it exists so we can migrate data
    ALTER TABLE public.email_templates DROP CONSTRAINT IF EXISTS "email_templates_unresolved_token_policy_check";

    -- Align data: 'keep'/'remove' -> 'warn', 'error' -> 'block'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'unresolved_token_policy') THEN
        UPDATE public.email_templates 
        SET unresolved_token_policy = CASE 
            WHEN unresolved_token_policy IN ('keep', 'remove', 'empty', 'warn') THEN 'warn' 
            WHEN unresolved_token_policy = 'error' THEN 'block'
            ELSE 'block' 
        END;
    END IF;

    -- Rename unresolved_token_policy to unresolved_policy
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'unresolved_token_policy'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'unresolved_policy'
        ) THEN
            ALTER TABLE public.email_templates RENAME COLUMN unresolved_token_policy TO unresolved_policy;
        ELSE
            -- Both exist, sync and drop
            UPDATE public.email_templates SET unresolved_policy = unresolved_token_policy;
            ALTER TABLE public.email_templates DROP COLUMN IF EXISTS unresolved_token_policy;
        END IF;
    END IF;
END $$;

-- 2. Align email_variable_registry table
DO $$
BEGIN
    -- Add missing columns from unification plan
    ALTER TABLE public.email_variable_registry ADD COLUMN IF NOT EXISTS "label" TEXT;
    ALTER TABLE public.email_variable_registry ADD COLUMN IF NOT EXISTS "value_type" TEXT DEFAULT 'string';
    ALTER TABLE public.email_variable_registry ADD COLUMN IF NOT EXISTS "render_policy" TEXT DEFAULT 'escaped_text';
    ALTER TABLE public.email_variable_registry ADD COLUMN IF NOT EXISTS "is_sensitive" BOOLEAN DEFAULT false;
    ALTER TABLE public.email_variable_registry ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
    ALTER TABLE public.email_variable_registry ADD COLUMN IF NOT EXISTS "sample_value" TEXT;

    -- Map remote specific columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_variable_registry' AND column_name = 'example_value') THEN
        UPDATE public.email_variable_registry SET sample_value = example_value WHERE sample_value IS NULL;
        ALTER TABLE public.email_variable_registry DROP COLUMN IF EXISTS example_value;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_variable_registry' AND column_name = 'is_protected') THEN
        UPDATE public.email_variable_registry SET is_sensitive = is_protected WHERE is_protected = true;
        ALTER TABLE public.email_variable_registry DROP COLUMN IF EXISTS is_protected;
    END IF;

    -- Ensure labels are populated
    UPDATE public.email_variable_registry SET label = key WHERE label IS NULL;
END $$;

-- 3. Align email_template_variables table
DO $$
BEGIN
    -- Rename remote unique constraint to match local migration name
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_template_variables_template_slug_variable_key_key') THEN
        ALTER TABLE public.email_template_variables RENAME CONSTRAINT email_template_variables_template_slug_variable_key_key TO email_template_variables_unique;
    END IF;

    -- Add missing columns from unification plan
    ALTER TABLE public.email_template_variables ADD COLUMN IF NOT EXISTS "insertion_order" INT DEFAULT 0;
    ALTER TABLE public.email_template_variables ADD COLUMN IF NOT EXISTS "is_enabled" BOOLEAN DEFAULT true;
    ALTER TABLE public.email_template_variables ADD COLUMN IF NOT EXISTS "source_token" TEXT;

    -- Map fallback_value (found on remote) to dummy source_token if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_template_variables' AND column_name = 'fallback_value') THEN
        ALTER TABLE public.email_template_variables DROP COLUMN IF EXISTS fallback_value;
    END IF;
END $$;

-- 4. Resolve Constraint and Trigger Drift specifically mentioned in CI output
-- Primary Key Constraint for email_variable_registry
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_variable_registry_pkey') THEN
        ALTER TABLE "public"."email_variable_registry" ADD CONSTRAINT "email_variable_registry_pkey" PRIMARY KEY ("key");
    END IF;
END $$;

-- Check constraint for unresolved_policy
ALTER TABLE "public"."email_templates" DROP CONSTRAINT IF EXISTS "email_templates_unresolved_token_policy_check";
ALTER TABLE "public"."email_templates" DROP CONSTRAINT IF EXISTS "email_templates_unresolved_policy_check";

ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_unresolved_policy_check" 
CHECK (unresolved_policy IN ('block', 'warn', 'allowlist_fallback')) NOT VALID;
ALTER TABLE "public"."email_templates" VALIDATE CONSTRAINT "email_templates_unresolved_policy_check";

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_updated_at_email_variable_registry ON public.email_variable_registry;
CREATE TRIGGER set_updated_at_email_variable_registry
    BEFORE UPDATE ON public.email_variable_registry
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_email_template_variables ON public.email_template_variables;
CREATE TRIGGER set_updated_at_email_template_variables
    BEFORE UPDATE ON public.email_template_variables
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
