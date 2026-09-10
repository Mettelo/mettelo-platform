-- Phase 18C: keep collaboration recommendation preferences inside the existing
-- canonical member privacy transaction and expose a narrow self-service toggle.

create or replace function public.phase18_save_member_privacy_preferences(
  p_profile_discoverable boolean,
  p_allow_project_invitations boolean,
  p_allow_member_messages boolean,
  p_allow_collaboration_recommendations boolean
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  perform public.save_member_privacy_preferences(
    p_profile_discoverable,
    p_allow_project_invitations,
    p_allow_member_messages
  );
  update public.member_privacy_preferences
  set allow_collaboration_recommendations=coalesce(p_allow_collaboration_recommendations,true),updated_at=now()
  where user_id=auth.uid();
  if not found then
    insert into public.member_privacy_preferences(user_id,allow_project_invitations,allow_member_messages,allow_collaboration_recommendations,updated_at)
    values(auth.uid(),coalesce(p_allow_project_invitations,true),coalesce(p_allow_member_messages,true),coalesce(p_allow_collaboration_recommendations,true),now())
    on conflict(user_id) do update set allow_collaboration_recommendations=excluded.allow_collaboration_recommendations,updated_at=excluded.updated_at;
  end if;
end;
$$;
revoke all on function public.phase18_save_member_privacy_preferences(boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.phase18_save_member_privacy_preferences(boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.phase18_set_collaboration_recommendations(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  update public.member_privacy_preferences
  set allow_collaboration_recommendations=coalesce(p_enabled,true),updated_at=now()
  where user_id=auth.uid();
  if not found then
    insert into public.member_privacy_preferences(user_id,allow_collaboration_recommendations,updated_at)
    values(auth.uid(),coalesce(p_enabled,true),now());
  end if;
end;
$$;
revoke all on function public.phase18_set_collaboration_recommendations(boolean) from public,anon;
grant execute on function public.phase18_set_collaboration_recommendations(boolean) to authenticated;

-- Server-side recommendation projection, Admin governance, and isolated E2E
-- verification all use the canonical service role. RLS bypass alone is not a
-- substitute for table privileges, so keep this existing privacy table readable
-- and writable by the service role after the Phase 18 column extension.
grant select,insert,update,delete on table public.member_privacy_preferences to service_role;

comment on function public.phase18_save_member_privacy_preferences(boolean,boolean,boolean,boolean) is 'Phase 18 extension of the existing canonical privacy save. All privacy settings commit or roll back together.';
comment on function public.phase18_set_collaboration_recommendations(boolean) is 'Phase 18 member-owned recommendation toggle. Changes recommendation visibility only and never admission, eligibility or project access.';
