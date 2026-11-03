-- Add support for the native app's Photos / Posts / Reels profile tabs and follow counts.
alter table public.posts add column if not exists media_type text not null default 'post';
alter table public.posts drop constraint if exists posts_media_type_check;
alter table public.posts add constraint posts_media_type_check check (media_type in ('post','photo','reel'));

create table if not exists public.profile_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_follows_no_self check (follower_id <> following_id),
  constraint profile_follows_unique unique (follower_id, following_id)
);
create index if not exists profile_follows_following_idx on public.profile_follows(following_id, created_at desc);
create index if not exists profile_follows_follower_idx on public.profile_follows(follower_id, created_at desc);
alter table public.profile_follows enable row level security;
drop policy if exists "profile follows readable" on public.profile_follows;
create policy "profile follows readable" on public.profile_follows for select to authenticated using (true);
drop policy if exists "users follow as themselves" on public.profile_follows;
create policy "users follow as themselves" on public.profile_follows for insert to authenticated with check (auth.uid() = follower_id);
drop policy if exists "users unfollow as themselves" on public.profile_follows;
create policy "users unfollow as themselves" on public.profile_follows for delete to authenticated using (auth.uid() = follower_id);

create or replace function public.notify_profile_follow()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.notifications(user_id, actor_id, kind)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end; $$;
drop trigger if exists profile_follow_notification on public.profile_follows;
create trigger profile_follow_notification after insert on public.profile_follows
for each row execute function public.notify_profile_follow();
revoke all on function public.notify_profile_follow() from public, anon, authenticated;