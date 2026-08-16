-- Phase 7 — Opportunity discovery, saved roles, events and search

alter table public.saved_opportunities
  add column if not exists reminders_enabled boolean not null default true;

comment on column public.saved_opportunities.reminders_enabled is
  'Member-controlled deadline reminder preference for this saved opportunity.';
