import {expect,test,type Page} from '@playwright/test';

const projectId='00000000-0000-4000-8000-00000000e2e1';

async function noOverflow(page:Page,label:string){
  const size=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(size.scrollWidth,label).toBeLessThanOrEqual(size.clientWidth);
}

test.describe('Project Experience V2 advanced public Project Detail',()=>{
  test('the canonical public page preserves the approved decision-led information architecture',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(`/projects/${projectId}`,{waitUntil:'networkidle'});

    await expect(page.getByRole('heading',{level:1,name:'E2E Local Release Project'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Build evidence of capability, not just another portfolio piece.'})).toBeVisible();
    await expect(page.getByText('Problem',{exact:true}).first()).toBeVisible();
    await expect(page.getByText('Output',{exact:true}).first()).toBeVisible();
    await expect(page.getByText('Proof',{exact:true}).first()).toBeVisible();
    await expect(page.getByText('Data',{exact:true}).first()).toBeVisible();

    for(const heading of [
      'Start with the decision, not the dataset.',
      'Clear objectives. Room for judgement.',
      'Know what you are working with—and where it came from.',
      'Professional outputs, not tick-box files.',
      'Know the quality bar before you start.',
      'Capability becomes more valuable when there is evidence behind it.',
      'A structured route from ambiguity to handover.',
      'Choose where you can contribute—and where you want to stretch.',
      'Know the expectation before you commit.'
    ])await expect(page.getByRole('heading',{name:heading})).toBeVisible();

    const onThisPage=page.getByRole('navigation',{name:'On this project page'});
    await expect(onThisPage).toBeVisible();
    await expect(onThisPage.getByRole('link',{name:'Data & source'})).toHaveAttribute('href','#data');
    await expect(page.getByText(/Evidence expectations pending|Mettelo Proof potential/).first()).toBeVisible();
    await noOverflow(page,'Advanced Project Detail overflowed at desktop width');
  });

  test('the redesign reflows across supported phone, tablet and desktop widths',async({page})=>{
    for(const width of [320,390,768,1024,1440]){
      await page.setViewportSize({width,height:1000});
      await page.goto(`/projects/${projectId}`,{waitUntil:'networkidle'});
      await expect(page.getByRole('heading',{level:1,name:'E2E Local Release Project'})).toBeVisible();
      await noOverflow(page,`Advanced Project Detail overflowed at ${width}px`);
      if(width<=760)await expect(page.locator('div[aria-label="Project application action"]')).toBeVisible();
    }
  });

  test('200 percent text keeps the project page reflow-safe',async({page})=>{
    await page.setViewportSize({width:768,height:1000});
    await page.goto(`/projects/${projectId}`,{waitUntil:'networkidle'});
    await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
    await expect(page.getByRole('heading',{level:1,name:'E2E Local Release Project'})).toBeVisible();
    await noOverflow(page,'Advanced Project Detail overflowed at 200% text');
  });
});
