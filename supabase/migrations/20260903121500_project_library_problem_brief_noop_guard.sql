create or replace function public.project_problem_brief_skip_noop_update()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists project_problem_briefs_skip_noop_update on public.project_problem_briefs;
create trigger project_problem_briefs_skip_noop_update
before update on public.project_problem_briefs
for each row execute function public.project_problem_brief_skip_noop_update();
