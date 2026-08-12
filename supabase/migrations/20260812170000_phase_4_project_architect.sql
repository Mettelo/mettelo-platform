-- Phase 4: Project Architect progression and verifiable designation.
-- This migration is intentionally committed but not applied until the integrated release branch.

create table if not exists public.account_identities (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_type text not null default 'member' check (account_type in ('member','project_architect')),
  show_project_architect_designation boolean not null default false,
  approved_application_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.account_identities (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.ensure_account_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_identities (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_account_identity on public.profiles;
create trigger profiles_ensure_account_identity
after insert on public.profiles
for each row execute function public.ensure_account_identity();

create table if not exists public.project_architect_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','additional_evidence_required','approved','declined','withdrawn','suspended')),
  data_ai_experience text not null default '',
  project_delivery_experience text not null default '',
  coordination_experience text not null default '',
  proposed_first_project text not null default '',
  availability text not null default '',
  motivation text not null default '',
  reviewer_notes text,
  reviewed_by uuid references auth.users(id),
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists project_architect_one_open_application
on public.project_architect_applications(user_id)
where status in ('draft','submitted','under_review','additional_evidence_required','approved','suspended');

create table if not exists public.project_architect_application_evidence (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.project_architect_applications(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('external_link','mettelo_proof')),
  label text not null,
  external_url text,
  contribution_id uuid references public.contributions(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (evidence_type='external_link' and external_url ~ '^https://' and contribution_id is null)
    or (evidence_type='mettelo_proof' and contribution_id is not null and external_url is null)
  ),
  check (char_length(trim(label)) between 1 and 160)
);

create table if not exists public.project_architect_application_history (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.project_architect_applications(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_architect_credentials (
  id uuid primary key default gen_random_uuid(),
  credential_id text not null unique default ('MET-PA-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.project_architect_applications(id) on delete restrict,
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  issued_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists project_architect_one_active_credential
on public.project_architect_credentials(user_id)
where status='active';

alter table public.account_identities
  drop constraint if exists account_identities_approved_application_id_fkey;
alter table public.account_identities
  add constraint account_identities_approved_application_id_fkey
  foreign key (approved_application_id) references public.project_architect_applications(id) on delete set null;

create or replace function public.audit_project_architect_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op='INSERT' or old.status is distinct from new.status then
    insert into public.project_architect_application_history
      (application_id,from_status,to_status,changed_by,note)
    values
      (new.id,case when tg_op='INSERT' then null else old.status end,new.status,
       coalesce(auth.uid(),new.reviewed_by,new.user_id),new.reviewer_notes);
  end if;
  return new;
end;
$$;

create or replace function public.guard_project_architect_member_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt()->>'role','')='authenticated' then
    if new.user_id is distinct from old.user_id
      or new.reviewer_notes is distinct from old.reviewer_notes
      or new.reviewed_by is distinct from old.reviewed_by
      or new.decided_at is distinct from old.decided_at then
      raise exception 'Review fields are Admin-controlled';
    end if;
    if not (
      (old.status='draft' and new.status in ('draft','submitted','withdrawn'))
      or (old.status='submitted' and new.status='withdrawn')
      or (old.status='additional_evidence_required' and new.status in ('additional_evidence_required','draft','submitted','withdrawn'))
    ) then
      raise exception 'Invalid member application transition';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists project_architect_member_update_guard on public.project_architect_applications;
create trigger project_architect_member_update_guard
before update on public.project_architect_applications
for each row execute function public.guard_project_architect_member_update();

drop trigger if exists project_architect_application_audit on public.project_architect_applications;
create trigger project_architect_application_audit
after insert or update of status on public.project_architect_applications
for each row execute function public.audit_project_architect_application();

create or replace function public.review_project_architect_application(
  p_application_id uuid,
  p_action text,
  p_notes text,
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.project_architect_applications%rowtype;
  v_now timestamptz := now();
  v_credential text;
begin
  if not exists (
    select 1 from auth.users
    where id=p_actor and coalesce(raw_app_meta_data->>'role','')='admin'
  ) then
    raise exception 'Admin access required';
  end if;

  if p_action not in ('under_review','additional_evidence_required','approved','declined','suspended') then
    raise exception 'Unsupported review action';
  end if;

  select * into v_application
  from public.project_architect_applications
  where id=p_application_id
  for update;
  if not found then raise exception 'Application not found'; end if;

  if p_action='approved' and v_application.status not in ('submitted','under_review','additional_evidence_required') then
    raise exception 'Only an active review can be approved';
  end if;
  if p_action='under_review' and v_application.status not in ('submitted','additional_evidence_required') then
    raise exception 'Only a submitted application can enter review';
  end if;
  if p_action='additional_evidence_required' and v_application.status not in ('submitted','under_review') then
    raise exception 'Evidence can only be requested during an active review';
  end if;
  if p_action='declined' and v_application.status not in ('submitted','under_review','additional_evidence_required') then
    raise exception 'Only an active review can be declined';
  end if;
  if p_action='suspended' and v_application.status<>'approved' then
    raise exception 'Only an approved Project Architect can be suspended';
  end if;

  update public.project_architect_applications set
    status=p_action,
    reviewer_notes=nullif(trim(p_notes),''),
    reviewed_by=p_actor,
    decided_at=case when p_action in ('approved','declined','suspended') then v_now else null end,
    updated_at=v_now
  where id=p_application_id;

  if p_action='approved' then
    insert into public.account_identities (user_id,account_type,approved_application_id,updated_at)
    values (v_application.user_id,'project_architect',p_application_id,v_now)
    on conflict (user_id) do update set
      account_type='project_architect',approved_application_id=p_application_id,updated_at=v_now;

    insert into public.project_architect_credentials (user_id,application_id)
    values (v_application.user_id,p_application_id)
    on conflict (user_id) where status='active' do nothing;
  elsif p_action='suspended' then
    update public.account_identities set
      account_type='member',show_project_architect_designation=false,updated_at=v_now
    where user_id=v_application.user_id;
    update public.project_architect_credentials set
      status='suspended',status_changed_at=v_now
    where user_id=v_application.user_id and status='active';
  end if;

  select credential_id into v_credential
  from public.project_architect_credentials
  where user_id=v_application.user_id
  order by issued_at desc limit 1;

  return jsonb_build_object('application_id',p_application_id,'status',p_action,'user_id',v_application.user_id,'credential_id',v_credential);
end;
$$;

alter table public.account_identities enable row level security;
alter table public.project_architect_applications enable row level security;
alter table public.project_architect_application_evidence enable row level security;
alter table public.project_architect_application_history enable row level security;
alter table public.project_architect_credentials enable row level security;

create policy "members read own identity" on public.account_identities
for select to authenticated using ((select auth.uid())=user_id or public.is_admin());
create policy "members read own architect applications" on public.project_architect_applications
for select to authenticated using ((select auth.uid())=user_id or public.is_admin());
create policy "members create own architect applications" on public.project_architect_applications
for insert to authenticated with check ((select auth.uid())=user_id and status in ('draft','submitted'));
create policy "members edit eligible architect applications" on public.project_architect_applications
for update to authenticated
using ((select auth.uid())=user_id and status in ('draft','additional_evidence_required','submitted'))
with check ((select auth.uid())=user_id and status in ('draft','submitted','withdrawn'));
create policy "members read own architect evidence" on public.project_architect_application_evidence
for select to authenticated using (exists (
  select 1 from public.project_architect_applications a where a.id=application_id and (a.user_id=(select auth.uid()) or public.is_admin())
));
create policy "members add own architect evidence" on public.project_architect_application_evidence
for insert to authenticated with check (exists (
  select 1 from public.project_architect_applications a where a.id=application_id and a.user_id=(select auth.uid()) and a.status in ('draft','submitted','additional_evidence_required')
) and (
  (evidence_type='external_link' and external_url ~ '^https://' and contribution_id is null)
  or (evidence_type='mettelo_proof' and external_url is null and exists (
    select 1 from public.contributions c where c.id=contribution_id and c.user_id=(select auth.uid()) and c.verification_status='verified'
  ))
));
create policy "members remove editable architect evidence" on public.project_architect_application_evidence
for delete to authenticated using (exists (
  select 1 from public.project_architect_applications a where a.id=application_id and a.user_id=(select auth.uid()) and a.status in ('draft','additional_evidence_required')
));
create policy "members read own architect history" on public.project_architect_application_history
for select to authenticated using (exists (
  select 1 from public.project_architect_applications a where a.id=application_id and (a.user_id=(select auth.uid()) or public.is_admin())
));
create policy "members read own architect credential" on public.project_architect_credentials
for select to authenticated using ((select auth.uid())=user_id or public.is_admin());

revoke all on public.account_identities, public.project_architect_applications,
  public.project_architect_application_evidence, public.project_architect_application_history,
  public.project_architect_credentials from anon, authenticated;
grant select on public.account_identities to authenticated;
grant select,insert,update on public.project_architect_applications to authenticated;
grant select,insert,delete on public.project_architect_application_evidence to authenticated;
grant select on public.project_architect_application_history to authenticated;
grant select on public.project_architect_credentials to authenticated;
grant all on public.account_identities, public.project_architect_applications,
  public.project_architect_application_evidence, public.project_architect_application_history,
  public.project_architect_credentials to service_role;
grant usage,select on sequence public.project_architect_application_history_id_seq to service_role;

revoke all on function public.review_project_architect_application(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.review_project_architect_application(uuid,text,text,uuid) to service_role;
revoke all on function public.ensure_account_identity() from public,anon,authenticated;
revoke all on function public.audit_project_architect_application() from public,anon,authenticated;
revoke all on function public.guard_project_architect_member_update() from public,anon,authenticated;

create index if not exists project_architect_applications_review_queue
on public.project_architect_applications(status,submitted_at desc);
create index if not exists project_architect_evidence_application
on public.project_architect_application_evidence(application_id);
create index if not exists project_architect_history_application
on public.project_architect_application_history(application_id,created_at desc);
