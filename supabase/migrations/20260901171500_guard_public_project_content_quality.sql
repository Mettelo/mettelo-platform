-- Keep malformed or placeholder project content out of public/member discovery.
-- Draft/private work remains editable in Admin; only public/member visibility is gated.

create or replace function public.project_summary_is_publishable(value text)
returns boolean
language sql
immutable
as $$
  select
    char_length(trim(coalesce(value,''))) >= 40
    and coalesce(array_length(regexp_split_to_array(trim(coalesce(value,'')), E'\\s+'),1),0) >= 6
    and coalesce((
      select max(char_length(token))
      from unnest(regexp_split_to_array(trim(coalesce(value,'')), E'\\s+')) token
    ),0) <= 50;
$$;

-- Existing malformed public/member records are quarantined rather than rewritten.
-- Their Admin-entered content remains intact for correction and deliberate republication.
update public.projects
set visibility='private', applications_open=false, updated_at=now()
where visibility in ('public','members')
  and not public.project_summary_is_publishable(summary);

do $$ begin
  alter table public.projects
    add constraint projects_public_summary_publishable_check
    check (
      visibility not in ('public','members')
      or public.project_summary_is_publishable(summary)
    ) not valid;
exception when duplicate_object then null; end $$;

comment on function public.project_summary_is_publishable(text) is
  'Deterministic minimum content-quality gate for public/member project summaries. Private drafts are not restricted.';
