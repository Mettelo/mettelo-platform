import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import MemberCollaboratorDiscovery from '@/components/MemberCollaboratorDiscovery';

export const dynamic='force-dynamic';
type Search={project_id?:string|string[];collaboration_need?:string|string[]};
type Capacity={available?:number;maximum?:number;occupied?:number};
function one(value:string|string[]|undefined){return Array.isArray(value)?value[0]||'':value||''}
function capacityOne<T>(value:T|T[]|null|undefined):T|null{return Array.isArray(value)?value[0]||null:value||null}

export default async function FindCollaboratorsPage({searchParams}:{searchParams?:Promise<Search>}){
 const params=await searchParams||{};const projectId=one(params.project_id).trim();const needId=one(params.collaboration_need).trim();
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/find-collaborators${projectId?`?project_id=${projectId}`:''}`)}`);
 if(!projectId)return <main><section className="panel"><span className="cardNumber">MEMBER DISCOVERY</span><h1>Choose a project first</h1><p>Open the project workspace and use <strong>Invite collaborator</strong> so Mettelo can preserve the exact project run and active collaboration need.</p><a className="button dark" href="/member/projects">My projects</a></section></main>;
 const db=serviceDb();let projectTitle='Current Mettelo project',teamOccupied=0,teamMaximum=0,openPlaces=0,runStatus='forming';
 if(db){const {data:need}=needId?await db.from('project_collaboration_needs').select('project_run_id').eq('id',needId).eq('project_id',projectId).maybeSingle():{data:null};const [{data:project},{data:run}]=await Promise.all([db.from('projects').select('title').eq('id',projectId).maybeSingle(),need?.project_run_id?db.from('project_runs').select('id,status').eq('id',need.project_run_id).eq('project_id',projectId).maybeSingle():Promise.resolve({data:null})]);projectTitle=project?.title||projectTitle;if(run){runStatus=run.status;const result=await db.rpc('phase9_project_run_capacity',{p_project_id:projectId,p_run_id:run.id});const capacity=capacityOne(result.data as Capacity|Capacity[]|null);teamOccupied=Number(capacity?.occupied||0);teamMaximum=Number(capacity?.maximum||0);openPlaces=Number(capacity?.available||0)}}
 return <main><MemberCollaboratorDiscovery projectId={projectId} initialNeedId={needId} projectTitle={projectTitle} teamOccupied={teamOccupied} teamMaximum={teamMaximum} openPlaces={openPlaces} runStatus={runStatus}/></main>;
}
