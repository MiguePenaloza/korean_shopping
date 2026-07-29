-- Belle Perle — permanent-account order history and customer-safe tracking.

create or replace function public.require_permanent_account()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
begin
  if v_customer_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    or not exists (
      select 1
      from public.profiles as profile
      where profile.id = v_customer_id
    )
  then
    raise exception using
      errcode = '42501',
      message = 'PERMANENT_ACCOUNT_REQUIRED';
  end if;

  return v_customer_id;
end;
$$;

create or replace function public.list_own_account_orders(
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  order_number text,
  order_status text,
  payment_status text,
  total_bob numeric,
  created_at timestamptz,
  updated_at timestamptz,
  reservation_expires_at timestamptz,
  item_quantity integer,
  total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := public.require_permanent_account();
begin
  if p_page < 1 or p_page_size < 1 or p_page_size > 20 then
    raise exception using errcode = '22023', message = 'INVALID_PAGINATION';
  end if;

  perform public.expire_inventory_reservations();

  return query
  select
    customer_order.order_number,
    customer_order.status::text,
    customer_order.payment_status::text,
    customer_order.total_bob,
    customer_order.created_at,
    customer_order.updated_at,
    customer_order.reservation_expires_at,
    coalesce((
      select sum(item.quantity)::integer
      from public.order_items as item
      where item.order_id = customer_order.id
    ), 0),
    count(*) over ()
  from public.orders as customer_order
  where customer_order.customer_id = v_customer_id
  order by customer_order.created_at desc, customer_order.id
  limit p_page_size
  offset (p_page - 1) * p_page_size;
end;
$$;

create or replace function public.get_own_account_order_detail(
  p_order_number text
)
returns table (
  order_number text,
  customer_name text,
  order_status text,
  payment_status text,
  subtotal_bob numeric,
  total_bob numeric,
  reservation_expires_at timestamptz,
  payment_report_expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  whatsapp_phone_e164 text,
  items jsonb,
  history jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := public.require_permanent_account();
  v_order_number text := upper(trim(coalesce(p_order_number, '')));
begin
  if v_order_number !~ '^BP-[0-9]{4}-[0-9]{6}$' then
    raise exception using errcode = '22023', message = 'INVALID_ORDER_NUMBER';
  end if;

  perform public.expire_inventory_reservations();

  if not exists (
    select 1
    from public.orders as owned_order
    where owned_order.order_number = v_order_number
      and owned_order.customer_id = v_customer_id
  ) then
    raise exception using errcode = '42501', message = 'ORDER_NOT_ACCESSIBLE';
  end if;

  return query
  select
    customer_order.order_number,
    customer_order.guest_name,
    customer_order.status::text,
    customer_order.payment_status::text,
    customer_order.subtotal_bob,
    customer_order.total_bob,
    customer_order.reservation_expires_at,
    customer_order.payment_report_expires_at,
    customer_order.paid_at,
    customer_order.created_at,
    customer_order.updated_at,
    settings.whatsapp_phone_e164,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'product_code', item.product_code,
          'product_name', item.product_name,
          'product_brand', item.product_brand,
          'product_variant', item.product_variant,
          'unit_price_bob', item.unit_price_bob,
          'quantity', item.quantity,
          'line_total_bob', item.line_total_bob
        )
        order by item.created_at, item.id
      )
      from public.order_items as item
      where item.order_id = customer_order.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'from_status', state_change.from_status,
          'to_status', state_change.to_status,
          'from_payment_status', state_change.from_payment_status,
          'to_payment_status', state_change.to_payment_status,
          'created_at', state_change.created_at
        )
        order by state_change.created_at, state_change.id
      )
      from public.order_status_history as state_change
      where state_change.order_id = customer_order.id
    ), '[]'::jsonb)
  from public.orders as customer_order
  cross join public.campaign_settings as settings
  where customer_order.order_number = v_order_number
    and customer_order.customer_id = v_customer_id
    and settings.id = 1;
end;
$$;

create or replace function public.admin_advance_order_fulfillment(
  p_order_id uuid,
  p_next_status text
)
returns table (
  order_id uuid,
  order_status text,
  payment_status text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_next_status text := lower(trim(coalesce(p_next_status, '')));
  v_expected_status text;
begin
  perform public.require_admin();

  v_expected_status := case v_next_status
    when 'purchased' then 'confirmed'
    when 'in_transit' then 'purchased'
    when 'ready_for_delivery' then 'in_transit'
    when 'delivered' then 'ready_for_delivery'
    else null
  end;

  if v_expected_status is null then
    raise exception using
      errcode = '22023',
      message = 'INVALID_FULFILLMENT_STATUS';
  end if;

  select *
  into v_order
  from public.orders as customer_order
  where customer_order.id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;

  if v_order.payment_status <> 'paid'
    or v_order.status::text <> v_expected_status
  then
    raise exception using
      errcode = 'P0001',
      message = 'FULFILLMENT_TRANSITION_NOT_ALLOWED';
  end if;

  perform set_config(
    'app.order_change_action',
    'fulfillment_' || v_next_status,
    true
  );
  perform set_config('app.order_change_reason', '', true);

  update public.orders as customer_order
  set status = v_next_status::public.order_status
  where customer_order.id = v_order.id
  returning * into v_order;

  return query
  select
    v_order.id,
    v_order.status::text,
    v_order.payment_status::text,
    v_order.updated_at;
end;
$$;

revoke select on public.orders, public.order_items, public.order_status_history
from authenticated;

revoke all on function public.require_permanent_account()
from public, anon, authenticated;

revoke all on function public.list_own_account_orders(integer, integer)
from public, anon, authenticated;
grant execute on function public.list_own_account_orders(integer, integer)
to authenticated;

revoke all on function public.get_own_account_order_detail(text)
from public, anon, authenticated;
grant execute on function public.get_own_account_order_detail(text)
to authenticated;

revoke all on function public.admin_advance_order_fulfillment(uuid, text)
from public, anon, authenticated;
grant execute on function public.admin_advance_order_fulfillment(uuid, text)
to authenticated;
