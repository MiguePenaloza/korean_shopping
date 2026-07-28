-- Belle Perle — safe public catalogue, categories, search, sorting, and pagination.

create or replace view public.public_catalogue as
select
  product.id,
  product.code,
  product.name,
  product.brand,
  product.description,
  product.variant,
  category.id as category_id,
  category.name as category_name,
  category.slug as category_slug,
  latest_price.selling_price_bob as price_bob,
  latest_price.expires_at as price_expires_at,
  public.product_public_state(product.id) as availability,
  thumbnail.storage_path as thumbnail_path,
  thumbnail.alt_text as thumbnail_alt,
  product.created_at as published_at
from public.products as product
join public.categories as category
  on category.id = product.category_id
  and category.is_active
left join lateral (
  select version.selling_price_bob, version.expires_at
  from public.product_price_versions as version
  where version.product_id = product.id
  order by version.created_at desc
  limit 1
) as latest_price on true
left join lateral (
  select image.storage_path, image.alt_text
  from public.product_images as image
  where image.product_id = product.id
  order by image.is_thumbnail desc, image.sort_order
  limit 1
) as thumbnail on true
where product.status = 'active';

create or replace view public.public_categories as
select
  category.id,
  category.name,
  category.slug,
  category.sort_order
from public.categories as category
where category.is_active;

create or replace function public.search_public_catalogue(
  p_query text default '',
  p_category_slug text default null,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  id uuid,
  code text,
  name text,
  brand text,
  description text,
  variant text,
  category_id uuid,
  category_name text,
  category_slug text,
  price_bob numeric,
  price_expires_at timestamptz,
  availability text,
  thumbnail_path text,
  thumbnail_alt text,
  published_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_page < 1 then
    raise exception using errcode = '22023', message = 'INVALID_PAGE';
  end if;

  if p_page_size < 1 or p_page_size > 20 then
    raise exception using errcode = '22023', message = 'INVALID_PAGE_SIZE';
  end if;

  if char_length(trim(coalesce(p_query, ''))) > 120 then
    raise exception using errcode = '22023', message = 'QUERY_TOO_LONG';
  end if;

  if char_length(trim(coalesce(p_category_slug, ''))) > 80 then
    raise exception using errcode = '22023', message = 'CATEGORY_TOO_LONG';
  end if;

  return query
  with filtered as (
    select catalogue.*
    from public.public_catalogue as catalogue
    where (
      nullif(trim(coalesce(p_query, '')), '') is null
      or strpos(
        lower(concat_ws(' ', catalogue.name, catalogue.brand, catalogue.code)),
        lower(trim(p_query))
      ) > 0
    )
    and (
      nullif(trim(coalesce(p_category_slug, '')), '') is null
      or catalogue.category_slug = trim(p_category_slug)
    )
  )
  select
    filtered.id,
    filtered.code,
    filtered.name,
    filtered.brand,
    filtered.description,
    filtered.variant,
    filtered.category_id,
    filtered.category_name,
    filtered.category_slug,
    filtered.price_bob,
    filtered.price_expires_at,
    filtered.availability,
    filtered.thumbnail_path,
    filtered.thumbnail_alt,
    filtered.published_at,
    count(*) over() as total_count
  from filtered
  order by
    case filtered.availability
      when 'available' then 0
      when 'reserved' then 1
      when 'sold_out' then 2
      else 3
    end,
    filtered.published_at desc,
    filtered.id
  limit p_page_size
  offset (p_page - 1) * p_page_size;
end;
$$;

revoke all on public.public_categories from public, anon, authenticated;
grant select on public.public_categories to anon, authenticated;

revoke all on function public.search_public_catalogue(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.search_public_catalogue(text, text, integer, integer)
  to anon, authenticated;

