create or replace function public.notify_message_receiver()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.sender_id <> new.receiver_id then
    insert into public.notifications(user_id, actor_id, kind)
    values (new.receiver_id, new.sender_id, 'message');
  end if;
  return new;
end; $$;
drop trigger if exists message_notification on public.messages;
create trigger message_notification after insert on public.messages for each row execute function public.notify_message_receiver();
revoke all on function public.notify_message_receiver() from public, anon, authenticated;