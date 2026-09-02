import {serviceDb} from '@/lib/project-flow';

type Db=NonNullable<ReturnType<typeof serviceDb>>;

export type ProjectCatalogueReadiness={
  project_id:string;
  catalogue_ready:boolean;
  missing_requirements:string[];
  project_type_ready:boolean;
  roles_ready:boolean;
  domain_ready:boolean;
  capabilities_ready:boolean;
  working_model_ready:boolean;
  duration_ready:boolean;
  commitment_ready:boolean;
  role_family_count:number;
  capability_count:number;
  domain_count:number;
  tool_count:number;
  method_count:number;
};

export const catalogueRequirementLabels:Record<string,string>={
  project_type:'Project type',
  roles:'Canonical role family',
  domain:'Domain',
  capabilities:'At least 3 skills / capabilities',
  working_model:'Working model',
  duration:'Duration',
  commitment:'Weekly commitment'
};

export function catalogueMissingLabels(readiness:Pick<ProjectCatalogueReadiness,'missing_requirements'>|null|undefined){
  return(readiness?.missing_requirements||[]).map(key=>catalogueRequirementLabels[key]||key.replaceAll('_',' '));
}

export async function getProjectCatalogueReadiness(db:Db,projectId:string){
  const {data,error}=await db.from('project_catalogue_readiness').select('project_id,catalogue_ready,missing_requirements,project_type_ready,roles_ready,domain_ready,capabilities_ready,working_model_ready,duration_ready,commitment_ready,role_family_count,capability_count,domain_count,tool_count,method_count').eq('project_id',projectId).maybeSingle();
  if(error)throw error;
  return(data||null) as ProjectCatalogueReadiness|null;
}

export async function getProjectCatalogueReadinessMap(db:Db,projectIds:string[]){
  const map=new Map<string,ProjectCatalogueReadiness>();
  if(!projectIds.length)return map;
  const {data,error}=await db.from('project_catalogue_readiness').select('project_id,catalogue_ready,missing_requirements,project_type_ready,roles_ready,domain_ready,capabilities_ready,working_model_ready,duration_ready,commitment_ready,role_family_count,capability_count,domain_count,tool_count,method_count').in('project_id',projectIds);
  if(error)throw error;
  for(const row of(data||[]) as ProjectCatalogueReadiness[])map.set(row.project_id,row);
  return map;
}

export async function requireProjectCatalogueReady(db:Db,projectId:string){
  const readiness=await getProjectCatalogueReadiness(db,projectId);
  if(!readiness)return{ok:false as const,readiness:null,missing:['Catalogue readiness record']};
  const missing=catalogueMissingLabels(readiness);
  return readiness.catalogue_ready?{ok:true as const,readiness,missing:[]}:{ok:false as const,readiness,missing};
}
