-- Rate Limiting Table for Emails

CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    email_type TEXT NOT NULL, -- e.g. 'order_confirmation'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recipient TEXT
);

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON public.email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at);

-- RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Only service_role can insert (from Edge Function)
DROP POLICY IF EXISTS "System can insert email logs" ON public.email_logs;
CREATE POLICY "System can insert email logs" ON public.email_logs
FOR INSERT TO service_role WITH CHECK (true);

-- Only service_role can read (to check rate limit)
DROP POLICY IF EXISTS "System can read email logs" ON public.email_logs;
CREATE POLICY "System can read email logs" ON public.email_logs
FOR SELECT TO service_role USING (true);
