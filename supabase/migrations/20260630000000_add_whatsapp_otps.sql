-- Create WhatsApp OTP table
CREATE TABLE IF NOT EXISTS public.whatsapp_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number CHARACTER VARYING(32) NOT NULL,
    otp_hash CHARACTER VARYING(64) NOT NULL,
    attempts_left INTEGER NOT NULL DEFAULT 3,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_otps_phone ON public.whatsapp_otps USING btree (phone_number);

-- Enable RLS
ALTER TABLE public.whatsapp_otps ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public insert" ON public.whatsapp_otps
    FOR INSERT TO anon WITH CHECK (phone_number IS NOT NULL AND length(phone_number) >= 10 AND expires_at > now());

CREATE POLICY "Allow public select by phone" ON public.whatsapp_otps
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public delete by phone" ON public.whatsapp_otps
    FOR DELETE TO anon USING (phone_number IS NOT NULL);

CREATE POLICY "Allow public update by phone" ON public.whatsapp_otps
    FOR UPDATE TO anon USING (attempts_left > 0) WITH CHECK (attempts_left >= 0 AND attempts_left < 3);

-- Grants
GRANT ALL ON TABLE public.whatsapp_otps TO anon;
GRANT ALL ON TABLE public.whatsapp_otps TO authenticated;
GRANT ALL ON TABLE public.whatsapp_otps TO service_role;
