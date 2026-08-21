import {expect,test,type Locator,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

type Credentials={email:string;password:string};
const artifactDir='artifacts/mettelo-lab-visual/member-home-v4';
const viewports=[
  {name:'phone-320',width:320,height:740},
  {name:'phone-360',width:360,height:800},
  {name:'phone-375',width:375,height:812},
  {name:'phone-390',width:390,height:844},
  {name:'phone-412',width:412,height:915},
  {name:'phone-430',width:430,height:932},
  {name:'tablet-768',width:768,height:1024},
  {name:'tablet-1024',width:1024,height:900},
  {name:'desktop-1440',width:1440,height:900}
] as const;
function credentials():Credentials{const email=process.env.E2E_MEMBER_EMAIL?.trim();const password=process.env.E2E_MEMBER_PASSWORD;if(!email||!password)throw new Error('Missing E2E member credentials.');return{email,password}}
async function signIn(page:Page){const account=credentials();await page.goto('/signin?next=%2Fmember',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname==='/member',{timeout:20_000})}
async function assertNoHorizontalOverflow(page:Page,label:string){const dimensions=await page.evaluate(()=>({documentScrollWidth:document.documentElement.scrollWidth,documentClientWidth:document.documentElement.clientWidth,bodyScrollWidth:document.body.scrollWidth}));expect(dimensions.documentScrollWidth,`${label}: document overflow`).toBeLessThanOrEqual(dimensions.documentClientWidth);expect(dimensions.bodyScrollWidth,`${label}: body overflow`).toBeLessThanOrEqual(dimensions.documentClientWidth)}
async function assertLabelsDoNotOverlap(labels:Locator,label:string){const boxes=await labels.evaluateAll(elements=>elements.map(element=>{const box=element.getBoundingClientRect();return{left:box.left,right:box.right}}));for(let index=1;index<boxes.length;index++)expect(boxes[index-1].right,`${label}: nav labels overlap`).toBeLessThanOrEqual(boxes[index].left+1)}

async function assertV4Home(page:Page,width:number,label:string){
  const heading=page.getByRole('heading',{name:/Good to see you,/});await expect(heading).toBeVisible();
  const headingSize=await heading.evaluate(element=>Number.parseFloat(getComputedStyle(element).fontSize));
  if(width<=480)expect(headingSize,`${label}: mobile page title`).toBeGreaterThanOrEqual(20);else expect(headingSize,`${label}: desktop/tablet page title`).toBeGreaterThanOrEqual(22);
  expect(headingSize,`${label}: page title remains controlled`).toBeLessThanOrEqual(24);
  await expect(page.getByText(/Up next ·/i).first()).toBeVisible();
  const upNext=page.locator('[aria-labelledby="up-next-heading"]');await expect(upNext).toBeVisible();await expect(upNext.getByRole('link')).toHaveCount(1);
  const upNextAction=upNext.getByRole('link').first();const upNextBox=await upNextAction.boundingBox();expect(upNextBox?.height||0,`${label}: Up Next target`).toBeGreaterThanOrEqual(44);
  await expect(page.getByRole('heading',{name:'Continue working'})).toBeVisible();
  await expect(page.getByText('IMPORTANT UPDATES',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'What changed'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Latest status'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Evidence that travels with you'})).toBeVisible();
  await expect(page.getByText('PERSONAL QUEUE',{exact:true})).toHaveCount(0);
  await expect(page.getByText('WHAT NEEDS YOU NOW',{exact:true})).toHaveCount(0);
  const overview=page.locator('[aria-label="Member overview"]');await expect(overview).toBeVisible();await expect(overview.locator(':scope > a')).toHaveCount(4);
  await expect(overview.getByText(/Recommendations?/,{exact:true})).toHaveCount(0);
  await expect(page.locator('[aria-label="Profile readiness"]')).toBeVisible();
  await assertNoHorizontalOverflow(page,label);
}

test('My Mettelo Home V4 matches the approved hierarchy and responsive visual contract',async({page})=>{
  test.setTimeout(300_000);await page.emulateMedia({reducedMotion:'reduce'});await signIn(page);await mkdir(artifactDir,{recursive:true});
  for(const viewport of viewports){
    await page.setViewportSize({width:viewport.width,height:viewport.height});await page.goto('/member',{waitUntil:'networkidle'});await assertV4Home(page,viewport.width,viewport.name);
    const desktopNav=page.getByRole('complementary',{name:'My Mettelo navigation'});const mobileNav=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});
    if(viewport.width<=480){
      await expect(desktopNav).toBeHidden();await expect(mobileNav).toBeVisible();
      const labels=mobileNav.locator(':scope > a > small, :scope > details > summary > small');expect((await labels.allTextContents()).map(value=>value.trim())).toEqual(['Home','Projects','Discover','Proof','More']);await assertLabelsDoNotOverlap(labels,viewport.name);
      for(const item of await mobileNav.locator(':scope > a, :scope > details > summary').all()){const box=await item.boundingBox();expect(box?.height||0,`${viewport.name}: persistent nav target`).toBeGreaterThanOrEqual(44)}
      await mobileNav.locator(':scope > details > summary').click();const more=page.locator('#member-more');await expect(more).toBeVisible();for(const name of ['Applications','Recommended','Opportunities','Saved','Events','Spotlight','Profile'])await expect(more.getByText(name,{exact:true})).toBeVisible();await assertNoHorizontalOverflow(page,`${viewport.name}/more`);await mobileNav.locator(':scope > details > summary').click();await expect(more).toBeHidden();
    }else{
      await expect(desktopNav).toBeVisible();await expect(mobileNav).toBeHidden();const homeLink=desktopNav.locator('a[href="/member"]');await expect(homeLink).toHaveAttribute('aria-current','page');
      if(viewport.width>=1025){for(const group of ['My Work','Explore','Reputation'])await expect(desktopNav.getByRole('heading',{name:group})).toBeVisible()}else{for(const group of ['My Work','Explore','Reputation'])await expect(desktopNav.getByRole('heading',{name:group})).toBeHidden()}
    }
    const labLink=page.getByRole('link',{name:/Open Mettelo Lab/}).first();if(await labLink.count()){await expect(labLink).toHaveAttribute('href',/\/member\/projects\//);const box=await labLink.boundingBox();expect(box?.height||0,`${viewport.name}: Mettelo Lab CTA`).toBeGreaterThanOrEqual(44)}
    await page.screenshot({path:`${artifactDir}/${viewport.name}-home.png`,fullPage:true,animations:'disabled'});
  }
});

test('My Mettelo Home V4 remains usable at 200 percent text zoom',async({page})=>{
  test.setTimeout(120_000);await page.emulateMedia({reducedMotion:'reduce'});await signIn(page);await page.setViewportSize({width:390,height:844});await page.goto('/member',{waitUntil:'networkidle'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await expect(page.getByRole('heading',{name:/Good to see you,/})).toBeVisible();const mobileNav=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});await expect(mobileNav).toBeVisible();await assertNoHorizontalOverflow(page,'phone-390/text-zoom-200');await assertLabelsDoNotOverlap(mobileNav.locator(':scope > a > small, :scope > details > summary > small'),'phone-390/text-zoom-200');await page.screenshot({path:`${artifactDir}/phone-390-text-zoom-200.png`,fullPage:true,animations:'disabled'});
});

test('Explore and Grow actions land on the intended launch-ready destinations',async({page})=>{
  test.setTimeout(120_000);await signIn(page);await page.setViewportSize({width:390,height:844});
  const journeys=[
    {name:'Explore projects',path:'/member/discover',heading:'Discover projects'},
    {name:'Recommended',path:'/member/recommended',heading:'Recommended for you'},
    {name:'Opportunities',path:'/opportunities',heading:'Find opportunities worth your attention.'},
    {name:'Saved',path:'/member/saved',heading:'Saved'}
  ];
  for(const journey of journeys){await page.goto('/member',{waitUntil:'networkidle'});const link=page.getByRole('link',{name:new RegExp(`^${journey.name}`)}).last();await expect(link).toBeVisible();const box=await link.boundingBox();expect(box?.height||0,`${journey.name}: touch target`).toBeGreaterThanOrEqual(44);await link.click();await page.waitForURL(url=>url.pathname===journey.path,{timeout:20_000});await expect(page.getByRole('heading',{name:journey.heading,exact:true})).toBeVisible();await assertNoHorizontalOverflow(page,journey.path)}
});
