-- Bootstrap CEO account: create auth user + profile + ceo role
-- Password: netlink@123 (bcrypt hash generated)
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  encrypted_pw text;
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'fikadu@netlink-gs.com',
    crypt('netlink@123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Fikadu Alemayehu"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  -- Insert identity record (required for email/password login on newer Supabase)
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    format('{"sub":"%s","email":"%s"}', new_user_id, 'fikadu@netlink-gs.com')::jsonb,
    'email',
    new_user_id::text,
    now(), now(), now()
  );

  -- Profile (in case trigger didn't fire)
  INSERT INTO public.profiles (user_id, full_name, email, position, must_change_password)
  VALUES (new_user_id, 'Fikadu Alemayehu', 'fikadu@netlink-gs.com', 'Chief Executive Officer', false)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    position = EXCLUDED.position;

  -- Assign CEO role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'ceo')
  ON CONFLICT DO NOTHING;
END $$;