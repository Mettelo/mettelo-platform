import {expect,test,type Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const projectId='00000000-0000-4000-8000-00000000e2e1';
const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}
async function noOverflow(page:Page,label:string){const size=await page.evaluate(()=>{const clientWidth=document.documentElement.clientWidth;const offenders=Array.from(document.querySelectorAll<HTMLElement>('body *')).map(element=>{const rect=element.getBoundingClientRect();return{tag:element.tagName.toLowerCase(),id:element.id||undefined,className:String(element.className||'').slice(0,160)||undefined,left:Number(rect.left.toFixed(1)),right:Number(rect.right.toFixed(1)),width:Number(rect.width.toFixed(1)),scrollWidth:element.scrollWidth,clientWidth:element.clientWidth}}).filter(item=>item.width>0&&(item.left<-.5||item.right>clientWidth+.5||item.scrollWidth>Math.max(item.clientWidth+1,clientWidth))).sort((a,b)=>Math.max(b.right-clientWidth,-b.left,b.scrollWidth-clientWidth)-Math.max(a.right-clientWidth,-a.left,a.scrollWidth-clientWidth)).slice(0,12);return{scrollWidth:document.documentElement.scrollWidth,clientWidth,offenders}});expect(size.scrollWidth,`${label}; overflow owners: ${JSON.stringify(size.offenders)}`).toBeLessThanOrEqual(size.clientWidth)}

test.describe('Project Experience advanced public Project Detail',()=>{
 test('catalogue editing and Admin publication share one database-authoritative Workstream 2 blocker',()=>{
  const panel=read('components/ArchitectCatalogueClassificationPanel.tsx');
  const editPage=read('app/member/architect-projects/[id]/edit/page.tsx');
  const route=read('app/api/architect-projects/[id]/catalogue/route.ts');
  const migration=read('supabase/migrations/20260902122400_project_catalogue_classification_atomic_revision.sql');
  const admin=read('app/api/admin/project-governance/route.ts');
  expect(editPage).toContain('ArchitectCatalogueClassificationPanel');
  expect(panel).toContain('/api/architect-projects/${projectId}/catalogue');
  expect(panel).toContain('Skills / capabilities remain in Step 5');
  expect(route).toContain("roles.includes('creating_architect')");
  expect(route).toContain("db.rpc('apply_project_catalogue_classification_revision'");
  expect(route).not.toContain("db.from('project_domains').delete(");
  expect(route).not.toContain("db.from('project_role_families').delete(");
  expect(route).not.toContain("db.from('project_tools').delete(");
  expect(migration).toContain('create or replace function public.apply_project_catalogue_classification_revision');
  expect(migration).toContain("catalogue_working_model_source='explicit'");
  expect(migration).toContain("'project_catalogue_classification_updated'");
  expect(migration).toContain("'atomic_catalogue_revision',true");
  expect(migration).toContain('from public,anon,authenticated');
  expect(migration).toContain('to service_role,postgres');
  expect(admin).toContain("db.rpc('workstream2_publication_blockers'");
  expect(admin).toContain('const blockers=await publicationBlockers(db,projectId)');
  expect(admin).toContain('if(blockers.length)');
  expect(admin.indexOf('if(blockers.length)')).toBeLessThan(admin.indexOf("status:'recruiting',visibility:'public'"));
  expect(admin).not.toContain("db.from('project_experience_readiness').select('publication_ready");
  expect(admin).not.toContain('requireProjectCatalogueReady(db,projectId)');
 });

 test('project detail wrappers delegate to V3 bodies without nested main landmarks',()=>{
  const rootLayout=read('app/layout.tsx');const publicWrapper=read('components/project-experience/ProjectPublicDetailV2.tsx');const publicBody=read('components/project-experience/ProjectPublicDetailBodyV3.tsx');const memberWrapper=read('components/project-experience/MemberProjectDetailV2.tsx');const memberBody=read('components/project-experience/MemberProjectDetailBodyV3.tsx');
  expect(rootLayout).toContain('<main id="main-content">');for(const source of [publicWrapper,publicBody,memberWrapper,memberBody])expect(source).not.toContain('<main');expect(publicWrapper).toContain('ProjectPublicDetailBodyV3');expect(memberWrapper).toContain('MemberProjectDetailBodyV3');expect(publicBody).toContain('id="project-content"');expect(memberBody).toContain('id="member-project-main"');
 });

 test('the canonical public page preserves the Phase 4 decision-led information architecture',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto(`/projects/${projectId}`,{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{level:1,name:'E2E Local Release Project'})).toBeVisible();await expect(page.getByRole('heading',{name:'Decide whether this is the right project for you.'})).toBeVisible();const sections=page.getByRole('navigation',{name:'Project sections'});for(const label of ['Overview','Scope & resources','Deliverables','Success standards','Timeline & Proof','Contribution areas'])await expect(sections.getByRole('link',{name:label,exact:true})).toBeVisible();for(const heading of ['Project overview','What the project covers','Project deliverables','Success standards','How the work may progress and what it may evidence','How you can contribute'])await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();await expect(page.getByText('These are project quality criteria, not automatic verified Proof.')).toBeVisible();await expect(page.locator('#project-content')).toBeVisible();await noOverflow(page,'Advanced Project Detail overflowed at desktop width');
 });

 test('the Phase 4 public detail reflows across supported phone, tablet and desktop widths',async({page})=>{test.setTimeout(60_000);for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});await page.goto(`/projects/${projectId}`,{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{level:1,name:'E2E Local Release Project'})).toBeVisible();await noOverflow(page,`Advanced Project Detail overflowed at ${width}px`);if(width<=700)await expect(page.getByRole('link',{name:'Submit interest',exact:true}).last()).toBeVisible();}});
 test('200 percent text keeps the project page reflow-safe and CTA reachable',async({page})=>{await page.setViewportSize({width:768,height:1000});await page.goto(`/projects/${projectId}`,{waitUntil:'domcontentloaded'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await expect(page.getByRole('heading',{level:1,name:'E2E Local Release Project'})).toBeVisible();await expect(page.getByRole('link',{name:'Submit interest',exact:true}).first()).toBeVisible();await noOverflow(page,'Advanced Project Detail overflowed at 200% text');});
});
