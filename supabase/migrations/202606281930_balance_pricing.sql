-- Convert legacy credit-count balance into won-denominated Mallo balance.
alter table public.profiles add column if not exists balance_version int;

update public.profiles
  set credits = credits * 990,
      balance_version = 1
  where coalesce(balance_version, 0) = 0;

alter table public.profiles alter column balance_version set default 1;
update public.profiles set balance_version = 1 where balance_version is null;
alter table public.profiles alter column balance_version set not null;

create or replace function public.add_credits(uid uuid, p_payment_id text, p_pack text, p_credits int, p_amount int)
returns json language plpgsql security definer set search_path = public as $$
declare
  inserted_count int := 0;
  balance int := 0;
begin
  insert into public.profiles (id, balance_version) values (uid, 1) on conflict (id) do nothing;

  insert into public.credit_purchases (payment_id, user_id, pack, credits, amount)
  values (p_payment_id, uid, p_pack, p_credits, p_amount)
  on conflict (payment_id) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count > 0 then
    update public.profiles
      set credits = credits + p_credits
      where id = uid
      returning credits into balance;
  else
    select credits into balance from public.profiles where id = uid;
  end if;

  return json_build_object('added', inserted_count > 0, 'credits', coalesce(balance, 0));
end $$;

drop function if exists public.use_generation(uuid, int, int);
drop function if exists public.use_generation(uuid, int, int, int, int);
drop function if exists public.use_generation(uuid, int, int, int, int, int);
create or replace function public.use_generation(
  uid uuid,
  monthly_limit int,
  trial_minutes int,
  p_cooldown_sec int default 0,
  p_daily_cap int default 0,
  p_cost int default 3900
)
returns json language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  now_ts timestamptz := now();
  charge int := greatest(coalesce(p_cost, 3900), 1);
begin
  insert into public.profiles (id, balance_version) values (uid, 1) on conflict (id) do nothing;
  select * into p from public.profiles where id = uid for update;

  if p.daily_usage_date is distinct from current_date then
    p.daily_usage_date := current_date;
    p.daily_usage_count := 0;
    update public.profiles set daily_usage_date = current_date, daily_usage_count = 0 where id = uid;
  end if;

  if p_cooldown_sec > 0 and p.last_generated_at is not null and p.last_generated_at > now_ts - make_interval(secs => p_cooldown_sec) then
    return json_build_object('allowed', false, 'reason', 'cooldown');
  end if;

  if p_daily_cap > 0 and p.daily_usage_count >= p_daily_cap then
    return json_build_object('allowed', false, 'reason', 'busy');
  end if;

  if p.unlimited then
    update public.profiles set
      usage_count = usage_count + 1,
      daily_usage_count = daily_usage_count + 1,
      last_generated_at = now_ts
    where id = uid;
    return json_build_object('allowed', true, 'remaining', 999999, 'balance', 999999, 'source', 'unlimited', 'cost', 0);
  end if;

  if p.usage_count < trial_minutes then
    update public.profiles set
      usage_count = usage_count + 1,
      daily_usage_count = daily_usage_count + 1,
      last_generated_at = now_ts
    where id = uid;
    return json_build_object('allowed', true, 'remaining', p.credits, 'balance', p.credits, 'source', 'trial', 'cost', 0);
  end if;

  if p.credits >= charge then
    update public.profiles set
      credits = credits - charge,
      daily_usage_count = daily_usage_count + 1,
      last_generated_at = now_ts
    where id = uid;
    return json_build_object('allowed', true, 'remaining', p.credits - charge, 'balance', p.credits - charge, 'source', 'credit', 'cost', charge);
  end if;

  return json_build_object('allowed', false, 'reason', 'no_credit', 'balance', p.credits, 'required', charge);
end $$;

drop function if exists public.restore_generation(uuid, text);
drop function if exists public.restore_generation(uuid, text, int);
create or replace function public.restore_generation(uid uuid, p_source text default null, p_cost int default 3900)
returns json language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  charge int := greatest(coalesce(p_cost, 3900), 1);
begin
  select * into p from public.profiles where id = uid for update;
  if not found then
    return json_build_object('restored', false, 'reason', 'profile_not_found');
  end if;

  if p_source = 'credit' then
    update public.profiles set
      credits = credits + charge,
      daily_usage_count = greatest(daily_usage_count - 1, 0),
      last_generated_at = null
    where id = uid;
    return json_build_object('restored', true, 'source', 'credit', 'amount', charge);
  elsif p_source = 'trial' then
    update public.profiles set
      usage_count = greatest(usage_count - 1, 0),
      daily_usage_count = greatest(daily_usage_count - 1, 0),
      last_generated_at = null
    where id = uid;
    return json_build_object('restored', true, 'source', 'trial');
  end if;

  return json_build_object('restored', false, 'source', coalesce(p_source, 'unknown'));
end $$;
