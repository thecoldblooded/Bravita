-- Add address_type column to addresses table
ALTER TABLE public.addresses 
ADD COLUMN address_type VARCHAR(20) NOT NULL DEFAULT 'home' 
CHECK (address_type IN ('home', 'work'));;
