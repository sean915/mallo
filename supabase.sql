-- ============================================
-- 말로(Mallo) Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run
-- ============================================

-- 사용자 프로필 (무료 체험/말로 잔액/사용량)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  subscribed boolean not null default false,
  usage_month text not null default to_char(now(), 'YYYY-MM'),
  usage_count int not null default 0
);

alter table public.profiles add column if not exists credits int not null default 0;              -- 만료 없는 말로 잔액(원). 기존 컬럼명은 호환을 위해 유지.
alter table public.profiles add column if not exists balance_version int;                         -- 0/null: 옛 크레딧 건수, 1: 원 단위 잔액
alter table public.profiles add column if not exists unlimited boolean not null default false;    -- 운영자/마스터 계정
alter table public.profiles add column if not exists last_generated_at timestamptz;              -- 쿨다운용
alter table public.profiles add column if not exists daily_usage_date date not null default current_date;
alter table public.profiles add column if not exists daily_usage_count int not null default 0;

-- 기존 잔여 건수는 AI 기능 1회 가격(990원)을 기준으로 잔액으로 1회만 전환.
update public.profiles
  set credits = credits * 990,
      balance_version = 1
  where coalesce(balance_version, 0) = 0;
alter table public.profiles alter column balance_version set default 1;
update public.profiles set balance_version = 1 where balance_version is null;
alter table public.profiles alter column balance_version set not null;

alter table public.profiles enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);

-- 가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do update set email = coalesce(public.profiles.email, excluded.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 말로 잔액 구매 기록: payment_id 기준 멱등 처리. 환불 시 미사용분 계산 근거로 사용.
create table if not exists public.credit_purchases (
  payment_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pack text not null,
  credits int not null, -- 충전 잔액(원). 기존 컬럼명은 호환을 위해 유지.
  amount int not null,
  refunded_credits int not null default 0,
  refunded_amount int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.credit_purchases enable row level security;
drop policy if exists "own credit purchases read" on public.credit_purchases;
create policy "own credit purchases read" on public.credit_purchases
  for select using (auth.uid() = user_id);

-- 결제 성공 후 말로 잔액 충전(멱등)
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

-- 생성/AI 기능 사용 처리: 무료 체험 후 만료 없는 잔액에서 사용처별 금액을 차감.
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

  -- 마스터(무제한): 차감 없이 허용
  if p.unlimited then
    update public.profiles set
      usage_count = usage_count + 1,
      daily_usage_count = daily_usage_count + 1,
      last_generated_at = now_ts
    where id = uid;
    return json_build_object('allowed', true, 'remaining', 999999, 'balance', 999999, 'source', 'unlimited', 'cost', 0);
  end if;

  -- 무료 체험: 평생 trial_minutes(=무료 생성 횟수)회
  if p.usage_count < trial_minutes then
    update public.profiles set
      usage_count = usage_count + 1,
      daily_usage_count = daily_usage_count + 1,
      last_generated_at = now_ts
    where id = uid;
    return json_build_object('allowed', true, 'remaining', p.credits, 'balance', p.credits, 'source', 'trial', 'cost', 0);
  end if;

  -- 유료 잔액: 사용처별 금액 차감
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

-- 생성 실패 시 차감 복구. /api/generate가 업스트림 오류·스트림 실패·빈 응답을 감지하면 호출.
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

-- ============================================
-- 비로그인(익명) 무료 체험: 기기(device)당 무료 N회
-- 로그인 없이도 기기당 ANON_FREE_LIMIT(기본 1)회 생성 허용.
-- 재접속(새로고침/재방문)해도 같은 device_id 면 서버가 사용 기록을 기억해 차단한다.
-- RLS 켜고 정책 없음 → anon/authenticated 직접 접근 불가. service_role(API) + security definer 함수만 접근.
-- ============================================
create table if not exists public.anon_usage (
  device_id text primary key,
  used_count int not null default 0,
  ip text,
  created_at timestamptz not null default now(),
  last_at timestamptz
);
alter table public.anon_usage enable row level security;

-- 비로그인 생성 1회 사용 처리(원자적). 한도 초과면 allowed=false, reason='login_required'.
create or replace function public.use_anon_generation(p_device text, p_ip text, p_limit int)
returns json language plpgsql security definer set search_path = public as $$
declare
  r public.anon_usage;
begin
  if p_device is null or length(p_device) = 0 then
    return json_build_object('allowed', false, 'reason', 'login_required');
  end if;

  insert into public.anon_usage (device_id, ip) values (p_device, p_ip)
    on conflict (device_id) do nothing;
  select * into r from public.anon_usage where device_id = p_device for update;

  if r.used_count >= p_limit then
    return json_build_object('allowed', false, 'reason', 'login_required');
  end if;

  update public.anon_usage set used_count = used_count + 1, ip = p_ip, last_at = now()
    where device_id = p_device;
  return json_build_object('allowed', true, 'remaining', p_limit - r.used_count - 1, 'source', 'anon');
end $$;

-- 비로그인 생성 실패 시 차감 복구(업스트림 오류·빈 응답 등).
create or replace function public.restore_anon_generation(p_device text)
returns json language plpgsql security definer set search_path = public as $$
begin
  update public.anon_usage set used_count = greatest(used_count - 1, 0), last_at = null
    where device_id = p_device;
  return json_build_object('restored', true);
end $$;

-- 사용자 피드백/후기
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  message text not null,
  rating int,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
-- 공개 정책 없음: API(service_role)만 기록·조회. 피드백 열람은 Supabase 대시보드 Table Editor에서.

-- ============================================
-- 내 도구함 (사용자가 만든 도구 + 입력 데이터 저장)
-- ============================================
create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '내 도구',
  html text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tools enable row level security;
drop policy if exists "own tools" on public.tools;
create policy "own tools" on public.tools for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant all on public.tools to authenticated;
create index if not exists tools_user_idx on public.tools(user_id, updated_at desc);

-- 공유 링크: shared=true 이면 누구나(비로그인 포함) 읽기 가능
alter table public.tools add column if not exists shared boolean not null default false;
drop policy if exists "shared tools read" on public.tools;
create policy "shared tools read" on public.tools for select to anon, authenticated
  using (shared = true);
grant select on public.tools to anon;

-- ============================================
-- 회원 탈퇴: 본인 계정·데이터 영구 삭제
-- auth.users 행 삭제 → profiles/tools(on delete cascade), feedback(set null) 연쇄 처리
-- auth.uid() 기준이라 본인 계정만 삭제됨(타인 삭제 불가)
-- ============================================
create or replace function public.delete_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
