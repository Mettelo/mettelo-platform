import {expect,test,type Locator,type Page} from '@playwright/test';

const mobileViewports=[375,390,414,480];
const stressText='GA4_ANALYSIS_FOR_MARKETING_AUTOMATION_WITH_A_VERY_LONG_UNBROKEN_ADMIN_ENTERED_IDENTIFIER_0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ';

async function expectNoHorizontalOverflow(page:Page){
  const dimensions=await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth
  }));
  expect(dimensions.scrollWidth,'page must not overflow horizontally').toBeLessThanOrEqual(dimensions.clientWidth+1);
}

async function expectContained(child:Locator,parent:Locator,label:string){
  const [childBox,parentBox]=await Promise.all([child.boundingBox(),parent.boundingBox()]);
  expect(childBox,`${label} should render`).not.toBeNull();
  expect(parentBox,`${label} parent should render`).not.toBeNull();
  const childLeft=childBox!.x;
  const childRight=childBox!.x+childBox!.width;
  const parentLeft=parentBox!.x;
  const parentRight=parentBox!.x+parentBox!.width;
  expect(childLeft,`${label} must stay inside the left edge`).toBeGreaterThanOrEqual(parentLeft-1);
  expect(childRight,`${label} must stay inside the right edge`).toBeLessThanOrEqual(parentRight+1);
}

test.describe('mobile stability contract',()=>{
  for(const width of mobileViewports){
    test(`keeps text-entry controls at iOS-safe size on ${width}px`,async({page})=>{
      await page.setViewportSize({width,height:844});
      await page.goto('/projects',{waitUntil:'networkidle'});
      await expectNoHorizontalOverflow(page);

      const controls=page.locator("#main-content input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='range']):not([type='color']),#main-content select,#main-content textarea");
      const count=await controls.count();
      expect(count,'projects should expose at least one mobile form control').toBeGreaterThan(0);
      for(let index=0;index<count;index++){
        const control=controls.nth(index);
        if(!await control.isVisible())continue;
        const fontSize=await control.evaluate(element=>parseFloat(getComputedStyle(element).fontSize));
        expect(fontSize,`visible form control ${index} must be at least 16px to avoid iOS focus zoom`).toBeGreaterThanOrEqual(16);
      }
    });
  }

  test('contains long Admin-entered project content on the mobile catalogue',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto('/projects',{waitUntil:'networkidle'});
    const card=page.locator('.projectBriefCard').first();
    await expect(card).toBeVisible();

    const title=card.locator('h3').first();
    const summary=card.locator('.projectBriefSummary');
    await title.evaluate((element,value)=>{element.textContent=value as string},`${stressText}_${stressText}`);
    await summary.evaluate((element,value)=>{element.textContent=value as string},`${stressText}_${stressText}_${stressText}`);

    await expectNoHorizontalOverflow(page);
    await expectContained(title,card,'project title');
    await expectContained(summary,card,'project summary');
  });

  test('contains long project content on the mobile project detail page',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto('/projects',{waitUntil:'networkidle'});
    const projectLink=page.locator('.projectBriefCard h3 a').first();
    await expect(projectLink).toBeVisible();
    const href=await projectLink.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!,{waitUntil:'networkidle'});
    const main=page.locator('#main-content');
    const title=page.locator('#project-detail-title');
    const summary=page.locator('.projectDetailSummary');
    const problem=page.locator('.projectDetailSectionV2').first().locator('p');
    await title.evaluate((element,value)=>{element.textContent=value as string},`${stressText}_${stressText}`);
    await summary.evaluate((element,value)=>{element.textContent=value as string},`${stressText}_${stressText}_${stressText}`);
    await problem.evaluate((element,value)=>{element.textContent=value as string},`${stressText}_${stressText}_${stressText}`);

    await expectNoHorizontalOverflow(page);
    await expectContained(title,main,'project detail title');
    await expectContained(summary,main,'project detail summary');
    await expectContained(problem,main,'project problem statement');
  });
});
