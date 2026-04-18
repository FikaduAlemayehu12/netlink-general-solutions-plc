ALTER TABLE public.site_content
  ADD COLUMN IF NOT EXISTS attachment_urls text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_company text,
  ADD COLUMN IF NOT EXISTS rating integer;