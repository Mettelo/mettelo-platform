import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createClient} from '@supabase/supabase-js';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import MemberApplicationTracker from '@/components/MemberApplicationTracker';
import styles from './member.module.css';

export const metadata:Metadata={title:'Dashboard · Mettelo',description:'Your Mettelo member dashboard.'};export const dynamic='force-dynamic';
type Formation={filled:number;threshold:number;status:string;is_full:boolean;kickoff_at:string|null};
type Application={id:string;status:string;submitted_at:string;project_id:string;projects:{title:string;status:string}|null;project_roles:{title:string}|null;formation?:Formation|null};
type Membership={id:string;team_role:string;membership_status:string;project_id:string;projects:{title:string;status:string;team_size_threshold:number|null}|null};
type Task={id:string;title:string;status:string;due_at:string|null;project_id:string;projects:{title:string}|null};

export default async function MemberDashboard(){
  const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/signin');
  const [profileResult,appsResult,membersResult,proofResult,savedResult,tasksResult]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',user.id).single(),
    supabase.from('project_applications').select('id,status,submitted_at,project_id,projects(title,status),project_roles(title)',{count:'exact'}).eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(3),
    supabase.from('project_members').select('id,team_role,membership_status,project_id,projects(title,status,team_size_threshold)',{count:'exact'}).eq('user_id',user.id).in('membership_status',['waiting','active','completed']).order('joined_at',{ascending:false}),
    supabase.from('contributions').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('verification_status','verified'),
    supabase.from('saved_opportunities').select('opportunity_id',{count:'exact',head:true}).eq('user_id',user.id),
    supabase.from('project_tasks').select('id,title,status,due_at,project_id,projects(title)').eq('assignee_user_id',user.id).neq('status','done').order('due_at',{ascending:true,nullsFirst:false}).limit(5)
  ]);
  const profile=profileResult.data||{};const memberships=(membersResult.data||[]) as unknown as Membership[];const tasks=(tasksResult.data||[]) as unknown as Task[];const rawApps=(appsResult.data||[]) as unknown as Application[];
  const ids=[...new Set(rawApps.map(a=>a.project_id))];const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;const service=url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;const formations=new Map<string,Formation>();
  if(service&&ids.length){const [{data:projects},{data:members}]=await Promise.all([service.from('projects').select('id,status,team_size_threshold,kickoff_at').in('id',ids),service.from('project_members').select('project_id,membership_status').in('project_id',ids).in('membership_status',['waiting','active'])]);for(const p of projects||[]){const filled=(members||[]).filter(m=>m.project_id===p.id).length;const threshold=p.team_size_threshold||1;formations.set(p.id,{filled,threshold,status:p.status,is_full:filled>=threshold,kickoff_at:p.kickoff_at});}}
  const apps=rawApps.map(a=>({...a,formation:formations.get(a.project_id)||null}));const active=memberships.filter(m=>m.membership_status==='active'&&m.projects?.status==='active');const waiting=memberships.filter(m=>m.membership_status==='waiting');
  const name=profile.full_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Member';
  const profileReady=Boolean(profile.full_name&&(profile.headline||profile.current_job_title||profile.professional_area)&&profile.skills?.length&&profile.project_availability);
  const attention=[
    !profileReady?{title:'Complete your professional profile',text:'Add your role, skills and availability so Mettelo can match you to the right work.',href:'/member/profile',cta:'Complete profile'}:null,
    tasks.length?{title:`${tasks.length} assigned task${tasks.length===1?'':'s'} need attention`,text:'Return to your project workspace and keep delivery moving.',href:`/member/projects/${tasks[0].project_id}`,cta:'Open work'}:null,
    waiting.length?{title:`${waiting.length} approved project${waiting.length===1?' is':'s are'} forming`,text:'Your place is confirmed. Track the remaining team spots and kickoff status.',href:'/member/applications',cta:'Track formation'}:null
  ].filter(Boolean) as {title:string;text:string;href:string;cta:string}[];

  return <section className={`${styles.memberScope} section softSection memberWorkspace`}><div className="shell memberDashboardMain">
    <header className="memberHero"><div className="eyebrow">Dashboard</div><h1>Welcome, {name}.</h1><p className="lead">Focus on what needs action now. Detailed applications, projects, Proof and profile management each have their own workspace.</p></header>
    <div className="metricGrid memberMetricGrid"><a className="metric" href="/member/applications"><strong>{appsResult.count||0}</strong><span>Applications</span></a><a className="metric" href="/member/projects"><strong>{active.length}</strong><span>Active projects</span></a><a className="metric" href="/member/proof"><strong>{proofResult.count||0}</strong><span>Verified Proof</span></a><a className="metric" href="/opportunities"><strong>{savedResult.count||0}</strong><span>Saved opportunities</span></a></div>

    <div className="dashboardGrid" style={{marginTop:18}}><section className="panel"><div className="panelHead"><div><span className="cardNumber">NEXT ACTIONS</span><h3 style={{marginTop:7}}>Needs your attention</h3></div></div>{attention.length?attention.map((item,index)=><div className="listRow" key={index}><div><strong>{item.title}</strong><br/><small>{item.text}</small></div><a className="button ghost" href={item.href}>{item.cta} →</a></div>):<div className="emptyState"><h3>You are up to date.</h3><p>Explore recommended projects or opportunities when you are ready for the next move.</p><a className="linkArrow" href="/member/recommended">See recommendations →</a></div>}</section>
    <aside className="panel"><div className="panelHead"><div><span className="cardNumber">ASSIGNED TO YOU</span><h3 style={{marginTop:7}}>Current tasks</h3></div><a className="linkArrow" href="/member/projects">All projects →</a></div>{tasks.length?tasks.slice(0,4).map(task=><div className="listRow" key={task.id}><div><strong>{task.title}</strong><br/><small>{task.projects?.title||'Mettelo project'}{task.due_at?` · due ${new Date(task.due_at).toLocaleDateString('en-GB')}`:''}</small></div><span className="chip">{task.status.replaceAll('_',' ').toUpperCase()}</span></div>):<div className="emptyState"><h3>No open tasks.</h3><p>Assigned project work will appear here.</p></div>}</aside></div>

    <section className="panel memberSection" style={{marginTop:18}}><div className="panelHead"><div><span className="cardNumber">APPLICATIONS</span><h3 style={{marginTop:7}}>Latest project applications</h3></div><a className="linkArrow" href="/member/applications">View all applications →</a></div><MemberApplicationTracker applications={apps}/></section>

    <section className="panel memberSection" style={{marginTop:18}}><div className="panelHead"><div><span className="cardNumber">CONTINUE WORKING</span><h3 style={{marginTop:7}}>Active projects</h3></div><a className="linkArrow" href="/member/projects">My Projects →</a></div>{active.length?<div className="memberProjectList">{active.slice(0,4).map(item=><div className="listRow" key={item.id}><div><strong>{item.projects?.title||'Mettelo Labs project'}</strong><br/><small>{item.team_role.replaceAll('_',' ')}</small></div><a className="button dark" href={`/member/projects/${item.project_id}`}>Open workspace →</a></div>)}</div>:<div className="emptyState"><h3>No active workspace yet.</h3><p>Approved projects appear here as soon as kickoff happens.</p><a className="linkArrow" href="/member/applications">Track applications →</a></div>}</section>
  </div></section>;
}
