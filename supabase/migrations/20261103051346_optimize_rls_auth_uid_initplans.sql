do $$
declare
  p record;
  role_list text;
  using_expr text;
  check_expr text;
  create_sql text;
begin
  for p in
    select schemaname, tablename, policyname, roles, cmd, qual, with_check, permissive
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ~ 'auth\.uid\(\)'
        or coalesce(with_check, '') ~ 'auth\.uid\(\)'
      )
  loop
    select string_agg(
      case when r = 'public' then 'public' else quote_ident(r) end,
      ', '
    ) into role_list
    from unnest(p.roles) as r;

    using_expr := case when p.qual is null then null
      else regexp_replace(p.qual, 'auth\.uid\(\)', '(select auth.uid())', 'g') end;
    check_expr := case when p.with_check is null then null
      else regexp_replace(p.with_check, 'auth\.uid\(\)', '(select auth.uid())', 'g') end;

    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);

    create_sql := format(
      'create policy %I on %I.%I as %s for %s to %s',
      p.policyname, p.schemaname, p.tablename,
      case when p.permissive = 'PERMISSIVE' then 'permissive' else 'restrictive' end,
      p.cmd, role_list
    );
    if using_expr is not null then
      create_sql := create_sql || format(' using (%s)', using_expr);
    end if;
    if check_expr is not null then
      create_sql := create_sql || format(' with check (%s)', check_expr);
    end if;
    execute create_sql;
  end loop;
end $$;
