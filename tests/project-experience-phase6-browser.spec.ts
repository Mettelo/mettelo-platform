import {expect,test,type Page} from '@playwright/test';

const viewports=[
 {name:'small-phone',width:320,height:900},
 {name:'phone',width:390,height:900},
 {name:'phone-landscape',width:844,height:390},
 {name:'tablet',width:768,height:1000},
 {name:'desktop',width:1440,height:1000}
];
async function noOverflow(page:Page){const size=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(size.scrollWidth,'Phase 6 must not overflow horizontally').toBeLessThanOrEqual(size.clientWidth+1)}
async function controlsNamed(page:Page){const controls=page.locator('input:not([type="hidden"]),select,textarea');for(let i=0;i<await controls.count();i++){const control=controls.nth(i);if(!(await control.isVisible()))continue;const named=await control.evaluate((element:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement)=>Boolean(element.getAttribute('aria-label')||element.getAttribute('aria-labelledby')||element.labels?.length));expect(named,`control ${i} needs an accessible name`).toBeTruthy()}}

test.describe('Project Experience Phase 6 responsive AUTO acceptance',()=>{
 for(const viewport of viewports){test(`${viewport.name} AUTO states and Flexible interest form`,async({page})=>{await page.setViewportSize({width:viewport.width,height:viewport.height});await page.goto('/dev/phase-6-auto-states',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{name:'Automatic entry, forming and start states'})).toBeVisible();await expect(page.getByText('YOU’RE IN',{exact:true})).toBeVisible();await expect(page.getByText('TEAM FORMING',{exact:true})).toBeVisible();await expect(page.getByText('YOUR TEAM IS READY',{exact:true})).toBeVisible();await expect(page.getByText('PROJECT IN PROGRESS',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Flexible project interest form'})).toBeVisible();await noOverflow(page);await controlsNamed(page)})}
});

test('Flexible member can choose Solo Team or Either with keyboard-operable controls',async({page})=>{await page.goto('/dev/phase-6-auto-states',{waitUntil:'networkidle'});for(const name of ['Solo','Either','Team'])await expect(page.getByRole('radio',{name:new RegExp(name,'i')})).toBeVisible();const first=page.getByRole('radio',{name:/Solo/i});await first.focus();await expect(first).toBeFocused();await page.keyboard.press('Space');await expect(first).toBeChecked();let visibleFocus=0;for(let i=0;i<10;i++){await page.keyboard.press('Tab');const focused=page.locator(':focus');if(await focused.isVisible()){const focus=await focused.evaluate(el=>{const style=getComputedStyle(el);return`${style.outlineStyle}|${style.outlineWidth}|${style.boxShadow}`});if(!/^none\|0px\|none$/.test(focus))visibleFocus++}}expect(visibleFocus).toBeGreaterThan(0)});

test('Phase 6 AUTO states and interest form reflow at 200 percent text',async({page})=>{await page.setViewportSize({width:1280,height:900});await page.goto('/dev/phase-6-auto-states',{waitUntil:'networkidle'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await noOverflow(page);await expect(page.getByText('YOUR TEAM IS READY',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/Continue/i})).toBeVisible()});

test('interest form status regions and terms controls expose accessible semantics',async({page})=>{await page.goto('/dev/phase-6-auto-states',{waitUntil:'networkidle'});const form=page.locator('.mpaFormCard');await expect(form.locator('[role="alert"][aria-live="assertive"]')).toHaveCount(1);await page.getByRole('button',{name:/Continue/i}).click();await expect(page.getByRole('heading',{name:'How you could contribute'})).toBeVisible();await page.getByRole('textbox',{name:/How could you contribute/i}).fill('I can analyse the project data, communicate findings and support the team with reliable delivery evidence.');await page.getByRole('button',{name:/Continue/i}).click();await expect(page.getByRole('button',{name:/Read full participation terms/i})).toBeVisible();await expect(page.getByRole('checkbox',{name:/I have read, understood and agree/i})).toBeVisible()});
