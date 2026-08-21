-- Keep the saved opportunity persistence contract aligned with the API and reminder cron.
-- The member still owns each row through the existing RLS policy; this migration only adds
-- the reminder preference column consumed by /api/opportunities/saved and the reminder job.

alter table public.saved_opportunities
  add column if not exists reminders_enabled boolean not null default true;

comment on column public.saved_opportunities.reminders_enabled is
  'Whether the member wants deadline reminder emails for this saved opportunity.';
