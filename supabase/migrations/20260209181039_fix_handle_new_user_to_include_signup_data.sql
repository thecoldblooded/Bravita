-- Update handle_new_user to read phone, full_name, user_type, company_name from user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    phone, 
    full_name, 
    user_type, 
    company_name,
    profile_complete
  )
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'phone', null),
    COALESCE(new.raw_user_meta_data->>'full_name', null),
    COALESCE(new.raw_user_meta_data->>'user_type', 'individual'),
    COALESCE(new.raw_user_meta_data->>'company_name', null),
    -- Profile is complete if full_name and phone are provided
    CASE 
      WHEN (new.raw_user_meta_data->>'full_name') IS NOT NULL 
       AND (new.raw_user_meta_data->>'phone') IS NOT NULL 
      THEN true 
      ELSE false 
    END
  );
  RETURN new;
END;
$function$;;
