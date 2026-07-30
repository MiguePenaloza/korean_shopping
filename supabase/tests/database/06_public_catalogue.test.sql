begin;

select plan(16);

select has_view(
  'public',
  'public_categories',
  'safe public category projection exists'
);

select has_function(
  'public',
  'search_public_catalogue',
  array['text', 'text', 'integer', 'integer'],
  'paginated public catalogue RPC exists'
);

select is(
  has_table_privilege('anon', 'public.public_categories', 'SELECT'),
  true,
  'anonymous visitors can read safe public categories'
);

select is(
  has_table_privilege('anon', 'public.categories', 'SELECT'),
  false,
  'anonymous visitors cannot read the raw category table'
);

select is(
  has_function_privilege(
    'anon',
    'public.search_public_catalogue(text,text,integer,integer)',
    'EXECUTE'
  ),
  true,
  'anonymous visitors can execute safe catalogue search'
);

select is(
  has_function_privilege(
    'anon',
    'public.product_public_state(uuid)',
    'EXECUTE'
  ),
  true,
  'anonymous visitors can resolve the safe state used by product detail'
);

select hasnt_column(
  'public',
  'public_catalogue',
  'total_stock',
  'public catalogue does not expose total inventory'
);

select hasnt_column(
  'public',
  'public_catalogue',
  'confirmed_stock',
  'public catalogue does not expose confirmed inventory'
);

insert into public.products (
  id,
  code,
  name,
  brand,
  category_id,
  description,
  variant,
  price_krw,
  product_margin_bob,
  total_stock,
  status,
  created_at
)
values (
  'b0000000-0000-4000-8000-000000000001',
  'BP-EXPIRED',
  'Producto con precio vencido',
  'Belle Test',
  '10000000-0000-4000-8000-000000000001',
  'Producto temporal para la prueba pública.',
  '1 unidad',
  10000,
  40,
  2,
  'active',
  clock_timestamp() + interval '1 minute'
);

insert into public.product_price_versions (
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
  valid_from,
  expires_at
)
values (
  'b0000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  10000,
  1380,
  6.96,
  0.28,
  0.03,
  40,
  52.4638,
  54.0377,
  95,
  clock_timestamp() - interval '2 hours',
  clock_timestamp() - interval '1 hour'
);

select is(
  (
    select count(*)::integer
    from public.search_public_catalogue('', null, 1, 20)
  ),
  4,
  'catalogue search returns active seed and test products'
);

select is(
  (
    select total_count::integer
    from public.search_public_catalogue('', null, 1, 20)
    limit 1
  ),
  4,
  'catalogue search returns the full filtered count'
);

select is(
  (
    select availability
    from public.search_public_catalogue('', null, 1, 20)
    order by row_number() over ()
    desc
    limit 1
  ),
  'expired',
  'expired prices sort after orderable products'
);

select is(
  (
    select count(*)::integer
    from public.search_public_catalogue('rom&nd', null, 1, 20)
  ),
  1,
  'search matches product brand'
);

select is(
  (
    select count(*)::integer
    from public.search_public_catalogue('', 'skincare', 1, 20)
  ),
  2,
  'category filter uses the safe slug'
);

select is(
  (
    select count(*)::integer
    from public.search_public_catalogue('', null, 2, 2)
  ),
  2,
  'pagination returns the requested second page'
);

select throws_ok(
  $$ select * from public.search_public_catalogue('', null, 0, 20) $$,
  '22023',
  'INVALID_PAGE',
  'invalid page is rejected'
);

select throws_ok(
  $$ select * from public.search_public_catalogue('', null, 1, 21) $$,
  '22023',
  'INVALID_PAGE_SIZE',
  'page size above 20 is rejected'
);

select * from finish();
rollback;
