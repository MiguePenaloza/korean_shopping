begin;

select plan(35);

select has_function(
  'public',
  'admin_list_orders',
  array['text', 'integer', 'integer'],
  'administrator order list RPC exists'
);
select has_function(
  'public',
  'admin_get_order_detail',
  array['uuid'],
  'administrator order detail RPC exists'
);
select has_function(
  'public',
  'admin_change_order_state',
  array['uuid', 'text', 'text'],
  'administrator order transition RPC exists'
);
select has_function(
  'public',
  'admin_attach_payment_evidence',
  array['uuid', 'text', 'text', 'text', 'bigint'],
  'private evidence registration RPC exists'
);
select has_function(
  'public',
  'admin_mark_order_paid',
  array['uuid', 'boolean', 'text', 'jsonb'],
  'safe paid-confirmation RPC exists'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.admin_confirm_order_paid(uuid,boolean,text)',
    'EXECUTE'
  ),
  false,
  'browser identities cannot execute the lower-level paid function'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.admin_list_orders(text,integer,integer)',
    'EXECUTE'
  ),
  true,
  'authenticated administrators can request the order list'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.admin_attach_payment_evidence(uuid,text,text,text,bigint)',
    'EXECUTE'
  ),
  true,
  'authenticated administrators can register private evidence'
);
select is(
  has_table_privilege(
    'authenticated',
    'public.payment_evidence',
    'INSERT'
  ),
  false,
  'browser identities cannot insert evidence metadata directly'
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
    'e0000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'phase-eight-admin@example.test',
    false,
    clock_timestamp(),
    clock_timestamp()
  ),
  (
    'e0000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'phase-eight-customer@example.test',
    false,
    clock_timestamp(),
    clock_timestamp()
  );

select set_config('app.identity_role_change', 'true', true);
update public.profiles
set role = 'admin'
where id = 'e0000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);

select throws_ok(
  $$select * from public.admin_list_orders('all', 1, 50);$$,
  '42501',
  'ADMIN_REQUIRED',
  'a customer cannot read the administrator order list'
);

create temporary table phase_eight_orders (
  test_name text primary key,
  order_id uuid not null
);
grant select, insert on phase_eight_orders to authenticated;

insert into phase_eight_orders
select 'paid', created.order_id
from public.submit_order(
  'e1000000-0000-4000-8000-000000000001',
  'Cliente Pago',
  '71234561',
  '[{"product_id":"40000000-0000-4000-8000-000000000001","quantity":1}]',
  true,
  true
) as created;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

select is(
  (select count(*) from public.admin_list_orders('all', 1, 50)),
  1::bigint,
  'administrator list returns the created order'
);
select is(
  (
    select jsonb_array_length(items)
    from public.admin_get_order_detail(
      (select order_id from phase_eight_orders where test_name = 'paid')
    )
  ),
  1,
  'administrator detail returns immutable order items'
);
select is(
  (
    select payment_status
    from public.admin_change_order_state(
      (select order_id from phase_eight_orders where test_name = 'paid'),
      'payment_reported',
      null
    )
  ),
  'payment_reported',
  'administrator can register a payment notice'
);
select ok(
  (
    select reservation_expires_at = payment_report_expires_at
    from public.orders
    where id = (
      select order_id from phase_eight_orders where test_name = 'paid'
    )
  ),
  'administrator payment notice extends the reservation to minute 25'
);
select is(
  (
    select order_status
    from public.admin_mark_order_paid(
      (select order_id from phase_eight_orders where test_name = 'paid'),
      false,
      null,
      null
    )
  ),
  'confirmed',
  'administrator confirms an in-window payment'
);
select is(
  (
    select payment_status::text
    from public.orders
    where id = (
      select order_id from phase_eight_orders where test_name = 'paid'
    )
  ),
  'paid',
  'paid confirmation updates the payment state'
);
select is(
  (
    select confirmed_stock
    from public.products
    where id = '40000000-0000-4000-8000-000000000001'
  ),
  1,
  'paid confirmation converts the reservation into confirmed inventory'
);
select lives_ok(
  format(
    'select * from public.admin_mark_order_paid(%L::uuid, false, null, null)',
    (select order_id from phase_eight_orders where test_name = 'paid')
  ),
  'repeating paid confirmation is idempotent'
);
select is(
  (
    select confirmed_stock
    from public.products
    where id = '40000000-0000-4000-8000-000000000001'
  ),
  1,
  'idempotent confirmation does not double-count inventory'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);

insert into phase_eight_orders
select 'rejected', created.order_id
from public.submit_order(
  'e1000000-0000-4000-8000-000000000002',
  'Cliente Rechazo',
  '71234562',
  '[{"product_id":"40000000-0000-4000-8000-000000000001","quantity":1}]',
  true,
  true
) as created;

insert into phase_eight_orders
select 'cancelled', created.order_id
from public.submit_order(
  'e1000000-0000-4000-8000-000000000003',
  'Cliente Cancelación',
  '71234563',
  '[{"product_id":"40000000-0000-4000-8000-000000000002","quantity":1}]',
  true,
  true
) as created;

insert into phase_eight_orders
select 'refunded', created.order_id
from public.submit_order(
  'e1000000-0000-4000-8000-000000000004',
  'Cliente Reembolso',
  '71234564',
  '[{"product_id":"40000000-0000-4000-8000-000000000002","quantity":1}]',
  true,
  true
) as created;

insert into phase_eight_orders
select 'late', created.order_id
from public.submit_order(
  'e1000000-0000-4000-8000-000000000005',
  'Cliente Tardío',
  '71234565',
  '[{"product_id":"40000000-0000-4000-8000-000000000001","quantity":1}]',
  true,
  true
) as created;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

select is(
  (
    select order_status
    from public.admin_change_order_state(
      (select order_id from phase_eight_orders where test_name = 'rejected'),
      'reject_payment',
      'El comprobante no corresponde.'
    )
  ),
  'cancelled',
  'rejected payment cancels the order'
);
select is(
  (
    select payment_status::text
    from public.orders
    where id = (
      select order_id from phase_eight_orders where test_name = 'rejected'
    )
  ),
  'rejected',
  'rejected payment records its payment state'
);
select is(
  (
    select status::text
    from public.inventory_reservations
    where order_id = (
      select order_id from phase_eight_orders where test_name = 'rejected'
    )
  ),
  'released',
  'payment rejection releases reserved inventory'
);
select is(
  (
    select order_status
    from public.admin_change_order_state(
      (select order_id from phase_eight_orders where test_name = 'cancelled'),
      'cancel',
      'Pedido cancelado a solicitud.'
    )
  ),
  'cancelled',
  'administrator can cancel an unpaid order'
);
select is(
  (
    select payment_status::text
    from public.orders
    where id = (
      select order_id from phase_eight_orders where test_name = 'cancelled'
    )
  ),
  'awaiting_payment',
  'unpaid cancellation does not invent a payment result'
);

select lives_ok(
  format(
    'select * from public.admin_change_order_state(%L::uuid, %L, null)',
    (select order_id from phase_eight_orders where test_name = 'refunded'),
    'payment_reported'
  ),
  'administrator can record the payment before starting a refund'
);
select is(
  (
    select order_status
    from public.admin_change_order_state(
      (select order_id from phase_eight_orders where test_name = 'refunded'),
      'refund_pending',
      'Pago recibido fuera del flujo normal.'
    )
  ),
  'refund_pending',
  'payment can enter the pending-refund flow'
);
select is(
  (
    select order_status
    from public.admin_change_order_state(
      (select order_id from phase_eight_orders where test_name = 'refunded'),
      'refunded',
      'Dinero devuelto mediante QR.'
    )
  ),
  'refunded',
  'pending refund can be completed'
);

reset role;
update public.inventory_reservations
set expires_at = clock_timestamp() - interval '1 second'
where order_id = (
  select order_id from phase_eight_orders where test_name = 'late'
);
update public.orders
set reservation_expires_at = clock_timestamp() - interval '1 second'
where id = (
  select order_id from phase_eight_orders where test_name = 'late'
);
select public.expire_inventory_reservations();

select is(
  (
    select status::text
    from public.orders
    where id = (
      select order_id from phase_eight_orders where test_name = 'late'
    )
  ),
  'expired',
  'maintenance expires the late-payment order'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

select throws_ok(
  format(
    'select * from public.admin_mark_order_paid(%L::uuid, false, null, null)',
    (select order_id from phase_eight_orders where test_name = 'late')
  ),
  'P0001',
  'LATE_PAYMENT_REQUIRES_OVERRIDE',
  'late payment requires an explicit override'
);
select lives_ok(
  format(
    'select * from public.admin_mark_order_paid(%L::uuid, true, %L, null)',
    (select order_id from phase_eight_orders where test_name = 'late'),
    'Todavía existe tiempo para comprar el producto.'
  ),
  'administrator can exceptionally accept a late payment'
);
select is(
  (
    select count(*)
    from public.order_admin_overrides
    where order_id = (
      select order_id from phase_eight_orders where test_name = 'late'
    )
      and override_type = 'late_payment_acceptance'
  ),
  1::bigint,
  'late acceptance stores one auditable override'
);
select is(
  (
    select confirmed_stock
    from public.products
    where id = '40000000-0000-4000-8000-000000000001'
  ),
  2,
  'late acceptance reacquires and confirms available inventory'
);
select throws_ok(
  format(
    $sql$
      select public.admin_attach_payment_evidence(
        %L::uuid,
        'orders/wrong/file.png',
        'comprobante.png',
        'image/png',
        100
      )
    $sql$,
    (select order_id from phase_eight_orders where test_name = 'paid')
  ),
  '22023',
  'INVALID_EVIDENCE_PATH',
  'evidence path must belong to its order directory'
);
select ok(
  exists (
    select 1
    from public.order_status_history
    where order_id = (
      select order_id from phase_eight_orders where test_name = 'refunded'
    )
      and reason = 'Dinero devuelto mediante QR.'
      and metadata ->> 'action' = 'refunded'
  ),
  'administrative reason and action are preserved in history'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
select throws_ok(
  format(
    'select * from public.admin_get_order_detail(%L::uuid)',
    (select order_id from phase_eight_orders where test_name = 'paid')
  ),
  '42501',
  'ADMIN_REQUIRED',
  'customer cannot read administrator order detail'
);

reset role;
select * from finish();
rollback;
