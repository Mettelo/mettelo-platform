import {redirect} from 'next/navigation';
import {createClient} from '@supabase/supabase-js';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import MemberApplicationTracker from '@/components/MemberApplicationTracker';

type Application={id:string;status:string;submitted_at:string;project_id:string;projects:{title:string;status:string}|null;project_roles:{title:string}|null;formation?:{filled:number;threshold:number;status:string;is_full:boolean;kickoff_at:string|null}|null};

export const dynamic='force-dynamic';
export default async function ApplicationsPage(){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');
  const {data}=await auth.from('project_applications').select('id,status,submitted_at,project_id,projects(title,status),project_roles(title)').eq('user_id',user.id).order('submitted_at',{ascending:false});
  const applications=(data||[]) as unknown as Application[];const ids=[...new Set(applications.map(x=>x.project_id))];
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;const service=url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
  const formation=new Map<string,{filled:number;threshold:number;status:string;is_full:boolean;kickoff_at:string|null}>();
  if(service&&ids.length){const [{data:projects},{data:members}]=await Promise.all([service.from('projects').select('id,status,team_size_threshold,kickoff_at').in('id',ids),service.from('project_members').select('project_id,membership_status').in('project_id',ids).in('membership_status',['waiting','active','completed'])]);for(const p of projects||[]){const filled=(members||[]).filter(m=>m.project_id===p.id&&['waiting','active'].includes(m.membership_status)).length;const threshold=p.team_size_threshold||1;formation.set(p.id,{filled,threshold,status:p.status,is_full:filled>=threshold,kickoff_at:p.kickoff_at});}}
  const enriched=applications.map(a=>({...a,formation:formation.get(a.project_id)||null}));
  return <section className="section softSection memberWorkspace"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">My work · Applications</div><h1>Track every project application.</h1></div><p>See what Mettelo has received, what is being reviewed, whether you were approved and how close the project is to kickoff.</p></div><div className="panel"><MemberApplicationTracker applications={enriched}/></div></div></section>;
}
