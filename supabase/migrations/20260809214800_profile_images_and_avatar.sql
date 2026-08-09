alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('profile-images','profile-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "profile images upload own" on storage.objects;
create policy "profile images upload own" on storage.objects for insert to authenticated
with check (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid()::text));

drop policy if exists "profile images update own" on storage.objects;
create policy "profile images update own" on storage.objects for update to authenticated
using (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid()::text))
with check (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid()::text));

drop policy if exists "profile images delete own" on storage.objects;
create policy "profile images delete own" on storage.objects for delete to authenticated
using (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid()::text));
