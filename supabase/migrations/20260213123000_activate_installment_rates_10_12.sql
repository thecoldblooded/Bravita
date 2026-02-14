BEGIN;
UPDATE public.installment_rates
SET is_active = TRUE,
    updated_at = NOW()
WHERE installment_number BETWEEN 10 AND 12;
COMMIT;
