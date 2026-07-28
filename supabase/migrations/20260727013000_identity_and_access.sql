-- Belle Perle — permanent profiles, anonymous checkout identities, and admin bootstrap.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
  v_phone text;
begin
  -- Anonymous Auth users are short-lived checkout actors and must not receive a
  -- customer profile or gain access to account history.
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  v_full_name := trim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1),
    'Cliente Belle Perle'
  ));

  if char_length(v_full_name) < 2 then
    v_full_name := 'Cliente Belle Perle';
  end if;

  if nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '') is not null then
    v_phone := public.normalize_phone(new.raw_user_meta_data ->> 'phone');
  end if;

  insert into public.profiles (id, full_name, phone_e164)
  values (new.id, left(v_full_name, 120), v_phone)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill only permanent users. Phone matching is deliberately not used: a
-- newly created account never claims previous guest orders.
insert into public.profiles (id, full_name, phone_e164)
select
  auth_user.id,
  left(
    case
      when char_length(trim(coalesce(
        auth_user.raw_user_meta_data ->> 'full_name',
        auth_user.raw_user_meta_data ->> 'name',
        split_part(coalesce(auth_user.email, ''), '@', 1)
      ))) >= 2
      then trim(coalesce(
        auth_user.raw_user_meta_data ->> 'full_name',
        auth_user.raw_user_meta_data ->> 'name',
        split_part(coalesce(auth_user.email, ''), '@', 1)
      ))
      else 'Cliente Belle Perle'
    end,
    120
  ),
  null
from auth.users as auth_user
where not coalesce(auth_user.is_anonymous, false)
on conflict (id) do nothing;

create or replace function public.upsert_own_profile(
  p_full_name text,
  p_phone text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_phone text;
begin
  if v_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
  then
    raise exception using
      errcode = '42501',
      message = 'PERMANENT_ACCOUNT_REQUIRED';
  end if;

  if char_length(trim(coalesce(p_full_name, ''))) not between 2 and 120 then
    raise exception using
      errcode = '22023',
      message = 'INVALID_NAME';
  end if;

  if nullif(trim(coalesce(p_phone, '')), '') is not null then
    v_phone := public.normalize_phone(p_phone);
  end if;

  insert into public.profiles (id, full_name, phone_e164)
  values (v_user_id, trim(p_full_name), v_phone)
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    phone_e164 = excluded.phone_e164
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.promote_admin_by_email(
  p_email text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  -- This function is never granted to browser roles. The explicit check also
  -- protects accidental grants made in a future migration.
  if session_user not in ('postgres', 'supabase_admin')
    and coalesce(auth.role(), '') <> 'service_role'
  then
    raise exception using
      errcode = '42501',
      message = 'SERVICE_ROLE_REQUIRED';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) < 8 then
    raise exception using
      errcode = '22023',
      message = 'ADMIN_REASON_REQUIRED';
  end if;

  select auth_user.id
  into v_user_id
  from auth.users as auth_user
  where lower(auth_user.email) = lower(trim(p_email))
    and not coalesce(auth_user.is_anonymous, false);

  if v_user_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'ACCOUNT_NOT_FOUND';
  end if;

  perform set_config('app.identity_role_change', 'true', true);

  update public.profiles
  set role = 'admin'
  where id = v_user_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'PROFILE_NOT_FOUND';
  end if;

  return v_user_id;
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

  if old.role is distinct from new.role
    and not public.is_admin()
    and coalesce(current_setting('app.identity_role_change', true), '') <> 'true'
  then
    raise exception using errcode = '42501', message = 'ROLE_CHANGE_FORBIDDEN';
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.upsert_own_profile(text, text)
  from public, anon, authenticated;
revoke all on function public.promote_admin_by_email(text, text)
  from public, anon, authenticated;

revoke update on public.profiles from authenticated;

grant execute on function public.upsert_own_profile(text, text) to authenticated;
grant execute on function public.promote_admin_by_email(text, text) to service_role;

