-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    content_html TEXT NOT NULL,
    content_text TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create email_configs table
CREATE TABLE IF NOT EXISTS public.email_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_slug TEXT REFERENCES public.email_templates(slug) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    reply_to TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(template_slug, sender_email)
);

-- Enhance email_logs table (if it exists, add more columns)
ALTER TABLE IF EXISTS public.email_logs 
ADD COLUMN IF NOT EXISTS template_slug TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS content_snapshot TEXT,
ADD COLUMN IF NOT EXISTS error_details TEXT;

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Superadmins and Admins only)
CREATE POLICY "Admins can manage email templates" 
ON public.email_templates 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (is_admin = true OR is_superadmin = true)
    )
);

CREATE POLICY "Admins can manage email configs" 
ON public.email_configs 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (is_admin = true OR is_superadmin = true)
    )
);

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER set_updated_at_templates
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_configs
    BEFORE UPDATE ON public.email_configs
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
;
