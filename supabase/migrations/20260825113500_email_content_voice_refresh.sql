-- Mettelo lifecycle email content refresh.
-- Improves the governed communication templates without changing send logic,
-- permissions, triggers, variables or delivery modes. Existing template history
-- is retained through a new version snapshot for every refreshed template.

with refreshed(template_key,subject_template,body_template,cta_label) as (
  values
    ('account_welcome',
      'Welcome to Mettelo, {{recipient_name}}',
      'Welcome to Mettelo, {{recipient_name}}. Your account is ready. Start by completing your profile so your skills, experience and interests can shape what you see across Mettelo. From there, you can explore practical projects, track applications and build credible evidence of the work you contribute.',
      'Open My Mettelo'),
    ('auth_email_verification',
      'Confirm your email to finish setting up Mettelo',
      'Confirm your email address to finish creating your Mettelo account. Once verified, you can sign in securely and continue setting up your profile and member experience. If you did not create this account, you can ignore this message.',
      'Verify email'),
    ('auth_password_reset',
      'Reset your Mettelo password',
      'We received a request to reset the password for your Mettelo account. Use the secure recovery link to choose a new password. If you did not request this change, you can ignore this message and your existing password will remain unchanged.',
      'Reset password'),

    ('event_invitation',
      'You are invited: {{project_title}}',
      'You have been invited to a Mettelo session for {{project_title}}. Open My Events to review the date, time, your role and the joining details before the session. If anything changes, the latest information will be shown there.',
      'View event details'),
    ('event_reminder',
      'Reminder: {{project_title}} is coming up',
      'A reminder that your Mettelo session for {{project_title}} is coming up. Check My Events before joining to confirm the latest time, access details and session context so you arrive prepared.',
      'View event details'),
    ('event_waitlist_offer',
      'A place is now available for your Mettelo event',
      'A place has become available for a Mettelo event you joined the waitlist for. Open My Events to review the session and accept the place before the stated deadline. If the offer expires, it may be released to the next person on the waitlist.',
      'Review your place'),

    ('project_interest_submitted',
      'We received your interest in {{project_title}}',
      'Thanks for registering your interest in {{project_title}}. Your request is now with the Mettelo team for review. You do not need to submit it again. You can follow its progress in My Mettelo, and we will contact you when there is a meaningful next step.',
      'Track your application'),
    ('application_approved',
      'You have been selected for {{project_title}}',
      'Good news — your application for {{project_title}} has been approved. Your place will now move into team formation or project kickoff. Open your application to see what happens next and make sure your availability and profile details are up to date.',
      'View project status'),
    ('application_declined',
      'Update on your application for {{project_title}}',
      'Thank you for applying to {{project_title}}. We are not able to place you on this project team on this occasion. This decision does not limit you from taking part in other Mettelo projects, so keep exploring opportunities that match the experience you want to build.',
      'Explore other projects'),
    ('project_kickoff',
      '{{project_title}} is ready to begin',
      'Your team for {{project_title}} is now active. Open the project workspace to understand the outcome you are working towards, review responsibilities and milestones, meet the team context and identify your first actions. Your contribution from this point can become part of the evidence you build on Mettelo.',
      'Open project workspace'),
    ('task_assigned',
      'New task assigned in {{project_title}}',
      'A new task has been assigned to you in {{project_title}}. Open the workspace to review what is required, the expected outcome and any due date or dependencies. If something is unclear or blocked, use the project workspace to raise it early rather than waiting until the deadline.',
      'Review your task'),
    ('project_completed',
      '{{project_title}} is complete — review your contribution',
      '{{project_title}} has now been completed. Your project record captures the work delivered and, where verified, the contribution you made can strengthen your Mettelo Proof. Review your Proof to make sure the evidence reflects the experience and outcomes you want to demonstrate.',
      'Review your Proof'),
    ('proof_status_changed',
      'Your Mettelo Proof has a new verification update',
      'The verification status of one of your contributions has changed. Open your Mettelo Proof to see what was reviewed, the current status and whether any further action is needed. Verified evidence is designed to help you show how you applied your skills, not simply list them.',
      'View your Proof'),

    ('project_architect_under_review',
      'Your Project Architect application is under review',
      'We have received your Project Architect application and the Mettelo team is reviewing the evidence you provided. Your account remains a Member while this review is open. You do not need to reapply; we will contact you if we need anything else or when a decision is ready.',
      'View your application'),
    ('project_architect_additional_evidence_required',
      'Action needed: more evidence for your Project Architect application',
      'We need some additional evidence before we can complete the review of your Project Architect application. Open your application to read the Admin note, update the requested evidence and resubmit when it is ready. Focus on evidence that clearly shows what you did, the responsibility you held and the outcome of your work.',
      'Update your application'),
    ('project_architect_approved',
      'Your Mettelo Project Architect identity is approved',
      'Your Project Architect evidence has been approved and your Project Architect identity is now active. This recognises that you have provided sufficient evidence for the role. Open your credential to review how it appears and the responsibilities available to you.',
      'View your credential'),

    ('saved_opportunity_closing',
      'Reminder: a saved opportunity is closing soon',
      'One of your saved opportunities is approaching its published closing date. If you are still interested, review the official listing now to confirm the deadline, eligibility and application requirements before you apply. Mettelo does not control external closing dates, so use the source listing as the final reference.',
      'View saved opportunities'),
    ('organisation_intake_received',
      'We received your enquiry for Mettelo',
      'Thank you for getting in touch with Mettelo. We have received your organisation or partnership enquiry and the team will review the information you shared. If there is a strong fit, we will follow up with the most relevant next step rather than asking you to repeat the information already submitted.',
      'Explore partnerships'),

    ('career_submitted',
      'Application received: {{role_title}} at Mettelo',
      'Thank you for applying for {{role_title}} at Mettelo. Your application has been received successfully. We will review the information and evidence you submitted and contact you when there is a meaningful update. You can also use the Careers application tracker to follow your progress.',
      'Track your application'),
    ('career_in_review',
      'Your {{role_title}} application is under review',
      'Your application for {{role_title}} is now being reviewed by the Mettelo team. We are considering the experience, motivation and evidence you shared against what the role needs. There is nothing you need to do right now; we will contact you when the review produces a next step.',
      'Track your application'),
    ('career_shortlisted',
      'You have been shortlisted for {{role_title}}',
      'Good news — your application for {{role_title}} has progressed beyond the initial review and you have been shortlisted. This means we would like to consider you further. We will contact you separately when the next step, such as an interview, is confirmed.',
      'View your progress'),
    ('career_interview',
      'Interview invitation: {{role_title}} at Mettelo',
      'We would like to invite you to interview for {{role_title}}. {{interview_details}} Please review the date, time, timezone and joining details carefully. The conversation is an opportunity for us to understand your experience in more depth and for you to learn more about the role and Mettelo.',
      'View interview details'),
    ('career_hired',
      'You have been successful: {{role_title}} at Mettelo',
      'Congratulations — you have been successful in your application for {{role_title}}, and we would like you to join Mettelo. This message confirms the recruitment decision only. Your formal offer, including the relevant terms and documentation, will be sent to you separately for review.',
      'View your application'),
    ('career_offer',
      'Your formal offer for {{role_title}} at Mettelo',
      'We are pleased to send you the formal offer for {{role_title}} at Mettelo. {{offer_details}} Please review the offer details and any attached documents carefully, including the start date, terms and acceptance deadline. If anything is unclear, reply before accepting so we can address your questions.',
      'Review your offer'),
    ('career_rejected',
      'Update on your application for {{role_title}}',
      'Thank you for the time and thought you put into your application for {{role_title}}. After completing our review, we will not be progressing your application further on this occasion. We appreciate your interest in Mettelo, and you are welcome to apply for future roles that are a strong match for your experience and goals.',
      'Explore other roles'),
    ('career_custom',
      'Update on your {{role_title}} application',
      'We have an update about your application for {{role_title}}. Please review the message below carefully, and reply if the update asks you for information or if anything is unclear.',
      'View your application'),

    ('project_application_terms',
      'Project Participation Terms',
      'Please review the current Mettelo Project Participation Terms before submitting your project application. The terms explain the expectations, responsibilities and participation conditions that apply if you join a project. Submit your application only after you are comfortable with them.',
      null)
)
update public.communication_templates t
set subject_template=r.subject_template,
    body_template=r.body_template,
    cta_label=r.cta_label,
    version=t.version+1,
    updated_at=now()
from refreshed r
where t.template_key=r.template_key
  and (t.subject_template is distinct from r.subject_template
    or t.body_template is distinct from r.body_template
    or t.cta_label is distinct from r.cta_label);

insert into public.communication_template_versions
  (template_id,version,subject_template,body_template,cta_label,cta_url_template,send_mode,active,change_note)
select t.id,t.version,t.subject_template,t.body_template,t.cta_label,t.cta_url_template,t.send_mode,t.active,
       'Lifecycle email content and brand voice refresh'
from public.communication_templates t
where t.template_key in (
  'account_welcome','auth_email_verification','auth_password_reset',
  'event_invitation','event_reminder','event_waitlist_offer',
  'project_interest_submitted','application_approved','application_declined','project_kickoff','task_assigned','project_completed','proof_status_changed',
  'project_architect_under_review','project_architect_additional_evidence_required','project_architect_approved',
  'saved_opportunity_closing','organisation_intake_received',
  'career_submitted','career_in_review','career_shortlisted','career_interview','career_hired','career_offer','career_rejected','career_custom',
  'project_application_terms'
)
and not exists (
  select 1 from public.communication_template_versions v
  where v.template_id=t.id and v.version=t.version
);
