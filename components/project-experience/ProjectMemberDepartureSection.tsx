import {serviceDb} from '@/lib/project-flow';
import ProjectMemberDepartureControls from './ProjectMemberDepartureControls';

export default async function ProjectMemberDepartureSection({projectId,projectRunId,currentUserId,runStatus}:{projectId:string;projectRunId:string;currentUserId:string;runStatus:string}){
 if(runStatus!=='active')return null;
 const db=serviceDb();
 if(!db)return null;
 const {data:membership}=await db.from('project_members').select('membership_status,departure_state').eq('project_id',projectId).eq('project_run_id',projectRunId).eq('user_id',currentUserId).maybeSingle();
 if(!membership||membership.membership_status!=='active')return null;
 const state=membership.departure_state==='leaving'?'leaving':'none';
 return <ProjectMemberDepartureControls projectId={projectId} projectRunId={projectRunId} initialState={state}/>;
}
