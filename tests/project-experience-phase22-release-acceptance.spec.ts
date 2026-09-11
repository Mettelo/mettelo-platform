import {createClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const ADMIN_POLICY_PROJECT='00000000-0000-4000-8000-00000000d21a';
function read(file:string){return fs.readFileSync(path.join(root,file),'utf8')}
function env(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value}
function service(){const url=env('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Phase 22 Admin policy acceptance refuses non-local Supabase hosts.');return createClient(url,env('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
async function cleanupAdminPolicyFixture(db:ReturnType<typeof service>){await db.from('project_activity_log').delete().eq('project_id',ADMIN_POLICY_PROJECT);await db.from('project_members').delete().eq('project_id',ADMIN_POLICY_PROJECT);await db.from('project_runs').delete().eq('project_id',ADMIN_POLICY_PROJECT);await db.from('project_roles').delete().eq('project_id',ADMIN_POLICY_PROJECT);await db.from('project_applications').delete().eq('project_id',ADMIN_POLICY_PROJECT);await db.from('projects').delete().eq('id',ADMIN_POLICY_PROJECT)}
async function seedAdminPolicyFixture(){const db=service();await cleanupAdminPolicyFixture(db);const project=await db.from('projects').insert({id:ADMIN_POLICY_PROJECT,slug:'phase21-admin-policy-e2e',title:'Phase 21 Admin Policy E2E',summary:'Disposable project used to verify collaboration policy persistence and dependency handling.',problem_statement:'Verify Admin can configure canonical collaboration policy without rewriting existing project-run capacity.',status:'draft',visibility:'private',project_type:'open',applications_open:false,participation_mode:'team',team_size_threshold:2,min_team_size:2,target_team_size:3,max_team_size:5,admission_mode:'auto',late_joining_enabled:true,project_sharing_enabled:true,member_invites_enabled:false,collaboration_marketplace_enabled:true,project_lead_invites_enabled:true,team_member_invites_enabled:false,external_collaboration_invites_enabled:false,collaboration_social_sharing_enabled:false}).select('id').single();if(project.error)throw project.error;const run=await db.from('project_runs').insert({project_id:ADMIN_POLICY_PROJECT,run_number:1,status:'forming',team_size_threshold:2,required_team_size:2,has_started:false,recruitment_open:true}).select('id,required_team_size').single();if(run.error||!run.data)throw run.error||new Error('Phase 21 run fixture missing.');return{db,runId:run.data.id}}
async function loginAdmin(page:Page){await page.goto(`/signin?next=${encodeURIComponent(`/admin/collaboration/configure?project_id=${ADMIN_POLICY_PROJECT}`)}`,{waitUntil:'domcontentloaded'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(env('E2E_ADMIN_EMAIL'));await main.locator('input[type="password"]').fill(env('E2E_ADMIN_PASSWORD'));await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname==='/admin/collaboration/configure'&&url.searchParams.get('project_id')===ADMIN_POLICY_PROJECT,{timeout:20_000})}

test.describe('Phase 22 collaboration release acceptance',()=>{
 test('canonical Lab exposes team growth and completion from one exact-run workspace',()=>{
  const lab=read('components/MetteloLabPanel.tsx');
  expect(lab).toContain('ProjectGrowTeamSection');
  expect(lab).toContain('ProjectFinalProofPanel');
  expect(lab).toContain('projectRunId={props.projectRunId}');
  expect(lab).toContain('data-lab-team-section');
  expect(lab).toContain('data-lab-review-section');
 });

 test('all three collaboration routes converge on the canonical need and same-run systems',()=>{
  const grow=read('components/ProjectGrowTeamActions.tsx');
  const discovery=read('components/MemberCollaboratorDiscovery.tsx');
  const findTeam=read('app/member/find-a-team/page.tsx');
  const publicPage=read('app/collaborate/[id]/page.tsx');
  for(const text of ['/api/collaboration-needs','/member/find-collaborators','/collaborate/'])expect(grow).toContain(text);
  expect(discovery).toContain('/api/member-collaboration-invitations');
  expect(findTeam).toContain('project_run_id');
  expect(publicPage).toContain('project_run_id');
  expect(grow+discovery).not.toContain("from('project_members').insert");
  expect(grow+discovery).not.toContain("from('project_runs').insert");
 });

 test('capacity, joining window, recruitment and final-review freeze remain authoritative',()=>{
  const grow=read('components/ProjectGrowTeamSection.tsx');
  const finalProof=read('app/api/project-final-proof/route.ts');
  const completion=read('app/api/project-completion/route.ts');
  for(const text of ['phase9_project_run_capacity','late_joining_enabled','late_joining_cutoff_at','recruitment_open'])expect(grow).toContain(text);
  expect(grow).toContain("run.status==='review'");
  for(const text of ['freezeRecruitment',"recruitment_open:false","from('project_collaboration_needs')","status:'closed'","from('project_member_collaboration_invitations')","status:'revoked'"])expect(finalProof).toContain(text);
  expect(completion).toContain('recruitment_open:false');
  expect(completion).not.toContain('recruitment_open:true');
 });

 test('Partner admission and completion remain human-review gated',()=>{
  const policy=read('app/api/admin/collaboration-policy/route.ts');
  const completion=read('app/api/project-completion/route.ts');
  expect(policy).toContain('Partner Projects always require human review.');
  expect(policy).toContain("project.project_type==='partner'");
  expect(completion).toContain('Only Partner projects use reviewer-gated completion.');
  expect(completion).toContain('Admin or the assigned Project Architect is required');
 });

 test('Proof remains individually attributed, reviewable, privacy-controlled and profile-visible',()=>{
  const proof=read('components/MemberProofPortfolio.tsx');
  const review=read('app/api/project-contributions/route.ts');
  const visibility=read('components/ProofVisibilityControl.tsx');
  const profile=read('app/people/[id]/page.tsx');
  for(const text of ['Changes requested','Resubmit','Verified','not verified'])expect(proof).toContain(text);
  for(const text of ['verified_by:','verified_at','contribution_review_events','actor_user_id','You cannot review your own contribution'])expect(review).toContain(text);
  for(const text of ["value:'public'","value:'mettelo_only'","value:'private'",'/api/proof-visibility','Who can see this verified Proof?'])expect(visibility).toContain(text);
  expect(profile).toContain("eq('verification_status','verified')");
  expect(profile).toContain("eq('visibility','public')");
 });

 test('Admin collaboration policy governs the same project source of truth',()=>{
  const wizard=read('components/AdminCollaborationPolicyWizard.tsx');
  const route=read('app/api/admin/collaboration-policy/route.ts');
  for(const text of ['Future team capacity','Enable collaboration marketplace','Enable member invitations','Allow external collaboration invitations','Allow collaboration social sharing','Allow late joining','Late-joining cutoff'])expect(wizard).toContain(text);
  expect(route).toContain("from('projects').update(patch)");
  expect(route).not.toContain("from('project_runs').update");
 });

 test('Admin policy browser persists canonical rules without rewriting existing run geometry',async({page})=>{test.setTimeout(90_000);const fixture=await seedAdminPolicyFixture();try{await loginAdmin(page);await expect(page.getByRole('heading',{name:'Project collaboration policy'})).toBeVisible();await expect(page.getByRole('heading',{name:'How this project can grow its team'})).toBeVisible();const capacity=page.getByLabel('Future team capacity');await expect(capacity).toHaveValue('2');const lead=page.getByLabel('Project Lead can invite');await expect(lead).toBeDisabled();await expect(lead).not.toBeChecked();await page.getByLabel('Enable member invitations').check();await lead.check();await page.getByLabel('Team members can invite').check();await page.getByLabel('Allow external collaboration invitations').check();await page.getByLabel('Allow collaboration social sharing').check();await capacity.fill('4');await page.getByRole('button',{name:'Save collaboration policy'}).click();await expect(page.getByRole('status')).toContainText('updated');let project=await fixture.db.from('projects').select('team_size_threshold,member_invites_enabled,project_lead_invites_enabled,team_member_invites_enabled,external_collaboration_invites_enabled,collaboration_social_sharing_enabled,collaboration_marketplace_enabled,project_sharing_enabled').eq('id',ADMIN_POLICY_PROJECT).single();expect(project.error).toBeNull();expect(project.data).toMatchObject({team_size_threshold:4,member_invites_enabled:true,project_lead_invites_enabled:true,team_member_invites_enabled:true,external_collaboration_invites_enabled:true,collaboration_social_sharing_enabled:true,collaboration_marketplace_enabled:true,project_sharing_enabled:true});let run=await fixture.db.from('project_runs').select('required_team_size').eq('id',fixture.runId).single();expect(run.data?.required_team_size).toBe(2);await page.getByLabel('Enable collaboration marketplace').uncheck();await expect(page.getByLabel('Allow external collaboration invitations')).not.toBeChecked();await expect(page.getByLabel('Allow collaboration social sharing')).not.toBeChecked();await page.getByRole('button',{name:'Save collaboration policy'}).click();await expect(page.getByRole('status')).toContainText('updated');project=await fixture.db.from('projects').select('collaboration_marketplace_enabled,external_collaboration_invites_enabled,collaboration_social_sharing_enabled').eq('id',ADMIN_POLICY_PROJECT).single();expect(project.data).toMatchObject({collaboration_marketplace_enabled:false,external_collaboration_invites_enabled:false,collaboration_social_sharing_enabled:false});run=await fixture.db.from('project_runs').select('required_team_size').eq('id',fixture.runId).single();expect(run.data?.required_team_size).toBe(2);const audit=await fixture.db.from('project_activity_log').select('event_type').eq('project_id',ADMIN_POLICY_PROJECT).eq('event_type','project_collaboration_policy_updated');expect(audit.data?.length).toBeGreaterThanOrEqual(2)}finally{await cleanupAdminPolicyFixture(fixture.db)}});

 test('anonymous collaboration intent survives account creation, verification and onboarding return',()=>{
  const publicPage=read('app/collaborate/[id]/page.tsx');
  const account=read('app/signin/AuthAccountClient.tsx');
  const callback=read('app/auth/callback/route.ts');
  const onboarding=read('app/onboarding/page.tsx');
  const flow=read('components/OnboardingFlow.tsx');
  const complete=read('app/onboarding/complete/page.tsx');
  const continuation=read('app/auth/continue-after-onboarding/route.ts');
  expect(publicPage).toContain('const interestTarget=`/member/discover/${item.project.id}?collaboration_need=${encodeURIComponent(id)}`');
  expect(publicPage).toContain('`/signin?next=${encodeURIComponent(inviteToken?inviteLanding:interestTarget)}`');
  expect(account).toContain("return next==='/member'||next==='/onboarding'?'/onboarding':`/onboarding?next=${encodeURIComponent(next)}`");
  expect(account).toContain('flow=signup&next=${encodeURIComponent(onboarding)}');
  expect(callback).toContain("if(flow==='signup')");
  expect(callback).toContain("new URL('/auth/verified',url.origin)");
  expect(onboarding).toContain('returnTo={next}');
  expect(onboarding).toContain('if(profile.onboarding_completed_at)redirect(next)');
  expect(flow).toContain('/onboarding/complete?next=${encodeURIComponent(returnTo)}');
  expect(complete).toContain('/auth/continue-after-onboarding?fallback=${encodeURIComponent(next)}');
  expect(continuation).toContain("store.get('mettelo_return_to')?.value");
  expect(continuation).toContain('intent||fallback');
 });

 test('release evidence includes same-run, RLS, responsive and public collaboration E2E suites',()=>{
  for(const file of [
   'tests/project-experience-phase18a-member-invitations-e2e.spec.ts',
   'tests/project-experience-phase18b-marketplace-e2e.spec.ts',
   'tests/project-experience-phase18c-governance-e2e.spec.ts',
   'tests/project-experience-phase17-rls-e2e.spec.ts',
   'tests/project-experience-phase22-anonymous-return-e2e.spec.ts'
  ])expect(fs.existsSync(path.join(root,file))).toBe(true);
  const governance=read('tests/project-experience-phase18c-governance-e2e.spec.ts');
  expect(governance).toContain('320');
  expect(governance).toContain("fontSize='200%'");
  expect(governance).toContain('Partner projects cannot be configured for AUTO admission');
 });
});
