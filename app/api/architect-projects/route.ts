import {NextResponse} from 'next/server';
import type {SupabaseClient} from '@supabase/supabase-js';
import {architectContext,archetypes,assignedRole,classifyRisk,clean,recordGovernance,slugify} from '@/lib/project-governance';

const reviewActions=new Set(['approve','recommend_admin','request_changes','deny']);
const sourceTypes=new Set(['google_sheets','excel','google_drive','github','kaggle','hugging_face','api','public_portal','cloud_location','external_website','other']);
const sensitivities=new Set(['public','internal','restricted']);
type Item=Record<string,unknown>;

function items(value:unknown,max=20){return(Array.isArray(value)?value:[]).filter((item):item is Item=>Boolean(item)&&typeof item==='object').slice(0,max)}
function list(value:unknown,maxItems=20,maxLength=600){return(Array.isArray(value)?value:[]).map(item=>clean(item,maxLength)).filter(Boolean).slice(0,maxItems)}
function httpsUrl(value:unknown,max=2000){const url=clean(value,max);return /^https:\/\//i.test(url)?url:''}
function boundedInt(value:unknown,min:number,max:number,fallback:number|null=null){const parsed=Number(value);return Number.isFinite(parsed)?Math.max(min,Math.min(max,Math.floor(parsed))):fallback}

async function experienceReadiness(db:SupabaseClient,projectId:string){
  const [{data:readiness,error:readinessError},{data:sources,error:sourcesError}]=await Promise.all([
    db.from('project_experience_readiness').select('experience_ready,missing_requirements').eq('project_id',projectId).maybeSingle(),
    db.from('project_data_sources').select('id,name,governance_status').eq('project_id',projectId).is('project_run_id',null)
  ]);
  if(readinessError)throw readinessError;if(sourcesError)throw sourcesError;
  const missing=Array.isArray(readiness?.missing_requirements)?readiness.missing_requirements.filter((item):item is string=>typeof item==='string'):[];
  const resourceBlockers=(sources||[]).filter(item=>item.governance_status!=='green').map(item=>({id:item.id,name:item.name,status:item.governance_status}));
  return{ready:Boolean(readiness?.experience_ready)&&missing.length===0,missing,resourceBlockers};
}

export async function GET(){
  try{
    const ctx=await architectContext();if('error'in ctx)return ctx.error;const {db,user,isAdmin}=ctx;
    const {data:assignments,error}=await db.from('project_architect_assignments').select('project_id,assignment_role,assignment_status,projects(id,slug,title,summary,project_archetype,governance_status,risk_level,risk_reasons,admin_review_required,visibility,status,created_by_user_id,updated_at)').eq('user_id',user.id).eq('assignment_status','active').order('assigned_at',{ascending:false});if(error)throw error;
    const {data:reviewable}=await db.from('projects').select('id,slug,title,summary,project_archetype,governance_status,risk_level,risk_reasons,admin_review_required,visibility,status,created_by_user_id,updated_at').eq('governance_status','submitted').neq('created_by_user_id',user.id).order('governance_submitted_at',{ascending:true});
    const projectIds=[...new Set((assignments||[]).map(row=>row.project_id))];
    const [{data:events},{data:profiles}]=await Promise.all([
      projectIds.length?db.from('project_governance_events').select('id,project_id,event_type,from_status,to_status,reason,actor_scope,created_at').in('project_id',projectIds).order('created_at',{ascending:false}):Promise.resolve({data:[]}),
      db.from('profiles').select('id,full_name').in('id',[...new Set([...(reviewable||[]).map(row=>row.created_by_user_id).filter(Boolean),user.id])])
    ]);
    const names=new Map((profiles||[]).map(row=>[row.id,row.full_name||'Project Architect']));
    return NextResponse.json({assignments:assignments||[],reviewable:(reviewable||[]).map(row=>({...row,creator_name:names.get(row.created_by_user_id)||'Project Architect'})),events:events||[],is_admin:isAdmin});
  }catch(error){console.error('architect projects list error',error);return NextResponse.json({error:'Unable to load Project Architect work.'},{status:500})}
}

export async function POST(request:Request){
  let createdId='';
  try{
    const ctx=await architectContext();if('error'in ctx)return ctx.error;const {db,user}=ctx;const body=await request.json();
    const title=clean(body.title,180),summary=clean(body.summary,900),archetype=clean(body.project_archetype,40),context=clean(body.problem_context,4000),stakeholder=clean(body.problem_stakeholder,2400),question=clean(body.problem_primary_question,2400),outcome=clean(body.problem_expected_outcome,2400),metrics=clean(body.problem_success_metrics,2400);
    if(!title||!summary||!archetypes.includes(archetype as typeof archetypes[number]))return NextResponse.json({error:'Add a title, summary and valid Data & AI archetype.'},{status:400});
    if(!context||!stakeholder||!question||!outcome||!metrics)return NextResponse.json({error:'Complete the problem context, stakeholder, primary question, expected outcome and success measures.'},{status:400});

    const resourceInputs=items(body.resources,20).map((item,index)=>{const rawUrl=clean(item.external_url,2000),externalUrl=httpsUrl(item.external_url),sourceType=clean(item.source_type,40);return{index,name:clean(item.name,180),description:clean(item.description,1600)||null,source_type:sourceType,external_url:externalUrl,invalid_url:Boolean(rawUrl&&!externalUrl),provider_name:clean(item.provider_name,180)||null,provider_url:httpsUrl(item.provider_url)||null,licence_name:clean(item.licence_name,180)||null,licence_url:httpsUrl(item.licence_url)||null,required_subset:clean(item.required_subset,1200)||null,approximate_size:clean(item.approximate_size,120)||null,data_period:clean(item.data_period,180)||null,data_format:clean(item.data_format,120)||null,unit_of_observation:clean(item.unit_of_observation,240)||null,known_limitations:clean(item.known_limitations,1600)||null,provenance:clean(item.provenance,1600)||null,sensitivity:sensitivities.has(clean(item.sensitivity,30))?clean(item.sensitivity,30):'internal'};});
    const invalidResource=resourceInputs.find(item=>!item.name||!sourceTypes.has(item.source_type)||!item.external_url||item.invalid_url);if(invalidResource)return NextResponse.json({error:`Resource ${invalidResource.index+1} needs a name, supported source type and HTTPS source URL.`},{status:400});

    const deliverableInputs=items(body.deliverables,20).map((item,index)=>({index,title:clean(item.title,180),deliverable_type:clean(item.deliverable_type,80)||'project_output',acceptance_criteria:clean(item.acceptance_criteria,2400),public_summary:clean(item.public_summary,1000)||null,expected_format:clean(item.expected_format,180)||null,is_required:item.is_required!==false,sort_order:boundedInt(item.sort_order,0,1000,index)??index}));
    const invalidDeliverable=deliverableInputs.find(item=>!item.title||!item.acceptance_criteria);if(invalidDeliverable)return NextResponse.json({error:`Deliverable ${invalidDeliverable.index+1} needs a title and acceptance criteria.`},{status:400});

    const successInputs=items(body.success_criteria,20).map((item,index)=>({index,title:clean(item.title,240),description:clean(item.description,1200)||null,measurement:clean(item.measurement,1200)||null,is_required:item.is_required!==false,visibility:['public','member','team','admin'].includes(clean(item.visibility,20))?clean(item.visibility,20):'public',sort_order:boundedInt(item.sort_order,0,1000,index)??index}));
    const invalidCriterion=successInputs.find(item=>!item.title);if(invalidCriterion)return NextResponse.json({error:`Success criterion ${invalidCriterion.index+1} needs a title.`},{status:400});

    const milestoneInputs=items(body.milestones,20).map((item,index)=>{const weekStart=boundedInt(item.week_start,1,520),weekEnd=boundedInt(item.week_end,1,520);return{index,title:clean(item.title,180),description:clean(item.description,1200)||null,week_start:weekStart,week_end:weekEnd??weekStart,expected_output:clean(item.expected_output,1000)||null,sort_order:boundedInt(item.sort_order,0,1000,index)??index};});
    const invalidMilestone=milestoneInputs.find(item=>!item.title||(item.week_start&&item.week_end&&item.week_end<item.week_start));if(invalidMilestone)return NextResponse.json({error:`Milestone ${invalidMilestone.index+1} needs a title and a valid week range.`},{status:400});

    const risk=classifyRisk({declared:body.declared_risk,partner:body.partner_project,sensitivity:body.data_sensitivity,impact:body.impact_area,rightsConfirmed:body.data_rights_confirmed,prohibited:body.prohibited_activity});
    if(risk.level==='prohibited')return NextResponse.json({error:'This proposal cannot proceed on Mettelo. Remove prohibited activity and confirm legitimate data rights before saving.',risk_reasons:risk.reasons},{status:422});
    const slugBase=slugify(title)||'architect-project';const slug=`${slugBase}-${Date.now().toString(36)}`;const now=new Date().toISOString();
    const {data:project,error}=await db.from('projects').insert({slug,title,summary,problem_statement:question,project_archetype:archetype,status:'draft',visibility:'private',project_type:body.partner_project?'partner':'open',partner_name:clean(body.partner_name,180)||null,location:clean(body.location,160)||'Remote',location_type:'remote',difficulty_level:clean(body.difficulty_level,30)||null,duration_weeks:body.duration_weeks?Math.max(1,Math.min(52,Number(body.duration_weeks))):null,weekly_commitment:clean(body.weekly_commitment,120)||null,team_size_threshold:Math.max(1,Math.min(50,Number(body.team_size_threshold)||5)),presentation_required:Boolean(body.presentation_required),created_by_user_id:user.id,governance_status:'draft',risk_level:risk.level,risk_reasons:risk.reasons,admin_review_required:risk.adminReviewRequired,updated_at:now}).select('id,slug,title,governance_status,risk_level').single();if(error)throw error;createdId=project.id;
    const {error:briefError}=await db.from('project_problem_briefs').insert({project_id:project.id,context,stakeholder,primary_question:question,expected_outcome:outcome,success_metrics:metrics,constraints:clean(body.problem_constraints,3000),ethics_considerations:clean(body.problem_ethics,3000),primary_use_case:clean(body.problem_primary_use_case,2400)||null,primary_objective:clean(body.problem_primary_objective,2400)||null,supporting_objectives:list(body.problem_supporting_objectives,12,1200),key_questions:list(body.problem_key_questions,12,1200),in_scope:list(body.problem_in_scope,20,800),out_of_scope:list(body.problem_out_of_scope,20,800),updated_by:user.id});if(briefError)throw briefError;
    const {error:assignmentError}=await db.from('project_architect_assignments').insert({project_id:project.id,user_id:user.id,assignment_role:'creating_architect',assigned_by_user_id:user.id});if(assignmentError)throw assignmentError;

    const roles=items(body.roles,12);if(roles.length){const rows=roles.map(item=>({project_id:project.id,title:clean(item.title,120),discipline:clean(item.discipline,120)||null,description:clean(item.description,1000)||null,openings:Math.max(1,Math.min(20,Number(item.openings)||1)),skills:list(item.skills,20,100),responsibilities:list(item.responsibilities,20,800),recommended_skills:list(item.recommended_skills,20,180),experience_expectation:clean(item.experience_expectation,1000)||null,weekly_commitment:clean(item.weekly_commitment,180)||null,role_status:'open',application_requirements:clean(item.application_requirements,1600)||null})).filter(row=>row.title);if(rows.length){const {error:roleError}=await db.from('project_roles').insert(rows);if(roleError)throw roleError}}

    if(resourceInputs.length){const rows=resourceInputs.map(item=>({project_id:project.id,project_run_id:null,name:item.name,description:item.description,source_type:item.source_type,external_url:item.external_url,owner_user_id:null,version_label:null,data_period:item.data_period,unit_of_observation:item.unit_of_observation,data_format:item.data_format,sensitivity:item.sensitivity,access_status:'needs_access',quality_status:'unreviewed',known_limitations:item.known_limitations,provenance:item.provenance,download_policy:'team_only',publish_policy:'not_permitted',provider_name:item.provider_name,provider_url:item.provider_url,licence_name:item.licence_name,licence_url:item.licence_url,required_subset:item.required_subset,approximate_size:item.approximate_size,retention_policy:'unknown',internal_storage_policy:'unknown',governance_status:'unreviewed',added_by:user.id}));const {error:resourceError}=await db.from('project_data_sources').insert(rows);if(resourceError)throw resourceError}
    if(deliverableInputs.length){const rows=deliverableInputs.map(item=>({project_id:project.id,project_run_id:null,workstream_id:null,title:item.title,deliverable_type:item.deliverable_type,owner_user_id:null,reviewer_user_id:null,acceptance_criteria:item.acceptance_criteria,status:'planned',is_required:item.is_required,created_by:user.id,public_summary:item.public_summary,expected_format:item.expected_format,sort_order:item.sort_order}));const {error:deliverableError}=await db.from('project_deliverables').insert(rows);if(deliverableError)throw deliverableError}
    if(successInputs.length){const rows=successInputs.map(item=>({project_id:project.id,title:item.title,description:item.description,measurement:item.measurement,is_required:item.is_required,visibility:item.visibility,sort_order:item.sort_order,created_by_user_id:user.id}));const {error:successError}=await db.from('project_success_criteria').insert(rows);if(successError)throw successError}
    if(milestoneInputs.length){const rows=milestoneInputs.map(item=>({project_id:project.id,title:item.title,description:item.description,week_start:item.week_start,week_end:item.week_end,expected_output:item.expected_output,sort_order:item.sort_order,status:'planned'}));const {error:milestoneError}=await db.from('project_milestones').insert(rows);if(milestoneError)throw milestoneError}

    await recordGovernance(db,{projectId:project.id,actorId:user.id,actorScope:'project_architect',eventType:'project_created',to:'draft',reason:'Project Architect created a private proposal.',metadata:{risk_level:risk.level,canonical_resources:resourceInputs.length,canonical_deliverables:deliverableInputs.length,success_criteria:successInputs.length,milestones:milestoneInputs.length}});
    return NextResponse.json({ok:true,item:project},{status:201});
  }catch(error){if(createdId){const db=(await architectContext());if(!('error'in db))await db.db.from('projects').delete().eq('id',createdId)}console.error('architect project create error',error);return NextResponse.json({error:'Unable to create this project proposal. Check the required details and try again.'},{status:500})}
}

export async function PATCH(request:Request){
  try{
    const ctx=await architectContext();if('error'in ctx)return ctx.error;const {db,user,isAdmin}=ctx;const body=await request.json();const projectId=clean(body.project_id,80),action=clean(body.action,40),reason=clean(body.reason,2000);if(!projectId||!action)return NextResponse.json({error:'Project and action are required.'},{status:400});
    const {data:project}=await db.from('projects').select('id,title,created_by_user_id,governance_status,risk_level,admin_review_required').eq('id',projectId).maybeSingle();if(!project)return NextResponse.json({error:'Project proposal not found.'},{status:404});const roles=await assignedRole(db,projectId,user.id);const isCreator=roles.includes('creating_architect');const isReviewer=roles.includes('reviewing_architect');
    if(action==='submit'){
      if(!isCreator||!['draft','changes_requested'].includes(project.governance_status))return NextResponse.json({error:'Only the creating Architect can submit this draft.'},{status:403});
      const readiness=await experienceReadiness(db,projectId);if(!readiness.ready)return NextResponse.json({error:'Complete the canonical project brief before submitting for review.',missing_requirements:readiness.missing},{status:409});
      await db.from('projects').update({governance_status:'submitted',governance_submitted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',projectId);await recordGovernance(db,{projectId,actorId:user.id,actorScope:'project_architect',eventType:'submitted_for_review',from:project.governance_status,to:'submitted',reason:reason||'Proposal submitted for independent review.'});return NextResponse.json({ok:true,status:'submitted'});
    }
    if(action==='claim_review'){
      if(project.created_by_user_id===user.id)return NextResponse.json({error:'You cannot review your own project.'},{status:409});if(project.governance_status!=='submitted')return NextResponse.json({error:'This proposal is not waiting for review.'},{status:409});
      const {error}=await db.from('project_architect_assignments').insert({project_id:projectId,user_id:user.id,assignment_role:'reviewing_architect',assigned_by_user_id:user.id});if(error)return NextResponse.json({error:error.code==='23505'?'Another Project Architect is already reviewing this proposal.':'Unable to claim this review.'},{status:409});await recordGovernance(db,{projectId,actorId:user.id,actorScope:'project_architect',eventType:'review_claimed',from:'submitted',to:'submitted',reason:'Independent Project Architect accepted the review.'});return NextResponse.json({ok:true,status:'submitted'});
    }
    if(reviewActions.has(action)){
      if(!isReviewer||project.created_by_user_id===user.id)return NextResponse.json({error:'Independent reviewing Architect access is required.'},{status:403});if(!reason)return NextResponse.json({error:'Add a reason for this governance decision.'},{status:400});
      if(action==='recommend_admin'){if(project.risk_level!=='controlled'&&!project.admin_review_required)return NextResponse.json({error:'Standard projects can be approved directly by the independent reviewer.'},{status:409});await recordGovernance(db,{projectId,actorId:user.id,actorScope:'project_architect',eventType:'review_recommend_admin',from:project.governance_status,to:'submitted',reason});return NextResponse.json({ok:true,status:'submitted'});}
      const target=action==='request_changes'?'changes_requested':action==='deny'?'denied':'approved';if(action==='approve'&&(project.risk_level!=='standard'||project.admin_review_required))return NextResponse.json({error:'Controlled projects require an independent recommendation followed by Admin approval.'},{status:409});
      if(action==='approve'){const readiness=await experienceReadiness(db,projectId);if(!readiness.ready)return NextResponse.json({error:'This project is not complete enough to publish.',missing_requirements:readiness.missing},{status:409});if(readiness.resourceBlockers.length)return NextResponse.json({error:'Resolve project resource governance before publication.',resource_blockers:readiness.resourceBlockers},{status:409})}
      await db.from('projects').update({governance_status:target,governance_decided_at:new Date().toISOString(),status:target==='approved'?'recruiting':'draft',visibility:target==='approved'?'public':'private',updated_at:new Date().toISOString()}).eq('id',projectId);await recordGovernance(db,{projectId,actorId:user.id,actorScope:'project_architect',eventType:`review_${action}`,from:project.governance_status,to:target,reason});return NextResponse.json({ok:true,status:target});
    }
    if(action==='assign_manager'){
      if(!isAdmin)return NextResponse.json({error:'Admin access is required to assign a Managing Architect.'},{status:403});const managerId=clean(body.user_id,80);if(!managerId)return NextResponse.json({error:'Choose an approved Project Architect.'},{status:400});await db.from('project_architect_assignments').update({assignment_status:'reassigned',ended_at:new Date().toISOString()}).eq('project_id',projectId).eq('assignment_role','managing_architect').eq('assignment_status','active');const {error}=await db.from('project_architect_assignments').insert({project_id:projectId,user_id:managerId,assignment_role:'managing_architect',assigned_by_user_id:user.id});if(error)throw error;await recordGovernance(db,{projectId,actorId:user.id,actorScope:'admin',eventType:'manager_assigned',from:project.governance_status,to:project.governance_status,reason:reason||'Admin assigned project delivery oversight.',metadata:{manager_user_id:managerId}});return NextResponse.json({ok:true,status:project.governance_status});
    }
    return NextResponse.json({error:'Unknown project-governance action.'},{status:400});
  }catch(error){console.error('architect project action error',error);return NextResponse.json({error:'Unable to update this project proposal.'},{status:500})}
}
