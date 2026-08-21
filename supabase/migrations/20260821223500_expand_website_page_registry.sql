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
    'home','about','contact','organisations','community','projects','opportunities','showcase','events','people','spotlight','blog','careers','faq','partnership','feedback','community_guidelines'
  ));
ALTER TABLE public.website_page_drafts
  ADD CONSTRAINT website_page_drafts_page_key_check CHECK (page_key IN (
    'home','about','contact','organisations','community','projects','opportunities','showcase','events','people','spotlight','blog','careers','faq','partnership','feedback','community_guidelines'
  ));
ALTER TABLE public.website_page_revisions
  ADD CONSTRAINT website_page_revisions_page_key_check CHECK (page_key IN (
    'home','about','contact','organisations','community','projects','opportunities','showcase','events','people','spotlight','blog','careers','faq','partnership','feedback','community_guidelines'
  ));

COMMENT ON TABLE public.website_page_public IS 'Published governed public-page copy for the Admin Website CMS. Public readers see published payloads only.';
COMMENT ON TABLE public.website_page_drafts IS 'Admin-only draft public-page copy. Save does not affect the live website until publish.';
COMMENT ON TABLE public.website_page_revisions IS 'Immutable Website page publication history used for review and restore-to-draft.';
