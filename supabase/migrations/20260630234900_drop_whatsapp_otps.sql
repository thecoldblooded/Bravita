-- Drop WhatsApp OTP table since we migrated to Firebase Phone Auth
DROP TABLE IF EXISTS public.whatsapp_otps CASCADE;
