-- Project Experience Phase 16: senior-review hardening.
-- Align the legacy compatibility handover projection with the structured handover
-- field bounds, and make replacement-request state scoped to one recovery cycle.

alter table public.project_members drop constraint if exists project_members_handover_note_check;
alter table public.project_members add constraint project_members_handover_note_check
  check (handover_note is null or char_length(btrim(handover_note)) between 1 and 4000);

comment on column public.project_members.handover_note is
  'Legacy Phase 16 compatibility projection of operational completed-work handover. Structured handover authority remains project_member_handovers.';

create or replace function public.phase16_clear_replacement_request_when_recovered()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if coalesce(new.replacement_needed,false)=false then
    new.replacement_requested_at:=null;
    new.replacement_requested_by:=null;
  end if;
  return new;
end;
$$;

revoke all on function public.phase16_clear_replacement_request_when_recovered() from public,anon,authenticated;

drop trigger if exists phase16_clear_replacement_request_when_recovered on public.project_runs;
create trigger phase16_clear_replacement_request_when_recovered
before update of replacement_needed
on public.project_runs
for each row execute function public.phase16_clear_replacement_request_when_recovered();
