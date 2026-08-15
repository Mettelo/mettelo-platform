import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const foundation=read('supabase/migrations/20260815161000_phase_0_communication_foundation.sql');
const completion=read('supabase/migrations/20260815163000_phase_0_complete_template_groups.sql');
const templates=`${foundation}\n${completion}`;
const notifications=read('lib/notifications.ts');
const renderer=read('lib/communication-templates.ts');
const adminApi=read('app/api/admin/communications/templates/route.ts');
const adminUi=read('components/AdminCommunicationCentre.tsx');
const documentsApi=read('app/api/admin/communications/documents/route.ts');
const careerApply=read('app/api/careers/apply/route.ts');
const careerAdmin=read('app/api/admin/careers/applications/route.ts');
const forms=read('app/api/forms/route.ts');
const eventCron=read('app/api/cron/project-event-reminders/route.ts');
const savedCron=read('app/api/cron/saved-opportunity-reminders/route.ts');
const signin=read('app/signin/page.tsx');

const checks=[
 ['communication_templates table',foundation.includes('create table if not exists public.communication_templates')],
 ['template version history',foundation.includes('communication_template_versions')],
 ['communication records',foundation.includes('communication_records')],
 ['communication audit log',foundation.includes('communication_audit_log')],
 ['private career offer documents',foundation.includes("'career-offer-documents'")&&foundation.includes('public=false')],
 ['template tables use RLS',foundation.includes('alter table public.communication_templates enable row level security')],
 ['admin template API',adminApi.includes('communication_templates')&&adminApi.includes('communication_template_versions')],
 ['admin template publishing audit',adminApi.includes('communication_audit_log')],
 ['admin communication centre UI',adminUi.includes('COMMUNICATION CENTRE')&&adminUi.includes('Publish changes')],
 ['template preview and test-send UI',adminUi.includes('PREVIEW')&&adminUi.includes('Send test')],
 ['runtime template renderer',renderer.includes('renderCommunication')],
 ['email outbox delivery',notifications.includes('email_outbox')&&notifications.includes('deliverOutboxItem')],
 ['retry/dead-letter handling',notifications.includes("'dead_letter'")&&notifications.includes('backoffMinutes')],
 ['notification preferences',notifications.includes('notification_preferences')],
 ['career application receipt',careerApply.includes('career_submitted')||careerApply.includes('career_application_submitted')],
 ['career status communications',careerAdmin.includes("const STAGES=new Set(['in_review','shortlisted','interview','offer','hired','rejected'])")&&careerAdmin.includes('templateKey:`career_${status}`')&&careerAdmin.includes('template_key:`career_${status}`')],
 ['offer document API',documentsApi.includes('career-offer-documents')&&documentsApi.includes('application/pdf')],
 ['Account/Auth group complete',completion.includes("'account_welcome'")&&completion.includes("'auth_email_verification'")&&completion.includes("'auth_password_reset'")],
 ['Account/Auth product journeys exist',signin.includes("mode==='signup'")&&signin.includes('resetPasswordForEmail')&&signin.includes('/auth/callback')],
 ['Events group complete',completion.includes("'event_invitation'")&&completion.includes("'event_reminder'")&&completion.includes("'event_waitlist_offer'")],
 ['event reminder trigger exists',eventCron.includes("type:'event_reminder'")],
 ['General group complete',completion.includes("'project_interest_submitted'")&&completion.includes("'organisation_intake_received'")&&completion.includes("'saved_opportunity_closing'")],
 ['general project/partnership triggers exist',forms.includes("eventKey:'project_interest_submitted'")&&forms.includes("eventKey:'organisation_intake_received'")],
 ['saved opportunity trigger exists',savedCron.includes("eventKey:'saved_opportunity_closing'")],
 ['exactly 25 Phase 0 default template keys',new Set([...templates.matchAll(/\('([a-z0-9_]+)','(?:Careers|Project Applications|Project Delivery|Proof & Credentials|Project Architect|Account \/ Auth|Events|General)'/g)].map(m=>m[1])).size===25],
];

let passed=0;
checks.forEach(([name,ok],index)=>{console.log(`${ok?'PASS':'FAIL'} ${String(index+1).padStart(2,'0')}/25 ${name}`);if(ok)passed++;});
console.log(`\nPhase 0 communication audit: ${passed}/25 criteria passed.`);
if(passed!==25)process.exit(1);
