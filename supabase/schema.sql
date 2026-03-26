create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'premium')),
  credits_remaining integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references public.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;

alter table public.subscriptions
  add column if not exists current_period_end timestamptz;

create index if not exists usage_logs_user_created_idx
  on public.usage_logs (user_id, created_at desc);

create index if not exists subscriptions_customer_idx
  on public.subscriptions (stripe_customer_id);

alter table public.users enable row level security;
alter table public.usage_logs enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "users can read own profile" on public.users;

create policy "users can read own profile"
  on public.users
  for select
  using (auth.uid() = id);

drop policy if exists "users can update own profile" on public.users;

create policy "users can update own profile"
  on public.users
  for update
  using (auth.uid() = id);

drop policy if exists "users can insert own profile" on public.users;

create policy "users can insert own profile"
  on public.users
  for insert
  with check (auth.uid() = id);

drop policy if exists "users can read own usage logs" on public.usage_logs;

create policy "users can read own usage logs"
  on public.usage_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert own usage logs" on public.usage_logs;

create policy "users can insert own usage logs"
  on public.usage_logs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can read own subscriptions" on public.subscriptions;

create policy "users can read own subscriptions"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
