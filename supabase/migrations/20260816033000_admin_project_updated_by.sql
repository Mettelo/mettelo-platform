alter table public.projects
  add column if not exists updated_by_user_id uuid references auth.users(id) on delete set null;
