-- Expand Admin Website Pages beyond the initial Home/About/Contact set.
-- This remains additive: published content is public-readable, drafts/revisions are service-role only.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conrelid::regclass AS table_name, conname
    FROM pg_constraint
    WHERE contype='c'
      AND conrelid IN ('public.website_page_public'::regclass,'public.website_page_drafts'::regclass,'public.website_page_revisions'::regclass)
      AND pg_get_constraintdef(oid) ILIKE '%page_key%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',r.table_name,r.conname);
  END LOOP;
END $$;

ALTER TABLE public.website_page_public
  ADD CONSTRAINT website_page_public_page_key_check CHECK (page_key IN (
    'home','about','contact','organisations','community','projects','opportunities','showcase','events','people','spotlight','blog','careers','faq','partnership','feedback','community_guidelines','privacy','terms'
  ));
ALTER TABLE public.website_page_drafts
  ADD CONSTRAINT website_page_drafts_page_key_check CHECK (page_key IN (
    'home','about','contact','organisations','community','projects','opportunities','showcase','events','people','spotlight','blog','careers','faq','partnership','feedback','community_guidelines','privacy','terms'
  ));
ALTER TABLE public.website_page_revisions
  ADD CONSTRAINT website_page_revisions_page_key_check CHECK (page_key IN (
    'home','about','contact','organisations','community','projects','opportunities','showcase','events','people','spotlight','blog','careers','faq','partnership','feedback','community_guidelines','privacy','terms'
  ));

-- Keep the atomic publish function aligned with the expanded governed page registry.
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
  if p_page_key not in (
    'home','about','contact','organisations','community','projects','opportunities','showcase','events','people','spotlight','blog','careers','faq','partnership','feedback','community_guidelines','privacy','terms'
  ) then
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

COMMENT ON TABLE public.website_page_public IS 'Published governed public-page copy for the Admin Website CMS. Public readers see published payloads only.';
COMMENT ON TABLE public.website_page_drafts IS 'Admin-only draft public-page copy. Save does not affect the live website until publish.';
COMMENT ON TABLE public.website_page_revisions IS 'Immutable Website page publication history used for review and restore-to-draft.';
