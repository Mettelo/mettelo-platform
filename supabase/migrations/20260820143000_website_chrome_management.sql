-- Admin Website Phase 2: governed public chrome configuration.
-- Drafts remain service-role only. Public readers can only see published payloads.

create table if not exists public.website_chrome_public (
  scope text primary key check (scope in ('navigation','footer','branding')),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null
);

create table if not exists public.website_chrome_drafts (
  scope text primary key check (scope in ('navigation','footer','branding')),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.website_chrome_public enable row level security;
alter table public.website_chrome_drafts enable row level security;

drop policy if exists "public website chrome readable" on public.website_chrome_public;
create policy "public website chrome readable" on public.website_chrome_public
for select to anon, authenticated using (true);

-- Public clients can read published configuration only. Drafts and all public-table
-- mutations stay outside anon/authenticated reach even if default grants change later.
revoke all on public.website_chrome_drafts from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.website_chrome_public from anon, authenticated;
grant select on public.website_chrome_public to anon, authenticated;

-- Admin APIs use the server-side service role and only require read/write, never delete.
grant select, insert, update on public.website_chrome_public to service_role;
grant select, insert, update on public.website_chrome_drafts to service_role;
revoke delete, truncate, references, trigger on public.website_chrome_public from service_role;
revoke delete, truncate, references, trigger on public.website_chrome_drafts from service_role;

insert into public.website_chrome_public(scope,payload) values
('navigation', $json${"items":[{"id":"projects","label":"Projects","href":"/projects","placement":"primary","desktop_visible":true,"mobile_visible":true,"enabled":true,"sort_order":10},{"id":"opportunities","label":"Opportunities","href":"/opportunities","placement":"primary","desktop_visible":true,"mobile_visible":true,"enabled":true,"sort_order":20},{"id":"proof","label":"Proof","href":"/showcase","placement":"primary","desktop_visible":true,"mobile_visible":true,"enabled":true,"sort_order":30},{"id":"events","label":"Events","href":"/events","placement":"primary","desktop_visible":true,"mobile_visible":true,"enabled":true,"sort_order":40},{"id":"organisations","label":"For organisations","href":"/organisations","placement":"secondary","desktop_visible":true,"mobile_visible":true,"enabled":true,"sort_order":50},{"id":"about","label":"About Mettelo","href":"/about","placement":"secondary","desktop_visible":true,"mobile_visible":true,"enabled":true,"sort_order":60},{"id":"community","label":"Community","href":"/community","placement":"explore","desktop_visible":true,"mobile_visible":true,"enabled":true,"sort_order":70},{"id":"insights","label":"Insights","href":"/blog","placement":"explore","desktop_visible":true,"mobile_visible":true,"enabled":true,"sort_order":80},{"id":"spotlight","label":"Spotlight","href":"/spotlight","placement":"explore","desktop_visible":true,"mobile_visible":true,"enabled":true,"sort_order":90},{"id":"careers","label":"Careers","href":"/careers","placement":"explore","desktop_visible":true,"mobile_visible":true,"enabled":true,"sort_order":100},{"id":"faq","label":"FAQ","href":"/faq","placement":"explore","desktop_visible":true,"mobile_visible":true,"enabled":true,"sort_order":110},{"id":"contact","label":"Contact","href":"/contact","placement":"explore","desktop_visible":false,"mobile_visible":true,"enabled":true,"sort_order":120},{"id":"feedback","label":"Feedback","href":"/feedback","placement":"explore","desktop_visible":false,"mobile_visible":true,"enabled":true,"sort_order":130}]}$json$::jsonb),
('footer', $json${"description":"Professional capability infrastructure for Data & AI — connecting community, real work, proof and opportunity.","tagline":"Built for What’s Next.","sections":[{"id":"explore","title":"Explore","enabled":true,"sort_order":10,"links":[{"id":"projects","label":"Projects","href":"/projects","enabled":true,"sort_order":10},{"id":"opportunities","label":"Opportunities","href":"/opportunities","enabled":true,"sort_order":20},{"id":"proof","label":"Proof","href":"/showcase","enabled":true,"sort_order":30},{"id":"events","label":"Events","href":"/events","enabled":true,"sort_order":40},{"id":"community","label":"Community","href":"/community","enabled":true,"sort_order":50},{"id":"people","label":"People","href":"/people","enabled":true,"sort_order":60},{"id":"insights","label":"Insights","href":"/blog","enabled":true,"sort_order":70},{"id":"spotlight","label":"Spotlight","href":"/spotlight","enabled":true,"sort_order":80}]},{"id":"organisations","title":"For organisations","enabled":true,"sort_order":20,"links":[{"id":"organisation-overview","label":"Organisation overview","href":"/organisations","enabled":true,"sort_order":10},{"id":"post-opportunity","label":"Post an opportunity","href":"/partnership#partnership-form","enabled":true,"sort_order":20},{"id":"bring-project","label":"Bring a project","href":"/partnership#partnership-form","enabled":true,"sort_order":30},{"id":"partner","label":"Partner with Mettelo","href":"/partnership","enabled":true,"sort_order":40},{"id":"careers","label":"Careers","href":"/careers","enabled":true,"sort_order":50}]},{"id":"support","title":"Company & Support","enabled":true,"sort_order":30,"links":[{"id":"about","label":"About Mettelo","href":"/about","enabled":true,"sort_order":10},{"id":"faq","label":"FAQ","href":"/faq","enabled":true,"sort_order":20},{"id":"contact","label":"Contact us","href":"/contact","enabled":true,"sort_order":30},{"id":"feedback","label":"Give feedback","href":"/feedback","enabled":true,"sort_order":40},{"id":"guidelines","label":"Community Guidelines","href":"/community-guidelines","enabled":true,"sort_order":50},{"id":"privacy","label":"Privacy","href":"/privacy","enabled":true,"sort_order":60},{"id":"terms","label":"Terms","href":"/terms","enabled":true,"sort_order":70}]}]}$json$::jsonb),
('branding', $json${"site_name":"Mettelo","logo_dark_url":"/mettelo-logo-dark.svg","logo_light_url":"/mettelo-logo-light.svg"}$json$::jsonb)
on conflict (scope) do nothing;

insert into public.website_chrome_drafts(scope,payload)
select scope,payload from public.website_chrome_public
on conflict (scope) do nothing;
