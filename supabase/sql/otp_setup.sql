-- Create OTP codes table for phone verification
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can manage these codes
-- Or we could allow authenticated users to view their own codes if we added user_id
-- But since these are verified by phone number, we'll keep it simple for now and manage via Edge Functions (service_role)
CREATE POLICY "Service Role Only" ON public.otp_codes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON public.otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);

-- Function to prune expired codes
CREATE OR REPLACE FUNCTION prune_expired_otp_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM public.otp_codes WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
