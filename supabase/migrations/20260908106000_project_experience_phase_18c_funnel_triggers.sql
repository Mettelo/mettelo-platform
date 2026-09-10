-- Phase 18C server-authoritative collaboration funnel instrumentation.
-- Events are derived from canonical writes so clients cannot forge successful interest/invite outcomes.

create or replace function public.phase18_track_collaboration_interest_submission()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.application_kind='interest' and new.collaboration_need_id is not null then
    perform public.phase18_record_collaboration_analytics('interest_submitted',new.collaboration_need_id,'member_project',new.user_id);
  end if;
  return new;
end;$$;
revoke all on function public.phase18_track_collaboration_interest_submission() from public,anon,authenticated;
drop trigger if exists project_application_phase18_analytics on public.project_applications;
create trigger project_application_phase18_analytics after insert on public.project_applications for each row execute function public.phase18_track_collaboration_interest_submission();

create or replace function public.phase18_track_external_collaboration_invite()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    perform public.phase18_record_collaboration_analytics('invite_sent',new.collaboration_need_id,'external_invite',new.invited_by);
  elsif new.status='accepted' and old.status is distinct from 'accepted' then
    perform public.phase18_record_collaboration_analytics('invite_accepted',new.collaboration_need_id,'external_invite',new.accepted_by);
  end if;
  return new;
end;$$;
revoke all on function public.phase18_track_external_collaboration_invite() from public,anon,authenticated;
drop trigger if exists project_external_collaboration_invite_phase18_analytics on public.project_external_collaboration_invites;
create trigger project_external_collaboration_invite_phase18_analytics after insert or update of status on public.project_external_collaboration_invites for each row execute function public.phase18_track_external_collaboration_invite();
