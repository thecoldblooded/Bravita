-- Phase 1: Email Template Unification Foundation
-- Adds:
-- 1) Global variable registry
-- 2) Template-variable mapping with ordering
-- 3) Template unresolved-token policy fields
-- 4) Extended email log metadata
-- 5) Backfill from legacy JSONB + token scanning

-- Ensure generic updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Canonical token key normalizer
CREATE OR REPLACE FUNCTION public.normalize_email_token_key(raw_key TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT TRIM(BOTH '_' FROM
        regexp_replace(
            regexp_replace(
                UPPER(
                    regexp_replace(COALESCE(raw_key, ''), '([a-z0-9])([A-Z])', '\1_\2', 'g')
                ),
                '[^A-Z0-9_]+',
                '_',
                'g'
            ),
            '_+',
            '_',
            'g'
        )
    );
$$;

-- Global variable registry
CREATE TABLE IF NOT EXISTS public.email_variable_registry (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT,
    value_type TEXT NOT NULL DEFAULT 'string',
    render_policy TEXT NOT NULL DEFAULT 'escaped_text',
    sample_value TEXT,
    is_sensitive BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT email_variable_registry_key_format CHECK (key ~ '^[A-Z0-9_]+$'),
    CONSTRAINT email_variable_registry_value_type_check CHECK (
        value_type IN ('string', 'number', 'boolean', 'date', 'url', 'html')
    ),
    CONSTRAINT email_variable_registry_render_policy_check CHECK (
        render_policy IN ('escaped_text', 'raw_html', 'url')
    )
);

CREATE INDEX IF NOT EXISTS idx_email_variable_registry_is_active
    ON public.email_variable_registry (is_active);

-- Template-variable mapping
CREATE TABLE IF NOT EXISTS public.email_template_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_slug TEXT NOT NULL REFERENCES public.email_templates(slug) ON DELETE CASCADE,
    variable_key TEXT NOT NULL REFERENCES public.email_variable_registry(key) ON DELETE RESTRICT,
    is_required BOOLEAN NOT NULL DEFAULT false,
    insertion_order INT NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    source_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT email_template_variables_unique UNIQUE (template_slug, variable_key),
    CONSTRAINT email_template_variables_insertion_order_check CHECK (insertion_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_email_template_variables_template_order
    ON public.email_template_variables (template_slug, insertion_order);

CREATE INDEX IF NOT EXISTS idx_email_template_variables_variable_key
    ON public.email_template_variables (variable_key);

-- Extend email template policy metadata
ALTER TABLE IF EXISTS public.email_templates
    ADD COLUMN IF NOT EXISTS is_auth_critical BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS unresolved_policy TEXT NOT NULL DEFAULT 'block',
    ADD COLUMN IF NOT EXISTS allowlist_fallback_keys TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS normalization_version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS editor_schema JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'email_templates_unresolved_policy_check'
    ) THEN
        ALTER TABLE public.email_templates
            ADD CONSTRAINT email_templates_unresolved_policy_check
            CHECK (unresolved_policy IN ('block', 'warn', 'allowlist_fallback'));
    END IF;
END $$;

-- Extend email_logs for observability and policy evidence
ALTER TABLE IF EXISTS public.email_logs
    ADD COLUMN IF NOT EXISTS template_slug TEXT,
    ADD COLUMN IF NOT EXISTS subject TEXT,
    ADD COLUMN IF NOT EXISTS content_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS error_details TEXT,
    ADD COLUMN IF NOT EXISTS recipient_email TEXT,
    ADD COLUMN IF NOT EXISTS render_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS unresolved_tokens JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS degradation_active BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS degradation_reason TEXT,
    ADD COLUMN IF NOT EXISTS mode TEXT,
    ADD COLUMN IF NOT EXISTS template_version INT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'email_logs_mode_check'
    ) THEN
        ALTER TABLE public.email_logs
            ADD CONSTRAINT email_logs_mode_check
            CHECK (mode IS NULL OR mode IN ('send', 'test', 'browser_preview'));
    END IF;
END $$;

UPDATE public.email_logs
SET recipient_email = recipient
WHERE recipient_email IS NULL
  AND recipient IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_template_slug_sent_at
    ON public.email_logs (template_slug, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_mode_blocked
    ON public.email_logs (mode, blocked);

-- updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at_email_variable_registry ON public.email_variable_registry;
CREATE TRIGGER set_updated_at_email_variable_registry
    BEFORE UPDATE ON public.email_variable_registry
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_email_template_variables ON public.email_template_variables;
CREATE TRIGGER set_updated_at_email_template_variables
    BEFORE UPDATE ON public.email_template_variables
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- RLS
ALTER TABLE public.email_variable_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_variables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email variable registry" ON public.email_variable_registry;
CREATE POLICY "Admins can manage email variable registry"
ON public.email_variable_registry
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND (is_admin = true OR is_superadmin = true)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND (is_admin = true OR is_superadmin = true)
    )
);

DROP POLICY IF EXISTS "Admins can manage email template variables" ON public.email_template_variables;
CREATE POLICY "Admins can manage email template variables"
ON public.email_template_variables
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND (is_admin = true OR is_superadmin = true)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND (is_admin = true OR is_superadmin = true)
    )
);

-- Seed canonical global variables
INSERT INTO public.email_variable_registry (
    key,
    label,
    description,
    value_type,
    render_policy,
    sample_value,
    is_sensitive,
    is_active
)
VALUES
    ('NAME', 'Ad Soyad', 'Alıcı adı veya kullanıcı adı', 'string', 'escaped_text', 'Ahmet Yılmaz', false, true),
    ('EMAIL', 'E-posta', 'Alıcı e-posta adresi', 'string', 'escaped_text', 'ahmet@example.com', true, true),
    ('SUBJECT', 'Konu', 'Destek talebi veya bildirim konusu', 'string', 'escaped_text', 'Siparişiniz alındı', false, true),
    ('ORDER_ID', 'Sipariş No', 'Kısa sipariş referans kodu', 'string', 'escaped_text', 'A1B2C3D4', false, true),
    ('ORDER_DATE', 'Sipariş Tarihi', 'Sipariş oluşturulma tarihi', 'date', 'escaped_text', '14 Şubat 2026 16:45', false, true),
    ('ITEMS_LIST', 'Ürün Listesi HTML', 'Sipariş ürün satırlarının HTML içeriği', 'html', 'raw_html', '<tr><td>Bravita Ürün x1</td></tr>', false, true),
    ('SUBTOTAL', 'Ara Toplam', 'Sipariş ara toplamı', 'number', 'escaped_text', '1499.90', false, true),
    ('DISCOUNT', 'İndirim', 'Sipariş indirim tutarı', 'number', 'escaped_text', '100.00', false, true),
    ('TAX', 'KDV', 'Vergi tutarı', 'number', 'escaped_text', '249.98', false, true),
    ('TOTAL', 'Toplam', 'Sipariş toplam tutarı', 'number', 'escaped_text', '1649.88', false, true),
    ('SHIPPING_ADDRESS', 'Teslimat Adresi', 'Sipariş teslimat adresi', 'string', 'escaped_text', 'Kadıköy, İstanbul', false, true),
    ('PAYMENT_METHOD', 'Ödeme Yöntemi', 'Kredi kartı veya havale bilgisi', 'string', 'escaped_text', 'Kredi Kartı', false, true),
    ('BANK_DETAILS', 'Banka Bilgileri HTML', 'Havale açıklama kutusu içeriği', 'html', 'raw_html', '<div>IBAN: TR00...</div>', false, true),
    ('SHIPPING_COMPANY', 'Kargo Firması', 'Gönderim firması adı', 'string', 'escaped_text', 'Yurtiçi Kargo', false, true),
    ('TRACKING_NUMBER', 'Takip Numarası', 'Kargo takip kodu', 'string', 'escaped_text', 'TRK-123456', false, true),
    ('CANCELLATION_REASON', 'İptal Nedeni', 'Sipariş iptal açıklaması', 'string', 'escaped_text', 'Stok sorunu', false, true),
    ('BROWSER_LINK', 'Tarayıcıda Aç Bağlantısı', 'E-postanın web görünümü bağlantısı', 'url', 'url', 'https://www.bravita.com.tr/...', false, true),
    ('TICKET_ID', 'Destek Talep No', 'Destek talebi referans kodu', 'string', 'escaped_text', 'TKT12345', false, true),
    ('CATEGORY', 'Destek Kategorisi', 'Destek talebi kategori adı', 'string', 'escaped_text', 'Ödeme', false, true),
    ('USER_MESSAGE', 'Kullanıcı Mesajı', 'Kullanıcı destek mesajı', 'string', 'escaped_text', 'Siparişim nerede?', false, true),
    ('ADMIN_REPLY', 'Admin Yanıtı', 'Destek ekibi yanıtı', 'string', 'escaped_text', 'Talebiniz işleme alındı.', false, true),
    ('CONFIRMATION_URL', 'Doğrulama Linki', 'Auth doğrulama veya sıfırlama bağlantısı', 'url', 'url', 'https://www.bravita.com.tr/auth?...', true, true),
    ('UNSUBSCRIBE_URL', 'Abonelikten Çıkış Linki', 'Bildirim aboneliğinden çıkış bağlantısı', 'url', 'url', 'https://www.bravita.com.tr/unsubscribe', false, true),
    ('SITE_URL', 'Site URL', 'Site kök adresi', 'url', 'url', 'https://www.bravita.com.tr', false, true)
ON CONFLICT (key)
DO UPDATE
SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    value_type = EXCLUDED.value_type,
    render_policy = EXCLUDED.render_policy,
    sample_value = EXCLUDED.sample_value,
    is_sensitive = EXCLUDED.is_sensitive,
    is_active = true,
    updated_at = timezone('utc'::text, now());

-- Backfill mapping from legacy sources
WITH json_tokens AS (
    SELECT
        t.slug AS template_slug,
        j.raw_token,
        j.ord::INT AS sort_order
    FROM public.email_templates t
    JOIN LATERAL jsonb_array_elements_text(COALESCE(t.variables, '[]'::jsonb)) WITH ORDINALITY AS j(raw_token, ord)
        ON true
),
subject_tokens AS (
    SELECT
        t.slug AS template_slug,
        (m)[1] AS raw_token,
        1000 + ROW_NUMBER() OVER (PARTITION BY t.slug ORDER BY (m)[1]) AS sort_order
    FROM public.email_templates t
    JOIN LATERAL regexp_matches(COALESCE(t.subject, ''), '\{\{\s*\.?([A-Za-z0-9_]+)\s*\}\}', 'g') m
        ON true
),
html_tokens AS (
    SELECT
        t.slug AS template_slug,
        (m)[1] AS raw_token,
        2000 + ROW_NUMBER() OVER (PARTITION BY t.slug ORDER BY (m)[1]) AS sort_order
    FROM public.email_templates t
    JOIN LATERAL regexp_matches(COALESCE(t.content_html, ''), '\{\{\s*\.?([A-Za-z0-9_]+)\s*\}\}', 'g') m
        ON true
),
all_tokens AS (
    SELECT * FROM json_tokens
    UNION ALL
    SELECT * FROM subject_tokens
    UNION ALL
    SELECT * FROM html_tokens
),
normalized AS (
    SELECT
        template_slug,
        raw_token,
        public.normalize_email_token_key(raw_token) AS variable_key,
        sort_order
    FROM all_tokens
),
dedup AS (
    SELECT
        template_slug,
        variable_key,
        MIN(sort_order) AS insertion_order
    FROM normalized
    WHERE variable_key <> ''
    GROUP BY template_slug, variable_key
)
INSERT INTO public.email_variable_registry (
    key,
    label,
    description,
    value_type,
    render_policy,
    sample_value,
    is_sensitive,
    is_active
)
SELECT
    d.variable_key,
    INITCAP(REPLACE(LOWER(d.variable_key), '_', ' ')) AS label,
    'Auto-discovered from existing templates during unification migration.' AS description,
    CASE
        WHEN d.variable_key IN ('SUBTOTAL', 'DISCOUNT', 'TAX', 'TOTAL') THEN 'number'
        WHEN d.variable_key LIKE '%URL' OR d.variable_key = 'SITE_URL' OR d.variable_key = 'BROWSER_LINK' THEN 'url'
        ELSE 'string'
    END AS value_type,
    CASE
        WHEN d.variable_key IN ('ITEMS_LIST', 'BANK_DETAILS') THEN 'raw_html'
        WHEN d.variable_key LIKE '%URL' OR d.variable_key = 'SITE_URL' OR d.variable_key = 'BROWSER_LINK' THEN 'url'
        ELSE 'escaped_text'
    END AS render_policy,
    NULL,
    false,
    true
FROM (
    SELECT DISTINCT variable_key
    FROM dedup
) d
WHERE NOT EXISTS (
    SELECT 1
    FROM public.email_variable_registry r
    WHERE r.key = d.variable_key
)
ON CONFLICT (key) DO NOTHING;

WITH json_tokens AS (
    SELECT
        t.slug AS template_slug,
        j.raw_token,
        j.ord::INT AS sort_order
    FROM public.email_templates t
    JOIN LATERAL jsonb_array_elements_text(COALESCE(t.variables, '[]'::jsonb)) WITH ORDINALITY AS j(raw_token, ord)
        ON true
),
subject_tokens AS (
    SELECT
        t.slug AS template_slug,
        (m)[1] AS raw_token,
        1000 + ROW_NUMBER() OVER (PARTITION BY t.slug ORDER BY (m)[1]) AS sort_order
    FROM public.email_templates t
    JOIN LATERAL regexp_matches(COALESCE(t.subject, ''), '\{\{\s*\.?([A-Za-z0-9_]+)\s*\}\}', 'g') m
        ON true
),
html_tokens AS (
    SELECT
        t.slug AS template_slug,
        (m)[1] AS raw_token,
        2000 + ROW_NUMBER() OVER (PARTITION BY t.slug ORDER BY (m)[1]) AS sort_order
    FROM public.email_templates t
    JOIN LATERAL regexp_matches(COALESCE(t.content_html, ''), '\{\{\s*\.?([A-Za-z0-9_]+)\s*\}\}', 'g') m
        ON true
),
all_tokens AS (
    SELECT * FROM json_tokens
    UNION ALL
    SELECT * FROM subject_tokens
    UNION ALL
    SELECT * FROM html_tokens
),
normalized AS (
    SELECT
        template_slug,
        raw_token,
        public.normalize_email_token_key(raw_token) AS variable_key,
        sort_order
    FROM all_tokens
),
dedup AS (
    SELECT
        template_slug,
        variable_key,
        MIN(sort_order) AS insertion_order,
        MIN(raw_token) AS source_token
    FROM normalized
    WHERE variable_key <> ''
    GROUP BY template_slug, variable_key
)
INSERT INTO public.email_template_variables (
    template_slug,
    variable_key,
    is_required,
    insertion_order,
    is_enabled,
    source_token
)
SELECT
    d.template_slug,
    d.variable_key,
    false,
    d.insertion_order,
    true,
    d.source_token
FROM dedup d
ON CONFLICT (template_slug, variable_key)
DO UPDATE
SET
    insertion_order = LEAST(public.email_template_variables.insertion_order, EXCLUDED.insertion_order),
    is_enabled = true,
    source_token = COALESCE(public.email_template_variables.source_token, EXCLUDED.source_token),
    updated_at = timezone('utc'::text, now());

-- Auth-critical template policy defaults
UPDATE public.email_templates
SET
    is_auth_critical = true,
    unresolved_policy = 'allowlist_fallback',
    allowlist_fallback_keys = ARRAY[
        'CONFIRMATION_URL',
        'BROWSER_LINK',
        'UNSUBSCRIBE_URL',
        'SITE_URL',
        'NAME',
        'EMAIL'
    ]::TEXT[],
    normalization_version = GREATEST(normalization_version, 1)
WHERE slug IN (
    'confirm_signup',
    'confirm-signup',
    'reset_password'
);
