-- Belle Perle — keep public projections narrow without SECURITY DEFINER views.

create or replace function public.get_public_catalogue_rows()
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
  price_bob numeric(12, 2),
  price_expires_at timestamptz,
  availability text,
  thumbnail_path text,
  thumbnail_alt text,
  published_at timestamptz,
  image_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    product.id,
    product.code,
    product.name,
    product.brand,
    product.description,
    product.variant,
    category.id,
    category.name,
    category.slug,
    latest_price.selling_price_bob,
    latest_price.expires_at,
    public.product_public_state(product.id),
    coalesce(thumbnail.thumbnail_storage_path, thumbnail.storage_path),
    thumbnail.alt_text,
    product.created_at,
    thumbnail.storage_path
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
    select
      image.storage_path,
      image.thumbnail_storage_path,
      image.alt_text
    from public.product_images as image
    where image.product_id = product.id
    order by image.is_thumbnail desc, image.sort_order
    limit 1
  ) as thumbnail on true
  where product.status = 'active';
$$;

create or replace function public.get_public_category_rows()
returns table (
  id uuid,
  name text,
  slug text,
  sort_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    category.id,
    category.name,
    category.slug,
    category.sort_order
  from public.categories as category
  where category.is_active;
$$;

create or replace function public.get_public_product_image_rows()
returns table (
  product_id uuid,
  storage_path text,
  thumbnail_storage_path text,
  alt_text text,
  sort_order smallint,
  width integer,
  height integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    image.product_id,
    image.storage_path,
    coalesce(image.thumbnail_storage_path, image.storage_path),
    image.alt_text,
    image.sort_order,
    image.width,
    image.height
  from public.product_images as image
  join public.products as product on product.id = image.product_id
  where product.status = 'active';
$$;

create or replace view public.public_catalogue
with (security_invoker = true)
as
select
  catalogue.id,
  catalogue.code,
  catalogue.name,
  catalogue.brand,
  catalogue.description,
  catalogue.variant,
  catalogue.category_id,
  catalogue.category_name,
  catalogue.category_slug,
  catalogue.price_bob::numeric(12, 2) as price_bob,
  catalogue.price_expires_at,
  catalogue.availability,
  catalogue.thumbnail_path,
  catalogue.thumbnail_alt,
  catalogue.published_at,
  catalogue.image_path
from public.get_public_catalogue_rows() as catalogue;

create or replace view public.public_categories
with (security_invoker = true)
as
select *
from public.get_public_category_rows();

create or replace view public.public_product_images
with (security_invoker = true)
as
select *
from public.get_public_product_image_rows();

revoke all on function public.get_public_catalogue_rows()
  from public, anon, authenticated;
grant execute on function public.get_public_catalogue_rows()
  to anon, authenticated;

revoke all on function public.get_public_category_rows()
  from public, anon, authenticated;
grant execute on function public.get_public_category_rows()
  to anon, authenticated;

revoke all on function public.get_public_product_image_rows()
  from public, anon, authenticated;
grant execute on function public.get_public_product_image_rows()
  to anon, authenticated;

revoke all on public.public_catalogue from public, anon, authenticated;
grant select on public.public_catalogue to anon, authenticated;

revoke all on public.public_categories from public, anon, authenticated;
grant select on public.public_categories to anon, authenticated;

revoke all on public.public_product_images from public, anon, authenticated;
grant select on public.public_product_images to anon, authenticated;

drop policy if exists product_images_public_read on storage.objects;
