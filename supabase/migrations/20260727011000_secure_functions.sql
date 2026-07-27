-- Belle Perle — authoritative pricing, inventory, checkout, and audit functions.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.role = 'admin'
  );
$$;

create or replace function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'ADMIN_REQUIRED';
  end if;
end;
$$;

create or replace function public.normalize_phone(p_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_digits text;
begin
  v_digits := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  if char_length(v_digits) = 8 then
    v_digits := '591' || v_digits;
  end if;

  if char_length(v_digits) < 8
    or char_length(v_digits) > 15
    or v_digits !~ '^[1-9][0-9]+$'
  then
    raise exception using
      errcode = '22023',
      message = 'INVALID_PHONE';
  end if;

  return '+' || v_digits;
end;
$$;

create or replace function public.calculate_product_price(
  p_price_krw integer,
  p_krw_per_usd numeric,
  p_bcb_bob_per_usd numeric,
  p_bank_spread_bob_per_usd numeric,
  p_contingency_rate numeric,
  p_product_margin_bob numeric
)
returns table (
  converted_cost_bob numeric,
  protected_cost_bob numeric,
  selling_price_bob numeric
)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_converted numeric(14, 4);
  v_protected numeric(14, 4);
begin
  if p_price_krw <= 0
    or p_krw_per_usd <= 0
    or p_bcb_bob_per_usd <= 0
    or p_bank_spread_bob_per_usd < 0
    or p_contingency_rate < 0
    or p_contingency_rate > 1
    or p_product_margin_bob < 0
  then
    raise exception using
      errcode = '22023',
      message = 'INVALID_PRICING_INPUT';
  end if;

  v_converted := round(
    (p_price_krw::numeric / p_krw_per_usd)
      * (p_bcb_bob_per_usd + p_bank_spread_bob_per_usd),
    4
  );
  v_protected := round(v_converted * (1 + p_contingency_rate), 4);

  return query
  select
    v_converted,
    v_protected,
    ceil(v_protected + p_product_margin_bob)::numeric(12, 2);
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.id is distinct from new.id then
    raise exception using errcode = '42501', message = 'PROFILE_ID_IMMUTABLE';
  end if;

  if old.role is distinct from new.role and not public.is_admin() then
    raise exception using errcode = '42501', message = 'ROLE_CHANGE_FORBIDDEN';
  end if;

  return new;
end;
$$;

create or replace function public.protect_price_version_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
    raise exception using errcode = '23514', message = 'PRICE_SNAPSHOT_IMMUTABLE';
  end if;

  if old.status <> new.status and not (
    old.status = 'active'
    and new.status in ('expired', 'superseded')
  ) then
    raise exception using errcode = '23514', message = 'INVALID_PRICE_TRANSITION';
  end if;

  return new;
end;
$$;

create or replace function public.block_immutable_row_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '23514', message = 'ROW_IMMUTABLE';
end;
$$;

create or replace function public.limit_product_images()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*)
    from public.product_images as image
    where image.product_id = new.product_id
      and image.id <> new.id
  ) >= 3 then
    raise exception using errcode = '23514', message = 'PRODUCT_IMAGE_LIMIT';
  end if;
  return new;
end;
$$;

create or replace function public.protect_product_inventory()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.confirmed_stock is distinct from new.confirmed_stock
    and current_user not in ('postgres', 'service_role')
  then
    raise exception using
      errcode = '42501',
      message = 'CONFIRMED_STOCK_REQUIRES_SECURE_FUNCTION';
  end if;
  return new;
end;
$$;

create or replace function public.audit_order_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (
      order_id,
      from_status,
      to_status,
      from_payment_status,
      to_payment_status,
      actor_id
    )
    values (
      new.id,
      null,
      new.status,
      null,
      new.payment_status,
      auth.uid()
    );
  elsif old.status is distinct from new.status
    or old.payment_status is distinct from new.payment_status
  then
    insert into public.order_status_history (
      order_id,
      from_status,
      to_status,
      from_payment_status,
      to_payment_status,
      actor_id
    )
    values (
      new.id,
      old.status,
      new.status,
      old.payment_status,
      new.payment_status,
      auth.uid()
    );
  end if;

  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger campaign_settings_set_updated_at
before update on public.campaign_settings
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger products_protect_inventory
before update on public.products
for each row execute function public.protect_product_inventory();

create trigger inventory_reservations_set_updated_at
before update on public.inventory_reservations
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger product_price_versions_protect_snapshot
before update on public.product_price_versions
for each row execute function public.protect_price_version_snapshot();

create trigger order_items_immutable
before update or delete on public.order_items
for each row execute function public.block_immutable_row_mutation();

create trigger product_images_limit
before insert or update on public.product_images
for each row execute function public.limit_product_images();

create trigger orders_audit_state
after insert or update on public.orders
for each row execute function public.audit_order_state();

create or replace function public.available_product_quantity(p_product_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    product.total_stock
      - product.confirmed_stock
      - coalesce((
        select sum(reservation.quantity)::integer
        from public.inventory_reservations as reservation
        where reservation.product_id = product.id
          and reservation.status = 'active'
          and reservation.expires_at > clock_timestamp()
      ), 0),
    0
  )
  from public.products as product
  where product.id = p_product_id;
$$;

create or replace function public.product_public_state(p_product_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when price.id is null
      or price.status <> 'active'
      or price.expires_at <= clock_timestamp()
      then 'expired'
    when public.available_product_quantity(product.id) > 0
      then 'available'
    when product.total_stock - product.confirmed_stock > 0
      then 'reserved'
    else 'sold_out'
  end
  from public.products as product
  left join lateral (
    select version.id, version.status, version.expires_at
    from public.product_price_versions as version
    where version.product_id = product.id
    order by version.created_at desc
    limit 1
  ) as price on true
  where product.id = p_product_id
    and product.status = 'active';
$$;

create or replace function public.expire_price_versions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.product_price_versions as version
  set status = 'expired'
  where version.status = 'active'
    and version.expires_at <= clock_timestamp();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.admin_publish_product_price(
  p_product_id uuid,
  p_exchange_rate_id uuid,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_rate public.exchange_rates%rowtype;
  v_calculation record;
  v_price_version_id uuid;
begin
  perform public.require_admin();

  if p_expires_at <= clock_timestamp() then
    raise exception using errcode = '22023', message = 'EXPIRATION_MUST_BE_FUTURE';
  end if;

  select *
  into v_product
  from public.products as product
  where product.id = p_product_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'PRODUCT_NOT_FOUND';
  end if;

  select *
  into v_rate
  from public.exchange_rates as rate
  where rate.id = p_exchange_rate_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'RATE_NOT_FOUND';
  end if;

  select *
  into v_calculation
  from public.calculate_product_price(
    v_product.price_krw,
    v_rate.krw_per_usd,
    v_rate.bcb_bob_per_usd,
    v_rate.bank_spread_bob_per_usd,
    v_rate.contingency_rate,
    v_product.product_margin_bob
  );

  update public.product_price_versions as version
  set status = 'superseded'
  where version.product_id = p_product_id
    and version.status = 'active';

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
    expires_at,
    created_by
  )
  values (
    v_product.id,
    v_rate.id,
    v_product.price_krw,
    v_rate.krw_per_usd,
    v_rate.bcb_bob_per_usd,
    v_rate.bank_spread_bob_per_usd,
    v_rate.contingency_rate,
    v_product.product_margin_bob,
    v_calculation.converted_cost_bob,
    v_calculation.protected_cost_bob,
    v_calculation.selling_price_bob,
    p_expires_at,
    auth.uid()
  )
  returning id into v_price_version_id;

  return v_price_version_id;
end;
$$;

create or replace function public.admin_refresh_available_prices(
  p_exchange_rate_id uuid,
  p_expires_at timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
  v_count integer := 0;
begin
  perform public.require_admin();

  for v_product_id in
    select product.id
    from public.products as product
    where product.status = 'active'
      and product.total_stock > product.confirmed_stock
    order by product.id
  loop
    perform public.admin_publish_product_price(
      v_product_id,
      p_exchange_rate_id,
      p_expires_at
    );
    v_count := v_count + 1;
  end loop;

  update public.campaign_settings
  set current_exchange_rate_id = p_exchange_rate_id,
      updated_by = auth.uid()
  where id = 1;

  return v_count;
end;
$$;

create or replace function public.create_order(
  p_idempotency_key uuid,
  p_guest_name text,
  p_phone text,
  p_items jsonb
)
returns table (
  order_id uuid,
  order_number text,
  total_bob numeric,
  reservation_expires_at timestamptz,
  payment_report_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_order_id uuid;
  v_existing public.orders%rowtype;
  v_settings public.campaign_settings%rowtype;
  v_now timestamptz := clock_timestamp();
  v_item record;
  v_product public.products%rowtype;
  v_price public.product_price_versions%rowtype;
  v_available integer;
  v_reserved integer;
  v_total numeric(12, 2) := 0;
  v_order_number text;
  v_phone text;
begin
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  if p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select *
  into v_existing
  from public.orders as existing_order
  where existing_order.actor_id = v_actor_id
    and existing_order.idempotency_key = p_idempotency_key;

  if found then
    return query
    select
      v_existing.id,
      v_existing.order_number,
      v_existing.total_bob,
      v_existing.reservation_expires_at,
      v_existing.payment_report_expires_at;
    return;
  end if;

  if char_length(trim(coalesce(p_guest_name, ''))) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'INVALID_NAME';
  end if;

  v_phone := public.normalize_phone(p_phone);

  if jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1
    or jsonb_array_length(p_items) > 20
  then
    raise exception using errcode = '22023', message = 'INVALID_ITEMS';
  end if;

  select *
  into v_settings
  from public.campaign_settings as settings
  where settings.id = 1
  for share;

  if not v_settings.ordering_open then
    raise exception using errcode = 'P0001', message = 'ORDERING_CLOSED';
  end if;

  v_order_number := 'BP-' ||
    to_char(v_now at time zone 'America/La_Paz', 'YYMM') ||
    '-' ||
    lpad(nextval('public.order_number_sequence')::text, 6, '0');

  insert into public.orders (
    order_number,
    actor_id,
    customer_id,
    guest_name,
    phone_e164,
    idempotency_key,
    reservation_expires_at,
    payment_report_expires_at
  )
  values (
    v_order_number,
    v_actor_id,
    (
      select profile.id
      from public.profiles as profile
      where profile.id = v_actor_id
    ),
    trim(p_guest_name),
    v_phone,
    p_idempotency_key,
    v_now + make_interval(mins => v_settings.reservation_minutes),
    v_now + make_interval(mins => v_settings.payment_report_minutes)
  )
  on conflict (actor_id, idempotency_key) do nothing
  returning id into v_order_id;

  if v_order_id is null then
    select *
    into v_existing
    from public.orders as existing_order
    where existing_order.actor_id = v_actor_id
      and existing_order.idempotency_key = p_idempotency_key;

    return query
    select
      v_existing.id,
      v_existing.order_number,
      v_existing.total_bob,
      v_existing.reservation_expires_at,
      v_existing.payment_report_expires_at;
    return;
  end if;

  for v_item in
    select parsed.product_id, sum(parsed.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as parsed(product_id uuid, quantity integer)
    group by parsed.product_id
    order by parsed.product_id
  loop
    if v_item.product_id is null
      or v_item.quantity is null
      or v_item.quantity < 1
      or v_item.quantity > 20
    then
      raise exception using errcode = '22023', message = 'INVALID_ITEM';
    end if;

    select *
    into v_product
    from public.products as product
    where product.id = v_item.product_id
    for update;

    if not found or v_product.status <> 'active' then
      raise exception using errcode = 'P0001', message = 'ITEM_UNAVAILABLE';
    end if;

    update public.inventory_reservations as stale
    set status = 'expired',
        released_at = v_now
    where stale.product_id = v_item.product_id
      and stale.status = 'active'
      and stale.expires_at <= v_now;

    select *
    into v_price
    from public.product_price_versions as version
    where version.product_id = v_product.id
      and version.status = 'active'
      and version.valid_from <= v_now
      and version.expires_at > v_now
    order by version.created_at desc
    limit 1;

    if not found then
      raise exception using errcode = 'P0001', message = 'PRICE_EXPIRED';
    end if;

    select coalesce(sum(reservation.quantity), 0)::integer
    into v_reserved
    from public.inventory_reservations as reservation
    where reservation.product_id = v_product.id
      and reservation.status = 'active'
      and reservation.expires_at > v_now;

    v_available := v_product.total_stock - v_product.confirmed_stock - v_reserved;

    if v_available < v_item.quantity then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_STOCK';
    end if;

    insert into public.order_items (
      order_id,
      product_id,
      price_version_id,
      product_code,
      product_name,
      product_brand,
      product_variant,
      price_krw,
      unit_price_bob,
      quantity,
      price_snapshot
    )
    values (
      v_order_id,
      v_product.id,
      v_price.id,
      v_product.code,
      v_product.name,
      v_product.brand,
      v_product.variant,
      v_price.price_krw,
      v_price.selling_price_bob,
      v_item.quantity,
      jsonb_build_object(
        'exchange_rate_id', v_price.exchange_rate_id,
        'krw_per_usd', v_price.krw_per_usd,
        'bcb_bob_per_usd', v_price.bcb_bob_per_usd,
        'bank_spread_bob_per_usd', v_price.bank_spread_bob_per_usd,
        'contingency_rate', v_price.contingency_rate,
        'product_margin_bob', v_price.product_margin_bob,
        'converted_cost_bob', v_price.converted_cost_bob,
        'protected_cost_bob', v_price.protected_cost_bob,
        'selling_price_bob', v_price.selling_price_bob,
        'valid_from', v_price.valid_from,
        'expires_at', v_price.expires_at
      )
    );

    insert into public.inventory_reservations (
      order_id,
      product_id,
      quantity,
      expires_at
    )
    values (
      v_order_id,
      v_product.id,
      v_item.quantity,
      v_now + make_interval(mins => v_settings.reservation_minutes)
    );

    v_total := v_total + (v_price.selling_price_bob * v_item.quantity);
  end loop;

  update public.orders as created_order
  set subtotal_bob = v_total,
      total_bob = v_total
  where created_order.id = v_order_id;

  return query
  select
    created_order.id,
    created_order.order_number,
    created_order.total_bob,
    created_order.reservation_expires_at,
    created_order.payment_report_expires_at
  from public.orders as created_order
  where created_order.id = v_order_id;
end;
$$;

create or replace function public.report_order_payment(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select *
  into v_order
  from public.orders as customer_order
  where customer_order.id = p_order_id
  for update;

  if not found
    or (
      v_order.actor_id <> auth.uid()
      and v_order.customer_id is distinct from auth.uid()
    )
  then
    raise exception using errcode = '42501', message = 'ORDER_NOT_ACCESSIBLE';
  end if;

  if v_order.payment_status = 'payment_reported' then
    return v_order;
  end if;

  if v_order.status <> 'pending_payment'
    or v_order.payment_status <> 'awaiting_payment'
    or clock_timestamp() > v_order.reservation_expires_at
  then
    raise exception using errcode = 'P0001', message = 'PAYMENT_REPORT_WINDOW_CLOSED';
  end if;

  update public.inventory_reservations as reservation
  set expires_at = v_order.payment_report_expires_at
  where reservation.order_id = v_order.id
    and reservation.status = 'active';

  update public.orders as customer_order
  set payment_status = 'payment_reported',
      reservation_expires_at = v_order.payment_report_expires_at
  where customer_order.id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.expire_inventory_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  perform customer_order.id
  from public.orders as customer_order
  where exists (
    select 1
    from public.inventory_reservations as reservation
    where reservation.order_id = customer_order.id
      and reservation.status = 'active'
      and reservation.expires_at <= v_now
  )
  order by customer_order.id
  for update;

  update public.inventory_reservations as reservation
  set status = 'expired',
      released_at = v_now
  where reservation.status = 'active'
    and reservation.expires_at <= v_now;

  get diagnostics v_count = row_count;

  update public.orders as customer_order
  set status = 'expired'
  where customer_order.status = 'pending_payment'
    and customer_order.payment_status in ('awaiting_payment', 'payment_reported')
    and customer_order.reservation_expires_at <= v_now
    and not exists (
      select 1
      from public.inventory_reservations as reservation
      where reservation.order_id = customer_order.id
        and reservation.status = 'active'
    );

  return v_count;
end;
$$;

create or replace function public.admin_confirm_order_paid(
  p_order_id uuid,
  p_accept_late boolean default false,
  p_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_product public.products%rowtype;
  v_available integer;
  v_active_reserved integer;
  v_was_expired boolean;
begin
  perform public.require_admin();

  select *
  into v_order
  from public.orders as customer_order
  where customer_order.id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;

  if v_order.payment_status = 'paid' then
    return v_order;
  end if;

  v_was_expired := v_order.status = 'expired'
    or v_order.reservation_expires_at <= clock_timestamp();

  if v_was_expired and (
    not p_accept_late
    or char_length(trim(coalesce(p_reason, ''))) < 10
  ) then
    raise exception using errcode = 'P0001', message = 'LATE_PAYMENT_REQUIRES_OVERRIDE';
  end if;

  for v_item in
    select item.product_id, item.quantity, reservation.status as reservation_status
    from public.order_items as item
    left join public.inventory_reservations as reservation
      on reservation.order_id = item.order_id
      and reservation.product_id = item.product_id
    where item.order_id = v_order.id
    order by item.product_id
  loop
    select *
    into v_product
    from public.products as product
    where product.id = v_item.product_id
    for update;

    if not found or v_product.status = 'archived' then
      raise exception using errcode = 'P0001', message = 'ITEM_UNAVAILABLE';
    end if;

    if v_item.reservation_status is distinct from 'active' then
      select coalesce(sum(reservation.quantity), 0)::integer
      into v_active_reserved
      from public.inventory_reservations as reservation
      where reservation.product_id = v_product.id
        and reservation.status = 'active'
        and reservation.expires_at > clock_timestamp();

      v_available :=
        v_product.total_stock - v_product.confirmed_stock - v_active_reserved;

      if v_available < v_item.quantity then
        raise exception using errcode = 'P0001', message = 'INSUFFICIENT_STOCK';
      end if;
    end if;

    update public.products as product
    set confirmed_stock = product.confirmed_stock + v_item.quantity,
        updated_by = auth.uid()
    where product.id = v_product.id
      and product.confirmed_stock + v_item.quantity <= product.total_stock;

    if not found then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_STOCK';
    end if;

    update public.inventory_reservations as reservation
    set status = 'converted',
        converted_at = clock_timestamp()
    where reservation.order_id = v_order.id
      and reservation.product_id = v_product.id;
  end loop;

  if v_was_expired then
    insert into public.order_admin_overrides (
      order_id,
      override_type,
      reason,
      created_by
    )
    values (
      v_order.id,
      'late_payment_acceptance',
      trim(p_reason),
      auth.uid()
    );
  end if;

  update public.orders as customer_order
  set status = 'confirmed',
      payment_status = 'paid',
      paid_at = clock_timestamp()
  where customer_order.id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.expire_due_records()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prices integer;
  v_reservations integer;
begin
  v_prices := public.expire_price_versions();
  v_reservations := public.expire_inventory_reservations();
  return jsonb_build_object(
    'expired_price_versions', v_prices,
    'expired_reservations', v_reservations,
    'executed_at', clock_timestamp()
  );
end;
$$;

create view public.public_catalogue as
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
  thumbnail.alt_text as thumbnail_alt
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
