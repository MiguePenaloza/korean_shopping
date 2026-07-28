-- Belle Perle — customer checkout acceptance, safe confirmation, and WhatsApp contact.

alter table public.orders
add column terms_accepted_at timestamptz,
add column privacy_accepted_at timestamptz;

alter table public.orders
add constraint orders_acceptance_pair_check check (
  (terms_accepted_at is null and privacy_accepted_at is null)
  or (terms_accepted_at is not null and privacy_accepted_at is not null)
);

create or replace function public.submit_order(
  p_idempotency_key uuid,
  p_guest_name text,
  p_phone text,
  p_items jsonb,
  p_terms_accepted boolean,
  p_privacy_accepted boolean
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
  v_order_id uuid;
  v_order_number text;
  v_total_bob numeric;
  v_reservation_expires_at timestamptz;
  v_payment_report_expires_at timestamptz;
  v_accepted_at timestamptz := clock_timestamp();
begin
  if coalesce(p_terms_accepted, false) is not true
    or coalesce(p_privacy_accepted, false) is not true
  then
    raise exception using errcode = '22023', message = 'ACCEPTANCE_REQUIRED';
  end if;

  select
    created.order_id,
    created.order_number,
    created.total_bob,
    created.reservation_expires_at,
    created.payment_report_expires_at
  into
    v_order_id,
    v_order_number,
    v_total_bob,
    v_reservation_expires_at,
    v_payment_report_expires_at
  from public.create_order(
    p_idempotency_key,
    p_guest_name,
    p_phone,
    p_items
  ) as created;

  update public.orders as customer_order
  set terms_accepted_at = coalesce(
        customer_order.terms_accepted_at,
        v_accepted_at
      ),
      privacy_accepted_at = coalesce(
        customer_order.privacy_accepted_at,
        v_accepted_at
      )
  where customer_order.id = v_order_id;

  return query
  select
    v_order_id,
    v_order_number,
    v_total_bob,
    v_reservation_expires_at,
    v_payment_report_expires_at;
end;
$$;

create or replace function public.get_own_order_confirmation(p_order_id uuid)
returns table (
  order_id uuid,
  order_number text,
  customer_name text,
  total_bob numeric,
  order_status text,
  payment_status text,
  reservation_expires_at timestamptz,
  payment_report_expires_at timestamptz,
  created_at timestamptz,
  whatsapp_phone_e164 text,
  items jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  perform public.expire_inventory_reservations();

  if not exists (
    select 1
    from public.orders as owned_order
    where owned_order.id = p_order_id
      and (
        owned_order.actor_id = v_actor_id
        or owned_order.customer_id = v_actor_id
      )
  ) then
    raise exception using errcode = '42501', message = 'ORDER_NOT_ACCESSIBLE';
  end if;

  return query
  select
    customer_order.id,
    customer_order.order_number,
    customer_order.guest_name,
    customer_order.total_bob,
    customer_order.status::text,
    customer_order.payment_status::text,
    customer_order.reservation_expires_at,
    customer_order.payment_report_expires_at,
    customer_order.created_at,
    settings.whatsapp_phone_e164,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'product_code', order_item.product_code,
            'product_name', order_item.product_name,
            'product_brand', order_item.product_brand,
            'product_variant', order_item.product_variant,
            'unit_price_bob', order_item.unit_price_bob,
            'quantity', order_item.quantity,
            'line_total_bob', order_item.line_total_bob
          )
          order by order_item.created_at, order_item.id
        )
        from public.order_items as order_item
        where order_item.order_id = customer_order.id
      ),
      '[]'::jsonb
    )
  from public.orders as customer_order
  cross join public.campaign_settings as settings
  where customer_order.id = p_order_id
    and settings.id = 1;
end;
$$;

create or replace function public.report_own_order_payment(p_order_id uuid)
returns table (
  payment_status text,
  reservation_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  v_order := public.report_order_payment(p_order_id);
  return query
  select
    v_order.payment_status::text,
    v_order.reservation_expires_at;
end;
$$;

drop policy if exists campaign_settings_public_read
on public.campaign_settings;

revoke select on public.campaign_settings from anon, authenticated;

revoke all on function public.create_order(uuid, text, text, jsonb)
from public, anon, authenticated;
grant execute on function public.create_order(uuid, text, text, jsonb)
to service_role;

revoke all on function public.submit_order(
  uuid, text, text, jsonb, boolean, boolean
)
from public, anon, authenticated;
grant execute on function public.submit_order(
  uuid, text, text, jsonb, boolean, boolean
)
to authenticated;

revoke all on function public.get_own_order_confirmation(uuid)
from public, anon, authenticated;
grant execute on function public.get_own_order_confirmation(uuid)
to authenticated;

revoke all on function public.report_order_payment(uuid)
from public, anon, authenticated;
grant execute on function public.report_order_payment(uuid)
to service_role;

revoke all on function public.report_own_order_payment(uuid)
from public, anon, authenticated;
grant execute on function public.report_own_order_payment(uuid)
to authenticated;
