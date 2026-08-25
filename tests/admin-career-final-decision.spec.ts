import {expect,test,type Page} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';

function serviceDb(){const url=process.env.E2E_SUPABASE_URL?.trim();const key=process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();if(!url||!key)throw new Error('Missing isolated Supabase E2E service credentials.');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Career final-decision test refuses non-local Supabase.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function signIn(page:Page,next:string){const email=process.env.E2E_ADMIN_EMAIL?.trim();const password=process.env.E2E_ADMIN_PASSWORD;if(!email||!password)throw new Error('Missing E2E admin credentials.');await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(email);await main.locator('input[type="password"]').fill(password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}

test.describe('Admin career final decision',()=>{
 test('Hired outcome, hired message and formal offer remain independent actions',async({page})=>{
  test.setTimeout(120_000);const db=serviceDb();const marker=`E2E Final ${Date.now()}`;const candidateEmail=`career-final-${Date.now()}@example.test`;
  const {data:role,error:roleError}=await db.from('career_roles').select('id').eq('slug','e2e-local-quality-role').single();if(roleError||!role)throw roleError||new Error('E2E career role not found.');
  const {data:application,error:createError}=await db.from('career_applications').insert({role_id:role.id,full_name:marker,email:candidateEmail,motivation:'Deterministic final-decision workflow test.',relevant_experience:'Deterministic relevant experience.',answers:{},status:'interview',final_outcome:'pending',offer_status:'not_prepared'}).select('id').single();if(createError||!application)throw createError||new Error('Unable to seed career application.');
  try{
   await signIn(page,'/admin/careers/applications');await page.goto('/admin/careers/applications',{waitUntil:'networkidle'});await page.getByRole('searchbox',{name:'Search candidates'}).fill(marker);await page.getByRole('button',{name:'View →'}).click();const detail=page.getByRole('dialog',{name:new RegExp(marker)});
   await detail.getByRole('button',{name:'Hired',exact:true}).click();await expect(page.getByRole('status')).toContainText('No candidate communication was sent');
   const {data:outcomeRow,error:outcomeError}=await db.from('career_applications').select('status,final_outcome,offer_status').eq('id',application.id).single();if(outcomeError)throw outcomeError;expect(outcomeRow.status).toBe('interview');expect(outcomeRow.final_outcome).toBe('hired');expect(outcomeRow.offer_status).toBe('not_prepared');
   const {data:premature}=await db.from('email_outbox').select('id').eq('recipient_email',candidateEmail).in('template_key',['career_hired','career_offer']);expect(premature||[]).toHaveLength(0);

   await detail.getByRole('button',{name:'Send hired notification'}).click();const hired=page.getByRole('dialog',{name:'Send successful-candidate notification'});await expect(hired.getByText(candidateEmail,{exact:true})).toBeVisible();await expect(hired.getByLabel('Message')).toContainText('formal offer');await hired.getByRole('button',{name:'Send hired notification'}).click();await expect(hired).toBeHidden({timeout:60_000});
   const {data:hiredOutbox}=await db.from('email_outbox').select('id').eq('recipient_email',candidateEmail).eq('template_key','career_hired').limit(1).maybeSingle();expect(hiredOutbox).toBeTruthy();

   await detail.getByRole('button',{name:'Prepare & Send Offer'}).click();const offer=page.getByRole('dialog',{name:'Prepare & send formal offer'});await expect(offer.getByText(candidateEmail,{exact:true})).toBeVisible();await offer.getByLabel('Start date').fill('2026-09-15');await offer.getByLabel('Employment type').fill('Permanent');await offer.getByLabel('Acceptance deadline').fill('2026-09-01T17:00');await offer.getByRole('button',{name:'Send Offer'}).click();await expect(offer).toBeHidden({timeout:60_000});
   const {data:finalRow,error:finalError}=await db.from('career_applications').select('status,final_outcome,offer_status,offer_start_date').eq('id',application.id).single();if(finalError)throw finalError;expect(finalRow.status).toBe('interview');expect(finalRow.final_outcome).toBe('hired');expect(['ready','sent']).toContain(finalRow.offer_status);expect(finalRow.offer_start_date).toBe('2026-09-15');
   const {data:offerOutbox}=await db.from('email_outbox').select('id').eq('recipient_email',candidateEmail).eq('template_key','career_offer').limit(1).maybeSingle();expect(offerOutbox).toBeTruthy();
  }finally{
   await db.from('communication_records').delete().eq('recipient_email',candidateEmail);await db.from('email_outbox').delete().eq('recipient_email',candidateEmail);await db.from('communication_audit_log').delete().eq('entity_id',application.id);await db.from('career_application_events').delete().eq('application_id',application.id);await db.from('career_onboarding_items').delete().eq('application_id',application.id);await db.from('career_offer_documents').delete().eq('application_id',application.id);await db.from('career_applications').delete().eq('id',application.id);
  }
 });
});
