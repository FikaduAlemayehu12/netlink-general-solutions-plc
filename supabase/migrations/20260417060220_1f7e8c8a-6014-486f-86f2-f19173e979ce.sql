ALTER TABLE public.project_groups ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.project_groups ADD COLUMN IF NOT EXISTS final_attachment_urls text[];
ALTER TABLE public.project_updates ADD COLUMN IF NOT EXISTS attachment_urls text[] DEFAULT '{}';