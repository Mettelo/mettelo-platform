import {createClient} from '@supabase/supabase-js';

function required(name){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required.`);return value;}

const url=required('E2E_SUPABASE_URL');
if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Local E2E fixture setup refuses non-local Supabase hosts.');
const db=createClient(url,required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});

const accounts=[
  {kind:'member',email:required('E2E_MEMBER_EMAIL'),password:required('E2E_MEMBER_PASSWORD'),app_metadata:{}},
  {kind:'architect',email:required('E2E_ARCHITECT_EMAIL'),password:required('E2E_ARCHITECT_PASSWORD'),app_metadata:{}},
  {kind:'admin',email:required('E2E_ADMIN_EMAIL'),password:required('E2E_ADMIN_PASSWORD'),app_metadata:{role:'admin'}}
];

async function ensureUser(account){
  const {data:list,error:listError}=await db.auth.admin.listUsers({page:1,perPage:1000});
  if(listError)throw listError;
  let user=list.users.find(item=>item.email?.toLowerCase()===account.email.toLowerCase());
  if(!user){
    const {data,error}=await db.auth.admin.createUser({email:account.email,password:account.password,email_confirm:true,app_metadata:account.app_metadata,user_metadata:{full_name:`E2E ${account.kind}`}});
    if(error)throw error;
    user=data.user;
  }else{
    const {data,error}=await db.auth.admin.updateUserById(user.id,{password:account.password,email_confirm:true,app_metadata:account.app_metadata});
    if(error)throw error;
    user=data.user;
  }
  return user;
}

const users={};
for(const account of accounts)users[account.kind]=await ensureUser(account);

const {error:architectIdentityError}=await db.from('account_identities').upsert({user_id:users.architect.id,account_type:'project_architect',show_project_architect_designation:true},{onConflict:'user_id'});
if(architectIdentityError)throw architectIdentityError;

const {error:memberIdentityError}=await db.from('account_identities').upsert({user_id:users.member.id,account_type:'member',show_project_architect_designation:false},{onConflict:'user_id'});
if(memberIdentityError)throw memberIdentityError;

const projectId='00000000-0000-4000-8000-00000000e2e1';
const team1RunId='00000000-0000-4000-8000-00000000e211';
const team2RunId='00000000-0000-4000-8000-00000000e212';
const projectRoleId='00000000-0000-4000-8000-00000000e2a1';

// Seed the fixture through the same safe lifecycle ordering as production:
// private Draft first, then sufficient role capacity, then open public intake.
const {error:projectDraftError}=await db.from('projects').upsert({
  id:projectId,
  slug:'e2e-local-release-project',
  title:'E2E Local Release Project',
  summary:'Disposable local project used only by the GitHub Actions release gate.',
  problem_statement:'Verify browser to API to database submission behavior without hosted staging infrastructure.',
  status:'draft',
  visibility:'private',
  project_type:'open',
  applications_open:false,
  team_size_threshold:5,
  project_type_review_required:false,
  location:'CI',
  weekly_commitment:'E2E only'
},{onConflict:'id'});
if(projectDraftError)throw projectDraftError;

const {error:roleError}=await db.from('project_roles').upsert({id:projectRoleId,project_id:projectId,title:'Data Analyst',discipline:'Data & AI',description:'Deterministic E2E project role.',skills:[],openings:5},{onConflict:'id'});
if(roleError)throw roleError;

const {error:projectOpenError}=await db.from('projects').update({status:'active',visibility:'public',applications_open:true}).eq('id',projectId);
if(projectOpenError)throw projectOpenError;

const {error:runError}=await db.from('project_runs').upsert([
  {id:team1RunId,project_id:projectId,run_number:1,status:'active',team_size_threshold:5,required_team_size:5,has_started:true,started_at:new Date().toISOString()},
  {id:team2RunId,project_id:projectId,run_number:2,status:'forming',team_size_threshold:5,required_team_size:5,has_started:false}
],{onConflict:'id'});
if(runError)throw runError;

await db.from('project_members').delete().eq('project_id',projectId).eq('user_id',users.member.id);
const {error:membershipError}=await db.from('project_members').insert({project_id:projectId,project_run_id:team1RunId,project_role_id:projectRoleId,user_id:users.member.id,team_role:'contributor',membership_status:'active'});
if(membershipError)throw membershipError;

const [{data:verifiedProject,error:verifiedProjectError},{data:verifiedMembership,error:verifiedMembershipError},{data:verifiedRun,error:verifiedRunError}]=await Promise.all([
  db.from('projects').select('id,title,summary,status,project_type,github_url,weekly_commitment,presentation_required').eq('id',projectId).maybeSingle(),
  db.from('project_members').select('id,team_role,joined_at,project_run_id').eq('project_id',projectId).eq('user_id',users.member.id).eq('project_run_id',team1RunId).in('membership_status',['waiting','active','completed']).maybeSingle(),
  db.from('project_runs').select('id,run_number,status').eq('id',team1RunId).eq('project_id',projectId).maybeSingle()
]);
if(verifiedProjectError)throw verifiedProjectError;
if(verifiedMembershipError)throw verifiedMembershipError;
if(verifiedRunError)throw verifiedRunError;
if(!verifiedProject||!verifiedMembership||!verifiedRun)throw new Error('Scoped E2E project fixture failed exact workspace-gate verification.');

const proofNow=new Date();
const proofFixtures=[
  {id:'00000000-0000-4000-8000-00000000e2b1',user_id:users.member.id,project_id:projectId,project_run_id:team1RunId,contribution_type:'analysis',title:'E2E verified forecasting analysis',description:'Built and documented the comparison analysis used by the E2E project team to evaluate the agreed project scenario.',evidence_url:'https://example.com/e2e-proof',verification_status:'verified',verified_by:users.admin.id,verified_at:new Date(proofNow.getTime()-86400000).toISOString(),visibility:'private',is_public:false,review_notes:'Internal text must never appear in verified member Proof.'},
  {id:'00000000-0000-4000-8000-00000000e2b2',user_id:users.member.id,project_id:projectId,project_run_id:team1RunId,contribution_type:'research',title:'E2E pending evidence review',description:'Prepared a source-backed research summary for the E2E project and submitted it for verification by the project reviewer.',evidence_url:null,verification_status:'pending',verified_by:null,verified_at:null,visibility:'private',is_public:false,review_notes:null},
  {id:'00000000-0000-4000-8000-00000000e2b3',user_id:users.member.id,project_id:projectId,project_run_id:team1RunId,contribution_type:'documentation',title:'E2E evidence needing changes',description:'Documented the E2E delivery approach and linked the contribution to the project record for reviewer verification.',evidence_url:'https://example.com/e2e-update',verification_status:'needs_changes',verified_by:null,verified_at:null,visibility:'private',is_public:false,review_notes:'Clarify which part of the delivery document you owned before resubmitting.'},
  {id:'00000000-0000-4000-8000-00000000e2b4',user_id:users.member.id,project_id:projectId,project_run_id:team1RunId,contribution_type:'other',title:'E2E evidence not verified',description:'Submitted an E2E contribution that remains available only as review history because verification was not approved.',evidence_url:null,verification_status:'rejected',verified_by:users.admin.id,verified_at:null,visibility:'private',is_public:false,review_notes:'Internal rejection rationale for deterministic privacy coverage.'}
];
const {error:proofError}=await db.from('contributions').upsert(proofFixtures,{onConflict:'id'});
if(proofError)throw proofError;

const {error:careerError}=await db.from('career_roles').upsert({
  slug:'e2e-local-quality-role',
  title:'E2E Quality Role',
  team:'Engineering',
  employment_type:'contract',
  location:'CI',
  work_arrangement:'remote',
  summary:'Disposable published career role for the isolated release gate.',
  responsibilities:'Exercise the end-to-end candidate application journey.',
  requirements:'CI-only deterministic browser testing.',
  application_questions:[],
  status:'published',
  published_at:new Date().toISOString(),
  expected_response_days:14,
  application_process:'Automated local release-gate fixture.'
},{onConflict:'slug'});
if(careerError)throw careerError;

const {data:termsTemplate,error:termsTemplateError}=await db.from('communication_templates').select('id,version').eq('template_key','project_application_terms').eq('active',true).maybeSingle();
if(termsTemplateError)throw termsTemplateError;
if(!termsTemplate)throw new Error('Active project application terms template is required for isolated E2E.');
const termsAttachmentId='00000000-0000-4000-8000-00000000e2c1';
const termsPath='e2e/project-participation-terms.pdf';
const termsDocument=Buffer.from('%PDF-1.4\n% Deterministic local E2E Project Participation Terms\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n','utf8');
const {error:termsUploadError}=await db.storage.from('communication-template-documents').upload(termsPath,termsDocument,{contentType:'application/pdf',upsert:true});
if(termsUploadError)throw termsUploadError;
const {error:termsAttachmentError}=await db.from('communication_template_attachments').upsert({id:termsAttachmentId,template_id:termsTemplate.id,file_name:'E2E Project Participation Terms.pdf',storage_path:termsPath,content_type:'application/pdf',size_bytes:termsDocument.length,sort_order:0,active:true,created_by:users.admin.id},{onConflict:'id'});
if(termsAttachmentError)throw termsAttachmentError;

console.log('Created and verified isolated local E2E identities, Proof lifecycle records, governed project terms and deterministic fixture records.');
