import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProfileEditor from '@/components/ProfileEditor';

export const metadata:Metadata={title:'My Mettelo',description:'Your private Mettelo member workspace for profile, projects, applications and contribution.'};

export default async function MemberDashboard(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/signin');

  const [profileResult,applicationsResult,membershipsResult,contributionsResult,savedResult,eventsResult]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',user.id).single(),
    supabase.from('project_applications').select('id,status,submitted_at,project_id',{count:'exact'}).eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(5),
    supabase.from('project_members').select('id,team_role,joined_at,project_id',{count:'exact'}).eq('user_id',user.id).order('joined_at',{ascending:false}).limit(5),
    supabase.from('contributions').select('id,title,contribution_type,verification_status,created_at',{count:'exact'}).eq('user_id',user.id).order('created_at',{ascending:false}).limit(5),
    supabase.from('saved_opportunities').select('opportunity_id',{count:'exact'}).eq('user_id',user.id),
    supabase.from('event_registrations').select('event_id',{count:'exact'}).eq('user_id',user.id)
  ]);

  const profile=profileResult.data||{full_name:user.user_metadata?.full_name||'',headline:'',bio:'',location:'',professional_area:'',primary_goal:'',linkedin_url:'',github_url:'',skills:[],is_public:false};
  const applications=applicationsResult.data||[];
  const memberships=membershipsResult.data||[];
  const contributions=contributionsResult.data||[];
  const verifiedCount=contributions.filter(item=>item.verification_status==='verified').length;
  const name=profile.full_name||user.email?.split('@')[0]||'Member';

  return <section className="section softSection"><div className="shell dashboard">
    <aside className="sidebar"><div className="sidebarTop"><h3>My Mettelo</h3><small>{user.email}</small></div><a className="active" href="#overview">Overview <span>⌂</span></a><a href="#profile">Profile <span>→</span></a><a href="#applications">Applications <span>{applicationsResult.count||0}</span></a><a href="#projects">Projects <span>{membershipsResult.count||0}</span></a><a href="#proof">Proof <span>{contributionsResult.count||0}</span></a><a href="/opportunities">Opportunities <span>{savedResult.count||0}</span></a><a href="/events">Events <span>{eventsResult.count||0}</span></a><a href="/community">Community <span>→</span></a></aside>
    <main className="dashboardMain" id="overview"><div className="eyebrow">Member workspace</div><h1>Welcome, {name}. What are you moving forward?</h1><p className="lead">Your profile, Labs applications, active projects and verified contribution stay connected to one Mettelo identity.</p>
      <div className="metricGrid"><div className="metric"><strong>{applicationsResult.count||0}</strong><span>Project applications</span></div><div className="metric"><strong>{membershipsResult.count||0}</strong><span>Active / past project memberships</span></div><div className="metric"><strong>{verifiedCount}</strong><span>Verified recent contributions</span></div><div className="metric"><strong>{savedResult.count||0}</strong><span>Saved opportunities</span></div></div>

      <section id="profile" style={{marginBottom:18}}><ProfileEditor profile={{full_name:profile.full_name,headline:profile.headline,bio:profile.bio,location:profile.location,professional_area:profile.professional_area,primary_goal:profile.primary_goal,linkedin_url:profile.linkedin_url,github_url:profile.github_url,skills:profile.skills||[],is_public:profile.is_public||false}}/></section>

      <div className="dashboardGrid" id="applications"><section className="panel"><div className="panelHead"><h3>Recent applications</h3><a className="linkArrow" href="/projects">Explore Labs →</a></div>{applications.length?applications.map(item=><div className="listRow" key={item.id}><div><strong>Project application</strong><br/><small>{new Date(item.submitted_at).toLocaleDateString('en-GB')}</small></div><span className="chip">{item.status.replace('_',' ').toUpperCase()}</span></div>):<div className="emptyState"><h3>No applications yet.</h3><p>When a Labs project starts recruiting, your application status appears here.</p></div>}</section>
      <aside className="panel" id="projects"><div className="panelHead"><h3>Project memberships</h3><a className="linkArrow" href="/projects">Browse projects →</a></div>{memberships.length?memberships.map(item=><div className="listRow" key={item.id}><div><strong>{item.team_role.replace('_',' ')}</strong><br/><small>Joined {new Date(item.joined_at).toLocaleDateString('en-GB')}</small></div><span>→</span></div>):<div className="emptyState"><h3>No project membership yet.</h3><p>Accepted Labs roles appear here once a Project Lead adds you to the team.</p></div>}</aside></div>

      <section className="panel" style={{marginTop:18}} id="proof"><div className="panelHead"><h3>Your contribution record</h3><a className="linkArrow" href="/showcase">Explore Proof →</a></div>{contributions.length?<div className="grid3">{contributions.slice(0,3).map(item=><div key={item.id}><span className="cardNumber">{item.verification_status.toUpperCase()}</span><h3 style={{fontSize:'1.1rem',marginTop:10}}>{item.title}</h3><p>{item.contribution_type.replace('_',' ')}</p></div>)}</div>:<div className="emptyState"><h3>No contribution evidence yet.</h3><p>Proof is earned through reviewed work, leadership, mentoring or other meaningful contribution — never passive attendance.</p></div>}</section>

      <section className="panel" style={{marginTop:18}}><div className="panelHead"><h3>Continue the loop</h3></div><div className="grid3"><div><span className="cardNumber">CONNECT</span><h3 style={{fontSize:'1.1rem',marginTop:10}}>Community</h3><p>Meet peers and find collaborators around your goals.</p><a className="linkArrow" href="/community">Open community →</a></div><div><span className="cardNumber">BUILD</span><h3 style={{fontSize:'1.1rem',marginTop:10}}>Labs</h3><p>Find project briefs and roles where you can contribute.</p><a className="linkArrow" href="/projects">Explore Labs →</a></div><div><span className="cardNumber">DISCOVER</span><h3 style={{fontSize:'1.1rem',marginTop:10}}>Opportunity</h3><p>Use jobs, referrals and external pathways when they match your evidence and goals.</p><a className="linkArrow" href="/opportunities">Explore opportunities →</a></div></div></section>
    </main>
  </div></section>;
}
