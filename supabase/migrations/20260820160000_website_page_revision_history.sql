-- Admin Website Phase 4: immutable public-page revision history and atomic publish.
-- Historical revisions are Admin-only. Restoring a revision creates a draft and never changes public content directly.

create table if not exists public.website_page_revisions (
  id bigint generated always as identity primary key,
  page_key text not null check (page_key in ('home','about','contact')),
  revision_number integer not null check (revision_number > 0),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  source text not null default 'publish' check (source in ('baseline','publish','restored_publish')),
  restored_from_revision_id bigint references public.website_page_revisions(id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique(page_key,revision_number)
);

create index if not exists website_page_revisions_page_created_idx
  on public.website_page_revisions(page_key,created_at desc,id desc);

alter table public.website_page_revisions enable row level security;
revoke all on public.website_page_revisions from anon, authenticated;
revoke all on public.website_page_revisions from service_role;
grant select on public.website_page_revisions to service_role;

alter table public.website_page_drafts
  add column if not exists restored_from_revision_id bigint references public.website_page_revisions(id) on delete restrict;

-- Capture any page that was already published before revision history existed.
insert into public.website_page_revisions(page_key,revision_number,payload,source,created_at,created_by)
select p.page_key,1,p.payload,'baseline',p.published_at,p.published_by
from public.website_page_public p
where not exists (
  select 1 from public.website_page_revisions r where r.page_key=p.page_key
);

create or replace function public.publish_website_page_with_revision(
  p_page_key text,
  p_payload jsonb,
  p_actor uuid,
  p_restored_from_revision_id bigint default null
)
returns table(revision_id bigint,revision_number integer,published_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_revision_number integer;
  v_revision_id bigint;
  v_published_at timestamptz := now();
  v_source text := case when p_restored_from_revision_id is null then 'publish' else 'restored_publish' end;
begin
  if p_page_key not in ('home','about','contact') then
    raise exception 'Invalid Website page key';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Website page payload must be an object';
  end if;
  if p_restored_from_revision_id is not null and not exists (
    select 1 from public.website_page_revisions
    where id=p_restored_from_revision_id and page_key=p_page_key
  ) then
    raise exception 'Restore source revision does not belong to this page';
  end if;

  -- Serialize publishes per page so revision numbering remains contiguous under concurrency.
  perform pg_advisory_xact_lock(hashtext('website-page:' || p_page_key));
  select coalesce(max(r.revision_number),0)+1
    into v_revision_number
    from public.website_page_revisions r
   where r.page_key=p_page_key;

  insert into public.website_page_public(page_key,payload,published_at,published_by)
  values(p_page_key,p_payload,v_published_at,p_actor)
  on conflict(page_key) do update set
    payload=excluded.payload,
    published_at=excluded.published_at,
    published_by=excluded.published_by;

  insert into public.website_page_revisions(
    page_key,revision_number,payload,source,restored_from_revision_id,created_at,created_by
  ) values(
    p_page_key,v_revision_number,p_payload,v_source,p_restored_from_revision_id,v_published_at,p_actor
  ) returning id into v_revision_id;

  update public.website_page_drafts
     set restored_from_revision_id=null
   where page_key=p_page_key;

  return query select v_revision_id,v_revision_number,v_published_at;
end;
$$;

revoke all on function public.publish_website_page_with_revision(text,jsonb,uuid,bigint) from public, anon, authenticated;
grant execute on function public.publish_website_page_with_revision(text,jsonb,uuid,bigint) to service_role;
