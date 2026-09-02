import {expect,test,type Locator,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

type Credentials={email:string;password:string};
const artifactDir='artifacts/mettelo-lab-visual/member-projects-v1';
const viewports=[{name:'phone-375',width:375,height:812},{name:'phone-390',width:390,height:844},{name:'phone-414',width:414,height:896},{name:'tablet-768',width:768,height:1024},{name:'tablet-1024',width:1024,height:900},{name:'desktop-1440',width:1440,height:900}] as const;
function credentials():Credentials{const email=process.env.E2E_MEMBER_EMAIL?.trim();const password=process.env.E2E_MEMBER_PASSWORD;if(!email||!password)throw new Error('Missing E2E member credentials.');return{email,password}}
async function signIn(page:Page){const account=credentials();await page.goto('/signin?next=%2Fmember%2Fprojects',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname==='/member/projects',{timeout:20_000})}
async function noOverflow(page:Page,label:string){const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth}));expect(size.scroll,`${label}: document overflow`).toBeLessThanOrEqual(size.client);expect(size.body,`${label}: body overflow`).toBeLessThanOrEqual(size.client)}
async function labelsDoNotOverlap(labels:Locator,label:string){const boxes=await labels.evaluateAll(elements=>elements.map(element=>{const box=element.getBoundingClientRect();return{left:box.left,right:box.right}}));for(let index=1;index<boxes.length;index++)expect(boxes[index-1].right,`${label}: nav labels overlap`).toBeLessThanOrEqual(boxes[index].left+1)}

test('My Projects preserves lifecycle hierarchy and responsive navigation',async({page})=>{
  test.setTimeout(300_000);await page.emulateMedia({reducedMotion:'reduce'});await signIn(page);await mkdir(artifactDir,{recursive:true});
  for(const viewport of viewports){
    await page.setViewportSize({width:viewport.width,height:viewport.height});await page.goto('/member/projects',{waitUntil:'networkidle'});
    await expect(page.getByRole('heading',{name:'My Projects',exact:true})).toBeVisible();
    await expect(page.getByLabel('Current section')).toContainText('My Projects');
    await expect(page.getByLabel('Project portfolio summary')).toBeVisible();
    await expect(page.getByLabel('Project filters')).toBeVisible();
    await expect(page.getByRole('link',{name:'Ongoing',exact:true})).toHaveAttribute('aria-current','page');
    await expect(page.getByLabel('Search my projects')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Continue where you left off'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Your confirmed projects'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Ready for another project?'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'No matching projects'})).toBeHidden();
    const pathStrip=page.getByLabel('Primary Capability Path');
    if(await pathStrip.count()){
      expect(await pathStrip.evaluate(element=>Boolean(element.closest('main[aria-labelledby="projects-title"]'))),`${viewport.name}: direction context belongs inside My Projects`).toBe(true);
      const stripBox=await pathStrip.boundingBox();const heroBox=await page.locator('main header').boundingBox();
      if(stripBox&&heroBox)expect(Math.abs(stripBox.x-heroBox.x),`${viewport.name}: direction context left alignment`).toBeLessThanOrEqual(2);
    }
    await noOverflow(page,viewport.name);
    const desktopNav=page.getByRole('complementary',{name:'My Mettelo navigation'});const mobileNav=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});
    if(viewport.width<=480){
      await expect(desktopNav).toBeHidden();await expect(mobileNav).toBeVisible();
      const labelNodes=mobileNav.locator(':scope > a > small, :scope > details > summary > small');const labels=await labelNodes.allTextContents();expect(labels.map(value=>value.trim())).toEqual(['Home','Projects','Discover','Proof','More']);await labelsDoNotOverlap(labelNodes,viewport.name);
      const projects=mobileNav.locator('a[href="/member/projects"]');await expect(projects).toHaveAttribute('aria-current','page');
      for(const item of await mobileNav.locator(':scope > a, :scope > details > summary').all()){const box=await item.boundingBox();expect(box?.height||0,`${viewport.name}: nav target`).toBeGreaterThanOrEqual(44)}
      const heroCopySize=await page.locator('main header p').evaluate(element=>Number.parseFloat(getComputedStyle(element).fontSize));expect(heroCopySize,`${viewport.name}: My Projects supporting copy`).toBeGreaterThanOrEqual(13);
    }else{
      await expect(desktopNav).toBeVisible();await expect(mobileNav).toBeHidden();const projectsLink=desktopNav.locator('a[href="/member/projects"]');await expect(projectsLink).toHaveAttribute('aria-current','page');await expect(projectsLink).toContainText('My Projects');await expect(projectsLink).toContainText('Ongoing and completed project work');
    }
    const lab=page.getByRole('link',{name:/Open Mettelo Lab/}).first();if(await lab.count())await expect(lab).toHaveAttribute('href',/\/member\/projects\//);
    const forming=page.getByText(/Team forming/i).first();if(await forming.count())await expect(page.getByText(/No action needed right now/i).first()).toBeVisible();
    await page.screenshot({path:`${artifactDir}/${viewport.name}-projects.png`,fullPage:true,animations:'disabled'});
  }
  await page.setViewportSize({width:390,height:844});await page.goto('/member/projects',{waitUntil:'networkidle'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await expect(page.getByRole('heading',{name:'My Projects',exact:true})).toBeVisible();const mobileNav=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});await noOverflow(page,'phone-390/text-zoom-200');await labelsDoNotOverlap(mobileNav.locator(':scope > a > small, :scope > details > summary > small'),'phone-390/text-zoom-200');await page.screenshot({path:`${artifactDir}/phone-390-text-zoom-200.png`,fullPage:true,animations:'disabled'});
});
