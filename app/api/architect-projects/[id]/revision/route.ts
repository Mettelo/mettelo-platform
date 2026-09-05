import {NextResponse} from 'next/server';
import {architectContext,archetypes,assignedRole,classifyRisk,clean} from '@/lib/project-governance';
import {parseProjectParticipation,validateProjectParticipation} from '@/lib/project-participation';

const sourceTypes=new Set(['google_sheets','excel','google_drive','github','kaggle','hugging_face','api','public_portal','cloud_location','external_website','other']);
const sensitivities=new Set(['public','internal','restricted']);
const importanceValues=new Set(['core','supporting','exposure']);
type Item=Record<string,unknown>;
type Context={params:Promise<{id:string}>};

function items(value:unknown,max=40){return(Array.isArray(value)?value:[]).filter((item):item is Item=>Boolean(item)&&typeof item==='object').slice(0,max)}
function list(value:unknown,maxItems=20,maxLength=1200){return(Array.isArray(value)?value:[]).map(item=>clean(item,maxLength)).filter(Boolean).slice(0,maxItems)}
function httpsUrl(value:unknown,max=2000){const raw=clean(value,max);return /^https:\/\//i.test(raw)?raw:''}
function uuid(value:unknown){const id=clean(value,80);return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)?id:''}
function integer(value:unknown,min:number,max:number,fallback:number|null=null){const parsed=Number(value);return Number.isFinite(parsed)?Math.max(min,Math.min(max,Math.floor(parsed))):fallback}
function rpcErrorMessage(message:string){
  if(message.includes('GREEN_RESOURCE_EDIT_BLOCKED'))return 'A GREEN resource changed. Admin must reopen its resource-governance decision before the Project Architect can edit it.';
  if(message.includes('REVIEWED_RESOURCE_REMOVAL_BLOCKED'))return 'A resource with governance history cannot be removed. Admin must resolve that resource explicitly.';
  if(message.includes('RESOURCE_NOT_IN_PROJECT'))return 'One resource no longer belongs to this project. Reload the draft before saving.';
  if(message.includes('DELIVERABLE_NOT_IN_PROJECT')||message.includes('SUCCESS_CRITERION_NOT_IN_PROJECT')||message.includes('MILESTONE_NOT_IN_PROJECT')||message.includes('ROLE_NOT_IN_PROJECT'))return 'The project changed while this draft was open. Reload it before saving so existing record IDs are preserved.';
  if(message.includes('PROJECT_NOT_EDITABLE'))return 'This project is no longer editable because its governance state changed.';
  if(message.includes('INVALID_PARTICIPATION'))return 'The project participation mode or team capacity is no longer valid. Review minimum, target and maximum team sizes.';
  if(message.includes('INVALID_TEAM_MINIMUM'))return 'Team projects require at least two participants.';
  if(message.includes('INVALID_FLEXIBLE_MINIMUM'))return 'Flexible projects must be able to begin with one participant.';
  return 'Unable to save this canonical project revision.';
}

export async function PATCH(request:Request,{params}:Context){
  try{
    const {id}=await params;const projectId=uuid(id);if(!projectId)return NextResponse.json({error:'Valid project ID required.'},{status:400});
    const ctx=await architectContext();if('error'in ctx)return ctx.error;const {db,user,isAdmin}=ctx;
    const {data:project,error:projectReadError}=await db.from('projects').select('id,governance_status,participation_mode,min_team_size,target_team_size,max_team_size,team_size_threshold').eq('id',projectId).maybeSingle();if(projectReadError)throw projectReadError;if(!project)return NextResponse.json({error:'Project proposal not found.'},{status:404});
    const assignmentRoles=await assignedRole(db,projectId,user.id);if(!isAdmin&&!assignmentRoles.includes('creating_architect'))return NextResponse.json({error:'Creating Project Architect access is required.'},{status:403});
    if(!['draft','changes_requested'].includes(project.governance_status))return NextResponse.json({error:'Only draft or changes-requested proposals can be edited.'},{status:409});

    const body=await request.json();
    const title=clean(body.title,180),summary=clean(body.summary,900),projectArchetype=clean(body.project_archetype,40);
    const context=clean(body.problem_context,4000),stakeholder=clean(body.problem_stakeholder,2400),primaryQuestion=clean(body.problem_primary_question,2400),expectedOutcome=clean(body.problem_expected_outcome,2400),successMetrics=clean(body.problem_success_metrics,2400);
    if(!title||summary.length<40||!archetypes.includes(projectArchetype as typeof archetypes[number]))return NextResponse.json({error:'Add a title, a clear summary of at least 40 characters and a valid Data & AI archetype.'},{status:400});
    if(!context||!stakeholder||!primaryQuestion||!expectedOutcome||!successMetrics)return NextResponse.json({error:'Complete the problem context, stakeholder, primary question, expected outcome and success measures.'},{status:400});
    if(!clean(body.problem_primary_use_case,2400)||!clean(body.problem_primary_objective,2400))return NextResponse.json({error:'Add the primary use case and primary objective.'},{status:400});

    const participationSource=body.participation_mode?body:{...body,participation_mode:project.participation_mode,min_team_size:project.min_team_size,target_team_size:project.target_team_size,max_team_size:project.max_team_size,team_size_threshold:project.team_size_threshold};
    const participation=parseProjectParticipation(participationSource as Record<string,unknown>);
    const participationError=validateProjectParticipation(participation);
    if(participationError)return NextResponse.json({error:participationError},{status:400});

    const resources=items(body.resources,20).map((item,index)=>{const rawUrl=clean(item.external_url,2000),externalUrl=httpsUrl(item.external_url),rawProviderId=clean(item.provider_id,80),providerId=rawProviderId?uuid(rawProviderId):'';return{index,id:uuid(item.id)||null,name:clean(item.name,180),description:clean(item.description,1600)||null,source_type:clean(item.source_type,40),external_url:externalUrl,invalid_url:Boolean(rawUrl&&!externalUrl),provider_id:providerId||null,invalid_provider:Boolean(rawProviderId&&!providerId),provider_name:clean(item.provider_name,180)||null,provider_url:httpsUrl(item.provider_url)||null,licence_name:clean(item.licence_name,180)||null,licence_url:httpsUrl(item.licence_url)||null,required_subset:clean(item.required_subset,1200)||null,approximate_size:clean(item.approximate_size,120)||null,data_period:clean(item.data_period,180)||null,data_format:clean(item.data_format,120)||null,unit_of_observation:clean(item.unit_of_observation,240)||null,known_limitations:clean(item.known_limitations,1600)||null,provenance:clean(item.provenance,1600)||null,sensitivity:sensitivities.has(clean(item.sensitivity,30))?clean(item.sensitivity,30):'internal'};});
    const invalidResource=resources.find(item=>!item.name||!sourceTypes.has(item.source_type)||!item.external_url||item.invalid_url||item.invalid_provider);if(invalidResource)return NextResponse.json({error:`Resource ${invalidResource.index+1} needs a name, supported source type, HTTPS source URL and valid provider reference when supplied.`},{status:400});
    const providerIds=[...new Set(resources.map(item=>item.provider_id).filter((value):value is string=>Boolean(value)))];if(providerIds.length){const {data,error}=await db.from('project_resource_providers').select('id').in('id',providerIds).eq('is_active',true);if(error)throw error;if((data||[]).length!==providerIds.length)return NextResponse.json({error:'Choose only active governed source providers.'},{status:400})}

    const deliverables=items(body.deliverables,20).map((item,index)=>({id:uuid(item.id)||null,title:clean(item.title,180),deliverable_type:clean(item.deliverable_type,80)||'project_output',acceptance_criteria:clean(item.acceptance_criteria,2400),public_summary:clean(item.public_summary,1000)||null,expected_format:clean(item.expected_format,180)||null,is_required:item.is_required!==false,sort_order:index}));
    if(!deliverables.length||deliverables.some(item=>!item.title||!item.acceptance_criteria))return NextResponse.json({error:'Define at least one deliverable, and give every deliverable a title and acceptance criteria.'},{status:400});
    const successCriteria=items(body.success_criteria,20).map((item,index)=>({id:uuid(item.id)||null,title:clean(item.title,240),description:clean(item.description,1200)||null,measurement:clean(item.measurement,1200)||null,is_required:item.is_required!==false,visibility:['public','member','team','admin'].includes(clean(item.visibility,20))?clean(item.visibility,20):'public',sort_order:index}));
    if(!successCriteria.length||successCriteria.some(item=>!item.title))return NextResponse.json({error:'Define at least one success criterion and give each criterion a title.'},{status:400});
    const milestones=items(body.milestones,20).map((item,index)=>{const weekStart=integer(item.week_start,1,520),weekEnd=integer(item.week_end,1,520);return{id:uuid(item.id)||null,title:clean(item.title,180),description:clean(item.description,1200)||null,week_start:weekStart,week_end:weekEnd??weekStart,expected_output:clean(item.expected_output,1000)||null,sort_order:index}});
    if(!milestones.length||milestones.some(item=>!item.title||(item.week_start&&item.week_end&&item.week_end<item.week_start)))return NextResponse.json({error:'Define at least one milestone with a valid week range.'},{status:400});
    const roles=items(body.roles,20).map(item=>({id:uuid(item.id)||null,title:clean(item.title,120),discipline:clean(item.discipline,120)||null,description:clean(item.description,1000)||null,openings:integer(item.openings,1,20,1)??1,skills:list(item.skills,20,100),responsibilities:list(item.responsibilities,20,800),recommended_skills:list(item.recommended_skills,20,180),experience_expectation:clean(item.experience_expectation,1000)||null,weekly_commitment:clean(item.weekly_commitment,180)||null,application_requirements:clean(item.application_requirements,1600)||null})).filter(item=>item.title);
    if(!roles.length)return NextResponse.json({error:'Define at least one contributor role.'},{status:400});
    const rawCapabilities=items(body.capabilities,40).map(item=>({capability_id:uuid(item.capability_id),importance:importanceValues.has(clean(item.importance,20))?clean(item.importance,20):'core',evidence_expected:item.evidence_expected===true}));if(rawCapabilities.some(item=>!item.capability_id))return NextResponse.json({error:'Every selected capability must reference a valid governed capability.'},{status:400});
    const capabilities=[...new Map(rawCapabilities.map(item=>[item.capability_id,item])).values()];if(!capabilities.length)return NextResponse.json({error:'Select at least one governed capability.'},{status:400});
    const {data:activeCapabilities,error:capabilityError}=await db.from('capabilities').select('id').in('id',capabilities.map(item=>item.capability_id)).eq('is_active',true);if(capabilityError)throw capabilityError;if((activeCapabilities||[]).length!==capabilities.length)return NextResponse.json({error:'Choose only active governed capabilities.'},{status:400});

    const risk=classifyRisk({declared:body.declared_risk,partner:body.partner_project,sensitivity:body.data_sensitivity,impact:body.impact_area,rightsConfirmed:body.data_rights_confirmed,prohibited:body.prohibited_activity});
    if(risk.level==='prohibited')return NextResponse.json({error:'This revision cannot proceed. Remove prohibited activity and re-confirm legitimate data access and usage rights.',risk_reasons:risk.reasons},{status:422});

    const payload={title,summary,project_archetype:projectArchetype,difficulty_level:clean(body.difficulty_level,30)||null,duration_weeks:integer(body.duration_weeks,1,52),weekly_commitment:clean(body.weekly_commitment,120)||null,...participation,location:clean(body.location,160)||'Remote',partner_project:body.partner_project===true,partner_name:clean(body.partner_name,180)||null,presentation_required:body.presentation_required===true,brief:{context,stakeholder,primary_question:primaryQuestion,expected_outcome:expectedOutcome,success_metrics:successMetrics,constraints:clean(body.problem_constraints,3000),ethics_considerations:clean(body.problem_ethics,3000),primary_use_case:clean(body.problem_primary_use_case,2400),primary_objective:clean(body.problem_primary_objective,2400),supporting_objectives:list(body.problem_supporting_objectives,12,1200),key_questions:list(body.problem_key_questions,12,1200),in_scope:list(body.problem_in_scope,20,800),out_of_scope:list(body.problem_out_of_scope,20,800)},resources,deliverables,success_criteria:successCriteria,milestones,roles,capabilities};
    const {error:revisionError}=await db.rpc('apply_project_experience_draft_revision',{target_project_id:projectId,actor_user_id:user.id,actor_scope_value:isAdmin?'admin':'project_architect',payload,target_risk_level:risk.level,target_risk_reasons:risk.reasons,target_admin_review_required:risk.adminReviewRequired});
    if(revisionError)return NextResponse.json({error:rpcErrorMessage(revisionError.message)},{status:revisionError.message.includes('BLOCKED')||revisionError.message.includes('NOT_EDITABLE')?409:500});
    return NextResponse.json({ok:true,id:projectId,governance_status:project.governance_status,participation});
  }catch(error){console.error('atomic project draft revision error',error);return NextResponse.json({error:'Unable to save this canonical project revision.'},{status:500})}
}
