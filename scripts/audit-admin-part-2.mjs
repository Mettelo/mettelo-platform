import fs from 'node:fs';

const checks=[
 ['components/AdminSectionTabs.tsx',['adminTableShell','adminToolbar','adminDataTable','adminPagination','adminBulkBar','adminAge','@media(max-width:760px)']],
 ['app/admin/content/page.tsx',["redirect('/admin/content/news')"]],
 ['app/admin/content/news/page.tsx',['News & Insights','AdminNewsInsightsTable']],
 ['components/AdminNewsInsightsTable.tsx',['New article','Search by title or author','All types','All statuses','Newest','View live','adminDataTable','adminPagination','adminEditorDialog']],
 ['app/admin/content/structured/page.tsx',['Structured Content','AdminStructuredContentWorkspace']],
 ['components/AdminStructuredContentWorkspace.tsx',['Core details','Project setup','Problem brief','Skills & methods','Publishing & delivery','autosaved locally','Missing required fields','The public page uses the summary. This full brief is shown only inside the project workspace.','adminDataTable','structuredWizard']],
 ['app/admin/careers/page.tsx',["redirect('/admin/careers/roles')"]],
 ['app/admin/careers/roles/page.tsx',['Roles','AdminCareerRolesTable']],
 ['components/AdminCareerRolesTable.tsx',['Create role','Response target','Applicants','All statuses','All teams','adminDataTable','adminPagination']],
 ['app/admin/careers/applications/page.tsx',['Candidates','AdminCareerApplicationQueue']],
 ['components/AdminCareerApplicationQueue.tsx',['Search name or email','Applied from','Applied to','Recruitment action','Mark under review','Shortlist selected','Decline selected','Communication preview','AdminCareerInterviewComposer','AdminCareerOfferComposer','adminDataTable','adminBulkBar']],
 ['app/admin/careers/pipeline/page.tsx',['Pipeline overview','careerKanban','submitted','shortlisted','interview','offer','hired','rejected']],
 ['app/admin/intake/page.tsx',['AdminIntakeQueue']],
 ['components/AdminIntakeQueue.tsx',['Intake triage','Submission type','Triage status','Age / SLA','Mark reviewed','Mark duplicate','Convert to governed application','Assign to','adminAge','adminDataTable','adminBulkBar']],
 ['app/api/admin/intake/route.ts',['converted_application_id','project_application_events','legacy intake submission','assigned_to_user_id','duplicate_of_id']],
 ['supabase/migrations/20260816034500_admin_intake_triage.sql',['assigned_to_user_id','converted_application_id','duplicate_of_id']],
 ['supabase/migrations/20260816035200_admin_intake_statuses.sql',["'new','in_progress','resolved','duplicate'"]],
 ['app/admin/notifications/page.tsx',["redirect('/admin/notifications/overview')"]],
 ['app/admin/notifications/overview/page.tsx',['NEEDS ATTENTION','Delivery health','Templates','Delivery Queue','Event Catalogue']],
 ['app/admin/notifications/templates/page.tsx',['Templates','AdminCommunicationCentre']],
 ['components/AdminCommunicationCentre.tsx',['Search communication templates','templateGroup','selected','Unsaved changes','No unsaved changes','Publish changes','Send test','communicationMasterDetail']],
 ['app/admin/notifications/delivery/page.tsx',['Delivery Queue','AdminNotificationOps','payload']],
 ['components/AdminNotificationOps.tsx',['Search recipient or subject','All templates','Failed / dead-letter','Attempt history','offer document','deliveryFailedRow','adminDataTable']],
 ['app/admin/notifications/events/page.tsx',['Event Catalogue','AdminEventCatalogueTable']],
 ['components/AdminEventCatalogueTable.tsx',['Search event key or description','Event key','Channels','Priority','Description','adminDataTable']],
 ['components/AdminShell.tsx',['Content & Comms','Communications','/admin/content/news','/admin/notifications/overview','/admin/careers/roles','Structured Content','Delivery Queue','Event Catalogue']],
 ['components/AdminCareerOfferComposer.tsx',['MAX_DOCUMENTS=4','EMAIL DOCUMENTS','attachment_ids']],
 ['lib/email-attachments.ts',['MAX_EMAIL_ATTACHMENTS=4',"templateKey==='career_offer'",'offer_document_ids']],
];
let failed=false,passed=0;
for(const [file,needles] of checks){if(!fs.existsSync(file)){console.error(`FAIL missing ${file}`);failed=true;continue}const text=fs.readFileSync(file,'utf8');let ok=true;for(const needle of needles){if(!text.includes(needle)){console.error(`FAIL ${file}: missing ${needle}`);failed=true;ok=false}}if(ok){console.log(`PASS ${file}`);passed++}}
if(failed)process.exit(1);
console.log(`Admin Console Part 2 deterministic audit passed: ${passed}/${checks.length} files.`);
