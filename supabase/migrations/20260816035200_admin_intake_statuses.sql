alter table public.form_submissions drop constraint if exists form_submissions_status_check;
update public.form_submissions set status='in_progress' where status='in_review';
update public.form_submissions set status='resolved', resolved_at=coalesce(resolved_at,now()) where status='closed';
alter table public.form_submissions add constraint form_submissions_status_check check (status in ('new','in_progress','resolved','duplicate'));
