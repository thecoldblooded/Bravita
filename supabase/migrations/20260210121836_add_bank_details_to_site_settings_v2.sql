-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Enforce single row
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Insert the singleton row if it doesn't exist
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Add RLS policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_settings' AND policyname = 'Public read access') THEN
        CREATE POLICY "Public read access" ON public.site_settings FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_settings' AND policyname = 'Admin update access') THEN
       -- Using a safe check that doesn't rely on is_admin_user() if it's not ready, 
       -- but based on timeline it should be. 
       -- To be safe against function signature changes, we'll just check specific user ID or simple rule if possible, 
       -- OR just trust is_admin_user() exists since we fixed it in 20260209...
        CREATE POLICY "Admin update access" ON public.site_settings FOR UPDATE USING (
            (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
        ) WITH CHECK (
            (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
        );
    END IF;
END $$;

-- Now add the columns
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT 'Ziraat Bankası',
ADD COLUMN IF NOT EXISTS bank_iban TEXT DEFAULT 'TR00 0000 0000 0000 0000 0000 00',
ADD COLUMN IF NOT EXISTS bank_account_holder TEXT DEFAULT 'Bravita Sağlık A.Ş.';

COMMENT ON COLUMN public.site_settings.bank_name IS 'Bank name for wire transfers';
COMMENT ON COLUMN public.site_settings.bank_iban IS 'IBAN for wire transfers';
COMMENT ON COLUMN public.site_settings.bank_account_holder IS 'Account holder name for wire transfers';
