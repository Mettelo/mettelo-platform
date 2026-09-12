import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import MemberCollaboratorDiscovery from '@/components/MemberCollaboratorDiscovery';

export const dynamic='force-dynamic';
type Search={project_id?:string|string[];project_run_id?:string|string[];collaboration_need?:string|string[]};
type Capacity={available?:number;maximum?:number;occupied?:number};
function one(value:string|string[]|undefined){return Array.isArray(value)?value[0]||'':value||''}
function capacityOne<T>(value:T|T[]|null|undefined):T|null{return Array.isArray(value)?value[0]||null:value||null}

export default async function FindCollaboratorsPage({searchParams}:{searchParams?:Promise<Search>}){
 const params=await searchParams||{};const projectId=one(params.project_id).trim();const requestedRunId=one(params.project_run_id).trim();const needId=one(params.collaboration_need).trim();
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();const next=`/member/find-collaborators${projectId?`?project_id=${encodeURIComponent(projectId)}${requestedRunId?`&project_run_id=${encodeURIComponent(requestedRunId)}`:''}`:''}`;if(!user)redirect(`/signin?next=${encodeURIComponent(next)}`);
 if(!projectId)return <main><section className="panel"><span className="cardNumber">MEMBER DISCOVERY</span><h1>Choose a project first</h1><p>Open Mettelo Lab → Team → Grow the Team so Mettelo can preserve the exact project run.</p><a className="button dark" href="/member/projects">My projects</a></section></main>;
 const db=serviceDb();let projectTitle='Current Mettelo project',teamOccupied=0,teamMaximum=0,openPlaces=0,runStatus='forming',projectRunId=requestedRunId;
 if(db){const {data:need}=needId?await db.from('project_collaboration_needs').select('project_run_id').eq('id',needId).eq('project_id',projectId).maybeSingle():{data:null};if(need?.project_run_id)projectRunId=String(need.project_run_id);const [{data:project},{data:run}]=await Promise.all([db.from('projects').select('title').eq('id',projectId).maybeSingle(),projectRunId?db.from('project_runs').select('id,status').eq('id',projectRunId).eq('project_id',projectId).maybeSingle():Promise.resolve({data:null})]);projectTitle=project?.title||projectTitle;if(run){projectRunId=run.id;runStatus=run.status;const result=await db.rpc('phase9_project_run_capacity',{p_project_id:projectId,p_run_id:run.id});const capacity=capacityOne(result.data as Capacity|Capacity[]|null);teamOccupied=Number(capacity?.occupied||0);teamMaximum=Number(capacity?.maximum||0);openPlaces=Number(capacity?.available||0)}}
 if(!projectRunId)return <main><section className="panel"><span className="cardNumber">MEMBER DISCOVERY</span><h1>Project run unavailable</h1><p>Return to Mettelo Lab → Team and open Find people on Mettelo again. Direct team requests are never allowed without an exact canonical run.</p><a className="button dark" href="/member/projects">My projects</a></section></main>;
 return <main><MemberCollaboratorDiscovery projectId={projectId} projectRunId={projectRunId} initialNeedId={needId} projectTitle={projectTitle} teamOccupied={teamOccupied} teamMaximum={teamMaximum} openPlaces={openPlaces} runStatus={runStatus}/></main>;
}
