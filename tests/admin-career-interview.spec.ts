import {expect,test,type Page} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';

type Credentials={email:string;password:string};
function credentials():Credentials{const email=process.env.E2E_ADMIN_EMAIL?.trim();const password=process.env.E2E_ADMIN_PASSWORD;if(!email||!password)throw new Error('Missing E2E admin credentials.');return{email,password}}
function serviceDb(){const url=process.env.E2E_SUPABASE_URL?.trim();const key=process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();if(!url||!key)throw new Error('Missing isolated Supabase E2E service credentials.');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Career interview test refuses non-local Supabase.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function signIn(page:Page,next:string){const account=credentials();await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}

test.describe('Admin career interview scheduling',()=>{
 test('Schedule & send validates visibly, persists interview state and queues candidate communication',async({page})=>{
  test.setTimeout(90_000);
  const db=serviceDb();const marker=`E2E Interview ${Date.now()}`;const candidateEmail=`career-interview-${Date.now()}@example.test`;
  const {data:role,error:roleError}=await db.from('career_roles').select('id').eq('slug','e2e-local-quality-role').single();if(roleError||!role)throw roleError||new Error('E2E career role not found.');
  const {data:application,error:createError}=await db.from('career_applications').insert({role_id:role.id,full_name:marker,email:candidateEmail,motivation:'Deterministic motivation for the isolated Admin interview workflow regression test.',relevant_experience:'Deterministic relevant experience for the isolated Admin interview workflow regression test.',answers:{},status:'shortlisted'}).select('id').single();if(createError||!application)throw createError||new Error('Unable to seed career application.');
  try{
   await signIn(page,'/admin/careers/applications');await page.goto('/admin/careers/applications',{waitUntil:'networkidle'});
   const search=page.getByRole('searchbox',{name:'Search candidates'});await search.fill(marker);await expect(page.getByText(marker,{exact:true})).toBeVisible();await page.getByRole('button',{name:'View →'}).click();
   const action=page.getByRole('combobox',{name:'Recruitment action'});await action.selectOption('interview');
   const composer=page.getByRole('dialog',{name:'Schedule interview'});await expect(composer).toBeVisible();
   const send=composer.getByRole('button',{name:'Schedule & send'});await expect(send).toBeEnabled();await send.click();
   await expect(composer.getByRole('status')).toContainText('Choose the interview date and time');
   const starts=new Date(Date.now()+3*24*60*60*1000);const local=`${starts.getFullYear()}-${String(starts.getMonth()+1).padStart(2,'0')}-${String(starts.getDate()).padStart(2,'0')}T10:30`;
   await composer.getByLabel('Date & time').fill(local);await composer.getByLabel('Meeting URL / joining link').fill('https://meet.example.test/e2e-interview');await send.click();
   await expect(composer).toBeHidden({timeout:60_000});
   const {data:updated,error:updateError}=await db.from('career_applications').select('status,interview_at,interview_timezone,interview_format,interview_url').eq('id',application.id).single();if(updateError)throw updateError;expect(updated.status).toBe('interview');expect(updated.interview_at).toBeTruthy();expect(updated.interview_timezone).toBe('Europe/London');expect(updated.interview_format).toBe('Video call');expect(updated.interview_url).toBe('https://meet.example.test/e2e-interview');
   const {data:outbox,error:outboxError}=await db.from('email_outbox').select('id,status,template_key').eq('recipient_email',candidateEmail).eq('template_key','career_interview').order('created_at',{ascending:false}).limit(1).maybeSingle();if(outboxError)throw outboxError;expect(outbox).toBeTruthy();expect(['pending','processing','retry','retrying','sent']).toContain(outbox?.status);
   const {data:record,error:recordError}=await db.from('communication_records').select('id,status,template_key').eq('recipient_email',candidateEmail).eq('template_key','career_interview').order('created_at',{ascending:false}).limit(1).maybeSingle();if(recordError)throw recordError;expect(record).toBeTruthy();
  }finally{
   await db.from('communication_records').delete().eq('recipient_email',candidateEmail);
   await db.from('email_outbox').delete().eq('recipient_email',candidateEmail);
   await db.from('career_application_events').delete().eq('application_id',application.id);
   await db.from('career_applications').delete().eq('id',application.id);
  }
 });
});
