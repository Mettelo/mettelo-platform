import MetteloLabClient,{type MetteloLabClientProps} from '@/components/MetteloLabClient';
import {serviceDb} from '@/lib/project-flow';
import {resolveProjectTeamOverview,type ProjectTeamOverview} from '@/lib/project-team-overview';

type Props=Omit<MetteloLabClientProps,'teamOverview'>;

export default async function MetteloLabPanel(props:Props){
 const db=serviceDb();
 const fallbackOverview:ProjectTeamOverview={project_type:props.projectType,current_run_id:props.projectRunId,teams:[]};
 const teamOverview=db?await resolveProjectTeamOverview({db,projectId:props.projectId,userId:props.currentUserId,isAdmin:props.workspaceRole==='admin',currentRunId:props.projectRunId})||fallbackOverview:fallbackOverview;
 return <MetteloLabClient {...props} teamOverview={teamOverview}/>;
}