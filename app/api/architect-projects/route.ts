import {NextResponse} from 'next/server';
import {architectContext,archetypes,assignedRole,classifyRisk,clean,recordGovernance,slugify} from '@/lib/project-governance';
import {getProjectCatalogueReadinessMap,requireProjectCatalogueReady} from '@/lib/project-catalogue-readiness';

const reviewActions=new Set(['approve','recommend_admin','request_changes','deny']);
const allowedWorkingModels=new Set(['remote','hybrid','onsite']);
function cleanArray(value:unknown,max=20){return Array.isArray(value)?[...new Set(value.map(item=>clean(item,120)).filter(Boolean))].slice(0,max):[]}

export async function GET(){
  try{
    const ctx=await architectContext();if('error'in ctx)return ctx.error;const {db,user,isAdmin}=ctx;
    const {data:assignments,error}=await db.from('project_architect_assignments').select('project_id,assignment_role,assignment_status,projects(id,slug,title,summary,project_archetype,governance_status,risk_level,risk_reasons,admin_review_required,visibility,status,created_by_user_id,updated_at)').eq('user_id',user.id).eq('assignment_status','active').order('assigned_at',{ascending:false});if(error)throw error;
    const {data:reviewable}=await db.from('projects').select('id,slug,title,summary,project_archetype,governance_status,risk_level,risk_reasons,admin_review_required,visibility,status,created_by_user_id,updated_at').eq('governance_status','submitted').neq('created_by_user_id',user.id).order('governance_submitted_at',{ascending:true});
    const assignmentProjectIds=(assignments||[]).map(row=>row.project_id);const reviewableIds=(reviewable||[]).map(row=>row.id);const allProjectIds=[...new Set([...assignmentProjectIds,...reviewableIds])];
    const [{data:events},{data:profiles},{data:roleFamilies},{data:domains},{data:capabilities},{data:tools},readiness]=await Promise.all([
      assignmentProjectIds.length?db.from('project_governance_events').select('id,project_id,event_type,from_status,to_status,reason,actor_scope,created_at').in('project_id',assignmentProjectIds).order('created_at',{ascending:false}):Promise.resolve({data:[]}),
      db.from('profiles').select('id,full_name').in('id',[...new Set([...(reviewable||[]).map(row=>row.created_by_user_id).filter(Boolean),user.id])]),
      db.from('project_role_catalogue').select('slug,title').eq('active',true).order('sort_order'),
      db.from('domains').select('slug,name').eq('is_active',true).order('sort_order'),
      db.from('capabilities').select('slug,name,capability_type').eq('is_active',true).order('sort_order'),
      db.from('tools').select('slug,name').eq('is_active',true).order('sort_order'),
      getProjectCatalogueReadinessMap(db,allProjectIds)
    ]);
    const names=new Map((profiles||[]).map(row=>[row.id,row.full_name||'Project Architect']));
    const withReadiness=<T extends {id:string}>(row:T)=>({...row,catalogue_readiness:readiness.get(row.id)||null});
    return NextResponse.json({assignments:(assignments||[]).map(row=>{const project=Array.isArray(row.projects)?row.projects.map(withReadiness):row.projects?withReadiness(row.projects):null;return{...row,projects:project}}),reviewable:(reviewable||[]).map(row=>({...withReadiness(row),creator_name:names.get(row.created_by_user_id)||'Project Architect'})),events:events||[],is_admin:isAdmin,taxonomy:{role_families:roleFamilies||[],domains:domains||[],capabilities:capabilities||[],tools:tools||[]}});
  }catch(error){console.error('architect projects list error',error);return NextResponse.json({error:'Unable to load Project Architect work.'},{status:500})}
}

export async function POST(request:Request){
  let createdId='';
  try{
    const ctx=await architectContext();if('error'in ctx)return ctx.error;const {db,user}=ctx;const body=await request.json();
    const title=clean(body.title,180),summary=clean(body.summary,900),archetype=clean(body.project_archetype,40),context=clean(body.problem_context,4000),stakeholder=clean(body.problem_stakeholder,2400),question=clean(body.problem_primary_question,2400),outcome=clean(body.problem_expected_outcome,2400),metrics=clean(body.problem_success_metrics,2400);
    if(!title||!summary||!archetypes.includes(archetype as typeof archetypes[number]))return NextResponse.json({error:'Add a title, summary and valid Data & AI archetype.'},{status:400});
    if(!context||!stakeholder||!question||!outcome||!metrics)return NextResponse.json({error:'Complete the problem context, stakeholder, primary question, expected outcome and success measures.'},{status:400});
    const durationWeeks=Number(body.duration_weeks);const weeklyCommitment=clean(body.weekly_commitment,120);const workingModel=clean(body.working_model,30);const domainSlug=clean(body.domain_slug,120);const roleFamilySlugs=cleanArray(body.role_family_slugs,12);const capabilitySlugs=cleanArray(body.capability_slugs,30);const toolSlugs=cleanArray(body.tool_slugs,20);
    if(!Number.isFinite(durationWeeks)||durationWeeks<1||durationWeeks>52||!weeklyCommitment)return NextResponse.json({error:'Add a valid duration and weekly commitment before creating the draft.'},{status:400});
    if(!allowedWorkingModels.has(workingModel))return NextResponse.json({error:'Choose an explicit working model: Remote, Hybrid or On-site.'},{status:400});
    if(!domainSlug||roleFamilySlugs.length<1||capabilitySlugs.length<3)return NextResponse.json({error:'Catalogue classification requires one Domain, at least one canonical Role family and at least three Skills / Capabilities.'},{status:400});
    const [{data:domain},{data:roleFamilies},{data:capabilities},{data:tools}]=await Promise.all([
      db.from('domains').select('id,slug').eq('slug',domainSlug).eq('is_active',true).maybeSingle(),
      db.from('project_role_catalogue').select('id,slug').in('slug',roleFamilySlugs).eq('active',true),
      db.from('capabilities').select('id,slug').in('slug',capabilitySlugs).eq('is_active',true),
      toolSlugs.length?db.from('tools').select('id,slug').in('slug',toolSlugs).eq('is_active',true):Promise.resolve({data:[]})
    ]);
    if(!domain||new Set((roleFamilies||[]).map(row=>row.slug)).size!==roleFamilySlugs.length||new Set((capabilities||[]).map(row=>row.slug)).size!==capabilitySlugs.length||new Set((tools||[]).map(row=>row.slug)).size!==toolSlugs.length)return NextResponse.json({error:'One or more catalogue classifications are invalid or inactive. Refresh the form and choose governed values.'},{status:400});
    const risk=classifyRisk({declared:body.declared_risk,partner:body.partner_project,sensitivity:body.data_sensitivity,impact:body.impact_area,rightsConfirmed:body.data_rights_confirmed,prohibited:body.prohibited_activity});
    if(risk.level==='prohibited')return NextResponse.json({error:'This proposal cannot proceed on Mettelo. Remove prohibited activity and confirm legitimate data rights before saving.',risk_reasons:risk.reasons},{status:422});
    const slugBase=slugify(title)||'architect-project';const slug=`${slugBase}-${Date.now().toString(36)}`;const now=new Date().toISOString();
    const {data:project,error}=await db.from('projects').insert({slug,title,summary,problem_statement:question,project_archetype:archetype,status:'draft',visibility:'private',project_type:body.partner_project?'partner':'open',partner_name:clean(body.partner_name,180)||null,location:workingModel==='remote'?'Remote':clean(body.location,160)||null,location_type:workingModel,catalogue_working_model_source:'explicit',difficulty_level:clean(body.difficulty_level,30)||null,duration_weeks:Math.round(durationWeeks),weekly_commitment:weeklyCommitment,team_size_threshold:Math.max(1,Math.min(50,Number(body.team_size_threshold)||5)),presentation_required:Boolean(body.presentation_required),created_by_user_id:user.id,governance_status:'draft',risk_level:risk.level,risk_reasons:risk.reasons,admin_review_required:risk.adminReviewRequired,updated_at:now}).select('id,slug,title,governance_status,risk_level').single();if(error)throw error;createdId=project.id;
    const {error:briefError}=await db.from('project_problem_briefs').insert({project_id:project.id,context,stakeholder,primary_question:question,expected_outcome:outcome,success_metrics:metrics,constraints:clean(body.problem_constraints,3000),ethics_considerations:clean(body.problem_ethics,3000),updated_by:user.id});if(briefError)throw briefError;
    const {error:assignmentError}=await db.from('project_architect_assignments').insert({project_id:project.id,user_id:user.id,assignment_role:'creating_architect',assigned_by_user_id:user.id});if(assignmentError)throw assignmentError;
    const roles=Array.isArray(body.roles)?body.roles.slice(0,12):[];if(roles.length){const rows=roles.map((role:unknown)=>{const item=role as Record<string,unknown>;return{project_id:project.id,title:clean(item.title,120),discipline:clean(item.discipline,120)||null,description:clean(item.description,1000)||null,openings:Math.max(1,Math.min(20,Number(item.openings)||1)),skills:[]}}).filter((row:{title:string})=>row.title);if(rows.length){const {error:roleError}=await db.from('project_roles').insert(rows);if(roleError)throw roleError}}
    const relationWrites=[
      db.from('project_domains').insert({project_id:project.id,domain_id:domain.id,is_primary:true}),
      db.from('project_role_families').insert((roleFamilies||[]).map(row=>({project_id:project.id,role_catalogue_id:row.id,source:'architect_authored'}))),
      db.from('project_capabilities').insert((capabilities||[]).map(row=>({project_id:project.id,capability_id:row.id,importance:'core',evidence_expected:true})))
    ];
    if((tools||[]).length)relationWrites.push(db.from('project_tools').insert((tools||[]).map(row=>({project_id:project.id,tool_id:row.id}))));
    const relationResults=await Promise.all(relationWrites);const relationError=relationResults.find(result=>result.error)?.error;if(relationError)throw relationError;
    await recordGovernance(db,{projectId:project.id,actorId:user.id,actorScope:'project_architect',eventType:'project_created',to:'draft',reason:'Project Architect created a private proposal with governed catalogue classification.',metadata:{risk_level:risk.level,domain:domainSlug,role_families:roleFamilySlugs,capabilities:capabilitySlugs,tools:toolSlugs,working_model:workingModel}});
    const readiness=await requireProjectCatalogueReady(db,project.id);
    return NextResponse.json({ok:true,item:project,catalogue_readiness:readiness.readiness},{status:201});
  }catch(error){if(createdId){const db=(await architectContext());if(!('error'in db))await db.db.from('projects').delete().eq('id',createdId)}console.error('architect project create error',error);return NextResponse.json({error:'Unable to create this project proposal. Check the required details and try again.'},{status:500})}
}

export async function PATCH(request:Request){
  try{
    const ctx=await architectContext();if('error'in ctx)return ctx.error;const {db,user,isAdmin}=ctx;const body=await request.json();const projectId=clean(body.project_id,80),action=clean(body.action,40),reason=clean(body.reason,2000);if(!projectId||!action)return NextResponse.json({error:'Project and action are required.'},{status:400});
    const {data:project}=await db.from('projects').select('id,title,created_by_user_id,governance_status,risk_level,admin_review_required').eq('id',projectId).maybeSingle();if(!project)return NextResponse.json({error:'Project proposal not found.'},{status:404});const roles=await assignedRole(db,projectId,user.id);const isCreator=roles.includes('creating_architect');const isReviewer=roles.includes('reviewing_architect');
    if(action==='submit'){
      if(!isCreator||!['draft','changes_requested'].includes(project.governance_status))return NextResponse.json({error:'Only the creating Architect can submit this draft.'},{status:403});
      const readiness=await requireProjectCatalogueReady(db,projectId);if(!readiness.ok)return NextResponse.json({error:`Complete catalogue readiness before review: ${readiness.missing.join(', ')}.`,missing_requirements:readiness.missing,catalogue_readiness:readiness.readiness},{status:409});
      await db.from('projects').update({governance_status:'submitted',governance_submitted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',projectId);await recordGovernance(db,{projectId,actorId:user.id,actorScope:'project_architect',eventType:'submitted_for_review',from:project.governance_status,to:'submitted',reason:reason||'Proposal submitted for independent review.'});return NextResponse.json({ok:true,status:'submitted'});
    }
    if(action==='claim_review'){
      if(project.created_by_user_id===user.id)return NextResponse.json({error:'You cannot review your own project.'},{status:409});if(project.governance_status!=='submitted')return NextResponse.json({error:'This proposal is not waiting for review.'},{status:409});
      const {error}=await db.from('project_architect_assignments').insert({project_id:projectId,user_id:user.id,assignment_role:'reviewing_architect',assigned_by_user_id:user.id});if(error)return NextResponse.json({error:error.code==='23505'?'Another Project Architect is already reviewing this proposal.':'Unable to claim this review.'},{status:409});await recordGovernance(db,{projectId,actorId:user.id,actorScope:'project_architect',eventType:'review_claimed',from:'submitted',to:'submitted',reason:'Independent Project Architect accepted the review.'});return NextResponse.json({ok:true,status:'submitted'});
    }
    if(reviewActions.has(action)){
      if(!isReviewer||project.created_by_user_id===user.id)return NextResponse.json({error:'Independent reviewing Architect access is required.'},{status:403});if(!reason)return NextResponse.json({error:'Add a reason for this governance decision.'},{status:400});
      if(['approve','recommend_admin'].includes(action)){const readiness=await requireProjectCatalogueReady(db,projectId);if(!readiness.ok)return NextResponse.json({error:`This project cannot be published yet. Missing catalogue metadata: ${readiness.missing.join(', ')}.`,missing_requirements:readiness.missing,catalogue_readiness:readiness.readiness},{status:409});}
      if(action==='recommend_admin'){if(project.risk_level!=='controlled'&&!project.admin_review_required)return NextResponse.json({error:'Standard projects can be approved directly by the independent reviewer.'},{status:409});await recordGovernance(db,{projectId,actorId:user.id,actorScope:'project_architect',eventType:'review_recommend_admin',from:project.governance_status,to:'submitted',reason});return NextResponse.json({ok:true,status:'submitted'});}
      const target=action==='request_changes'?'changes_requested':action==='deny'?'denied':'approved';if(action==='approve'&&(project.risk_level!=='standard'||project.admin_review_required))return NextResponse.json({error:'Controlled projects require an independent recommendation followed by Admin approval.'},{status:409});
      await db.from('projects').update({governance_status:target,governance_decided_at:new Date().toISOString(),status:target==='approved'?'recruiting':'draft',visibility:target==='approved'?'public':'private',updated_at:new Date().toISOString()}).eq('id',projectId);await recordGovernance(db,{projectId,actorId:user.id,actorScope:'project_architect',eventType:`review_${action}`,from:project.governance_status,to:target,reason});return NextResponse.json({ok:true,status:target});
    }
    if(action==='assign_manager'){
      if(!isAdmin)return NextResponse.json({error:'Admin access is required to assign a Managing Architect.'},{status:403});const managerId=clean(body.user_id,80);if(!managerId)return NextResponse.json({error:'Choose an approved Project Architect.'},{status:400});await db.from('project_architect_assignments').update({assignment_status:'reassigned',ended_at:new Date().toISOString()}).eq('project_id',projectId).eq('assignment_role','managing_architect').eq('assignment_status','active');const {error}=await db.from('project_architect_assignments').insert({project_id:projectId,user_id:managerId,assignment_role:'managing_architect',assigned_by_user_id:user.id});if(error)throw error;await recordGovernance(db,{projectId,actorId:user.id,actorScope:'admin',eventType:'manager_assigned',from:project.governance_status,to:project.governance_status,reason:reason||'Admin assigned project delivery oversight.',metadata:{manager_user_id:managerId}});return NextResponse.json({ok:true,status:project.governance_status});
    }
    return NextResponse.json({error:'Unknown project-governance action.'},{status:400});
  }catch(error){console.error('architect project action error',error);return NextResponse.json({error:'Unable to update this project proposal.'},{status:500})}
}