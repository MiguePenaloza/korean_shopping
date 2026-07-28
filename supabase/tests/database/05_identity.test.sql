begin;

select plan(12);

insert into auth.users (
  id,
  aud,
  role,
  email,
  raw_user_meta_data,
  is_anonymous,
  created_at,
  updated_at
)
values (
  'a0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'customer@example.test',
  '{"full_name":"Ana Pérez","phone":"71234567"}',
  false,
  clock_timestamp(),
  clock_timestamp()
);

select is(
  (
    select full_name
    from public.profiles
    where id = 'a0000000-0000-4000-8000-000000000001'
  ),
  'Ana Pérez',
  'permanent signup creates a profile from safe metadata'
);

select is(
  (
    select phone_e164
    from public.profiles
    where id = 'a0000000-0000-4000-8000-000000000001'
  ),
  '+59171234567',
  'signup phone is normalized in the database'
);

insert into auth.users (
  id,
  aud,
  role,
  is_anonymous,
  created_at,
  updated_at
)
values (
  'a0000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  true,
  clock_timestamp(),
  clock_timestamp()
);

select is(
  (
    select count(*)::integer
    from public.profiles
    where id = 'a0000000-0000-4000-8000-000000000002'
  ),
  0,
  'anonymous checkout identity receives no permanent profile'
);

select is(
  has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  false,
  'browser identities cannot update profile rows directly'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.upsert_own_profile(text,text)',
    'EXECUTE'
  ),
  true,
  'permanent accounts use the validated profile RPC'
);

select is(
  has_function_privilege(
    'anon',
    'public.upsert_own_profile(text,text)',
    'EXECUTE'
  ),
  false,
  'plain anon role cannot write profiles'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.promote_admin_by_email(text,text)',
    'EXECUTE'
  ),
  false,
  'browser identities cannot call admin bootstrap'
);

select is(
  has_function_privilege(
    'service_role',
    'public.promote_admin_by_email(text,text)',
    'EXECUTE'
  ),
  true,
  'service role can call the explicit admin bootstrap'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

select lives_ok(
  $$
    select public.upsert_own_profile('Ana Actualizada', '70000001')
  $$,
  'permanent account can update its validated profile'
);

select is(
  (
    select full_name
    from public.profiles
    where id = 'a0000000-0000-4000-8000-000000000001'
  ),
  'Ana Actualizada',
  'profile RPC updates only the current profile'
);

reset role;
select set_config('request.jwt.claims', '', true);

select lives_ok(
  $$
    select public.promote_admin_by_email(
      'customer@example.test',
      'Initial administrator bootstrap'
    )
  $$,
  'trusted database operator can bootstrap an administrator'
);

select is(
  (
    select role::text
    from public.profiles
    where id = 'a0000000-0000-4000-8000-000000000001'
  ),
  'admin',
  'admin bootstrap changes only the selected permanent account'
);

select * from finish();
rollback;
