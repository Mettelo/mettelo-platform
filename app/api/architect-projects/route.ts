import {NextResponse} from 'next/server';
import {architectContext,archetypes,assignedRole,classifyRisk,clean,recordGovernance,slugify} from '@/lib/project-governance';

const reviewActions=new Set(['approve','recommend_admin','request_changes','deny']);

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
    const risk=classifyRisk({declared:body.declared_risk,partner:body.partner_project,sensitivity:body.data_sensitivity,impact:body.impact_area,rightsConfirmed:body.data_rights_confirmed,prohibited:body.prohibited_activity});
    if(risk.level==='prohibited')return NextResponse.json({error:'This proposal cannot proceed on Mettelo. Remove prohibited activity and confirm legitimate data rights before saving.',risk_reasons:risk.reasons},{status:422});
    const slugBase=slugify(title)||'architect-project';const slug=`${slugBase}-${Date.now().toString(36)}`;const now=new Date().toISOString();
    const {data:project,error}=await db.from('projects').insert({slug,title,summary,problem_statement:question,project_archetype:archetype,status:'draft',visibility:'private',project_type:body.partner_project?'partner':'open',partner_name:clean(body.partner_name,180)||null,location:clean(body.location,160)||'Remote',location_type:'remote',difficulty_level:clean(body.difficulty_level,30)||null,duration_weeks:body.duration_weeks?Math.max(1,Math.min(52,Number(body.duration_weeks))):null,weekly_commitment:clean(body.weekly_commitment,120)||null,team_size_threshold:Math.max(1,Math.min(50,Number(body.team_size_threshold)||5)),presentation_required:Boolean(body.presentation_required),created_by_user_id:user.id,governance_status:'draft',risk_level:risk.level,risk_reasons:risk.reasons,admin_review_required:risk.adminReviewRequired,updated_at:now}).select('id,slug,title,governance_status,risk_level').single();if(error)throw error;createdId=project.id;
    const {error:briefError}=await db.from('project_problem_briefs').insert({project_id:project.id,context,stakeholder,primary_question:question,expected_outcome:outcome,success_metrics:metrics,constraints:clean(body.problem_constraints,3000),ethics_considerations:clean(body.problem_ethics,3000),updated_by:user.id});if(briefError)throw briefError;
    const {error:assignmentError}=await db.from('project_architect_assignments').insert({project_id:project.id,user_id:user.id,assignment_role:'creating_architect',assigned_by_user_id:user.id});if(assignmentError)throw assignmentError;
    const roles=Array.isArray(body.roles)?body.roles.slice(0,12):[];if(roles.length){const rows=roles.map((role:unknown)=>{const item=role as Record<string,unknown>;return{project_id:project.id,title:clean(item.title,120),discipline:clean(item.discipline,120)||null,description:clean(item.description,1000)||null,openings:Math.max(1,Math.min(20,Number(item.openings)||1)),skills:[]}}).filter((row:{title:string})=>row.title);if(rows.length){const {error:roleError}=await db.from('project_roles').insert(rows);if(roleError)throw roleError}}
    await recordGovernance(db,{projectId:project.id,actorId:user.id,actorScope:'project_architect',eventType:'project_created',to:'draft',reason:'Project Architect created a private proposal.',metadata:{risk_level:risk.level}});
    return NextResponse.json({ok:true,item:project},{status:201});
  }catch(error){if(createdId){const db=(await architectContext());if(!('error'in db))await db.db.from('projects').delete().eq('id',createdId)}console.error('architect project create error',error);return NextResponse.json({error:'Unable to create this project proposal. Check the required details and try again.'},{status:500})}
}

export async function PATCH(request:Request){
  try{
    const ctx=await architectContext();if('error'in ctx)return ctx.error;const {db,user,isAdmin}=ctx;const body=await request.json();const projectId=clean(body.project_id,80),action=clean(body.action,40),reason=clean(body.reason,2000);if(!projectId||!action)return NextResponse.json({error:'Project and action are required.'},{status:400});
    const {data:project}=await db.from('projects').select('id,title,created_by_user_id,governance_status,risk_level,admin_review_required').eq('id',projectId).maybeSingle();if(!project)return NextResponse.json({error:'Project proposal not found.'},{status:404});const roles=await assignedRole(db,projectId,user.id);const isCreator=roles.includes('creating_architect');const isReviewer=roles.includes('reviewing_architect');
    if(action==='submit'){
      if(!isCreator||!['draft','changes_requested'].includes(project.governance_status))return NextResponse.json({error:'Only the creating Architect can submit this draft.'},{status:403});
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
      await db.from('projects').update({governance_status:target,governance_decided_at:new Date().toISOString(),status:target==='approved'?'recruiting':'draft',visibility:target==='approved'?'public':'private',updated_at:new Date().toISOString()}).eq('id',projectId);await recordGovernance(db,{projectId,actorId:user.id,actorScope:'project_architect',eventType:`review_${action}`,from:project.governance_status,to:target,reason});return NextResponse.json({ok:true,status:target});
    }
    if(action==='assign_manager'){
      if(!isAdmin)return NextResponse.json({error:'Admin access is required to assign a Managing Architect.'},{status:403});const managerId=clean(body.user_id,80);if(!managerId)return NextResponse.json({error:'Choose an approved Project Architect.'},{status:400});await db.from('project_architect_assignments').update({assignment_status:'reassigned',ended_at:new Date().toISOString()}).eq('project_id',projectId).eq('assignment_role','managing_architect').eq('assignment_status','active');const {error}=await db.from('project_architect_assignments').insert({project_id:projectId,user_id:managerId,assignment_role:'managing_architect',assigned_by_user_id:user.id});if(error)throw error;await recordGovernance(db,{projectId,actorId:user.id,actorScope:'admin',eventType:'manager_assigned',from:project.governance_status,to:project.governance_status,reason:reason||'Admin assigned project delivery oversight.',metadata:{manager_user_id:managerId}});return NextResponse.json({ok:true,status:project.governance_status});
    }
    return NextResponse.json({error:'Unknown project-governance action.'},{status:400});
  }catch(error){console.error('architect project action error',error);return NextResponse.json({error:'Unable to update this project proposal.'},{status:500})}
}
