
-- Final Database Drift Cleanup and Consistency Alignment
-- This migration ensures ALL tables use consistent types and defaults to prevent CI drift detection.

-- 1. Align Profiles Timestamp and Types
ALTER TABLE "public"."profiles" 
  ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "phone_verified_at" SET DATA TYPE TIMESTAMP WITH TIME ZONE USING "phone_verified_at" AT TIME ZONE 'UTC';

ALTER TABLE "public"."profiles" 
  ALTER COLUMN "created_at" SET DEFAULT NOW(),
  ALTER COLUMN "updated_at" SET DEFAULT NOW();

-- 2. Align Addresses Timestamps
ALTER TABLE "public"."addresses" 
  ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "public"."addresses" 
  ALTER COLUMN "created_at" SET DEFAULT NOW();

-- 3. Align Orders created_at (updated_at is already timestamptz)
ALTER TABLE "public"."orders" 
  ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "public"."orders" 
  ALTER COLUMN "created_at" SET DEFAULT NOW();

-- 4. Align Email System Defaults and Constraints
-- email_templates.unresolved_policy
ALTER TABLE "public"."email_templates" 
  ALTER COLUMN "unresolved_policy" SET DEFAULT 'block';

-- Support Ticket Category alignment
ALTER TABLE "public"."support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_category_check";
ALTER TABLE "public"."support_tickets" 
  ADD CONSTRAINT "support_tickets_category_check" 
  CHECK (category = ANY (ARRAY['order_issue'::text, 'product_info'::text, 'delivery'::text, 'other'::text, 'general'::text]));

-- Support Ticket Status alignment
ALTER TABLE "public"."support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_status_check";
ALTER TABLE "public"."support_tickets" 
  ADD CONSTRAINT "support_tickets_status_check" 
  CHECK (status = ANY (ARRAY['open'::text, 'answered'::text, 'closed'::text]));

-- 5. Align Products timestamps
ALTER TABLE "public"."products" 
  ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- 6. Align Promo Codes and Logs
ALTER TABLE "public"."promo_logs" 
  ALTER COLUMN "created_at" SET DEFAULT timezone('utc'::text, now());

-- 7. Ensure handle_updated_at function is consistent for all triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$function$;

-- 8. Apply updated_at trigger to tables that might have drifted
DO $$
BEGIN
    -- profiles
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_profiles') THEN
        CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    
    -- products
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_products') THEN
        CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    
    -- email_templates
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_email_templates') THEN
        CREATE TRIGGER set_updated_at_email_templates BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
;
