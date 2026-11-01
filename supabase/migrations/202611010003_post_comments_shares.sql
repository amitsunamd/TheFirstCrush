-- Comments and share tracking for The First Crush posts
create table if not exists public.post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.comments enable row level security;
alter table public.post_shares enable row level security;

drop policy if exists "comments readable" on public.comments;
drop policy if exists "users create comments" on public.comments;
drop policy if exists "users delete own comments" on public.comments;
drop policy if exists "post shares readable" on public.post_shares;
drop policy if exists "users record own post shares" on public.post_shares;

create policy "comments readable" on public.comments
  for select to authenticated using (true);
create policy "users create comments" on public.comments
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users delete own comments" on public.comments
  for delete to authenticated using (auth.uid() = user_id);

create policy "post shares readable" on public.post_shares
  for select to authenticated using (true);
create policy "users record own post shares" on public.post_shares
  for insert to authenticated with check (auth.uid() = user_id);

grant select, insert, delete on table public.comments to authenticated;
grant select, insert on table public.post_shares to authenticated;
grant select, insert, delete on table public.likes to authenticated;
