-- ============================================
-- 말로(Mallo) Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run
-- ============================================

-- 사용자 프로필 (무료 체험/이용권/사용량)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  subscribed boolean not null default false,
  usage_month text not null default to_char(now(), 'YYYY-MM'),
  usage_count int not null default 0
);

alter table public.profiles add column if not exists credits int not null default 0;              -- 만료 없는 잔여 이용권
alter table public.profiles add column if not exists unlimited boolean not null default false;    -- 운영자/마스터 계정
alter table public.profiles add column if not exists last_generated_at timestamptz;              -- 쿨다운용
alter table public.profiles add column if not exists daily_usage_date date not null default current_date;
alter table public.profiles add column if not exists daily_usage_count int not null default 0;

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

-- 이용권 구매 기록: payment_id 기준 멱등 처리. 환불 시 미사용분 계산 근거로 사용.
create table if not exists public.credit_purchases (
  payment_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pack text not null,
  credits int not null,
  amount int not null,
  refunded_credits int not null default 0,
  refunded_amount int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.credit_purchases enable row level security;
drop policy if exists "own credit purchases read" on public.credit_purchases;
create policy "own credit purchases read" on public.credit_purchases
  for select using (auth.uid() = user_id);

-- 결제 성공 후 이용권 충전(멱등)
create or replace function public.add_credits(uid uuid, p_payment_id text, p_pack text, p_credits int, p_amount int)
returns json language plpgsql security definer set search_path = public as $$
declare
  inserted_count int := 0;
  balance int := 0;
begin
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;

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

-- 생성 1회 사용 처리: 무료 체험 3회 후 만료 없는 크레딧을 1회씩 차감.
drop function if exists public.use_generation(uuid, int, int);
drop function if exists public.use_generation(uuid, int, int, int, int);
create or replace function public.use_generation(
  uid uuid,
  monthly_limit int,
  trial_minutes int,
  p_cooldown_sec int default 0,
  p_daily_cap int default 0
)
returns json language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  now_ts timestamptz := now();
begin
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
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
    return json_build_object('allowed', true, 'remaining', 999999, 'source', 'unlimited');
  end if;

  -- 무료 체험: 평생 trial_minutes(=무료 생성 횟수)회
  if p.usage_count < trial_minutes then
    update public.profiles set
      usage_count = usage_count + 1,
      daily_usage_count = daily_usage_count + 1,
      last_generated_at = now_ts
    where id = uid;
    return json_build_object('allowed', true, 'remaining', (trial_minutes - p.usage_count - 1) + p.credits, 'source', 'trial');
  end if;

  -- 유료 이용권: 만료 없이 1회씩 차감
  if p.credits > 0 then
    update public.profiles set
      credits = credits - 1,
      daily_usage_count = daily_usage_count + 1,
      last_generated_at = now_ts
    where id = uid;
    return json_build_object('allowed', true, 'remaining', p.credits - 1, 'source', 'credit');
  end if;

  return json_build_object('allowed', false, 'reason', 'no_credit');
end $$;

-- 생성 실패 시 차감 복구. /api/generate가 업스트림 오류·스트림 실패·빈 응답을 감지하면 호출.
create or replace function public.restore_generation(uid uuid, p_source text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
begin
  select * into p from public.profiles where id = uid for update;
  if not found then
    return json_build_object('restored', false, 'reason', 'profile_not_found');
  end if;

  if p_source = 'credit' then
    update public.profiles set
      credits = credits + 1,
      daily_usage_count = greatest(daily_usage_count - 1, 0),
      last_generated_at = null
    where id = uid;
    return json_build_object('restored', true, 'source', 'credit');
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
