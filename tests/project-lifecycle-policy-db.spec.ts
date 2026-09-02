import {expect,test} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';

const url=process.env.E2E_SUPABASE_URL?.trim();
const serviceKey=process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();
const localHost=url?new URL(url).hostname:'';
const canRun=Boolean(url&&serviceKey&&['127.0.0.1','localhost'].includes(localHost));

const openProjectId='00000000-0000-4000-8000-00000000e3e1';
const partnerProjectId='00000000-0000-4000-8000-00000000e3e2';
const importedProjectId='00000000-0000-4000-8000-00000000e3e3';
const openRunId='00000000-0000-4000-8000-00000000e3a1';
const partnerRun1Id='00000000-0000-4000-8000-00000000e3a2';
const partnerRun2Id='00000000-0000-4000-8000-00000000e3a3';
const roleAId='00000000-0000-4000-8000-00000000e3b1';
const roleBId='00000000-0000-4000-8000-00000000e3b2';
const partnerRoleId='00000000-0000-4000-8000-00000000e3b3';
const importBatchId='00000000-0000-4000-8000-00000000e3c1';

async function noError(error:{message:string}|null,label:string){expect(error,`${label}: ${error?.message||''}`).toBeNull()}

async function createDisposableUser(db:ReturnType<typeof createClient>,suffix:string){
  const email=`lifecycle-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
  const {data,error}=await db.auth.admin.createUser({email,password:'Mettelo-E2E-Only-123!',email_confirm:true});
  await noError(error,'create disposable lifecycle user');
  expect(data.user).toBeTruthy();
  return data.user!.id;
}

test('project lifecycle database invariants fail closed and future imports become configuration-ready',async()=>{
  test.skip(!canRun,'Runs only against the disposable isolated Supabase release-gate database.');
  const db=createClient(url!,serviceKey!,{auth:{persistSession:false,autoRefreshToken:false}});
  const users:string[]=[];

  try{
    await db.from('capability_path_import_project_origins').delete().eq('batch_id',importBatchId);
    await db.from('capability_path_import_batches').delete().eq('id',importBatchId);
    await db.from('projects').update({applications_open:false}).in('id',[openProjectId,partnerProjectId]);
    await db.from('project_members').delete().eq('project_id',openProjectId);
    await db.from('project_runs').delete().in('project_id',[openProjectId,partnerProjectId]);
    await db.from('project_roles').delete().in('project_id',[openProjectId,partnerProjectId,importedProjectId]);
    await db.from('projects').delete().in('id',[openProjectId,partnerProjectId,importedProjectId]);

    const {error:openProjectError}=await db.from('projects').insert({
      id:openProjectId,slug:'e2e-continuous-open-project',title:'E2E Continuous Open Project',summary:'Disposable lifecycle reliability project.',problem_statement:'Prove lifecycle and capacity invariants.',status:'draft',visibility:'private',project_type:'open',applications_open:false,team_size_threshold:3,project_type_review_required:false
    });
    await noError(openProjectError,'create open project');

    const {error:draftExposureError}=await db.from('projects').update({visibility:'public'}).eq('id',openProjectId);
    expect(draftExposureError,'draft project must not become public directly').not.toBeNull();

    const {error:deadlineError}=await db.from('projects').update({application_deadline:'2030-01-01T00:00:00.000Z'}).eq('id',openProjectId);
    expect(deadlineError,'open project must reject canonical application deadline').not.toBeNull();

    const {error:rolesError}=await db.from('project_roles').insert([
      {id:roleAId,project_id:openProjectId,title:'Validation Lead',openings:1,skills:[]},
      {id:roleBId,project_id:openProjectId,title:'Project Contributor',openings:2,skills:[]}
    ]);
    await noError(rolesError,'create open-project roles');

    const {error:publishError}=await db.from('projects').update({status:'open',visibility:'public',applications_open:true}).eq('id',openProjectId);
    await noError(publishError,'publish application-ready open project');

    const {error:teamSizeDriftError}=await db.from('projects').update({team_size_threshold:4}).eq('id',openProjectId);
    expect(teamSizeDriftError,'live project team size cannot exceed configured role capacity').not.toBeNull();

    const {error:roleDriftError}=await db.from('project_roles').update({openings:1}).eq('id',roleBId);
    expect(roleDriftError,'live role edits cannot reduce total capacity below required team size').not.toBeNull();

    const {error:runError}=await db.from('project_runs').insert({id:openRunId,project_id:openProjectId,run_number:1,status:'forming',team_size_threshold:3,required_team_size:3,has_started:false});
    await noError(runError,'create open-project forming cohort');

    users.push(await createDisposableUser(db,'a'),await createDisposableUser(db,'b'),await createDisposableUser(db,'c'),await createDisposableUser(db,'d'));

    const {error:firstMemberError}=await db.from('project_members').insert({project_id:openProjectId,project_run_id:openRunId,project_role_id:roleAId,user_id:users[0],team_role:'contributor',membership_status:'waiting'});
    await noError(firstMemberError,'assign first role member');

    const {error:roleOverfillError}=await db.from('project_members').insert({project_id:openProjectId,project_run_id:openRunId,project_role_id:roleAId,user_id:users[1],team_role:'contributor',membership_status:'waiting'});
    expect(roleOverfillError,'same role cannot exceed its openings').not.toBeNull();

    const {error:secondMemberError}=await db.from('project_members').insert({project_id:openProjectId,project_run_id:openRunId,project_role_id:roleBId,user_id:users[1],team_role:'contributor',membership_status:'waiting'});
    await noError(secondMemberError,'assign second cohort member');
    const {error:thirdMemberError}=await db.from('project_members').insert({project_id:openProjectId,project_run_id:openRunId,project_role_id:roleBId,user_id:users[2],team_role:'contributor',membership_status:'waiting'});
    await noError(thirdMemberError,'assign third cohort member');

    const {error:cohortOverfillError}=await db.from('project_members').insert({project_id:openProjectId,project_run_id:openRunId,project_role_id:roleBId,user_id:users[3],team_role:'contributor',membership_status:'waiting'});
    expect(cohortOverfillError,'cohort cannot exceed required team size').not.toBeNull();

    const {error:roleDeleteError}=await db.from('project_roles').delete().eq('id',roleAId);
    expect(roleDeleteError,'role with waiting member cannot be deleted').not.toBeNull();

    const {error:archiveLiveError}=await db.from('projects').update({status:'archived',visibility:'private',applications_open:false}).eq('id',openProjectId);
    expect(archiveLiveError,'live team cannot be archived').not.toBeNull();

    const {error:partnerError}=await db.from('projects').insert({
      id:partnerProjectId,slug:'e2e-single-partner-project',title:'E2E Partner Project',summary:'Disposable partner lifecycle project.',problem_statement:'Prove single-engagement invariants.',status:'draft',visibility:'private',project_type:'partner',partner_name:'E2E Partner',applications_open:false,team_size_threshold:2,project_type_review_required:false
    });
    await noError(partnerError,'create partner project');
    const {error:partnerRoleError}=await db.from('project_roles').insert({id:partnerRoleId,project_id:partnerProjectId,title:'Partner Project Contributor',openings:2,skills:[]});
    await noError(partnerRoleError,'create partner project role');
    const {error:partnerRun1Error}=await db.from('project_runs').insert({id:partnerRun1Id,project_id:partnerProjectId,run_number:1,status:'forming',team_size_threshold:2,required_team_size:2,has_started:false});
    await noError(partnerRun1Error,'create first partner run');
    const {error:partnerRun2Error}=await db.from('project_runs').insert({id:partnerRun2Id,project_id:partnerProjectId,run_number:2,status:'forming',team_size_threshold:2,required_team_size:2,has_started:false});
    expect(partnerRun2Error,'partner project must reject second run').not.toBeNull();

    const {error:partnerPublishError}=await db.from('projects').update({status:'recruiting',visibility:'public',applications_open:true}).eq('id',partnerProjectId);
    await noError(partnerPublishError,'publish partner intake');
    const {error:partnerActiveOpenError}=await db.from('projects').update({status:'active',applications_open:true}).eq('id',partnerProjectId);
    expect(partnerActiveOpenError,'active partner engagement must reject open intake').not.toBeNull();

    // Future controlled imports create a private Draft first. Marking the batch
    // imported creates a transparent default role only if no explicit role exists.
    const {error:importedProjectError}=await db.from('projects').insert({
      id:importedProjectId,slug:'e2e-imported-open-project',title:'E2E Imported Open Project',summary:'Disposable imported project.',problem_statement:'Prove future import role defaults.',status:'draft',visibility:'private',project_type:'open',applications_open:false,team_size_threshold:4,project_type_review_required:false
    });
    await noError(importedProjectError,'create imported draft project');
    const {error:batchError}=await db.from('capability_path_import_batches').insert({id:importBatchId,batch_key:'e2e-lifecycle-default-role',source_filename:'e2e-lifecycle.xlsx',source_sha256:'e3e1e3e1e3e1e3e1e3e1e3e1e3e1e3e1e3e1e3e1e3e1e3e1e3e1e3e1e3e1e3e1',source_version:'e2e',importer_version:'capability-paths-v1',status:'approved'});
    await noError(batchError,'create disposable import batch');
    const {error:originError}=await db.from('capability_path_import_project_origins').insert({batch_id:importBatchId,project_id:importedProjectId,source_project_key:'E2E-IMPORT-001',was_existing:false});
    await noError(originError,'create import project origin');
    const {error:markImportedError}=await db.from('capability_path_import_batches').update({status:'imported',imported_at:new Date().toISOString()}).eq('id',importBatchId);
    await noError(markImportedError,'mark import batch complete');
    const {data:defaultRoles,error:defaultRoleError}=await db.from('project_roles').select('title,openings').eq('project_id',importedProjectId);
    await noError(defaultRoleError,'read imported default role');
    expect(defaultRoles).toEqual([{title:'Project Contributor',openings:4}]);
    const {data:importedProject}=await db.from('projects').select('status,visibility,applications_open').eq('id',importedProjectId).single();
    expect(importedProject).toMatchObject({status:'draft',visibility:'private',applications_open:false});
  }finally{
    await db.from('projects').update({applications_open:false}).in('id',[openProjectId,partnerProjectId]);
    await db.from('project_members').delete().eq('project_id',openProjectId);
    await db.from('capability_path_import_project_origins').delete().eq('batch_id',importBatchId);
    await db.from('capability_path_import_batches').delete().eq('id',importBatchId);
    await db.from('project_runs').delete().in('project_id',[openProjectId,partnerProjectId]);
    await db.from('project_roles').delete().in('project_id',[openProjectId,partnerProjectId,importedProjectId]);
    await db.from('projects').delete().in('id',[openProjectId,partnerProjectId,importedProjectId]);
    await Promise.all(users.map(userId=>db.auth.admin.deleteUser(userId)));
  }
});
