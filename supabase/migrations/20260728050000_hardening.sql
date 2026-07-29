-- Belle Perle — Phase 10 security hardening for uploads and browser privileges.

alter table public.payment_evidence
add constraint payment_evidence_filename_control_check check (
  original_filename !~ '[[:cntrl:]]'
);

alter table public.order_status_history
add constraint order_status_history_reason_length_check check (
  reason is null or char_length(reason) <= 1000
);

revoke execute on function public.is_admin() from anon;

drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and public.is_admin()
  and name ~ '^products/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-2]-(full|thumb)\.(jpg|png|webp)$'
);

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_admin()
)
with check (
  bucket_id = 'product-images'
  and public.is_admin()
  and name ~ '^products/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-2]-(full|thumb)\.(jpg|png|webp)$'
);

drop policy if exists payment_evidence_admin_insert on storage.objects;
create policy payment_evidence_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payment-evidence'
  and public.is_admin()
  and name ~ '^orders/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
);

drop policy if exists payment_evidence_admin_update on storage.objects;
create policy payment_evidence_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'payment-evidence'
  and public.is_admin()
)
with check (
  bucket_id = 'payment-evidence'
  and public.is_admin()
  and name ~ '^orders/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
);

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
  v_object_metadata jsonb;
  v_object_type text;
  v_object_size_text text;
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
    '^orders/' || p_order_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
      || '\.(jpg|jpeg|png|webp)$'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_EVIDENCE_PATH';
  end if;

  if p_content_type not in ('image/jpeg', 'image/png', 'image/webp')
    or p_size_bytes not between 1 and 10485760
    or char_length(trim(coalesce(p_original_filename, ''))) not between 1 and 255
    or p_original_filename ~ '[[:cntrl:]]'
    or (
      p_content_type = 'image/jpeg'
      and v_path !~ '\.(jpg|jpeg)$'
    )
    or (
      p_content_type = 'image/png'
      and v_path !~ '\.png$'
    )
    or (
      p_content_type = 'image/webp'
      and v_path !~ '\.webp$'
    )
  then
    raise exception using errcode = '22023', message = 'INVALID_EVIDENCE_FILE';
  end if;

  select stored_file.metadata
  into v_object_metadata
  from storage.objects as stored_file
  where stored_file.bucket_id = 'payment-evidence'
    and stored_file.name = v_path;

  if not found then
    raise exception using errcode = 'P0001', message = 'EVIDENCE_OBJECT_NOT_FOUND';
  end if;

  v_object_type := lower(coalesce(v_object_metadata ->> 'mimetype', ''));
  v_object_size_text := coalesce(v_object_metadata ->> 'size', '');

  if v_object_type <> p_content_type
    or v_object_size_text !~ '^[0-9]+$'
    or v_object_size_text::bigint <> p_size_bytes
  then
    raise exception using
      errcode = '22023',
      message = 'EVIDENCE_METADATA_MISMATCH';
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

revoke all on function public.admin_attach_payment_evidence(
  uuid, text, text, text, bigint
)
from public, anon, authenticated;
grant execute on function public.admin_attach_payment_evidence(
  uuid, text, text, text, bigint
)
to authenticated;
