import {expect,test,type Locator,type Page} from '@playwright/test';

const mobileViewports=[320,360,375,390,412,430,480];
const contentStressViewports=[390,768,1024];
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

async function injectCatalogueStressFixture(page:Page){
  await page.evaluate(value=>{
    const main=document.querySelector('#main-content');
    if(!main)throw new Error('Main content landmark not found');
    const fixture=document.createElement('section');
    fixture.id='project-card-stress-fixture';
    fixture.className='shell projectBriefGrid';
    fixture.innerHTML=`
      <article class="projectBriefCard">
        <header class="projectBriefHeader">
          <span class="chip">Analytics</span>
          <span class="statusText">Open for applications</span>
        </header>
        <div class="projectBriefBody">
          <section>
            <h3><a href="#project-card-stress-fixture">${value}_${value}</a></h3>
            <p class="projectBriefSummary">${value}_${value}_${value}</p>
            <div class="projectRoleList">
              <span>${value}</span>
              <span>GA4 analyst</span>
            </div>
            <div class="projectSkillList">
              <span>${value}</span>
              <span>Marketing analytics</span>
            </div>
          </section>
        </div>
        <footer class="projectBriefFoot">
          <span>${value}</span>
          <div class="projectCardActions"><a class="button primary" href="#project-card-stress-fixture">View project</a></div>
        </footer>
      </article>`;
    main.appendChild(fixture);
  },stressText);
}

async function injectDetailStressFixture(page:Page){
  await page.evaluate(value=>{
    const main=document.querySelector('#main-content');
    if(!main)throw new Error('Main content landmark not found');
    const fixture=document.createElement('section');
    fixture.id='project-detail-stress-fixture';
    fixture.className='shell projectDetailContent';
    fixture.innerHTML=`
      <div class="projectDetailHeroV2">
        <div class="projectDetailHeroGrid">
          <div class="projectDetailLead">
            <h1 id="project-detail-title">${value}_${value}</h1>
            <p class="projectDetailSummary">${value}_${value}_${value}</p>
            <div class="projectDetailActions">
              <a class="button primary" href="#project-detail-stress-fixture">Apply to project</a>
            </div>
          </div>
          <aside class="projectDetailDecision">
            <div class="projectFactStrip">
              <span><strong>Commitment</strong>${value}</span>
              <span><strong>Location</strong>Remote</span>
            </div>
          </aside>
        </div>
      </div>
      <div class="projectDetailGridV2">
        <div class="projectDetailMainV2">
          <section class="projectDetailSectionV2">
            <h2>Problem to solve</h2>
            <p>${value}_${value}_${value}</p>
          </section>
          <section class="projectDetailSectionV2">
            <h2>Roles</h2>
            <div class="roleListV2"><article><h3>${value}</h3><div class="projectRoleSkills"><span>${value}</span></div></article></div>
          </section>
        </div>
      </div>`;
    main.appendChild(fixture);
  },stressText);
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

    test(`keeps the public navigation contained on ${width}px`,async({page})=>{
      await page.setViewportSize({width,height:844});
      await page.goto('/projects',{waitUntil:'networkidle'});
      await expectNoHorizontalOverflow(page);

      const toggle=page.locator('.mobileMenu > summary');
      await expect(toggle).toBeVisible();
      await toggle.click();

      const panel=page.locator('.mobileMenuPanel');
      const backdrop=page.locator('.mobileMenuBackdrop');
      await expect(panel).toBeVisible();
      await expect(backdrop).toBeVisible();

      const geometry=await page.evaluate(()=>{
        const panel=document.querySelector<HTMLElement>('.mobileMenuPanel');
        const account=document.querySelector<HTMLElement>('.mobilePublicFooter');
        const explore=document.querySelector<HTMLElement>('.mobilePublicExplore');
        if(!panel||!account||!explore)throw new Error('Mobile navigation geometry targets are missing');
        const box=panel.getBoundingClientRect();
        const accountBox=account.getBoundingClientRect();
        const exploreBox=explore.getBoundingClientRect();
        return {
          viewportWidth:window.innerWidth,
          viewportHeight:window.innerHeight,
          documentWidth:document.documentElement.scrollWidth,
          panelLeft:box.left,
          panelRight:box.right,
          panelTop:box.top,
          panelBottom:box.bottom,
          panelHeight:box.height,
          accountGap:accountBox.top-exploreBox.bottom,
          bodyOverflowX:getComputedStyle(document.body).overflowX
        };
      });

      expect(geometry.documentWidth,'opening navigation must not widen the document').toBeLessThanOrEqual(geometry.viewportWidth+1);
      expect(geometry.panelLeft,'drawer must remain inside the viewport').toBeGreaterThanOrEqual(-1);
      expect(geometry.panelRight,'drawer must remain anchored to the right edge').toBeLessThanOrEqual(geometry.viewportWidth+1);
      expect(geometry.viewportWidth-geometry.panelRight,'drawer right gap should stay small and intentional').toBeLessThanOrEqual(9);
      expect(geometry.panelTop,'drawer should start below the mobile header').toBeGreaterThanOrEqual(64);
      expect(geometry.panelBottom,'drawer must remain inside the viewport').toBeLessThanOrEqual(geometry.viewportHeight+1);
      expect(geometry.panelHeight,'drawer must not be forced to full viewport height').toBeLessThan(geometry.viewportHeight-64);
      expect(geometry.accountGap,'account section should follow navigation naturally without a flex spacer').toBeLessThanOrEqual(20);

      await page.keyboard.press('Escape');
      await expect(panel).not.toBeVisible();
      await expect(toggle).toBeFocused();
    });
  }

  for(const width of contentStressViewports){
    test(`contains long Admin-entered project content on the catalogue at ${width}px`,async({page})=>{
      await page.setViewportSize({width,height:900});
      await page.goto('/projects',{waitUntil:'networkidle'});
      await injectCatalogueStressFixture(page);

      const card=page.locator('#project-card-stress-fixture .projectBriefCard');
      const title=card.locator('h3').first();
      const summary=card.locator('.projectBriefSummary');
      const footer=card.locator('.projectBriefFoot');
      await expect(card).toBeVisible();

      await expectNoHorizontalOverflow(page);
      await expectContained(title,card,'project title');
      await expectContained(summary,card,'project summary');
      await expectContained(footer,card,'project footer');
    });

    test(`contains long project content on the detail surface at ${width}px`,async({page})=>{
      await page.setViewportSize({width,height:900});
      await page.goto('/projects',{waitUntil:'networkidle'});
      await injectDetailStressFixture(page);

      const fixture=page.locator('#project-detail-stress-fixture');
      const title=fixture.locator('#project-detail-title');
      const summary=fixture.locator('.projectDetailSummary');
      const problem=fixture.locator('.projectDetailSectionV2').first().locator('p');
      const role=fixture.locator('.roleListV2 article').first();
      await expect(fixture).toBeVisible();

      await expectNoHorizontalOverflow(page);
      await expectContained(title,fixture,'project detail title');
      await expectContained(summary,fixture,'project detail summary');
      await expectContained(problem,fixture,'project problem statement');
      await expectContained(role,fixture,'project role');
    });
  }
});
