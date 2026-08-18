-- Feature 4: platform-wide Admin configuration.

create table if not exists public.platform_settings (
  setting_key text primary key,
  setting_group text not null default 'general',
  label text not null,
  value text,
  value_type text not null default 'text' check (value_type in ('text','email','url')),
  public_read boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.platform_settings enable row level security;

drop policy if exists "public platform settings readable" on public.platform_settings;
create policy "public platform settings readable" on public.platform_settings
for select to anon, authenticated using (public_read or coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin');

insert into public.platform_settings(setting_key,setting_group,label,value,value_type,public_read,sort_order) values
('social_whatsapp','social','WhatsApp','https://chat.whatsapp.com/LrxCOfDBCDUJhRqXFRD2cY','url',true,10),
('social_discord','social','Discord','https://discord.gg/Nx6qCbEY','url',true,20),
('social_community_hub','social','Community Hub','https://gamms.app/community/mettelo','url',true,30),
('social_x_community','social','X Community','https://x.com/i/communities/2015608740804718665','url',true,40),
('social_x','social','X','https://www.twitter.com/officialmettelo','url',true,50),
('social_linkedin','social','LinkedIn','https://www.linkedin.com/mettelo','url',true,60),
('social_facebook','social','Facebook','https://www.facebook.com/officialmettelo','url',true,70),
('social_instagram','social','Instagram',null,'url',true,80),
('social_youtube','social','YouTube',null,'url',true,90),
('contact_email','contact','General contact email',null,'email',true,100)
on conflict (setting_key) do nothing;
