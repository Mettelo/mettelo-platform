-- CI compatibility layer for Spotlight fields that exist in the hosted database
-- but whose original creation predates the repository's canonical migration history.
-- Applied only inside the disposable local Supabase release-test stack.

alter table public.spotlights
  add column if not exists award_month date,
  add column if not exists score numeric,
  add column if not exists score_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists rank_position integer,
  add column if not exists selection_method text not null default 'manual',
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists is_excluded boolean not null default false,
  add column if not exists exclusion_reason text;

alter table public.spotlights drop constraint if exists spotlights_rank_position_check;
alter table public.spotlights add constraint spotlights_rank_position_check
  check (rank_position is null or (rank_position >= 1 and rank_position <= 3));

alter table public.spotlights drop constraint if exists spotlights_selection_method_check;
alter table public.spotlights add constraint spotlights_selection_method_check
  check (selection_method = any (array['automatic'::text,'manual'::text,'override'::text]));
