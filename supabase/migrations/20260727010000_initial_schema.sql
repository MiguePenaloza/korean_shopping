-- Belle Perle — Phase 3 initial relational model.
-- All business timestamps are timestamptz. Business presentation uses America/La_Paz.

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('customer', 'admin');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.price_version_status as enum ('active', 'expired', 'superseded');
create type public.order_status as enum (
  'pending_payment',
  'confirmed',
  'purchased',
  'in_transit',
  'ready_for_delivery',
  'delivered',
  'expired',
  'cancelled',
  'refund_pending',
  'refunded'
);
create type public.payment_status as enum (
  'awaiting_payment',
  'payment_reported',
  'paid',
  'rejected',
  'refund_pending',
  'refunded'
);
create type public.reservation_status as enum (
  'active',
  'converted',
  'released',
  'expired'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone_e164 text check (
    phone_e164 is null
    or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  ),
  role public.app_role not null default 'customer',
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint categories_name_unique unique (name),
  constraint categories_slug_unique unique (slug)
);

create table public.rate_observations (
  id uuid primary key default extensions.gen_random_uuid(),
  observed_for_date date not null,
  source_name text not null default 'BCB',
  source_url text,
  bcb_bob_per_usd numeric(12, 6) not null check (bcb_bob_per_usd > 0),
  observed_at timestamptz not null default clock_timestamp(),
  observed_by uuid references auth.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default clock_timestamp(),
  constraint rate_observations_source_date_unique unique (
    observed_for_date,
    source_name
  )
);

create table public.exchange_rates (
  id uuid primary key default extensions.gen_random_uuid(),
  observation_id uuid references public.rate_observations (id) on delete set null,
  krw_per_usd numeric(18, 6) not null check (krw_per_usd > 0),
  bcb_bob_per_usd numeric(12, 6) not null check (bcb_bob_per_usd > 0),
  bank_spread_bob_per_usd numeric(12, 6) not null default 0 check (
    bank_spread_bob_per_usd >= 0
  ),
  contingency_rate numeric(8, 6) not null default 0.03 check (
    contingency_rate >= 0
    and contingency_rate <= 1
  ),
  effective_from timestamptz not null,
  created_by uuid references auth.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default clock_timestamp(),
  constraint exchange_rates_effective_from_unique unique (effective_from)
);

create table public.campaign_settings (
  id smallint primary key default 1 check (id = 1),
  campaign_name text not null default 'Belle Perle, Korean Shopping',
  ordering_open boolean not null default false,
  business_timezone text not null default 'America/La_Paz' check (
    business_timezone = 'America/La_Paz'
  ),
  daily_price_expiration time not null default time '08:15',
  reservation_minutes smallint not null default 15 check (
    reservation_minutes between 1 and 60
  ),
  payment_report_minutes smallint not null default 25 check (
    payment_report_minutes between reservation_minutes and 90
  ),
  whatsapp_phone_e164 text not null default '+59177912632' check (
    whatsapp_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  ),
  current_exchange_rate_id uuid references public.exchange_rates (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9-]{2,31}$'),
  name text not null check (char_length(trim(name)) between 2 and 160),
  brand text not null check (char_length(trim(brand)) between 1 and 120),
  category_id uuid not null references public.categories (id) on delete restrict,
  description text not null default '',
  variant text not null default '',
  price_krw integer not null check (price_krw > 0),
  product_margin_bob numeric(12, 2) not null default 0 check (
    product_margin_bob >= 0
  ),
  total_stock integer not null check (total_stock >= 0),
  confirmed_stock integer not null default 0 check (
    confirmed_stock >= 0
    and confirmed_stock <= total_stock
  ),
  status public.product_status not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint products_code_unique unique (code)
);

create table public.product_price_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  exchange_rate_id uuid not null references public.exchange_rates (id) on delete restrict,
  price_krw integer not null check (price_krw > 0),
  krw_per_usd numeric(18, 6) not null check (krw_per_usd > 0),
  bcb_bob_per_usd numeric(12, 6) not null check (bcb_bob_per_usd > 0),
  bank_spread_bob_per_usd numeric(12, 6) not null check (
    bank_spread_bob_per_usd >= 0
  ),
  contingency_rate numeric(8, 6) not null check (
    contingency_rate >= 0
    and contingency_rate <= 1
  ),
  product_margin_bob numeric(12, 2) not null check (product_margin_bob >= 0),
  converted_cost_bob numeric(14, 4) not null check (converted_cost_bob > 0),
  protected_cost_bob numeric(14, 4) not null check (protected_cost_bob > 0),
  selling_price_bob numeric(12, 2) not null check (selling_price_bob > 0),
  valid_from timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null check (expires_at > valid_from),
  status public.price_version_status not null default 'active',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default clock_timestamp()
);

create unique index product_price_versions_one_active_idx
  on public.product_price_versions (product_id)
  where status = 'active';
create index product_price_versions_product_history_idx
  on public.product_price_versions (product_id, created_at desc);
create index product_price_versions_expiration_idx
  on public.product_price_versions (expires_at)
  where status = 'active';

create table public.product_images (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null check (
    storage_path !~ '(^|/)\.\.(/|$)'
    and char_length(storage_path) between 3 and 500
  ),
  alt_text text not null check (char_length(trim(alt_text)) between 2 and 240),
  sort_order smallint not null check (sort_order between 0 and 2),
  width integer not null check (width between 1 and 1200),
  height integer not null check (height between 1 and 1200),
  is_thumbnail boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  constraint product_images_storage_path_unique unique (storage_path),
  constraint product_images_product_sort_unique unique (product_id, sort_order)
);

create unique index product_images_one_thumbnail_idx
  on public.product_images (product_id)
  where is_thumbnail;

create sequence public.order_number_sequence start 1000;

create table public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  order_number text not null,
  actor_id uuid not null references auth.users (id) on delete restrict,
  customer_id uuid references auth.users (id) on delete set null,
  guest_name text not null check (char_length(trim(guest_name)) between 2 and 120),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  status public.order_status not null default 'pending_payment',
  payment_status public.payment_status not null default 'awaiting_payment',
  subtotal_bob numeric(12, 2) not null default 0 check (subtotal_bob >= 0),
  total_bob numeric(12, 2) not null default 0 check (total_bob >= 0),
  idempotency_key uuid not null,
  reservation_expires_at timestamptz not null,
  payment_report_expires_at timestamptz not null,
  paid_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint orders_order_number_unique unique (order_number),
  constraint orders_actor_idempotency_unique unique (actor_id, idempotency_key),
  constraint orders_expiration_order check (
    payment_report_expires_at >= reservation_expires_at
  ),
  constraint orders_total_matches_subtotal check (total_bob = subtotal_bob)
);

create index orders_actor_created_idx on public.orders (actor_id, created_at desc);
create index orders_customer_created_idx
  on public.orders (customer_id, created_at desc)
  where customer_id is not null;
create index orders_status_created_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  price_version_id uuid not null references public.product_price_versions (id) on delete restrict,
  product_code text not null,
  product_name text not null,
  product_brand text not null,
  product_variant text not null default '',
  price_krw integer not null check (price_krw > 0),
  unit_price_bob numeric(12, 2) not null check (unit_price_bob > 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total_bob numeric(12, 2) generated always as (
    unit_price_bob * quantity
  ) stored,
  price_snapshot jsonb not null check (jsonb_typeof(price_snapshot) = 'object'),
  created_at timestamptz not null default clock_timestamp(),
  constraint order_items_order_product_unique unique (order_id, product_id)
);

create index order_items_order_idx on public.order_items (order_id);

create table public.inventory_reservations (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity between 1 and 20),
  status public.reservation_status not null default 'active',
  expires_at timestamptz not null,
  converted_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint inventory_reservations_order_product_unique unique (
    order_id,
    product_id
  )
);

create index inventory_reservations_active_product_idx
  on public.inventory_reservations (product_id, expires_at)
  where status = 'active';
create index inventory_reservations_active_expiration_idx
  on public.inventory_reservations (expires_at)
  where status = 'active';

create table public.payment_evidence (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  storage_path text not null check (
    storage_path !~ '(^|/)\.\.(/|$)'
    and char_length(storage_path) between 3 and 500
  ),
  original_filename text not null check (
    char_length(trim(original_filename)) between 1 and 255
  ),
  content_type text not null check (
    content_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  constraint payment_evidence_storage_path_unique unique (storage_path)
);

create index payment_evidence_order_idx on public.payment_evidence (order_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete restrict,
  from_status public.order_status,
  to_status public.order_status not null,
  from_payment_status public.payment_status,
  to_payment_status public.payment_status not null,
  actor_id uuid references auth.users (id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object'
  ),
  created_at timestamptz not null default clock_timestamp()
);

create index order_status_history_order_created_idx
  on public.order_status_history (order_id, created_at, id);

create table public.order_admin_overrides (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  override_type text not null check (
    override_type in ('late_payment_acceptance', 'inventory_exception')
  ),
  reason text not null check (char_length(trim(reason)) between 10 and 1000),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default clock_timestamp()
);

create index order_admin_overrides_order_idx
  on public.order_admin_overrides (order_id, created_at);

insert into public.campaign_settings (id)
values (1);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.rate_observations enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.campaign_settings enable row level security;
alter table public.products enable row level security;
alter table public.product_price_versions enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.payment_evidence enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_admin_overrides enable row level security;
