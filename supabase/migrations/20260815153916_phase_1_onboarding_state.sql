-- Phase 1 onboarding state
-- Existing members are backfilled as completed so the first-time journey only applies to new accounts.

alter table public.profiles
  add column if not exists onboarding_step smallint not null default 0 check (onboarding_step between 0 and 4),
  add column if not exists onboarding_completed_at timestamptz;

update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, updated_at, now()),
    onboarding_step = 4
where onboarding_completed_at is null;
