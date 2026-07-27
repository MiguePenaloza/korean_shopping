-- Development-only catalogue seed. No real customer or payment data.

insert into public.categories (id, name, slug, sort_order)
values
  ('10000000-0000-4000-8000-000000000001', 'Skincare', 'skincare', 10),
  ('10000000-0000-4000-8000-000000000002', 'Maquillaje', 'maquillaje', 20),
  ('10000000-0000-4000-8000-000000000003', 'K-pop', 'k-pop', 30),
  ('10000000-0000-4000-8000-000000000004', 'Merch', 'merch', 40)
on conflict (id) do nothing;

insert into public.rate_observations (
  id,
  observed_for_date,
  source_name,
  bcb_bob_per_usd,
  notes
)
values (
  '20000000-0000-4000-8000-000000000001',
  current_date,
  'BCB',
  6.96,
  'Dato de desarrollo, no usar en producción.'
)
on conflict (id) do nothing;

insert into public.exchange_rates (
  id,
  observation_id,
  krw_per_usd,
  bcb_bob_per_usd,
  bank_spread_bob_per_usd,
  contingency_rate,
  effective_from,
  notes
)
values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  1380,
  6.96,
  0.28,
  0.03,
  clock_timestamp(),
  'Tasa simulada para desarrollo local.'
)
on conflict (id) do nothing;

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
  status
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    'BP-001',
    'Relief Sun Rice + Probiotics',
    'Beauty of Joseon',
    '10000000-0000-4000-8000-000000000001',
    'Protector solar ligero con acabado hidratante.',
    '50 ml',
    21000,
    42,
    4,
    'active'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    'BP-004',
    'Juicy Lasting Tint',
    'rom&nd',
    '10000000-0000-4000-8000-000000000002',
    'Tinte de labios de larga duración.',
    'N.º 23 Nucadamia',
    12500,
    45,
    3,
    'active'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    'BP-002',
    'The Star Chapter: SANCTUARY',
    'TXT',
    '10000000-0000-4000-8000-000000000003',
    'Álbum original en versión especial.',
    'Versión Angel',
    29500,
    80,
    2,
    'active'
  )
on conflict (id) do nothing;

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
  expires_at
)
select
  product.id,
  rate.id,
  product.price_krw,
  rate.krw_per_usd,
  rate.bcb_bob_per_usd,
  rate.bank_spread_bob_per_usd,
  rate.contingency_rate,
  product.product_margin_bob,
  price.converted_cost_bob,
  price.protected_cost_bob,
  price.selling_price_bob,
  clock_timestamp() + interval '24 hours'
from public.products as product
cross join public.exchange_rates as rate
cross join lateral public.calculate_product_price(
  product.price_krw,
  rate.krw_per_usd,
  rate.bcb_bob_per_usd,
  rate.bank_spread_bob_per_usd,
  rate.contingency_rate,
  product.product_margin_bob
) as price
where rate.id = '30000000-0000-4000-8000-000000000001'
  and product.id in (
    '40000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000003'
  )
  and not exists (
    select 1
    from public.product_price_versions as existing
    where existing.product_id = product.id
      and existing.status = 'active'
  );

update public.campaign_settings
set
  current_exchange_rate_id = '30000000-0000-4000-8000-000000000001',
  ordering_open = true
where id = 1;
