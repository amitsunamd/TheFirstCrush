-- Extended profile fields and follower relationships for The First Crush
alter table public.profiles add column if not exists cover_url text;
alter table public.profiles add column if not exists location text;

alter table public.posts add column if not exists media_type text not null default 'post';
alter table public.posts drop constraint if exists posts_media_type_check;
alter table public.posts add constraint posts_media_type_check
  check (media_type in ('post','photo','reel'));

create table if not exists public.profile_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_follows_no_self check (follower_id <> following_id),
  constraint profile_follows_unique unique (follower_id, following_id)
);
alter table public.profile_follows enable row level security;
drop policy if exists "follows readable by authenticated" on public.profile_follows;
drop policy if exists "users follow as themselves" on public.profile_follows;
drop policy if exists "users unfollow themselves" on public.profile_follows;
create policy "follows readable by authenticated" on public.profile_follows
  for select to authenticated using (true);
create policy "users follow as themselves" on public.profile_follows
  for insert to authenticated with check (auth.uid() = follower_id);
create policy "users unfollow themselves" on public.profile_follows
  for delete to authenticated using (auth.uid() = follower_id);
grant select, insert, delete on public.profile_follows to authenticated;
