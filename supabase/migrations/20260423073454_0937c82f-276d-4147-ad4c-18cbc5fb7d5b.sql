-- ============ SITE_SLIDES ============
CREATE TABLE public.site_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  caption text,
  cta_label text,
  cta_link text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_site_slides_order ON public.site_slides(display_order) WHERE is_active = true;
ALTER TABLE public.site_slides ENABLE ROW LEVEL SECURITY;

-- ============ SITE_SETTINGS (singleton) ============
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Netlink General Solutions',
  company_tagline text DEFAULT 'Where Ethiopia''s digital future begins',
  logo_url text,
  vision text,
  mission text,
  core_values text,
  welcome_message text DEFAULT 'Welcome to Netlink General Solutions, where Ethiopia''s digital future begins and ambitious organizations find the technology partner they can trust to build bold, move smart, and grow without limits.',
  founder_name text,
  founder_title text,
  founder_message text,
  founder_photo_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- ============ SITE_PARTNERS ============
CREATE TABLE public.site_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  description text,
  website_url text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_partners ENABLE ROW LEVEL SECURITY;

-- ============ SITE_STATS ============
CREATE TABLE public.site_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  value text NOT NULL,
  icon text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;

-- ============ MODULE_PERMISSIONS ============
CREATE TABLE public.module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module text NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);
CREATE INDEX idx_module_perms_user ON public.module_permissions(user_id);
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

-- ============ HELPER FUNCTION ============
CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    has_role(_user_id, 'ceo'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.module_permissions
      WHERE user_id = _user_id AND module = _module
    );
$$;

-- ============ RLS POLICIES ============

-- site_slides
CREATE POLICY "Anyone can view active slides" ON public.site_slides
  FOR SELECT USING (is_active = true OR has_module_permission(auth.uid(), 'slides'));
CREATE POLICY "Module editors manage slides" ON public.site_slides
  FOR ALL USING (has_module_permission(auth.uid(), 'slides'))
  WITH CHECK (has_module_permission(auth.uid(), 'slides'));

-- site_settings
CREATE POLICY "Anyone can view settings" ON public.site_settings
  FOR SELECT USING (true);
CREATE POLICY "Identity editors update settings" ON public.site_settings
  FOR UPDATE USING (has_module_permission(auth.uid(), 'identity'))
  WITH CHECK (has_module_permission(auth.uid(), 'identity'));
CREATE POLICY "Identity editors insert settings" ON public.site_settings
  FOR INSERT WITH CHECK (has_module_permission(auth.uid(), 'identity'));

-- site_partners
CREATE POLICY "Anyone can view active partners" ON public.site_partners
  FOR SELECT USING (is_active = true OR has_module_permission(auth.uid(), 'partners'));
CREATE POLICY "Partner editors manage partners" ON public.site_partners
  FOR ALL USING (has_module_permission(auth.uid(), 'partners'))
  WITH CHECK (has_module_permission(auth.uid(), 'partners'));

-- site_stats
CREATE POLICY "Anyone can view active stats" ON public.site_stats
  FOR SELECT USING (is_active = true OR has_module_permission(auth.uid(), 'stats'));
CREATE POLICY "Stats editors manage stats" ON public.site_stats
  FOR ALL USING (has_module_permission(auth.uid(), 'stats'))
  WITH CHECK (has_module_permission(auth.uid(), 'stats'));

-- module_permissions
CREATE POLICY "CEO manages module permissions" ON public.module_permissions
  FOR ALL USING (has_role(auth.uid(), 'ceo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ceo'::app_role));
CREATE POLICY "Users view own module permissions" ON public.module_permissions
  FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'ceo'::app_role));

-- ============ TIMESTAMP TRIGGERS ============
CREATE TRIGGER update_site_slides_updated_at BEFORE UPDATE ON public.site_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_partners_updated_at BEFORE UPDATE ON public.site_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_stats_updated_at BEFORE UPDATE ON public.site_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED SINGLETON SETTINGS ROW ============
INSERT INTO public.site_settings (company_name) VALUES ('Netlink General Solutions PLC');