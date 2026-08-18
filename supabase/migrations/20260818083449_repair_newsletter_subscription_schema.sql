-- Repair production drift for the footer/newsletter subscription journey.
-- The application has used these fields since Phase 8, but the hosted database
-- had not recorded or applied that migration.

alter table public.newsletter_subscribers
  add column if not exists marketing_preferences jsonb not null
    default '{"projects":true,"events":true,"opportunities":true,"insights":true}'::jsonb,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists newsletter_subscribers_unsubscribe_token_idx
  on public.newsletter_subscribers(unsubscribe_token);

alter table public.newsletter_subscribers enable row level security;

-- Newsletter records remain server-only. New Supabase Data API defaults require
-- explicit grants, so keep public roles revoked and grant only the server role.
revoke all on table public.newsletter_subscribers from anon, authenticated;
grant select, insert, update, delete on table public.newsletter_subscribers to service_role;

comment on column public.newsletter_subscribers.marketing_preferences is
  'Marketing newsletter topics only. Transactional account, project, recruitment and security communications are controlled separately.';
