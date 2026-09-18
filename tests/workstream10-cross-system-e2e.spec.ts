import {createClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';
import {PROJECT_PARTICIPATION_TERMS_VERSION} from '../lib/project-participation-terms';
import {makeGovernedProjectPublicationReady} from './helpers/governed-project-fixture';

const projectId='00000000-0000-4000-8000-00000000f201';
function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value}
function db(){const url=required('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('WS10 cross-system test refuses non-local Supabase hosts.');return createClient(url,required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
async function signIn(page:Page,prefix:'MEMBER'|'ADMIN',next:string){await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(required(`E2E_${prefix}_EMAIL`));await main.locator('input[type="password"]').fill(required(`E2E_${prefix}_PASSWORD`));await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function memberId(client:ReturnType<typeof db>){const users=await client.auth.admin.listUsers({page:1,perPage:1000});if(users.error)throw users.error;const member=users.data.users.find(user=>user.email===required('E2E_MEMBER_EMAIL'));if(!member)throw new Error('WS10 cross-system member identity missing.');return member.id}
async function cleanup(client:ReturnType<typeof db>){const {data:apps}=await client.from('project_applications').select('id').eq('project_id',projectId);const appIds=(apps||[]).map(row=>row.id);await client.from('project_collaboration_needs').delete().eq('project_id',projectId);await client.from('project_member_responsibilities').delete().eq('project_id',projectId);await client.from('project_offers').delete().eq('project_id',projectId);if(appIds.length)await client.from('project_application_events').delete().in('application_id',appIds);await client.from('project_activity_log').delete().eq('project_id',projectId);await client.from('project_members').delete().eq('project_id',projectId);await client.from('project_applications').delete().eq('project_id',projectId);await client.from('project_runs').delete().eq('project_id',projectId);await client.from('projects').delete().eq('id',projectId)}

test('published project stays coherent from Discover to review, Offer, team and Lab Grow Team',async({browser})=>{
 test.setTimeout(300_000);
 const client=db();const userId=await memberId(client);await cleanup(client);
 try{
  const created=await client.from('projects').insert({id:projectId,slug:'ws10-cross-system-project',title:'WS10 Cross-System Project',summary:'Disposable final recovery project linking discovery, admission and Lab.',problem_statement:'Prove one canonical project identity survives Discover, application review, acceptance, team formation handoff and Lab recruitment.',status:'draft',visibility:'private',project_type:'open',applications_open:false,participation_mode:'flexible',team_size_threshold:1,min_team_size:1,target_team_size:3,max_team_size:5,admission_mode:'review_required',member_invites_enabled:true,project_lead_invites_enabled:true,team_member_invites_enabled:true,collaboration_marketplace_enabled:true,project_sharing_enabled:true,collaboration_social_sharing_enabled:true,late_joining_enabled:true,late_joining_cutoff_at:'2099-12-31T23:59:59.000Z'});if(created.error)throw created.error;
  const role=await client.from('project_roles').insert({project_id:projectId,title:'Cross-System Contributor',discipline:'Data & AI',description:'Disposable role for final recovery cross-system proof.',skills:['Collaboration'],responsibilities:['Analysis'],openings:5});if(role.error)throw role.error;
  await makeGovernedProjectPublicationReady(client,projectId);
  const published=await client.from('projects').update({status:'recruiting',visibility:'public',applications_open:true}).eq('id',projectId);if(published.error)throw published.error;

  const memberContext=await browser.newContext();const memberPage=await memberContext.newPage();await signIn(memberPage,'MEMBER','/member/discover');
  await memberPage.goto('/member/discover',{waitUntil:'networkidle'});await expect(memberPage.getByText('WS10 Cross-System Project',{exact:true}).first()).toBeVisible();
  await expect(memberPage.locator('.mdProjectCard').filter({hasText:'WS10 Cross-System Project'}).getByRole('link',{name:'View project'})).toHaveAttribute('href',`/member/discover/${projectId}`);

  const now=new Date().toISOString();
  const application=await client.from('project_applications').insert({project_id:projectId,user_id:userId,project_role_id:null,status:'submitted',application_kind:'interest',admission_mode_snapshot:'review_required',admission_decision:'review_required',participation_preference:'flexible',flexible_preference:'prefer_team',contribution_statement:'WS10 cross-system contribution statement with enough detail for governed review.',motivation_statement:'I want to contribute to the final cross-system recovery proof.',commitment_response:'yes',terms_accepted_at:now,terms_version:PROJECT_PARTICIPATION_TERMS_VERSION,submitted_at:now}).select('id').single();if(application.error||!application.data)throw application.error||new Error('Cross-system application was not created.');
  await memberPage.goto('/member/applications',{waitUntil:'networkidle'});await expect(memberPage.getByText('WS10 Cross-System Project',{exact:true}).first()).toBeVisible();

  const adminContext=await browser.newContext();const adminPage=await adminContext.newPage();await signIn(adminPage,'ADMIN',`/admin/project-operations/applications?project=${projectId}`);
  await adminPage.goto(`/admin/project-operations/applications?project=${projectId}`,{waitUntil:'networkidle'});await expect(adminPage.locator('.applicationTable tbody tr').filter({hasText:'WS10 Cross-System Project'}).first()).toBeVisible();
  for(const status of ['in_review','shortlisted','offered']){const response=await adminPage.context().request.patch('/api/admin/applications',{data:{id:application.data.id,status,reviewer_notes:`WS10 ${status} cross-system review`}});expect(response.status(),await response.text()).toBe(200)}

  await memberPage.goto('/member/applications',{waitUntil:'networkidle'});await expect(memberPage.getByRole('button',{name:'Accept place'})).toBeVisible();await memberPage.getByRole('button',{name:'Accept place'}).click();await expect(memberPage.getByRole('dialog',{name:'Accept this project place?'})).toBeVisible();await memberPage.getByRole('button',{name:'Confirm acceptance'}).click();await expect(memberPage.locator('.mpoStatus.mpoSuccess').filter({hasText:'Place accepted.'})).toBeVisible();

  const activeAt=new Date().toISOString();
  const run=await client.from('project_runs').insert({project_id:projectId,run_number:1,status:'active',team_size_threshold:1,required_team_size:1,has_started:true,recruitment_open:true,started_at:activeAt,kickoff_at:activeAt}).select('id').single();if(run.error||!run.data)throw run.error||new Error('Cross-system active run was not created.');
  const membership=await client.from('project_members').insert({project_id:projectId,project_run_id:run.data.id,user_id:userId,team_role:'project_lead',membership_status:'active',activated_at:activeAt});if(membership.error)throw membership.error;
  const activated=await client.from('projects').update({status:'active',visibility:'public',applications_open:true}).eq('id',projectId);if(activated.error)throw activated.error;
  const linked=await client.from('project_applications').update({status:'team_complete',project_run_id:run.data.id,updated_at:activeAt}).eq('id',application.data.id);if(linked.error)throw linked.error;

  await memberPage.goto(`/member/projects/${projectId}?run=${run.data.id}&view=team`,{waitUntil:'networkidle'});
  await expect(memberPage.getByRole('heading',{name:'Team operating state'})).toBeVisible();
  await expect(memberPage.getByText('AVAILABLE',{exact:true}).first()).toBeVisible();
  await expect(memberPage.getByText('1 / 5',{exact:true}).first()).toBeVisible();
  await expect(memberPage.getByRole('link',{name:'Find people on Mettelo'})).toBeVisible();
  await expect(memberPage.getByText('CONFIGURATION ERROR',{exact:true})).toHaveCount(0);

  await memberContext.close();await adminContext.close();
 }finally{await cleanup(client)}
});
