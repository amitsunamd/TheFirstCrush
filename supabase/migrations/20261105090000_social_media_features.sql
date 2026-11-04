-- The First Crush: social/media feature backend.
-- Apply this migration in the Supabase SQL Editor or via Supabase CLI.
-- Existing public tables are preserved; this migration only adds missing feature tables/columns.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comments_post_created_idx on public.comments(post_id, created_at);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_url text,
  media_type text not null default 'text' check (media_type in ('text','image','video')),
  caption text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check (media_url is not null or char_length(trim(caption)) > 0)
);
create index if not exists stories_active_idx on public.stories(expires_at desc);

create table if not exists public.story_reactions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default '❤️',
  created_at timestamptz not null default now(),
  unique(story_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('like','comment','share','friend_request','friend_accepted','story_reaction','message')),
  post_id uuid references public.posts(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  message text not null default '',
  created_at timestamptz not null default now(),
  is_read boolean not null default false
);
create index if not exists notifications_recipient_created_idx on public.notifications(user_id, created_at desc);

-- Keep story expiry enforced at read time; rows can be cleaned up by a scheduled job later.
alter table public.comments enable row level security;
alter table public.stories enable row level security;
alter table public.story_reactions enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "comments visible to signed in users" on public.comments;
create policy "comments visible to signed in users" on public.comments
for select to authenticated using (true);
drop policy if exists "users create own comments" on public.comments;
create policy "users create own comments" on public.comments
for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "users update own comments" on public.comments;
create policy "users update own comments" on public.comments
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users delete own comments" on public.comments;
create policy "users delete own comments" on public.comments
for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "active stories visible to signed in users" on public.stories;
create policy "active stories visible to signed in users" on public.stories
for select to authenticated using (expires_at > now() or auth.uid() = user_id);
drop policy if exists "users create own stories" on public.stories;
create policy "users create own stories" on public.stories
for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "users update own stories" on public.stories;
create policy "users update own stories" on public.stories
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users delete own stories" on public.stories;
create policy "users delete own stories" on public.stories
for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "story reactions visible to signed in users" on public.story_reactions;
create policy "story reactions visible to signed in users" on public.story_reactions
for select to authenticated using (true);
drop policy if exists "users react to stories" on public.story_reactions;
create policy "users react to stories" on public.story_reactions
for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "users remove own story reactions" on public.story_reactions;
create policy "users remove own story reactions" on public.story_reactions
for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
for select to authenticated using (auth.uid() = user_id);
drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read" on public.notifications
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.comments to authenticated;
grant select, insert, update, delete on public.stories to authenticated;
grant select, insert, delete on public.story_reactions to authenticated;
grant select, update on public.notifications to authenticated;

-- Private bucket for user-generated media. Files are accessed through authenticated policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tfc-media', 'tfc-media', false, 104857600, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','audio/mp4','audio/mpeg','audio/ogg','audio/webm','application/pdf','text/plain','application/zip'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated users upload own media" on storage.objects;
create policy "authenticated users upload own media" on storage.objects
for insert to authenticated with check (bucket_id = 'tfc-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "authenticated users read media" on storage.objects;
create policy "authenticated users read media" on storage.objects
for select to authenticated using (bucket_id = 'tfc-media');
drop policy if exists "users update own media" on storage.objects;
create policy "users update own media" on storage.objects
for update to authenticated using (bucket_id = 'tfc-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'tfc-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "users delete own media" on storage.objects;
create policy "users delete own media" on storage.objects
for delete to authenticated using (bucket_id = 'tfc-media' and (storage.foldername(name))[1] = auth.uid()::text);
