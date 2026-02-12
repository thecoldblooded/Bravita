-- 1. Full name constraint update: strictly 2+ characters, no empty strings allowed for individual users
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_full_name_min_length_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_full_name_min_length_check 
CHECK (
    (user_type = 'company') OR -- Skip for company type if needed, or customize
    (full_name IS NULL) OR 
    (length(TRIM(BOTH FROM full_name)) >= 2)
);

-- 2. Phone format constraint update: strictly international format, no empty strings
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_phone_format_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_phone_format_check 
CHECK (
    (phone IS NULL) OR 
    (phone ~ '^\+[0-9]{10,15}$')
);;
