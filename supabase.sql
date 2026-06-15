-- ============================================
-- 말로(Mallo) Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run
-- ============================================

-- 사용자 프로필 (체험/구독/사용량)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  subscribed boolean not null default false,
  usage_month text not null default to_char(now(), 'YYYY-MM'),
  usage_count int not null default 0
);

alter table public.profiles enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);

-- 가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 생성 1회 사용 처리 (체험/구독/월간한도 검사 + 카운트 증가, 원자적)
create or replace function public.use_generation(uid uuid, monthly_limit int, trial_minutes int)
returns json language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  cur text := to_char(now(), 'YYYY-MM');
begin
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  select * into p from public.profiles where id = uid for update;

  -- 마스터(무제한)
  if p.unlimited then
    update public.profiles set usage_count = p.usage_count + 1 where id = uid;
    return json_build_object('allowed', true, 'remaining', 999999);
  end if;

  -- 구독자(유효 기간 내): 본인 플랜 월 한도 (월 바뀌면 리셋)
  if p.subscribed and (p.sub_until is null or p.sub_until > now()) then
    if p.usage_month <> cur then
      update public.profiles set usage_month = cur, usage_count = 0 where id = uid;
      p.usage_count := 0;
    end if;
    if p.usage_count >= coalesce(p.monthly_limit, monthly_limit) then
      return json_build_object('allowed', false, 'reason', 'limit');
    end if;
    update public.profiles set usage_count = p.usage_count + 1 where id = uid;
    return json_build_object('allowed', true, 'remaining', coalesce(p.monthly_limit, monthly_limit) - p.usage_count - 1);
  end if;

  -- 베타 무료 체험: 평생 trial_minutes(=무료 생성 횟수)회, 월 리셋 없음
  if p.usage_count >= trial_minutes then
    return json_build_object('allowed', false, 'reason', 'trial_over');
  end if;
  update public.profiles set usage_count = p.usage_count + 1 where id = uid;
  return json_build_object('allowed', true, 'remaining', trial_minutes - p.usage_count - 1);
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
-- 결제(포트원 정기결제) 지원
-- ============================================
alter table public.profiles add column if not exists billing_key text;     -- 카카오페이 빌링키(자동결제용)
alter table public.profiles add column if not exists sub_until timestamptz;  -- 구독 만료 시각
alter table public.profiles add column if not exists plan text;              -- 플랜 id (light/standard/pro)
alter table public.profiles add column if not exists plan_price int;         -- 월 결제 금액(원)
alter table public.profiles add column if not exists monthly_limit int;      -- 플랜별 월 생성 한도

-- 구독 활성화/연장 (결제 성공 시 호출) — 플랜·가격·월 한도 저장
drop function if exists public.activate_subscription(uuid, text, int);
create or replace function public.activate_subscription(uid uuid, p_billing_key text, p_days int, p_price int, p_limit int, p_plan text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  update public.profiles set
    subscribed = true,
    billing_key = coalesce(p_billing_key, billing_key),
    plan = coalesce(p_plan, plan),
    plan_price = coalesce(p_price, plan_price),
    monthly_limit = coalesce(p_limit, monthly_limit),
    sub_until = greatest(coalesce(sub_until, now()), now()) + make_interval(days => p_days),
    usage_month = to_char(now(), 'YYYY-MM'),
    usage_count = 0
  where id = uid;
end $$;

-- 구독 해지 (결제 실패/취소 시)
create or replace function public.cancel_subscription(uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set subscribed = false, billing_key = null where id = uid;
end $$;

-- 결제일 도래 구독자 목록 (자동결제 크론용)
drop function if exists public.due_subscriptions(int);
create or replace function public.due_subscriptions(grace int)
returns table(id uuid, email text, billing_key text, plan_price int, plan text, monthly_limit int)
language sql security definer set search_path = public as $$
  select id, email, billing_key, plan_price, plan, monthly_limit from public.profiles
  where subscribed = true and billing_key is not null
    and sub_until is not null and sub_until <= now() + make_interval(days => grace);
$$;

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
