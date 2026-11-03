-- Secure messaging and generate in-app notifications from trusted database events.
drop policy if exists "Users can read their messages" on public.messages;
create policy "Users can read their messages" on public.messages
for select to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

drop policy if exists "notifications own" on public.notifications;
create policy "notifications own" on public.notifications
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "notifications mark read" on public.notifications;
create policy "notifications mark read" on public.notifications
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.notify_post_interaction()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare post_owner uuid; notification_kind text;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  if post_owner is not null and post_owner <> new.user_id then
    if tg_table_name = 'likes' then notification_kind := 'like'; else notification_kind := 'comment'; end if;
    insert into public.notifications(user_id, actor_id, kind, post_id)
    values (post_owner, new.user_id, notification_kind, new.post_id);
  end if;
  return new;
end; $$;
drop trigger if exists likes_notify_post_owner on public.likes;
create trigger likes_notify_post_owner after insert on public.likes for each row execute function public.notify_post_interaction();
drop trigger if exists comments_notify_post_owner on public.comments;
create trigger comments_notify_post_owner after insert on public.comments for each row execute function public.notify_post_interaction();

create or replace function public.notify_friend_request()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.sender_id <> new.receiver_id then
    insert into public.notifications(user_id, actor_id, kind) values (new.receiver_id, new.sender_id, 'friend_request');
  end if;
  return new;
end; $$;
drop trigger if exists friend_request_notification on public.friend_requests;
create trigger friend_request_notification after insert on public.friend_requests for each row execute function public.notify_friend_request();
revoke all on function public.notify_post_interaction() from public, anon, authenticated;
revoke all on function public.notify_friend_request() from public, anon, authenticated;