-- Application messages: thread between staff and applicant per application
CREATE TABLE public.application_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('staff','applicant')),
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_application_messages_application_id ON public.application_messages(application_id);
CREATE INDEX idx_application_messages_created_at ON public.application_messages(created_at DESC);

ALTER TABLE public.application_messages ENABLE ROW LEVEL SECURITY;

-- Applicant sees messages for their own application; staff (HR/CEO) see all
CREATE POLICY "View application messages"
  ON public.application_messages FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'hr'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.job_applications ja
      WHERE ja.id = application_id AND ja.user_id = auth.uid()
    )
  );

-- Staff insert as 'staff'; applicant inserts as 'applicant' on their own application
CREATE POLICY "Staff can send application messages"
  ON public.application_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'staff'
    AND (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
  );

CREATE POLICY "Applicant can reply on own application"
  ON public.application_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'applicant'
    AND EXISTS (
      SELECT 1 FROM public.job_applications ja
      WHERE ja.id = application_id AND ja.user_id = auth.uid()
    )
  );

-- Mark read: receiver can update read flag
CREATE POLICY "Recipients can mark messages read"
  ON public.application_messages FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'hr'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.job_applications ja
      WHERE ja.id = application_id AND ja.user_id = auth.uid()
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.application_messages;
ALTER TABLE public.application_messages REPLICA IDENTITY FULL;

-- Allow applicants to receive notifications: relax notifications insert so HR/CEO can notify applicants
DROP POLICY IF EXISTS "Staff can insert notifications" ON public.notifications;
CREATE POLICY "Staff can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    is_staff(auth.uid())
    OR auth.uid() = user_id
  );