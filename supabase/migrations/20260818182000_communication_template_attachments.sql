-- Feature 3: reusable governed attachments for communication templates and project terms.

alter table public.communication_templates
  add column if not exists allow_attachments boolean not null default false;

create table if not exists public.communication_template_attachments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.communication_templates(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  content_type text not null check (content_type in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communication_template_attachments_template_idx
on public.communication_template_attachments(template_id, active, sort_order);

alter table public.communication_template_attachments enable row level security;

drop policy if exists "admins read template attachments" on public.communication_template_attachments;
create policy "admins read template attachments" on public.communication_template_attachments
for select to authenticated using (coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('communication-template-documents','communication-template-documents',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

update public.communication_templates set allow_attachments=true
where template_key in ('career_offer','career_interview','career_hired','project_completed');

insert into public.communication_templates(template_key,journey,name,description,send_mode,subject_template,body_template,cta_label,cta_url_template,variables,active,version,allow_attachments)
values('project_application_terms','Projects','Project application terms','Governed participation terms referenced by every future project application.','manual','Project Participation Terms','Read the current Project Participation Terms before submitting a project application.',null,null,array[]::text[],true,1,true)
on conflict (template_key) do update set allow_attachments=true,active=true;

alter table public.project_applications
  add column if not exists terms_attachment_id uuid references public.communication_template_attachments(id) on delete restrict,
  add column if not exists terms_accepted_at timestamptz;
