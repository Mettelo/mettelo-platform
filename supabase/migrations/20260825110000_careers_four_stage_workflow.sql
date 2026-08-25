-- Careers: four primary recruitment stages with admin-controlled final decisions.
-- This migration is deliberately additive because the historic careers baseline is
-- not fully reconstructed in versioned migrations. It normalises legacy terminal
-- statuses only when the hosted careers table is present.

do $$
begin
  if to_regclass('public.career_applications') is not null then
    alter table public.career_applications
      add column if not exists final_outcome text not null default 'pending',
      add column if not exists final_outcome_updated_at timestamptz,
      add column if not exists final_outcome_updated_by uuid references auth.users(id) on delete set null,
      add column if not exists offer_status text not null default 'not_prepared',
      add column if not exists offer_sent_at timestamptz;

    update public.career_applications
    set final_outcome = case
        when status = 'hired' then 'hired'
        when status = 'rejected' then 'rejected'
        else coalesce(nullif(final_outcome,''),'pending')
      end,
      final_outcome_updated_at = case
        when status in ('hired','rejected') then coalesce(final_outcome_updated_at,updated_at,now())
        else final_outcome_updated_at
      end,
      offer_status = case
        when status in ('offer','hired') then case when offer_status='not_prepared' then 'ready' else offer_status end
        else offer_status
      end;

    -- Offer, hired and rejected are no longer primary pipeline stages. Existing
    -- records retain their outcome/offer facts while joining the fourth stage.
    update public.career_applications
    set status='interview'
    where status in ('offer','hired','rejected');

    if not exists (
      select 1 from pg_constraint
      where conname='career_applications_final_outcome_check'
        and conrelid='public.career_applications'::regclass
    ) then
      alter table public.career_applications
        add constraint career_applications_final_outcome_check
        check (final_outcome in ('pending','hired','rejected'));
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname='career_applications_offer_status_check'
        and conrelid='public.career_applications'::regclass
    ) then
      alter table public.career_applications
        add constraint career_applications_offer_status_check
        check (offer_status in ('not_prepared','ready','sent','send_failed'));
    end if;

    create index if not exists idx_career_applications_final_outcome
      on public.career_applications(final_outcome,updated_at desc);
    create index if not exists idx_career_applications_offer_status
      on public.career_applications(offer_status,updated_at desc);
  end if;
end $$;

-- Early-stage communication may remain automatic; final-stage communications
-- are always deliberate Admin sends.
update public.communication_templates
set send_mode='automatic',updated_at=now(),version=version+1
where template_key='career_shortlisted' and send_mode<>'automatic';

update public.communication_templates
set send_mode='manual',updated_at=now(),version=version+1
where template_key in ('career_interview','career_offer','career_hired','career_rejected')
  and send_mode<>'manual';

update public.communication_templates
set body_template='Congratulations — you have been successful in your application for {{role_title}}. We are pleased to confirm that we would like you to join Mettelo. Your formal offer and relevant documentation will be sent to you separately shortly.',
    description='Manual successful-candidate notification sent before the formal offer.',
    updated_at=now(),
    version=version+1
where template_key='career_hired'
  and body_template not like '%formal offer and relevant documentation%';

insert into public.communication_templates
  (template_key,journey,name,description,send_mode,subject_template,body_template,cta_label,cta_url_template,variables)
values
  ('career_custom','Careers','Career custom message','Manual candidate message from the Admin recruitment workspace.','manual','Update on your {{role_title}} application','We have an update regarding your application for {{role_title}}.','View Careers','/careers/applications','["recipient_name","role_title"]')
on conflict (template_key) do nothing;

insert into public.communication_template_versions
  (template_id,version,subject_template,body_template,cta_label,cta_url_template,send_mode,active,change_note)
select id,version,subject_template,body_template,cta_label,cta_url_template,send_mode,active,'Four-stage careers workflow'
from public.communication_templates t
where t.template_key in ('career_shortlisted','career_interview','career_offer','career_hired','career_rejected','career_custom')
  and not exists (
    select 1 from public.communication_template_versions v
    where v.template_id=t.id and v.version=t.version
  );