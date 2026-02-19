BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_template_sync_idempotency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    request_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_status INTEGER NOT NULL DEFAULT 102 CHECK (response_status BETWEEN 100 AND 599),
    response_body JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_template_sync_idempotency_actor_key
ON public.auth_template_sync_idempotency (actor_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_auth_template_sync_idempotency_actor_created
ON public.auth_template_sync_idempotency (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_template_sync_idempotency_created
ON public.auth_template_sync_idempotency (created_at DESC);

ALTER TABLE public.auth_template_sync_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can insert auth template sync idempotency" ON public.auth_template_sync_idempotency;
CREATE POLICY "System can insert auth template sync idempotency"
ON public.auth_template_sync_idempotency
FOR INSERT
TO service_role
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "System can read auth template sync idempotency" ON public.auth_template_sync_idempotency;
CREATE POLICY "System can read auth template sync idempotency"
ON public.auth_template_sync_idempotency
FOR SELECT
TO service_role
USING (TRUE);

DROP POLICY IF EXISTS "System can update auth template sync idempotency" ON public.auth_template_sync_idempotency;
CREATE POLICY "System can update auth template sync idempotency"
ON public.auth_template_sync_idempotency
FOR UPDATE
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

DO $$
BEGIN
    IF to_regprocedure('public.handle_updated_at()') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'set_updated_at_auth_template_sync_idempotency'
              AND tgrelid = 'public.auth_template_sync_idempotency'::regclass
        ) THEN
            CREATE TRIGGER set_updated_at_auth_template_sync_idempotency
            BEFORE UPDATE ON public.auth_template_sync_idempotency
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
        END IF;
    END IF;
END
$$;

COMMIT;
