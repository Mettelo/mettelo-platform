import {expect,test,type Page} from '@playwright/test';

const widths=[375,390,414,768,1024,1280];
const routes=[
  {path:'/events',title:'Where the ecosystem meets in real time.'},
  {path:'/organisations',title:'Bring a real need. Leave with a clear next step.'},
  {path:'/partnership',title:'Start with the outcome, not the sponsorship deck.'}
];

async function expectNoHorizontalOverflow(page:Page){const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));expect(size.scroll).toBeLessThanOrEqual(size.client+1)}

for(const route of routes){
  test.describe(`${route.path} Wave 2 design`,()=>{
    for(const width of widths)test(`fits ${width}px with strong hierarchy`,async({page})=>{
      await page.setViewportSize({width,height:width<=414?844:width<=1024?1024:900});
      const response=await page.goto(route.path,{waitUntil:'networkidle'});
      expect(response?.status()).toBeLessThan(400);
      await expect(page.getByRole('heading',{level:1,name:route.title})).toBeVisible();
      await expectNoHorizontalOverflow(page);
      const h1=page.getByRole('heading',{level:1,name:route.title});
      const h1Size=await h1.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
      expect(h1Size).toBeGreaterThanOrEqual(width<=414?40:48);
      const actions=page.locator('main a.button:visible, main button:visible');
      for(let i=0;i<await actions.count();i++){const box=await actions.nth(i).boundingBox();if(box)expect(box.height).toBeGreaterThanOrEqual(40)}
    });

    test('remains functional at 200% text resize',async({page})=>{
      await page.setViewportSize({width:390,height:844});
      await page.goto(route.path,{waitUntil:'networkidle'});
      await page.evaluate(()=>{document.documentElement.style.fontSize='32px'});
      await expectNoHorizontalOverflow(page);
      await expect(page.getByRole('heading',{level:1,name:route.title})).toBeVisible();
    });
  });
}

test('Events exposes category navigation and a clear programme state',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/events',{waitUntil:'networkidle'});
  const nav=page.getByRole('navigation',{name:'Event categories'});
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link',{name:'All'})).toHaveAttribute('aria-current','page');
  await expect(page.locator('#programme')).toBeVisible();
});

test('Organisations keeps three distinct commercial routes',async({page})=>{
  await page.goto('/organisations',{waitUntil:'networkidle'});
  await expect(page.getByRole('heading',{name:'Post a Data & AI opportunity'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Bring a real project problem'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Build a wider relationship'})).toBeVisible();
});

test('Partnership preserves the complete submission contract and usable controls',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto('/partnership',{waitUntil:'networkidle'});
  const form=page.getByRole('button',{name:'Submit partnership enquiry →'}).locator('xpath=ancestor::form');
  await expect(form.locator('[name="organisation"]')).toBeVisible();
  await expect(form.locator('[name="partnershipType"]')).toBeVisible();
  await expect(form.locator('[name="objective"]')).toBeVisible();
  await expect(form.locator('[name="contribution"]')).toBeVisible();
  await expect(form.locator('[name="consent"]')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
