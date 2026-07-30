-- Baseline catalogue categories required in every environment.
-- Development-only rates and products remain in supabase/seed.sql and are not
-- pushed to production.

insert into public.categories (id, name, slug, sort_order, is_active)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Skincare',
    'skincare',
    10,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Maquillaje',
    'maquillaje',
    20,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'K-pop',
    'k-pop',
    30,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'Merch',
    'merch',
    40,
    true
  )
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
