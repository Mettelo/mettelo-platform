-- Phase 0: journey communication foundation
-- Admin-managed templates, audit history, communication records and private offer documents.

create table if not exists public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  journey text not null,
  name text not null,
  description text,
  send_mode text not null default 'automatic' check (send_mode in ('automatic','admin_review','manual')),
  subject_template text not null,
  body_template text not null,
  cta_label text,
  cta_url_template text,
  variables jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  version integer not null default 1,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.communication_templates(id) on delete cascade,
  version integer not null,
  subject_template text not null,
  body_template text not null,
  cta_label text,
  cta_url_template text,
  send_mode text not null check (send_mode in ('automatic','admin_review','manual')),
  active boolean not null,
  changed_by uuid references auth.users(id) on delete set null,
  change_note text,
  created_at timestamptz not null default now(),
  unique(template_id, version)
);

create table if not exists public.communication_records (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email text not null,
  template_key text not null,
  journey text not null,
  related_type text,
  related_id uuid,
  subject text not null,
  body text not null,
  send_mode text not null check (send_mode in ('automatic','admin_review','manual')),
  status text not null default 'queued' check (status in ('draft','queued','sent','failed','cancelled')),
  outbox_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.communication_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.career_offer_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.career_applications(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  content_type text not null default 'application/pdf',
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_communication_records_recipient on public.communication_records(recipient_email, created_at desc);
create index if not exists idx_communication_records_related on public.communication_records(related_type, related_id, created_at desc);
create index if not exists idx_communication_audit_created on public.communication_audit_log(created_at desc);
create index if not exists idx_career_offer_documents_application on public.career_offer_documents(application_id, created_at desc);

alter table public.communication_templates enable row level security;
alter table public.communication_template_versions enable row level security;
alter table public.communication_records enable row level security;
alter table public.communication_audit_log enable row level security;
alter table public.career_offer_documents enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('career-offer-documents','career-offer-documents',false,10485760,array['application/pdf'])
on conflict (id) do update set public=false, file_size_limit=10485760, allowed_mime_types=array['application/pdf'];

insert into public.communication_templates
  (template_key,journey,name,description,send_mode,subject_template,body_template,cta_label,cta_url_template,variables)
values
  ('career_submitted','Careers','Career application received','Confirmation sent when an application enters the recruitment queue.','automatic','Application received: {{role_title}} at Mettelo','We have received your application for {{role_title}}. It is now in the recruitment queue. We will email you whenever the status changes.','Track your application','/member/applications#careers','["recipient_name","role_title"]'),
  ('career_in_review','Careers','Career application under review','Status update when recruitment review starts.','automatic','Your {{role_title}} application is now under review','Your application for {{role_title}} is now being reviewed by the Mettelo team. No action is required from you right now.','Track your application','/member/applications#careers','["recipient_name","role_title"]'),
  ('career_shortlisted','Careers','Career shortlist','Positive progression update.','admin_review','Congratulations: you have been shortlisted for {{role_title}}','Your application for {{role_title}} has been shortlisted. We would like to consider you for the next stage.','View your progress','/member/applications#careers','["recipient_name","role_title","stage_note"]'),
  ('career_interview','Careers','Career interview invitation','Interview-stage communication including interview details.','admin_review','Congratulations: interview stage for {{role_title}}','You have progressed to interview for {{role_title}}. {{interview_details}}','View interview details','/member/applications#careers','["recipient_name","role_title","interview_at","interview_details"]'),
  ('career_offer','Careers','Career offer','Offer-stage communication. Review before sending and optionally attach a PDF offer document.','admin_review','Congratulations: offer stage for {{role_title}}','You have progressed to the offer stage for {{role_title}}. {{offer_details}}','Review your offer','/member/applications#careers','["recipient_name","role_title","offer_details"]'),
  ('career_hired','Careers','Career hired','Welcome message after a candidate is marked hired.','admin_review','Welcome to Mettelo: {{role_title}}','Your application for {{role_title}} is complete and you have been marked as hired. Congratulations and welcome to Mettelo.','Open My Mettelo','/member','["recipient_name","role_title"]'),
  ('career_rejected','Careers','Career outcome','Recruitment closure when a candidate is not progressing.','admin_review','Application outcome: {{role_title}} at Mettelo','Thank you for the time and effort you invested in applying for {{role_title}}. We will not be progressing this application further on this occasion.','Explore Mettelo','/careers','["recipient_name","role_title","stage_note"]'),
  ('application_approved','Project Applications','Project application approved','Project acceptance and next-step guidance.','admin_review','Your Mettelo project application was approved','Your project application has been approved. Your place will now move into team formation or kickoff.','View project status','/member/applications','["recipient_name","project_title"]'),
  ('application_declined','Project Applications','Project application declined','Project application outcome.','admin_review','Update on your Mettelo project application','Your application was not selected for this team. You can continue exploring other Mettelo projects.','Find another project','/projects','["recipient_name","project_title"]'),
  ('project_kickoff','Project Delivery','Project kickoff','Sent when a project team becomes active.','automatic','Your Mettelo project is ready to start','Your project team is now active. Open the workspace to review responsibilities, milestones and your first tasks.','Open project workspace','/member/projects','["recipient_name","project_title"]'),
  ('task_assigned','Project Delivery','Task assigned','Sent when a project task is assigned.','automatic','You have a new Mettelo project task','A new task has been assigned to you. Open the workspace to review the requirement and due date.','Open task','/member/projects','["recipient_name","project_title"]'),
  ('project_completed','Proof & Credentials','Project completed','Completion milestone and Proof guidance.','automatic','Your Mettelo project is complete','Your project has been completed and recorded. Verified work can now strengthen your Mettelo Proof.','View your Proof','/member/proof','["recipient_name","project_title"]'),
  ('proof_status_changed','Proof & Credentials','Proof status changed','Evidence verification outcome.','automatic','Your Mettelo Proof has been updated','A contribution has completed review. Open My Mettelo to see the latest verification status.','View your Proof','/member/proof','["recipient_name","project_title"]'),
  ('project_architect_under_review','Project Architect','Architect application under review','Identity-review acknowledgement.','automatic','Your Project Architect application is under review','The Mettelo team is reviewing your evidence. Your account remains a Member while review is open.','View application','/member/project-architect','["recipient_name"]'),
  ('project_architect_additional_evidence_required','Project Architect','Architect evidence requested','Request for additional supporting evidence.','admin_review','More evidence is needed for your Project Architect application','Please review the Admin note, update your supporting evidence and resubmit when complete.','Update application','/member/project-architect','["recipient_name","stage_note"]'),
  ('project_architect_approved','Project Architect','Architect approved','Credential approval milestone.','admin_review','Your Mettelo Project Architect identity is approved','Your evidence has been approved and your Project Architect identity is now active.','View your credential','/member/project-architect','["recipient_name"]')
on conflict (template_key) do nothing;

insert into public.communication_template_versions
  (template_id,version,subject_template,body_template,cta_label,cta_url_template,send_mode,active,change_note)
select id,version,subject_template,body_template,cta_label,cta_url_template,send_mode,active,'Phase 0 default'
from public.communication_templates t
where not exists (
  select 1 from public.communication_template_versions v where v.template_id=t.id and v.version=t.version
);
