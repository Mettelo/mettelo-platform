import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import MemberCollaboratorDiscovery from '@/components/MemberCollaboratorDiscovery';

export const dynamic='force-dynamic';

type Search={project_id?:string|string[];collaboration_need?:string|string[]};
function one(value:string|string[]|undefined){return Array.isArray(value)?value[0]||'':value||''}

export default async function FindCollaboratorsPage({searchParams}:{searchParams?:Promise<Search>}){
 const params=await searchParams||{};const projectId=one(params.project_id).trim();const needId=one(params.collaboration_need).trim();
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/find-collaborators${projectId?`?project_id=${projectId}`:''}`)}`);
 if(!projectId)return <main><section className="panel"><span className="cardNumber">MEMBER DISCOVERY</span><h1>Choose a project first</h1><p>Open the project workspace and use <strong>Invite collaborator</strong> so Mettelo can preserve the exact project run and active collaboration need.</p><a className="button dark" href="/member/projects">My projects</a></section></main>;
 return <main><MemberCollaboratorDiscovery projectId={projectId} initialNeedId={needId}/></main>;
}
