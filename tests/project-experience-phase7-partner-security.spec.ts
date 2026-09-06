import {createClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';
import {PROJECT_PARTICIPATION_TERMS_VERSION} from '../lib/project-participation-terms';

const partnerProject='00000000-0000-4000-8000-00000000b704';
function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value}
function db(){const url=required('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Phase 7 Partner security tests refuse non-local Supabase hosts.');return createClient(url,required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
async function signIn(page:Page,email:string,password:string){await page.goto('/signin',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(email);await main.locator('input[type="password"]').fill(password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function cleanup(client:ReturnType<typeof db>){const {data:apps}=await client.from('project_applications').select('id').eq('project_id',partnerProject);const appIds=(apps||[]).map(item=>item.id);if(appIds.length)await client.from('project_application_events').delete().in('application_id',appIds);await client.from('project_activity_log').delete().eq('project_id',partnerProject);await client.from('project_members').delete().eq('project_id',partnerProject);await client.from('project_applications').delete().eq('project_id',partnerProject);await client.from('project_runs').delete().eq('project_id',partnerProject);await client.from('projects').delete().eq('id',partnerProject)}

test('ordinary member cannot review or mutate a Partner Project request',async({page})=>{
 const client=db();await cleanup(client);
 const {data:users,error:userError}=await client.auth.admin.listUsers({page:1,perPage:1000});if(userError)throw userError;
 const member=users.users.find(user=>user.email===required('E2E_MEMBER_EMAIL'));if(!member)throw new Error('Disposable member identity missing.');
 try{
  const project=await client.from('projects').insert({id:partnerProject,slug:'phase7-partner-security',title:'Phase 7 Partner security fixture',summary:'Partner review security fixture.',problem_statement:'Prove that only Mettelo Admin can review Partner Project requests until a scoped partner reviewer model is explicitly implemented.',status:'open',visibility:'public',project_type:'partner',partner_name:'E2E Partner Organisation',applications_open:true,team_size_threshold:1,min_team_size:1,target_team_size:1,max_team_size:2,participation_mode:'team',admission_mode:'review_required'});if(project.error)throw project.error;
  const now=new Date().toISOString();const {data:application,error:appError}=await client.from('project_applications').insert({project_id:partnerProject,user_id:member.id,status:'submitted',application_kind:'interest',admission_mode_snapshot:'review_required',admission_decision:'review_required',participation_preference:'team',contribution_statement:'Phase 7 Partner review security fixture statement with sufficient detail.',terms_accepted_at:now,terms_version:PROJECT_PARTICIPATION_TERMS_VERSION,submitted_at:now}).select('id').single();if(appError||!application)throw appError||new Error('Could not seed Partner request.');
  await signIn(page,required('E2E_MEMBER_EMAIL'),required('E2E_MEMBER_PASSWORD'));
  const review=await page.context().request.patch('/api/admin/applications',{data:{id:application.id,status:'in_review',reviewer_notes:'Forged non-admin review attempt'}});
  expect(review.status()).toBe(403);
  const policy=await page.context().request.patch('/api/admin/project-admission',{data:{project_id:partnerProject,admission_mode:'auto',auto_start_delay_minutes:0}});
  expect(policy.status()).toBe(403);
  const {data:stored}=await client.from('project_applications').select('status').eq('id',application.id).single();expect(stored?.status).toBe('submitted');
  const {data:storedProject}=await client.from('projects').select('admission_mode').eq('id',partnerProject).single();expect(storedProject?.admission_mode).toBe('review_required');
 }finally{await cleanup(client)}
});
