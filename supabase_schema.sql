-- Mirage: схема аккаунтов, профилей, настроек и избранного.
-- Выполнить целиком в Supabase → SQL Editor → New query.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  settings jsonb not null default '{}'::jsonb,
  saved_styles jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  code_key text not null check (char_length(code_key) <= 120),
  created_at timestamptz not null default now(),
  primary key (user_id, code_key)
);

create index if not exists favorites_user_created_idx
  on public.favorites (user_id, created_at desc);

-- При регистрации автоматически создаём профиль из метаданных пользователя.
create or replace function public.handle_new_mirage_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 40)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_mirage on auth.users;
create trigger on_auth_user_created_mirage
after insert on auth.users
for each row execute procedure public.handle_new_mirage_user();

-- Включаем Row Level Security: каждый пользователь видит и меняет только свои данные.
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "Users can read their own Mirage profile" on public.profiles;
create policy "Users can read their own Mirage profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own Mirage profile" on public.profiles;
create policy "Users can update their own Mirage profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can read their own Mirage favorites" on public.favorites;
create policy "Users can read their own Mirage favorites"
  on public.favorites for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own Mirage favorites" on public.favorites;
create policy "Users can add their own Mirage favorites"
  on public.favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own Mirage favorites" on public.favorites;
create policy "Users can delete their own Mirage favorites"
  on public.favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Даём доступ только авторизованным пользователям; права дополнительно ограничены RLS.
grant usage on schema public to authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.favorites from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, delete on public.favorites to authenticated;
