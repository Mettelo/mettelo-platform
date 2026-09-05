import type {ProjectDetailContent} from '@/lib/project-detail-content';
import type {ProjectExperienceBrief,ProjectExperienceMilestone} from '@/lib/project-experience-model';
import type {ProjectExperienceRoleDetail} from '@/lib/project-experience-role-data';
import {createPublicSupabaseClient} from '@/lib/supabase/public';

type JsonRecord=Record<string,unknown>;
type Projection={deliverables?:unknown;data_sources?:unknown;success_criteria?:unknown;capabilities?:unknown;path_contexts?:unknown;import_origin?:unknown;brief?:unknown;milestones?:unknown;role_details?:unknown};

function record(value:unknown):JsonRecord|null{return value&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:null}
function records(value:unknown):JsonRecord[]{return Array.isArray(value)?value.map(record).filter((item):item is JsonRecord=>Boolean(item)):[]}
function text(value:unknown){return typeof value==='string'&&value.trim()?value.trim():null}
function strings(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())).map(item=>item.trim()):[]}
function number(value:unknown){return typeof value==='number'&&Number.isFinite(value)?value:null}
function metricLines(value:unknown){const raw=text(value);return raw?raw.split(/\r?\n|;|•/).map(item=>item.replace(/^[-*\d.)\s]+/,'').trim()).filter(Boolean).slice(0,24):[]}

export type PublicProjectExperienceData={detail:ProjectDetailContent;brief:ProjectExperienceBrief|null;milestones:ProjectExperienceMilestone[];roleDetails:Map<string,ProjectExperienceRoleDetail>;loadError:boolean};

const EMPTY_DETAIL:ProjectDetailContent={deliverables:[],dataSources:[],successCriteria:[],capabilities:[],pathContexts:[],technicalSkills:[],professionalSkills:[],importedTools:[],importedMethods:[],importedDomain:null,sourceProjectKey:null};
function empty(loadError:boolean):PublicProjectExperienceData{return{detail:EMPTY_DETAIL,brief:null,milestones:[],roleDetails:new Map(),loadError}}

export async function getPublicProjectExperienceData(projectId:string):Promise<PublicProjectExperienceData>{
  const db=createPublicSupabaseClient();
  if(!db)return empty(true);
  const {data,error}=await db.rpc('get_public_project_experience_detail',{p_project_id:projectId});
  if(error||!data){if(error)console.error('public project experience projection failed',{projectId,code:error.code});return empty(true)}
  const projection=record(data) as Projection|null;
  if(!projection)return empty(true);

  const origin=record(projection.import_origin);const normalized=record(origin?.normalized);
  const detail:ProjectDetailContent={
    deliverables:records(projection.deliverables).map(row=>({id:String(row.id),title:String(row.title),deliverableType:text(row.deliverable_type),acceptanceCriteria:text(row.acceptance_criteria),publicSummary:text(row.public_summary),expectedFormat:text(row.expected_format),isRequired:Boolean(row.is_required)})),
    dataSources:records(projection.data_sources).map(row=>({id:String(row.id),name:String(row.name),description:text(row.description),sourceType:text(row.source_type),externalUrl:null,providerName:text(row.provider_name),providerUrl:null,providerLogoAssetPath:null,licenceName:text(row.licence_name),licenceUrl:null,requiredSubset:text(row.required_subset),approximateSize:text(row.approximate_size),dataPeriod:text(row.data_period),dataFormat:text(row.data_format),knownLimitations:text(row.known_limitations),provenance:text(row.provenance),governanceStatus:null,governanceVerifiedAt:null,retentionPolicy:null})),
    successCriteria:records(projection.success_criteria).map(row=>({id:String(row.id),title:String(row.title),description:text(row.description),measurement:text(row.measurement),isRequired:Boolean(row.is_required)})),
    capabilities:records(projection.capabilities).map(row=>({name:String(row.name),type:String(row.type),importance:String(row.importance),evidenceExpected:Boolean(row.evidence_expected)})),
    pathContexts:records(projection.path_contexts).map(row=>({pathName:String(row.path_name),pathSlug:String(row.path_slug),stageName:text(row.stage_name),position:number(row.position)||0,competencyFocus:String(row.competency_focus||''),capabilityBuilt:String(row.capability_built||''),pathOutcome:text(row.path_outcome)})),
    technicalSkills:strings(normalized?.technical_skills),professionalSkills:strings(normalized?.professional_skills),importedTools:strings(normalized?.tools),importedMethods:strings(normalized?.methods),importedDomain:text(normalized?.domain),sourceProjectKey:null
  };
  const briefRow=record(projection.brief);
  const brief:ProjectExperienceBrief|null=briefRow?{businessContext:text(briefRow.context),stakeholder:text(briefRow.stakeholder),useCase:text(briefRow.primary_use_case),primaryObjective:text(briefRow.primary_objective),supportingObjectives:strings(briefRow.supporting_objectives),keyQuestions:strings(briefRow.key_questions),inScope:strings(briefRow.in_scope),outOfScope:strings(briefRow.out_of_scope),successMeasures:metricLines(briefRow.success_metrics),decisionToSupport:text(briefRow.decision_to_support),constraintsTradeOffs:strings(briefRow.constraints_trade_offs),assumptions:strings(briefRow.explicit_assumptions),acceptanceChecks:strings(briefRow.acceptance_quality_checks),responsibleUseRisks:strings(briefRow.responsible_use_risks),evidenceExpectations:strings(briefRow.evidence_expectations),technicalSkills:strings(briefRow.technical_skills),professionalSkills:strings(briefRow.professional_skills),methods:strings(briefRow.canonical_methods),tools:strings(briefRow.canonical_tools),stakeholderHandover:text(briefRow.stakeholder_handover),capabilityOutcome:text(briefRow.capability_outcome)}:null;
  const milestones=records(projection.milestones).map(row=>({id:String(row.id),title:String(row.title),description:text(row.description),weekStart:number(row.week_start),weekEnd:number(row.week_end),expectedOutput:text(row.expected_output)}));
  const roleDetails=new Map(records(projection.role_details).map(row=>[String(row.id),{id:String(row.id),responsibilities:strings(row.responsibilities),recommendedSkills:strings(row.recommended_skills),experienceExpectation:text(row.experience_expectation),weeklyCommitment:text(row.weekly_commitment),roleStatus:null,applicationRequirements:null}]));
  return{detail,brief,milestones,roleDetails,loadError:false};
}
