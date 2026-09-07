import {serviceDb} from '@/lib/project-flow';
import ProjectSoloDeliveryControls from './ProjectSoloDeliveryControls';

type CapacitySnapshot={target?:number;available?:number;capacity_available?:boolean};
function one<T>(value:T|T[]|null|undefined){return Array.isArray(value)?value[0]||null:value||null}

export default async function ProjectSoloDeliverySection({projectId,projectRunId,runStatus,activeMemberCount}:{projectId:string;projectRunId:string;runStatus:string;activeMemberCount:number}){
 if(runStatus!=='active'||activeMemberCount!==1)return null;
 const db=serviceDb();
 if(!db)return null;
 const [{data:project},{data:run},{data:rawCapacity,error:capacityError}]=await Promise.all([
  db.from('projects').select('participation_mode,target_team_size,late_joining_enabled,late_joining_cutoff_at').eq('id',projectId).maybeSingle(),
  db.from('project_runs').select('id,has_started,recruitment_open').eq('id',projectRunId).eq('project_id',projectId).maybeSingle(),
  db.rpc('phase9_project_run_capacity',{p_project_id:projectId,p_run_id:projectRunId})
 ]);
 if(!project||!run||run.has_started!==true||capacityError)return null;
 if(!['solo','flexible'].includes(project.participation_mode))return null;
 const capacity=one(rawCapacity as CapacitySnapshot|CapacitySnapshot[]|null);
 if(!capacity)return null;
 const cutoff=project.late_joining_cutoff_at?new Date(project.late_joining_cutoff_at).getTime():null;
 const windowOpen=project.late_joining_enabled!==false&&(cutoff===null||!Number.isFinite(cutoff)||Date.now()<cutoff);
 const canOpen=project.participation_mode==='flexible'&&windowOpen&&capacity.capacity_available===true&&Number(capacity.available||0)>0;
 return <ProjectSoloDeliveryControls projectId={projectId} projectRunId={projectRunId} participationMode={project.participation_mode} targetTeamSize={Math.max(1,Number(capacity.target||project.target_team_size||1))} availablePlaces={Math.max(0,Number(capacity.available||0))} recruitmentOpen={run.recruitment_open===true} canOpenCollaboration={canOpen} joiningCutoffAt={project.late_joining_cutoff_at||null}/>;
}
