import {expect,test,type Page} from '@playwright/test';

async function expectNoHorizontalOverflow(page:Page){
  const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(dimensions.scrollWidth,'page must not overflow horizontally').toBeLessThanOrEqual(dimensions.clientWidth+1);
}

const publicRoutes=['/','/showcase','/people','/community','/events','/organisations','/partnership','/about','/projects','/blog','/privacy','/terms','/community-guidelines'];
const viewports=[
  {width:375,height:812},
  {width:390,height:844},
  {width:414,height:896},
  {width:768,height:1024},
  {width:1024,height:900},
  {width:1440,height:1000}
];

test.describe('public design hardening matrix',()=>{
  for(const viewport of viewports){
    for(const path of publicRoutes){
      test(`${path} remains aligned at ${viewport.width}px`,async({page})=>{
        await page.setViewportSize(viewport);
        const response=await page.goto(path,{waitUntil:'networkidle'});
        expect(response?.status()).toBeLessThan(400);
        await expectNoHorizontalOverflow(page);
        await expect(page.locator('main')).toBeVisible();
      });
    }
  }

  test('tablet uses compact public navigation while desktop keeps primary navigation',async({page})=>{
    await page.setViewportSize({width:1024,height:900});
    await page.goto('/');
    await expect(page.getByRole('navigation',{name:'Primary navigation'})).toBeHidden();
    await expect(page.locator('.mobileMenu > summary')).toBeVisible();
    const compactTarget=await page.locator('.mobileMenu > summary').boundingBox();
    expect(compactTarget?.width).toBeGreaterThanOrEqual(44);
    expect(compactTarget?.height).toBeGreaterThanOrEqual(44);

    await page.setViewportSize({width:1280,height:900});
    await page.reload({waitUntil:'networkidle'});
    await expect(page.getByRole('navigation',{name:'Primary navigation'})).toBeVisible();
  });

  test('public metadata typography stays readable on mobile',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto('/showcase');
    const eyebrow=page.locator('.eyebrow').first();
    const eyebrowSize=await eyebrow.evaluate(element=>parseFloat(getComputedStyle(element).fontSize));
    expect(eyebrowSize).toBeGreaterThanOrEqual(12);
    const chips=page.locator('.chip:visible');
    if(await chips.count()){
      const chipSize=await chips.first().evaluate(element=>parseFloat(getComputedStyle(element).fontSize));
      expect(chipSize).toBeGreaterThanOrEqual(12);
    }
  });

  test('public pages reflow at 200 percent text sizing',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    for(const path of ['/showcase','/people','/partnership']){
      await page.goto(path,{waitUntil:'networkidle'});
      await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
      await expectNoHorizontalOverflow(page);
      await page.evaluate(()=>{document.documentElement.style.fontSize='';});
    }
  });

  test('partnership controls preserve usable touch targets and label relationships',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto('/partnership');
    const controls=page.locator('#partnership-form input:not([type="checkbox"]),#partnership-form select,#partnership-form textarea,#partnership-form button');
    for(let index=0;index<await controls.count();index++){
      const control=controls.nth(index);
      if(!await control.isVisible())continue;
      const box=await control.boundingBox();
      if(box)expect(box.height,`partnership control ${index} needs a 44px target`).toBeGreaterThanOrEqual(44);
      const id=await control.getAttribute('id');
      if(id)await expect(page.locator(`label[for="${id}"]`)).toHaveCount(1);
    }
  });

  test('Showcase keeps evidence attached to contribution ownership when proof exists',async({page})=>{
    await page.goto('/showcase');
    const rows=page.locator('.proofRow');
    if(await rows.count()){
      const first=rows.first();
      await expect(first.locator('.proofOwner')).toBeVisible();
      await expect(first.locator('.proofContribution')).toBeVisible();
    }
  });
});
