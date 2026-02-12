CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
    email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    category TEXT NOT NULL DEFAULT 'general'
        CHECK (category IN ('order_issue', 'product_info', 'delivery', 'other', 'general')),
    subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 5 AND 200),
    message TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
    admin_reply TEXT,
    replied_at TIMESTAMPTZ,
    replied_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to be safe)
DROP POLICY IF EXISTS "Anyone can insert tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can perform all actions on tickets" ON public.support_tickets;

-- Policies
-- 1. Anyone can insert (including visitors)
CREATE POLICY "Anyone can insert tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (true);

-- 2. Authenticated users can see only their own tickets
CREATE POLICY "Users can view own tickets" 
ON public.support_tickets 
FOR SELECT 
USING (user_id = (SELECT auth.uid()));

-- 3. Admins can do everything
CREATE POLICY "Admins can perform all actions on tickets" 
ON public.support_tickets 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (SELECT auth.uid()) 
        AND (is_admin = true OR is_superadmin = true)
    )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_support_tickets_updated ON public.support_tickets;
CREATE TRIGGER on_support_tickets_updated
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
;
