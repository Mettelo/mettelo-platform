-- Canonical historical baseline for hosted project partner metadata that predates
-- the repository migration history. Existing hosted projects already have this
-- nullable column; blank environments need it for the public project-detail query.

alter table public.projects
  add column if not exists partner_name text;
