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
  const controls=page.locator('button:visible,select:visible,input:visible,summary:visible');
  const count=await controls.count();
  for(let i=0;i<count;i++){const box=await controls.nth(i).boundingBox();if(box)expect(Math.max(box.width,box.height)).toBeGreaterThanOrEqual(44)}
 });
}

test('Phase 7 review context and offer boundary are rendered accessibly',async({page})=>{
 await page.goto('/dev/phase-7-admin-review',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:/Amina Okafor/i}).click();
 const dialog=page.getByRole('dialog',{name:'Amina Okafor'});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByText('Professional profile')).toBeVisible();
 await expect(dialog.getByText('Verified Proof')).toBeVisible();
 await expect(dialog.getByText(/2 confirmed · minimum 2 · target 4 · maximum 5/)).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Start review'})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Decline'})).toBeVisible();
 await dialog.getByRole('button',{name:/Close project interest detail/i}).click();

 const shortlistRow=page.getByRole('button',{name:/Priya Shah/i});
 await shortlistRow.click();
 const shortlistDialog=page.getByRole('dialog',{name:'Priya Shah'});
 await expect(shortlistDialog.getByRole('button',{name:'Offer project place'})).toBeVisible();
 await shortlistDialog.getByRole('button',{name:'Offer project place'}).click();
 const confirm=page.getByRole('dialog',{name:/Offer project place for Priya Shah/i});
 await expect(confirm).toContainText('does not create project membership');
 await expect(confirm).toContainText('explicit member acceptance remains required');
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
 for(let i=0;i<20;i++){
  const focus=await page.evaluate(()=>{const el=document.activeElement as HTMLElement|null;if(!el)return null;const style=getComputedStyle(el);return{tag:el.tagName,outline:style.outlineStyle,width:parseFloat(style.outlineWidth||'0')}});
  if(focus&&focus.tag!=='BODY'&&focus.outline!=='none'&&focus.width>0){found=true;break}
  await page.keyboard.press('Tab');
 }
 expect(found).toBe(true);
});
