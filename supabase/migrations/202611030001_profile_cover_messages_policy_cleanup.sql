-- The First Crush: profile cover fields, message keys, and RLS cleanup
alter table public.profiles
  add column if not exists cover_url text,
  add column if not exists location text;

alter table public.messages
  alter column id set default gen_random_uuid(),
  alter column id set not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.messages'::regclass and contype='p') then
    alter table public.messages add constraint messages_pkey primary key (id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.connections'::regclass and contype='p') then
    alter table public.connections
      alter column id set default gen_random_uuid(),
      alter column id set not null;
    alter table public.connections add constraint connections_pkey primary key (id);
  end if;
end $$;

drop policy if exists "signed-in create own posts" on public.posts;
drop policy if exists "users create own posts" on public.posts;
drop policy if exists "owners delete posts" on public.posts;
drop policy if exists "users delete own posts" on public.posts;
drop policy if exists "owners update posts" on public.posts;
drop policy if exists "users edit own posts" on public.posts;
create policy "posts insert own" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "posts update own" on public.posts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "posts delete own" on public.posts for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "profile owner insert" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
drop policy if exists "profile owner update" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Accepted friends can send messages" on public.messages;
create policy "accepted friends can send messages" on public.messages
for insert to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.friend_requests fr
    where fr.status = 'accepted'
      and ((fr.sender_id = messages.sender_id and fr.receiver_id = messages.receiver_id)
        or (fr.sender_id = messages.receiver_id and fr.receiver_id = messages.sender_id))
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-covers', 'profile-covers', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "profile covers public read" on storage.objects;
create policy "profile covers public read" on storage.objects for select to public using (bucket_id = 'profile-covers');
drop policy if exists "profile covers owner upload" on storage.objects;
create policy "profile covers owner upload" on storage.objects for insert to authenticated with check (bucket_id = 'profile-covers' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "profile covers owner update" on storage.objects;
create policy "profile covers owner update" on storage.objects for update to authenticated using (bucket_id = 'profile-covers' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'profile-covers' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "profile covers owner delete" on storage.objects;
create policy "profile covers owner delete" on storage.objects for delete to authenticated using (bucket_id = 'profile-covers' and (storage.foldername(name))[1] = auth.uid()::text);
