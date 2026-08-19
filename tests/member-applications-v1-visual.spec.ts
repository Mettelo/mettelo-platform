import {expect,test,type Locator,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

type Credentials={email:string;password:string};
const artifactDir='artifacts/mettelo-lab-visual/member-applications-v1';
const viewports=[{name:'phone-375',width:375,height:812},{name:'phone-390',width:390,height:844},{name:'phone-414',width:414,height:896},{name:'tablet-768',width:768,height:1024},{name:'tablet-1024',width:1024,height:900},{name:'desktop-1440',width:1440,height:900}] as const;
function credentials():Credentials{const email=process.env.E2E_MEMBER_EMAIL?.trim();const password=process.env.E2E_MEMBER_PASSWORD;if(!email||!password)throw new Error('Missing E2E member credentials.');return{email,password}}
async function signIn(page:Page){const account=credentials();await page.goto('/signin?next=%2Fmember%2Fapplications',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname==='/member/applications',{timeout:20_000})}
async function noOverflow(page:Page,label:string){const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth}));expect(size.scroll,`${label}: document overflow`).toBeLessThanOrEqual(size.client);expect(size.body,`${label}: body overflow`).toBeLessThanOrEqual(size.client)}
async function labelsDoNotOverlap(labels:Locator,label:string){const boxes=await labels.evaluateAll(elements=>elements.map(element=>{const box=element.getBoundingClientRect();return{left:box.left,right:box.right}}));for(let index=1;index<boxes.length;index++)expect(boxes[index-1].right,`${label}: nav labels overlap`).toBeLessThanOrEqual(boxes[index].left+1)}
async function assertSummaryGeometry(page:Page,width:number,label:string){const cards=page.locator('.mmaSummaryCard');if(await cards.count()!==4)return;const boxes=await cards.evaluateAll(elements=>elements.map(element=>{const box=element.getBoundingClientRect();return{x:box.x,y:box.y,width:box.width}}));if(width>=1025){for(const box of boxes.slice(1))expect(Math.abs(box.y-boxes[0].y),`${label}: summary should be four-up`).toBeLessThanOrEqual(1)}else{expect(Math.abs(boxes[1].y-boxes[0].y),`${label}: first summary row`).toBeLessThanOrEqual(1);expect(boxes[2].y,`${label}: summary should wrap 2x2`).toBeGreaterThan(boxes[0].y+20);expect(Math.abs(boxes[3].y-boxes[2].y),`${label}: second summary row`).toBeLessThanOrEqual(1)}}
async function assertCardGeometry(page:Page,width:number,label:string){const card=page.locator('.mmaApplicationCard').first();if(!await card.count())return;const columns=await card.evaluate(element=>getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length);if(width>=1025)expect(columns,`${label}: desktop application card columns`).toBe(2);else expect(columns,`${label}: tablet/mobile application card stack`).toBe(1)}

test('My Mettelo Applications matches the approved responsive prototype',async({page})=>{
  test.setTimeout(300_000);await page.emulateMedia({reducedMotion:'reduce'});await signIn(page);await mkdir(artifactDir,{recursive:true});
  for(const viewport of viewports){
    await page.setViewportSize({width:viewport.width,height:viewport.height});await page.goto('/member/applications',{waitUntil:'networkidle'});

    await expect(page.getByRole('heading',{name:'Applications',exact:true})).toBeVisible();
    await expect(page.getByText('MY WORK · PROJECT APPLICATIONS',{exact:true})).toBeVisible();
    await expect(page.getByText('Track the projects you’ve applied to, see exactly when you need to act, and follow each application until it either closes or becomes confirmed project work.',{exact:true})).toBeVisible();
    await expect(page.getByLabel('Current section')).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveCount(0);
    await expect(page.getByText('Your recruitment journey')).toHaveCount(0);
    await expect(page.getByText('active Mettelo career application')).toHaveCount(0);
    await expect(page.locator('main').getByRole('link',{name:/Open Mettelo Lab/i})).toHaveCount(0);
    await expect(page.getByRole('heading',{name:'Looking for another project?'})).toBeVisible();

    const summary=page.getByLabel('Project application summary');if(await summary.count()){
      await expect(summary).toBeVisible();for(const label of ['Needs you','In review','Team forming','Closed'])await expect(summary.getByText(label,{exact:true})).toBeVisible();await assertSummaryGeometry(page,viewport.width,viewport.name);
    }
    const filters=page.getByLabel('Search and filter project applications');if(await filters.count()){
      await expect(filters).toBeVisible();const search=page.getByLabel('Search project applications');await expect(search).toBeVisible();await expect(search).toHaveAttribute('placeholder','Search project applications');const role=page.getByLabel('Filter by applied project role');await expect(role).toBeVisible();await expect(role.locator('option').first()).toHaveText('All roles');
      const needs=page.getByRole('button',{name:'Needs action'});await needs.click();await expect(needs).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('heading',{name:'Looking for another project?'})).toBeVisible();await page.getByRole('button',{name:'Current',exact:true}).click();
    }

    const projectLinks=page.locator('main a[href^="/member/projects/"]');expect(await projectLinks.count(),`${viewport.name}: Applications must not bypass Projects into a project workspace`).toBe(0);
    const confirmedLink=page.getByRole('link',{name:/Open in Projects/}).first();if(await confirmedLink.count())await expect(confirmedLink).toHaveAttribute('href','/member/projects');
    await assertCardGeometry(page,viewport.width,viewport.name);
    await noOverflow(page,viewport.name);

    const desktopNav=page.getByRole('complementary',{name:'My Mettelo navigation'});const mobileNav=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});
    const heroDiscover=page.locator('.applicationsHeroActions').getByRole('link',{name:'Discover projects'});
    if(viewport.width<=480){
      await expect(desktopNav).toBeHidden();await expect(mobileNav).toBeVisible();await expect(heroDiscover).toBeHidden();const labelNodes=mobileNav.locator(':scope > a > small, :scope > details > summary > small');await expect(labelNodes).toHaveText(['Home','Projects','Discover','Proof','More']);await labelsDoNotOverlap(labelNodes,viewport.name);const more=mobileNav.locator(':scope > details > summary');await expect(more).toHaveAttribute('aria-current','page');for(const item of await mobileNav.locator(':scope > a, :scope > details > summary').all()){const box=await item.boundingBox();expect(box?.height||0,`${viewport.name}: nav target`).toBeGreaterThanOrEqual(44)}
      const actionbox=page.locator('.mmaActionbox').first();if(await actionbox.count()){const borderTop=await actionbox.evaluate(element=>getComputedStyle(element).borderTopWidth);expect(borderTop,`${viewport.name}: mobile actionbox divider`).not.toBe('0px');const buttons=actionbox.locator('.mmaBtn');for(const button of await buttons.all()){const box=await button.boundingBox();const parent=await actionbox.boundingBox();if(box&&parent)expect(box.width,`${viewport.name}: mobile action width`).toBeGreaterThanOrEqual(parent.width-2)}}
    }else{
      await expect(desktopNav).toBeVisible();await expect(mobileNav).toBeHidden();await expect(desktopNav.locator('a[href="/member/applications"]')).toHaveAttribute('aria-current','page');await expect(heroDiscover).toBeVisible();
    }

    const pageFrame=page.locator('.applicationsPage');const frameBox=await pageFrame.boundingBox();if(frameBox&&viewport.width>=1025)expect(frameBox.width,`${viewport.name}: prototype max content width`).toBeLessThanOrEqual(1181);
    await page.screenshot({path:`${artifactDir}/${viewport.name}-applications.png`,fullPage:true,animations:'disabled'});
  }

  await page.setViewportSize({width:390,height:844});await page.goto('/member/applications',{waitUntil:'networkidle'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await expect(page.getByRole('heading',{name:'Applications',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Looking for another project?'})).toBeVisible();await noOverflow(page,'phone-390/text-zoom-200');const mobileNav=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});await labelsDoNotOverlap(mobileNav.locator(':scope > a > small, :scope > details > summary > small'),'phone-390/text-zoom-200');await page.screenshot({path:`${artifactDir}/phone-390-text-zoom-200.png`,fullPage:true,animations:'disabled'});
});
