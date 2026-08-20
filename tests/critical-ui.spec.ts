import {expect,test,type Page} from '@playwright/test';

async function expectNoHorizontalOverflow(page:Page){
  const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(dimensions.scrollWidth,'page must not overflow horizontally').toBeLessThanOrEqual(dimensions.clientWidth+1);
}

async function assertHealthyPage(page:Page,path:string){
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  const response=await page.goto(path,{waitUntil:'networkidle'});
  expect(response?.status(),`${path} should load successfully`).toBeLessThan(400);
  await expect(page.locator('body')).toBeVisible();
  expect(pageErrors,`${path} should not throw in the browser`).toEqual([]);
}

test.describe('critical public journeys',()=>{
  const routes=['/','/projects','/opportunities','/showcase','/events','/faq','/contact','/partnership','/feedback','/newsletter','/careers','/signin','/signin?mode=signup'];
  for(const path of routes)test(`${path} loads without a browser exception`,async({page})=>assertHealthyPage(page,path));

  test('contact form sends the expected API contract and reaches confirmation',async({page})=>{
    let requestBody:Record<string,unknown>|null=null;
    await page.route('**/api/forms',async route=>{
      requestBody=route.request().postDataJSON();
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});
    });
    await page.goto('/contact');
    const form=page.getByRole('button',{name:'Send message →'}).locator('xpath=ancestor::form');
    await form.locator('[name="name"]').fill('Regression Contact');
    await form.locator('[name="email"]').fill('contact@example.test');
    await form.locator('[name="topic"]').selectOption('technical_issue');
    await form.locator('[name="message"]').fill('This verifies that the contact form still sends every required value.');
    await form.locator('[name="consent"]').check();
    await form.getByRole('button',{name:'Send message →'}).click();
    await page.waitForURL(/\/submitted\?type=contact/);
    expect(requestBody).toMatchObject({formType:'contact',data:{name:'Regression Contact',email:'contact@example.test',topic:'technical_issue',consent:'yes'}});
  });

  test('partnership form sends the expected API contract and reaches confirmation',async({page})=>{
    let requestBody:Record<string,unknown>|null=null;
    await page.route('**/api/forms',async route=>{
      requestBody=route.request().postDataJSON();
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});
    });
    await page.goto('/partnership');
    const form=page.getByRole('button',{name:'Submit partnership enquiry →'}).locator('xpath=ancestor::form');
    await form.locator('[name="organisation"]').fill('Regression Organisation');
    await form.locator('[name="country"]').fill('United Kingdom');
    await form.locator('[name="name"]').fill('Regression Partner');
    await form.locator('[name="email"]').fill('partner@example.test');
    await form.locator('[name="role"]').fill('Engineering lead');
    await form.locator('[name="organisationType"]').selectOption('employer');
    await form.locator('[name="partnershipType"]').selectOption('labs_project');
    await form.locator('[name="timeframe"]').selectOption('1_3_months');
    await form.locator('[name="scale"]').selectOption('small_pilot');
    await form.locator('[name="objective"]').fill('Validate the complete partnership intake journey before every release.');
    await form.locator('[name="contribution"]').fill('Provide a safe staging scenario and a clear expected business outcome.');
    await form.locator('[name="consent"]').check();
    await form.getByRole('button',{name:'Submit partnership enquiry →'}).click();
    await page.waitForURL(/\/submitted\?type=partnership/);
    expect(requestBody).toMatchObject({formType:'partnership',data:{organisation:'Regression Organisation',country:'United Kingdom',name:'Regression Partner',organisationType:'employer',partnershipType:'labs_project',timeframe:'1_3_months',scale:'small_pilot',consent:'yes'}});
  });

  test('feedback form sends the expected API contract and reaches confirmation',async({page})=>{
    let requestBody:Record<string,unknown>|null=null;
    await page.route('**/api/forms',async route=>{
      requestBody=route.request().postDataJSON();
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});
    });
    await page.goto('/feedback');
    const form=page.getByRole('button',{name:'Send feedback →'}).locator('xpath=ancestor::form');
    await form.locator('[name="email"]').fill('feedback@example.test');
    await form.locator('[name="kind"]').selectOption('bug');
    await form.locator('[name="area"]').selectOption('navigation_mobile');
    await form.locator('[name="impact"]').selectOption('partial');
    await form.locator('[name="message"]').fill('The regression suite confirms this form remains wired after visual changes.');
    await form.getByRole('button',{name:'Send feedback →'}).click();
    await page.waitForURL(/\/submitted\?type=feedback/);
    expect(requestBody).toMatchObject({formType:'feedback',data:{email:'feedback@example.test',kind:'bug',area:'navigation_mobile',impact:'partial'}});
  });

  test('footer newsletter control sends its JSON contract and reports success',async({page})=>{
    let requestBody:Record<string,unknown>|null=null;
    await page.route('**/api/newsletter',async route=>{
      requestBody=route.request().postDataJSON();
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});
    });
    await page.goto('/');
    const form=page.getByRole('form',{name:'Subscribe to Mettelo updates'});
    await form.getByRole('textbox').fill('  newsletter@example.test  ');
    await form.getByRole('button').click();
    await expect(form.getByRole('status')).toContainText('subscribed');
    expect(requestBody).toMatchObject({email:'newsletter@example.test',preferences:{projects:true,events:true,opportunities:true,insights:true}});
  });

  test('footer newsletter rejects malformed email before calling the API',async({page})=>{
    let requests=0;
    await page.route('**/api/newsletter',async route=>{requests+=1;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});});
    await page.goto('/');
    const form=page.getByRole('form',{name:'Subscribe to Mettelo updates'});
    const input=form.getByRole('textbox');
    await input.fill('not-an-email');
    await form.getByRole('button').click();
    await expect(form.getByRole('alert')).toContainText('valid email address');
    await expect(input).toHaveAttribute('aria-invalid','true');
    expect(requests).toBe(0);
  });

  test('footer newsletter shows a full-width server error below the controls',async({page})=>{
    await page.route('**/api/newsletter',async route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Newsletter signup is temporarily unavailable while we update the service.'})}));
    await page.goto('/');
    const form=page.getByRole('form',{name:'Subscribe to Mettelo updates'});
    await form.getByRole('textbox').fill('newsletter@example.test');
    await form.getByRole('button').click();
    const inline=form.locator('.footerNewsletterInline');
    const message=form.getByRole('alert');
    await expect(message).toBeVisible();
    const layout=await Promise.all([inline.boundingBox(),message.boundingBox()]);
    expect(layout[0]).not.toBeNull();
    expect(layout[1]).not.toBeNull();
    expect(layout[1]!.y).toBeGreaterThanOrEqual(layout[0]!.y+layout[0]!.height);
    expect(layout[1]!.width).toBeGreaterThanOrEqual(layout[0]!.width-1);
  });
});

test.describe('FAQ typography and accordion regression',()=>{
  const cases=[
    {viewport:{width:390,height:844},titleMax:40,questionMax:17},
    {viewport:{width:768,height:1024},titleMax:54,questionMax:19},
    {viewport:{width:1280,height:900},titleMax:65,questionMax:20}
  ];

  for(const item of cases)test(`uses the compact type scale at ${item.viewport.width}px`,async({page})=>{
    await page.setViewportSize(item.viewport);
    await page.goto('/faq');
    await expectNoHorizontalOverflow(page);
    const title=page.locator('#faq-page-title');
    const firstQuestion=page.locator('.faqItem button').first();
    const titleSize=await title.evaluate(element=>parseFloat(getComputedStyle(element).fontSize));
    const questionSize=await firstQuestion.evaluate(element=>parseFloat(getComputedStyle(element).fontSize));
    expect(titleSize).toBeLessThanOrEqual(item.titleMax);
    expect(questionSize).toBeLessThanOrEqual(item.questionMax);

    const alignment=await firstQuestion.evaluate(element=>{
      const button=element.getBoundingClientRect();
      const icon=element.querySelector('.faqIcon')?.getBoundingClientRect();
      return icon?Math.abs((button.top+button.height/2)-(icon.top+icon.height/2)):999;
    });
    expect(alignment,'the expand icon should remain vertically centered').toBeLessThanOrEqual(1);
  });

  test('expands and collapses without changing the compact question hierarchy',async({page})=>{
    await page.setViewportSize({width:1280,height:900});
    await page.goto('/faq');
    const question=page.getByRole('button',{name:'What is Mettelo, and who is it for?'});
    await expect(question).toHaveAttribute('aria-expanded','false');
    await question.click();
    await expect(question).toHaveAttribute('aria-expanded','true');
    await expect(page.getByRole('region',{name:'What is Mettelo, and who is it for?'})).toBeVisible();
  });
});

test.describe('mobile navigation regression',()=>{
  test.use({viewport:{width:390,height:844}});

  test('works on the first open, exposes Explore, traps focus and closes cleanly',async({page})=>{
    await page.goto('/');
    const toggle=page.locator('.mobileMenu > summary');
    await expect(toggle).toHaveAttribute('aria-label','Open menu');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded','true');
    await expect(toggle).toHaveAttribute('aria-label','Close menu');
    await expect(page.locator('.mobileMenuPanel')).toBeVisible();
    await expect(page.getByRole('navigation',{name:'Primary mobile navigation'}).getByRole('link',{name:'Projects'})).toBeVisible();

    const explore=page.getByRole('button',{name:'Explore'});
    await explore.click();
    await expect(explore).toHaveAttribute('aria-expanded','true');
    const explorePanelId=await explore.getAttribute('aria-controls');
    if(!explorePanelId)throw new Error('Visible Explore control must reference its governed panel.');
    await expect(page.locator(`#${explorePanelId}`).getByRole('link',{name:'Careers'})).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded','false');
    await expect(toggle).toHaveAttribute('aria-label','Open menu');

    await toggle.click();
    await page.locator('.mobileMenuBackdrop').click({position:{x:4,y:4}});
    await expect(toggle).toHaveAttribute('aria-expanded','false');
  });
});

test.describe('responsive form release matrix',()=>{
  const viewports=[{width:375,height:812},{width:768,height:1024},{width:1280,height:900}];
  const routes=['/contact','/partnership','/feedback','/newsletter','/careers','/signin?mode=signup'];
  for(const viewport of viewports){
    for(const path of routes){
      test(`${path} fits ${viewport.width}px`,async({page})=>{
        await page.setViewportSize(viewport);
        await page.goto(path,{waitUntil:'networkidle'});
        await expectNoHorizontalOverflow(page);
        const controls=page.locator('main input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]),main select,main textarea,main button');
        for(let index=0;index<await controls.count();index++){
          const control=controls.nth(index);
          if(!await control.isVisible())continue;
          const box=await control.boundingBox();
          if(box)expect(box.height,`control ${index} on ${path} needs a usable touch target`).toBeGreaterThanOrEqual(40);
        }
      });
    }
  }
});
