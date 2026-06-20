-- Fix existing phone numbers that don't start with +
UPDATE public.profiles 
SET phone = '+90' || phone 
WHERE phone IS NOT NULL 
  AND phone != '' 
  AND phone NOT LIKE '+%'
  AND length(phone) >= 10;

-- Clear invalid short phone numbers (less than 10 digits after +)
UPDATE public.profiles 
SET phone = NULL 
WHERE phone IS NOT NULL 
  AND phone != '' 
  AND (
    length(regexp_replace(phone, '[^0-9]', '', 'g')) < 10
    OR NOT phone ~ '^\+[0-9]'
  );

-- Now add the constraints

-- Phone number format validation (international format, minimum 10 digits)
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_phone_format_check 
CHECK (
    phone IS NULL OR 
    phone = '' OR 
    (phone ~ '^\+[0-9]{10,15}$')
);

-- Full name minimum length validation
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_full_name_min_length_check 
CHECK (
    full_name IS NULL OR 
    full_name = '' OR 
    length(trim(full_name)) >= 2
);

-- User type validation
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_type_check 
CHECK (
    user_type IN ('individual', 'company')
);

-- Company name required for company users
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_company_name_required_check 
CHECK (
    user_type != 'company' OR 
    (company_name IS NOT NULL AND length(trim(company_name)) >= 1)
);;
