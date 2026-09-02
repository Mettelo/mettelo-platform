import {serviceDb} from '@/lib/project-flow';

export type ProjectDetailDeliverable={
  id:string;
  title:string;
  deliverableType:string|null;
  acceptanceCriteria:string|null;
  publicSummary:string|null;
  expectedFormat:string|null;
  isRequired:boolean;
};

export type ProjectDetailDataSource={
  id:string;
  name:string;
  description:string|null;
  sourceType:string|null;
  externalUrl:string|null;
  providerName:string|null;
  providerUrl:string|null;
  providerLogoAssetPath:string|null;
  licenceName:string|null;
  licenceUrl:string|null;
  requiredSubset:string|null;
  approximateSize:string|null;
  dataPeriod:string|null;
  dataFormat:string|null;
  knownLimitations:string|null;
  provenance:string|null;
  governanceStatus:string|null;
  governanceVerifiedAt:string|null;
  retentionPolicy:string|null;
};

export type ProjectDetailSuccessCriterion={
  id:string;
  title:string;
  description:string|null;
  measurement:string|null;
  isRequired:boolean;
};

export type ProjectDetailCapability={
  name:string;
  type:string;
  importance:string;
  evidenceExpected:boolean;
};

export type ProjectDetailPathContext={
  pathName:string;
  pathSlug:string;
  stageName:string|null;
  position:number;
  competencyFocus:string;
  capabilityBuilt:string;
  pathOutcome:string|null;
};

export type ProjectDetailContent={
  deliverables:ProjectDetailDeliverable[];
  dataSources:ProjectDetailDataSource[];
  successCriteria:ProjectDetailSuccessCriterion[];
  capabilities:ProjectDetailCapability[];
  pathContexts:ProjectDetailPathContext[];
  technicalSkills:string[];
  professionalSkills:string[];
  importedTools:string[];
  importedMethods:string[];
  importedDomain:string|null;
  sourceProjectKey:string|null;
};

type ImportNormalized={
  technical_skills?:unknown;
  professional_skills?:unknown;
  tools?:unknown;
  methods?:unknown;
  domain?:unknown;
};

type CapabilityRow={
  importance:string;
  evidence_expected:boolean;
  capabilities:{name:string;capability_type:string}|{name:string;capability_type:string}[]|null;
};

type PlacementRow={
  path_id:string;
  stage_id:string;
  position:number;
  competency_focus:string;
  capability_built:string;
  path_outcome:string|null;
};

type ProviderRow={name:unknown;logo_asset_path:unknown};
type DataSourceRow={
  id:unknown;
  name:unknown;
  description:unknown;
  source_type:unknown;
  provider_name:unknown;
  provider:ProviderRow|ProviderRow[]|null;
  licence_name:unknown;
  required_subset:unknown;
  approximate_size:unknown;
  data_period:unknown;
  data_format:unknown;
  known_limitations:unknown;
  provenance:unknown;
  sensitivity:unknown;
  publish_policy:unknown;
  governance_status:unknown;
  governance_verified_at:unknown;
  retention_policy:unknown;
};

function strings(value:unknown){
  return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())):[];
}

function oneRelation<T>(value:T|T[]|null|undefined){return Array.isArray(value)?value[0]||null:value||null}
function text(value:unknown){return typeof value==='string'&&value.trim()?value.trim():null}

/**
 * Project Detail is a discovery surface, not a Lab authorization boundary.
 *
 * The service-role client is used because canonical project templates are protected
 * by member-oriented RLS. Public projection is therefore deny-by-default: a source
 * appears only when it is classified public, explicitly permitted for publication
 * and has a GREEN governance decision. Direct source/download URLs, provider URLs,
 * licence-evidence URLs, internal storage URLs and review evidence are deliberately
 * never selected here. Approved project members receive authorised resource links
 * through Mettelo Lab instead.
 */
function publicDataSource(row:DataSourceRow){
  return row.sensitivity==='public'&&row.publish_policy==='permitted'&&row.governance_status==='green';
}

export async function getProjectDetailContent(projectId:string):Promise<ProjectDetailContent>{
  const empty:ProjectDetailContent={deliverables:[],dataSources:[],successCriteria:[],capabilities:[],pathContexts:[],technicalSkills:[],professionalSkills:[],importedTools:[],importedMethods:[],importedDomain:null,sourceProjectKey:null};
  const db=serviceDb();
  if(!db)return empty;

  const [deliverablesResult,dataSourcesResult,successCriteriaResult,capabilitiesResult,placementsResult,originResult]=await Promise.all([
    db.from('project_deliverables').select('id,title,deliverable_type,acceptance_criteria,public_summary,expected_format,is_required,status,sort_order').eq('project_id',projectId).is('project_run_id',null).order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
    db.from('project_data_sources').select('id,name,description,source_type,provider_name,provider:project_resource_providers(name,logo_asset_path),licence_name,required_subset,approximate_size,data_period,data_format,known_limitations,provenance,sensitivity,publish_policy,governance_status,governance_verified_at,retention_policy').eq('project_id',projectId).is('project_run_id',null).order('created_at',{ascending:true}),
    db.from('project_success_criteria').select('id,title,description,measurement,is_required,visibility,sort_order').eq('project_id',projectId).eq('visibility','public').order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
    db.from('project_capabilities').select('importance,evidence_expected,capabilities(name,capability_type)').eq('project_id',projectId),
    db.from('capability_path_projects').select('path_id,stage_id,position,competency_focus,capability_built,path_outcome').eq('project_id',projectId).order('position',{ascending:true}),
    db.from('capability_path_import_project_origins').select('batch_id,source_project_key').eq('project_id',projectId).order('created_at',{ascending:false}).limit(1).maybeSingle()
  ]);

  const deliverables=(deliverablesResult.data||[])
    .filter(row=>row.status!=='cancelled')
    .map(row=>({id:String(row.id),title:String(row.title),deliverableType:text(row.deliverable_type),acceptanceCriteria:text(row.acceptance_criteria),publicSummary:text(row.public_summary),expectedFormat:text(row.expected_format),isRequired:Boolean(row.is_required)}));

  const dataSources=((dataSourcesResult.data||[]) as unknown as DataSourceRow[])
    .filter(publicDataSource)
    .map(row=>{
      const provider=oneRelation(row.provider);
      return{
        id:String(row.id),
        name:String(row.name),
        description:text(row.description),
        sourceType:text(row.source_type),
        externalUrl:null,
        providerName:text(provider?.name)||text(row.provider_name),
        providerUrl:null,
        providerLogoAssetPath:text(provider?.logo_asset_path),
        licenceName:text(row.licence_name),
        licenceUrl:null,
        requiredSubset:text(row.required_subset),
        approximateSize:text(row.approximate_size),
        dataPeriod:text(row.data_period),
        dataFormat:text(row.data_format),
        knownLimitations:text(row.known_limitations),
        provenance:text(row.provenance),
        governanceStatus:text(row.governance_status),
        governanceVerifiedAt:text(row.governance_verified_at),
        retentionPolicy:text(row.retention_policy)
      };
    });

  const successCriteria=(successCriteriaResult.data||[]).map(row=>({id:String(row.id),title:String(row.title),description:text(row.description),measurement:text(row.measurement),isRequired:Boolean(row.is_required)}));

  const capabilities=((capabilitiesResult.data||[]) as unknown as CapabilityRow[]).flatMap(row=>{
    const capability=oneRelation(row.capabilities);if(!capability)return[];
    return[{name:capability.name,type:capability.capability_type,importance:row.importance,evidenceExpected:Boolean(row.evidence_expected)}];
  });

  const placements=(placementsResult.data||[]) as PlacementRow[];
  let pathContexts:ProjectDetailPathContext[]=[];
  if(placements.length){
    const pathIds=[...new Set(placements.map(row=>row.path_id))];const stageIds=[...new Set(placements.map(row=>row.stage_id))];
    const [pathsResult,stagesResult]=await Promise.all([
      db.from('capability_paths').select('id,name,slug,status').in('id',pathIds),
      db.from('capability_path_stages').select('id,name').in('id',stageIds)
    ]);
    const paths=new Map((pathsResult.data||[]).filter(row=>row.status==='published').map(row=>[String(row.id),{name:String(row.name),slug:String(row.slug)}]));
    const stages=new Map((stagesResult.data||[]).map(row=>[String(row.id),String(row.name)]));
    pathContexts=placements.flatMap(row=>{const path=paths.get(row.path_id);if(!path)return[];return[{pathName:path.name,pathSlug:path.slug,stageName:stages.get(row.stage_id)||null,position:row.position,competencyFocus:row.competency_focus,capabilityBuilt:row.capability_built,pathOutcome:row.path_outcome}];});
  }

  let importNormalized:ImportNormalized={};let sourceProjectKey:string|null=null;
  const origin=originResult.data;
  if(origin?.batch_id&&origin?.source_project_key){
    sourceProjectKey=String(origin.source_project_key);
    const importResult=await db.from('capability_path_import_rows').select('normalized').eq('batch_id',origin.batch_id).eq('row_kind','project').eq('source_key',origin.source_project_key).maybeSingle();
    if(importResult.data?.normalized&&typeof importResult.data.normalized==='object')importNormalized=importResult.data.normalized as ImportNormalized;
  }

  return{
    deliverables,
    dataSources,
    successCriteria,
    capabilities,
    pathContexts,
    technicalSkills:strings(importNormalized.technical_skills),
    professionalSkills:strings(importNormalized.professional_skills),
    importedTools:strings(importNormalized.tools),
    importedMethods:strings(importNormalized.methods),
    importedDomain:typeof importNormalized.domain==='string'&&importNormalized.domain.trim()?importNormalized.domain:null,
    sourceProjectKey
  };
}
