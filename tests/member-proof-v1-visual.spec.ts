import {expect,test,type Page} from '@playwright/test';

const widths=[375,390,414,768,1024,1440] as const;

type Credentials={email:string;password:string};
function credentials():Credentials{const email=process.env.E2E_MEMBER_EMAIL?.trim();const password=process.env.E2E_MEMBER_PASSWORD;if(!email||!password)throw new Error('Missing E2E member credentials.');return{email,password}}
async function signIn(page:Page){const account=credentials();await page.goto('/signin?next=%2Fmember%2Fproof',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname==='/member/proof',{timeout:20_000})}
async function noOverflow(page:Page,label:string){const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth}));expect(size.scroll,`${label}: document overflow`).toBeLessThanOrEqual(size.client);expect(size.body,`${label}: body overflow`).toBeLessThanOrEqual(size.client)}
async function gridColumns(page:Page,selector:string){return page.locator(selector).first().evaluate(element=>getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length)}

test('My Mettelo Proof preserves verification truth and approved responsive hierarchy',async({page})=>{
  test.setTimeout(300_000);
  await page.emulateMedia({reducedMotion:'reduce'});
  await signIn(page);

  for(const width of widths){
    await page.setViewportSize({width,height:900});
    await page.goto('/member/proof',{waitUntil:'networkidle'});

    await expect(page.getByRole('heading',{level:1,name:'Proof'})).toBeVisible();
    await expect(page.getByText('MY WORK · VERIFIED EVIDENCE',{exact:true})).toBeVisible();
    await expect(page.getByText('Your verified record of what you contributed through real Mettelo project work — the evidence behind your skills, roles and professional story.',{exact:true})).toBeVisible();
    await expect(page.getByLabel('Current section')).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveCount(0);

    const summary=page.getByLabel('Proof summary');
    await expect(summary).toBeVisible();
    await expect(summary.getByText('Verified Proof',{exact:true})).toBeVisible();
    await expect(summary.getByText('Projects evidenced',{exact:true})).toBeVisible();
    await expect(summary.getByText('Pending',{exact:true})).toBeVisible();
    await expect(summary.getByText('2',{exact:true}).first()).toBeVisible();
    await expect(summary.getByText('Skills evidenced',{exact:true})).toHaveCount(0);

    const filters=page.getByLabel('Proof filters');
    await expect(filters).toBeVisible();
    await expect(filters.getByPlaceholder('Search Proof or projects')).toBeVisible();
    await expect(page.getByLabel('Filter by verified skill')).toHaveCount(0);

    await expect(page.getByRole('heading',{name:'Evidence you can stand behind'})).toBeVisible();
    const verifiedCard=page.locator('.mpProofCard').filter({hasText:'E2E verified forecasting analysis'});
    await expect(verifiedCard).toBeVisible();
    await expect(verifiedCard.getByText('✓ Verified',{exact:true})).toBeVisible();
    await expect(verifiedCard.getByText('E2E Local Release Project',{exact:true})).toBeVisible();
    await expect(verifiedCard.getByText('Data Analyst',{exact:true})).toHaveCount(0);
    await expect(verifiedCard.getByText('Project role',{exact:true})).toHaveCount(0);
    await expect(verifiedCard.getByText(/Built and documented the comparison analysis/)).toBeVisible();
    await expect(page.locator('.mpProofCard').filter({hasText:'E2E pending evidence review'})).toHaveCount(0);
    await expect(page.getByText('Internal text must never appear in verified member Proof.')).toHaveCount(0);

    await expect(page.getByRole('heading',{name:'Evidence still in review'})).toBeVisible();
    await expect(page.getByText('◷ Pending verification',{exact:true})).toBeVisible();
    await expect(page.getByText('! Changes requested',{exact:true})).toBeVisible();
    await expect(page.getByText('Clarify which part of the delivery document you owned before resubmitting.')).toBeVisible();
    await expect(page.getByText('Internal rejection rationale for deterministic privacy coverage.')).toHaveCount(0);
    await expect(page.getByText(/Review history · 1 not verified/)).toBeVisible();

    await expect(page.getByRole('heading',{name:'Bring verified evidence into your profile'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Spotlight stays separate'})).toBeVisible();
    await expect(page.getByText('Verified Proof does not automatically become public recognition.',{exact:false})).toBeVisible();

    expect(await gridColumns(page,'.mpProofGrid'),`${width}px verified Proof grid`).toBe(width>=1025?2:1);
    expect(await gridColumns(page,'.mpSummary'),`${width}px summary grid`).toBe(width>=1025?3:2);
    expect(await gridColumns(page,'.mpPendingCard'),`${width}px pending composition`).toBe(width>=1025?2:1);
    expect(await gridColumns(page,'.mpIdentity'),`${width}px identity composition`).toBe(width>=1025?2:1);

    const desktopNav=page.getByRole('complementary',{name:'My Mettelo navigation'});
    const mobileNav=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});
    const profileAction=page.getByRole('link',{name:'View profile'});
    await expect(profileAction).toBeVisible();
    if(width<=480){
      await expect(desktopNav).toBeHidden();
      await expect(mobileNav).toBeVisible();
      await expect(mobileNav.locator('a[href="/member/proof"]')).toHaveAttribute('aria-current','page');
      for(const item of await mobileNav.locator(':scope > a, :scope > details > summary').all()){const box=await item.boundingBox();expect(box?.height||0,`${width}px mobile navigation target`).toBeGreaterThanOrEqual(44)}
    }else{
      await expect(desktopNav).toBeVisible();
      await expect(mobileNav).toBeHidden();
      await expect(desktopNav.locator('a[href="/member/proof"]')).toHaveAttribute('aria-current','page');
    }

    await noOverflow(page,`${width}px Proof`);
  }

  await page.setViewportSize({width:390,height:844});
  await page.goto('/member/proof',{waitUntil:'networkidle'});
  const search=page.getByPlaceholder('Search Proof or projects');
  await search.fill('no-such-proof-record');
  await expect(page.getByRole('heading',{name:'No Proof matches these filters'})).toBeVisible();
  await page.getByRole('button',{name:'Clear filters'}).click();
  await expect(page.getByText('E2E verified forecasting analysis',{exact:true})).toBeVisible();

  await page.getByRole('button',{name:'View Proof: E2E verified forecasting analysis'}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByText('✓ Verified by Mettelo',{exact:true})).toBeVisible();
  await expect(dialog.getByText('Data Analyst',{exact:true})).toHaveCount(0);
  await expect(dialog.getByText('Project role',{exact:true})).toHaveCount(0);
  await expect(dialog.getByRole('heading',{name:'Visibility is separate from verification'})).toBeVisible();
  await expect(dialog.getByText('Internal text must never appear in verified member Proof.')).toHaveCount(0);
  await expect(dialog.getByRole('link',{name:'Open submitted evidence'})).toHaveAttribute('href','https://example.com/e2e-proof');
  await dialog.getByRole('button',{name:'Close Proof detail'}).click();

  await page.getByRole('button',{name:'Review & resubmit'}).click();
  const updateDialog=page.getByRole('dialog');
  await expect(updateDialog.getByText('Clarify which part of the delivery document you owned before resubmitting.')).toBeVisible();
  await expect(updateDialog.getByRole('button',{name:'Resubmit for verification'})).toBeVisible();
  await updateDialog.getByRole('button',{name:'Close Proof detail'}).click();

  await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
  await expect(page.getByRole('heading',{level:1,name:'Proof'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Evidence you can stand behind'})).toBeVisible();
  await noOverflow(page,'390px Proof at 200% text zoom');
});
