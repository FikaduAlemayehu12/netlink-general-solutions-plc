-- 1. direct_messages
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text,
  attachment_urls text[] DEFAULT '{}',
  read boolean DEFAULT false,
  edited boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own DMs" ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR has_role(auth.uid(),'ceo'));
CREATE POLICY "Users send DMs" ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND is_staff(auth.uid()));
CREATE POLICY "Users update own DMs" ON public.direct_messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Senders delete own DMs" ON public.direct_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- 2. dm_reactions
CREATE TABLE IF NOT EXISTS public.dm_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reaction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dm_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view dm reactions" ON public.dm_reactions FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff add dm reactions" ON public.dm_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_staff(auth.uid()));
CREATE POLICY "Users delete own dm reactions" ON public.dm_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- 3. project_comments
CREATE TABLE IF NOT EXISTS public.project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view project comments" ON public.project_comments FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff add project comments" ON public.project_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id AND is_staff(auth.uid()));
CREATE POLICY "Authors delete own project comments" ON public.project_comments FOR DELETE
  USING (auth.uid() = author_id);

-- 4. updated_at trigger for direct_messages
CREATE TRIGGER update_direct_messages_updated_at
BEFORE UPDATE ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Realtime publication for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;