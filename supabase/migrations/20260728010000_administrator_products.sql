-- Belle Perle — secure administrator product, image, rate, and bulk-price workflows.

alter table public.product_images
add column thumbnail_storage_path text,
add column thumbnail_width integer,
add column thumbnail_height integer;

alter table public.product_images
add constraint product_images_thumbnail_storage_path_check check (
  thumbnail_storage_path is null
  or (
    thumbnail_storage_path !~ '(^|/)\.\.(/|$)'
    and char_length(thumbnail_storage_path) between 3 and 500
  )
),
add constraint product_images_thumbnail_dimensions_check check (
  (
    thumbnail_storage_path is null
    and thumbnail_width is null
    and thumbnail_height is null
  )
  or (
    thumbnail_storage_path is not null
    and thumbnail_width between 1 and 480
    and thumbnail_height between 1 and 480
  )
);

create unique index product_images_thumbnail_storage_path_unique_idx
on public.product_images (thumbnail_storage_path)
where thumbnail_storage_path is not null;

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
  coalesce(thumbnail.thumbnail_storage_path, thumbnail.storage_path) as thumbnail_path,
  thumbnail.alt_text as thumbnail_alt,
  product.created_at as published_at,
  thumbnail.storage_path as image_path
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

create or replace view public.public_product_images as
select
  image.product_id,
  image.storage_path,
  coalesce(image.thumbnail_storage_path, image.storage_path) as thumbnail_storage_path,
  image.alt_text,
  image.sort_order,
  image.width,
  image.height
from public.product_images as image
join public.products as product on product.id = image.product_id
where product.status = 'active';

create or replace function public.next_price_expiration(
  p_now timestamptz default clock_timestamp()
)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (
    (
      case
        when (p_now at time zone 'America/La_Paz')::time < time '08:15'
          then (p_now at time zone 'America/La_Paz')::date
        else (p_now at time zone 'America/La_Paz')::date + 1
      end
    ) + time '08:15'
  ) at time zone 'America/La_Paz';
$$;

create or replace function public.admin_get_pricing_context()
returns table (
  exchange_rate_id uuid,
  observed_for_date date,
  krw_per_usd numeric,
  bcb_bob_per_usd numeric,
  bank_spread_bob_per_usd numeric,
  contingency_rate numeric,
  next_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();

  return query
  select
    rate.id,
    observation.observed_for_date,
    rate.krw_per_usd,
    rate.bcb_bob_per_usd,
    rate.bank_spread_bob_per_usd,
    rate.contingency_rate,
    public.next_price_expiration(clock_timestamp())
  from public.campaign_settings as settings
  join public.exchange_rates as rate
    on rate.id = settings.current_exchange_rate_id
  left join public.rate_observations as observation
    on observation.id = rate.observation_id
  where settings.id = 1;
end;
$$;

create or replace function public.admin_create_product(
  p_product_id uuid,
  p_name text,
  p_brand text,
  p_category_id uuid,
  p_description text,
  p_variant text,
  p_price_krw integer,
  p_total_stock integer,
  p_product_margin_bob numeric,
  p_status text,
  p_images jsonb default '[]'::jsonb
)
returns table (
  product_id uuid,
  product_code text,
  selling_price_bob numeric,
  price_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_rate_id uuid;
  v_expires_at timestamptz;
  v_price_id uuid;
  v_price numeric;
  v_image record;
  v_images jsonb := coalesce(p_images, '[]'::jsonb);
begin
  perform public.require_admin();

  if p_product_id is null then
    raise exception using errcode = '22023', message = 'PRODUCT_ID_REQUIRED';
  end if;

  if char_length(trim(coalesce(p_name, ''))) not between 2 and 160
    or char_length(trim(coalesce(p_brand, ''))) not between 1 and 120
  then
    raise exception using errcode = '22023', message = 'INVALID_PRODUCT_TEXT';
  end if;

  if p_price_krw is null or p_price_krw < 1
    or p_total_stock is null or p_total_stock < 0 or p_total_stock > 10000
    or p_product_margin_bob is null
    or p_product_margin_bob < 0
    or p_product_margin_bob > 100000
  then
    raise exception using errcode = '22023', message = 'INVALID_PRODUCT_NUMBERS';
  end if;

  if p_status not in ('draft', 'active') then
    raise exception using errcode = '22023', message = 'INVALID_PRODUCT_STATUS';
  end if;

  if not exists (
    select 1
    from public.categories as category
    where category.id = p_category_id
      and category.is_active
  ) then
    raise exception using errcode = '22023', message = 'INVALID_CATEGORY';
  end if;

  if jsonb_typeof(v_images) <> 'array'
    or jsonb_array_length(v_images) > 3
  then
    raise exception using errcode = '22023', message = 'INVALID_IMAGES';
  end if;

  if jsonb_array_length(v_images) > 0
    and (
      select count(*)
      from jsonb_to_recordset(v_images) as image(is_thumbnail boolean)
      where image.is_thumbnail
    ) <> 1
  then
    raise exception using errcode = '22023', message = 'ONE_THUMBNAIL_REQUIRED';
  end if;

  v_code := 'BP-' || upper(
    substr(replace(p_product_id::text, '-', ''), 1, 6)
    || right(replace(p_product_id::text, '-', ''), 6)
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
    created_by,
    updated_by
  )
  values (
    p_product_id,
    v_code,
    trim(p_name),
    trim(p_brand),
    p_category_id,
    trim(coalesce(p_description, '')),
    trim(coalesce(p_variant, '')),
    p_price_krw,
    p_product_margin_bob,
    p_total_stock,
    p_status::public.product_status,
    auth.uid(),
    auth.uid()
  );

  for v_image in
    select *
    from jsonb_to_recordset(v_images) as image(
      storage_path text,
      thumbnail_storage_path text,
      alt_text text,
      sort_order smallint,
      width integer,
      height integer,
      thumbnail_width integer,
      thumbnail_height integer,
      is_thumbnail boolean
    )
  loop
    if v_image.storage_path not like 'products/' || p_product_id::text || '/%'
      or v_image.thumbnail_storage_path not like 'products/' || p_product_id::text || '/%'
      or v_image.storage_path = v_image.thumbnail_storage_path
    then
      raise exception using errcode = '22023', message = 'INVALID_IMAGE_PATH';
    end if;

    insert into public.product_images (
      product_id,
      storage_path,
      thumbnail_storage_path,
      alt_text,
      sort_order,
      width,
      height,
      thumbnail_width,
      thumbnail_height,
      is_thumbnail,
      created_by
    )
    values (
      p_product_id,
      v_image.storage_path,
      v_image.thumbnail_storage_path,
      trim(v_image.alt_text),
      v_image.sort_order,
      v_image.width,
      v_image.height,
      v_image.thumbnail_width,
      v_image.thumbnail_height,
      coalesce(v_image.is_thumbnail, false),
      auth.uid()
    );
  end loop;

  if p_status = 'active' then
    select settings.current_exchange_rate_id
    into v_rate_id
    from public.campaign_settings as settings
    where settings.id = 1;

    if v_rate_id is null then
      raise exception using errcode = 'P0001', message = 'CURRENT_RATE_REQUIRED';
    end if;

    v_expires_at := public.next_price_expiration(clock_timestamp());
    v_price_id := public.admin_publish_product_price(
      p_product_id,
      v_rate_id,
      v_expires_at
    );

    select version.selling_price_bob
    into v_price
    from public.product_price_versions as version
    where version.id = v_price_id;
  end if;

  return query
  select p_product_id, v_code, v_price, v_expires_at;
end;
$$;

create or replace function public.admin_publish_existing_product(p_product_id uuid)
returns table (
  price_version_id uuid,
  selling_price_bob numeric,
  price_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rate_id uuid;
  v_expires_at timestamptz;
  v_price_id uuid;
  v_price numeric;
begin
  perform public.require_admin();

  select settings.current_exchange_rate_id
  into v_rate_id
  from public.campaign_settings as settings
  where settings.id = 1;

  if v_rate_id is null then
    raise exception using errcode = 'P0001', message = 'CURRENT_RATE_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.products as product
    where product.id = p_product_id
      and product.status = 'draft'
  ) then
    raise exception using errcode = 'P0001', message = 'DRAFT_PRODUCT_REQUIRED';
  end if;

  v_expires_at := public.next_price_expiration(clock_timestamp());

  update public.products as product
  set status = 'active',
      updated_by = auth.uid()
  where product.id = p_product_id;

  v_price_id := public.admin_publish_product_price(
    p_product_id,
    v_rate_id,
    v_expires_at
  );

  select version.selling_price_bob
  into v_price
  from public.product_price_versions as version
  where version.id = v_price_id;

  return query select v_price_id, v_price, v_expires_at;
end;
$$;

create or replace function public.admin_list_products(
  p_page integer default 1,
  p_page_size integer default 50
)
returns table (
  id uuid,
  code text,
  name text,
  brand text,
  category_name text,
  variant text,
  status text,
  total_stock integer,
  confirmed_stock integer,
  reserved_stock integer,
  remaining_stock integer,
  price_krw integer,
  product_margin_bob numeric,
  selling_price_bob numeric,
  price_expires_at timestamptz,
  thumbnail_path text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();

  if p_page < 1 or p_page_size < 1 or p_page_size > 50 then
    raise exception using errcode = '22023', message = 'INVALID_ADMIN_PAGE';
  end if;

  return query
  select
    product.id,
    product.code,
    product.name,
    product.brand,
    category.name,
    product.variant,
    product.status::text,
    product.total_stock,
    product.confirmed_stock,
    greatest(
      product.total_stock
        - product.confirmed_stock
        - public.available_product_quantity(product.id),
      0
    )::integer,
    public.available_product_quantity(product.id),
    product.price_krw,
    product.product_margin_bob,
    latest_price.selling_price_bob,
    latest_price.expires_at,
    coalesce(image.thumbnail_storage_path, image.storage_path),
    count(*) over()
  from public.products as product
  join public.categories as category on category.id = product.category_id
  left join lateral (
    select version.selling_price_bob, version.expires_at
    from public.product_price_versions as version
    where version.product_id = product.id
    order by version.created_at desc
    limit 1
  ) as latest_price on true
  left join lateral (
    select product_image.thumbnail_storage_path, product_image.storage_path
    from public.product_images as product_image
    where product_image.product_id = product.id
    order by product_image.is_thumbnail desc, product_image.sort_order
    limit 1
  ) as image on true
  order by product.created_at desc, product.id
  limit p_page_size
  offset (p_page - 1) * p_page_size;
end;
$$;

create or replace function public.admin_create_exchange_rate(
  p_observed_for_date date,
  p_source_url text,
  p_krw_per_usd numeric,
  p_bcb_bob_per_usd numeric,
  p_bank_spread_bob_per_usd numeric,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_observation_id uuid;
  v_rate_id uuid;
  v_today date := (clock_timestamp() at time zone 'America/La_Paz')::date;
begin
  perform public.require_admin();

  if p_observed_for_date is null or p_observed_for_date > v_today
    or p_krw_per_usd is null or p_krw_per_usd <= 0
    or p_bcb_bob_per_usd is null or p_bcb_bob_per_usd <= 0
    or p_bank_spread_bob_per_usd is null or p_bank_spread_bob_per_usd < 0
  then
    raise exception using errcode = '22023', message = 'INVALID_RATE';
  end if;

  insert into public.rate_observations (
    observed_for_date,
    source_name,
    source_url,
    bcb_bob_per_usd,
    observed_by,
    notes
  )
  values (
    p_observed_for_date,
    'BCB',
    nullif(trim(coalesce(p_source_url, '')), ''),
    p_bcb_bob_per_usd,
    auth.uid(),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  on conflict (observed_for_date, source_name) do update
  set source_url = excluded.source_url,
      bcb_bob_per_usd = excluded.bcb_bob_per_usd,
      observed_by = excluded.observed_by,
      notes = excluded.notes
  returning id into v_observation_id;

  insert into public.exchange_rates (
    observation_id,
    krw_per_usd,
    bcb_bob_per_usd,
    bank_spread_bob_per_usd,
    contingency_rate,
    effective_from,
    created_by,
    notes
  )
  values (
    v_observation_id,
    p_krw_per_usd,
    p_bcb_bob_per_usd,
    p_bank_spread_bob_per_usd,
    0.03,
    clock_timestamp(),
    auth.uid(),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_rate_id;

  update public.campaign_settings
  set current_exchange_rate_id = v_rate_id,
      updated_by = auth.uid()
  where id = 1;

  return v_rate_id;
end;
$$;

create or replace function public.admin_preview_available_prices(
  p_exchange_rate_id uuid
)
returns table (
  product_id uuid,
  product_code text,
  product_name text,
  current_price_bob numeric,
  new_price_bob numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();

  if not exists (
    select 1
    from public.exchange_rates as rate
    where rate.id = p_exchange_rate_id
  ) then
    raise exception using errcode = 'P0001', message = 'RATE_NOT_FOUND';
  end if;

  return query
  select
    product.id,
    product.code,
    product.name,
    latest_price.selling_price_bob,
    calculation.selling_price_bob
  from public.products as product
  join public.exchange_rates as rate on rate.id = p_exchange_rate_id
  cross join lateral public.calculate_product_price(
    product.price_krw,
    rate.krw_per_usd,
    rate.bcb_bob_per_usd,
    rate.bank_spread_bob_per_usd,
    rate.contingency_rate,
    product.product_margin_bob
  ) as calculation
  left join lateral (
    select version.selling_price_bob
    from public.product_price_versions as version
    where version.product_id = product.id
    order by version.created_at desc
    limit 1
  ) as latest_price on true
  where product.status = 'active'
    and product.total_stock > product.confirmed_stock
  order by product.code;
end;
$$;

create or replace function public.admin_refresh_available_prices_now(
  p_exchange_rate_id uuid
)
returns table (
  updated_count integer,
  price_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expires_at timestamptz;
  v_count integer;
begin
  perform public.require_admin();
  v_expires_at := public.next_price_expiration(clock_timestamp());
  v_count := public.admin_refresh_available_prices(
    p_exchange_rate_id,
    v_expires_at
  );
  return query select v_count, v_expires_at;
end;
$$;

revoke insert, update, delete on
  public.rate_observations,
  public.exchange_rates,
  public.campaign_settings,
  public.products,
  public.product_images
from authenticated;

revoke execute on function public.admin_publish_product_price(uuid, uuid, timestamptz)
  from authenticated;
revoke execute on function public.admin_refresh_available_prices(uuid, timestamptz)
  from authenticated;

revoke all on public.public_product_images from public, anon, authenticated;
grant select on public.public_product_images to anon, authenticated;

revoke all on function public.next_price_expiration(timestamptz)
  from public, anon, authenticated;
revoke all on function public.admin_get_pricing_context()
  from public, anon, authenticated;
revoke all on function public.admin_create_product(
  uuid, text, text, uuid, text, text, integer, integer, numeric, text, jsonb
) from public, anon, authenticated;
revoke all on function public.admin_publish_existing_product(uuid)
  from public, anon, authenticated;
revoke all on function public.admin_list_products(integer, integer)
  from public, anon, authenticated;
revoke all on function public.admin_create_exchange_rate(
  date, text, numeric, numeric, numeric, text
) from public, anon, authenticated;
revoke all on function public.admin_preview_available_prices(uuid)
  from public, anon, authenticated;
revoke all on function public.admin_refresh_available_prices_now(uuid)
  from public, anon, authenticated;

grant execute on function public.admin_get_pricing_context() to authenticated;
grant execute on function public.admin_create_product(
  uuid, text, text, uuid, text, text, integer, integer, numeric, text, jsonb
) to authenticated;
grant execute on function public.admin_publish_existing_product(uuid)
  to authenticated;
grant execute on function public.admin_list_products(integer, integer)
  to authenticated;
grant execute on function public.admin_create_exchange_rate(
  date, text, numeric, numeric, numeric, text
) to authenticated;
grant execute on function public.admin_preview_available_prices(uuid)
  to authenticated;
grant execute on function public.admin_refresh_available_prices_now(uuid)
  to authenticated;
