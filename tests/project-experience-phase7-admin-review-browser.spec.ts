import {test,expect} from '@playwright/test';

const viewports=[
 {name:'small phone',width:320,height:900},
 {name:'phone',width:390,height:900},
 {name:'landscape',width:844,height:390},
 {name:'tablet',width:768,height:1000},
 {name:'desktop',width:1440,height:1000}
];

for(const viewport of viewports){
 test(`Phase 7 Admin review reflows on ${viewport.name}`,async({page})=>{
  await page.setViewportSize({width:viewport.width,height:viewport.height});
  await page.goto('/dev/phase-7-admin-review',{waitUntil:'networkidle'});
  await expect(page.getByRole('heading',{level:1,name:'Admin project-request review'})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const primaryControls=page.locator('button:visible,select:visible,input:not([type="checkbox"]):visible,textarea:visible,summary:visible');
  const count=await primaryControls.count();
  for(let i=0;i<count;i++){const box=await primaryControls.nth(i).boundingBox();if(box)expect(Math.max(box.width,box.height)).toBeGreaterThanOrEqual(44)}
  const checkboxes=page.getByRole('checkbox');
  for(let i=0;i<await checkboxes.count();i++)await expect(checkboxes.nth(i)).toHaveAccessibleName(/\S+/);
 });
}

test('Partner review context and Offer boundary are rendered accessibly',async({page})=>{
 await page.goto('/dev/phase-7-admin-review',{waitUntil:'networkidle'});
 await expect(page.getByText('PARTNER PROJECT',{exact:true}).first()).toBeVisible();
 await expect(page.getByText('Northstar Analytics',{exact:true}).first()).toBeVisible();
 await page.getByRole('button',{name:/Amina Okafor/i}).click();
 const dialog=page.getByRole('dialog',{name:'Amina Okafor'});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByText('Self-declared professional profile')).toBeVisible();
 await expect(dialog.getByRole('heading',{name:'Verified Mettelo Proof'})).toBeVisible();
 await expect(dialog.getByText('Partner organisation')).toBeVisible();
 await expect(dialog.getByText(/2 confirmed · 0 offered · 3 open · minimum 2 · target 4 · maximum 5/)).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Start review'})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Decline'})).toBeVisible();
 await dialog.getByRole('button',{name:'Close interest detail'}).click();

 const shortlistRow=page.getByRole('button',{name:/Priya Shah/i});
 await shortlistRow.click();
 const shortlistDialog=page.getByRole('dialog',{name:'Priya Shah'});
 await expect(shortlistDialog.getByRole('button',{name:'Offer project place'})).toBeVisible();
 await shortlistDialog.getByRole('button',{name:'Offer project place'}).click();
 const confirm=page.getByRole('dialog',{name:/Offer project place for Priya Shah/i});
 await expect(confirm).toContainText('does not create membership');
 await expect(confirm).toContainText('explicit member acceptance remains required');
});

test('clarification action is explicit and asks for specific information',async({page})=>{
 await page.goto('/dev/phase-7-admin-review',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:/Jordan Lee/i}).click();
 const dialog=page.getByRole('dialog',{name:'Jordan Lee'});
 await expect(dialog.getByRole('button',{name:'Request clarification'})).toBeVisible();
 await dialog.getByRole('button',{name:'Request clarification'}).click();
 const confirm=page.getByRole('dialog',{name:/Request clarification for Jordan Lee/i});
 await expect(confirm).toContainText('Tell the member exactly what information is needed');
 await expect(confirm.getByText('Reviewer note / reason')).toBeVisible();
});

test('clarification-requested record exposes resume review instead of arbitrary status editing',async({page})=>{
 await page.goto('/dev/phase-7-admin-review',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:/Lena Martin/i}).click();
 const dialog=page.getByRole('dialog',{name:'Lena Martin'});
 await expect(dialog.getByRole('button',{name:'Resume review'})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Decline'})).toBeVisible();
});

test('Phase 7 review remains usable at 200 percent text sizing',async({page})=>{
 await page.setViewportSize({width:640,height:900});
 await page.goto('/dev/phase-7-admin-review',{waitUntil:'networkidle'});
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(1);
 await expect(page.getByRole('heading',{level:1,name:'Admin project-request review'})).toBeVisible();
});

test('Phase 7 review controls expose visible keyboard focus',async({page})=>{
 await page.goto('/dev/phase-7-admin-review',{waitUntil:'networkidle'});
 await page.keyboard.press('Tab');
 let found=false;
 for(let i=0;i<30;i++){
  const focus=await page.evaluate(()=>{const el=document.activeElement as HTMLElement|null;if(!el)return null;const style=getComputedStyle(el);return{tag:el.tagName,outline:style.outlineStyle,width:parseFloat(style.outlineWidth||'0')}});
  if(focus&&focus.tag!=='BODY'&&focus.outline!=='none'&&focus.width>0){found=true;break}
  await page.keyboard.press('Tab');
 }
 expect(found).toBe(true);
});
