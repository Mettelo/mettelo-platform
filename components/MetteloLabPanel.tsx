import MetteloLabClient,{type MetteloLabClientProps} from '@/components/MetteloLabClient';
import {serviceDb} from '@/lib/project-flow';
import {resolveProjectTeamOverview,type ProjectTeamOverview} from '@/lib/project-team-overview';
import {createServerSupabaseClient} from '@/lib/supabase/server';

type Props=Omit<MetteloLabClientProps,'teamOverview'>;

export default async function MetteloLabPanel(props:Props){
 const db=serviceDb();
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 const isAdmin=user?.id===props.currentUserId&&user.app_metadata?.role==='admin';
 const fallbackOverview:ProjectTeamOverview={project_type:props.projectType,current_run_id:props.projectRunId,teams:[]};
 const teamOverview=db?await resolveProjectTeamOverview({db,projectId:props.projectId,userId:props.currentUserId,isAdmin,currentRunId:props.projectRunId})||fallbackOverview:fallbackOverview;
 return <MetteloLabClient {...props} teamOverview={teamOverview}/>;
}