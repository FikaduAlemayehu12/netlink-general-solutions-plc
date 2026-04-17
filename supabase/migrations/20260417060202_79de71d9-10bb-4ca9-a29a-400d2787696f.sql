ALTER TABLE public.project_groups ADD COLUMN IF NOT EXISTS start_date date;

ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS attachments text[];

ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS reviewer_id uuid;
ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS reviewer_notes text;
ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS action_items text;
ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS actual_date date;

ALTER TABLE public.quarter_winners ADD COLUMN IF NOT EXISTS posted_by uuid;