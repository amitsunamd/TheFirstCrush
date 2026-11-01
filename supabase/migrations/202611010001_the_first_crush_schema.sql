-- The First Crush Supabase schema
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  bio text default '',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- Upgrade older profiles tables without deleting existing user data.
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists bio text default '';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) <= 2000),
  image_url text,
  category text default 'General',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- Upgrade existing posts tables created with an older schema.
alter table public.posts add column if not exists body text;
alter table public.posts add column if not exists category text default 'General';
alter table public.posts add column if not exists image_url text;
alter table public.posts add column if not exists created_at timestamptz default now();
alter table public.posts add column if not exists updated_at timestamptz default now();
create table if not exists public.likes (
  user_id uuid references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key(user_id, post_id)
);
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) <= 1000),
  created_at timestamptz default now()
);
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','rejected')),
  created_at timestamptz default now(),
  unique(sender_id, receiver_id),
  check(sender_id <> receiver_id)
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null,
  post_id uuid references public.posts(id) on delete cascade,
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.friend_requests enable row level security;
alter table public.notifications enable row level security;
-- Make policy setup safe to rerun after a partially completed migration.
drop policy if exists "profiles readable" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "posts readable" on public.posts;
drop policy if exists "users create own posts" on public.posts;
drop policy if exists "users edit own posts" on public.posts;
drop policy if exists "users delete own posts" on public.posts;
drop policy if exists "likes readable" on public.likes;
drop policy if exists "users manage own likes" on public.likes;
drop policy if exists "comments readable" on public.comments;
drop policy if exists "users create comments" on public.comments;
drop policy if exists "users delete own comments" on public.comments;
drop policy if exists "friend requests visible to participants" on public.friend_requests;
drop policy if exists "send friend requests" on public.friend_requests;
drop policy if exists "receiver updates requests" on public.friend_requests;
drop policy if exists "senders cancel pending requests" on public.friend_requests;
drop policy if exists "participants remove accepted friends" on public.friend_requests;
drop policy if exists "notifications own" on public.notifications;
drop policy if exists "notifications mark read" on public.notifications;
drop policy if exists "public read app images" on storage.objects;
drop policy if exists "authenticated upload own folder" on storage.objects;
drop policy if exists "authenticated update own folder" on storage.objects;

create policy "profiles readable" on public.profiles for select using (true);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "posts readable" on public.posts for select using (true);
create policy "users create own posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "users edit own posts" on public.posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own posts" on public.posts for delete using (auth.uid() = user_id);
create policy "likes readable" on public.likes for select using (true);
create policy "users manage own likes" on public.likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comments readable" on public.comments for select using (true);
create policy "users create comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "users delete own comments" on public.comments for delete using (auth.uid() = user_id);
create policy "friend requests visible to participants" on public.friend_requests for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "send friend requests" on public.friend_requests for insert with check (auth.uid() = sender_id);
create policy "receiver updates requests" on public.friend_requests for update using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);
create policy "senders cancel pending requests" on public.friend_requests for delete using (auth.uid() = sender_id and status = 'pending');
create policy "participants remove accepted friends" on public.friend_requests for delete to authenticated using (status = 'accepted' and (auth.uid() = sender_id or auth.uid() = receiver_id));
grant select, insert, update, delete on table public.friend_requests to authenticated;
create policy "notifications own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications mark read" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('post-images','post-images',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "public read app images" on storage.objects for select using (bucket_id in ('avatars','post-images'));
create policy "authenticated upload own folder" on storage.objects for insert to authenticated with check (bucket_id in ('avatars','post-images') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "authenticated update own folder" on storage.objects for update to authenticated using (bucket_id in ('avatars','post-images') and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id in ('avatars','post-images') and (storage.foldername(name))[1] = auth.uid()::text);
