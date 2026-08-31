import type {SupabaseClient} from '@supabase/supabase-js';
import {serviceDb} from '@/lib/project-flow';
import {resolveProjectPublicAvailability} from '@/lib/project-public-availability';

export type MemberPathPlacement={projectId:string;position:number;stageId:string;stageName:string;capabilityBuilt:string;competencyFocus:string;pathOutcome:string|null;projectTitle:string|null;projectStatus:string|null;projectType:string|null;applicationDeadline:string|null;roleCount:number;completed:boolean;verified:boolean;available:boolean;availabilityLabel:string};
export type MemberCapabilityPathProgress={pathId:string;slug:string;name:string;targetRole:string;targetOutcome:string;pathStatus:string;followStatus:string;isPrimary:boolean;totalProjects:number;completedProjects:number;verifiedProjects:number;completionRatio:number;currentStage:string|null;nextProject:MemberPathPlacement|null;nextAvailableProject:MemberPathPlacement|null;placements:MemberPathPlacement[]};
export type MemberProjectPathContext={pathId:string;pathSlug:string;pathName:string;pathStatus:string;position:number;stageName:string;isPrimary:boolean;completed:boolean;verified:boolean};

type Db=SupabaseClient;
type FollowRow={path_id:string;status:string;is_primary:boolean};
type PathRow={id:string;slug:string;name:string;target_role:string;target_outcome:string;status:string};
type StageRow={id:string;path_id:string;name:string;position:number};
type PlacementRow={path_id:string;project_id:string;stage_id:string;position:number;competency_focus:string;capability_built:string;path_outcome:string|null};
type ProjectRole={id:string;openings:number};
type ProjectRow={id:string;title:string;status:string;project_type:string;application_deadline:string|null;applications_open:boolean|null;project_roles:ProjectRole[]|null};
type CapacityRow={project_id:string;project_role_id:string|null};

export async function getMemberCapabilityPathProgress(db:Db,userId:string):Promise<MemberCapabilityPathProgress[]>{
  const {data:followData,error:followError}=await db.from('member_capability_paths').select('path_id,status,is_primary').eq('user_id',userId).in('status',['following','paused','completed']);
  if(followError||!followData?.length)return[];
  const follows=followData as FollowRow[];const pathIds=follows.map(row=>row.path_id);
  const [{data:pathData},{data:stageData},{data:placementData}]=await Promise.all([
    db.from('capability_paths').select('id,slug,name,target_role,target_outcome,status').in('id',pathIds),
    db.from('capability_path_stages').select('id,path_id,name,position').in('path_id',pathIds).order('position'),
    db.from('capability_path_projects').select('path_id,project_id,stage_id,position,competency_focus,capability_built,path_outcome').in('path_id',pathIds).order('position')
  ]);
  const paths=(pathData||[]) as PathRow[],stages=(stageData||[]) as StageRow[],placements=(placementData||[]) as PlacementRow[];
  const projectIds=[...new Set(placements.map(row=>row.project_id))];
  const [{data:projectData},{data:completedData},{data:verifiedData}]=projectIds.length?await Promise.all([
    db.from('projects').select('id,title,status,project_type,application_deadline,applications_open,project_roles(id,openings)').in('id',projectIds),
    db.from('project_members').select('project_id').eq('user_id',userId).eq('membership_status','completed').in('project_id',projectIds),
    db.from('contributions').select('project_id').eq('user_id',userId).eq('verification_status','verified').in('project_id',projectIds)
  ]):[{data:[]},{data:[]},{data:[]}];

  let capacityKnown=false;const filledByRole=new Map<string,number>();const privileged=serviceDb();
  if(privileged&&projectIds.length){
    const {data:capacity,error:capacityError}=await privileged.from('project_members').select('project_id,project_role_id').in('project_id',projectIds).in('membership_status',['waiting','active']);
    if(!capacityError){capacityKnown=true;for(const row of (capacity||[]) as CapacityRow[]){if(row.project_role_id)filledByRole.set(row.project_role_id,(filledByRole.get(row.project_role_id)||0)+1)}}
    else console.error('Capability Path capacity lookup failed',capacityError);
  }

  const projects=(projectData||[]) as unknown as ProjectRow[];const completed=new Set((completedData||[]).map(row=>String(row.project_id)));const verified=new Set((verifiedData||[]).map(row=>String(row.project_id)));const stageMap=new Map(stages.map(row=>[row.id,row]));const projectMap=new Map(projects.map(row=>[row.id,row]));
  return follows.flatMap(follow=>{
    const path=paths.find(row=>row.id===follow.path_id);if(!path)return[];
    const pathPlacements=placements.filter(row=>row.path_id===path.id).sort((a,b)=>a.position-b.position).map(row=>{
      const project=projectMap.get(row.project_id)||null;const stage=stageMap.get(row.stage_id)||null;const roles=project?.project_roles||[];const roleCount=roles.reduce((sum,role)=>sum+Math.max(0,Number(role.openings)||0),0);const occupiedRoleCount=roles.reduce((sum,role)=>sum+Math.min(Math.max(0,Number(role.openings)||0),filledByRole.get(role.id)||0),0);const availability=project?resolveProjectPublicAvailability({status:project.status,project_type:project.project_type,application_deadline:project.application_deadline,applications_open:project.applications_open,role_count:roleCount,occupied_role_count:occupiedRoleCount,capacity_known:capacityKnown}):{available:false,label:'Not currently available'};
      return{projectId:row.project_id,position:row.position,stageId:row.stage_id,stageName:stage?.name||'Path stage',capabilityBuilt:row.capability_built,competencyFocus:row.competency_focus,pathOutcome:row.path_outcome,projectTitle:project?.title||null,projectStatus:project?.status||null,projectType:project?.project_type||null,applicationDeadline:project?.application_deadline||null,roleCount,completed:completed.has(row.project_id),verified:verified.has(row.project_id),available:Boolean(availability.available),availabilityLabel:availability.label} satisfies MemberPathPlacement;
    });
    const incomplete=pathPlacements.filter(item=>!item.completed);const nextProject=incomplete[0]||null;const nextAvailableProject=follow.status==='following'?incomplete.find(item=>item.available)||null:null;const completedProjects=pathPlacements.filter(item=>item.completed).length;const verifiedProjects=pathPlacements.filter(item=>item.verified).length;
    return[{pathId:path.id,slug:path.slug,name:path.name,targetRole:path.target_role,targetOutcome:path.target_outcome,pathStatus:path.status,followStatus:follow.status,isPrimary:follow.is_primary,totalProjects:pathPlacements.length,completedProjects,verifiedProjects,completionRatio:pathPlacements.length?completedProjects/pathPlacements.length:0,currentStage:nextProject?.stageName||pathPlacements.at(-1)?.stageName||null,nextProject,nextAvailableProject,placements:pathPlacements}];
  }).sort((a,b)=>Number(b.isPrimary)-Number(a.isPrimary)||a.name.localeCompare(b.name));
}

export async function getMemberProjectPathContexts(db:Db,userId:string,projectIds:string[]):Promise<Map<string,MemberProjectPathContext[]>>{
  const result=new Map<string,MemberProjectPathContext[]>();if(!projectIds.length)return result;
  const progress=await getMemberCapabilityPathProgress(db,userId);
  for(const path of progress){for(const placement of path.placements){if(!projectIds.includes(placement.projectId))continue;result.set(placement.projectId,[...(result.get(placement.projectId)||[]),{pathId:path.pathId,pathSlug:path.slug,pathName:path.name,pathStatus:path.pathStatus,position:placement.position,stageName:placement.stageName,isPrimary:path.isPrimary,completed:placement.completed,verified:placement.verified}]);}}
  return result;
}
