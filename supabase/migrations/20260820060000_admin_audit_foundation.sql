-- Admin foundation: append-only operational audit history.
-- Additive only. No existing domain table or policy is changed by this migration.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_email text,
  capability text,
  action text not null,
  resource_type text not null,
  resource_id text,
  result text not null default 'success' check (result in ('success','failure','denied')),
  reason text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint admin_audit_actor_email_length check (actor_email is null or length(actor_email) <= 320),
  constraint admin_audit_capability_length check (capability is null or length(capability) <= 120),
  constraint admin_audit_action_not_blank check (length(btrim(action)) > 0),
  constraint admin_audit_action_length check (length(action) <= 120),
  constraint admin_audit_resource_type_not_blank check (length(btrim(resource_type)) > 0),
  constraint admin_audit_resource_type_length check (length(resource_type) <= 120),
  constraint admin_audit_resource_id_length check (resource_id is null or length(resource_id) <= 180),
  constraint admin_audit_reason_length check (reason is null or length(reason) <= 1000)
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_created_idx on public.admin_audit_log (actor_user_id, created_at desc);
create index if not exists admin_audit_log_actor_email_created_idx on public.admin_audit_log (lower(actor_email), created_at desc) where actor_email is not null;
create index if not exists admin_audit_log_resource_created_idx on public.admin_audit_log (resource_type, resource_id, created_at desc);
create index if not exists admin_audit_log_action_created_idx on public.admin_audit_log (action, created_at desc);
create index if not exists admin_audit_log_result_created_idx on public.admin_audit_log (result, created_at desc);

alter table public.admin_audit_log enable row level security;

-- Browser clients never read or write this table directly. Authorized Admin APIs use
-- the server-only service client after independently checking trusted Admin capability.
revoke all on table public.admin_audit_log from anon, authenticated;
revoke update, delete, truncate, references, trigger on table public.admin_audit_log from service_role;
grant select, insert on table public.admin_audit_log to service_role;

comment on table public.admin_audit_log is 'Append-only Admin operational audit history. Access is mediated by authorized server APIs.';
comment on column public.admin_audit_log.before_state is 'Sanitized pre-mutation snapshot. Secrets and credentials must never be stored.';
comment on column public.admin_audit_log.after_state is 'Sanitized post-mutation snapshot. Secrets and credentials must never be stored.';
comment on column public.admin_audit_log.metadata is 'Sanitized operational context only; never credentials, tokens, cookies, or secrets.';
