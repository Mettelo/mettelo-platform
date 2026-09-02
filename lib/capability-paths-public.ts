import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {resolveProjectPublicAvailability} from '@/lib/project-public-availability';

export type PublicCapabilityPath={id:string;slug:string;name:string;target_role:string;short_description:string|null;description:string|null;progression_summary:string|null;target_outcome:string;sort_order:number;published_at:string|null;stage_count:number;project_count:number;public_project_count:number};
export type PublicCapabilityPathStage={id:string;slug:string;name:string;description:string|null;position:number};
export type PublicCapabilityPathProject={path_id:string;project_id:string;stage_id:string;position:number;competency_focus:string;capability_built:string;prerequisite_project_id:string|null;prerequisite_mode:'recommended'|'required';path_outcome:string|null;placement_type:'recommended'|'required'|'optional';project:{id:string;slug:string;title:string;summary:string;status:string;project_type:string;location:string|null;location_type:string|null;difficulty_level:string|null;application_deadline:string|null;project_roles?:{id:string;openings:number}[]}|null};
export type PublicCapabilityPathDetail=PublicCapabilityPath & {stages:PublicCapabilityPathStage[];placements:PublicCapabilityPathProject[]};
type PublicPathStat={path_id:string;stage_count:number;total_project_count:number;public_project_count:number};
type PublishedPathPositionIndex=Map<string,Map<string,number>>;

function publicClient(){return createPublicSupabaseClient()}

export function projectAvailability(project:NonNullable<PublicCapabilityPathProject['project']>){
 return resolveProjectPublicAvailability({status:project.status,project_type:project.project_type,application_deadline:project.application_deadline,role_count:(project.project_roles||[]).length});
}

async function publicStats(db:NonNullable<ReturnType<typeof createPublicSupabaseClient>>):Promise<Map<string,PublicPathStat>>{
 const {data,error}=await db.rpc('get_public_capability_path_stats');if(error)return new Map();return new Map(((data||[]) as PublicPathStat[]).map(item=>[item.path_id,item]));
}

export async function getPublishedCapabilityPaths(limit?:number):Promise<PublicCapabilityPath[]>{
 const db=publicClient();if(!db)return[];
 let pathQuery=db.from('capability_paths').select('id,slug,name,target_role,short_description,description,progression_summary,target_outcome,sort_order,published_at').eq('status','published').order('sort_order').order('name');
 if(limit)pathQuery=pathQuery.limit(limit);
 const [{data:paths,error},stats]=await Promise.all([pathQuery,publicStats(db)]);if(error||!paths?.length)return[];
 return paths.map(path=>{const stat=stats.get(path.id);return{...path,stage_count:Number(stat?.stage_count||0),project_count:Number(stat?.total_project_count||0),public_project_count:Number(stat?.public_project_count||0)}}) as PublicCapabilityPath[];
}

export async function getPublishedCapabilityPath(slug:string):Promise<PublicCapabilityPathDetail|null>{
 const db=publicClient();if(!db)return null;
 const [{data:path,error},stats]=await Promise.all([db.from('capability_paths').select('id,slug,name,target_role,short_description,description,progression_summary,target_outcome,sort_order,published_at').eq('slug',slug).eq('status','published').maybeSingle(),publicStats(db)]);
 if(error||!path)return null;
 const [{data:stages,error:stageError},{data:placements,error:placementError}]=await Promise.all([
  db.from('capability_path_stages').select('id,slug,name,description,position').eq('path_id',path.id).order('position'),
  db.from('capability_path_projects').select('path_id,project_id,stage_id,position,competency_focus,capability_built,prerequisite_project_id,prerequisite_mode,path_outcome,placement_type').eq('path_id',path.id).order('position')
 ]);
 if(stageError||placementError)return null;
 const projectIds=[...new Set((placements||[]).map(item=>item.project_id))];
 const {data:projects}=projectIds.length?await db.from('projects').select('id,slug,title,summary,status,project_type,location,location_type,difficulty_level,application_deadline,project_roles(id,openings)').in('id',projectIds).eq('visibility','public'):{data:[]};
 const enriched=(placements||[]).map(item=>({...item,project:(projects||[]).find(project=>project.id===item.project_id)||null})) as PublicCapabilityPathProject[];const stat=stats.get(path.id);
 return {...path,stage_count:Number(stat?.stage_count||(stages||[]).length),project_count:Number(stat?.total_project_count||enriched.length),public_project_count:Number(stat?.public_project_count||enriched.length),stages:(stages||[]) as PublicCapabilityPathStage[],placements:enriched} as PublicCapabilityPathDetail;
}

let publishedPathPositionsInFlight:Promise<PublishedPathPositionIndex>|null=null;

async function loadPublishedPathPositionIndex():Promise<PublishedPathPositionIndex>{
 const db=publicClient();if(!db)return new Map();
 const {data:paths,error:pathError}=await db.from('capability_paths').select('id,slug').eq('status','published');
 if(pathError||!paths?.length)return new Map();
 const slugById=new Map(paths.map(path=>[path.id,path.slug]));
 const {data:placements,error}=await db.from('capability_path_projects').select('path_id,project_id,position').in('path_id',[...slugById.keys()]).order('position');
 if(error)return new Map();
 const index:PublishedPathPositionIndex=new Map();
 for(const placement of placements||[]){
  const slug=slugById.get(placement.path_id);if(!slug)continue;
  let positions=index.get(slug);if(!positions){positions=new Map();index.set(slug,positions)}
  positions.set(placement.project_id,placement.position);
 }
 return index;
}

export async function getPublishedPathProjectPositions(slug:string):Promise<Map<string,number>>{
 // /projects resolves every published Path at once. Deduplicate that burst into one
 // visibility-safe placements query so a larger Path catalogue cannot exhaust the
 // anonymous PostgREST pool and silently turn one Path into an empty filter result.
 if(!publishedPathPositionsInFlight){
  const request=loadPublishedPathPositionIndex();
  publishedPathPositionsInFlight=request;
  request.then(()=>{if(publishedPathPositionsInFlight===request)publishedPathPositionsInFlight=null},()=>{if(publishedPathPositionsInFlight===request)publishedPathPositionsInFlight=null});
 }
 const index=await publishedPathPositionsInFlight;
 return new Map(index.get(slug)||[]);
}

export async function getProjectCapabilityPathPlacements(projectId:string){
 const db=publicClient();if(!db)return[];
 const {data:placements,error}=await db.from('capability_path_projects').select('path_id,project_id,stage_id,position,competency_focus,capability_built,path_outcome').eq('project_id',projectId).order('position');
 if(error||!placements?.length)return[];
 const pathIds=[...new Set(placements.map(item=>item.path_id))],stageIds=[...new Set(placements.map(item=>item.stage_id))];
 const [{data:paths},{data:stages}]=await Promise.all([
  db.from('capability_paths').select('id,slug,name,target_role,status').in('id',pathIds).eq('status','published'),
  db.from('capability_path_stages').select('id,name,position').in('id',stageIds)
 ]);
 return placements.flatMap(item=>{const path=(paths||[]).find(candidate=>candidate.id===item.path_id);if(!path)return[];const stage=(stages||[]).find(candidate=>candidate.id===item.stage_id);return[{...item,path,stage:stage||null}]});
}
