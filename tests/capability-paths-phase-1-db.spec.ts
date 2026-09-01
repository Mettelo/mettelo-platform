import {expect,test} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';

const url=process.env.E2E_SUPABASE_URL?.trim();
const serviceKey=process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();
const localHost=url?new URL(url).hostname:'';
const canRun=Boolean(url&&serviceKey&&['127.0.0.1','localhost'].includes(localHost));

const projectId='00000000-0000-4000-8000-00000000e2e1';
const project2Id='00000000-0000-4000-8000-00000000c1d1';
const project3Id='00000000-0000-4000-8000-00000000c1d2';
const pathAId='00000000-0000-4000-8000-00000000c1a1';
const pathBId='00000000-0000-4000-8000-00000000c1b1';
const stageAId='00000000-0000-4000-8000-00000000c1a2';
const stageBId='00000000-0000-4000-8000-00000000c1b2';

async function expectNoError(error:{message:string}|null,label:string){
  expect(error,`${label}: ${error?.message||''}`).toBeNull();
}

test('Capability Paths foundation preserves one canonical project across multiple paths and enforces path integrity',async()=>{
  test.skip(!canRun,'Runs only against the disposable isolated Supabase release-gate database.');
  const db=createClient(url!,serviceKey!,{auth:{persistSession:false,autoRefreshToken:false}});

  const [{count:membershipBefore,error:membershipBeforeError},{count:proofBefore,error:proofBeforeError}]=await Promise.all([
    db.from('project_members').select('id',{count:'exact',head:true}).eq('project_id',projectId),
    db.from('contributions').select('id',{count:'exact',head:true}).eq('project_id',projectId)
  ]);
  await expectNoError(membershipBeforeError,'read canonical project memberships before test');
  await expectNoError(proofBeforeError,'read canonical project Proof before test');

  try{
    await db.from('capability_path_projects').delete().in('path_id',[pathAId,pathBId]);
    await db.from('capability_path_stages').delete().in('path_id',[pathAId,pathBId]);
    await db.from('member_capability_paths').delete().in('path_id',[pathAId,pathBId]);
    await db.from('capability_paths').delete().in('id',[pathAId,pathBId]);
    await db.from('projects').delete().in('id',[project2Id,project3Id]);

    const {error:projectsError}=await db.from('projects').insert([
      {id:project2Id,slug:'e2e-capability-path-project-2',title:'E2E Capability Path Project 2',summary:'Disposable second project for Capability Path database constraints.',problem_statement:'Validate duplicate positions and cross-path prerequisite safety.',status:'draft',visibility:'private',project_type:'open',applications_open:false,project_type_review_required:false},
      {id:project3Id,slug:'e2e-capability-path-project-3',title:'E2E Capability Path Project 3',summary:'Disposable third project for Capability Path prerequisite constraints.',problem_statement:'Validate prerequisite isolation without altering the canonical fixture project.',status:'draft',visibility:'private',project_type:'open',applications_open:false,project_type_review_required:false}
    ]);
    await expectNoError(projectsError,'create disposable projects');

    const {error:pathsError}=await db.from('capability_paths').insert([
      {id:pathAId,slug:'e2e-data-analyst-path-a',name:'E2E Data Analyst Path A',target_role:'Data Analyst',target_outcome:'Advanced analytical capability',status:'published',published_at:new Date().toISOString()},
      {id:pathBId,slug:'e2e-bi-analyst-path-b',name:'E2E BI Analyst Path B',target_role:'BI Analyst',target_outcome:'Advanced BI capability',status:'published',published_at:new Date().toISOString()}
    ]);
    await expectNoError(pathsError,'create paths');

    const {error:stagesError}=await db.from('capability_path_stages').insert([
      {id:stageAId,path_id:pathAId,slug:'applied',name:'Applied',position:1},
      {id:stageBId,path_id:pathBId,slug:'advanced',name:'Advanced',position:1}
    ]);
    await expectNoError(stagesError,'create path stages');

    const {error:placementsError}=await db.from('capability_path_projects').insert([
      {path_id:pathAId,project_id:projectId,stage_id:stageAId,position:2,competency_focus:'Applied analysis',capability_built:'Evidence-led analytical reasoning'},
      {path_id:pathBId,project_id:projectId,stage_id:stageBId,position:4,competency_focus:'BI decision support',capability_built:'Decision-ready reporting'}
    ]);
    await expectNoError(placementsError,'place canonical project in two paths');

    const [{count:canonicalProjectCount,error:canonicalProjectError},{data:placements,error:placementReadError}]=await Promise.all([
      db.from('projects').select('id',{count:'exact',head:true}).eq('id',projectId),
      db.from('capability_path_projects').select('path_id,project_id,stage_id,position').eq('project_id',projectId).in('path_id',[pathAId,pathBId]).order('position')
    ]);
    await expectNoError(canonicalProjectError,'count canonical project');
    await expectNoError(placementReadError,'read path placements');
    expect(canonicalProjectCount).toBe(1);
    expect(placements).toHaveLength(2);
    expect(new Set((placements||[]).map(item=>item.path_id))).toEqual(new Set([pathAId,pathBId]));

    const {error:duplicatePositionError}=await db.from('capability_path_projects').insert({path_id:pathAId,project_id:project2Id,stage_id:stageAId,position:2,competency_focus:'Duplicate position probe',capability_built:'Must be rejected'});
    expect(duplicatePositionError,'duplicate path position must be rejected').not.toBeNull();

    const {error:crossStageError}=await db.from('capability_path_projects').insert({path_id:pathAId,project_id:project2Id,stage_id:stageBId,position:3,competency_focus:'Cross-path stage probe',capability_built:'Must be rejected'});
    expect(crossStageError,'stage from another path must be rejected').not.toBeNull();

    const {error:pathBSecondPlacementError}=await db.from('capability_path_projects').insert({path_id:pathBId,project_id:project2Id,stage_id:stageBId,position:2,competency_focus:'Path B prerequisite source',capability_built:'Path-local prerequisite source'});
    await expectNoError(pathBSecondPlacementError,'create path-B-only prerequisite source');

    const {error:crossPrerequisiteError}=await db.from('capability_path_projects').insert({path_id:pathAId,project_id:project3Id,stage_id:stageAId,position:3,competency_focus:'Cross-path prerequisite probe',capability_built:'Must be rejected',prerequisite_project_id:project2Id});
    expect(crossPrerequisiteError,'prerequisite from another path must be rejected').not.toBeNull();

    const {error:selfPrerequisiteError}=await db.from('capability_path_projects').insert({path_id:pathAId,project_id:project3Id,stage_id:stageAId,position:3,competency_focus:'Self prerequisite probe',capability_built:'Must be rejected',prerequisite_project_id:project3Id});
    expect(selfPrerequisiteError,'project cannot be its own prerequisite').not.toBeNull();

    const [{count:membershipAfter,error:membershipAfterError},{count:proofAfter,error:proofAfterError}]=await Promise.all([
      db.from('project_members').select('id',{count:'exact',head:true}).eq('project_id',projectId),
      db.from('contributions').select('id',{count:'exact',head:true}).eq('project_id',projectId)
    ]);
    await expectNoError(membershipAfterError,'read canonical project memberships after test');
    await expectNoError(proofAfterError,'read canonical project Proof after test');
    expect(membershipAfter).toBe(membershipBefore);
    expect(proofAfter).toBe(proofBefore);
  }finally{
    await db.from('capability_path_projects').delete().in('path_id',[pathAId,pathBId]);
    await db.from('capability_path_stages').delete().in('path_id',[pathAId,pathBId]);
    await db.from('member_capability_paths').delete().in('path_id',[pathAId,pathBId]);
    await db.from('capability_paths').delete().in('id',[pathAId,pathBId]);
    await db.from('projects').delete().in('id',[project2Id,project3Id]);
  }
});
