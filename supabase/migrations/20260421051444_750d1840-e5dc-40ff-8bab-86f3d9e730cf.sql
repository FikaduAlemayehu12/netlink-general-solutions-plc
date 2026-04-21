
-- ============================================================
-- 1. VISITOR LOG & ONLINE PRESENCE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.visitor_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_hash text NOT NULL UNIQUE,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  visit_count integer NOT NULL DEFAULT 1
);

ALTER TABLE public.visitor_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read visitor count" ON public.visitor_log FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.online_visitors (
  visitor_hash text PRIMARY KEY,
  last_ping timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.online_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read online" ON public.online_visitors FOR SELECT USING (true);

-- Track total unique visitors and return current total
CREATE OR REPLACE FUNCTION public.track_visitor(p_hash text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint;
BEGIN
  INSERT INTO public.visitor_log (visitor_hash)
  VALUES (p_hash)
  ON CONFLICT (visitor_hash)
  DO UPDATE SET last_seen = now(), visit_count = public.visitor_log.visit_count + 1;

  -- Also mark online
  INSERT INTO public.online_visitors (visitor_hash, last_ping)
  VALUES (p_hash, now())
  ON CONFLICT (visitor_hash) DO UPDATE SET last_ping = now();

  SELECT COUNT(*) INTO v_count FROM public.visitor_log;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_visitor(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.ping_online(p_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.online_visitors (visitor_hash, last_ping)
  VALUES (p_hash, now())
  ON CONFLICT (visitor_hash) DO UPDATE SET last_ping = now();
  -- Cleanup old presence rows
  DELETE FROM public.online_visitors WHERE last_ping < now() - interval '5 minutes';
END;
$$;

GRANT EXECUTE ON FUNCTION public.ping_online(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_online_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.online_visitors WHERE last_ping > now() - interval '5 minutes';
$$;

GRANT EXECUTE ON FUNCTION public.get_online_count() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_subscriber_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.subscriber_emails WHERE subscribed = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscriber_count() TO anon, authenticated;

-- Allow anonymous subscribe
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscriber_emails;
CREATE POLICY "Anyone can subscribe" ON public.subscriber_emails FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- 2. CONTENT ENGAGEMENT TABLES (likes, comments, reactions)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.content_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.site_content(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, user_id)
);

ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view likes" ON public.content_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated can like" ON public.content_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike own" ON public.content_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.content_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.site_content(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON public.content_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated can comment" ON public.content_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Author or staff can delete" ON public.content_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'hr'::app_role));

CREATE TABLE IF NOT EXISTS public.content_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.site_content(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, user_id, reaction)
);

ALTER TABLE public.content_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reactions" ON public.content_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated can react" ON public.content_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reaction" ON public.content_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 3. PERFORMANCE AUTOMATION
-- ============================================================
-- When a plan has both planned_value and actual_value, automatically
-- create or update a plan_performance_records row with computed grade.

CREATE OR REPLACE FUNCTION public.auto_grade_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pct numeric;
  v_grade numeric;
  v_period_key text;
BEGIN
  IF NEW.planned_value IS NULL OR NEW.actual_value IS NULL OR NEW.planned_value = 0 THEN
    RETURN NEW;
  END IF;

  v_pct := (NEW.actual_value / NEW.planned_value) * 100;
  -- Cap grade at 100, floor at 0
  v_grade := LEAST(100, GREATEST(0, v_pct));

  -- Period key based on plan_type
  v_period_key := CASE NEW.plan_type
    WHEN 'daily' THEN to_char(NEW.created_at, 'YYYY-MM-DD')
    WHEN 'weekly' THEN to_char(NEW.created_at, 'IYYY-"W"IW')
    WHEN 'monthly' THEN to_char(NEW.created_at, 'YYYY-MM')
    WHEN 'quarterly' THEN to_char(NEW.created_at, 'YYYY') || '-Q' || extract(quarter from NEW.created_at)::text
    ELSE to_char(NEW.created_at, 'YYYY-MM-DD')
  END;

  -- Upsert into plan_performance_records
  INSERT INTO public.plan_performance_records (
    plan_id, staff_id, plan_type, period_key,
    planned_value, actual_value, achievement_pct, grade,
    flagged, status
  ) VALUES (
    NEW.id, NEW.author_id, NEW.plan_type, v_period_key,
    NEW.planned_value, NEW.actual_value, v_pct, v_grade,
    v_grade < 60, 'auto'
  )
  ON CONFLICT DO NOTHING;

  -- Also update plan grade column
  NEW.grade := v_grade;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plans_auto_grade ON public.plans;
CREATE TRIGGER plans_auto_grade
BEFORE INSERT OR UPDATE OF planned_value, actual_value ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.auto_grade_plan();

-- ============================================================
-- 4. ENABLE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_visitors;
