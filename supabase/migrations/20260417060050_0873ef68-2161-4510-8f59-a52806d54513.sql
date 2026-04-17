-- 1. project_milestones table
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  title text NOT NULL,
  target_percentage numeric NOT NULL DEFAULT 0,
  target_date date,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view milestones" ON public.project_milestones FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage milestones" ON public.project_milestones FOR ALL USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

-- 2. plan_performance_records table
CREATE TABLE IF NOT EXISTS public.plan_performance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  plan_id uuid,
  plan_type text NOT NULL,
  period_key text NOT NULL,
  planned_value numeric NOT NULL DEFAULT 0,
  actual_value numeric NOT NULL DEFAULT 0,
  achievement_pct numeric GENERATED ALWAYS AS (
    CASE WHEN planned_value > 0 THEN ROUND((actual_value / planned_value) * 100, 1) ELSE 0 END
  ) STORED,
  grade numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  flagged boolean DEFAULT false,
  ceo_adjusted_grade numeric,
  ceo_notes text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, plan_id)
);
ALTER TABLE public.plan_performance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own perf records" ON public.plan_performance_records FOR SELECT
  USING (auth.uid() = staff_id OR has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'hr'));
CREATE POLICY "Staff can insert perf records" ON public.plan_performance_records FOR INSERT
  WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "CEO/HR can update perf records" ON public.plan_performance_records FOR UPDATE
  USING (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'hr') OR auth.uid() = staff_id);

-- 3. team_messages table
CREATE TABLE IF NOT EXISTS public.team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text,
  attachment_urls text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view team messages" ON public.team_messages FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can send team messages" ON public.team_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND is_staff(auth.uid()));
CREATE POLICY "Senders can delete own messages" ON public.team_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- 4. message_reactions: add 'reaction' column alias (codebase uses both reaction and emoji)
ALTER TABLE public.message_reactions ADD COLUMN IF NOT EXISTS reaction text;

-- 5. performance_summaries additions
ALTER TABLE public.performance_summaries ADD COLUMN IF NOT EXISTS total_plans integer DEFAULT 0;
ALTER TABLE public.performance_summaries ADD COLUMN IF NOT EXISTS status text DEFAULT 'auto';
-- Unique constraint for upsert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'performance_summaries_unique_key') THEN
    ALTER TABLE public.performance_summaries
      ADD CONSTRAINT performance_summaries_unique_key UNIQUE (staff_id, period_type, period_key);
  END IF;
END $$;

-- 6. project_groups: add end_date
ALTER TABLE public.project_groups ADD COLUMN IF NOT EXISTS end_date date;

-- 7. chat-attachments storage bucket (private, only staff access)
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments' AND is_staff(auth.uid()));

CREATE POLICY "Staff can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND is_staff(auth.uid()));