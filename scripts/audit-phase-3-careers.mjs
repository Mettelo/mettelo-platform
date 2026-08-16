import fs from 'node:fs';

const checks=[
  ['supabase/migrations/20260816013000_phase3_careers_recruitment.sql',['eligibility text','expected_response_days','interview_timezone','offer_acceptance_deadline','career_onboarding_items','career_withdrawn','members can view own career onboarding','admins manage career onboarding']],
  ['supabase/migrations/20260816014500_phase3_career_role_defaults.sql',['expected_response_days set default 14','No additional eligibility restrictions are specified','Mettelo then reviews your application']],
  ['supabase/migrations/20260816015000_phase3_career_rls_performance.sql',['user_id = (select auth.uid())','career onboarding readable by owner or admin','admins insert career onboarding','admins update career onboarding','admins delete career onboarding']],
  ['app/careers/[slug]/page.tsx',['Eligibility','Response target','What happens after you apply','application_process','application_questions','initialValues']],
  ['components/CareerApplicationForm.tsx',['localStorage','Draft saved automatically','Review application','Confirm & submit application','XMLHttpRequest','uploadProgress','question_']],
  ['app/api/careers/apply/route.ts',['application_questions','answers','career_submitted','This role is not accepting applications','An application for this role already exists','career_application_submitted']],
  ['app/api/careers/applications/route.ts',['WITHDRAWABLE','career_withdrawn','Candidate withdrew application','communication_records','communication_audit_log']],
  ['components/CareerApplicationTracker.tsx',['Recruitment progress','What this means','What happens next','Do I need to do something?','Congratulations — you have an offer','Your interview details','Get ready for your first day','Withdraw application','View application history']],
  ['app/member/applications/page.tsx',['career_application_events','career_onboarding_items','career_offer_documents','CareerApplicationTracker','Your recruitment journey']],
  ['components/AdminCareerRoleManager.tsx',['Eligibility','Expected response','Application process','Application questions','expected_response_days','application_questions']],
  ['app/api/admin/careers/roles/route.ts',['Complete the career brief before publishing','expected response time','application process','eligibility']],
  ['app/admin/careers/page.tsx',['communication_records','career_onboarding_items','profiles','application_questions','AdminCareerApplicationQueue']],
  ['components/AdminCareerApplicationQueue.tsx',['Linked Mettelo profile','Role-specific answers','Internal note','Communication history','AdminCareerInterviewComposer','AdminCareerOfferComposer','AdminCareerOnboarding']],
  ['components/AdminCareerInterviewComposer.tsx',['showModal','INTERVIEW COMPOSER','Date & time','Timezone','Format','Meeting URL / joining link','Interviewer','Candidate instructions','EMAIL PREVIEW','Schedule & send']],
  ['components/AdminCareerOfferComposer.tsx',['showModal','OFFER COMPOSER','Salary / rate','Start date','Employment type','Manager','Working arrangement','Acceptance deadline','Conditions','Personal message','EMAIL DOCUMENTS','multiple','up to 4 private PDF documents','Included in email','Remove','attachment_ids','real email attachments','EMAIL PREVIEW']],
  ['app/api/admin/careers/applications/route.ts',['TRANSITIONS','candidateEventNote','Review and confirm','interview_timezone','interview_format','interview_url','offer_salary_rate','offer_start_date','offer_acceptance_deadline','career_onboarding_items','career_stage_transition','communication_records','MAX_EMAIL_ATTACHMENTS','status!==\'offer\'&&attachmentIds.length','offer_document_ids']],
  ['app/api/admin/careers/onboarding/route.ts',['career_onboarding_items','career_onboarding_updated','Admin access required']],
  ['app/api/admin/communications/documents/route.ts',['application/pdf','10*1024*1024','career-offer-documents','MAX_EMAIL_ATTACHMENTS','offer_document_attached','export async function DELETE','offer_document_removed']],
  ['app/api/careers/offer-documents/[id]/route.ts',['application?.user_id!==user.id','createSignedUrl','60']],
  ['lib/email-attachments.ts',['MAX_EMAIL_ATTACHMENTS=4','MAX_EMAIL_ATTACHMENT_RAW_BYTES=28*1024*1024','templateKey===\'career_offer\'','career_offer_documents','career-offer-documents','toString(\'base64\')']],
  ['lib/notifications.ts',['resolveEmailAttachments','attachments:attachments.length?attachments:undefined']],
  ['lib/career-notifications.ts',['careerMessageForDb','resolveCommunication','sendCareerEmail','notifyUser']],
  ['app/submitted/page.tsx',['career_application','APPLICATION RECEIVED','WHAT HAPPENS NEXT','Sign in to track']],
  ['package.json',['"audit:phase3": "node scripts/audit-phase-3-careers.mjs"']],
  ['.github/workflows/ci.yml',['npm run audit:phase0','npm run audit:phase1','npm run audit:phase2','npm run audit:phase3']],
];
let failed=false;let passed=0;
for(const [file,needles] of checks){
  if(!fs.existsSync(file)){console.error(`FAIL missing ${file}`);failed=true;continue;}
  const text=fs.readFileSync(file,'utf8');let fileOk=true;
  for(const needle of needles){if(!text.includes(needle)){console.error(`FAIL ${file}: missing ${needle}`);failed=true;fileOk=false;}}
  if(fileOk){passed+=1;console.log(`PASS ${file}`);}
}
if(failed)process.exit(1);
console.log(`Phase 3 careers deterministic audit passed: ${passed}/${checks.length} files.`);
