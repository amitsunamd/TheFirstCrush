-- Generate activity notifications for the native app.
-- Safe to re-run; notifications are created only for actions on another user's content.

create or replace function public.notify_post_like()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(user_id, actor_id, kind, post_id, message)
    values (owner_id, new.user_id, 'like', new.post_id, 'liked your post');
  end if;
  return new;
end; $$;
drop trigger if exists post_like_notification on public.likes;
create trigger post_like_notification after insert on public.likes
for each row execute function public.notify_post_like();
revoke all on function public.notify_post_like() from public, anon, authenticated;

create or replace function public.notify_post_comment()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(user_id, actor_id, kind, post_id, message)
    values (owner_id, new.user_id, 'comment', new.post_id, 'commented on your post');
  end if;
  return new;
end; $$;
drop trigger if exists post_comment_notification on public.comments;
create trigger post_comment_notification after insert on public.comments
for each row execute function public.notify_post_comment();
revoke all on function public.notify_post_comment() from public, anon, authenticated;

create or replace function public.notify_friend_request()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'pending' then
    insert into public.notifications(user_id, actor_id, kind, message)
    values (new.receiver_id, new.sender_id, 'friend_request', 'sent you a friend request');
  elsif new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.notifications(user_id, actor_id, kind, message)
    values (new.sender_id, new.receiver_id, 'friend_accepted', 'accepted your friend request');
  end if;
  return new;
end; $$;
drop trigger if exists friend_request_notification on public.friend_requests;
create trigger friend_request_notification after insert or update of status on public.friend_requests
for each row execute function public.notify_friend_request();
revoke all on function public.notify_friend_request() from public, anon, authenticated;

create or replace function public.notify_story_reaction()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.stories where id = new.story_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(user_id, actor_id, kind, story_id, message)
    values (owner_id, new.user_id, 'story_reaction', new.story_id, 'reacted to your story');
  end if;
  return new;
end; $$;
drop trigger if exists story_reaction_notification on public.story_reactions;
create trigger story_reaction_notification after insert on public.story_reactions
for each row execute function public.notify_story_reaction();
revoke all on function public.notify_story_reaction() from public, anon, authenticated;

create index if not exists posts_user_created_idx on public.posts(user_id, created_at desc);
create index if not exists likes_post_idx on public.likes(post_id);
create index if not exists story_reactions_story_idx on public.story_reactions(story_id, created_at desc);
