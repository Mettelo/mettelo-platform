import {expect,test} from '@playwright/test';

const criticalRoutes=['/','/projects','/opportunities','/showcase','/events','/faq','/contact','/partnership','/feedback','/newsletter','/careers','/signin','/signin?mode=signup'];

async function expectNoPageOverflow(page:import('@playwright/test').Page,label:string){
  const widths=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(widths.scrollWidth,label).toBeLessThanOrEqual(widths.clientWidth);
}

async function assertNoBrowserException(page:import('@playwright/test').Page,path:string){
  const exceptions:string[]=[];
  page.on('pageerror',error=>exceptions.push(error.message));
  const response=await page.goto(path,{waitUntil:'domcontentloaded'});
  expect(response?.status(),`${path} returned an unexpected HTTP status`).toBeLessThan(500);
  expect(exceptions,`${path} raised browser exceptions`).toEqual([]);
}

test.describe('critical public journeys',()=>{
  for(const route of criticalRoutes)test(`${route} loads without a browser exception`,async({page})=>assertNoBrowserException(page,route));

  test('contact form sends the expected API contract and reaches confirmation',async({page})=>{
    let payload:Record<string,unknown>|null=null;
    await page.route('**/api/forms',async route=>{payload=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,reference:'E2E-CONTACT'})})});
    await page.goto('/contact');
    await page.locator('input[name="name"]').fill('Release Test');
    await page.locator('input[name="email"]').fill('release@example.test');
    await page.locator('select[name="topic"]').selectOption('general');
    await page.locator('textarea[name="message"]').fill('Release test message with enough context.');
    await page.locator('input[name="consent"]').check();
    await page.getByRole('button',{name:'Send message →'}).click();
    await expect(page.getByText('Message received')).toBeVisible();
    expect(payload).toMatchObject({formType:'contact',name:'Release Test',email:'release@example.test',topic:'general'});
  });

  test('partnership form sends the expected API contract and reaches confirmation',async({page})=>{
    let payload:Record<string,unknown>|null=null;
    await page.route('**/api/forms',async route=>{payload=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,reference:'E2E-PARTNER'})})});
    await page.goto('/partnership');
    const form=page.locator('form').filter({has:page.getByRole('button',{name:/Submit partnership enquiry/})});
    await form.locator('input[name="name"]').fill('Partner Test');
    await form.locator('input[name="email"]').fill('partner@example.test');
    await form.locator('input[name="organisation"]').fill('Example Organisation');
    await form.locator('select[name="partnership_type"]').selectOption({index:1});
    await form.locator('textarea[name="context"]').fill('A realistic partnership context for the release regression suite.');
    await form.locator('input[name="consent"]').check();
    await form.getByRole('button',{name:/Submit partnership enquiry/}).click();
    await expect(page.getByText(/Partnership enquiry received|Thank you/i)).toBeVisible();
    expect(payload).toMatchObject({formType:'partnership',name:'Partner Test',email:'partner@example.test',organisation:'Example Organisation'});
  });

  test('feedback form sends the expected API contract and reaches confirmation',async({page})=>{
    let payload:Record<string,unknown>|null=null;
    await page.route('**/api/forms',async route=>{payload=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,reference:'E2E-FEEDBACK'})})});
    await page.goto('/feedback');
    await page.locator('input[name="name"]').fill('Feedback Test');
    await page.locator('input[name="email"]').fill('feedback@example.test');
    await page.locator('select[name="feedback_type"]').selectOption({index:1});
    await page.locator('select[name="area"]').selectOption({index:1});
    await page.locator('textarea[name="message"]').fill('A useful release feedback message.');
    await page.locator('input[name="consent"]').check();
    await page.getByRole('button',{name:/Send feedback/}).click();
    await expect(page.getByText(/Feedback received|Thank you/i)).toBeVisible();
    expect(payload).toMatchObject({formType:'feedback',name:'Feedback Test',email:'feedback@example.test'});
  });

  test('footer newsletter control sends its JSON contract and reports success',async({page})=>{
    let payload:Record<string,unknown>|null=null;
    await page.route('**/api/newsletter',async route=>{payload=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})})});
    await page.goto('/');
    const form=page.locator('.footerNewsletterForm');
    await form.locator('input[type="email"]').fill('newsletter@example.test');
    await form.getByRole('button',{name:/Subscribe/}).click();
    await expect(form.locator('.footerNewsletterStatus')).toContainText(/subscribed|check your inbox|thank/i);
    expect(payload).toMatchObject({email:'newsletter@example.test'});
  });

  test('footer newsletter rejects malformed email before calling the API',async({page})=>{
    let calls=0;
    await page.route('**/api/newsletter',async route=>{calls++;await route.fulfill({status:200,body:'{}'})});
    await page.goto('/');
    const form=page.locator('.footerNewsletterForm');
    await form.locator('input[type="email"]').fill('not-an-email');
    await form.getByRole('button',{name:/Subscribe/}).click();
    await expect(form.locator('.footerNewsletterStatus')).toBeVisible();
    expect(calls).toBe(0);
  });

  test('footer newsletter shows a full-width server error below the controls',async({page})=>{
    await page.route('**/api/newsletter',async route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Subscription service unavailable.'})}));
    await page.goto('/');
    const form=page.locator('.footerNewsletterForm');
    await form.locator('input[type="email"]').fill('newsletter@example.test');
    await form.getByRole('button',{name:/Subscribe/}).click();
    const status=form.locator('.footerNewsletterStatus');
    await expect(status).toBeVisible();
    const [formBox,statusBox]=await Promise.all([form.boundingBox(),status.boundingBox()]);
    expect(formBox).not.toBeNull();expect(statusBox).not.toBeNull();
    if(formBox&&statusBox){expect(statusBox.width).toBeGreaterThan(formBox.width*.8);expect(statusBox.y).toBeGreaterThan(formBox.y)}
  });
});

test.describe('FAQ typography and accordion regression',()=>{
  for(const width of [390,768,1280])test(`uses the compact type scale at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});await page.goto('/faq');
    await expect(page.getByRole('heading',{level:1,name:'Frequently asked questions'})).toBeVisible();
    await expectNoPageOverflow(page,`FAQ overflowed at ${width}px`);
  });

  test('expands and collapses without changing the compact question hierarchy',async({page})=>{
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

const responsiveFormRoutes=['/contact','/partnership','/feedback','/newsletter','/careers','/signin?mode=signup'];
for(const width of [375,768,1280]){
  for(const route of responsiveFormRoutes){
    test(`responsive form release matrix › ${route} fits ${width}px`,async({page})=>{
      await page.setViewportSize({width,height:900});await page.goto(route,{waitUntil:'domcontentloaded'});await expectNoPageOverflow(page,`${route} overflowed at ${width}px`);
    });
  }
}
