import {expect,test,type Locator,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

type Credentials={email:string;password:string};
const artifactDir='artifacts/mettelo-lab-visual/member-applications-v1';
const viewports=[{name:'phone-375',width:375,height:812},{name:'phone-390',width:390,height:844},{name:'phone-414',width:414,height:896},{name:'tablet-768',width:768,height:1024},{name:'tablet-1024',width:1024,height:900},{name:'desktop-1440',width:1440,height:900}] as const;
function credentials():Credentials{const email=process.env.E2E_MEMBER_EMAIL?.trim();const password=process.env.E2E_MEMBER_PASSWORD;if(!email||!password)throw new Error('Missing E2E member credentials.');return{email,password}}
async function signIn(page:Page){const account=credentials();await page.goto('/signin?next=%2Fmember%2Fapplications',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname==='/member/applications',{timeout:20_000})}
async function noOverflow(page:Page,label:string){const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth}));expect(size.scroll,`${label}: document overflow`).toBeLessThanOrEqual(size.client);expect(size.body,`${label}: body overflow`).toBeLessThanOrEqual(size.client)}
async function labelsDoNotOverlap(labels:Locator,label:string){const boxes=await labels.evaluateAll(elements=>elements.map(element=>{const box=element.getBoundingClientRect();return{left:box.left,right:box.right}}));for(let index=1;index<boxes.length;index++)expect(boxes[index-1].right,`${label}: nav labels overlap`).toBeLessThanOrEqual(boxes[index].left+1)}

test('My Mettelo Applications is project-only, accessible and responsive',async({page})=>{
  test.setTimeout(300_000);await page.emulateMedia({reducedMotion:'reduce'});await signIn(page);await mkdir(artifactDir,{recursive:true});
  for(const viewport of viewports){
    await page.setViewportSize({width:viewport.width,height:viewport.height});await page.goto('/member/applications',{waitUntil:'networkidle'});
    await expect(page.getByRole('heading',{name:'Applications',exact:true})).toBeVisible();
    await expect(page.getByText('Your recruitment journey')).toHaveCount(0);
    await expect(page.getByText('active Mettelo career application')).toHaveCount(0);
    await expect(page.locator('main').getByRole('link',{name:/Open Mettelo Lab/i})).toHaveCount(0);
    const summary=page.getByLabel('Project application summary');if(await summary.count())await expect(summary).toBeVisible();
    const filters=page.getByLabel('Search and filter project applications');if(await filters.count()){
      await expect(filters).toBeVisible();await expect(page.getByLabel('Search project applications')).toBeVisible();await expect(page.getByLabel('Filter by applied project role')).toBeVisible();
      const needs=page.getByRole('button',{name:'Needs action'});await needs.click();await expect(needs).toHaveAttribute('aria-pressed','true');
      await page.getByRole('button',{name:'Current',exact:true}).click();
    }
    const projectLinks=page.locator('main a[href^="/member/projects/"]');expect(await projectLinks.count(),`${viewport.name}: Applications must not bypass Projects into a project workspace`).toBe(0);
    const confirmedLink=page.getByRole('link',{name:'Open in Projects'}).first();if(await confirmedLink.count())await expect(confirmedLink).toHaveAttribute('href','/member/projects');
    await noOverflow(page,viewport.name);
    const desktopNav=page.getByRole('complementary',{name:'My Mettelo navigation'});const mobileNav=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});
    if(viewport.width<=480){
      await expect(desktopNav).toBeHidden();await expect(mobileNav).toBeVisible();const labelNodes=mobileNav.locator(':scope > a > small, :scope > details > summary > small');await labelsDoNotOverlap(labelNodes,viewport.name);for(const item of await mobileNav.locator(':scope > a, :scope > details > summary').all()){const box=await item.boundingBox();expect(box?.height||0,`${viewport.name}: nav target`).toBeGreaterThanOrEqual(44)}
    }else{await expect(desktopNav).toBeVisible();await expect(mobileNav).toBeHidden();await expect(desktopNav.locator('a[href="/member/applications"]')).toHaveAttribute('aria-current','page')}
    await page.screenshot({path:`${artifactDir}/${viewport.name}-applications.png`,fullPage:true,animations:'disabled'});
  }
  await page.setViewportSize({width:390,height:844});await page.goto('/member/applications',{waitUntil:'networkidle'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await expect(page.getByRole('heading',{name:'Applications',exact:true})).toBeVisible();await noOverflow(page,'phone-390/text-zoom-200');const mobileNav=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});await labelsDoNotOverlap(mobileNav.locator(':scope > a > small, :scope > details > summary > small'),'phone-390/text-zoom-200');await page.screenshot({path:`${artifactDir}/phone-390-text-zoom-200.png`,fullPage:true,animations:'disabled'});
});
