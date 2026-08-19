-- Extend governed platform settings with public brand-logo URLs.
-- Existing bundled SVG assets remain the runtime fallback until Admin explicitly configures a replacement.

insert into public.platform_settings(setting_key,setting_group,label,value,value_type,public_read,sort_order) values
('brand_logo_dark_url','branding','Header / light-background logo',null,'url',true,10),
('brand_logo_light_url','branding','Footer / dark-background logo',null,'url',true,20)
on conflict (setting_key) do nothing;
