-- Create role enum
CREATE TYPE public.app_role AS ENUM ('ceo', 'cto', 'coo', 'cio', 'hr', 'sysadmin', 'staff', 'finance_manager', 'bd_head', 'network_engineer', 'support_tech');

-- profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  position TEXT,
  bio TEXT,
  avatar_url TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Executives can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'sysadmin') OR public.has_role(auth.uid(), 'hr')
);
CREATE POLICY "CEO and sysadmin can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'sysadmin')
);
CREATE POLICY "CEO and sysadmin can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'sysadmin')
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- is_staff helper
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- job_vacancies
CREATE TABLE public.job_vacancies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, department TEXT, description TEXT, responsibilities TEXT,
  qualifications TEXT, skills TEXT, experience TEXT, education TEXT, certifications TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full-time', salary_range TEXT, benefits TEXT,
  location TEXT, working_hours TEXT, deadline TIMESTAMPTZ,
  openings INTEGER NOT NULL DEFAULT 1, reporting_manager TEXT,
  status TEXT NOT NULL DEFAULT 'draft', vacancy_type TEXT NOT NULL DEFAULT 'external',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_vacancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published vacancies" ON public.job_vacancies FOR SELECT USING (status = 'published' OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));
CREATE POLICY "HR and CEO can manage vacancies" ON public.job_vacancies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr')) WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));

-- job_applications
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_name TEXT NOT NULL, applicant_email TEXT NOT NULL,
  position TEXT, cover_message TEXT, cv_url TEXT,
  vacancy_id UUID REFERENCES public.job_vacancies(id),
  status TEXT NOT NULL DEFAULT 'new',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view applications" ON public.job_applications FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr') OR
  public.has_role(auth.uid(), 'cto') OR public.has_role(auth.uid(), 'coo') OR
  public.has_role(auth.uid(), 'cio') OR auth.uid() = user_id
);
CREATE POLICY "Authenticated users can insert applications" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Staff can update applications" ON public.job_applications FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr')
);

-- notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info', title TEXT NOT NULL, message TEXT,
  read BOOLEAN NOT NULL DEFAULT false, related_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- support_tickets
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, description TEXT,
  category TEXT NOT NULL DEFAULT 'General', priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  assigned_to_ids UUID[] DEFAULT '{}',
  due_date DATE, resolved_at TIMESTAMPTZ, closed_at TIMESTAMPTZ,
  attachment_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view tickets" ON public.support_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- ticket_comments
CREATE TABLE public.ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view comments" ON public.ticket_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create comments" ON public.ticket_comments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = author_id);
CREATE POLICY "Authors can update comments" ON public.ticket_comments FOR UPDATE TO authenticated USING (auth.uid() = author_id);

-- activity_logs
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, module TEXT NOT NULL,
  record_id TEXT, record_type TEXT, details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Executives can view activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'cto') OR
  public.has_role(auth.uid(), 'coo') OR public.has_role(auth.uid(), 'hr') OR
  public.has_role(auth.uid(), 'sysadmin') OR auth.uid() = user_id
);
CREATE POLICY "Staff can insert activity logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- recycle_bin
CREATE TABLE public.recycle_bin (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL, record_id TEXT NOT NULL,
  record_data JSONB NOT NULL,
  deleted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recycle_bin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Executives can view recycle bin" ON public.recycle_bin FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'sysadmin'));
CREATE POLICY "Staff can insert to recycle bin" ON public.recycle_bin FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "CEO can delete from recycle bin" ON public.recycle_bin FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ceo'));

-- announcements
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, content TEXT,
  author_id UUID REFERENCES auth.users(id),
  published BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published announcements" ON public.announcements FOR SELECT USING (published = true OR (auth.uid() IS NOT NULL AND (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'))));
CREATE POLICY "Staff can manage announcements" ON public.announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr')) WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));

-- subscriber_emails
CREATE TABLE public.subscriber_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  subscribed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriber_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.subscriber_emails FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can view own subscription" ON public.subscriber_emails FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('job-applications', 'job-applications', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-documents', 'employee-documents', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload job applications" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'job-applications');
CREATE POLICY "Anyone can view job applications" ON storage.objects FOR SELECT USING (bucket_id = 'job-applications');
CREATE POLICY "Staff can upload ticket attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ticket-attachments');
CREATE POLICY "Staff can view ticket attachments" ON storage.objects FOR SELECT USING (bucket_id = 'ticket-attachments');
CREATE POLICY "Staff can upload own employee docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'employee-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Staff can view own employee docs" ON storage.objects FOR SELECT USING (bucket_id = 'employee-documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));
CREATE POLICY "HR can delete employee docs" ON storage.objects FOR DELETE USING (bucket_id = 'employee-documents' AND (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

-- Updated_at triggers
CREATE TRIGGER update_job_vacancies_updated_at BEFORE UPDATE ON public.job_vacancies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ticket_comments_updated_at BEFORE UPDATE ON public.ticket_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- employee_profiles
CREATE TABLE public.employee_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  hiring_date DATE, department TEXT, hiring_position TEXT,
  previous_experience TEXT, hiring_cv_url TEXT, hiring_certificates TEXT[],
  emergency_contact_name TEXT, emergency_contact_phone TEXT,
  national_id TEXT, bank_account TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'active', resignation_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own employee profile" ON public.employee_profiles FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "HR/CEO can manage employee profiles" ON public.employee_profiles FOR ALL USING (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) WITH CHECK (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Staff can update own employee profile" ON public.employee_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_employee_profiles_updated_at BEFORE UPDATE ON public.employee_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- employee_qualifications
CREATE TABLE public.employee_qualifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  qualification_type TEXT NOT NULL, title TEXT NOT NULL,
  institution TEXT, field_of_study TEXT, date_obtained DATE,
  document_url TEXT, verified BOOLEAN DEFAULT false,
  verified_by UUID, verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_qualifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own qualifications" ON public.employee_qualifications FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Staff can insert own qualifications" ON public.employee_qualifications FOR INSERT WITH CHECK (auth.uid() = user_id AND is_staff(auth.uid()));
CREATE POLICY "Staff can update own qualifications" ON public.employee_qualifications FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "HR/CEO can delete qualifications" ON public.employee_qualifications FOR DELETE USING (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role));
CREATE TRIGGER update_employee_qualifications_updated_at BEFORE UPDATE ON public.employee_qualifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- employee_documents
CREATE TABLE public.employee_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL, file_name TEXT NOT NULL, description TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own documents" ON public.employee_documents FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Staff can upload own documents" ON public.employee_documents FOR INSERT WITH CHECK ((auth.uid() = user_id OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND is_staff(auth.uid()));
CREATE POLICY "HR/CEO can delete documents" ON public.employee_documents FOR DELETE USING (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

-- experience_letters
CREATE TABLE public.experience_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, requested_by UUID NOT NULL,
  letter_type TEXT NOT NULL DEFAULT 'experience',
  status TEXT NOT NULL DEFAULT 'draft',
  content TEXT, generated_data JSONB DEFAULT '{}'::jsonb,
  period_start DATE, period_end DATE,
  hr_approved BOOLEAN DEFAULT false, hr_approved_by UUID, hr_approved_at TIMESTAMPTZ,
  ceo_approved BOOLEAN DEFAULT false, ceo_approved_by UUID, ceo_approved_at TIMESTAMPTZ,
  rejection_reason TEXT, final_document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.experience_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own letters" ON public.experience_letters FOR SELECT USING (auth.uid() = user_id OR auth.uid() = requested_by OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Staff can request letters" ON public.experience_letters FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "HR/CEO can update letters" ON public.experience_letters FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role));
CREATE TRIGGER update_experience_letters_updated_at BEFORE UPDATE ON public.experience_letters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- employee_audit_log
CREATE TABLE public.employee_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, changed_by UUID NOT NULL,
  change_type TEXT NOT NULL, table_name TEXT NOT NULL,
  old_data JSONB, new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR/CEO can view audit logs" ON public.employee_audit_log FOR SELECT USING (has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "System can insert audit logs" ON public.employee_audit_log FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE INDEX idx_employee_profiles_user_id ON public.employee_profiles(user_id);
CREATE INDEX idx_employee_qualifications_user_id ON public.employee_qualifications(user_id);
CREATE INDEX idx_employee_documents_user_id ON public.employee_documents(user_id);
CREATE INDEX idx_experience_letters_user_id ON public.experience_letters(user_id);
CREATE INDEX idx_experience_letters_status ON public.experience_letters(status);
CREATE INDEX idx_employee_audit_log_user_id ON public.employee_audit_log(user_id);

-- attendance
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  work_hours NUMERIC DEFAULT 0, overtime_hours NUMERIC DEFAULT 0,
  is_late BOOLEAN DEFAULT false, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own attendance" ON public.attendance FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'cto') OR public.has_role(auth.uid(), 'coo'));
CREATE POLICY "Staff can insert own attendance" ON public.attendance FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_staff(auth.uid()));
CREATE POLICY "Staff can update own attendance" ON public.attendance FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));

-- leave_requests
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'annual',
  start_date DATE NOT NULL, end_date DATE NOT NULL,
  reason TEXT, status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID, approved_at TIMESTAMPTZ, attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own leaves" ON public.leave_requests FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'cto') OR public.has_role(auth.uid(), 'coo'));
CREATE POLICY "Staff can insert own leaves" ON public.leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_staff(auth.uid()));
CREATE POLICY "Staff can update own leaves" ON public.leave_requests FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));
CREATE POLICY "Staff can delete own leaves" ON public.leave_requests FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));

-- plans
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  title TEXT NOT NULL, content TEXT,
  plan_type TEXT NOT NULL DEFAULT 'daily',
  status TEXT NOT NULL DEFAULT 'draft',
  actual_value NUMERIC, planned_value NUMERIC, grade NUMERIC,
  mentioned_user_ids UUID[] DEFAULT '{}',
  attachment_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view plans" ON public.plans FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert plans" ON public.plans FOR INSERT WITH CHECK (auth.uid() = author_id AND public.is_staff(auth.uid()));
CREATE POLICY "Staff can update own plans" ON public.plans FOR UPDATE USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));
CREATE POLICY "Staff can delete own plans" ON public.plans FOR DELETE USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'ceo'));

CREATE TABLE public.plan_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, user_id, reaction)
);
ALTER TABLE public.plan_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view plan reactions" ON public.plan_reactions FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert plan reactions" ON public.plan_reactions FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete own reactions" ON public.plan_reactions FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.plan_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  author_id UUID NOT NULL, content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view plan comments" ON public.plan_comments FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert plan comments" ON public.plan_comments FOR INSERT WITH CHECK (auth.uid() = author_id AND public.is_staff(auth.uid()));

-- project_groups
CREATE TABLE public.project_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  member_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view projects" ON public.project_groups FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert projects" ON public.project_groups FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update projects" ON public.project_groups FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete projects" ON public.project_groups FOR DELETE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'ceo'));

CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.project_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'todo', priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view tasks" ON public.project_tasks FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert tasks" ON public.project_tasks FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update tasks" ON public.project_tasks FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete tasks" ON public.project_tasks FOR DELETE USING (public.is_staff(auth.uid()));

CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.project_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL, target_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view milestones" ON public.milestones FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage milestones" ON public.milestones FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.project_groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  update_type TEXT NOT NULL DEFAULT 'daily', content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view updates" ON public.project_updates FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert updates" ON public.project_updates FOR INSERT WITH CHECK (auth.uid() = author_id AND public.is_staff(auth.uid()));

-- performance
CREATE TABLE public.performance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL, quarter TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  notes TEXT, assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.performance_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own scores" ON public.performance_scores FOR SELECT USING (auth.uid() = staff_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));
CREATE POLICY "CEO/HR can insert scores" ON public.performance_scores FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));

CREATE TABLE public.quarter_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter TEXT NOT NULL UNIQUE,
  winner_id UUID NOT NULL, message TEXT, average_grade NUMERIC,
  announced_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quarter_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view winners" ON public.quarter_winners FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "CEO/HR can manage winners" ON public.quarter_winners FOR ALL USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr')) WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));

CREATE TABLE public.performance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  plan_type TEXT NOT NULL,
  planned_value NUMERIC NOT NULL DEFAULT 0,
  actual_value NUMERIC NOT NULL DEFAULT 0,
  grade NUMERIC NOT NULL DEFAULT 0,
  period_key TEXT NOT NULL,
  flagged BOOLEAN DEFAULT false, approved BOOLEAN DEFAULT false,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.performance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own records" ON public.performance_records FOR SELECT USING (auth.uid() = staff_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));
CREATE POLICY "Staff can insert records" ON public.performance_records FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update records" ON public.performance_records FOR UPDATE USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));

CREATE TABLE public.performance_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  period_type TEXT NOT NULL, period_key TEXT NOT NULL,
  total_planned NUMERIC DEFAULT 0, total_actual NUMERIC DEFAULT 0,
  average_grade NUMERIC DEFAULT 0,
  record_count INTEGER DEFAULT 0, flagged_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, period_type, period_key)
);
ALTER TABLE public.performance_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own summaries" ON public.performance_summaries FOR SELECT USING (auth.uid() = staff_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));
CREATE POLICY "System can upsert summaries" ON public.performance_summaries FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "System can update summaries" ON public.performance_summaries FOR UPDATE USING (public.is_staff(auth.uid()));

-- messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL, receiver_id UUID NOT NULL,
  content TEXT, attachment_url TEXT, attachment_name TEXT, attachment_type TEXT,
  is_voice BOOLEAN DEFAULT false, voice_duration INTEGER,
  read BOOLEAN DEFAULT false, edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND public.is_staff(auth.uid()));
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE USING (auth.uid() = sender_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view reactions" ON public.message_reactions FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert reactions" ON public.message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete own reactions" ON public.message_reactions FOR DELETE USING (auth.uid() = user_id);

-- salary
CREATE TABLE public.salary_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'monthly',
  amount NUMERIC NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'ETB',
  effective_from DATE NOT NULL, effective_to DATE, notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own config" ON public.salary_configs FOR SELECT USING (auth.uid() = staff_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'finance_manager'));
CREATE POLICY "Executives can insert config" ON public.salary_configs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'finance_manager'));
CREATE POLICY "Executives can update config" ON public.salary_configs FOR UPDATE USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'finance_manager'));
CREATE POLICY "Executives can delete config" ON public.salary_configs FOR DELETE USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'finance_manager'));

CREATE TABLE public.salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL, payment_type TEXT NOT NULL,
  period_start DATE NOT NULL, period_end DATE NOT NULL,
  units NUMERIC DEFAULT 0, base_amount NUMERIC DEFAULT 0,
  gross_salary NUMERIC DEFAULT 0, deductions NUMERIC DEFAULT 0, net_salary NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', notes TEXT,
  created_by UUID NOT NULL,
  approved_by UUID, approved_at TIMESTAMPTZ, paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own payments" ON public.salary_payments FOR SELECT USING (auth.uid() = staff_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'finance_manager'));
CREATE POLICY "Executives can insert payments" ON public.salary_payments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'finance_manager'));
CREATE POLICY "Executives can update payments" ON public.salary_payments FOR UPDATE USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'finance_manager'));

-- site_content
CREATE TABLE public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, content TEXT,
  content_type TEXT NOT NULL DEFAULT 'blog',
  audience TEXT NOT NULL DEFAULT 'public',
  status TEXT NOT NULL DEFAULT 'draft',
  featured_image TEXT, author_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published content" ON public.site_content FOR SELECT USING (status = 'published' OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));
CREATE POLICY "Staff can manage content" ON public.site_content FOR ALL USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr')) WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));

-- departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view departments" ON public.departments FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "CEO can manage departments" ON public.departments FOR ALL USING (public.has_role(auth.uid(), 'ceo')) WITH CHECK (public.has_role(auth.uid(), 'ceo'));

CREATE TABLE public.sub_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(department_id, name)
);
ALTER TABLE public.sub_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view sub_departments" ON public.sub_departments FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "CEO can manage sub_departments" ON public.sub_departments FOR ALL USING (public.has_role(auth.uid(), 'ceo')) WITH CHECK (public.has_role(auth.uid(), 'ceo'));

CREATE TABLE public.staff_sub_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sub_department_id UUID NOT NULL REFERENCES public.sub_departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sub_department_id)
);
ALTER TABLE public.staff_sub_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view assignments" ON public.staff_sub_departments FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "CEO can manage assignments" ON public.staff_sub_departments FOR ALL USING (public.has_role(auth.uid(), 'ceo')) WITH CHECK (public.has_role(auth.uid(), 'ceo'));

CREATE TABLE public.staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  can_reset_passwords BOOLEAN DEFAULT false,
  can_create_staff BOOLEAN DEFAULT false,
  can_edit_profiles BOOLEAN DEFAULT false,
  can_manage_projects BOOLEAN DEFAULT false,
  can_manage_attendance BOOLEAN DEFAULT false,
  can_manage_salary BOOLEAN DEFAULT false,
  can_post_announcements BOOLEAN DEFAULT false,
  can_pause_users BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own perms" ON public.staff_permissions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'sysadmin'));
CREATE POLICY "CEO can manage perms" ON public.staff_permissions FOR ALL USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'sysadmin')) WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'sysadmin'));

CREATE TABLE public.announcement_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id, reaction)
);
ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view announcement reactions" ON public.announcement_reactions FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert announcement reactions" ON public.announcement_reactions FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete own announcement reactions" ON public.announcement_reactions FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.announcement_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  author_id UUID NOT NULL, content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view announcement comments" ON public.announcement_comments FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert announcement comments" ON public.announcement_comments FOR INSERT WITH CHECK (auth.uid() = author_id AND public.is_staff(auth.uid()));

CREATE TABLE public.hr_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  warning_type TEXT NOT NULL, warning_level INTEGER NOT NULL DEFAULT 1,
  month TEXT NOT NULL,
  late_count INTEGER DEFAULT 0, absence_count INTEGER DEFAULT 0,
  description TEXT, action_taken TEXT, issued_by UUID,
  acknowledged BOOLEAN DEFAULT false, acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own warnings" ON public.hr_warnings FOR SELECT USING (auth.uid() = staff_id OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));
CREATE POLICY "HR can insert warnings" ON public.hr_warnings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr'));
CREATE POLICY "HR can update warnings" ON public.hr_warnings FOR UPDATE USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'hr') OR auth.uid() = staff_id);

-- indexes
CREATE INDEX idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX idx_attendance_clock_in ON public.attendance(clock_in);
CREATE INDEX idx_leave_requests_user_id ON public.leave_requests(user_id);
CREATE INDEX idx_plans_author_id ON public.plans(author_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_salary_configs_staff ON public.salary_configs(staff_id);
CREATE INDEX idx_salary_payments_staff ON public.salary_payments(staff_id);
CREATE INDEX idx_performance_records_staff ON public.performance_records(staff_id);
CREATE INDEX idx_hr_warnings_staff ON public.hr_warnings(staff_id);
CREATE INDEX idx_hr_warnings_month ON public.hr_warnings(month);