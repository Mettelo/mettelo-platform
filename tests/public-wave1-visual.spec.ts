import {expect,test,type Page} from '@playwright/test';

async function expectNoHorizontalOverflow(page:Page){
  const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(dimensions.scrollWidth,'page must not overflow horizontally').toBeLessThanOrEqual(dimensions.clientWidth+1);
}

const routes=[
  {path:'/showcase',heading:'See the work behind the claim.'},
  {path:'/people',heading:'Discover capability, not popularity.'},
  {path:'/community',heading:'Belong somewhere that leads to real work.'}
];
const viewports=[
  {width:375,height:812},
  {width:390,height:844},
  {width:414,height:896},
  {width:768,height:1024},
  {width:1024,height:900},
  {width:1280,height:900}
];

test.describe('public Wave 1 design-director release matrix',()=>{
  for(const viewport of viewports){
    for(const route of routes){
      test(`${route.path} fits ${viewport.width}px`,async({page})=>{
        await page.setViewportSize(viewport);
        const response=await page.goto(route.path,{waitUntil:'networkidle'});
        expect(response?.status()).toBeLessThan(400);
        await expect(page.getByRole('heading',{level:1,name:route.heading})).toBeVisible();
        await expectNoHorizontalOverflow(page);
        const main=page.locator('#main-content');
        const bounds=await main.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.width).toBeLessThanOrEqual(viewport.width+1);
      });
    }
  }

  test('Showcase explains the evidence standard without claiming certification',async({page})=>{
    await page.goto('/showcase');
    await expect(page.getByText('Verified does not mean awarded for attendance.')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Credibility comes from inspectable context.'})).toBeVisible();
  });

  test('People exposes professional discovery signals without follower metrics',async({page})=>{
    await page.goto('/people');
    await expect(page.getByText('0 follower counts shown')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Useful signals before social metrics.'})).toBeVisible();
  });

  test('Community keeps one dominant entry route and visible deeper pathways',async({page})=>{
    await page.goto('/community');
    await expect(page.getByRole('link',{name:/Join the main community/})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Start with what you need now.'})).toBeVisible();
    await expect(page.getByRole('link',{name:/Explore opportunities/})).toBeVisible();
    await expect(page.getByRole('link',{name:/See projects/})).toBeVisible();
  });
});
