import type {SupabaseClient} from '@supabase/supabase-js';

/**
 * Makes an isolated test project satisfy the same canonical publication contract
 * as a real project. This is deliberately not a bypass: callers must create the
 * project as draft/private first and may only promote it after this helper has
 * populated the governed definition.
 */
export async function makeGovernedProjectPublicationReady(db:SupabaseClient,projectId:string){
 const {data:users,error:userError}=await db.auth.admin.listUsers({page:1,perPage:1000});
 if(userError)throw userError;
 const actor=users.users.find(user=>user.email===process.env.E2E_ADMIN_EMAIL)||users.users[0];
 if(!actor)throw new Error('Governed project fixture requires a disposable local actor.');

 let result=await db.from('projects').update({
  location:'Remote',location_type:'remote',catalogue_working_model_source:'explicit',
  difficulty_level:'intermediate',duration_weeks:4,weekly_commitment:'4 hours/week',application_deadline:null,
 }).eq('id',projectId);
 if(result.error)throw result.error;

 const {data:brief,error:briefReadError}=await db.from('project_problem_briefs').select('project_id').eq('project_id',projectId).maybeSingle();
 if(briefReadError)throw briefReadError;
 if(!brief){
  result=await db.from('project_problem_briefs').insert({
   project_id:projectId,
   context:'Disposable local release fixture used to validate governed project lifecycle behavior.',
   stakeholder:'Mettelo members and project governance reviewers',
   primary_question:'Does the tested project behavior preserve the canonical project contract?',
   expected_outcome:'The targeted release behavior succeeds without bypassing governance or creating parallel project state.',
   success_metrics:'All assertions in the owning release test pass against the canonical database contract.',
   constraints:'Synthetic local CI data only.',ethics_considerations:'No production identities or sensitive data.',
   primary_use_case:'Release validation for canonical project behavior.',primary_objective:'Prove the requested project lifecycle invariant.',
   supporting_objectives:['Preserve canonical ownership','Keep release behavior deterministic'],
   key_questions:['Is project state canonical?','Are governance boundaries enforced?'],
   in_scope:['Canonical project lifecycle','Release test behavior'],out_of_scope:['Production data','External integrations'],
   updated_by:actor.id,updated_at:new Date().toISOString(),
  });
  if(result.error)throw result.error;
 }

 const {data:roles,error:rolesError}=await db.from('project_roles').select('id').eq('project_id',projectId).limit(1);
 if(rolesError)throw rolesError;
 if(!roles?.length){
  result=await db.from('project_roles').insert({project_id:projectId,title:'Data Analyst',discipline:'Data & AI',description:'Canonical release-validation contribution area.',skills:['Data analysis','Testing and QA','Collaboration'],responsibilities:['Validate the governed project behavior'],recommended_skills:['Data analysis'],openings:5});
  if(result.error)throw result.error;
 }

 const [{data:roleFamily,error:roleError},{data:domain,error:domainError},{data:capabilities,error:capabilityError}]=await Promise.all([
  db.from('project_role_catalogue').select('id').eq('slug','data-analyst').eq('active',true).maybeSingle(),
  db.from('domains').select('id').eq('slug','cross-industry-open-data').eq('is_active',true).maybeSingle(),
  db.from('capabilities').select('id').in('slug',['data-analysis','testing-qa','collaboration']).eq('is_active',true),
 ]);
 if(roleError)throw roleError;if(domainError)throw domainError;if(capabilityError)throw capabilityError;
 if(!roleFamily||!domain||(capabilities||[]).length!==3)throw new Error('Canonical release taxonomy fixtures are missing.');

 const {data:existingFamily,error:familyReadError}=await db.from('project_role_families').select('project_id').eq('project_id',projectId).limit(1);
 if(familyReadError)throw familyReadError;
 if(!existingFamily?.length){result=await db.from('project_role_families').insert({project_id:projectId,role_catalogue_id:roleFamily.id,source:'release_fixture'});if(result.error)throw result.error;}
 const {data:existingDomain,error:domainReadError}=await db.from('project_domains').select('project_id').eq('project_id',projectId).limit(1);
 if(domainReadError)throw domainReadError;
 if(!existingDomain?.length){result=await db.from('project_domains').insert({project_id:projectId,domain_id:domain.id,is_primary:true});if(result.error)throw result.error;}
 const {data:existingCaps,error:capsReadError}=await db.from('project_capabilities').select('capability_id').eq('project_id',projectId);
 if(capsReadError)throw capsReadError;
 const existingCapIds=new Set((existingCaps||[]).map(row=>String(row.capability_id)));
 const missingCaps=(capabilities||[]).filter(capability=>!existingCapIds.has(String(capability.id))).map(capability=>({project_id:projectId,capability_id:capability.id,importance:'core',evidence_expected:true}));
 if(missingCaps.length){result=await db.from('project_capabilities').insert(missingCaps);if(result.error)throw result.error;}

 const {data:deliverables,error:deliverablesError}=await db.from('project_deliverables').select('id').eq('project_id',projectId).limit(1);
 if(deliverablesError)throw deliverablesError;
 if(!deliverables?.length){result=await db.from('project_deliverables').insert({project_id:projectId,project_run_id:null,canonical_item_key:`${projectId}:release-deliverable`,title:'Governed release evidence',deliverable_type:'canonical',acceptance_criteria:'Demonstrate the tested project behavior against canonical governance.',public_summary:'Canonical release evidence.',expected_format:'Release evidence',is_required:true,sort_order:1,created_by:actor.id});if(result.error)throw result.error;}
 const {data:criteria,error:criteriaError}=await db.from('project_success_criteria').select('id').eq('project_id',projectId).limit(1);
 if(criteriaError)throw criteriaError;
 if(!criteria?.length){result=await db.from('project_success_criteria').insert({project_id:projectId,title:'Canonical behavior is preserved',description:'The project passes its targeted release behavior without bypassing governance.',measurement:'Owning release assertions pass.',is_required:true,visibility:'public',sort_order:1,created_by_user_id:actor.id});if(result.error)throw result.error;}
 const {data:milestones,error:milestonesError}=await db.from('project_milestones').select('id').eq('project_id',projectId).limit(1);
 if(milestonesError)throw milestonesError;
 if(!milestones?.length){result=await db.from('project_milestones').insert({project_id:projectId,project_run_id:null,title:'Release validation',description:'Complete the governed project release assertions.',status:'planned',sort_order:1,week_start:1,week_end:4,expected_output:'Exact-head release evidence'});if(result.error)throw result.error;}

 const {data:blockers,error:blockerError}=await db.rpc('workstream2_publication_blockers',{p_project_id:projectId});
 if(blockerError)throw blockerError;
 if(Array.isArray(blockers)&&blockers.length)throw new Error(`Governed fixture is not publication ready: ${blockers.join(',')}`);
}
