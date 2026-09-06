import {serviceDb} from '@/lib/project-flow';

export type ProjectTeamOverviewMember={id:string;name:string;username:string|null;headline:string|null;avatar_url:string|null;role:string;status:string;can_submit_final_proof:boolean;responsibilities:string[]};
export type ProjectTeamOverviewTeam={id:string;run_number:number;status:string;required_team_size:number|null;has_started:boolean|null;is_member:boolean;members:ProjectTeamOverviewMember[]};
export type ProjectTeamOverview={project_type:string;current_run_id:string|null;teams:ProjectTeamOverviewTeam[]};

type Db=NonNullable<ReturnType<typeof serviceDb>>;

export async function resolveProjectTeamOverview({db,projectId,userId,isAdmin,currentRunId=null}:{db:Db;projectId:string;userId:string;isAdmin:boolean;currentRunId?:string|null}):Promise<ProjectTeamOverview|null>{
 const {data:ownMemberships}=await db.from('project_members').select('project_run_id,team_role,membership_status').eq('project_id',projectId).eq('user_id',userId).in('membership_status',['waiting','active','completed']);
 if(!ownMemberships?.length&&!isAdmin)return null;
 const ownRunIds=new Set((ownMemberships||[]).map(row=>row.project_run_id).filter((value):value is string=>Boolean(value)));
 const [{data:project},{data:runs}]=await Promise.all([
  db.from('projects').select('id,project_type,title').eq('id',projectId).maybeSingle(),
  db.from('project_runs').select('id,run_number,status,required_team_size,has_started').eq('project_id',projectId).order('run_number',{ascending:true})
 ]);
 if(!project)return null;
 const visibleRuns=project.project_type==='partner'?(runs||[]).slice(0,1):(runs||[]);
 const readableRuns=isAdmin?visibleRuns:visibleRuns.filter(run=>ownRunIds.has(run.id));
 const readableRunIds=readableRuns.map(run=>run.id);
 const {data:members}=readableRunIds.length?await db.from('project_members').select('id,project_run_id,user_id,team_role,membership_status').in('project_run_id',readableRunIds).in('membership_status',['waiting','active','completed']):{data:[]};
 const userIds=[...new Set((members||[]).map(member=>member.user_id))];
 const memberIds=[...new Set((members||[]).map(member=>member.id))];
 const [{data:profiles},{data:permissions},{data:responsibilityRows}]=await Promise.all([
  userIds.length?db.from('profiles').select('id,full_name,username,headline,avatar_url').in('id',userIds):Promise.resolve({data:[]}),
  readableRunIds.length?db.from('project_submission_permissions').select('project_run_id,user_id,granted_by_user_id,granted_at').in('project_run_id',readableRunIds).is('revoked_at',null):Promise.resolve({data:[]}),
  memberIds.length?db.from('project_member_responsibilities').select('project_member_id,responsibility,assigned_at').in('project_member_id',memberIds).eq('assignment_status','active').order('assigned_at',{ascending:true}):Promise.resolve({data:[]})
 ]);
 const profileMap=new Map((profiles||[]).map(profile=>[profile.id,profile]));
 const responsibilitiesByMember=new Map<string,string[]>();
 for(const row of responsibilityRows||[]){
  const current=responsibilitiesByMember.get(row.project_member_id)||[];
  if(!current.some(item=>item.toLowerCase()===String(row.responsibility).toLowerCase()))current.push(String(row.responsibility));
  responsibilitiesByMember.set(row.project_member_id,current);
 }
 const teams=visibleRuns.map(run=>{
  const isMember=isAdmin||ownRunIds.has(run.id);
  return{id:isMember?run.id:`cohort-${run.run_number}`,run_number:run.run_number,status:run.status,required_team_size:isMember?run.required_team_size:null,has_started:isMember?run.has_started:null,is_member:isMember,members:isMember?(members||[]).filter(member=>member.project_run_id===run.id).map(member=>({id:member.user_id,name:profileMap.get(member.user_id)?.full_name||'Mettelo member',username:profileMap.get(member.user_id)?.username||null,headline:profileMap.get(member.user_id)?.headline||null,avatar_url:profileMap.get(member.user_id)?.avatar_url||null,role:member.team_role,status:member.membership_status,can_submit_final_proof:(permissions||[]).some(permission=>permission.project_run_id===run.id&&permission.user_id===member.user_id),responsibilities:responsibilitiesByMember.get(member.id)||[]})):[]};
 });
 return{project_type:project.project_type,current_run_id:currentRunId,teams};
}
