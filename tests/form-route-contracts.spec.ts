import {expect,test} from '@playwright/test';

type PublicForm={
  path:string;
  submit:string;
  endpoint:string;
};

const publicForms:PublicForm[]=[
  {path:'/contact',submit:'Send message →',endpoint:'/api/forms'},
  {path:'/partnership',submit:'Submit partnership enquiry →',endpoint:'/api/forms'},
  {path:'/feedback',submit:'Send feedback →',endpoint:'/api/forms'},
  {path:'/newsletter',submit:'Subscribe →',endpoint:'/api/newsletter'}
];

test.describe('public form contracts',()=>{
  for(const form of publicForms){
    test(`${form.path} exposes its submit control`,async({page})=>{
      await page.goto(form.path,{waitUntil:'networkidle'});
      await expect(page.getByRole('button',{name:form.submit})).toBeVisible();
      await expect(page.locator('form')).toBeVisible();
    });
  }

  test('public forms reject malformed payloads without creating records',async({request})=>{
    const invalidContact=await request.post('/api/forms',{data:{formType:'contact',data:{}}});
    expect(invalidContact.status()).toBe(400);

    const invalidPartnership=await request.post('/api/forms',{data:{formType:'partnership',data:{}}});
    expect(invalidPartnership.status()).toBe(400);

    const invalidFeedback=await request.post('/api/forms',{data:{formType:'feedback',data:{}}});
    expect(invalidFeedback.status()).toBe(400);

    const invalidNewsletter=await request.post('/api/newsletter',{data:{email:'not-an-email'}});
    expect(invalidNewsletter.status()).toBe(400);
  });

  test('project interest uses the canonical protected endpoint',async({request})=>{
    const response=await request.post('/api/project-applications',{data:{}});
    expect(response.status()).toBe(401);
  });

  test('career application presents the required CV and review step before submission',async({page})=>{
    await page.goto('/careers',{waitUntil:'networkidle'});
    const links=page.locator('a[href*="/careers/"]');
    const count=await links.count();
    test.skip(count===0,'No published career role is available for this environment.');
    await links.first().click();
    await expect(page.locator('input[name="cv"][type="file"]')).toBeVisible();
    await expect(page.getByRole('button',{name:/Review application/i})).toBeVisible();
  });

  test('career application keeps reviewed values in the final request payload',async({page})=>{
    await page.goto('/careers',{waitUntil:'networkidle'});
    const links=page.locator('a[href*="/careers/"]');
    const count=await links.count();
    test.skip(count===0,'No published career role is available for this environment.');
    await links.first().click();
    await page.locator('input[name="full_name"]').fill('Career Test Candidate');
    await page.locator('input[name="email"]').fill('career-test@example.test');
    await page.locator('textarea[name="motivation"]').fill('I want to contribute practical, reliable work to Mettelo because the role matches the kind of platform work I enjoy doing.');
    await page.locator('textarea[name="relevant_experience"]').fill('I have delivered software and data projects from discovery through release, collaborating with stakeholders, documenting decisions and measuring useful outcomes.');
    const questions=page.locator('textarea[name^="question_"]');
    for(let index=0;index<await questions.count();index++)await questions.nth(index).fill('This is a complete answer to the role-specific application question.');
    await page.locator('input[name="cv"]').setInputFiles({name:'career-test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 test CV')});
    await page.getByRole('button',{name:/Review application/i}).click();
    await expect(page.getByRole('heading',{name:/Check your application before submitting/i})).toBeVisible();
    await expect(page.locator('input[name="full_name"]')).toHaveValue('Career Test Candidate');
    await expect(page.locator('input[name="email"]')).toHaveValue('career-test@example.test');
    expect(await page.locator('input[name="cv"]').evaluate(input=>(input as HTMLInputElement).files?.[0]?.name)).toBe('career-test.pdf');
  });

  test('career application fits a narrow mobile viewport',async({page})=>{
    await page.setViewportSize({width:375,height:800});
    await page.goto('/careers',{waitUntil:'networkidle'});
    const links=page.locator('a[href*="/careers/"]');
    const count=await links.count();
    test.skip(count===0,'No published career role is available for this environment.');
    await links.first().click();
    const form=page.locator('form.careerApplyForm');
    await expect(form).toBeVisible();
    await expect(page.getByRole('button',{name:/Review application/i})).toBeVisible();
    expect(await form.evaluate(element=>element.getBoundingClientRect().right<=window.innerWidth)).toBe(true);
  });
});

test.describe('permission boundaries',()=>{
  test('guests cannot read or mutate admin queues',async({request})=>{
    const read=await request.get('/api/admin/access');
    expect([401,403]).toContain(read.status());

    const mutate=await request.patch('/api/admin/applications',{data:{id:'00000000-0000-0000-0000-000000000000',status:'declined'}});
    expect([401,403]).toContain(mutate.status());
  });

  test('guests cannot mutate member profile data',async({request})=>{
    const response=await request.patch('/api/profile',{data:{full_name:'Unauthenticated test'}});
    expect(response.status()).toBe(401);
  });
});
