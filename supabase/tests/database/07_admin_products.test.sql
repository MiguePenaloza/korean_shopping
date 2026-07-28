begin;

select plan(24);

select has_view(
  'public',
  'public_product_images',
  'safe public product image projection exists'
);

select has_function(
  'public',
  'admin_create_product',
  array[
    'uuid', 'text', 'text', 'uuid', 'text', 'text',
    'integer', 'integer', 'numeric', 'text', 'jsonb'
  ],
  'secure product creation exists'
);

select has_function(
  'public',
  'admin_create_exchange_rate',
  array['date', 'text', 'numeric', 'numeric', 'numeric', 'text'],
  'secure rate creation exists'
);

select is(
  public.next_price_expiration('2026-07-28 23:00:00-04'::timestamptz),
  '2026-07-29 08:15:00-04'::timestamptz,
  'nightly price expiration uses the next 08:15 in Bolivia'
);

select is(
  has_table_privilege('authenticated', 'public.products', 'INSERT'),
  false,
  'browser administrators cannot insert raw products'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.admin_publish_product_price(uuid,uuid,timestamptz)',
    'EXECUTE'
  ),
  false,
  'browser administrators cannot choose arbitrary price expiration'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.admin_create_product(uuid,text,text,uuid,text,text,integer,integer,numeric,text,jsonb)',
    'EXECUTE'
  ),
  true,
  'authenticated identities can reach the admin-checked product RPC'
);

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
  'c0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'phase6-admin@example.test',
  '{"full_name":"Admin Fase Seis"}',
  false,
  clock_timestamp(),
  clock_timestamp()
);

select public.promote_admin_by_email(
  'phase6-admin@example.test',
  'Phase six database test administrator'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

select lives_ok(
  $$
    select *
    from public.admin_create_product(
      'c1000000-0000-4000-8000-000000000001',
      'Producto administrativo',
      'Belle Test',
      '10000000-0000-4000-8000-000000000001',
      'Descripción para la prueba.',
      '50 ml',
      18000,
      6,
      45,
      'active',
      jsonb_build_array(
        jsonb_build_object(
          'storage_path', 'products/c1000000-0000-4000-8000-000000000001/0-full.webp',
          'thumbnail_storage_path', 'products/c1000000-0000-4000-8000-000000000001/0-thumb.webp',
          'alt_text', 'Producto administrativo',
          'sort_order', 0,
          'width', 900,
          'height', 900,
          'thumbnail_width', 480,
          'thumbnail_height', 480,
          'is_thumbnail', true
        )
      )
    )
  $$,
  'administrator can create and publish a product atomically'
);

select ok(
  (
    select code like 'BP-%'
    from public.products
    where id = 'c1000000-0000-4000-8000-000000000001'
  ),
  'product receives an automatic public code'
);

select is(
  (
    select status::text
    from public.products
    where id = 'c1000000-0000-4000-8000-000000000001'
  ),
  'active',
  'published product is active'
);

select is(
  (
    select count(*)::integer
    from public.product_price_versions
    where product_id = 'c1000000-0000-4000-8000-000000000001'
      and status = 'active'
  ),
  1,
  'published product receives one authoritative active price'
);

select is(
  (
    select thumbnail_width
    from public.product_images
    where product_id = 'c1000000-0000-4000-8000-000000000001'
  ),
  480,
  'processed thumbnail metadata is stored'
);

select is(
  (
    select total_stock
    from public.admin_list_products(1, 50)
    where id = 'c1000000-0000-4000-8000-000000000001'
  ),
  6,
  'administrator list includes exact total stock'
);

select is(
  (
    select remaining_stock
    from public.admin_list_products(1, 50)
    where id = 'c1000000-0000-4000-8000-000000000001'
  ),
  6,
  'administrator list includes exact remaining stock'
);

select throws_ok(
  $$
    select *
    from public.admin_create_product(
      'c1000000-0000-4000-8000-000000000002',
      'Producto inválido',
      'Belle Test',
      '10000000-0000-4000-8000-000000000001',
      '',
      '',
      10000,
      1,
      20,
      'draft',
      '[{},{},{},{}]'::jsonb
    )
  $$,
  '22023',
  'INVALID_IMAGES',
  'more than three images are rejected'
);

select lives_ok(
  $$
    select *
    from public.admin_create_product(
      'c1000000-0000-4000-8000-000000000003',
      'Borrador administrativo',
      'Belle Test',
      '10000000-0000-4000-8000-000000000001',
      '',
      '',
      9000,
      2,
      25,
      'draft',
      '[]'::jsonb
    )
  $$,
  'administrator can save a product draft'
);

select is(
  (
    select count(*)::integer
    from public.product_price_versions
    where product_id = 'c1000000-0000-4000-8000-000000000003'
  ),
  0,
  'draft has no public price'
);

select lives_ok(
  $$
    select *
    from public.admin_publish_existing_product(
      'c1000000-0000-4000-8000-000000000003'
    )
  $$,
  'administrator can publish an existing draft'
);

select is(
  (
    select status::text
    from public.products
    where id = 'c1000000-0000-4000-8000-000000000003'
  ),
  'active',
  'published draft becomes active'
);

select lives_ok(
  $$
    select public.admin_create_exchange_rate(
      ((clock_timestamp() at time zone 'America/La_Paz')::date - 1),
      'https://www.bcb.gob.bo/',
      1390,
      6.96,
      0.30,
      'Phase six test rate'
    )
  $$,
  'administrator can record a reviewed exchange rate'
);

select is(
  (
    select contingency_rate
    from public.exchange_rates
    order by created_at desc
    limit 1
  ),
  0.030000::numeric,
  'secure rate creation fixes contingency at three percent'
);

select ok(
  (
    select count(*)
    from public.admin_preview_available_prices(
      (select current_exchange_rate_id from public.campaign_settings where id = 1)
    )
  ) >= 1,
  'bulk price preview includes active products with remaining stock'
);

select lives_ok(
  $$
    select *
    from public.admin_refresh_available_prices_now(
      (select current_exchange_rate_id from public.campaign_settings where id = 1)
    )
  $$,
  'bulk price refresh uses the database-calculated expiration'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000099","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$ select * from public.admin_list_products(1, 50) $$,
  '42501',
  'ADMIN_REQUIRED',
  'non-administrator cannot list exact product quantities'
);

reset role;
select set_config('request.jwt.claims', '', true);

select * from finish();
rollback;
