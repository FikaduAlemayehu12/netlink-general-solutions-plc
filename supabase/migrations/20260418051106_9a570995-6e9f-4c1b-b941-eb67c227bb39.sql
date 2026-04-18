-- Create missing storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('project-attachments', 'project-attachments', true),
  ('plan-attachments', 'plan-attachments', true),
  ('leave-attachments', 'leave-attachments', true),
  ('site-content', 'site-content', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read + staff write policies for the new buckets
DO $$
DECLARE
  b TEXT;
  buckets TEXT[] := ARRAY['project-attachments','plan-attachments','leave-attachments','site-content','avatars'];
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    EXECUTE format($p$
      DROP POLICY IF EXISTS "Public read %1$s" ON storage.objects;
      CREATE POLICY "Public read %1$s" ON storage.objects FOR SELECT USING (bucket_id = %2$L);
      DROP POLICY IF EXISTS "Staff upload %1$s" ON storage.objects;
      CREATE POLICY "Staff upload %1$s" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %2$L);
      DROP POLICY IF EXISTS "Staff update %1$s" ON storage.objects;
      CREATE POLICY "Staff update %1$s" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %2$L);
      DROP POLICY IF EXISTS "Staff delete %1$s" ON storage.objects;
      CREATE POLICY "Staff delete %1$s" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %2$L);
    $p$, b, b);
  END LOOP;
END $$;

-- Salary payment method columns
ALTER TABLE public.salary_payments
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS transaction_reference TEXT;

-- Approval audit trail on experience letters
ALTER TABLE public.experience_letters
  ADD COLUMN IF NOT EXISTS approval_audit JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Allow HR/CEO to delete experience letters
DROP POLICY IF EXISTS "HR/CEO can delete letters" ON public.experience_letters;
CREATE POLICY "HR/CEO can delete letters"
  ON public.experience_letters FOR DELETE
  USING (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role));