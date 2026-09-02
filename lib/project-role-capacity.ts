import {serviceDb} from '@/lib/project-flow';

type Db=NonNullable<ReturnType<typeof serviceDb>>;
type ProjectRef={id:string;project_type:string|null};
export type RoleUsage={known:boolean;filled:Map<string,number>};

function addCount(target:Map<string,number>,roleId:string|null){
  if(!roleId)return;
  target.set(roleId,(target.get(roleId)||0)+1);
}

/**
 * Capacity for an open project belongs to the current forming cohort only.
 * Members in active/review/completed cohorts must never consume places in the
 * next cohort. When there is no forming cohort yet, every published role is
 * available and Admin will create the next run when the first applicant is
 * approved.
 *
 * Partner projects are single-cycle, so their waiting/active membership remains
 * project-scoped.
 */
export async function loadProjectRoleUsage(db:Db,projectId:string,projectType:string|null):Promise<RoleUsage>{
  const filled=new Map<string,number>();
  if(projectType==='open'){
    const {data:run,error:runError}=await db.from('project_runs').select('id').eq('project_id',projectId).eq('status','forming').eq('has_started',false).order('run_number',{ascending:true}).limit(1).maybeSingle();
    if(runError)return{known:false,filled};
    if(!run)return{known:true,filled};
    const {data,error}=await db.from('project_members').select('project_role_id').eq('project_run_id',run.id).in('membership_status',['waiting','active']);
    if(error)return{known:false,filled};
    for(const row of data||[])addCount(filled,row.project_role_id);
    return{known:true,filled};
  }

  const {data,error}=await db.from('project_members').select('project_role_id').eq('project_id',projectId).in('membership_status',['waiting','active']);
  if(error)return{known:false,filled};
  for(const row of data||[])addCount(filled,row.project_role_id);
  return{known:true,filled};
}

export async function loadProjectRoleUsageBulk(db:Db,projects:ProjectRef[]){
  const usageByProject=new Map<string,RoleUsage>();
  const openProjects=projects.filter(project=>project.project_type==='open');
  const partnerProjects=projects.filter(project=>project.project_type!=='open');

  for(const project of openProjects)usageByProject.set(project.id,{known:true,filled:new Map()});
  for(const project of partnerProjects)usageByProject.set(project.id,{known:true,filled:new Map()});

  if(openProjects.length){
    const {data:runs,error:runError}=await db.from('project_runs').select('id,project_id,run_number').in('project_id',openProjects.map(project=>project.id)).eq('status','forming').eq('has_started',false).order('run_number',{ascending:true});
    if(runError){for(const project of openProjects)usageByProject.set(project.id,{known:false,filled:new Map()});}
    else{
      const firstRunByProject=new Map<string,string>();
      for(const run of runs||[])if(!firstRunByProject.has(run.project_id))firstRunByProject.set(run.project_id,run.id);
      const runIds=[...firstRunByProject.values()];
      if(runIds.length){
        const {data:members,error:memberError}=await db.from('project_members').select('project_run_id,project_role_id').in('project_run_id',runIds).in('membership_status',['waiting','active']);
        if(memberError){for(const project of openProjects)usageByProject.set(project.id,{known:false,filled:new Map()});}
        else{
          const projectByRun=new Map([...firstRunByProject.entries()].map(([projectId,runId])=>[runId,projectId]));
          for(const member of members||[]){const projectId=member.project_run_id?projectByRun.get(member.project_run_id):null;if(!projectId)continue;addCount(usageByProject.get(projectId)!.filled,member.project_role_id)}
        }
      }
    }
  }

  if(partnerProjects.length){
    const {data:members,error}=await db.from('project_members').select('project_id,project_role_id').in('project_id',partnerProjects.map(project=>project.id)).in('membership_status',['waiting','active']);
    if(error){for(const project of partnerProjects)usageByProject.set(project.id,{known:false,filled:new Map()});}
    else for(const member of members||[]){if(!member.project_id)continue;addCount(usageByProject.get(member.project_id)!.filled,member.project_role_id)}
  }

  return usageByProject;
}
