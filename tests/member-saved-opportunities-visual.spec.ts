import {createClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';

const opportunityId='00000000-0000-4000-8000-00000000e2d1';
const title='E2E Senior Data Scientist';
const widths=[375,390,414,768,1024,1440] as const;

type Credentials={email:string;password:string};
function credentials():Credentials{const email=process.env.E2E_MEMBER_EMAIL?.trim();const password=process.env.E2E_MEMBER_PASSWORD;if(!email||!password)throw new Error('Missing E2E member credentials.');return{email,password}}
function localDb(){const url=process.env.E2E_SUPABASE_URL?.trim();const key=process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();if(!url||!key)throw new Error('Missing isolated E2E Supabase credentials.');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Saved Opportunities fixture refuses non-local Supabase hosts.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function signIn(page:Page){const account=credentials();await page.goto('/signin?next=%2Fmember%2Fsaved-opportunities',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname==='/member/saved-opportunities',{timeout:20_000})}
async function noOverflow(page:Page,label:string){const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth}));expect(dimensions.scroll,label).toBeLessThanOrEqual(dimensions.client);expect(dimensions.body,label).toBeLessThanOrEqual(dimensions.client)}

let memberId='';
test.beforeAll(async()=>{
  const db=localDb();const account=credentials();const {data:list,error:listError}=await db.auth.admin.listUsers({page:1,perPage:1000});if(listError)throw listError;const user=list.users.find(item=>item.email?.toLowerCase()===account.email.toLowerCase());if(!user)throw new Error('E2E member identity not found.');memberId=user.id;
  const {error:opportunityError}=await db.from('opportunities').upsert({id:opportunityId,slug:'e2e-saved-senior-data-scientist',title,organisation:'Mettelo E2E Labs',opportunity_type:'job',summary:'Lead a deterministic analytics and machine learning workstream used to verify the Saved Opportunities member experience across desktop, tablet and phone layouts.',location:'London, United Kingdom',source_url:'https://example.com/e2e-saved-role',official_application_url:'https://example.com/e2e-saved-role/apply',access_level:'public',status:'published',published_at:new Date().toISOString(),closes_at:'2099-12-31T23:59:59.000Z',data_ai_relevance_status:'high',applicant_scope:'international_accepted',sponsorship_status:'confirmed',work_arrangement:'hybrid',publication_mode:'manual',review_required:false},{onConflict:'id'});if(opportunityError)throw opportunityError;
  const {error:savedError}=await db.from('saved_opportunities').upsert({user_id:memberId,opportunity_id:opportunityId,reminders_enabled:true},{onConflict:'user_id,opportunity_id'});if(savedError)throw savedError;
});

test('Saved Opportunities is a bounded, scannable member workspace at all supported widths',async({page})=>{
  test.setTimeout(180_000);await page.emulateMedia({reducedMotion:'reduce'});await signIn(page);
  for(const width of widths){
    await page.setViewportSize({width,height:900});await page.goto('/member/saved-opportunities',{waitUntil:'networkidle'});
    await expect(page.getByRole('heading',{level:1,name:'Saved opportunities'})).toBeVisible();
    await expect(page.getByText('EXPLORE · SAVED OPPORTUNITIES',{exact:true})).toBeVisible();
    const summary=page.getByLabel('Saved opportunity summary');await expect(summary).toBeVisible();await expect(summary.getByText(/Saved roles?$/)).toBeVisible();await expect(summary.getByText('Still open',{exact:true})).toBeVisible();
    const card=page.getByRole('article').filter({hasText:title});await expect(card).toBeVisible();await expect(card.getByRole('heading',{level:2,name:title})).toBeVisible();await expect(card.getByText('Mettelo E2E Labs',{exact:true})).toBeVisible();await expect(card.getByText('International applicants',{exact:true})).toBeVisible();await expect(card.getByText('Sponsorship confirmed',{exact:true})).toBeVisible();await expect(card.getByText('Open',{exact:true})).toBeVisible();
    const reminder=card.getByText('Deadline reminder',{exact:true}).locator('..').locator('..');await expect(reminder).toBeVisible();const checkbox=card.getByRole('checkbox');await expect(checkbox).toBeChecked();
    const view=card.getByRole('link',{name:/View role/});await expect(view).toHaveAttribute('href',`/opportunities/${opportunityId}`);const viewBox=await view.boundingBox();expect(viewBox?.height||0,`${width}px View role touch target`).toBeGreaterThanOrEqual(44);
    await expect(card.getByRole('button',{name:'✓ Saved'})).toBeVisible({timeout:10_000});
    const columns=await card.evaluate(element=>getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length);expect(columns,`${width}px saved opportunity composition`).toBe(width>=1025?2:1);
    await noOverflow(page,`Saved Opportunities overflowed at ${width}px`);
  }
});

test('deadline reminder remains interactive after the redesign',async({page})=>{
  await signIn(page);await page.goto('/member/saved-opportunities',{waitUntil:'networkidle'});const card=page.getByRole('article').filter({hasText:title});const checkbox=card.getByRole('checkbox');await expect(checkbox).toBeChecked();await checkbox.uncheck();await expect(checkbox).not.toBeChecked();await expect(card.getByRole('status')).toContainText('Deadline reminder disabled.');await checkbox.check();await expect(checkbox).toBeChecked();await expect(card.getByRole('status')).toContainText('Deadline reminder enabled.');
});
