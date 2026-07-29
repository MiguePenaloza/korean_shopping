begin;

select plan(26);

select has_function(
  'public',
  'require_permanent_account',
  array[]::text[],
  'permanent-account guard exists'
);
select has_function(
  'public',
  'list_own_account_orders',
  array['integer', 'integer'],
  'customer order-history RPC exists'
);
select has_function(
  'public',
  'get_own_account_order_detail',
  array['text'],
  'customer order-detail RPC exists'
);
select has_function(
  'public',
  'admin_advance_order_fulfillment',
  array['uuid', 'text'],
  'administrator fulfillment RPC exists'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.require_permanent_account()',
    'EXECUTE'
  ),
  false,
  'browser identities cannot execute the internal permanent-account guard'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.list_own_account_orders(integer,integer)',
    'EXECUTE'
  ),
  true,
  'authenticated accounts can request their order history'
);
select is(
  has_function_privilege(
    'anon',
    'public.list_own_account_orders(integer,integer)',
    'EXECUTE'
  ),
  false,
  'plain anon cannot request account order history'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.get_own_account_order_detail(text)',
    'EXECUTE'
  ),
  true,
  'authenticated accounts can request customer-safe order detail'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.admin_advance_order_fulfillment(uuid,text)',
    'EXECUTE'
  ),
  true,
  'authenticated administrators can advance the fulfillment journey'
);
select is(
  has_table_privilege('authenticated', 'public.orders', 'SELECT'),
  false,
  'browser identities cannot read raw orders'
);
select is(
  has_table_privilege('authenticated', 'public.order_items', 'SELECT'),
  false,
  'browser identities cannot read raw order-item snapshots'
);
select is(
  has_table_privilege(
    'authenticated',
    'public.order_status_history',
    'SELECT'
  ),
  false,
  'browser identities cannot read raw status history'
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
    'f0000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'phase-nine-owner@example.test',
    false,
    clock_timestamp(),
    clock_timestamp()
  ),
  (
    'f0000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'phase-nine-other@example.test',
    false,
    clock_timestamp(),
    clock_timestamp()
  ),
  (
    'f0000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    null,
    true,
    clock_timestamp(),
    clock_timestamp()
  );

update public.profiles
set phone_e164 = '+59171234581'
where id in (
  'f0000000-0000-4000-8000-000000000001',
  'f0000000-0000-4000-8000-000000000002'
);

create temporary table phase_nine_orders (
  test_name text primary key,
  order_number text not null
);
grant select, insert on phase_nine_orders to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

insert into phase_nine_orders
select 'account', created.order_number
from public.submit_order(
  'f1000000-0000-4000-8000-000000000001',
  'Cliente con cuenta',
  '71234581',
  '[{"product_id":"40000000-0000-4000-8000-000000000001","quantity":1}]',
  true,
  true
) as created;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":true}',
  true
);

insert into phase_nine_orders
select 'guest', created.order_number
from public.submit_order(
  'f1000000-0000-4000-8000-000000000002',
  'Cliente invitado',
  '71234581',
  '[{"product_id":"40000000-0000-4000-8000-000000000002","quantity":1}]',
  true,
  true
) as created;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

select is(
  (select count(*) from public.list_own_account_orders(1, 20)),
  1::bigint,
  'permanent account sees its own account order'
);
select is(
  (
    select total_count
    from public.list_own_account_orders(1, 20)
    limit 1
  ),
  1::bigint,
  'account order list reports its complete count'
);
select is(
  (
    select item_quantity
    from public.list_own_account_orders(1, 20)
    limit 1
  ),
  1,
  'account order list reports purchased unit quantity'
);
select is(
  (
    select customer_name
    from public.get_own_account_order_detail(
      (select order_number from phase_nine_orders where test_name = 'account')
    )
  ),
  'Cliente con cuenta',
  'customer-safe detail returns the checkout name'
);
select is(
  (
    select jsonb_array_length(items)
    from public.get_own_account_order_detail(
      (select order_number from phase_nine_orders where test_name = 'account')
    )
  ),
  1,
  'customer-safe detail returns immutable purchased items'
);
select is(
  (
    select jsonb_array_length(history)
    from public.get_own_account_order_detail(
      (select order_number from phase_nine_orders where test_name = 'account')
    )
  ),
  1,
  'customer-safe detail returns its initial timeline event'
);
select ok(
  (
    select not ((history -> 0) ? 'reason')
    from public.get_own_account_order_detail(
      (select order_number from phase_nine_orders where test_name = 'account')
    )
  ),
  'customer timeline omits internal administrative reasons'
);
select is(
  (
    select whatsapp_phone_e164
    from public.get_own_account_order_detail(
      (select order_number from phase_nine_orders where test_name = 'account')
    )
  ),
  '+59177912632',
  'owned detail returns the configured help contact'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);

select is(
  (select count(*) from public.list_own_account_orders(1, 20)),
  0::bigint,
  'matching profile phone does not claim another account or guest order'
);
select throws_ok(
  format(
    'select * from public.get_own_account_order_detail(%L)',
    (select order_number from phase_nine_orders where test_name = 'account')
  ),
  '42501',
  'ORDER_NOT_ACCESSIBLE',
  'another permanent account cannot read the order detail'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":true}',
  true
);

select throws_ok(
  $$select * from public.list_own_account_orders(1, 20);$$,
  '42501',
  'PERMANENT_ACCOUNT_REQUIRED',
  'anonymous checkout identity cannot open account history'
);
select throws_ok(
  format(
    'select * from public.get_own_account_order_detail(%L)',
    (select order_number from phase_nine_orders where test_name = 'guest')
  ),
  '42501',
  'PERMANENT_ACCOUNT_REQUIRED',
  'anonymous checkout identity cannot use account detail for its guest order'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
select throws_ok(
  $$select * from public.list_own_account_orders(0, 20);$$,
  '22023',
  'INVALID_PAGINATION',
  'account history rejects invalid pagination'
);
select throws_ok(
  $$select * from public.get_own_account_order_detail('not-an-order');$$,
  '22023',
  'INVALID_ORDER_NUMBER',
  'account detail rejects invalid public order numbers'
);

reset role;
select * from finish();
rollback;
