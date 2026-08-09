drop function if exists public.book_project_presentation(uuid,uuid,text,uuid[]);
drop function if exists public.update_project_presentation_status(uuid,text,text);

create function public.book_project_presentation_service(target_project uuid,target_slot uuid,target_deck_url text,target_presenters uuid[],actor_user uuid,actor_is_admin boolean default false)
returns uuid language plpgsql security definer set search_path=public as $$
declare slot_record public.presentation_slots%rowtype;booked_presentation_id uuid;previous_slot uuid;presenter uuid;actor_role text;
begin
 if actor_user is null then raise exception 'Actor is required'; end if;
 select pm.team_role into actor_role from public.project_members pm where pm.project_id=target_project and pm.user_id=actor_user;
 if not actor_is_admin and coalesce(actor_role,'') not in ('project_lead','reviewer') then raise exception 'Project Lead or Reviewer access required'; end if;
 select slot_id into previous_slot from public.project_presentations where project_id=target_project;
 select * into slot_record from public.presentation_slots where id=target_slot for update;
 if not found then raise exception 'Presentation slot does not exist'; end if;
 if slot_record.status<>'available' and coalesce(previous_slot,'00000000-0000-0000-0000-000000000000'::uuid)<>target_slot then raise exception 'Presentation slot is no longer available'; end if;
 if exists(select 1 from public.project_presentations pp where pp.project_id<>target_project and pp.slot_id=target_slot and pp.status in ('booked','presented','verified','changes_required')) then raise exception 'Presentation slot is already booked'; end if;
 foreach presenter in array target_presenters loop if not exists(select 1 from public.project_members pm where pm.project_id=target_project and pm.user_id=presenter) then raise exception 'Every presenter must be a project member'; end if; end loop;
 if previous_slot is not null and previous_slot<>target_slot then update public.presentation_slots set status='available' where id=previous_slot and status='booked'; end if;
 insert into public.project_presentations(project_id,slot_id,meeting_url,deck_url,status,booked_by,updated_at) values(target_project,target_slot,slot_record.meeting_url,target_deck_url,'booked',actor_user,now()) on conflict(project_id) do update set slot_id=excluded.slot_id,meeting_url=excluded.meeting_url,deck_url=excluded.deck_url,status='booked',booked_by=actor_user,reviewer_notes=null,presented_at=null,updated_at=now() returning id into booked_presentation_id;
 delete from public.project_presenters where project_presenters.presentation_id=booked_presentation_id;
 insert into public.project_presenters(presentation_id,user_id) select booked_presentation_id,x from unnest(target_presenters) x on conflict do nothing;
 update public.presentation_slots set status='booked' where id=target_slot;
 return booked_presentation_id;
end;$$;
revoke all on function public.book_project_presentation_service(uuid,uuid,text,uuid[],uuid,boolean) from public,anon,authenticated;
grant execute on function public.book_project_presentation_service(uuid,uuid,text,uuid[],uuid,boolean) to service_role;

create function public.update_project_presentation_status_service(target_project uuid,target_status text,target_notes text,actor_user uuid,actor_is_admin boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare actor_role text;
begin
 if actor_user is null then raise exception 'Actor is required'; end if;
 select pm.team_role into actor_role from public.project_members pm where pm.project_id=target_project and pm.user_id=actor_user;
 if not actor_is_admin and coalesce(actor_role,'') not in ('project_lead','reviewer') then raise exception 'Project Lead or Reviewer access required'; end if;
 if target_status='presented' then update public.project_presentations set status='presented',presented_at=now(),updated_at=now() where project_id=target_project;
 elsif target_status in ('verified','changes_required') then update public.project_presentations set status=target_status,reviewer_notes=target_notes,updated_at=now() where project_id=target_project;
 else raise exception 'Invalid presentation status'; end if;
end;$$;
revoke all on function public.update_project_presentation_status_service(uuid,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.update_project_presentation_status_service(uuid,text,text,uuid,boolean) to service_role;