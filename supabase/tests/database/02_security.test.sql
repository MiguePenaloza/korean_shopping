begin;

select plan(23);

select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  true,
  'profiles RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.products'::regclass),
  true,
  'products RLS enabled'
);
select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.product_price_versions'::regclass
  ),
  true,
  'price versions RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.orders'::regclass),
  true,
  'orders RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.order_items'::regclass),
  true,
  'order items RLS enabled'
);
select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.inventory_reservations'::regclass
  ),
  true,
  'reservations RLS enabled'
);
select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.payment_evidence'::regclass
  ),
  true,
  'payment evidence RLS enabled'
);
select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.order_status_history'::regclass
  ),
  true,
  'status history RLS enabled'
);

select is(
  has_table_privilege('anon', 'public.products', 'SELECT'),
  false,
  'anon cannot read raw product inventory'
);
select is(
  has_table_privilege('anon', 'public.public_catalogue', 'SELECT'),
  true,
  'anon can read the safe catalogue projection'
);
select is(
  has_table_privilege('authenticated', 'public.orders', 'INSERT'),
  false,
  'customers cannot insert raw orders'
);
select is(
  has_table_privilege('authenticated', 'public.orders', 'UPDATE'),
  false,
  'customers cannot update raw order state'
);
select is(
  has_table_privilege('authenticated', 'public.order_items', 'UPDATE'),
  false,
  'order snapshots cannot be updated directly'
);
select is(
  has_table_privilege(
    'authenticated',
    'public.product_price_versions',
    'INSERT'
  ),
  false,
  'prices require the secure publishing function'
);
select is(
  has_table_privilege(
    'authenticated',
    'public.inventory_reservations',
    'UPDATE'
  ),
  false,
  'reservations require secure functions'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.create_order(uuid,text,text,jsonb)',
    'EXECUTE'
  ),
  false,
  'authenticated identities cannot bypass checkout acceptance'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.submit_order(uuid,text,text,jsonb,boolean,boolean)',
    'EXECUTE'
  ),
  true,
  'authenticated identities can call the accepted checkout RPC'
);
select is(
  has_function_privilege(
    'anon',
    'public.create_order(uuid,text,text,jsonb)',
    'EXECUTE'
  ),
  false,
  'plain anon role cannot bypass anonymous sign-in'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.expire_due_records()',
    'EXECUTE'
  ),
  false,
  'clients cannot execute Cron maintenance'
);
select is(
  has_function_privilege(
    'service_role',
    'public.expire_due_records()',
    'EXECUTE'
  ),
  true,
  'service role can execute Cron maintenance'
);
select ok(
  exists (
    select 1
    from storage.buckets
    where id = 'product-images'
      and public
  ),
  'product image bucket is public'
);
select ok(
  exists (
    select 1
    from storage.buckets
    where id = 'payment-evidence'
      and not public
  ),
  'payment evidence bucket is private'
);
select ok(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'payment_evidence_admin_%'
  ) = 4,
  'private evidence has four admin-only storage policies'
);

select * from finish();
rollback;
