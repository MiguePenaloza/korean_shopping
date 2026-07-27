begin;

select plan(7);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  (
    '90000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'reservation-one@example.test',
    clock_timestamp(),
    clock_timestamp()
  ),
  (
    '90000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'reservation-two@example.test',
    clock_timestamp(),
    clock_timestamp()
  );

insert into public.categories (id, name, slug)
values (
  '91000000-0000-4000-8000-000000000001',
  'Reservation test',
  'reservation-test'
);

insert into public.exchange_rates (
  id,
  krw_per_usd,
  bcb_bob_per_usd,
  bank_spread_bob_per_usd,
  contingency_rate,
  effective_from
)
values (
  '92000000-0000-4000-8000-000000000001',
  1380,
  6.96,
  0.28,
  0.03,
  clock_timestamp()
);

insert into public.products (
  id,
  code,
  name,
  brand,
  category_id,
  price_krw,
  product_margin_bob,
  total_stock,
  status
)
values (
  '93000000-0000-4000-8000-000000000001',
  'TEST-LAST-UNIT',
  'Last unit test product',
  'Belle Perle Test',
  '91000000-0000-4000-8000-000000000001',
  21000,
  42,
  1,
  'active'
);

insert into public.product_price_versions (
  id,
  product_id,
  exchange_rate_id,
  price_krw,
  krw_per_usd,
  bcb_bob_per_usd,
  bank_spread_bob_per_usd,
  contingency_rate,
  product_margin_bob,
  converted_cost_bob,
  protected_cost_bob,
  selling_price_bob,
  expires_at
)
select
  '94000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  21000,
  1380,
  6.96,
  0.28,
  0.03,
  42,
  price.converted_cost_bob,
  price.protected_cost_bob,
  price.selling_price_bob,
  clock_timestamp() + interval '1 hour'
from public.calculate_product_price(21000, 1380, 6.96, 0.28, 0.03, 42) as price;

update public.campaign_settings
set ordering_open = true
where id = 1;

create temporary table reservation_test_results (
  order_id uuid,
  order_number text,
  total_bob numeric,
  reservation_expires_at timestamptz,
  payment_report_expires_at timestamptz
);

grant select, insert on reservation_test_results to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '90000000-0000-4000-8000-000000000001',
  true
);

insert into reservation_test_results
select *
from public.create_order(
  '95000000-0000-4000-8000-000000000001',
  'Test Customer One',
  '71234567',
  '[{"product_id":"93000000-0000-4000-8000-000000000001","quantity":1}]'
);

insert into reservation_test_results
select *
from public.create_order(
  '95000000-0000-4000-8000-000000000001',
  'Test Customer One',
  '71234567',
  '[{"product_id":"93000000-0000-4000-8000-000000000001","quantity":1}]'
);

reset role;

select is(
  (select count(distinct order_id) from reservation_test_results),
  1::bigint,
  'repeated idempotency key returns the same order'
);
select is(
  (
    select count(*)
    from public.orders
    where actor_id = '90000000-0000-4000-8000-000000000001'
      and idempotency_key = '95000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'idempotency creates only one database order'
);
select is(
  public.available_product_quantity(
    '93000000-0000-4000-8000-000000000001'
  ),
  0,
  'the active reservation consumes the final unit'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '90000000-0000-4000-8000-000000000002',
  true
);

select throws_ok(
  $$
    select *
    from public.create_order(
      '95000000-0000-4000-8000-000000000002',
      'Test Customer Two',
      '70000000',
      '[{"product_id":"93000000-0000-4000-8000-000000000001","quantity":1}]'
    );
  $$,
  'P0001',
  'INSUFFICIENT_STOCK',
  'a second customer cannot oversell the final unit'
);

select set_config(
  'request.jwt.claim.sub',
  '90000000-0000-4000-8000-000000000001',
  true
);

select lives_ok(
  format(
    'select public.report_order_payment(%L::uuid)',
    (select order_id from reservation_test_results limit 1)
  ),
  'the owner can report payment inside the first window'
);

reset role;

select is(
  (
    select payment_status::text
    from public.orders
    where id = (select order_id from reservation_test_results limit 1)
  ),
  'payment_reported',
  'payment report changes the authoritative payment status'
);

update public.inventory_reservations
set expires_at = clock_timestamp() - interval '1 second'
where order_id = (select order_id from reservation_test_results limit 1);

update public.orders
set reservation_expires_at = clock_timestamp() - interval '1 second'
where id = (select order_id from reservation_test_results limit 1);

select public.expire_inventory_reservations();

select is(
  (
    select status::text
    from public.orders
    where id = (select order_id from reservation_test_results limit 1)
  ),
  'expired',
  'expiration releases the reservation and expires the unpaid order'
);

select * from finish();
rollback;
