-- Payment intents foundation for Bakiyem 3D flow
-- Source of truth: payment_intents + stock_reservations + payment_transactions

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Installment commission rates (percent values)
CREATE TABLE IF NOT EXISTS public.installment_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_number INTEGER NOT NULL UNIQUE CHECK (installment_number BETWEEN 1 AND 12),
    commission_rate NUMERIC(5,2) NOT NULL CHECK (commission_rate >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.installment_rates (installment_number, commission_rate, is_active)
VALUES
    (1, 4.50, TRUE),
    (2, 8.71, TRUE),
    (3, 10.78, TRUE),
    (4, 12.87, TRUE),
    (5, 14.93, TRUE),
    (6, 17.00, TRUE),
    (7, 19.10, TRUE),
    (8, 21.18, TRUE),
    (9, 23.25, TRUE),
    (10, 25.35, FALSE),
    (11, 27.43, FALSE),
    (12, 29.51, FALSE)
ON CONFLICT (installment_number)
DO UPDATE SET
    commission_rate = EXCLUDED.commission_rate,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
CREATE TABLE IF NOT EXISTS public.payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shipping_address_id UUID NOT NULL REFERENCES public.addresses(id) ON DELETE RESTRICT,
    payment_method TEXT NOT NULL DEFAULT 'credit_card' CHECK (payment_method IN ('credit_card', 'bank_transfer')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'awaiting_3d', 'paid', 'failed', 'void_pending', 'voided', 'expired', 'refund_pending', 'refunded')
    ),
    idempotency_key TEXT NOT NULL UNIQUE,
    idempotency_expires_at TIMESTAMPTZ NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TL' CHECK (currency = 'TL'),
    item_total_cents BIGINT NOT NULL CHECK (item_total_cents >= 0),
    vat_total_cents BIGINT NOT NULL CHECK (vat_total_cents >= 0),
    shipping_total_cents BIGINT NOT NULL CHECK (shipping_total_cents >= 0),
    discount_total_cents BIGINT NOT NULL DEFAULT 0 CHECK (discount_total_cents >= 0),
    base_total_cents BIGINT NOT NULL CHECK (base_total_cents >= 0),
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (commission_rate >= 0),
    commission_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (commission_amount_cents >= 0),
    paid_total_cents BIGINT NOT NULL CHECK (paid_total_cents >= 0),
    installment_number INTEGER NOT NULL DEFAULT 1 CHECK (installment_number BETWEEN 1 AND 12),
    cart_snapshot JSONB NOT NULL,
    pricing_snapshot JSONB NOT NULL,
    provider TEXT NOT NULL DEFAULT 'bakiyem',
    merchant_ref TEXT,
    gateway_trx_code TEXT,
    gateway_status TEXT,
    return_url TEXT,
    fail_url TEXT,
    threed_session_ref TEXT,
    threed_payload_encrypted TEXT,
    encryption_key_version TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minute'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id UUID NOT NULL REFERENCES public.payment_intents(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL CHECK (qty > 0),
    expires_at TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_reservations_active_unique
    ON public.stock_reservations (intent_id, product_id)
    WHERE released_at IS NULL;
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id UUID REFERENCES public.payment_intents(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    operation TEXT NOT NULL CHECK (operation IN ('init_3d', 'finalize', 'void', 'refund', 'capture', 'inquiry')),
    request_payload JSONB,
    response_payload JSONB,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'bakiyem',
    intent_id UUID REFERENCES public.payment_intents(id) ON DELETE SET NULL,
    gateway_trx_code TEXT,
    other_trx_code TEXT,
    result_code TEXT,
    payload_hash TEXT NOT NULL,
    event_dedupe_key TEXT NOT NULL UNIQUE,
    payload JSONB NOT NULL,
    processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received', 'ignored', 'processed', 'failed')),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.payment_manual_review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id UUID REFERENCES public.payment_intents(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
    dedupe_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dedupe_key)
);
-- Existing table alignment for order-last card flow
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_intent_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TL';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS installment_number INTEGER;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS item_total_cents BIGINT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vat_total_cents BIGINT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_total_cents BIGINT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_total_cents BIGINT DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS commission_amount_cents BIGINT DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_total_cents BIGINT;
UPDATE public.orders
SET currency = 'TL'
WHERE currency IS NULL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_payment_intent_id_fkey'
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_payment_intent_id_fkey
            FOREIGN KEY (payment_intent_id) REFERENCES public.payment_intents(id) ON DELETE RESTRICT;
    END IF;
END$$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_intent_unique
    ON public.orders (payment_intent_id)
    WHERE payment_intent_id IS NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_credit_card_requires_intent'
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_credit_card_requires_intent
            CHECK (payment_method <> 'credit_card' OR payment_intent_id IS NOT NULL) NOT VALID;
    END IF;
END$$;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_currency_tl_only'
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_currency_tl_only
            CHECK (currency = 'TL') NOT VALID;
    END IF;
END$$;
-- Remove legacy trigger-driven stock flow (new flow uses reservation RPCs)
DROP TRIGGER IF EXISTS trigger_deduct_stock ON public.orders;
DROP TRIGGER IF EXISTS trigger_manage_stock_status ON public.orders;
-- Lightweight updated_at helper for payment tables
CREATE OR REPLACE FUNCTION public.set_payment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_installment_rates_updated_at ON public.installment_rates;
CREATE TRIGGER trg_installment_rates_updated_at
    BEFORE UPDATE ON public.installment_rates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_payment_updated_at();
DROP TRIGGER IF EXISTS trg_payment_intents_updated_at ON public.payment_intents;
CREATE TRIGGER trg_payment_intents_updated_at
    BEFORE UPDATE ON public.payment_intents
    FOR EACH ROW
    EXECUTE FUNCTION public.set_payment_updated_at();
DROP TRIGGER IF EXISTS trg_manual_review_queue_updated_at ON public.payment_manual_review_queue;
CREATE TRIGGER trg_manual_review_queue_updated_at
    BEFORE UPDATE ON public.payment_manual_review_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.set_payment_updated_at();
-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_created ON public.payment_intents (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status_expires ON public.payment_intents (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_intents_gateway_trx ON public.payment_intents (gateway_trx_code);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_intent_created ON public.payment_transactions (intent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_created ON public.payment_transactions (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_intent_created ON public.payment_webhook_events (intent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status_created ON public.payment_webhook_events (processing_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_review_status_created ON public.payment_manual_review_queue (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires_active ON public.stock_reservations (expires_at)
    WHERE released_at IS NULL;
-- RLS rules
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_manual_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_intents FROM anon, authenticated;
REVOKE ALL ON public.stock_reservations FROM anon, authenticated;
REVOKE ALL ON public.payment_transactions FROM anon, authenticated;
REVOKE ALL ON public.payment_webhook_events FROM anon, authenticated;
REVOKE ALL ON public.payment_manual_review_queue FROM anon, authenticated;
REVOKE ALL ON public.installment_rates FROM anon, authenticated;
GRANT SELECT ON public.payment_intents TO authenticated;
GRANT SELECT ON public.installment_rates TO authenticated;
DROP POLICY IF EXISTS "Users read own payment intents" ON public.payment_intents;
CREATE POLICY "Users read own payment intents"
ON public.payment_intents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users read installment rates" ON public.installment_rates;
CREATE POLICY "Users read installment rates"
ON public.installment_rates
FOR SELECT
TO authenticated
USING (TRUE);
COMMIT;
