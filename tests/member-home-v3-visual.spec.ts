import {expect,test,type Locator,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

type Credentials={email:string;password:string};
const artifactDir='artifacts/mettelo-lab-visual/member-home-v3';
const viewports=[{name:'phone-375',width:375,height:812},{name:'phone-390',width:390,height:844},{name:'phone-414',width:414,height:896},{name:'tablet-768',width:768,height:1024},{name:'tablet-1024',width:1024,height:900},{name:'desktop-1440',width:1440,height:900}] as const;
function credentials():Credentials{const email=process.env.E2E_MEMBER_EMAIL?.trim();const password=process.env.E2E_MEMBER_PASSWORD;if(!email||!password)throw new Error('Missing E2E member credentials.');return{email,password}}
async function signIn(page:Page){const account=credentials();await page.goto('/signin?next=%2Fmember',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname==='/member',{timeout:20_000})}
async function assertNoHorizontalOverflow(page:Page,label:string){const dimensions=await page.evaluate(()=>({documentScrollWidth:document.documentElement.scrollWidth,documentClientWidth:document.documentElement.clientWidth,bodyScrollWidth:document.body.scrollWidth}));expect(dimensions.documentScrollWidth,`${label}: document overflow`).toBeLessThanOrEqual(dimensions.documentClientWidth);expect(dimensions.bodyScrollWidth,`${label}: body overflow`).toBeLessThanOrEqual(dimensions.documentClientWidth)}
async function assertLabelsDoNotOverlap(labels:Locator,label:string){const boxes=await labels.evaluateAll(elements=>elements.map(element=>{const box=element.getBoundingClientRect();return{left:box.left,right:box.right}}));for(let index=1;index<boxes.length;index++)expect(boxes[index-1].right,`${label}: nav labels overlap`).toBeLessThanOrEqual(boxes[index].left+1)}

test('My Mettelo Home v3 preserves hierarchy, navigation and responsive containment',async({page})=>{
  test.setTimeout(240_000);await page.emulateMedia({reducedMotion:'reduce'});await signIn(page);await mkdir(artifactDir,{recursive:true});
  for(const viewport of viewports){
    await page.setViewportSize({width:viewport.width,height:viewport.height});await page.goto('/member',{waitUntil:'networkidle'});
    await expect(page.getByRole('heading',{name:/Good to see you,/})).toBeVisible();
    await expect(page.getByText(/Up next ·/i).first()).toBeVisible();
    await expect(page.getByRole('heading',{name:'Continue working'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Latest status'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Evidence that travels with you'})).toBeVisible();
    await assertNoHorizontalOverflow(page,viewport.name);
    const desktopNav=page.getByRole('complementary',{name:'My Mettelo navigation'});const mobileNav=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});
    if(viewport.width<=480){
      await expect(desktopNav).toBeHidden();await expect(mobileNav).toBeVisible();
      const labels=mobileNav.locator(':scope > a > small, :scope > details > summary > small');const persistentLabels=await labels.allTextContents();
      expect(persistentLabels.map(value=>value.trim())).toEqual(['Home','Projects','Discover','Proof','More']);await assertLabelsDoNotOverlap(labels,viewport.name);
      for(const item of await mobileNav.locator(':scope > a, :scope > details > summary').all()){const box=await item.boundingBox();expect(box?.height||0,`${viewport.name}: persistent nav target`).toBeGreaterThanOrEqual(44)}
      const heroFont=await page.locator('main p').first().evaluate(element=>Number.parseFloat(getComputedStyle(element).fontSize));expect(heroFont,`${viewport.name}: Home supporting copy`).toBeGreaterThanOrEqual(12);
      await page.screenshot({path:`${artifactDir}/${viewport.name}-home.png`,fullPage:true,animations:'disabled'});
      await mobileNav.locator(':scope > details > summary').click();
      const more=page.locator('#member-more');await expect(more).toBeVisible();
      for(const name of ['Applications','Recommended','Opportunities','Saved','Events','Spotlight','Profile'])await expect(more.getByText(name,{exact:true})).toBeVisible();
      await assertNoHorizontalOverflow(page,`${viewport.name}/more`);await page.screenshot({path:`${artifactDir}/${viewport.name}-more.png`,fullPage:false,animations:'disabled'});
      await mobileNav.locator(':scope > details > summary').click();await expect(more).toBeHidden();
    }else{
      await expect(desktopNav).toBeVisible();await expect(mobileNav).toBeHidden();
      const homeLink=desktopNav.locator('a[href="/member"]');await expect(homeLink).toHaveAttribute('aria-current','page');
      if(viewport.width>=1025){
        for(const group of ['My Work','Explore','Reputation'])await expect(desktopNav.getByRole('heading',{name:group})).toBeVisible();
      }else{
        for(const group of ['My Work','Explore','Reputation'])await expect(desktopNav.getByRole('heading',{name:group})).toBeHidden();
        const railBox=await desktopNav.boundingBox();expect(railBox?.width||0,`${viewport.name}: compact rail width`).toBeLessThanOrEqual(100);
        for(const href of ['/member','/member/projects','/member/applications','/member/proof','/projects','/member/recommended','/opportunities','/member/saved-opportunities','/member/events','/member/spotlight']){
          const link=desktopNav.locator(`a[href="${href}"]`);await expect(link).toBeVisible();const box=await link.boundingBox();expect(box?.height||0,`${viewport.name}: ${href} rail target`).toBeGreaterThanOrEqual(44);
        }
      }
    }
    const labLink=page.getByRole('link',{name:/Open Mettelo Lab/}).first();if(await labLink.count())await expect(labLink).toHaveAttribute('href',/\/member\/projects\//);
    if(viewport.width>480)await page.screenshot({path:`${artifactDir}/${viewport.name}-home.png`,fullPage:true,animations:'disabled'});
  }

  await page.setViewportSize({width:390,height:844});await page.goto('/member',{waitUntil:'networkidle'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await expect(page.getByRole('heading',{name:/Good to see you,/})).toBeVisible();const mobileNav=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});await expect(mobileNav).toBeVisible();await assertNoHorizontalOverflow(page,'phone-390/text-zoom-200');await assertLabelsDoNotOverlap(mobileNav.locator(':scope > a > small, :scope > details > summary > small'),'phone-390/text-zoom-200');await page.screenshot({path:`${artifactDir}/phone-390-text-zoom-200.png`,fullPage:true,animations:'disabled'});
});
