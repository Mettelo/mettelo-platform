import {serviceDb} from '@/lib/project-flow';
import {createServerSupabaseClient} from '@/lib/supabase/server';

type TextRow={id:string;title:string;description:string|null};

export type LabCanonicalResource={
  id:string;
  name:string;
  description:string|null;
  sourceType:string|null;
  externalUrl:string|null;
  providerName:string|null;
  licenceName:string|null;
  requiredSubset:string|null;
  dataPeriod:string|null;
  dataFormat:string|null;
  sensitivity:string;
  governanceStatus:string;
  internalStorageUrl:string|null;
};

export type LabCanonicalDefinition={
  project:{id:string;title:string;summary:string;problemStatement:string|null;canonicalProjectKey:string|null;difficultyLevel:string|null;durationWeeks:number|null;weeklyCommitment:string|null;teamSize:number|null};
  brief:{
    businessContext:string|null;
    stakeholder:string|null;
    useCase:string|null;
    primaryObjective:string|null;
    decisionToSupport:string|null;
    supportingObjectives:string[];
    keyQuestions:string[];
    inScope:string[];
    outOfScope:string[];
    constraintsTradeOffs:string[];
    assumptions:string[];
    acceptanceChecks:string[];
    responsibleUseRisks:string[];
    evidenceExpectations:string[];
    technicalSkills:string[];
    professionalSkills:string[];
    methods:string[];
    tools:string[];
    stakeholderHandover:string|null;
    capabilityOutcome:string|null;
  }|null;
  resources:LabCanonicalResource[];
  deliverables:(TextRow&{publicSummary:string|null;expectedFormat:string|null;acceptanceCriteria:string|null;isRequired:boolean})[];
  successCriteria:(TextRow&{measurement:string|null;isRequired:boolean})[];
  timeline:(TextRow&{weekStart:number|null;weekEnd:number|null;expectedOutput:string|null})[];
  proofSignals:string[];
};

function text(value:unknown){return typeof value==='string'&&value.trim()?value.trim():null}
function strings(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())).map(item=>item.trim()):[]}
function oneRelation<T>(value:T|T[]|null|undefined){return Array.isArray(value)?value[0]||null:value||null}

/**
 * Loads the canonical project definition for an authorised Mettelo Lab member.
 *
 * The server-side membership check is mandatory because this projection may include
 * team/private canonical resource links. Only active/completed project members and
 * admins reach the service-role projection. Run-scoped execution rows are excluded
 * explicitly with project_run_id IS NULL. A private working-copy URL is projected
 * only after resource governance is green AND internal storage is explicitly
 * permitted; membership by itself is never enough to expose an unverified copy.
 */
export async function getProjectLabCanonicalData(projectId:string):Promise<LabCanonicalDefinition|null>{
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return null;
  const isAdmin=user.app_metadata?.role==='admin';
  if(!isAdmin){
    const {data:membership}=await auth.from('project_members').select('id').eq('project_id',projectId).eq('user_id',user.id).in('membership_status',['active','completed']).limit(1).maybeSingle();
    if(!membership)return null;
  }

  const db=serviceDb();
  if(!db)return null;
  const [projectResult,briefResult,resourceResult,deliverableResult,successResult,milestoneResult,capabilityResult]=await Promise.all([
    db.from('projects').select('id,title,summary,problem_statement,canonical_project_key,difficulty_level,duration_weeks,weekly_commitment,team_size_threshold').eq('id',projectId).maybeSingle(),
    db.from('project_problem_briefs').select('context,stakeholder,primary_use_case,primary_objective,supporting_objectives,key_questions,in_scope,out_of_scope,decision_to_support,constraints_trade_offs,explicit_assumptions,acceptance_quality_checks,responsible_use_risks,evidence_expectations,technical_skills,professional_skills,canonical_methods,canonical_tools,stakeholder_handover,capability_outcome').eq('project_id',projectId).maybeSingle(),
    db.from('project_data_sources').select('id,name,description,source_type,external_url,provider_name,provider:project_resource_providers(name),licence_name,required_subset,data_period,data_format,sensitivity,governance_status,internal_storage_policy,internal_storage_url').eq('project_id',projectId).is('project_run_id',null).order('created_at',{ascending:true}),
    db.from('project_deliverables').select('id,title,public_summary,expected_format,acceptance_criteria,is_required,status,sort_order').eq('project_id',projectId).is('project_run_id',null).order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
    db.from('project_success_criteria').select('id,title,description,measurement,is_required,sort_order').eq('project_id',projectId).order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
    db.from('project_milestones').select('id,title,description,week_start,week_end,expected_output,sort_order').eq('project_id',projectId).is('project_run_id',null).order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
    db.from('project_capabilities').select('evidence_expected,capabilities(name)').eq('project_id',projectId).eq('evidence_expected',true)
  ]);

  const project=projectResult.data;
  if(!project)return null;
  const briefRow=briefResult.data;
  const brief=briefRow?{
    businessContext:text(briefRow.context),
    stakeholder:text(briefRow.stakeholder),
    useCase:text(briefRow.primary_use_case),
    primaryObjective:text(briefRow.primary_objective),
    decisionToSupport:text(briefRow.decision_to_support),
    supportingObjectives:strings(briefRow.supporting_objectives),
    keyQuestions:strings(briefRow.key_questions),
    inScope:strings(briefRow.in_scope),
    outOfScope:strings(briefRow.out_of_scope),
    constraintsTradeOffs:strings(briefRow.constraints_trade_offs),
    assumptions:strings(briefRow.explicit_assumptions),
    acceptanceChecks:strings(briefRow.acceptance_quality_checks),
    responsibleUseRisks:strings(briefRow.responsible_use_risks),
    evidenceExpectations:strings(briefRow.evidence_expectations),
    technicalSkills:strings(briefRow.technical_skills),
    professionalSkills:strings(briefRow.professional_skills),
    methods:strings(briefRow.canonical_methods),
    tools:strings(briefRow.canonical_tools),
    stakeholderHandover:text(briefRow.stakeholder_handover),
    capabilityOutcome:text(briefRow.capability_outcome)
  }:null;

  const resources=(resourceResult.data||[]).map(row=>{
    const provider=oneRelation(row.provider as {name:unknown}|{name:unknown}[]|null);
    const governanceStatus=String(row.governance_status||'unreviewed');
    const storagePermitted=governanceStatus==='green'&&row.internal_storage_policy==='permitted';
    return{
      id:String(row.id),
      name:String(row.name),
      description:text(row.description),
      sourceType:text(row.source_type),
      externalUrl:text(row.external_url),
      providerName:text(provider?.name)||text(row.provider_name),
      licenceName:text(row.licence_name),
      requiredSubset:text(row.required_subset),
      dataPeriod:text(row.data_period),
      dataFormat:text(row.data_format),
      sensitivity:String(row.sensitivity||'internal'),
      governanceStatus,
      internalStorageUrl:storagePermitted?text(row.internal_storage_url):null
    };
  });

  const deliverables=(deliverableResult.data||[]).filter(row=>row.status!=='cancelled').map(row=>({
    id:String(row.id),title:String(row.title),description:text(row.public_summary),publicSummary:text(row.public_summary),expectedFormat:text(row.expected_format),acceptanceCriteria:text(row.acceptance_criteria),isRequired:Boolean(row.is_required)
  }));
  const successCriteria=(successResult.data||[]).map(row=>({id:String(row.id),title:String(row.title),description:text(row.description),measurement:text(row.measurement),isRequired:Boolean(row.is_required)}));
  const timeline=(milestoneResult.data||[]).map(row=>({id:String(row.id),title:String(row.title),description:text(row.description),weekStart:typeof row.week_start==='number'?row.week_start:null,weekEnd:typeof row.week_end==='number'?row.week_end:null,expectedOutput:text(row.expected_output)}));
  const mappedSignals=(capabilityResult.data||[]).flatMap(row=>{
    const capability=oneRelation(row.capabilities as {name:unknown}|{name:unknown}[]|null);const name=text(capability?.name);return name?[name]:[];
  });
  const proofSignals=[...new Set([...(brief?.evidenceExpectations||[]),...mappedSignals])];

  return{
    project:{
      id:String(project.id),title:String(project.title),summary:String(project.summary),problemStatement:text(project.problem_statement),
      canonicalProjectKey:text(project.canonical_project_key),difficultyLevel:text(project.difficulty_level),
      durationWeeks:typeof project.duration_weeks==='number'?project.duration_weeks:null,
      weeklyCommitment:text(project.weekly_commitment),teamSize:typeof project.team_size_threshold==='number'?project.team_size_threshold:null
    },
    brief,resources,deliverables,successCriteria,timeline,proofSignals
  };
}
