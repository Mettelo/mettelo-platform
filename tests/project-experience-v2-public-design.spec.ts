import {expect,test,type Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const projectId='00000000-0000-4000-8000-00000000e2e1';
const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

async function noOverflow(page:Page,label:string){
  const size=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(size.scrollWidth,label).toBeLessThanOrEqual(size.clientWidth);
}

test.describe('Project Experience V2 advanced public Project Detail',()=>{
  test('catalogue editing and Admin publication share governed V2 readiness',()=>{
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
    expect(admin).toContain(".from('project_experience_readiness').select('publication_ready,missing_requirements,publication_blockers,resource_governance_ready')");
    expect(admin).toContain("if(!experience?.publication_ready)");
    expect(admin).toContain('requireProjectCatalogueReady(db,projectId)');
    expect(admin.indexOf("if(!experience?.publication_ready)")).toBeLessThan(admin.indexOf("status:'recruiting',visibility:'public'"));
    expect(admin.indexOf("if(!catalogue.ok)")).toBeLessThan(admin.indexOf("status:'recruiting',visibility:'public'"));
  });

  test('project detail components do not create nested main landmarks',()=>{
    const rootLayout=read('app/layout.tsx');
    const publicDetail=read('components/project-experience/ProjectPublicDetailV2.tsx');
    const memberDetail=read('components/project-experience/MemberProjectDetailV2.tsx');
    expect(rootLayout).toContain('<main id="main-content">');
    expect(publicDetail).not.toContain('<main');
    expect(memberDetail).not.toContain('<main');
    expect(publicDetail).toContain('id="project-content"');
    expect(memberDetail).toContain('id="member-project-main"');
  });

  test('the canonical public page preserves the approved decision-led information architecture',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(`/projects/${projectId}`,{waitUntil:'domcontentloaded'});

    await expect(page.getByRole('heading',{level:1,name:'E2E Local Release Project'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Decide whether this is the right project for you.'})).toBeVisible();
    for(const label of ['Decision','Outputs','Roles','Evidence'])await expect(page.getByText(label,{exact:true}).first()).toBeVisible();

    for(const heading of [
      'What decision does this project need to improve?',
      'Know what the team will work with.',
      'Professional outputs with a clear purpose.',
      'Know how good work will be judged.',
      'What this work can help you practise and evidence.',
      'Choose where you can contribute.',
      'From application to handover.',
      'Know the expectation before you commit.'
    ])await expect(page.getByRole('heading',{name:heading})).toBeVisible();

    await expect(page.getByText('These are evidence opportunities, not automatic Proof awards. Your own contribution must still be completed and verified.')).toBeVisible();
    await expect(page.locator('#project-content')).toBeVisible();
    await noOverflow(page,'Advanced Project Detail overflowed at desktop width');
  });

  test('the redesign reflows across supported phone, tablet and desktop widths',async({page})=>{
    test.setTimeout(60_000);
    for(const width of [320,390,768,1024,1440]){
      await page.setViewportSize({width,height:1000});
      await page.goto(`/projects/${projectId}`,{waitUntil:'domcontentloaded'});
      await expect(page.getByRole('heading',{level:1,name:'E2E Local Release Project'})).toBeVisible();
      await noOverflow(page,`Advanced Project Detail overflowed at ${width}px`);
      if(width<=760)await expect(page.locator('div[aria-label="Project application action"]')).toBeVisible();
    }
  });

  test('200 percent text keeps the project page reflow-safe',async({page})=>{
    await page.setViewportSize({width:768,height:1000});
    await page.goto(`/projects/${projectId}`,{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
    await expect(page.getByRole('heading',{level:1,name:'E2E Local Release Project'})).toBeVisible();
    await noOverflow(page,'Advanced Project Detail overflowed at 200% text');
  });
});