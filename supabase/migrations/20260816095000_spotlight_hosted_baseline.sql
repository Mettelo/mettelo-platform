-- Canonical historical baseline for Spotlight reputation fields that pre-date repository history.
-- Existing hosted columns/constraints are preserved; blank environments receive the fields
-- required by the later Phase 5 proof/credentials/reputation migration.

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

do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.spotlights'::regclass and conname='spotlights_rank_position_check') then
    alter table public.spotlights add constraint spotlights_rank_position_check
      check (rank_position is null or (rank_position >= 1 and rank_position <= 3));
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.spotlights'::regclass and conname='spotlights_selection_method_check') then
    alter table public.spotlights add constraint spotlights_selection_method_check
      check (selection_method = any (array['automatic'::text,'manual'::text,'override'::text]));
  end if;
end $$;
