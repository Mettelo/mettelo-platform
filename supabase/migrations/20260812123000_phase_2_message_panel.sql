begin;

alter table public.project_discussions
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by_user_id uuid,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by_user_id uuid;

alter table public.project_discussions
  drop constraint if exists project_discussions_message_type_check;
alter table public.project_discussions
  add constraint project_discussions_message_type_check
  check (message_type in ('update','question','blocker','decision')) not valid;
alter table public.project_discussions
  validate constraint project_discussions_message_type_check;

create index if not exists project_discussions_run_created_idx
  on public.project_discussions(project_run_id,created_at,id)
  where project_run_id is not null;
create index if not exists project_discussions_run_pinned_idx
  on public.project_discussions(project_run_id,pinned_at desc)
  where project_run_id is not null and pinned_at is not null and deleted_at is null;

-- Message mutations are mediated by the authenticated server route. Inserts
-- and reads continue to use RLS, while UPDATE is removed from browser clients
-- so an author cannot forge pinning or another member's moderation action.
revoke update on table public.project_discussions from anon, authenticated;

-- Preserve message authorship and scope even for privileged server updates.
create or replace function public.protect_project_discussion_identity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.project_id is distinct from old.project_id
     or new.project_run_id is distinct from old.project_run_id
     or new.author_user_id is distinct from old.author_user_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Message identity and project scope cannot be changed';
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_project_discussion_identity() from public, anon, authenticated;
grant execute on function public.protect_project_discussion_identity() to service_role;

drop trigger if exists protect_project_discussion_identity on public.project_discussions;
create trigger protect_project_discussion_identity
before update on public.project_discussions
for each row execute function public.protect_project_discussion_identity();

commit;
