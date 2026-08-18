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
const {error:projectError}=await db.from('projects').upsert({
  id:projectId,
  slug:'e2e-local-release-project',
  title:'E2E Local Release Project',
  summary:'Disposable local project used only by the GitHub Actions release gate.',
  problem_statement:'Verify browser to API to database submission behavior without hosted staging infrastructure.',
  status:'active',
  visibility:'public',
  project_type:'open',
  applications_open:true,
  project_type_review_required:false,
  location:'CI',
  weekly_commitment:'E2E only'
},{onConflict:'id'});
if(projectError)throw projectError;

const {error:runError}=await db.from('project_runs').upsert([
  {id:team1RunId,project_id:projectId,run_number:1,status:'active',team_size_threshold:5,required_team_size:5,has_started:true,started_at:new Date().toISOString()},
  {id:team2RunId,project_id:projectId,run_number:2,status:'forming',team_size_threshold:5,required_team_size:5,has_started:false}
],{onConflict:'id'});
if(runError)throw runError;

await db.from('project_members').delete().eq('project_id',projectId).eq('user_id',users.member.id);
const {error:membershipError}=await db.from('project_members').insert({project_id:projectId,project_run_id:team1RunId,user_id:users.member.id,team_role:'contributor',membership_status:'active'});
if(membershipError)throw membershipError;

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

console.log('Created isolated local E2E identities and deterministic fixture records.');
