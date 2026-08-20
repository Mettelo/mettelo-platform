-- Canonical historical baseline for hosted Events fields that predate the
-- repository migration history. This is idempotent on hosted production and
-- reconstructs the exact shape used by current public/member event journeys.

alter table public.events
  add column if not exists description text,
  add column if not exists timezone text not null default 'Europe/London',
  add column if not exists delivery_mode text not null default 'online',
  add column if not exists host_name text,
  add column if not exists speaker_names text[] not null default '{}'::text[],
  add column if not exists featured_image text,
  add column if not exists featured_image_alt text,
  add column if not exists capacity integer,
  add column if not exists registration_platform text,
  add column if not exists registration_label text,
  add column if not exists registration_required boolean not null default true,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists published_at timestamptz,
  add column if not exists archived_at timestamptz;

-- The oldest repository baseline allowed `meetup`; hosted production uses
-- `community_session` instead. Canonicalise any blank/local legacy seed before
-- replacing the historical check constraint with the hosted contract.
update public.events
set event_type='community_session'
where event_type='meetup';

alter table public.events drop constraint if exists events_delivery_mode_check;
alter table public.events
  add constraint events_delivery_mode_check
  check (delivery_mode in ('online','in_person','hybrid')) not valid;
alter table public.events validate constraint events_delivery_mode_check;

alter table public.events drop constraint if exists events_capacity_positive;
alter table public.events
  add constraint events_capacity_positive
  check (capacity is null or capacity > 0) not valid;
alter table public.events validate constraint events_capacity_positive;

alter table public.events drop constraint if exists events_event_type_check;
alter table public.events
  add constraint events_event_type_check
  check (event_type in ('ama','workshop','office_hours','community_session','showcase','webinar','networking','summit','build_sprint','other')) not valid;
alter table public.events validate constraint events_event_type_check;

alter table public.events drop constraint if exists events_status_check;
alter table public.events
  add constraint events_status_check
  check (status in ('draft','published','registration_closed','completed','cancelled','archived')) not valid;
alter table public.events validate constraint events_status_check;

create index if not exists events_type_idx on public.events(event_type);
