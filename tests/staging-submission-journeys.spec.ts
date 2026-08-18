import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {expect,test,type BrowserContext,type Page} from '@playwright/test';

const runId=`e2e-${process.env.GITHUB_RUN_ID||Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const marker=`[E2E:${runId}]`;
const created={formIds:[] as string[],projectApplicationIds:[] as string[],careerApplicationIds:[] as string[],careerCvPaths:[] as string[],newsletterEmails:[] as string[]};

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required. Run npm run check:e2e-config first.`);return value;}
function serviceDb(){return createClient(required('E2E_SUPABASE_URL'),required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});}
function baseURL(){return required('E2E_BASE_URL');}

async function poll<T>(description:string,load:()=>Promise<T|null>,timeout=20_000){
  const started=Date.now();
  while(Date.now()-started<timeout){const value=await load();if(value)return value;await new Promise(resolve=>setTimeout(resolve,500));}
  throw new Error(`Timed out waiting for ${description}.`);
}

async function signIn(page:Page,email:string,password:string,next='/member'){
  await page.goto(`${baseURL()}/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});
  const main=page.locator('main');
  await main.locator('input[type="email"]').fill(email);
  await main.locator('input[type="password"]').fill(password);
  await main.getByRole('button',{name:'Sign in →'}).click();
  await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});
}

async function newAppContext(context:BrowserContext){
  const page=await context.newPage();
  page.setDefaultTimeout(20_000);
  return page;
}

async function findForm(db:SupabaseClient,formType:string,key:string,value:string){
  return poll(`${formType} database record`,async()=>{
    const {data,error}=await db.from('form_submissions').select('id,form_type,payload,status,created_at').eq('form_type',formType).order('created_at',{ascending:false}).limit(100);
    if(error)throw error;
    return data?.find(row=>String((row.payload as Record<string,unknown>)?.[key])===value)||null;
  });
}

test.describe.serial('staging submission journeys',()=>{
  test.afterAll(async()=>{
    if(!marker.startsWith('[E2E:'))throw new Error('Cleanup marker guard failed.');
    const db=serviceDb();
    for(const id of created.careerApplicationIds){
      await db.from('career_onboarding_items').delete().eq('application_id',id);
      await db.from('career_application_events').delete().eq('application_id',id);
      await db.from('communication_records').delete().eq('related_type','career_application').eq('related_id',id);
      await db.from('communication_audit_log').delete().eq('entity_type','career_application').eq('entity_id',id);
      await db.from('career_applications').delete().eq('id',id);
    }
    if(created.careerCvPaths.length)await db.storage.from('career-cvs').remove(created.careerCvPaths);
    for(const id of created.projectApplicationIds){
      await db.from('notifications').delete().eq('application_id',id);
      await db.from('project_application_events').delete().eq('application_id',id);
      await db.from('project_applications').delete().eq('id',id);
    }
    for(const id of created.formIds){
      await db.from('notifications').delete().like('dedupe_key',`%${id}%`);
      await db.from('email_outbox').delete().like('dedupe_key',`%${id}%`);
      await db.from('form_submissions').delete().eq('id',id);
    }
    for(const email of created.newsletterEmails){
      await db.from('email_outbox').delete().eq('recipient_email',email);
      await db.from('newsletter_subscribers').delete().eq('email',email);
    }
  });

  test('contact, partnership, feedback and newsletter persist and reach admin operations',async({browser})=>{
    const db=serviceDb();
    const publicContext=await browser.newContext({baseURL:baseURL()});
    const page=await newAppContext(publicContext);

    const contactSubject=`${marker} contact`;
    await page.goto('/contact');
    await page.locator('[name="name"]').fill(`${marker} Contact`);
    await page.locator('main').locator('[name="email"]').fill(`${runId}-contact@example.test`);
    await page.locator('[name="topic"]').selectOption({label:'Technical issue'});
    await page.locator('[name="subject"]').fill(contactSubject);
    await page.locator('[name="message"]').fill(`${marker} verifies browser to API to database to admin intake.`);
    await page.locator('[name="consent"]').check();
    await page.getByRole('button',{name:'Send message →'}).click();
    await page.waitForURL(/\/submitted\?type=contact/);
    const contact=await findForm(db,'contact','subject',contactSubject);created.formIds.push(contact.id);

    const partnershipOrganisation=`${marker} Organisation`;
    await page.goto('/partnership');
    await page.locator('[name="organisation"]').fill(partnershipOrganisation);
    await page.locator('[name="name"]').fill(`${marker} Partner`);
    await page.locator('main').locator('[name="email"]').fill(`${runId}-partner@example.test`);
    await page.locator('[name="role"]').fill('E2E lead');
    await page.locator('[name="organisationType"]').selectOption({index:1});
    await page.locator('[name="partnershipType"]').selectOption({index:1});
    await page.locator('[name="objective"]').fill(`${marker} validate the complete intake workflow.`);
    await page.locator('[name="contribution"]').fill(`${marker} provide a deterministic staging test.`);
    await page.locator('[name="consent"]').check();
    await page.getByRole('button',{name:'Submit partnership enquiry →'}).click();
    await page.waitForURL(/\/submitted\?type=partnership/);
    const partnership=await findForm(db,'partnership','organisation',partnershipOrganisation);created.formIds.push(partnership.id);

    const feedbackMessage=`${marker} confirms feedback reaches the admin queue.`;
    await page.goto('/feedback');
    await page.locator('main').locator('[name="email"]').fill(`${runId}-feedback@example.test`);
    await page.locator('[name="area"]').selectOption({label:'Navigation / mobile'});
    await page.locator('[name="message"]').fill(feedbackMessage);
    await page.getByRole('button',{name:'Send feedback →'}).click();
    await page.waitForURL(/\/submitted\?type=feedback/);
    const feedback=await findForm(db,'feedback','message',feedbackMessage);created.formIds.push(feedback.id);

    const newsletterEmail=`${runId}-newsletter@example.test`;created.newsletterEmails.push(newsletterEmail);
    await page.goto('/newsletter');
    await page.locator('main').locator('[name="email"]').fill(newsletterEmail);
    await page.getByRole('button',{name:'Subscribe →'}).click();
    await page.waitForURL(/\/newsletter\?subscribed=1/);
    await poll('newsletter database record',async()=>{const {data,error}=await db.from('newsletter_subscribers').select('email,status').eq('email',newsletterEmail).maybeSingle();if(error)throw error;return data;});
    await poll('newsletter outbox record',async()=>{const {data,error}=await db.from('email_outbox').select('id').eq('recipient_email',newsletterEmail).limit(1);if(error)throw error;return data?.[0]||null;});
    await publicContext.close();

    for(const id of created.formIds)await poll(`admin notification for form ${id}`,async()=>{const {data,error}=await db.from('notifications').select('id').like('dedupe_key',`%${id}%`).limit(1);if(error)throw error;return data?.[0]||null;});

    const adminContext=await browser.newContext({baseURL:baseURL()});
    const adminPage=await newAppContext(adminContext);
    await signIn(adminPage,required('E2E_ADMIN_EMAIL'),required('E2E_ADMIN_PASSWORD'),'/admin/intake');
    await adminPage.goto('/admin/intake',{waitUntil:'networkidle'});
    await expect(adminPage.locator('body')).toContainText(marker);
    await adminContext.close();
  });

  test('project interest persists, appears in the admin queue and creates notifications',async({browser})=>{
    const db=serviceDb();
    const memberEmail=required('E2E_MEMBER_EMAIL');
    const {data:users,error:userError}=await db.auth.admin.listUsers({page:1,perPage:1000});if(userError)throw userError;
    const member=users.users.find(user=>user.email?.toLowerCase()===memberEmail.toLowerCase());
    if(!member)throw new Error('E2E member account was not found in the staging Supabase project.');
    const {data:project,error:projectError}=await db.from('projects').select('id,title,status,visibility').eq('slug','e2e-local-release-project').eq('visibility','public').single();if(projectError)throw projectError;
    const {data:existing,error:existingError}=await db.from('project_applications').select('id,contribution_statement').eq('project_id',project.id).eq('user_id',member.id).neq('status','withdrawn');if(existingError)throw existingError;
    const disposable=(existing||[]).filter(row=>String(row.contribution_statement||'').startsWith('[E2E:'));
    for(const row of disposable)await db.from('project_applications').delete().eq('id',row.id);
    if((existing||[]).length!==disposable.length)throw new Error('The deterministic E2E project already has a non-disposable application for the local member fixture.');

    const memberContext=await browser.newContext({baseURL:baseURL()});
    const memberPage=await newAppContext(memberContext);
    await signIn(memberPage,memberEmail,required('E2E_MEMBER_PASSWORD'),'/projects');
    const response=await memberPage.evaluate(async payload=>{
      const result=await fetch('/api/project-applications',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      return{status:result.status,body:await result.json()};
    },{project_id:project.id,application_kind:'interest',requested_role:'Quality assurance',contribution_statement:`${marker} can protect the project application workflow from regressions.`,availability:'E2E only'});
    expect(response.status,JSON.stringify(response.body)).toBe(200);
    const applicationId=String(response.body.application?.id||'');expect(applicationId).not.toBe('');created.projectApplicationIds.push(applicationId);
    await memberContext.close();

    await poll('project application database row',async()=>{const {data,error}=await db.from('project_applications').select('id,status').eq('id',applicationId).maybeSingle();if(error)throw error;return data;});
    await poll('member/admin project notification',async()=>{const {data,error}=await db.from('notifications').select('id').eq('application_id',applicationId).limit(1);if(error)throw error;return data?.[0]||null;});

    const adminContext=await browser.newContext({baseURL:baseURL()});
    const adminPage=await newAppContext(adminContext);
    await signIn(adminPage,required('E2E_ADMIN_EMAIL'),required('E2E_ADMIN_PASSWORD'),'/admin/project-operations/applications');
    await adminPage.goto('/admin/project-operations/applications',{waitUntil:'networkidle'});
    await expect(adminPage.locator('body')).toContainText(marker);
    await adminContext.close();
  });

  test('career application survives review, persists, appears in admin and records communication',async({browser})=>{
    const db=serviceDb();
    const {data:role,error}=await db.from('career_roles').select('id,slug,title,application_questions').eq('slug','e2e-local-quality-role').eq('status','published').maybeSingle();if(error)throw error;
    if(!role)throw new Error('The deterministic published E2E career role is missing.');
    const email=`${runId}-career@example.test`;
    const context=await browser.newContext({baseURL:baseURL()});
    const page=await newAppContext(context);
    await page.goto(`/careers/${role.slug}`,{waitUntil:'networkidle'});
    await page.locator('[name="full_name"]').fill(`${marker} Candidate`);
    await page.locator('main').locator('[name="email"]').fill(email);
    await page.locator('[name="location"]').fill('Staging');
    await page.locator('[name="motivation"]').fill(`${marker} I want to protect Mettelo releases by validating every critical customer and administrator journey before deployment.`);
    await page.locator('[name="relevant_experience"]').fill(`${marker} I have delivered end-to-end automated testing across responsive interfaces, API contracts, relational data persistence, access control and operational queues.`);
    const questions=page.locator('textarea[name^="question_"]');
    for(let index=0;index<await questions.count();index++)await questions.nth(index).fill(`${marker} This deterministic answer validates a role-specific field.`);
    await page.locator('[name="cv"]').setInputFiles({name:`${runId}.pdf`,mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n% E2E fixture\n')});
    await page.getByRole('button',{name:'Review application →'}).click();
    await expect(page.getByRole('heading',{name:'Check your application before submitting'})).toBeVisible();
    await page.getByRole('button',{name:'Confirm & submit application'}).click();
    await page.waitForURL(/\/submitted\?type=career_application/,{timeout:30_000});
    await context.close();

    const application=await poll('career application database row',async()=>{const {data,error:loadError}=await db.from('career_applications').select('id,cv_path,status').eq('email',email).maybeSingle();if(loadError)throw loadError;return data;},30_000);
    created.careerApplicationIds.push(application.id);created.careerCvPaths.push(application.cv_path);
    await poll('career communication record',async()=>{const {data,error:loadError}=await db.from('communication_records').select('id').eq('related_type','career_application').eq('related_id',application.id).limit(1);if(loadError)throw loadError;return data?.[0]||null;});

    const adminContext=await browser.newContext({baseURL:baseURL()});
    const adminPage=await newAppContext(adminContext);
    await signIn(adminPage,required('E2E_ADMIN_EMAIL'),required('E2E_ADMIN_PASSWORD'),'/admin/careers');
    await adminPage.goto('/admin/careers',{waitUntil:'networkidle'});
    await expect(adminPage.locator('body')).toContainText(marker);
    await adminContext.close();
  });
});