-- Complete native social feature schema upgrade and activity notifications.
-- Idempotent; also supports the older profile/posts schema used by early app builds.
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists cover_url text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text default '';
alter table public.posts add column if not exists body text;
alter table public.posts add column if not exists image_url text;
alter table public.posts add column if not exists media_type text not null default 'post';
alter table public.posts add column if not exists video_url text;
alter table public.posts add column if not exists author_name text;
alter table public.stories add column if not exists caption text default '';
alter table public.stories drop constraint if exists stories_media_type_check;
alter table public.stories add constraint stories_media_type_check check (media_type in ('image','video'));
alter table public.stories alter column media_type set default 'image';
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists story_id uuid references public.stories(id) on delete cascade;
alter table public.messages add column if not exists media_url text;
alter table public.messages add column if not exists media_type text;
alter table public.messages add column if not exists file_name text;
alter table public.messages add column if not exists delivered_at timestamptz;
create index if not exists stories_active_idx on public.stories(expires_at desc);
create index if not exists messages_pair_created_idx on public.messages(sender_id, receiver_id, created_at desc);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists friend_requests_receiver_status_idx on public.friend_requests(receiver_id, status, created_at desc);

create or replace function public.notify_post_like()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare owner_id uuid;
begin
 select user_id into owner_id from public.posts where id = new.post_id;
 if owner_id is not null and owner_id <> new.user_id then
  insert into public.notifications(user_id,actor_id,kind,post_id,message) values(owner_id,new.user_id,'like',new.post_id,'liked your post');
 end if;
 return new;
end; $$;
drop trigger if exists post_like_notification on public.likes;
create trigger post_like_notification after insert on public.likes for each row execute function public.notify_post_like();
revoke all on function public.notify_post_like() from public, anon, authenticated;

create or replace function public.notify_post_comment()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare owner_id uuid;
begin
 select user_id into owner_id from public.posts where id = new.post_id;
 if owner_id is not null and owner_id <> new.user_id then
  insert into public.notifications(user_id,actor_id,kind,post_id,message) values(owner_id,new.user_id,'comment',new.post_id,'commented on your post');
 end if;
 return new;
end; $$;
drop trigger if exists post_comment_notification on public.comments;
create trigger post_comment_notification after insert on public.comments for each row execute function public.notify_post_comment();
revoke all on function public.notify_post_comment() from public, anon, authenticated;

create or replace function public.notify_friend_request()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
 if tg_op = 'INSERT' and new.status = 'pending' then
  insert into public.notifications(user_id,actor_id,kind,message) values(new.receiver_id,new.sender_id,'friend_request','sent you a friend request');
 elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted' then
  insert into public.notifications(user_id,actor_id,kind,message) values(new.sender_id,new.receiver_id,'friend_accepted','accepted your friend request');
 end if;
 return new;
end; $$;
drop trigger if exists friend_request_notification on public.friend_requests;
create trigger friend_request_notification after insert or update of status on public.friend_requests for each row execute function public.notify_friend_request();
revoke all on function public.notify_friend_request() from public, anon, authenticated;

create or replace function public.notify_story_reaction()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare owner_id uuid;
begin
 select user_id into owner_id from public.stories where id = new.story_id;
 if owner_id is not null and owner_id <> new.user_id then
  insert into public.notifications(user_id,actor_id,kind,story_id,message) values(owner_id,new.user_id,'story_reaction',new.story_id,'reacted to your story');
 end if;
 return new;
end; $$;
drop trigger if exists story_reaction_notification on public.story_reactions;
create trigger story_reaction_notification after insert on public.story_reactions for each row execute function public.notify_story_reaction();
revoke all on function public.notify_story_reaction() from public, anon, authenticated;
