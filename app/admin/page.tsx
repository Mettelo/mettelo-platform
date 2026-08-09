import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import AdminContentManager from '@/components/AdminContentManager';
import AdminApplicationQueue from '@/components/AdminApplicationQueue';
import AdminProjectRoleManager from '@/components/AdminProjectRoleManager';

export const metadata:Metadata={title:'Mettelo Admin',description:'Private Mettelo operations console.'};

type ApplicationRow={id:string;user_id:string;status:string;submitted_at:string;contribution_statement:string;portfolio_url:string|null;availability:string|null;projects:{title:string}|null;project_roles:{title:string}|null};

type AdminProject={id:string;title:string;status:string};

export default async function AdminDashboard(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user) redirect('/signin');
  if(user.app_metadata?.role!=='admin') redirect('/member');

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  let counts={members:0,projects:0,opportunities:0,events:0,submissions:0,applications:0};
  let recentProjects:AdminProject[]=[];
  let allProjects:AdminProject[]=[];
  let recentSubmissions:{id:string;form_type:string;status:string;created_at:string}[]=[];
  let applicationItems:{id:string;name:string;email:string;project:string;role:string;status:string;submitted_at:string;statement:string;portfolio_url:string|null;availability:string|null}[]=[];

  if(url&&serviceKey){
    const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const [members,projects,opportunities,events,submissions,applications,projectRows,allProjectRows,submissionRows,applicationRows]=await Promise.all([
      db.from('profiles').select('id',{count:'exact',head:true}),
      db.from('projects').select('id',{count:'exact',head:true}),
      db.from('opportunities').select('id',{count:'exact',head:true}),
      db.from('events').select('id',{count:'exact',head:true}),
      db.from('form_submissions').select('id',{count:'exact',head:true}).eq('status','new'),
      db.from('project_applications').select('id',{count:'exact',head:true}).in('status',['submitted','in_review','shortlisted']),
      db.from('projects').select('id,title,status').order('updated_at',{ascending:false}).limit(5),
      db.from('projects').select('id,title,status').neq('status','archived').order('title'),
      db.from('form_submissions').select('id,form_type,status,created_at').order('created_at',{ascending:false}).limit(5),
      db.from('project_applications').select('id,user_id,status,submitted_at,contribution_statement,portfolio_url,availability,projects(title),project_roles(title)').in('status',['submitted','in_review','shortlisted']).order('submitted_at',{ascending:true}).limit(20)
    ]);
    counts={members:members.count||0,projects:projects.count||0,opportunities:opportunities.count||0,events:events.count||0,submissions:submissions.count||0,applications:applications.count||0};
    recentProjects=projectRows.data||[];allProjects=allProjectRows.data||[];recentSubmissions=submissionRows.data||[];
    const rows=(applicationRows.data||[]) as unknown as ApplicationRow[];
    const ids=[...new Set(rows.map(row=>row.user_id))];
    const profileMap=new Map<string,{full_name:string|null}>();
    if(ids.length){const profiles=await db.from('profiles').select('id,full_name').in('id',ids);(profiles.data||[]).forEach(profile=>profileMap.set(profile.id,{full_name:profile.full_name}));}
    const adminUsers=ids.length?await db.auth.admin.listUsers({page:1,perPage:1000}):null;
    const emailMap=new Map<string,string>();
    adminUsers?.data?.users?.forEach(member=>{if(ids.includes(member.id)) emailMap.set(member.id,member.email||'');});
    applicationItems=rows.map(row=>({id:row.id,name:profileMap.get(row.user_id)?.full_name||'Mettelo member',email:emailMap.get(row.user_id)||'',project:row.projects?.title||'Project',role:row.project_roles?.title||'Role',status:row.status,submitted_at:row.submitted_at,statement:row.contribution_statement,portfolio_url:row.portfolio_url,availability:row.availability}));
  }

  return <section className="section softSection"><div className="shell dashboard">
    <aside className="sidebar"><div className="sidebarTop"><h3>Mettelo Admin</h3><small>{user.email}</small></div><a className="active" href="#overview">Overview <span>⌂</span></a><a href="#publisher">Publish <span>＋</span></a><a href="#project-roles">Project roles <span>＋</span></a><a href="#applications">Applications <span>{counts.applications}</span></a><a href="#projects">Projects <span>{counts.projects}</span></a><a href="#submissions">Intake <span>{counts.submissions}</span></a></aside>
    <main className="dashboardMain" id="overview"><div className="eyebrow">Operations console</div><h1>Run Mettelo from production records.</h1><p className="lead">Publish Labs briefs, define roles, review applications and move accepted members into project teams from one protected workspace.</p>
      <div className="metricGrid"><div className="metric"><strong>{counts.members}</strong><span>Member profiles</span></div><div className="metric"><strong>{counts.projects}</strong><span>Projects</span></div><div className="metric"><strong>{counts.applications}</strong><span>Active project applications</span></div><div className="metric"><strong>{counts.submissions}</strong><span>New intake submissions</span></div></div>

      <AdminContentManager/>
      <div style={{marginTop:18}}><AdminProjectRoleManager projects={allProjects}/></div>
      <section className="panel" id="applications" style={{marginTop:18}}><div className="panelHead"><div><span className="cardNumber">LABS SELECTION</span><h3 style={{marginTop:8}}>Application review queue</h3></div><span className="chip">{counts.applications} ACTIVE</span></div><AdminApplicationQueue initialItems={applicationItems}/></section>

      <div className="dashboardGrid" style={{marginTop:18}}><section className="panel" id="projects"><div className="panelHead"><h3>Recent projects</h3><a className="linkArrow" href="/projects">Public view →</a></div>{recentProjects.length?recentProjects.map(item=><div className="listRow" key={item.id}><strong>{item.title}</strong><span className="chip">{item.status.toUpperCase()}</span></div>):<div className="emptyState"><h3>No project records.</h3><p>Create the first Labs brief from the publisher above.</p></div>}</section><aside className="panel"><div className="panelHead"><h3>Publishing inventory</h3></div><div className="listRow"><span>Projects</span><strong>{counts.projects}</strong></div><div className="listRow"><span>Opportunities</span><strong>{counts.opportunities}</strong></div><div className="listRow"><span>Events</span><strong>{counts.events}</strong></div></aside></div>

      <div className="dashboardGrid" style={{marginTop:18}}><section className="panel" id="submissions"><div className="panelHead"><h3>Latest intake</h3><span className="chip">PRIVATE</span></div>{recentSubmissions.length?recentSubmissions.map(item=><div className="listRow" key={item.id}><div><strong>{item.form_type.replace('_',' ')}</strong><br/><small>{new Date(item.created_at).toLocaleString('en-GB')}</small></div><span className="chip">{item.status.toUpperCase()}</span></div>):<div className="emptyState"><h3>No submissions yet.</h3><p>Contact, partnership, contributor and feedback submissions appear here.</p></div>}</section><aside className="panel"><div className="panelHead"><h3>Operational loop</h3><span className="chip green">LIVE DATA</span></div><div className="listRow"><span>Publish</span><strong>Admin → Supabase</strong></div><div className="listRow"><span>Define roles</span><strong>Labs recruitment</strong></div><div className="listRow"><span>Review</span><strong>Admin queue</strong></div><div className="listRow"><span>Accept</span><strong>Project membership</strong></div></aside></div>
    </main>
  </div></section>;
}
