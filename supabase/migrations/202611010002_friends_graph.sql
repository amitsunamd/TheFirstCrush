-- The First Crush: friend graph hardening (safe to re-run)
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  constraint friend_requests_not_self check (sender_id <> receiver_id),
  constraint friend_requests_unique_pair unique (sender_id, receiver_id)
);
create index if not exists friend_requests_receiver_status_idx on public.friend_requests(receiver_id,status,created_at desc);
create index if not exists friend_requests_sender_status_idx on public.friend_requests(sender_id,status,created_at desc);
alter table public.friend_requests enable row level security;
drop policy if exists "friend requests visible to participants" on public.friend_requests;
drop policy if exists "send friend requests" on public.friend_requests;
drop policy if exists "receiver updates requests" on public.friend_requests;
drop policy if exists "senders cancel pending requests" on public.friend_requests;
drop policy if exists "participants remove accepted friends" on public.friend_requests;
drop policy if exists "senders retry rejected requests" on public.friend_requests;
create policy "friend requests visible to participants" on public.friend_requests for select to authenticated using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "send friend requests" on public.friend_requests for insert to authenticated with check (auth.uid() = sender_id and sender_id <> receiver_id);
create policy "receiver updates requests" on public.friend_requests for update to authenticated using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);
create policy "senders cancel pending requests" on public.friend_requests for delete to authenticated using (auth.uid() = sender_id and status = 'pending');
create policy "participants remove accepted friends" on public.friend_requests for delete to authenticated using (status = 'accepted' and (auth.uid() = sender_id or auth.uid() = receiver_id));
grant select,insert,update,delete on public.friend_requests to authenticated;

create policy "senders retry rejected requests" on public.friend_requests for update to authenticated using (auth.uid() = sender_id and status = 'rejected') with check (auth.uid() = sender_id and status = 'pending');
