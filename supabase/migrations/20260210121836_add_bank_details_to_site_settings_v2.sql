ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT 'Ziraat Bankası',
ADD COLUMN IF NOT EXISTS bank_iban TEXT DEFAULT 'TR00 0000 0000 0000 0000 0000 00',
ADD COLUMN IF NOT EXISTS bank_account_holder TEXT DEFAULT 'Bravita Sağlık A.Ş.';

COMMENT ON COLUMN public.site_settings.bank_name IS 'Bank name for wire transfers';
COMMENT ON COLUMN public.site_settings.bank_iban IS 'IBAN for wire transfers';
COMMENT ON COLUMN public.site_settings.bank_account_holder IS 'Account holder name for wire transfers';;
