
-- Final schema alignment to resolve remaining drift found in CI.
-- Specifically addresses missing column in email_templates.

BEGIN;

-- 1. Email Templates Column Alignment
-- Production has unresolved_policy column which was missing in migrations.
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS unresolved_policy TEXT DEFAULT 'block'::text;

-- 2. Cleanup double triggers or inconsistent naming if any
-- (We already did some in 20260216220000_cleanup_duplicate_triggers.sql)

-- 3. Ensure consistent check constraints
ALTER TABLE public.email_templates DROP CONSTRAINT IF EXISTS email_templates_unresolved_policy_check;
ALTER TABLE public.email_templates ADD CONSTRAINT email_templates_unresolved_policy_check 
    CHECK (unresolved_policy = ANY (ARRAY['block'::text, 'warn'::text, 'allowlist_fallback'::text]));

COMMIT;
