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

  -- 월 바뀌면 카운트 리셋
  if p.usage_month <> cur then
    update public.profiles set usage_month = cur, usage_count = 0 where id = uid;
    p.usage_count := 0;
  end if;

  -- 구독 안 했고 체험 기간 지남
  if (not p.subscribed) and now() > p.created_at + make_interval(mins => trial_minutes) then
    return json_build_object('allowed', false, 'reason', 'trial_over');
  end if;

  -- 월간 한도 초과
  if p.usage_count >= monthly_limit then
    return json_build_object('allowed', false, 'reason', 'limit');
  end if;

  update public.profiles set usage_count = p.usage_count + 1 where id = uid;
  return json_build_object('allowed', true, 'remaining', monthly_limit - p.usage_count - 1);
end $$;
