-- Admin Website Phase 6: governed public website media library.
-- Binary objects are public-readable for website delivery, while all writes are service-role only.
-- SVG is intentionally excluded from the initial allowlist because active SVG content can contain executable behavior.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('website-media','website-media',true,8388608,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.website_media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  decorative boolean not null default false,
  original_file_name text not null check (char_length(original_file_name) between 1 and 240),
  storage_path text not null unique check (char_length(storage_path) between 1 and 500),
  public_url text not null unique check (char_length(public_url) between 1 and 1000),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/avif')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 8388608),
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint website_media_alt_text_check check (
    (decorative=true and alt_text='') or
    (decorative=false and char_length(btrim(alt_text)) between 1 and 300)
  )
);

create index if not exists website_media_assets_status_created_idx
on public.website_media_assets(status,created_at desc);
create index if not exists website_media_assets_mime_created_idx
on public.website_media_assets(mime_type,created_at desc);

alter table public.website_media_assets enable row level security;
revoke all on public.website_media_assets from anon, authenticated;
grant select, insert, update on public.website_media_assets to service_role;
revoke delete, truncate, references, trigger on public.website_media_assets from service_role;

-- Do not create anon/authenticated INSERT/UPDATE/DELETE policies for storage.objects.
-- The public bucket permits object delivery, while Admin writes use the server-side service role.
