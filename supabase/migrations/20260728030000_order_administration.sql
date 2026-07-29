-- Belle Perle — administrator order workflow and private payment evidence.

create or replace function public.audit_order_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(
    current_setting('app.order_change_reason', true),
    ''
  );
  v_action text := nullif(
    current_setting('app.order_change_action', true),
    ''
  );
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
      actor_id,
      reason,
      metadata
    )
    values (
      new.id,
      old.status,
      new.status,
      old.payment_status,
      new.payment_status,
      auth.uid(),
      v_reason,
      case
        when v_action is null then '{}'::jsonb
        else jsonb_build_object('action', v_action)
      end
    );
  end if;

  return new;
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
  perform public.expire_inventory_reservations();

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

  if v_order.status not in ('pending_payment', 'expired')
    or v_order.payment_status not in ('awaiting_payment', 'payment_reported')
  then
    raise exception using errcode = 'P0001', message = 'PAYMENT_CONFIRMATION_NOT_ALLOWED';
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
    select
      item.product_id,
      item.quantity,
      reservation.status as reservation_status,
      reservation.expires_at as reservation_expires_at
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

    if v_item.reservation_status is distinct from 'active'
      or v_item.reservation_expires_at <= clock_timestamp()
    then
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
        converted_at = clock_timestamp(),
        released_at = null
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

  perform set_config(
    'app.order_change_action',
    case when v_was_expired then 'accept_late_payment' else 'confirm_paid' end,
    true
  );
  perform set_config(
    'app.order_change_reason',
    coalesce(nullif(trim(coalesce(p_reason, '')), ''), ''),
    true
  );

  update public.orders as customer_order
  set status = 'confirmed',
      payment_status = 'paid',
      paid_at = clock_timestamp()
  where customer_order.id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.admin_list_orders(
  p_filter text default 'all',
  p_page integer default 1,
  p_page_size integer default 50
)
returns table (
  id uuid,
  order_number text,
  customer_name text,
  phone_e164 text,
  order_status text,
  payment_status text,
  total_bob numeric,
  created_at timestamptz,
  reservation_expires_at timestamptz,
  item_quantity integer,
  evidence_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_filter text := lower(trim(coalesce(p_filter, 'all')));
begin
  perform public.require_admin();
  perform public.expire_inventory_reservations();

  if v_filter not in (
    'all',
    'payment_reported',
    'paid',
    'expired',
    'refund_pending',
    'refunded'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_ORDER_FILTER';
  end if;

  if p_page < 1 or p_page_size < 1 or p_page_size > 50 then
    raise exception using errcode = '22023', message = 'INVALID_PAGINATION';
  end if;

  return query
  select
    customer_order.id,
    customer_order.order_number,
    customer_order.guest_name,
    customer_order.phone_e164,
    customer_order.status::text,
    customer_order.payment_status::text,
    customer_order.total_bob,
    customer_order.created_at,
    customer_order.reservation_expires_at,
    coalesce((
      select sum(item.quantity)::integer
      from public.order_items as item
      where item.order_id = customer_order.id
    ), 0),
    (
      select count(*)::integer
      from public.payment_evidence as evidence
      where evidence.order_id = customer_order.id
    )
  from public.orders as customer_order
  where
    v_filter = 'all'
    or (v_filter = 'payment_reported'
      and customer_order.payment_status = 'payment_reported')
    or (v_filter = 'paid'
      and customer_order.payment_status = 'paid')
    or (v_filter = 'expired'
      and customer_order.status = 'expired')
    or (v_filter = 'refund_pending'
      and customer_order.payment_status = 'refund_pending')
    or (v_filter = 'refunded'
      and customer_order.payment_status = 'refunded')
  order by customer_order.created_at desc, customer_order.id
  limit p_page_size
  offset (p_page - 1) * p_page_size;
end;
$$;

create or replace function public.admin_get_order_detail(p_order_id uuid)
returns table (
  id uuid,
  order_number text,
  customer_name text,
  phone_e164 text,
  order_status text,
  payment_status text,
  subtotal_bob numeric,
  total_bob numeric,
  reservation_expires_at timestamptz,
  payment_report_expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  items jsonb,
  evidence jsonb,
  history jsonb,
  overrides jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  perform public.expire_inventory_reservations();

  return query
  select
    customer_order.id,
    customer_order.order_number,
    customer_order.guest_name,
    customer_order.phone_e164,
    customer_order.status::text,
    customer_order.payment_status::text,
    customer_order.subtotal_bob,
    customer_order.total_bob,
    customer_order.reservation_expires_at,
    customer_order.payment_report_expires_at,
    customer_order.paid_at,
    customer_order.created_at,
    customer_order.updated_at,
    customer_order.terms_accepted_at,
    customer_order.privacy_accepted_at,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item.id,
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
          'id', payment_file.id,
          'storage_path', payment_file.storage_path,
          'original_filename', payment_file.original_filename,
          'content_type', payment_file.content_type,
          'size_bytes', payment_file.size_bytes,
          'uploaded_by', payment_file.uploaded_by,
          'uploaded_by_name', coalesce(uploader.full_name, 'Administración'),
          'created_at', payment_file.created_at
        )
        order by payment_file.created_at desc, payment_file.id
      )
      from public.payment_evidence as payment_file
      left join public.profiles as uploader
        on uploader.id = payment_file.uploaded_by
      where payment_file.order_id = customer_order.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', state_change.id,
          'from_status', state_change.from_status,
          'to_status', state_change.to_status,
          'from_payment_status', state_change.from_payment_status,
          'to_payment_status', state_change.to_payment_status,
          'actor_name', coalesce(actor.full_name, 'Sistema'),
          'reason', state_change.reason,
          'metadata', state_change.metadata,
          'created_at', state_change.created_at
        )
        order by state_change.created_at desc, state_change.id desc
      )
      from public.order_status_history as state_change
      left join public.profiles as actor
        on actor.id = state_change.actor_id
      where state_change.order_id = customer_order.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'type', admin_override.override_type,
          'reason', admin_override.reason,
          'created_by_name', coalesce(creator.full_name, 'Administración'),
          'created_at', admin_override.created_at
        )
        order by admin_override.created_at desc, admin_override.id
      )
      from public.order_admin_overrides as admin_override
      left join public.profiles as creator
        on creator.id = admin_override.created_by
      where admin_override.order_id = customer_order.id
    ), '[]'::jsonb)
  from public.orders as customer_order
  where customer_order.id = p_order_id;
end;
$$;

create or replace function public.admin_change_order_state(
  p_order_id uuid,
  p_action text,
  p_reason text default null
)
returns table (
  order_id uuid,
  order_status text,
  payment_status text,
  paid_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_action text := lower(trim(coalesce(p_action, '')));
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_reservation record;
begin
  perform public.require_admin();
  perform public.expire_inventory_reservations();

  if v_action not in (
    'payment_reported',
    'reject_payment',
    'cancel',
    'refund_pending',
    'refunded'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_ORDER_ACTION';
  end if;

  if v_action in ('reject_payment', 'cancel', 'refund_pending', 'refunded')
    and char_length(coalesce(v_reason, '')) < 5
  then
    raise exception using errcode = '22023', message = 'ORDER_REASON_REQUIRED';
  end if;

  select *
  into v_order
  from public.orders as customer_order
  where customer_order.id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;

  perform set_config('app.order_change_action', v_action, true);
  perform set_config(
    'app.order_change_reason',
    coalesce(v_reason, ''),
    true
  );

  if v_action = 'payment_reported' then
    if v_order.payment_status = 'payment_reported' then
      null;
    elsif v_order.payment_status = 'awaiting_payment'
      and v_order.status in ('pending_payment', 'expired')
    then
      if v_order.status = 'pending_payment'
        and v_order.reservation_expires_at > clock_timestamp()
      then
        update public.inventory_reservations as reservation
        set expires_at = v_order.payment_report_expires_at
        where reservation.order_id = v_order.id
          and reservation.status = 'active';

        update public.orders as customer_order
        set payment_status = 'payment_reported',
            reservation_expires_at = customer_order.payment_report_expires_at
        where customer_order.id = v_order.id
        returning * into v_order;
      else
        update public.orders as customer_order
        set payment_status = 'payment_reported'
        where customer_order.id = v_order.id
        returning * into v_order;
      end if;
    else
      raise exception using errcode = 'P0001', message = 'PAYMENT_REPORT_NOT_ALLOWED';
    end if;
  elsif v_action = 'reject_payment' then
    if v_order.status not in ('pending_payment', 'expired')
      or v_order.payment_status not in ('awaiting_payment', 'payment_reported')
    then
      raise exception using errcode = 'P0001', message = 'PAYMENT_REJECTION_NOT_ALLOWED';
    end if;

    update public.inventory_reservations as reservation
    set status = 'released',
        released_at = clock_timestamp()
    where reservation.order_id = v_order.id
      and reservation.status = 'active';

    update public.orders as customer_order
    set status = 'cancelled',
        payment_status = 'rejected'
    where customer_order.id = v_order.id
    returning * into v_order;
  elsif v_action = 'cancel' then
    if v_order.status not in ('pending_payment', 'expired')
      or v_order.payment_status <> 'awaiting_payment'
    then
      raise exception using errcode = 'P0001', message = 'ORDER_CANCELLATION_NOT_ALLOWED';
    end if;

    update public.inventory_reservations as reservation
    set status = 'released',
        released_at = clock_timestamp()
    where reservation.order_id = v_order.id
      and reservation.status = 'active';

    update public.orders as customer_order
    set status = 'cancelled'
    where customer_order.id = v_order.id
    returning * into v_order;
  elsif v_action = 'refund_pending' then
    if v_order.status not in (
      'pending_payment',
      'confirmed',
      'expired',
      'cancelled'
    )
      or v_order.payment_status not in ('payment_reported', 'paid')
    then
      raise exception using errcode = 'P0001', message = 'REFUND_NOT_ALLOWED';
    end if;

    for v_reservation in
      select reservation.product_id, reservation.quantity
      from public.inventory_reservations as reservation
      where reservation.order_id = v_order.id
        and reservation.status = 'converted'
      order by reservation.product_id
    loop
      perform product.id
      from public.products as product
      where product.id = v_reservation.product_id
      for update;

      update public.products as product
      set confirmed_stock = product.confirmed_stock - v_reservation.quantity,
          updated_by = auth.uid()
      where product.id = v_reservation.product_id
        and product.confirmed_stock >= v_reservation.quantity;

      if not found then
        raise exception using errcode = 'P0001', message = 'INVENTORY_REVERSAL_FAILED';
      end if;
    end loop;

    update public.inventory_reservations as reservation
    set status = 'released',
        released_at = clock_timestamp()
    where reservation.order_id = v_order.id
      and reservation.status in ('active', 'converted');

    update public.orders as customer_order
    set status = 'refund_pending',
        payment_status = 'refund_pending'
    where customer_order.id = v_order.id
    returning * into v_order;
  elsif v_action = 'refunded' then
    if v_order.status <> 'refund_pending'
      or v_order.payment_status <> 'refund_pending'
    then
      raise exception using errcode = 'P0001', message = 'REFUND_COMPLETION_NOT_ALLOWED';
    end if;

    update public.orders as customer_order
    set status = 'refunded',
        payment_status = 'refunded'
    where customer_order.id = v_order.id
    returning * into v_order;
  end if;

  return query
  select
    v_order.id,
    v_order.status::text,
    v_order.payment_status::text,
    v_order.paid_at;
end;
$$;

create or replace function public.admin_attach_payment_evidence(
  p_order_id uuid,
  p_storage_path text,
  p_original_filename text,
  p_content_type text,
  p_size_bytes bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evidence_id uuid;
  v_path text := trim(coalesce(p_storage_path, ''));
begin
  perform public.require_admin();

  if not exists (
    select 1
    from public.orders as customer_order
    where customer_order.id = p_order_id
  ) then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;

  if v_path !~ (
    '^orders/' || p_order_id::text || '/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_EVIDENCE_PATH';
  end if;

  if p_content_type not in ('image/jpeg', 'image/png', 'image/webp')
    or p_size_bytes not between 1 and 10485760
    or char_length(trim(coalesce(p_original_filename, ''))) not between 1 and 255
  then
    raise exception using errcode = '22023', message = 'INVALID_EVIDENCE_FILE';
  end if;

  if not exists (
    select 1
    from storage.objects as stored_file
    where stored_file.bucket_id = 'payment-evidence'
      and stored_file.name = v_path
  ) then
    raise exception using errcode = 'P0001', message = 'EVIDENCE_OBJECT_NOT_FOUND';
  end if;

  insert into public.payment_evidence (
    order_id,
    storage_path,
    original_filename,
    content_type,
    size_bytes,
    uploaded_by
  )
  values (
    p_order_id,
    v_path,
    trim(p_original_filename),
    p_content_type,
    p_size_bytes,
    auth.uid()
  )
  returning id into v_evidence_id;

  return v_evidence_id;
end;
$$;

create or replace function public.admin_mark_order_paid(
  p_order_id uuid,
  p_accept_late boolean default false,
  p_reason text default null,
  p_evidence jsonb default null
)
returns table (
  order_id uuid,
  order_status text,
  payment_status text,
  paid_at timestamptz,
  evidence_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_evidence_id uuid;
begin
  perform public.require_admin();

  v_order := public.admin_confirm_order_paid(
    p_order_id,
    p_accept_late,
    p_reason
  );

  if p_evidence is not null and p_evidence <> '{}'::jsonb then
    v_evidence_id := public.admin_attach_payment_evidence(
      p_order_id,
      p_evidence ->> 'storage_path',
      p_evidence ->> 'original_filename',
      p_evidence ->> 'content_type',
      (p_evidence ->> 'size_bytes')::bigint
    );
  end if;

  return query
  select
    v_order.id,
    v_order.status::text,
    v_order.payment_status::text,
    v_order.paid_at,
    v_evidence_id;
end;
$$;

revoke all on function public.admin_confirm_order_paid(uuid, boolean, text)
from public, anon, authenticated;
grant execute on function public.admin_confirm_order_paid(uuid, boolean, text)
to service_role;

revoke all on function public.admin_list_orders(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.admin_list_orders(text, integer, integer)
to authenticated;

revoke all on function public.admin_get_order_detail(uuid)
from public, anon, authenticated;
grant execute on function public.admin_get_order_detail(uuid)
to authenticated;

revoke all on function public.admin_change_order_state(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.admin_change_order_state(uuid, text, text)
to authenticated;

revoke all on function public.admin_attach_payment_evidence(
  uuid, text, text, text, bigint
)
from public, anon, authenticated;
grant execute on function public.admin_attach_payment_evidence(
  uuid, text, text, text, bigint
)
to authenticated;

revoke all on function public.admin_mark_order_paid(
  uuid, boolean, text, jsonb
)
from public, anon, authenticated;
grant execute on function public.admin_mark_order_paid(
  uuid, boolean, text, jsonb
)
to authenticated;

revoke insert, update, delete on public.payment_evidence from authenticated;
