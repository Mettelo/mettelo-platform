import {serviceDb} from '@/lib/project-flow';

export type ProjectDetailDeliverable={
  id:string;
  title:string;
  deliverableType:string|null;
  acceptanceCriteria:string|null;
  isRequired:boolean;
};

export type ProjectDetailDataSource={
  id:string;
  name:string;
  description:string|null;
  sourceType:string|null;
  externalUrl:string|null;
  dataPeriod:string|null;
  dataFormat:string|null;
  accessStatus:string|null;
  qualityStatus:string|null;
  knownLimitations:string|null;
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

function strings(value:unknown){
  return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())):[];
}

function oneRelation<T>(value:T|T[]|null|undefined){return Array.isArray(value)?value[0]||null:value||null}

export async function getProjectDetailContent(projectId:string):Promise<ProjectDetailContent>{
  const empty:ProjectDetailContent={deliverables:[],dataSources:[],capabilities:[],pathContexts:[],technicalSkills:[],professionalSkills:[],importedTools:[],importedMethods:[],importedDomain:null,sourceProjectKey:null};
  const db=serviceDb();
  if(!db)return empty;

  const [deliverablesResult,dataSourcesResult,capabilitiesResult,placementsResult,originResult]=await Promise.all([
    db.from('project_deliverables').select('id,title,deliverable_type,acceptance_criteria,is_required,status').eq('project_id',projectId).is('project_run_id',null).order('created_at',{ascending:true}),
    db.from('project_data_sources').select('id,name,description,source_type,external_url,data_period,data_format,access_status,quality_status,known_limitations').eq('project_id',projectId).is('project_run_id',null).order('created_at',{ascending:true}),
    db.from('project_capabilities').select('importance,evidence_expected,capabilities(name,capability_type)').eq('project_id',projectId),
    db.from('capability_path_projects').select('path_id,stage_id,position,competency_focus,capability_built,path_outcome').eq('project_id',projectId).order('position',{ascending:true}),
    db.from('capability_path_import_project_origins').select('batch_id,source_project_key').eq('project_id',projectId).order('created_at',{ascending:false}).limit(1).maybeSingle()
  ]);

  const deliverables=(deliverablesResult.data||[])
    .filter(row=>row.status!=='cancelled')
    .map(row=>({id:String(row.id),title:String(row.title),deliverableType:row.deliverable_type?String(row.deliverable_type):null,acceptanceCriteria:row.acceptance_criteria?String(row.acceptance_criteria):null,isRequired:Boolean(row.is_required)}));

  const dataSources=(dataSourcesResult.data||[]).map(row=>({
    id:String(row.id),name:String(row.name),description:row.description?String(row.description):null,sourceType:row.source_type?String(row.source_type):null,externalUrl:row.external_url?String(row.external_url):null,dataPeriod:row.data_period?String(row.data_period):null,dataFormat:row.data_format?String(row.data_format):null,accessStatus:row.access_status?String(row.access_status):null,qualityStatus:row.quality_status?String(row.quality_status):null,knownLimitations:row.known_limitations?String(row.known_limitations):null
  }));

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
