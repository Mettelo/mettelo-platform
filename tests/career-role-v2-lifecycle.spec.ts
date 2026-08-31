import {createClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';

const enabled=Boolean(process.env.E2E_BASE_URL&&process.env.E2E_SUPABASE_URL&&process.env.E2E_SUPABASE_SERVICE_ROLE_KEY&&process.env.E2E_ADMIN_EMAIL&&process.env.E2E_ADMIN_PASSWORD);
const required=(name:string)=>{const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required.`);return value;};
const baseURL=()=>required('E2E_BASE_URL');
const serviceDb=()=>createClient(required('E2E_SUPABASE_URL'),required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
async function signIn(page:Page){await page.goto(`${baseURL()}/signin?next=${encodeURIComponent('/admin/careers/roles')}`,{waitUntil:'networkidle'});const main=page.locator('main');await main.locator('input[type="email"]').fill(required('E2E_ADMIN_EMAIL'));await main.locator('input[type="password"]').fill(required('E2E_ADMIN_PASSWORD'));await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});}
async function adminJson(page:Page,method:'POST'|'PATCH',payload:Record<string,unknown>){return page.evaluate(async({method,payload})=>{const r=await fetch('/api/admin/careers/roles',{method,headers:{'content-type':'application/json'},body:JSON.stringify(payload)});return {status:r.status,body:await r.json()};},{method,payload});}

const roleDraft={
 title:'E2E Career V2 Lifecycle Role',team:'Quality',employment_type:'volunteer',location:'United Kingdom',work_arrangement:'remote',time_commitment:'4–6 hours/week',salary_text:'Unpaid volunteer opportunity',expected_response_days:'14',
 role_proposition:'Contribute to release-quality work while building practical evidence of collaborative delivery.',summary:'A deterministic role used to validate the complete Careers V2 authoring, preview, publishing and closing lifecycle.',
 responsibilities:'Validate candidate journeys\nDocument material defects\nCommunicate evidence clearly',requirements:'Analytical thinking\nReliable collaboration',core_capabilities:'Analytical thinking\nCommunication\nCollaboration',useful_tools:'Playwright\nSQL',candidate_value:'Practical delivery experience\nTeam collaboration\nEvidence of contribution',good_fit:'You test carefully\nYou communicate clearly',not_required:'You do not need every listed tool',working_model:'Remote project work\nAgreed checkpoints\nReviewed outputs',success_looks_like:'Reliable contributions are completed, reviewed and communicated clearly.',application_process:'Applications are reviewed against the published brief.',application_stages:'Apply | Submit your application\nReview | We assess fit and evidence\nConversation | Selected applicants speak with the team\nDecision | You receive a clear outcome\nOnboarding | Successful applicants join the role flow',transparency:'This is an unpaid volunteer opportunity. Contribution expectations are agreed before work begins and no employment outcome is guaranteed.',application_questions:'What evidence would you bring to this role?'
};

test.describe('Career role V2 lifecycle',()=>{
 test.skip(!enabled,'Requires the isolated staging E2E environment.');
 let roleId='';let slug='';
 test.afterAll(async()=>{if(roleId)await serviceDb().from('career_roles').delete().eq('id',roleId);});

 test('draft preview, publish, responsive page, close, reopen protection and archive lifecycle',async({browser})=>{
  const adminContext=await browser.newContext({baseURL:baseURL()});const admin=await adminContext.newPage();await signIn(admin);
  const created=await adminJson(admin,'POST',roleDraft);expect(created.status,JSON.stringify(created.body)).toBe(201);roleId=String(created.body.role.id);slug=String(created.body.role.slug);expect(created.body.role.status).toBe('draft');

  await admin.goto(`/careers/${slug}?preview=1`,{waitUntil:'networkidle'});await expect(admin.getByText('Admin preview',{exact:true})).toBeVisible();await expect(admin.locator('.careerApplyForm')).toHaveCount(0);

  const published=await adminJson(admin,'PATCH',{id:roleId,status:'published'});expect(published.status,JSON.stringify(published.body)).toBe(200);
  await adminContext.close();

  for(const viewport of [{width:1440,height:900},{width:768,height:900},{width:390,height:844}]){
   const context=await browser.newContext({baseURL:baseURL(),viewport});const page=await context.newPage();await page.goto(`/careers/${slug}`,{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1,name:roleDraft.title})).toBeVisible();await expect(page.locator('.careerApplyForm')).toBeVisible();let overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);expect(overflow).toBeLessThanOrEqual(1);await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});await page.waitForTimeout(50);overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);expect(overflow).toBeLessThanOrEqual(1);await context.close();
  }

  const admin2Context=await browser.newContext({baseURL:baseURL()});const admin2=await admin2Context.newPage();await signIn(admin2);
  const closed=await adminJson(admin2,'PATCH',{id:roleId,status:'closed'});expect(closed.status).toBe(200);
  const publicContext=await browser.newContext({baseURL:baseURL()});const publicPage=await publicContext.newPage();const closedResponse=await publicPage.goto(`/careers/${slug}`,{waitUntil:'networkidle'});expect(closedResponse?.status()).toBe(200);await expect(publicPage.getByText('Applications closed',{exact:true}).first()).toBeVisible();await expect(publicPage.locator('.careerApplyForm')).toHaveCount(0);await publicContext.close();

  const past='2020-01-01';const editedPast=await adminJson(admin2,'PATCH',{...roleDraft,id:roleId,status:'closed',closes_at:past});expect(editedPast.status).toBe(200);const invalidReopen=await adminJson(admin2,'PATCH',{id:roleId,status:'published'});expect(invalidReopen.status).toBe(409);expect(String(invalidReopen.body.error)).toContain('future application deadline');
  const cleared=await adminJson(admin2,'PATCH',{...roleDraft,id:roleId,status:'closed',closes_at:''});expect(cleared.status).toBe(200);const reopened=await adminJson(admin2,'PATCH',{id:roleId,status:'published'});expect(reopened.status).toBe(200);
  const archived=await adminJson(admin2,'PATCH',{id:roleId,status:'archived'});expect(archived.status).toBe(200);const invalidPublish=await adminJson(admin2,'PATCH',{id:roleId,status:'published'});expect(invalidPublish.status).toBe(409);const restored=await adminJson(admin2,'PATCH',{id:roleId,status:'draft'});expect(restored.status).toBe(200);await admin2Context.close();
 });
});
