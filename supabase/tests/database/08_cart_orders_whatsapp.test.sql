begin;

select plan(21);

select has_column(
  'public',
  'orders',
  'terms_accepted_at',
  'orders record purchase-condition acceptance'
);
select has_column(
  'public',
  'orders',
  'privacy_accepted_at',
  'orders record privacy acceptance'
);
select has_function(
  'public',
  'submit_order',
  array['uuid', 'text', 'text', 'jsonb', 'boolean', 'boolean'],
  'customer checkout RPC exists'
);
select has_function(
  'public',
  'get_own_order_confirmation',
  array['uuid'],
  'safe order confirmation RPC exists'
);
select has_function(
  'public',
  'report_own_order_payment',
  array['uuid'],
  'safe payment-report RPC exists'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.create_order(uuid,text,text,jsonb)',
    'EXECUTE'
  ),
  false,
  'browser identities cannot bypass acceptance through the internal checkout RPC'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.submit_order(uuid,text,text,jsonb,boolean,boolean)',
    'EXECUTE'
  ),
  true,
  'authenticated identities can submit checkout'
);
select is(
  has_function_privilege(
    'anon',
    'public.submit_order(uuid,text,text,jsonb,boolean,boolean)',
    'EXECUTE'
  ),
  false,
  'plain anon must sign in anonymously before checkout'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.get_own_order_confirmation(uuid)',
    'EXECUTE'
  ),
  true,
  'authenticated identities can request an ownership-checked confirmation'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.report_order_payment(uuid)',
    'EXECUTE'
  ),
  false,
  'browser identities cannot receive the raw order row from payment reporting'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.report_own_order_payment(uuid)',
    'EXECUTE'
  ),
  true,
  'authenticated identities can call the safe payment-report RPC'
);
select is(
  has_table_privilege('anon', 'public.campaign_settings', 'SELECT'),
  false,
  'raw campaign configuration is no longer public'
);
select is(
  has_table_privilege('authenticated', 'public.campaign_settings', 'SELECT'),
  false,
  'browser identities cannot read raw campaign configuration'
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
    'd0000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    null,
    true,
    clock_timestamp(),
    clock_timestamp()
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    null,
    true,
    clock_timestamp(),
    clock_timestamp()
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);

select throws_ok(
  $$
    select *
    from public.submit_order(
      'd1000000-0000-4000-8000-000000000001',
      'Cliente Fase Siete',
      '71234567',
      '[{"product_id":"40000000-0000-4000-8000-000000000001","quantity":1}]',
      false,
      true
    );
  $$,
  '22023',
  'ACCEPTANCE_REQUIRED',
  'checkout rejects missing purchase-condition acceptance'
);

create temporary table phase_seven_order as
select *
from public.submit_order(
  'd1000000-0000-4000-8000-000000000001',
  'Cliente Fase Siete',
  '71234567',
  '[{"product_id":"40000000-0000-4000-8000-000000000001","quantity":1}]',
  true,
  true
);

select ok(
  (
    select terms_accepted_at is not null and privacy_accepted_at is not null
    from public.orders
    where id = (select order_id from phase_seven_order)
  ),
  'successful checkout records both acceptance timestamps'
);
select is(
  (select count(*) from phase_seven_order),
  1::bigint,
  'checkout returns one confirmation row'
);
select is(
  (
    select count(*)
    from public.submit_order(
      'd1000000-0000-4000-8000-000000000001',
      'Cliente Fase Siete',
      '71234567',
      '[{"product_id":"40000000-0000-4000-8000-000000000001","quantity":1}]',
      true,
      true
    )
  ),
  1::bigint,
  'idempotent retry returns the existing order'
);
select is(
  (
    select count(*)
    from public.orders
    where actor_id = 'd0000000-0000-4000-8000-000000000001'
      and idempotency_key = 'd1000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'idempotent retry creates no duplicate'
);
select is(
  (
    select whatsapp_phone_e164
    from public.get_own_order_confirmation(
      (select order_id from phase_seven_order)
    )
  ),
  '+59177912632',
  'owned confirmation returns the configured WhatsApp contact'
);
select is(
  (
    select jsonb_array_length(items)
    from public.get_own_order_confirmation(
      (select order_id from phase_seven_order)
    )
  ),
  1,
  'owned confirmation returns immutable order items'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":true}',
  true
);

select throws_ok(
  format(
    'select * from public.get_own_order_confirmation(%L::uuid)',
    (select order_id from phase_seven_order)
  ),
  '42501',
  'ORDER_NOT_ACCESSIBLE',
  'another identity cannot read the order confirmation'
);

reset role;

select * from finish();
rollback;
