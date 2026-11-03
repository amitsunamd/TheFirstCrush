create or replace function public.sync_profile_name_fields()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    new.display_name := coalesce(nullif(trim(new.display_name),''), nullif(trim(new.full_name),''), 'Love Explorer');
    new.full_name := coalesce(nullif(trim(new.full_name),''), nullif(trim(new.display_name),''), 'Love Explorer');
  elsif new.display_name is distinct from old.display_name and new.full_name is not distinct from old.full_name then
    new.full_name := new.display_name;
  elsif new.full_name is distinct from old.full_name and new.display_name is not distinct from old.display_name then
    new.display_name := new.full_name;
  end if;
  return new;
end; $$;
drop trigger if exists profiles_sync_name_fields on public.profiles;
create trigger profiles_sync_name_fields before insert or update of display_name,full_name on public.profiles
for each row execute function public.sync_profile_name_fields();

create or replace function public.sync_post_text_fields()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    new.text := coalesce(nullif(trim(new.text),''), nullif(trim(new.body),''), '');
    new.body := coalesce(nullif(trim(new.body),''), nullif(trim(new.text),''), '');
  elsif new.text is distinct from old.text and new.body is not distinct from old.body then
    new.body := new.text;
  elsif new.body is distinct from old.body and new.text is not distinct from old.text then
    new.text := new.body;
  end if;
  return new;
end; $$;
drop trigger if exists posts_sync_text_fields on public.posts;
create trigger posts_sync_text_fields before insert or update of text,body on public.posts
for each row execute function public.sync_post_text_fields();

update public.profiles set
  display_name = coalesce(nullif(trim(display_name),''), nullif(trim(full_name),''), 'Love Explorer'),
  full_name = coalesce(nullif(trim(full_name),''), nullif(trim(display_name),''), 'Love Explorer');
update public.posts set
  body = coalesce(nullif(trim(body),''), nullif(trim(text),''), ''),
  text = coalesce(nullif(trim(text),''), nullif(trim(body),''), '');