begin;

select plan(25);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'categories', 'categories exists');
select has_table('public', 'rate_observations', 'rate observations exists');
select has_table('public', 'exchange_rates', 'exchange rates exists');
select has_table('public', 'campaign_settings', 'campaign settings exists');
select has_table('public', 'products', 'products exists');
select has_table('public', 'product_price_versions', 'price history exists');
select has_table('public', 'product_images', 'product images exists');
select has_table('public', 'orders', 'orders exists');
select has_table('public', 'order_items', 'order items exists');
select has_table('public', 'inventory_reservations', 'reservations exists');
select has_table('public', 'payment_evidence', 'payment evidence exists');
select has_table('public', 'order_status_history', 'status history exists');
select has_table('public', 'order_admin_overrides', 'admin overrides exists');
select has_view('public', 'public_catalogue', 'safe public catalogue exists');

select has_function('public', 'is_admin', array[]::text[], 'admin check exists');
select has_function(
  'public',
  'calculate_product_price',
  array['integer', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric'],
  'pricing function exists'
);
select has_function(
  'public',
  'create_order',
  array['uuid', 'text', 'text', 'jsonb'],
  'checkout RPC exists'
);
select has_function(
  'public',
  'report_order_payment',
  array['uuid'],
  'payment report RPC exists'
);
select has_function(
  'public',
  'admin_confirm_order_paid',
  array['uuid', 'boolean', 'text'],
  'admin payment confirmation exists'
);
select has_function(
  'public',
  'expire_due_records',
  array[]::text[],
  'expiration function exists'
);

select col_is_pk('public', 'orders', 'id', 'orders use an id primary key');
select col_is_unique(
  'public',
  'orders',
  array['actor_id', 'idempotency_key'],
  'checkout idempotency is unique per actor'
);
select col_is_unique(
  'public',
  'order_items',
  array['order_id', 'product_id'],
  'one immutable line per product and order'
);
select col_is_fk(
  'public',
  'order_items',
  'price_version_id',
  'order items preserve their price version'
);

select * from finish();
rollback;
