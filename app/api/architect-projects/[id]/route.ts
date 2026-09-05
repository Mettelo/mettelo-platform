import {NextResponse} from 'next/server';
import {architectContext,assignedRole,clean} from '@/lib/project-governance';
import {PATCH as saveAtomicRevision} from './revision/route';

type RouteContext={params:Promise<{id:string}>};

async function readableDraft(id:string){
  const ctx=await architectContext();if('error'in ctx)return{error:ctx.error} as const;
  const {db,user,isAdmin}=ctx;
  const {data:project,error}=await db.from('projects').select('id,slug,title,summary,project_archetype,governance_status,status,visibility,project_type,partner_name,location,difficulty_level,duration_weeks,weekly_commitment,team_size_threshold,participation_mode,min_team_size,target_team_size,max_team_size,presentation_required,risk_level,admin_review_required,created_by_user_id').eq('id',id).maybeSingle();
  if(error)throw error;
  if(!project)return{error:NextResponse.json({error:'Project proposal not found.'},{status:404})} as const;
  const roles=await assignedRole(db,id,user.id);
  if(!isAdmin&&!roles.includes('creating_architect'))return{error:NextResponse.json({error:'Creating Project Architect access is required.'},{status:403})} as const;
  if(!['draft','changes_requested'].includes(project.governance_status))return{error:NextResponse.json({error:'Only draft or changes-requested proposals can be edited.'},{status:409})} as const;
  return{db,project} as const;
}

export async function GET(_:Request,{params}:RouteContext){
  try{
    const {id}=await params;const projectId=clean(id,80);const access=await readableDraft(projectId);if('error'in access)return access.error;const {db,project}=access;
    const [brief,resources,deliverables,criteria,milestones,capabilities,roles]=await Promise.all([
      db.from('project_problem_briefs').select('context,stakeholder,primary_question,expected_outcome,success_metrics,constraints,ethics_considerations,primary_use_case,primary_objective,supporting_objectives,key_questions,in_scope,out_of_scope').eq('project_id',project.id).maybeSingle(),
      db.from('project_data_sources').select('id,name,description,source_type,external_url,provider_id,provider_name,provider_url,licence_name,licence_url,required_subset,approximate_size,data_period,data_format,unit_of_observation,known_limitations,provenance,sensitivity,governance_status,retention_policy,internal_storage_policy').eq('project_id',project.id).is('project_run_id',null).order('created_at'),
      db.from('project_deliverables').select('id,title,deliverable_type,acceptance_criteria,public_summary,expected_format,is_required,sort_order').eq('project_id',project.id).is('project_run_id',null).order('sort_order').order('created_at'),
      db.from('project_success_criteria').select('id,title,description,measurement,is_required,visibility,sort_order').eq('project_id',project.id).order('sort_order').order('created_at'),
      db.from('project_milestones').select('id,title,description,week_start,week_end,expected_output,sort_order').eq('project_id',project.id).is('project_run_id',null).order('sort_order').order('created_at'),
      db.from('project_capabilities').select('capability_id,importance,evidence_expected').eq('project_id',project.id),
      db.from('project_roles').select('id,title,discipline,description,openings,skills,responsibilities,recommended_skills,experience_expectation,weekly_commitment,application_requirements,role_status').eq('project_id',project.id).order('created_at')
    ]);
    for(const result of [brief,resources,deliverables,criteria,milestones,capabilities,roles])if(result.error)throw result.error;
    return NextResponse.json({project,brief:brief.data,resources:resources.data||[],deliverables:deliverables.data||[],success_criteria:criteria.data||[],milestones:milestones.data||[],capabilities:capabilities.data||[],roles:roles.data||[]});
  }catch(error){console.error('architect project draft load error',error);return NextResponse.json({error:'Unable to load this canonical project draft.'},{status:500})}
}

export async function PATCH(request:Request,context:RouteContext){
  return saveAtomicRevision(request,context);
}