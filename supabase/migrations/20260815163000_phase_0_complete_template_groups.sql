-- Phase 0: complete the remaining communication template groups.
-- Adds Account/Auth, Events and General defaults without changing later-phase behaviour.

insert into public.communication_templates
  (template_key,journey,name,description,send_mode,subject_template,body_template,cta_label,cta_url_template,variables)
values
  ('account_welcome','Account / Auth','Account welcome','Welcome copy for a newly verified Mettelo account.','automatic','Welcome to Mettelo, {{recipient_name}}','Your Mettelo account is ready. Use My Mettelo to complete your profile, track applications and build verified Proof.','Open My Mettelo','/member','["recipient_name"]'),
  ('auth_email_verification','Account / Auth','Email verification','Reference copy for the account verification journey managed by the authentication provider.','automatic','Verify your Mettelo email address','Confirm your email address to finish creating your Mettelo account and access My Mettelo.','Verify email','/signin','["recipient_name"]'),
  ('auth_password_reset','Account / Auth','Password reset','Reference copy for the password recovery journey managed by the authentication provider.','automatic','Reset your Mettelo password','Use the secure recovery link from Mettelo to choose a new password. If you did not request a reset, you can ignore the email.','Reset password','/signin','["recipient_name"]'),
  ('event_invitation','Events','Project event invitation','Sent to named presenters and required attendees when a governed project event is scheduled.','automatic','You are invited: {{project_title}} event','You have been added to a Mettelo project event. Open My Events to review the session details, your role and start time.','View event','/member/events','["recipient_name","project_title"]'),
  ('event_reminder','Events','Project event reminder','Sent before a scheduled governed project event.','automatic','Reminder: your Mettelo project event is coming up','Your Mettelo project event is coming up. Open My Events for the latest time, access details and event context.','View My Events','/member/events','["recipient_name","project_title"]'),
  ('event_waitlist_offer','Events','Event waitlist place available','Sent when a place becomes available to the next person on a learning-session waitlist.','automatic','A place is available for your Mettelo event','A place is now available. Open My Events and accept the offer within the stated window before it expires.','Review event offer','/member/events','["recipient_name","project_title"]'),
  ('project_interest_submitted','General','Project interest received','Confirmation after a member registers interest in a pilot project.','automatic','Project interest received — {{project_title}}','We received your interest in {{project_title}}. Track the request in My Mettelo while the team reviews it.','Track your application','/member/applications','["recipient_name","project_title"]'),
  ('organisation_intake_received','General','Partnership enquiry received','Confirmation after an organisation or partner submits an enquiry.','automatic','We received your Mettelo partnership enquiry','Thank you for contacting Mettelo. Your organisation or partnership enquiry has been received and will be reviewed by the team.','Explore partnerships','/partnership','[]'),
  ('saved_opportunity_closing','General','Saved opportunity closing soon','Reminder for a saved external opportunity approaching its published closing date.','automatic','A saved opportunity is closing soon','One of your saved opportunities is approaching its published closing date. Check the official listing before applying.','View saved opportunities','/member/saved-opportunities','["recipient_name"]')
on conflict (template_key) do nothing;

insert into public.communication_template_versions
  (template_id,version,subject_template,body_template,cta_label,cta_url_template,send_mode,active,change_note)
select id,version,subject_template,body_template,cta_label,cta_url_template,send_mode,active,'Phase 0 remaining template groups'
from public.communication_templates t
where t.journey in ('Account / Auth','Events','General')
  and not exists (
    select 1 from public.communication_template_versions v
    where v.template_id=t.id and v.version=t.version
  );
