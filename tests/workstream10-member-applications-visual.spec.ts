import {createClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';
import {PROJECT_PARTICIPATION_TERMS_VERSION} from '../lib/project-participation-terms';

const projectIds=[
 '00000000-0000-4000-8000-00000000f101',
 '00000000-0000-4000-8000-00000000f102',
 '00000000-0000-4000-8000-00000000f103',
 '00000000-0000-4000-8000-00000000f104'
];
const widths=[320,375,390,430,768,1440] as const;
let memberId='';

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value}
function db(){const url=required('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('WS10 Member Applications tests refuse non-local Supabase hosts.');return createClient(url,required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
async function signIn(page:Page){await page.goto('/signin?next=%2Fmember%2Fapplications',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(required('E2E_MEMBER_EMAIL'));await main.locator('input[type="password"]').fill(required('E2E_MEMBER_PASSWORD'));await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname==='/member/applications',{timeout:20_000})}
async function noOverflow(page:Page,label:string){const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth}));expect(size.scroll,`${label}: document overflow`).toBeLessThanOrEqual(size.client+1);expect(size.body,`${label}: body overflow`).toBeLessThanOrEqual(size.client+1)}
async function cleanup(){const client=db();const {data:apps}=await client.from('project_applications').select('id').in('project_id',projectIds);const ids=(apps||[]).map(item=>item.id);if(ids.length)await client.from('project_application_events').delete().in('application_id',ids);await client.from('project_offers').delete().in('project_id',projectIds);await client.from('project_applications').delete().in('project_id',projectIds);await client.from('project_runs').delete().in('project_id',projectIds);await client.from('projects').delete().in('id',projectIds)}

test.beforeAll(async()=>{
 const client=db();await cleanup();
 const users=await client.auth.admin.listUsers({page:1,perPage:1000});if(users.error)throw users.error;const member=users.data.users.find(user=>user.email===required('E2E_MEMBER_EMAIL'));if(!member)throw new Error('WS10 requires disposable member identity.');memberId=member.id;
 const titles=['WS10 Submitted Project','WS10 Clarification Project','WS10 Offered Project','WS10 Closed Project'];
 for(let i=0;i<projectIds.length;i++){const inserted=await client.from('projects').insert({id:projectIds[i],slug:`ws10-member-app-${i+1}`,title:titles[i],summary:'Disposable Workstream 10 responsive application fixture.',problem_statement:'Validate member application state hierarchy and responsive presentation.',status:'open',visibility:'public',project_type:'open',applications_open:true,team_size_threshold:2,min_team_size:2,target_team_size:3,max_team_size:5,participation_mode:'team',admission_mode:'review_required'});if(inserted.error)throw inserted.error}
 const now=new Date().toISOString();
 const rows=[
  {project_id:projectIds[0],status:'submitted',reviewer_notes:null},
  {project_id:projectIds[1],status:'clarification_requested',reviewer_notes:'Please explain the data-quality checks you would use before analysis.'},
  {project_id:projectIds[2],status:'offered',reviewer_notes:'Selected for a governed project place.'},
  {project_id:projectIds[3],status:'declined',reviewer_notes:'Request closed for this project cycle.'}
 ];
 for(const row of rows){const inserted=await client.from('project_applications').insert({...row,user_id:memberId,project_role_id:null,application_kind:'interest',admission_mode_snapshot:'review_required',admission_decision:'review_required',participation_preference:'team',contribution_statement:'Workstream 10 member application responsive fixture contribution statement.',terms_accepted_at:now,terms_version:PROJECT_PARTICIPATION_TERMS_VERSION,submitted_at:now});if(inserted.error)throw inserted.error}
});

test.afterAll(async()=>{await cleanup()});

test('Member Applications is readable and action-aware from 320px to desktop',async({page})=>{
 test.setTimeout(240_000);await page.emulateMedia({reducedMotion:'reduce'});await signIn(page);
 for(const width of widths){
  await page.setViewportSize({width,height:900});await page.goto('/member/applications',{waitUntil:'networkidle'});
  await expect(page.getByRole('heading',{level:1,name:'Applications'})).toBeVisible();
  await expect(page.getByLabel('Project request summary')).toBeVisible();
  await expect(page.getByRole('tab',{name:'Current'})).toHaveAttribute('aria-selected','true');
  await expect(page.getByText('WS10 Submitted Project',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('WS10 Clarification Project',{exact:true}).first()).toBeVisible();
  await expect(page.getByText(/Action required: send the requested clarification/i).first()).toBeVisible();
  await noOverflow(page,`${width}px applications`);
  for(const button of await page.getByRole('tab').all()){const box=await button.boundingBox();expect(box?.height||0,`${width}px tab target`).toBeGreaterThanOrEqual(44)}
 }
});

test('Needs Action and Closed tabs expose the correct member-facing states',async({page})=>{
 await signIn(page);await page.getByRole('tab',{name:'Needs action'}).click();
 await expect(page.getByText('WS10 Clarification Project',{exact:true}).first()).toBeVisible();
 await expect(page.getByText('WS10 Offered Project',{exact:true}).first()).toBeVisible();
 await expect(page.getByRole('link',{name:'Respond'})).toBeVisible();
 await page.getByRole('tab',{name:'Closed'}).click();
 await expect(page.getByText('WS10 Closed Project',{exact:true}).first()).toBeVisible();
 await expect(page.getByText('WS10 Submitted Project',{exact:true})).toHaveCount(0);
});

test('Member Applications reflows at 200 percent without horizontal page overflow',async({page})=>{
 await signIn(page);await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await expect(page.getByRole('heading',{level:1,name:'Applications'})).toBeVisible();await noOverflow(page,'390px applications at 200%');
});
