-- Repair the governed Mettelo Lab event read path and bridge explicitly opted-in
-- project learning/showcase events into the sanitised public Events catalogue.
--
-- Security invariants:
-- * project_meetings remains RLS-protected; this grants table SELECT only so the
--   existing member/admin policy can actually run through PostgREST.
-- * public.events receives only presentation metadata. join_url, provider room,
--   project_run_id, participants and other private workspace fields never leave
--   project_meetings.
-- * project_team and named_members events are never projected publicly.

grant select on table public.project_meetings to authenticated;

alter table public.events
  add column if not exists source_project_meeting_id uuid references public.project_meetings(id) on delete cascade,
  add column if not exists source_project_id uuid references public.projects(id) on delete set null;

create unique index if not exists events_source_project_meeting_uidx
  on public.events(source_project_meeting_id)
  where source_project_meeting_id is not null;
create index if not exists events_source_project_idx
  on public.events(source_project_id)
  where source_project_id is not null;

-- Public Events already groups project-learning and project-showcase formats, but
-- the hosted-baseline check constraint did not permit those two values.
alter table public.events drop constraint if exists events_event_type_check;
alter table public.events
  add constraint events_event_type_check
  check (event_type in (
    'ama','workshop','office_hours','community_session','showcase','webinar',
    'networking','summit','build_sprint','project_learning','project_showcase','other'
  )) not valid;
alter table public.events validate constraint events_event_type_check;

-- Keep the RLS read contract aligned with the statuses the public Events page
-- intentionally renders (including transparent cancellation/closure notices).
drop policy if exists "published events readable" on public.events;
create policy "published events readable" on public.events
  for select
  using (status in ('published','registration_closed','completed','cancelled') or public.is_admin());

create or replace function public.sync_project_event_public_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  public_type text;
  public_status text;
  public_slug text;
  public_description text;
  public_registration_url text;
  public_registration_platform text;
  public_registration_label text;
  public_registration_required boolean;
begin
  -- Only explicitly community-visible learning sessions and final presentations
  -- are eligible. Private/named-member events are removed from the catalogue if
  -- a lead later restricts them.
  if new.visibility not in ('community_learning','approval_required')
     or new.event_type not in ('learning_session','final_presentation') then
    delete from public.events where source_project_meeting_id = new.id;
    return new;
  end if;

  public_type := case
    when new.event_type = 'final_presentation' then 'project_showcase'
    else 'project_learning'
  end;
  public_status := case
    when new.status = 'cancelled' then 'cancelled'
    when new.status = 'completed' then 'completed'
    else 'published'
  end;
  public_slug := 'project-event-' || replace(new.id::text, '-', '');
  public_description := concat_ws(E'\n\n',
    nullif(trim(coalesce(new.purpose,'')),''),
    case when nullif(trim(coalesce(new.agenda,'')),'') is not null
      then 'Agenda: ' || trim(new.agenda) end,
    case when nullif(trim(coalesce(new.learning_objectives,'')),'') is not null
      then 'Learning objectives: ' || trim(new.learning_objectives) end
  );

  -- Existing governed registration currently supports learning sessions. Final
  -- presentations may be publicly listed as showcases, but are not advertised as
  -- registerable until their registration contract is explicitly enabled.
  if new.event_type = 'learning_session' then
    public_registration_url := '/member/events?event=' || new.id::text;
    public_registration_platform := 'mettelo';
    public_registration_label := case when new.visibility='approval_required' then 'Request a place' else 'Reserve a place' end;
    public_registration_required := true;
  else
    public_registration_url := null;
    public_registration_platform := null;
    public_registration_label := null;
    public_registration_required := false;
  end if;

  insert into public.events (
    id,slug,title,event_type,summary,description,starts_at,ends_at,timezone,
    delivery_mode,location_label,capacity,registration_url,
    registration_platform,registration_label,registration_required,status,
    published_at,source_project_meeting_id,source_project_id,updated_at
  ) values (
    new.id,public_slug,new.title,public_type,nullif(trim(coalesce(new.purpose,'')),''),
    nullif(public_description,''),new.starts_at,new.ends_at,new.timezone,
    'online','Online · Mettelo',new.capacity,
    public_registration_url,public_registration_platform,public_registration_label,
    public_registration_required,public_status,
    case when public_status='published' then coalesce(new.created_at,now()) else null end,
    new.id,new.project_id,now()
  )
  on conflict (id) do update set
    slug=excluded.slug,
    title=excluded.title,
    event_type=excluded.event_type,
    summary=excluded.summary,
    description=excluded.description,
    starts_at=excluded.starts_at,
    ends_at=excluded.ends_at,
    timezone=excluded.timezone,
    delivery_mode=excluded.delivery_mode,
    location_label=excluded.location_label,
    capacity=excluded.capacity,
    registration_url=excluded.registration_url,
    registration_platform=excluded.registration_platform,
    registration_label=excluded.registration_label,
    registration_required=excluded.registration_required,
    status=excluded.status,
    published_at=case
      when public.events.published_at is not null then public.events.published_at
      when excluded.status='published' then now()
      else null
    end,
    source_project_meeting_id=excluded.source_project_meeting_id,
    source_project_id=excluded.source_project_id,
    updated_at=now();

  return new;
end;
$$;

revoke all on function public.sync_project_event_public_listing() from public;

drop trigger if exists sync_project_event_public_listing on public.project_meetings;
create trigger sync_project_event_public_listing
after insert or update of title,purpose,event_type,visibility,agenda,learning_objectives,
  timezone,starts_at,ends_at,status,capacity on public.project_meetings
for each row execute function public.sync_project_event_public_listing();

-- Backfill any already-scheduled opted-in events without exposing private events.
-- title is in the trigger's UPDATE OF list, so this intentional no-op invokes the
-- synchroniser for canonical rows that predate this migration.
update public.project_meetings
set title = title
where visibility in ('community_learning','approval_required')
  and event_type in ('learning_session','final_presentation');

comment on column public.events.source_project_meeting_id is
  'Optional sanitised public projection source. Never use this relation to expose project_meetings join/provider/participant fields.';