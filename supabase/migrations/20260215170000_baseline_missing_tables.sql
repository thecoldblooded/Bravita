-- Baseline migration for tables found in production but missing from repository history
-- This ensures that the local development environment and CI/CD can recreate the exact schema.

-- 1. admin_audit_log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_table TEXT,
    target_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
COMMENT ON TABLE public.admin_audit_log IS 'Admin işlem logları - GDPR compliance';
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- 2. email_logs
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    email_type TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    recipient TEXT,
    template_slug TEXT,
    subject TEXT,
    content_snapshot TEXT,
    error_details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    recipient_email TEXT,
    render_warnings JSONB DEFAULT '[]'::jsonb,
    unresolved_tokens JSONB DEFAULT '[]'::jsonb,
    blocked BOOLEAN DEFAULT false,
    degradation_active BOOLEAN DEFAULT false,
    degradation_reason TEXT,
    mode TEXT CHECK (mode IS NULL OR mode IN ('send', 'test', 'browser_preview')),
    template_version INTEGER
);
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- 3. payment_intents
CREATE TABLE IF NOT EXISTS public.payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    shipping_address_id UUID REFERENCES public.addresses(id),
    payment_method TEXT DEFAULT 'credit_card' CHECK (payment_method IN ('credit_card', 'bank_transfer')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_3d', 'paid', 'failed', 'void_pending', 'voided', 'expired', 'refund_pending', 'refunded')),
    idempotency_key TEXT UNIQUE,
    idempotency_expires_at TIMESTAMP WITH TIME ZONE,
    currency TEXT DEFAULT 'TL',
    item_total_cents BIGINT CHECK (item_total_cents >= 0),
    vat_total_cents BIGINT CHECK (vat_total_cents >= 0),
    shipping_total_cents BIGINT CHECK (shipping_total_cents >= 0),
    discount_total_cents BIGINT DEFAULT 0 CHECK (discount_total_cents >= 0),
    base_total_cents BIGINT CHECK (base_total_cents >= 0),
    commission_rate NUMERIC DEFAULT 0 CHECK (commission_rate >= 0),
    commission_amount_cents BIGINT DEFAULT 0 CHECK (commission_amount_cents >= 0),
    paid_total_cents BIGINT CHECK (paid_total_cents >= 0),
    installment_number INTEGER DEFAULT 1 CHECK (installment_number BETWEEN 1 AND 12),
    cart_snapshot JSONB,
    pricing_snapshot JSONB,
    provider TEXT DEFAULT 'bakiyem',
    merchant_ref TEXT,
    gateway_trx_code TEXT,
    gateway_status TEXT,
    return_url TEXT,
    fail_url TEXT,
    threed_session_ref TEXT,
    threed_payload_encrypted TEXT,
    encryption_key_version TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '15 minutes'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- 4. payment_transactions
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id UUID REFERENCES public.payment_intents(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    operation TEXT CHECK (operation IN ('init_3d', 'finalize', 'void', 'refund', 'capture', 'inquiry')),
    request_payload JSONB,
    response_payload JSONB,
    success BOOLEAN DEFAULT false,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 5. payment_webhook_events
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT DEFAULT 'bakiyem',
    intent_id UUID REFERENCES public.payment_intents(id),
    gateway_trx_code TEXT,
    other_trx_code TEXT,
    result_code TEXT,
    payload_hash TEXT NOT NULL,
    event_dedupe_key TEXT UNIQUE NOT NULL,
    payload JSONB NOT NULL,
    processing_status TEXT DEFAULT 'received' CHECK (processing_status IN ('received', 'ignored', 'processed', 'failed')),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- 6. payment_manual_review_queue
CREATE TABLE IF NOT EXISTS public.payment_manual_review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id UUID REFERENCES public.payment_intents(id),
    order_id UUID REFERENCES public.orders(id),
    reason TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
    dedupe_key TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.payment_manual_review_queue ENABLE ROW LEVEL SECURITY;

-- 7. stock_reservations
CREATE TABLE IF NOT EXISTS public.stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id UUID REFERENCES public.payment_intents(id),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL CHECK (qty > 0),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    released_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

-- 8. installment_rates
CREATE TABLE IF NOT EXISTS public.installment_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_number INTEGER UNIQUE NOT NULL CHECK (installment_number BETWEEN 1 AND 12),
    commission_rate NUMERIC NOT NULL CHECK (commission_rate >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.installment_rates ENABLE ROW LEVEL SECURITY;

-- 9. integration_rate_limits
CREATE TABLE IF NOT EXISTS public.integration_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID,
    actor_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.integration_rate_limits ENABLE ROW LEVEL SECURITY;

-- 10. promo_code_attempts
CREATE TABLE IF NOT EXISTS public.promo_code_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    ip_address TEXT,
    attempt_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.promo_code_attempts ENABLE ROW LEVEL SECURITY;

-- 11. email_variable_registry
CREATE TABLE IF NOT EXISTS public.email_variable_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    label TEXT,
    value_type TEXT DEFAULT 'string',
    render_policy TEXT DEFAULT 'escaped_text',
    is_sensitive BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sample_value TEXT
);
ALTER TABLE public.email_variable_registry ENABLE ROW LEVEL SECURITY;

-- 12. email_template_variables
CREATE TABLE IF NOT EXISTS public.email_template_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_slug TEXT REFERENCES public.email_templates(slug) ON DELETE CASCADE,
    variable_key TEXT REFERENCES public.email_variable_registry(key),
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    insertion_order INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    source_token TEXT
);
ALTER TABLE public.email_template_variables ENABLE ROW LEVEL SECURITY;

-- 12a. Critical Functions Baseline (Missing in some repos but present in remote)
CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (SELECT auth.uid()) AND (is_admin = true OR is_superadmin = true)
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_status boolean;
BEGIN
  SELECT is_admin INTO admin_status
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;
  RETURN COALESCE(admin_status, false);
END;
$function$;

-- 13. site_settings (Baseline as seen in production if not already created)
-- Note: site_settings is usually created in 20260210121836, but let's ensure it has all columns correctly.
-- We use DO blocks to avoid errors if partially created.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'site_settings') THEN
        CREATE TABLE public.site_settings (
            id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
            vat_rate NUMERIC DEFAULT 0.20,
            shipping_cost NUMERIC DEFAULT 49.90,
            free_shipping_threshold NUMERIC DEFAULT 1500.00,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            bank_name TEXT DEFAULT 'Ziraat Bankası',
            bank_iban TEXT DEFAULT 'TR00 0000 0000 0000 0000 0000 00',
            bank_account_holder TEXT DEFAULT 'Bravita Sağlık A.Ş.'
        );
        INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
    END IF;
END $$;
