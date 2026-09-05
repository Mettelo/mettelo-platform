-- Project Experience Phase 4 — public catalogue read-path indexes.
-- The public discovery loader reads only public projects in allowed lifecycle states,
-- ordered newest-first and in bounded PostgREST ranges. Keep that access path explicit
-- and reproducible rather than relying on incidental indexes in a hosted database.

create index if not exists projects_public_catalogue_visibility_status_created_idx
  on public.projects (visibility, status, created_at desc, id desc);

create index if not exists projects_public_catalogue_deadline_idx
  on public.projects (application_deadline, id)
  where visibility='public' and application_deadline is not null;

comment on index public.projects_public_catalogue_visibility_status_created_idx is
  'Phase 4 public catalogue: supports visibility/lifecycle filtering and stable newest-first ranged reads.';
comment on index public.projects_public_catalogue_deadline_idx is
  'Phase 4 public catalogue: supports public deadline/closing-soon discovery without a hosted-only index.';
