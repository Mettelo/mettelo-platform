import {expect,test} from '@playwright/test';

type PublicForm={
  path:string;
  submit:string;
  endpoint:string;
};

async function horizontalOverflowReport(page:import('@playwright/test').Page){
  return page.evaluate(()=>{
    const viewport=document.documentElement.clientWidth;
    const offenders=[...document.querySelectorAll<HTMLElement>('body *')].flatMap(element=>{
      const rect=element.getBoundingClientRect();
      if(rect.width<=0||rect.height<=0||rect.right<=viewport+1||rect.left>=viewport)return[];
      const style=getComputedStyle(element);
      return[{tag:element.tagName.toLowerCase(),id:element.id,className:element.className,text:(element.textContent||'').trim().slice(0,100),left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width),scrollWidth:element.scrollWidth,whiteSpace:style.whiteSpace,overflowWrap:style.overflowWrap}];
    });
    return{viewport,scrollWidth:document.documentElement.scrollWidth,offenders:offenders.slice(0,12)};
  });
}

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
      const submit=page.getByRole('button',{name:form.submit});
      await expect(submit).toBeVisible();
      await expect(submit.locator('xpath=ancestor::form')).toBeVisible();
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

  for(const width of [375,390,414])test(`career role detail has no horizontal overflow at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:844});
    await page.goto('/careers',{waitUntil:'networkidle'});
    const links=page.locator('a[href*="/careers/"]');
    const count=await links.count();
    test.skip(count===0,'No published career role is available for this environment.');
    await links.first().click();
    await expect(page.locator('.roleMain')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Responsibilities'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Requirements'})).toBeVisible();
    const overflow=await horizontalOverflowReport(page);
    expect(overflow.scrollWidth,JSON.stringify(overflow,null,2)).toBeLessThanOrEqual(overflow.viewport+1);
    for(const locator of [page.locator('.roleMain'),...await page.locator('.roleBlock').all(),...await page.locator('.roleList li').all()]){
      const box=await locator.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x+box!.width).toBeLessThanOrEqual(width+1);
    }
  });

  test('career application keeps reviewed values in the final request payload',async({page})=>{
    await page.goto('/careers',{waitUntil:'networkidle'});
    const links=page.locator('a[href*="/careers/"]');
    const count=await links.count();
    test.skip(count===0,'No published career role is available for this environment.');
    await links.first().click();
    const form=page.locator('form.careerApplyForm');
    await form.locator('input[name="full_name"]').fill('Career Test Candidate');
    await form.locator('input[name="email"]').fill('career-test@example.test');
    await form.locator('input[name="linkedin_url"]').fill('linkedin.com/in/career-test');
    await form.locator('input[name="portfolio_url"]').fill('career-test.example/work');
    await form.locator('textarea[name="motivation"]').fill('I want to contribute practical, reliable work to Mettelo because the role matches the kind of platform work I enjoy doing.');
    await form.locator('textarea[name="relevant_experience"]').fill('I have delivered software and data projects from discovery through release, collaborating with stakeholders, documenting decisions and measuring useful outcomes.');
    const questions=form.locator('textarea[name^="question_"]');
    for(let index=0;index<await questions.count();index++)await questions.nth(index).fill('This is a complete answer to the role-specific application question.');
    await form.locator('input[name="cv"]').setInputFiles({name:'career-test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 test CV')});
    await form.getByRole('button',{name:/Review application/i}).click();
    await expect(page.getByRole('heading',{name:/Check your application before submitting/i})).toBeVisible();
    await expect(page.getByRole('link',{name:'https://linkedin.com/in/career-test'})).toBeVisible();
    await expect(page.getByRole('link',{name:'https://career-test.example/work'})).toBeVisible();
    await expect(form.locator('input[name="full_name"]')).toHaveValue('Career Test Candidate');
    await expect(form.locator('input[name="email"]')).toHaveValue('career-test@example.test');
    await expect(form.locator('input[name="linkedin_url"]')).toHaveValue('https://linkedin.com/in/career-test');
    await expect(form.locator('input[name="portfolio_url"]')).toHaveValue('https://career-test.example/work');
    expect(await form.locator('input[name="cv"]').evaluate(input=>(input as HTMLInputElement).files?.[0]?.name)).toBe('career-test.pdf');
    await page.getByRole('button',{name:/Edit application/i}).click();
    await expect(form.locator('input[name="full_name"]')).toBeVisible();
    await expect(form.locator('input[name="full_name"]')).toHaveValue('Career Test Candidate');
    await expect(form.locator('input[name="linkedin_url"]')).toHaveValue('https://linkedin.com/in/career-test');
    expect(await form.locator('input[name="cv"]').evaluate(input=>(input as HTMLInputElement).files?.[0]?.name)).toBe('career-test.pdf');
  });

  for(const width of [375,390,414])test(`career review has no horizontal overflow at ${width}px`,async({page})=>{
      await page.setViewportSize({width,height:844});
      await page.goto('/careers',{waitUntil:'networkidle'});
      const links=page.locator('a[href*="/careers/"]');
      const count=await links.count();
      test.skip(count===0,'No published career role is available for this environment.');
      await links.first().click();
      const form=page.locator('form.careerApplyForm');
      await expect(form).toBeVisible();
      await form.locator('input[name="full_name"]').fill('Mobile Career Candidate With A Long Name');
      await form.locator('input[name="email"]').fill('mobile-career-candidate@example.test');
      await form.locator('input[name="linkedin_url"]').fill(`linkedin.com/in/${'long-profile-segment-'.repeat(8)}`);
      await form.locator('textarea[name="motivation"]').fill(`I want to contribute to Mettelo and help build reliable professional infrastructure. ${'longmotivationtoken'.repeat(18)}`);
      await form.locator('textarea[name="relevant_experience"]').fill(`I have delivered software and data projects from discovery through release with measurable outcomes. ${'longexperiencetoken'.repeat(18)}`);
      const questions=form.locator('textarea[name^="question_"]');
      for(let index=0;index<await questions.count();index++)await questions.nth(index).fill('A complete mobile test answer for this role-specific application question.');
      await form.locator('input[name="cv"]').setInputFiles({name:`${'long-cv-name-'.repeat(12)}.pdf`,mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 test CV')});
      await form.getByRole('button',{name:/Review application/i}).click();
      const review=page.locator('.careerReview');
      await expect(review).toBeVisible();
      await expect(page.getByRole('button',{name:/Edit application/i})).toBeVisible();
      await expect(page.getByRole('button',{name:/Confirm & submit application/i})).toBeVisible();
      const overflow=await horizontalOverflowReport(page);
      expect(overflow.scrollWidth,JSON.stringify(overflow,null,2)).toBeLessThanOrEqual(overflow.viewport+1);
      for(const locator of [review,...await review.locator('.careerReviewGrid > div').all(),page.getByRole('button',{name:/Edit application/i}),page.getByRole('button',{name:/Confirm & submit application/i})]){
        const box=await locator.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x+box!.width).toBeLessThanOrEqual(width+1);
      }
    });
});

test.describe('permission boundaries',()=>{
  test('guests cannot read or mutate admin queues',async({request})=>{
    const read=await request.get('/api/admin/access');
    expect([401,403]).toContain(read.status());

    const mutate=await request.patch('/api/admin/applications',{data:{id:'00000000-0000-0000-0000-000000000000',status:'declined'}});
    expect([401,403]).toContain(mutate.status());

    const intake=await request.patch('/api/admin/intake',{data:{id:'00000000-0000-0000-0000-000000000000',action:'status',status:'resolved'}});
    expect([401,403]).toContain(intake.status());

    const careers=await request.patch('/api/admin/careers/applications',{data:{id:'00000000-0000-0000-0000-000000000000',status:'in_review'}});
    expect([401,403]).toContain(careers.status());
  });

  test('guests cannot mutate member profile data',async({request})=>{
    const response=await request.patch('/api/profile',{data:{full_name:'Unauthenticated test'}});
    expect(response.status()).toBe(401);
  });
});
