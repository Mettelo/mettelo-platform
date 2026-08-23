import {expect,test,type Page} from '@playwright/test';

const phoneWidths=[320,360,375,390,412,430] as const;
const phoneHeights=[568,740,932] as const;
const deterministicPublicProject='/projects/00000000-0000-4000-8000-00000000e2e1';

async function noOverflow(page:Page,label:string){const size=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(size.scrollWidth,label).toBeLessThanOrEqual(size.clientWidth)}

async function gotoPublicPage(page:Page,path:string){await page.goto(path,{waitUntil:'domcontentloaded'});await expect(page.locator('.siteHeader')).toBeVisible()}

async function openMenu(page:Page){const menu=page.locator('.mobileMenu');const trigger=menu.locator(':scope > summary');await expect(trigger).toBeVisible();await trigger.click();await expect(trigger).toHaveAttribute('aria-expanded','true');await expect(page.locator('.mobileMenuPanel')).toBeVisible();return{menu,trigger,panel:page.locator('.mobileMenuPanel')}}

async function assertPhoneContract(page:Page,width:number,height:number){
 await page.setViewportSize({width,height});await gotoPublicPage(page,'/');await noOverflow(page,`Public page overflowed at ${width}x${height}`);
 const {trigger,panel}=await openMenu(page);await expect(page.locator('.mobilePublicNav')).toHaveCount(1);await expect(page.locator('.managedMobileNavigation')).toHaveCount(0);
 const box=await panel.boundingBox();expect(box).not.toBeNull();expect(box?.x||0).toBeGreaterThan(0);expect(box?.width||999).toBeLessThanOrEqual(Math.min(360,width*.92)+1);expect(Math.abs((box?.height||0)-height),`Drawer height at ${width}x${height}`).toBeLessThanOrEqual(1);
 const close=panel.locator('[data-mobile-menu-close]');const closeBox=await close.boundingBox();expect(closeBox?.width||0).toBeGreaterThanOrEqual(44);expect(closeBox?.height||0).toBeGreaterThanOrEqual(44);await expect(page.locator('[aria-label="Close menu"]')).toHaveCount(1);await expect(trigger).toHaveAttribute('aria-label','Menu');
 for(const href of ['/','/projects','/opportunities','/showcase','/events']){const row=panel.locator(`a[href="${href}"]`).first();await expect(row).toBeVisible();const rowBox=await row.boundingBox();expect(rowBox?.height||0,`${href} row at ${width}px`).toBeGreaterThanOrEqual(48)}
 const bodyOverflow=await page.evaluate(()=>document.body.style.overflow);expect(bodyOverflow).toBe('hidden');await noOverflow(page,`Open drawer overflowed at ${width}x${height}`);
 const join=panel.locator('a[href="/signin?mode=signup"]');const signIn=panel.locator('a[href="/signin"]');await expect(join).toBeVisible();await expect(signIn).toBeVisible();const joinBox=await join.boundingBox();const signBox=await signIn.boundingBox();expect((signBox?.y||0)-(joinBox?.y||0)).toBeGreaterThanOrEqual(50);expect(Math.abs((joinBox?.width||0)-(signBox?.width||0))).toBeLessThanOrEqual(1);
 const explore=panel.getByRole('button',{name:'Explore'});const hiddenExplore=panel.locator('#mobile-public-explore a');await expect(hiddenExplore.first()).toHaveAttribute('tabindex','-1');await explore.click();await expect(explore).toHaveAttribute('aria-expanded','true');await expect(panel.locator('#mobile-public-explore')).toHaveClass(/isOpen/);await expect(hiddenExplore.first()).toHaveAttribute('tabindex','0');await expect(trigger).toHaveAttribute('aria-expanded','true');
 await page.keyboard.press('Escape');await expect(trigger).toHaveAttribute('aria-expanded','false');await expect(trigger).toBeFocused();
}

test.describe('approved public mobile drawer v3',()=>{
 for(const width of phoneWidths){
  for(const height of phoneHeights){
   test(`one adaptive drawer satisfies the agreed phone contract at ${width}x${height}`,async({page})=>{await assertPhoneContract(page,width,height)});
  }
 }

 test('backdrop and destinations close the drawer, while Explore does not',async({page})=>{
  await page.setViewportSize({width:390,height:844});await gotoPublicPage(page,'/');let state=await openMenu(page);await state.panel.getByRole('button',{name:'Explore'}).click();await expect(state.trigger).toHaveAttribute('aria-expanded','true');await page.locator('.mobileMenuBackdrop').click({position:{x:2,y:400}});await expect(state.trigger).toHaveAttribute('aria-expanded','false');
  state=await openMenu(page);await state.panel.locator('a[href="/projects"]').first().click();await page.waitForURL(url=>url.pathname==='/projects');await expect(state.trigger).toHaveAttribute('aria-expanded','false');
 });

 test('nested project routes preserve the current Projects destination',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  // The isolated release lane seeds this exact public project before browser QA. Using the verified fixture keeps this navigation assertion independent from the separate catalogue aggregate query while still proving a real, non-404 nested route.
  await gotoPublicPage(page,deterministicPublicProject);await expect(page.getByRole('heading',{level:1,name:'E2E Local Release Project'})).toBeVisible();const {panel}=await openMenu(page);const projects=panel.locator('a[href="/projects"]').first();await expect(projects).toHaveAttribute('aria-current','page');await expect(projects.locator('..')).toHaveClass(/isActive/);
 });

 test('200 percent text sizing keeps controls readable and bounded',async({page})=>{
  await page.setViewportSize({width:390,height:844});await gotoPublicPage(page,'/');await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});const {panel}=await openMenu(page);await expect(panel.getByText('For organisations',{exact:true})).toBeVisible();await expect(panel.getByText('About Mettelo',{exact:true})).toBeVisible();await expect(panel.getByRole('button',{name:'Explore'})).toBeVisible();await noOverflow(page,'Drawer overflowed at 200% text size');
  const labels=await panel.locator('a,button').evaluateAll(elements=>elements.filter(el=>getComputedStyle(el).visibility!=='hidden').map(el=>({scrollWidth:(el as HTMLElement).scrollWidth,clientWidth:(el as HTMLElement).clientWidth})));for(const item of labels)expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth+1);
 });
});
