-- Belle Perle — grants, RLS policies, Storage isolation, and expiration Cron.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_admin_all
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy categories_admin_all
on public.categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy rate_observations_admin_all
on public.rate_observations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy exchange_rates_admin_all
on public.exchange_rates
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy campaign_settings_public_read
on public.campaign_settings
for select
to anon, authenticated
using (true);

create policy campaign_settings_admin_write
on public.campaign_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy products_admin_all
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy product_price_versions_admin_all
on public.product_price_versions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy product_images_admin_all
on public.product_images
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy orders_select_owner_or_admin
on public.orders
for select
to authenticated
using (
  actor_id = auth.uid()
  or customer_id = auth.uid()
  or public.is_admin()
);

create policy orders_admin_all
on public.orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy order_items_select_owner_or_admin
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders as customer_order
    where customer_order.id = order_items.order_id
      and (
        customer_order.actor_id = auth.uid()
        or customer_order.customer_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy order_items_admin_insert
on public.order_items
for insert
to authenticated
with check (public.is_admin());

create policy inventory_reservations_admin_all
on public.inventory_reservations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy payment_evidence_admin_all
on public.payment_evidence
for all
to authenticated
using (public.is_admin())
with check (
  public.is_admin()
  and uploaded_by = auth.uid()
);

create policy order_status_history_select_owner_or_admin
on public.order_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.orders as customer_order
    where customer_order.id = order_status_history.order_id
      and (
        customer_order.actor_id = auth.uid()
        or customer_order.customer_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy order_status_history_admin_insert
on public.order_status_history
for insert
to authenticated
with check (public.is_admin());

create policy order_admin_overrides_admin_all
on public.order_admin_overrides
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, update on public.profiles to authenticated;
grant select on public.campaign_settings to anon, authenticated;
grant select on public.public_catalogue to anon, authenticated;
grant select on public.orders, public.order_items, public.order_status_history
  to authenticated;

grant select, insert, update, delete on
  public.categories,
  public.rate_observations,
  public.exchange_rates,
  public.campaign_settings,
  public.products,
  public.product_images,
  public.payment_evidence
to authenticated;

grant select on
  public.product_price_versions,
  public.inventory_reservations,
  public.order_admin_overrides
to authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.calculate_product_price(
  integer,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric
) to authenticated;
grant execute on function public.create_order(uuid, text, text, jsonb)
  to authenticated;
grant execute on function public.report_order_payment(uuid)
  to authenticated;
grant execute on function public.admin_publish_product_price(uuid, uuid, timestamptz)
  to authenticated;
grant execute on function public.admin_refresh_available_prices(uuid, timestamptz)
  to authenticated;
grant execute on function public.admin_confirm_order_paid(uuid, boolean, text)
  to authenticated;
grant execute on function public.expire_due_records() to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'product-images',
    'product-images',
    true,
    6291456,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'payment-evidence',
    'payment-evidence',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

create policy product_images_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and public.is_admin()
);

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
);

create policy product_images_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_admin()
);

create policy payment_evidence_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-evidence'
  and public.is_admin()
);

create policy payment_evidence_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payment-evidence'
  and public.is_admin()
);

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
);

create policy payment_evidence_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'payment-evidence'
  and public.is_admin()
);

create extension if not exists pg_cron;

do $block$
begin
  perform cron.unschedule('belle-perle-expire-due-records');
exception
  when others then
    null;
end;
$block$;

select cron.schedule(
  'belle-perle-expire-due-records',
  '* * * * *',
  $cron$select public.expire_due_records();$cron$
);
