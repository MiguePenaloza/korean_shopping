begin;

select plan(8);

select is(
  public.normalize_phone('71234567'),
  '+59171234567',
  'Bolivian local phone is normalized'
);
select is(
  public.normalize_phone('+591 7791-2632'),
  '+59177912632',
  'formatted E.164 phone is normalized'
);

select is(
  (
    select selling_price_bob
    from public.calculate_product_price(21000, 1380, 6.96, 0.28, 0.03, 42)
  ),
  156.00::numeric,
  'authoritative pricing matches the approved formula'
);

select throws_ok(
  $$select public.normalize_phone('123');$$,
  '22023',
  'INVALID_PHONE',
  'invalid phone is rejected'
);
select throws_ok(
  $$select * from public.calculate_product_price(0, 1380, 6.96, 0.28, 0.03, 42);$$,
  '22023',
  'INVALID_PRICING_INPUT',
  'invalid pricing inputs are rejected'
);

select is(
  (
    select daily_price_expiration
    from public.campaign_settings
    where id = 1
  ),
  time '08:15',
  'daily price expiration is 08:15 Bolivia time'
);
select is(
  (
    select business_timezone
    from public.campaign_settings
    where id = 1
  ),
  'America/La_Paz',
  'business timezone is explicit'
);
select is(
  (
    select contingency_rate
    from public.exchange_rates
    order by created_at desc
    limit 1
  ),
  0.03::numeric,
  'development rate uses the approved 3 percent contingency'
);

select * from finish();
rollback;
