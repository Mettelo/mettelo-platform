import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';

const applicationId='00000000-0000-4000-8000-00000000e851';
function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required for Admin experience E2E coverage.`);return value;}
function service(){const url=required('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Admin experience fixture refuses non-local Supabase hosts.');return createClient(url,required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});}
async function signInAdmin(page:Page,next='/admin'){await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(required('E2E_ADMIN_EMAIL'));await main.locator('input[type="password"]').fill(required('E2E_ADMIN_PASSWORD'));await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});}
async function seedCareerCandidate(){const db=service();const {data:roles,error:roleError}=await db.from('career_roles').select('id').eq('slug','e2e-local-quality-role').limit(1);if(roleError)throw roleError;const role=roles?.[0];if(!role)throw new Error('E2E career role is missing.');const email=required('E2E_MEMBER_EMAIL').toLowerCase();const {data:users,error:userError}=await db.auth.admin.listUsers({page:1,perPage:1000});if(userError)throw userError;const member=users.users.find(user=>user.email?.toLowerCase()===email);if(!member)throw new Error('E2E member identity is missing.');await db.from('career_applications').delete().eq('role_id',role.id).eq('email',email);const {error}=await db.from('career_applications').insert({id:applicationId,role_id:role.id,user_id:member.id,full_name:'E2E Career Candidate',email,motivation:'I want to help Mettelo ship reliable member experiences.',relevant_experience:'I have evidence-backed Data & AI project delivery experience.',answers:{},status:'shortlisted',location:'London'});if(error)throw error;return{db,roleId:role.id};}
async function noOverflow(page:Page){const size=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth+1);}
async function capture(page:Page,name:string){fs.mkdirSync('artifacts/design-director',{recursive:true});await page.screenshot({path:`artifacts/design-director/${name}.png`,fullPage:true});}
function candidateRow(page:Page){return page.getByRole('row').filter({hasText:'E2E Career Candidate'});}

test.describe('Admin operational experience',()=>{
  test('platform Settings is discoverable and governs social and logo configuration',async({page})=>{
    await signInAdmin(page,'/admin/settings');await page.goto('/admin/settings',{waitUntil:'networkidle'});
    await expect(page.getByRole('link',{name:/Platform settings/})).toHaveAttribute('aria-current','page');
    await expect(page.getByRole('heading',{level:1,name:'Settings'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Logo assets'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Social channels'})).toBeVisible();
    const linkedin=page.getByRole('textbox',{name:'LinkedIn',exact:true});await linkedin.fill('https://www.linkedin.com/company/e2e-mettelo');await linkedin.locator('xpath=ancestor::form').getByRole('button',{name:'Save'}).click();await expect(page.getByRole('status')).toContainText('LinkedIn updated.');
    const logo=page.getByRole('textbox',{name:/^Header \/ light-background logo/});await logo.fill('https://mettelo.com/mettelo-logo-dark.svg');await logo.locator('xpath=ancestor::form').getByRole('button',{name:'Save'}).click();await expect(page.getByRole('status')).toContainText('Header / light-background logo updated.');
    const db=service();const {data}=await db.from('platform_settings').select('setting_key,value').in('setting_key',['social_linkedin','brand_logo_dark_url']);const values=new Map((data||[]).map(row=>[row.setting_key,row.value]));expect(values.get('social_linkedin')).toBe('https://www.linkedin.com/company/e2e-mettelo');expect(values.get('brand_logo_dark_url')).toBe('https://mettelo.com/mettelo-logo-dark.svg');
    await page.goto('/',{waitUntil:'networkidle'});await expect(page.getByRole('link',{name:'Mettelo on LinkedIn'})).toHaveAttribute('href','https://www.linkedin.com/company/e2e-mettelo');await expect(page.locator('.siteHeader .brandLogo')).toHaveAttribute('src','https://mettelo.com/mettelo-logo-dark.svg');
    await page.goto('/admin/settings',{waitUntil:'networkidle'});
    for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.reload({waitUntil:'networkidle'});await noOverflow(page);if(width===390)await capture(page,'admin-settings-mobile-390');if(width===1440)await capture(page,'admin-settings-desktop-1440');}
  });

  test('Admin can book an interview and the selected timezone is persisted correctly',async({page})=>{
    const {db}=await seedCareerCandidate();await signInAdmin(page,'/admin/careers/applications');await page.goto('/admin/careers/applications',{waitUntil:'networkidle'});
    await expect(page.getByRole('heading',{level:1,name:'Candidates & applications'})).toBeVisible();
    await candidateRow(page).getByRole('button',{name:'View →'}).click();await expect(page.getByRole('heading',{name:'E2E Career Candidate'})).toBeVisible();
    await page.getByLabel('Recruitment action').selectOption('interview');await expect(page.getByRole('heading',{name:'Schedule interview'})).toBeVisible();
    await page.getByRole('textbox',{name:/^Date & time/}).fill('2026-08-20T10:00');await page.getByRole('combobox',{name:/^Timezone/}).fill('Europe/London');await page.getByLabel('Format').selectOption({label:'Video call'});await page.getByLabel('Interviewer').fill('E2E Hiring Lead');await page.getByLabel('Meeting URL / joining link').fill('https://meet.example.com/e2e-interview');await page.getByLabel('Candidate instructions').fill('Bring one project example and be ready to discuss your contribution.');await page.getByRole('button',{name:'Schedule & send'}).click();
    await expect(page.getByRole('status')).toContainText('Candidate state updated');await expect(page.getByLabel('Booked interview')).toContainText('20 Aug 2026, 10:00');await expect(page.getByLabel('Booked interview')).toContainText('Europe/London');
    const {data:stored,error}=await db.from('career_applications').select('status,interview_at,interview_timezone,interview_format,interview_url,interviewer').eq('id',applicationId).single();if(error)throw error;expect(stored.status).toBe('interview');expect(new Date(stored.interview_at).toISOString()).toBe('2026-08-20T09:00:00.000Z');expect(stored.interview_timezone).toBe('Europe/London');expect(stored.interview_url).toBe('https://meet.example.com/e2e-interview');
    await page.setViewportSize({width:1440,height:900});await capture(page,'admin-career-booked-desktop-1440');
    await page.reload({waitUntil:'networkidle'});await candidateRow(page).getByRole('button',{name:'View →'}).click();await expect(page.getByLabel('Booked interview')).toContainText('20 Aug 2026, 10:00');await page.getByRole('button',{name:'Reschedule'}).click();await expect(page.getByRole('textbox',{name:/^Date & time/})).toHaveValue('2026-08-20T10:00');await capture(page,'admin-career-reschedule-desktop-1440');
    for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.keyboard.press('Escape');await page.reload({waitUntil:'networkidle'});await noOverflow(page);if(width===390)await capture(page,'admin-careers-queue-mobile-390');}
  });
});
