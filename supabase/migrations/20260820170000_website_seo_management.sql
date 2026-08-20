-- Admin Website Phase 5: governed site-wide and page-level SEO configuration.
-- Public readers see published SEO only. Draft metadata remains service-role only.

create table if not exists public.website_seo_public (
  scope text primary key,
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null
);

create table if not exists public.website_seo_drafts (
  scope text primary key,
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.website_seo_public enable row level security;
alter table public.website_seo_drafts enable row level security;

drop policy if exists "published website seo readable" on public.website_seo_public;
create policy "published website seo readable" on public.website_seo_public
for select to anon, authenticated using (true);

revoke all on public.website_seo_drafts from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.website_seo_public from anon, authenticated;
grant select on public.website_seo_public to anon, authenticated;

grant select, insert, update on public.website_seo_public to service_role;
grant select, insert, update on public.website_seo_drafts to service_role;
revoke delete, truncate, references, trigger on public.website_seo_public from service_role;
revoke delete, truncate, references, trigger on public.website_seo_drafts from service_role;

insert into public.website_seo_public(scope,payload) values
('global', $json${"site_name":"Mettelo","title_template":"%s | Mettelo","default_title":"Mettelo — Build capability. Prove it. Get discovered.","default_description":"Mettelo is where Data & AI professionals connect, solve real problems, build credible proof and create opportunity through contribution.","default_og_title":"Mettelo — Build capability. Prove it. Get discovered.","default_og_description":"Real problems. Real teams. Real proof. Mettelo connects community, meaningful work, credible evidence and opportunity.","default_og_image":"/og-image.svg","twitter_title":"Mettelo — Build capability. Prove it. Get discovered.","twitter_description":"Real problems. Real teams. Real proof.","twitter_image":"/og-image.svg","google_site_verification":"","bing_site_verification":"","organisation_name":"Mettelo","organisation_description":"Professional capability infrastructure for Data & AI.","organisation_logo_url":"/mettelo-logo-dark.svg"}$json$::jsonb),
('home', $json${"title":"Mettelo — Build capability. Prove it. Get discovered.","description":"Mettelo is where Data & AI professionals connect, solve real problems, build credible proof and create opportunity through contribution.","canonical":"/","og_title":"Mettelo — Build capability. Prove it. Get discovered.","og_description":"Real problems. Real teams. Real proof. Mettelo connects community, meaningful work, credible evidence and opportunity.","og_image":"/og-image.svg","index":true,"follow":true}$json$::jsonb),
('about', $json${"title":"About Mettelo","description":"Mettelo is a technology-led organisation building professional capability infrastructure for Data & AI across Africa and beyond.","canonical":"/about","og_title":"About Mettelo","og_description":"Professional capability infrastructure for Data & AI across Africa and beyond.","og_image":"/og-image.svg","index":true,"follow":true}$json$::jsonb),
('contact', $json${"title":"Contact us","description":"Contact Mettelo about membership, projects, events, media, support or general enquiries.","canonical":"/contact","og_title":"Contact Mettelo","og_description":"Contact Mettelo about membership, projects, events, media, support or general enquiries.","og_image":"/og-image.svg","index":true,"follow":true}$json$::jsonb)
on conflict (scope) do nothing;

insert into public.website_seo_drafts(scope,payload)
select scope,payload from public.website_seo_public
on conflict (scope) do nothing;
