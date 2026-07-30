begin;

select plan(17);

select is(
  has_function_privilege('anon', 'public.is_admin()', 'EXECUTE'),
  false,
  'plain anon cannot execute the administrator-role helper'
);
select is(
  has_function_privilege('authenticated', 'public.is_admin()', 'EXECUTE'),
  true,
  'signed browser identities can use the administrator-role helper through RLS'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'payment_evidence_filename_control_check'
  ),
  'payment evidence rejects control characters in original filenames'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'order_status_history_reason_length_check'
  ),
  'audit reasons have a database length limit'
);
select ok(
  (
    select with_check like '%name ~ %products/%'
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'product_images_admin_insert'
  ),
  'product uploads are restricted to generated product paths'
);
select ok(
  (
    select with_check like '%name ~ %orders/%'
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'payment_evidence_admin_insert'
  ),
  'evidence uploads are restricted to generated order paths'
);
select ok(
  (
    select reloptions @> array['security_invoker=true']
    from pg_class
    where oid = 'public.public_catalogue'::regclass
  ),
  'the public catalogue view uses invoker security'
);
select ok(
  (
    select reloptions @> array['security_invoker=true']
    from pg_class
    where oid = 'public.public_categories'::regclass
  ),
  'the public categories view uses invoker security'
);
select ok(
  (
    select reloptions @> array['security_invoker=true']
    from pg_class
    where oid = 'public.public_product_images'::regclass
  ),
  'the public product image view uses invoker security'
);
select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'product_images_public_read'
  ),
  0,
  'the public product bucket does not expose object listing'
);
select is(
  has_table_privilege('authenticated', 'public.payment_evidence', 'INSERT'),
  false,
  'browser administrators cannot bypass evidence attachment validation'
);
select ok(
  (
    select proconfig @> array['search_path=""']
    from pg_proc
    where oid = (
      'public.admin_attach_payment_evidence(uuid,text,text,text,bigint)'
    )::regprocedure
  ),
  'the hardened evidence RPC keeps an empty fixed search path'
);

insert into auth.users (
  id,
  aud,
  role,
  email,
  is_anonymous,
  created_at,
  updated_at
)
values
  (
    'a0000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'phase-ten-admin@example.test',
    false,
    clock_timestamp(),
    clock_timestamp()
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'phase-ten-customer@example.test',
    false,
    clock_timestamp(),
    clock_timestamp()
  );

select set_config('app.identity_role_change', 'true', true);
update public.profiles
set role = 'admin'
where id = 'a0000000-0000-4000-8000-000000000001';

create temporary table phase_ten_order (
  order_id uuid primary key
);
grant select, insert on phase_ten_order to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);

insert into phase_ten_order
select created.order_id
from public.submit_order(
  'a1000000-0000-4000-8000-000000000001',
  'Cliente Hardening',
  '71234599',
  '[{"product_id":"40000000-0000-4000-8000-000000000001","quantity":1}]',
  true,
  true
) as created;

reset role;

insert into storage.objects (
  bucket_id,
  name,
  owner,
  metadata
)
select
  'payment-evidence',
  'orders/' || phase_ten_order.order_id::text
    || '/a2000000-0000-4000-8000-000000000001.png',
  'a0000000-0000-4000-8000-000000000001',
  '{"mimetype":"image/png","size":68}'::jsonb
from phase_ten_order;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

select throws_ok(
  format(
    $sql$select public.admin_attach_payment_evidence(
      %L::uuid,
      %L,
      E'comprobante\n.png',
      'image/png',
      68
    )$sql$,
    (select order_id from phase_ten_order),
    (
      select name
      from storage.objects
      where bucket_id = 'payment-evidence'
        and owner = 'a0000000-0000-4000-8000-000000000001'
    )
  ),
  '22023',
  'INVALID_EVIDENCE_FILE',
  'evidence rejects filenames with control characters'
);
select throws_ok(
  format(
    $sql$select public.admin_attach_payment_evidence(
      %L::uuid,
      %L,
      'comprobante.jpg',
      'image/jpeg',
      68
    )$sql$,
    (select order_id from phase_ten_order),
    (
      select name
      from storage.objects
      where bucket_id = 'payment-evidence'
        and owner = 'a0000000-0000-4000-8000-000000000001'
    )
  ),
  '22023',
  'INVALID_EVIDENCE_FILE',
  'declared evidence type must match its generated extension'
);
select throws_ok(
  format(
    $sql$select public.admin_attach_payment_evidence(
      %L::uuid,
      %L,
      'comprobante.png',
      'image/png',
      67
    )$sql$,
    (select order_id from phase_ten_order),
    (
      select name
      from storage.objects
      where bucket_id = 'payment-evidence'
        and owner = 'a0000000-0000-4000-8000-000000000001'
    )
  ),
  '22023',
  'EVIDENCE_METADATA_MISMATCH',
  'declared evidence size must match Storage metadata'
);
select lives_ok(
  format(
    $sql$select public.admin_attach_payment_evidence(
      %L::uuid,
      %L,
      'comprobante.png',
      'image/png',
      68
    )$sql$,
    (select order_id from phase_ten_order),
    (
      select name
      from storage.objects
      where bucket_id = 'payment-evidence'
        and owner = 'a0000000-0000-4000-8000-000000000001'
    )
  ),
  'matching evidence metadata can be attached'
);

reset role;
select is(
  (
    select size_bytes
    from public.payment_evidence
    where order_id = (select order_id from phase_ten_order)
  ),
  68::bigint,
  'validated evidence metadata is persisted'
);

select * from finish();
rollback;
