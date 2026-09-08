import {createClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';

const PROJECT='00000000-0000-4000-8000-00000000d170';
const env=(name:string)=>{const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value};
const service=()=>{const url=env('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Phase 17 tests refuse non-local Supabase hosts.');return createClient(url,env('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})};
const anon=()=>createClient(env('E2E_SUPABASE_URL'),env('E2E_SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
async function identities(){const db=service();const {data,error}=await db.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;const member=data.users.find(user=>user.email===env('E2E_MEMBER_EMAIL'));const architect=data.users.find(user=>user.email===env('E2E_ARCHITECT_EMAIL'));const admin=data.users.find(user=>user.email===env('E2E_ADMIN_EMAIL'));if(!member||!architect||!admin)throw new Error('Phase 17 disposable identities missing.');return{member,architect,admin}}
async function signedClient(prefix:'MEMBER'|'ARCHITECT'|'ADMIN'){const client=anon();const signed=await client.auth.signInWithPassword({email:env(`E2E_${prefix}_EMAIL`),password:env(`E2E_${prefix}_PASSWORD`)});if(signed.error)throw signed.error;return client}
async function login(page:Page,prefix:'MEMBER'|'ARCHITECT'|'ADMIN',next='/member'){await page.context().clearCookies();await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(env(`E2E_${prefix}_EMAIL`));await main.locator('input[type="password"]').fill(env(`E2E_${prefix}_PASSWORD`));await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function cleanup(db:ReturnType<typeof service>){await db.from('project_support_case_updates').delete().in('case_id',(await db.from('project_support_cases').select('id').eq('project_id',PROJECT)).data?.map(row=>row.id)||[]);await db.from('project_support_cases').delete().eq('project_id',PROJECT);for(const table of ['project_activity_log','project_members','project_runs'])await db.from(table).delete().eq('project_id',PROJECT);await db.from('projects').delete().eq('id',PROJECT)}
async function seed(){const db=service(),ids=await identities();await cleanup(db);const started=new Date(Date.now()-60_000).toISOString();let result=await db.from('projects').insert({id:PROJECT,slug:'phase17-private-support',title:'Phase 17 Private Support',summary:'Disposable support fixture.',problem_statement:'Test private governed support without leaking case detail.',status:'active',visibility:'private',project_type:'open',applications_open:true,participation_mode:'team',team_size_threshold:2,min_team_size:2,target_team_size:2,max_team_size:3,admission_mode:'review_required'});if(result.error)throw result.error;const run=await db.from('project_runs').insert({project_id:PROJECT,run_number:1,status:'active',team_size_threshold:2,required_team_size:2,has_started:true,recruitment_open:true,started_at:started,kickoff_at:started}).select('id').single();if(run.error||!run.data)throw run.error||new Error('run missing');for(const [user,role] of [[ids.member,'contributor'],[ids.architect,'project_lead']] as const){result=await db.from('project_members').insert({project_id:PROJECT,project_run_id:run.data.id,user_id:user.id,team_role:role,membership_status:'active',activated_at:started});if(result.error)throw result.error}return{db,runId:run.data.id,...ids}}
async function setAdminCapabilities(db:ReturnType<typeof service>,adminId:string,capabilities:string[]){const {error}=await db.auth.admin.updateUserById(adminId,{app_metadata:{role:'admin',admin_capabilities:capabilities}});if(error)throw error}

async function apiJson(page:Page,url:string,options?:Parameters<Page['request']['fetch']>[1]){const response=await page.request.fetch(url,options);return{response,body:await response.json().catch(()=>({}))}}

test.describe('Project Experience Phase 17 private support security journey',()=>{
 test('reporter -> isolated case -> authorized review -> secure response -> safeguarding -> resolve -> close',async({page})=>{test.slow();const fixture=await seed();const memberDb=await signedClient('MEMBER'),leadDb=await signedClient('ARCHITECT');try{
   await setAdminCapabilities(fixture.db,fixture.admin.id,['projects.manage']);
   await login(page,'MEMBER',`/member/projects/${PROJECT}?run=${fixture.runId}&view=home`);
   const created=await apiJson(page,'/api/project-support-cases',{method:'POST',headers:{'Content-Type':'application/json'},data:{project_id:PROJECT,project_run_id:fixture.runId,category:'project_lead_support',description:'I need private support about the Project Lead direction. Please review this without exposing my report to the Lead.'}});
   expect(created.response.status()).toBe(201);const caseId=String(created.body.case?.id||'');expect(caseId).toMatch(/^[0-9a-f-]{36}$/i);

   const stored=await fixture.db.from('project_support_cases').select('reporter_user_id,project_id,project_run_id,category,status').eq('id',caseId).single();expect(stored.data).toMatchObject({reporter_user_id:fixture.member.id,project_id:PROJECT,project_run_id:fixture.runId,category:'project_lead_support',status:'open'});
   const ownSafe=await memberDb.from('project_support_cases').select('id,description,status').eq('id',caseId);expect(ownSafe.error).toBeNull();expect(ownSafe.data).toHaveLength(1);
   const ownInternal=await memberDb.from('project_support_cases').select('id,internal_notes').eq('id',caseId);expect(ownInternal.error).toBeTruthy();
   const leadRead=await leadDb.from('project_support_cases').select('id,description').eq('id',caseId);expect(leadRead.error).toBeNull();expect(leadRead.data).toHaveLength(0);
   const leadUpdate=await leadDb.from('project_support_cases').update({status:'resolved'}).eq('id',caseId).select('id');expect(Boolean(leadUpdate.error)||leadUpdate.data?.length===0).toBe(true);

   await login(page,'ADMIN','/admin/project-support');
   const unauthorized=await apiJson(page,`/api/admin/project-support-cases?case=${caseId}`);expect(unauthorized.response.status()).toBe(403);

   await setAdminCapabilities(fixture.db,fixture.admin.id,['projects.support.manage','projects.safeguarding.manage']);
   await login(page,'ADMIN','/admin/project-support');
   const authorized=await apiJson(page,`/api/admin/project-support-cases?case=${caseId}`);expect(authorized.response.status()).toBe(200);expect(authorized.body.cases).toHaveLength(1);
   const requestInfo=await apiJson(page,'/api/admin/project-support-cases',{method:'POST',headers:{'Content-Type':'application/json'},data:{case_id:caseId,action:'request_information',note:'Please confirm which project direction needs clarification. Keep your response focused on the project support you need.'}});expect(requestInfo.response.status()).toBe(200);expect(requestInfo.body.case.status).toBe('awaiting_member');

   await login(page,'MEMBER',`/member/projects/${PROJECT}?run=${fixture.runId}&view=home`);
   const memberView=await apiJson(page,'/api/project-support-cases');expect(memberView.response.status()).toBe(200);expect(JSON.stringify(memberView.body)).not.toContain('internal_notes');
   const reply=await apiJson(page,'/api/project-support-cases',{method:'PATCH',headers:{'Content-Type':'application/json'},data:{case_id:caseId,response:'The unclear direction concerns which dataset should be treated as the canonical source for the next milestone.'}});expect(reply.response.status()).toBe(200);expect(reply.body.case.status).toBe('under_review');

   await login(page,'ADMIN','/admin/project-support');
   const escalated=await apiJson(page,'/api/admin/project-support-cases',{method:'POST',headers:{'Content-Type':'application/json'},data:{case_id:caseId,action:'escalate_safeguarding',note:'Restricted safeguarding assessment note for authorized handlers only.'}});expect(escalated.response.status()).toBe(200);expect(escalated.body.case.status).toBe('escalated');expect(escalated.body.case.safeguarding_escalated_at).toBeTruthy();

   await setAdminCapabilities(fixture.db,fixture.admin.id,['projects.support.manage']);
   await login(page,'ADMIN','/admin/project-support');
   const narrowed=await apiJson(page,`/api/admin/project-support-cases?case=${caseId}`);expect(narrowed.response.status()).toBe(200);expect(narrowed.body.cases).toHaveLength(0);
   const forbiddenAction=await apiJson(page,'/api/admin/project-support-cases',{method:'POST',headers:{'Content-Type':'application/json'},data:{case_id:caseId,action:'resolve',note:'Should not be accepted without safeguarding capability.'}});expect(forbiddenAction.response.status()).toBe(403);

   await setAdminCapabilities(fixture.db,fixture.admin.id,['projects.support.manage','projects.safeguarding.manage']);
   await login(page,'ADMIN','/admin/project-support');
   const resolved=await apiJson(page,'/api/admin/project-support-cases',{method:'POST',headers:{'Content-Type':'application/json'},data:{case_id:caseId,action:'resolve',note:'The case was reviewed and the appropriate project support outcome has been recorded securely.'}});expect(resolved.response.status()).toBe(200);expect(resolved.body.case.status).toBe('resolved');
   const closed=await apiJson(page,'/api/admin/project-support-cases',{method:'POST',headers:{'Content-Type':'application/json'},data:{case_id:caseId,action:'close',note:''}});expect(closed.response.status()).toBe(200);expect(closed.body.case.status).toBe('closed');

   await login(page,'MEMBER',`/member/projects/${PROJECT}?run=${fixture.runId}&view=home`);
   const finalView=await apiJson(page,'/api/project-support-cases');expect(finalView.response.status()).toBe(200);const own=finalView.body.cases.find((item:{id:string})=>item.id===caseId);expect(own.status).toBe('closed');expect(JSON.stringify(finalView.body)).not.toContain('Restricted safeguarding assessment note');
   const closedReply=await apiJson(page,'/api/project-support-cases',{method:'PATCH',headers:{'Content-Type':'application/json'},data:{case_id:caseId,response:'Attempt after closure'}});expect(closedReply.response.status()).toBe(409);
  }finally{await memberDb.auth.signOut();await leadDb.auth.signOut();await cleanup(fixture.db)}});
});
