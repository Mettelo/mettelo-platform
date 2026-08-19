import {expect,test,type Page} from '@playwright/test';

async function expectNoHorizontalOverflow(page:Page){
  const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth+1);
}

const routes=['/privacy','/terms','/community-guidelines'];
const widths=[375,390,414,768,1024,1280];

for(const path of routes){
  test.describe(`${path} trust layout`,()=>{
    for(const width of widths)test(`fits ${width}px with readable hierarchy`,async({page})=>{
      await page.setViewportSize({width,height:900});
      const response=await page.goto(path,{waitUntil:'networkidle'});
      expect(response?.status()).toBeLessThan(400);
      await expectNoHorizontalOverflow(page);
      await expect(page.getByRole('heading',{level:1})).toBeVisible();
      const nav=page.getByRole('navigation');
      await expect(nav).toBeVisible();
      const firstLink=nav.getByRole('link').first();
      const box=await firstLink.boundingBox();
      if(box)expect(box.height).toBeGreaterThanOrEqual(width<=720?44:40);
      const firstBody=page.locator('main section section p').first();
      const bodySize=await firstBody.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
      expect(bodySize).toBeGreaterThanOrEqual(16);
    });

    test('survives 200% text resize without horizontal overflow',async({page})=>{
      await page.setViewportSize({width:390,height:844});
      await page.goto(path,{waitUntil:'networkidle'});
      await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
      await expectNoHorizontalOverflow(page);
      await expect(page.getByRole('heading',{level:1})).toBeVisible();
    });
  });
}
