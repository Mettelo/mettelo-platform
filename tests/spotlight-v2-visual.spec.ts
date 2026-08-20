import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';

const projectId='00000000-0000-4000-8000-00000000e2e1';
const runId='00000000-0000-4000-8000-00000000e211';
const contributionId='00000000-0000-4000-8000-00000000e831';
const spotlightId='00000000-0000-4000-8000-00000000e832';
const awardMonth='2026-01-01';
function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required for Spotlight E2E coverage.`);return value;}
function service(){const url=required('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Spotlight fixture refuses non-local Supabase hosts.');return createClient(url,required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});}
async function memberUser(db:ReturnType<typeof service>){const email=required('E2E_MEMBER_EMAIL').toLowerCase();const {data,error}=await db.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;const user=data.users.find(item=>item.email?.toLowerCase()===email);if(!user)throw new Error('E2E member user was not created by setup-local-e2e.');return user;}
async function seedPublishedSpotlight(){
  const db=service();const user=await memberUser(db);const adminEmail=required('E2E_ADMIN_EMAIL').toLowerCase();const {data:users}=await db.auth.admin.listUsers({page:1,perPage:1000});const admin=users.users.find(item=>item.email?.toLowerCase()===adminEmail);
  await db.from('spotlights').delete().eq('id',spotlightId);await db.from('contributions').delete().eq('id',contributionId);
  const {error:profileError}=await db.from('profiles').update({full_name:'E2E Spotlight Member',headline:'Evidence-led data contributor',is_public:true,profile_readiness:100}).eq('id',user.id);if(profileError)throw profileError;
  const {error:contributionError}=await db.from('contributions').insert({id:contributionId,user_id:user.id,project_id:projectId,project_run_id:runId,contribution_type:'analysis',title:'E2E verified Spotlight evidence',description:'Verified contribution used only by isolated Spotlight browser coverage.',verification_status:'verified',verified_by:admin?.id||null,verified_at:'2026-01-20T12:00:00.000Z',visibility:'public',is_public:true});if(contributionError)throw contributionError;
  const {error:spotlightError}=await db.from('spotlights').insert({id:spotlightId,user_id:user.id,title:'Builder of the Month',category:'builder',summary:'Recognised for verified analysis contribution in the E2E Local Release Project.',status:'published',award_month:awardMonth,score:88,score_breakdown:{verified:1,completed:2},rank_position:1,selection_method:'automatic',consent_status:'granted',consent_requested_at:'2026-02-01T09:00:00.000Z',consented_at:'2026-02-01T10:00:00.000Z',selected_at:'2026-02-01T09:00:00.000Z',published_at:'2026-02-01T10:00:00.000Z',primary_project_id:projectId,publication_held:false,suppress_public_project:false,suppress_public_evidence:false,public_display_name:'E2E Spotlight Member',public_headline:'Evidence-led data contributor'});if(spotlightError)throw spotlightError;
  const {error:evidenceError}=await db.from('spotlight_evidence').insert({spotlight_id:spotlightId,contribution_id:contributionId,project_id:projectId,source_label:'E2E verified Spotlight evidence',is_primary:true});if(evidenceError)throw evidenceError;
}
async function signIn(page:Page,next='/member/spotlight'){await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(required('E2E_MEMBER_EMAIL'));await main.locator('input[type="password"]').fill(required('E2E_MEMBER_PASSWORD'));await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});}
async function noOverflow(page:Page){
  const report=await page.evaluate(()=>{
    const root=document.documentElement;const clientWidth=root.clientWidth;const baseline=root.scrollWidth;
    const elements=[document.body,...document.querySelectorAll<HTMLElement>('body *')];
    const offenders=elements.map(element=>{const rect=element.getBoundingClientRect();const style=getComputedStyle(element);return {tag:element.tagName.toLowerCase(),id:element.id,className:typeof element.className==='string'?element.className:'',text:(element.textContent||'').replace(/\s+/g,' ').trim().slice(0,90),left:Math.round(rect.left*10)/10,right:Math.round(rect.right*10)/10,width:Math.round(rect.width*10)/10,scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,minWidth:style.minWidth,maxWidth:style.maxWidth,cssWidth:style.width,whiteSpace:style.whiteSpace,overflowWrap:style.overflowWrap,overflowX:style.overflowX,display:style.display,position:style.position};}).filter(item=>item.width>0&&(item.right>clientWidth+1||item.left<-1||item.scrollWidth>item.clientWidth+1)).sort((a,b)=>Math.max(b.right-clientWidth,-b.left,b.scrollWidth-b.clientWidth)-Math.max(a.right-clientWidth,-a.left,a.scrollWidth-a.clientWidth)).slice(0,16);
    const clipCandidates=baseline>clientWidth+1?elements.map(element=>{const previous=element.style.overflowX;element.style.overflowX='clip';const clipped=root.scrollWidth;element.style.overflowX=previous;const reduction=baseline-clipped;const rect=element.getBoundingClientRect();return {tag:element.tagName.toLowerCase(),id:element.id,className:typeof element.className==='string'?element.className:'',text:(element.textContent||'').replace(/\s+/g,' ').trim().slice(0,70),width:Math.round(rect.width*10)/10,reduction};}).filter(item=>item.reduction>0).sort((a,b)=>b.reduction-a.reduction).slice(0,16):[];
    return {scrollWidth:root.scrollWidth,clientWidth,bodyScrollWidth:document.body.scrollWidth,offenders,clipCandidates};
  });
  expect(report.scrollWidth,`Horizontal overflow diagnostics:\n${JSON.stringify(report,null,2)}`).toBeLessThanOrEqual(report.clientWidth+1);
}
async function capture(page:Page,name:string){fs.mkdirSync('artifacts/design-director',{recursive:true});await page.screenshot({path:`artifacts/design-director/${name}.png`,fullPage:true});}
function memberAward(page:Page){return page.locator('article.spotlightMemberCard').filter({has:page.locator(`a[href="/member/spotlight/${spotlightId}"]`)}).first();}
function publicAward(page:Page){return page.locator('article.spotlightPublicCard').filter({has:page.locator(`a[href="/spotlight/${spotlightId}"]`)}).first();}
function adminAward(page:Page){return page.locator('article.adminSpotlightCard').filter({hasText:'Builder of the Month — E2E Spotlight Member'}).first();}

test.describe('Spotlight v2 recognition, sharing and withdrawal',()=>{
  test.beforeEach(async()=>{await seedPublishedSpotlight();});

  test('published member recognition is shareable across required responsive widths',async({page})=>{
    await signIn(page);
    for(const width of [375,390,414,768,1024,1440]){
      await page.setViewportSize({width,height:900});await page.goto('/member/spotlight',{waitUntil:'networkidle'});
      const card=memberAward(page);
      await expect(page.getByRole('heading',{level:1,name:'Spotlight'})).toBeVisible();
      await expect(card.getByRole('heading',{name:'Builder of the Month'})).toBeVisible();
      await expect(card.getByRole('heading',{name:'Share your public Spotlight.'})).toBeVisible();
      await expect(card.getByRole('link',{name:'Share my Spotlight recognition on LinkedIn'})).toBeVisible();
      await expect(card.getByRole('link',{name:'View public recognition →'})).toBeVisible();
      await expect(page.getByRole('link',{name:'Public Spotlight →'})).toBeVisible();
      await noOverflow(page);
      if(width===390)await capture(page,'spotlight-member-mobile-390');
      if(width===1440)await capture(page,'spotlight-member-desktop-1440');
    }
    await page.setViewportSize({width:390,height:844});await page.goto('/member/spotlight',{waitUntil:'networkidle'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});await noOverflow(page);
  });

  test('public list and award detail expose only safe context and social sharing',async({page})=>{
    for(const width of [375,390,414,768,1024,1440]){
      await page.setViewportSize({width,height:900});const listResponse=await page.goto('/spotlight',{waitUntil:'networkidle'});expect(listResponse?.status()).toBe(200);
      const card=publicAward(page);
      await expect(page.getByRole('heading',{level:1,name:'Recognition earned through real contribution.'})).toBeVisible();
      await expect(card.getByRole('heading',{name:'Builder of the Month'})).toBeVisible();
      await expect(card.getByRole('link',{name:'Share this Spotlight recognition on LinkedIn'})).toBeVisible();
      await expect(page.getByText(/Score 88|rank_position|score_breakdown/i)).toHaveCount(0);await noOverflow(page);
      if(width===390)await capture(page,'spotlight-public-list-mobile-390');
      if(width===1440)await capture(page,'spotlight-public-list-desktop-1440');
    }
    await page.setViewportSize({width:390,height:844});await page.goto('/spotlight',{waitUntil:'networkidle'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});await noOverflow(page);await page.evaluate(()=>{document.documentElement.style.fontSize='';});

    const response=await page.goto(`/spotlight/${spotlightId}`,{waitUntil:'networkidle'});expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading',{level:1,name:'Builder of the Month'})).toBeVisible();
    await expect(page.getByText('E2E Spotlight Member',{exact:true})).toBeVisible();
    await expect(page.getByRole('link',{name:'Share this Spotlight recognition on LinkedIn'})).toBeVisible();
    await expect(page.getByRole('link',{name:'View verified Proof →'})).toBeVisible();
    await expect(page.getByText(/Score 88|rank_position|score_breakdown/i)).toHaveCount(0);
    for(const width of [375,390,414,768,1024,1440]){await page.setViewportSize({width,height:900});await page.reload({waitUntil:'networkidle'});await noOverflow(page);if(width===390)await capture(page,'spotlight-public-detail-mobile-390');if(width===1440)await capture(page,'spotlight-public-detail-desktop-1440');}
  });

  test('withdrawing permission removes social sharing and invalidates the public URL',async({page})=>{
    await signIn(page);await page.goto('/member/spotlight',{waitUntil:'networkidle'});
    const card=memberAward(page);
    await card.getByRole('button',{name:'Withdraw publication permission'}).click();
    await expect(page.getByRole('status')).toContainText('no longer publicly available');
    await expect(card.getByRole('heading',{name:'Share your public Spotlight.'})).toHaveCount(0);
    const publicResponse=await page.goto(`/spotlight/${spotlightId}`,{waitUntil:'domcontentloaded'});expect(publicResponse?.status()).toBe(404);
  });

  test('Admin sees exception governance instead of routine publish controls',async({page})=>{
    await page.goto('/signin?next=%2Fadmin%2Fspotlights',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(required('E2E_ADMIN_EMAIL'));await main.locator('input[type="password"]').fill(required('E2E_ADMIN_PASSWORD'));await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});await page.goto('/admin/spotlights',{waitUntil:'networkidle'});
    const card=adminAward(page);
    await expect(page.getByRole('heading',{level:1,name:'Safeguard exceptions, not routine winners.'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Request publication consent'})).toHaveCount(0);await expect(page.getByRole('button',{name:/Publish consented month/})).toHaveCount(0);
    await expect(card.getByRole('button',{name:'Hold publication'})).toBeVisible();await expect(card.getByRole('button',{name:'Suppress public project'})).toBeVisible();await expect(card.getByRole('button',{name:'Suppress public Proof'})).toBeVisible();
    await page.setViewportSize({width:1440,height:900});await capture(page,'admin-spotlight-governance-desktop-1440');
  });
});
