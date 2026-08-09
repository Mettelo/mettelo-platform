create or replace function public.book_project_presentation(target_project uuid,target_slot uuid,target_deck_url text default null,target_presenters uuid[] default '{}')
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=auth.uid();slot_record public.presentation_slots%rowtype;booked_presentation_id uuid;previous_slot uuid;presenter uuid;
begin
 if actor is null then raise exception 'Authentication required'; end if;
 if not public.is_project_lead(target_project) then raise exception 'Project Lead or Reviewer access required'; end if;
 select slot_id into previous_slot from public.project_presentations where project_id=target_project;
 select * into slot_record from public.presentation_slots where id=target_slot for update;
 if not found then raise exception 'Presentation slot does not exist'; end if;
 if slot_record.status<>'available' and coalesce(previous_slot,'00000000-0000-0000-0000-000000000000'::uuid)<>target_slot then raise exception 'Presentation slot is no longer available'; end if;
 if exists(select 1 from public.project_presentations pp where pp.project_id<>target_project and pp.slot_id=target_slot and pp.status in ('booked','presented','verified','changes_required')) then raise exception 'Presentation slot is already booked'; end if;
 foreach presenter in array target_presenters loop if not exists(select 1 from public.project_members pm where pm.project_id=target_project and pm.user_id=presenter) then raise exception 'Every presenter must be a project member'; end if; end loop;
 if previous_slot is not null and previous_slot<>target_slot then update public.presentation_slots set status='available' where id=previous_slot and status='booked'; end if;
 insert into public.project_presentations(project_id,slot_id,meeting_url,deck_url,status,booked_by,updated_at) values(target_project,target_slot,slot_record.meeting_url,target_deck_url,'booked',actor,now()) on conflict(project_id) do update set slot_id=excluded.slot_id,meeting_url=excluded.meeting_url,deck_url=excluded.deck_url,status='booked',booked_by=actor,reviewer_notes=null,presented_at=null,updated_at=now() returning id into booked_presentation_id;
 delete from public.project_presenters where project_presenters.presentation_id=booked_presentation_id;
 insert into public.project_presenters(presentation_id,user_id) select booked_presentation_id,x from unnest(target_presenters) x on conflict do nothing;
 update public.presentation_slots set status='booked' where id=target_slot;
 return booked_presentation_id;
end;
$$;
revoke all on function public.book_project_presentation(uuid,uuid,text,uuid[]) from public;
grant execute on function public.book_project_presentation(uuid,uuid,text,uuid[]) to authenticated;

create or replace function public.update_project_presentation_status(target_project uuid,target_status text,target_notes text default null)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=auth.uid(); team_role text;
begin
 if actor is null then raise exception 'Authentication required'; end if;
 select pm.team_role into team_role from public.project_members pm where pm.project_id=target_project and pm.user_id=actor;
 if public.is_admin() then team_role:='admin'; end if;
 if target_status='presented' then
   if team_role not in ('project_lead','reviewer','admin') then raise exception 'Project Lead access required'; end if;
   update public.project_presentations set status='presented',presented_at=now(),updated_at=now() where project_id=target_project;
 elsif target_status in ('verified','changes_required') then
   if team_role not in ('project_lead','reviewer','admin') then raise exception 'Project Lead, Reviewer or Admin access required'; end if;
   update public.project_presentations set status=target_status,reviewer_notes=target_notes,updated_at=now() where project_id=target_project;
 else raise exception 'Invalid presentation status'; end if;
end;
$$;
revoke all on function public.update_project_presentation_status(uuid,text,text) from public;
grant execute on function public.update_project_presentation_status(uuid,text,text) to authenticated;