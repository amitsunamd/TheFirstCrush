-- Private chat read receipts: only the recipient can mark a message as read.
alter table public.messages
  add column if not exists read_at timestamptz;

create index if not exists messages_unread_recipient_idx
  on public.messages (receiver_id, sender_id, created_at)
  where read_at is null;

drop policy if exists "recipients mark messages read" on public.messages;
create policy "recipients mark messages read"
on public.messages for update to authenticated
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);

grant select, insert, update on public.messages to authenticated;
