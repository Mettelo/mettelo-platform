import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProfileEditor from '@/components/ProfileEditor';
import ContributionForm from '@/components/ContributionForm';

export const metadata:Metadata={title:'My Mettelo',description:'Your private Mettelo member workspace for profile, projects, applications and contribution.'};
export const dynamic='force-dynamic';

type Membership={id:string;team_role:string;joined_at:string;project_id:string;projects:{id:string;title:string;status:string}|null};
type Contribution={id:string;title:string;contribution_type:string;verification_status:string;created_at:string;evidence_url:string|null;review_notes:string|null;projects:{title:string}|null};
type TaxonomyItem={slug:string;name:string};
type Recommendation={id:string;slug:string;title:string;status:string;difficulty_level:string|null;project_domains?:{domains:TaxonomyItem|null}[];project_tools?:{tools:TaxonomyItem|null}[]};

export default async function MemberDashboard(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/signin');

  const [profileResult,applicationsResult,membershipsResult,contributionsResult,savedResult,eventsResult,domainsResult,toolsResult,domainPrefsResult,toolPrefsResult,recommendationResult]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',user.id).single(),
    supabase.from('project_applications').select('id,status,submitted_at,project_id',{count:'exact'}).eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(5),
    supabase.from('project_members').select('id,team_role,joined_at,project_id,projects(id,title,status)',{count:'exact'}).eq('user_id',user.id).order('joined_at',{ascending:false}),
    supabase.from('contributions').select('id,title,contribution_type,verification_status,created_at,evidence_url,review_notes,projects(title)',{count:'exact'}).eq('user_id',user.id).order('created_at',{ascending:false}).limit(10),
    supabase.from('saved_opportunities').select('opportunity_id',{count:'exact'}).eq('user_id',user.id),
    supabase.from('event_registrations').select('event_id',{count:'exact'}).eq('user_id',user.id),
    supabase.from('domains').select('slug,name').eq('is_active',true).order('sort_order'),
    supabase.from('tools').select('slug,name').eq('is_active',true).order('sort_order'),
    supabase.from('profile_domain_preferences').select('domains(slug,name)').eq('user_id',user.id),
    supabase.from('profile_tool_preferences').select('tools(slug,name)').eq('user_id',user.id),
    supabase.from('projects').select('id,slug,title,status,difficulty_level,project_domains(domains(slug,name)),project_tools(tools(slug,name))').eq('visibility','public').in('status',['pilot','recruiting']).order('created_at',{ascending:false}).limit(20)
  ]);

  const profile=profileResult.data||{full_name:user.user_metadata?.full_name||'',headline:'',bio:'',location:'',professional_area:'',primary_goal:'',linkedin_url:'',github_url:'',skills:[],is_public:false};
  const applications=applicationsResult.data||[];
  const memberships=(membershipsResult.data||[]) as unknown as Membership[];
  const contributions=(contributionsResult.data||[]) as unknown as Contribution[];
  const domains=(domainsResult.data||[]) as TaxonomyItem[];const tools=(toolsResult.data||[]) as TaxonomyItem[];
  const domainPreferences=(domainPrefsResult.data||[]).map((row:any)=>row.domains?.slug).filter(Boolean) as string[];
  const toolPreferences=(toolPrefsResult.data||[]).map((row:any)=>row.tools?.slug).filter(Boolean) as string[];
  const recommendations=((recommendationResult.data||[]) as unknown as Recommendation[]).map(project=>{
    const projectDomains=(project.project_domains||[]).map(x=>x.domains?.slug).filter(Boolean) as string[];
    const projectTools=(project.project_tools||[]).map(x=>x.tools?.slug).filter(Boolean) as string[];
    const matchedDomains=projectDomains.filter(slug=>domainPreferences.includes(slug));
    const matchedTools=projectTools.filter(slug=>toolPreferences.includes(slug));
    return {...project,matchedDomains,matchedTools,score:matchedDomains.length*3+matchedTools.length};
  }).filter(project=>project.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
  const verifiedCount=contributions.filter(item=>item.verification_status==='verified').length;
  const name=profile.full_name||user.email?.split('@')[0]||'Member';
  const contributionProjects=memberships.filter(item=>item.projects&&item.projects.status!=='archived').map(item=>({id:item.project_id,title:item.projects?.title||'Mettelo Labs project'}));

  return <section className="section softSection"><div className="shell dashboard">
    <aside className="sidebar" aria-label="My Mettelo sections"><div className="sidebarTop"><h3>My Mettelo</h3><small>{user.email}</small></div><a className="active" href="#overview">Overview <span>⌂</span></a><a href="#recommended">Recommended <span>✦</span></a><a href="#profile">Profile <span>→</span></a><a href="#applications">Applications <span>{applicationsResult.count||0}</span></a><a href="#projects">Projects <span>{membershipsResult.count||0}</span></a><a href="#submit-proof">Submit evidence <span>＋</span></a><a href="#proof">Proof <span>{contributionsResult.count||0}</span></a><a href="/opportunities">Opportunities <span>{savedResult.count||0}</span></a><a href="/events">Events <span>{eventsResult.count||0}</span></a><a href="/community">Community <span>→</span></a></aside>
    <div className="dashboardMain" id="overview"><div className="eyebrow">Member workspace</div><h1>Welcome, {name}. What are you moving forward?</h1><p className="lead">Your profile, Labs applications, active projects and verified contribution stay connected to one Mettelo identity.</p>
      <div className="metricGrid"><div className="metric"><strong>{applicationsResult.count||0}</strong><span>Project applications</span></div><div className="metric"><strong>{membershipsResult.count||0}</strong><span>Project memberships</span></div><div className="metric"><strong>{verifiedCount}</strong><span>Verified contributions</span></div><div className="metric"><strong>{savedResult.count||0}</strong><span>Saved opportunities</span></div></div>
      <section className="panel" id="recommended"><div className="panelHead"><div><span className="cardNumber">MATCHED TO YOU</span><h3>Recommended Labs projects</h3></div><a className="linkArrow" href="/projects">See all projects →</a></div>{recommendations.length?<div className="grid3">{recommendations.map(project=><article className="card recommendationCard" key={project.id}><span className={`chip ${project.status==='recruiting'?'green':'blue'}`}>{project.status.toUpperCase()}</span><h3>{project.title}</h3><div className="projectTagRow">{project.matchedDomains.map(slug=><span key={slug}>{domains.find(d=>d.slug===slug)?.name||slug}</span>)}{project.matchedTools.slice(0,3).map(slug=><span key={slug}>{tools.find(t=>t.slug===slug)?.name||slug}</span>)}</div><p>{project.matchedDomains.length+project.matchedTools.length} preference {project.matchedDomains.length+project.matchedTools.length===1?'match':'matches'}.</p><a className="linkArrow" href={`/projects?${project.matchedDomains[0]?`domain=${encodeURIComponent(project.matchedDomains[0])}`:project.matchedTools[0]?`tool=${encodeURIComponent(project.matchedTools[0])}`:''}#open-projects`}>View matching projects →</a></article>)}</div>:<div className="emptyState"><h3>{domainPreferences.length||toolPreferences.length?'No matching recruiting or pilot projects yet.':'Tell Mettelo what you want to work on.'}</h3><p>{domainPreferences.length||toolPreferences.length?'Your preferences are saved. Matching projects will appear here when relevant briefs are published.':'Choose domains and tools in your profile below and Mettelo will use them to surface more relevant Labs projects.'}</p><a className="linkArrow" href="#profile">Update project preferences →</a></div>}</section>
      <section id="profile" style={{marginTop:18,marginBottom:18}}><ProfileEditor profile={{full_name:profile.full_name,headline:profile.headline,bio:profile.bio,location:profile.location,professional_area:profile.professional_area,primary_goal:profile.primary_goal,linkedin_url:profile.linkedin_url,github_url:profile.github_url,skills:profile.skills||[],is_public:profile.is_public||false}} domains={domains} tools={tools} domainPreferences={domainPreferences} toolPreferences={toolPreferences}/></section>
      <div className="dashboardGrid" id="applications"><section className="panel"><div className="panelHead"><h3>Recent applications</h3><a className="linkArrow" href="/projects">Explore Labs →</a></div>{applications.length?applications.map(item=><div className="listRow" key={item.id}><div><strong>Project application</strong><br/><small>{new Date(item.submitted_at).toLocaleDateString('en-GB')}</small></div><span className="chip">{item.status.replace('_',' ').toUpperCase()}</span></div>):<div className="emptyState"><h3>No applications yet.</h3><p>When a Labs project starts recruiting, your application status appears here.</p></div>}</section><aside className="panel" id="projects"><div className="panelHead"><h3>Project memberships</h3><a className="linkArrow" href="/projects">Browse projects →</a></div>{memberships.length?memberships.map(item=><div className="listRow" key={item.id}><div><strong>{item.projects?.title||'Mettelo Labs project'}</strong><br/><small>{item.team_role.replace('_',' ')} · joined {new Date(item.joined_at).toLocaleDateString('en-GB')}</small></div><div style={{display:'flex',alignItems:'center',gap:10}}><span className="chip">{item.projects?.status?.toUpperCase()||'TEAM'}</span><a className="linkArrow" href={`/member/projects/${item.project_id}`}>Open workspace →</a></div></div>):<div className="emptyState"><h3>No project membership yet.</h3><p>Accepted Labs roles appear here once you join a delivery team.</p></div>}</aside></div>
      <section id="submit-proof" style={{marginTop:18}}><ContributionForm projects={contributionProjects}/></section>
      <section className="panel" style={{marginTop:18}} id="proof"><div className="panelHead"><h3>Your contribution record</h3><a className="linkArrow" href="/showcase">Explore public Proof →</a></div>{contributions.length?<div className="grid3">{contributions.slice(0,6).map(item=><article className="card" key={item.id}><span className={`chip ${item.verification_status==='verified'?'green':''}`}>{item.verification_status.replace('_',' ').toUpperCase()}</span><h3 style={{fontSize:'1.1rem',marginTop:12}}>{item.title}</h3><p>{item.projects?.title||'Mettelo contribution'} · {item.contribution_type.replace('_',' ')}</p>{item.review_notes&&<p style={{marginTop:10}}><strong>Reviewer:</strong> {item.review_notes}</p>}{item.evidence_url&&<a className="linkArrow" href={item.evidence_url} target="_blank" rel="noopener noreferrer">Evidence →</a>}</article>)}</div>:<div className="emptyState"><h3>No contribution evidence yet.</h3><p>Submit evidence from work you actually owned. Mettelo reviews it before it becomes verified Proof.</p></div>}</section>
      <section className="panel" style={{marginTop:18}}><div className="panelHead"><h3>Continue the loop</h3></div><div className="grid3"><div><span className="cardNumber">CONNECT</span><h3 style={{fontSize:'1.1rem',marginTop:10}}>Community</h3><p>Meet peers and find collaborators around your goals.</p><a className="linkArrow" href="/community">Open community →</a></div><div><span className="cardNumber">BUILD</span><h3 style={{fontSize:'1.1rem',marginTop:10}}>Labs</h3><p>Own project work, submit evidence and move it through review.</p><a className="linkArrow" href="/projects">Explore Labs →</a></div><div><span className="cardNumber">DISCOVER</span><h3 style={{fontSize:'1.1rem',marginTop:10}}>Opportunity</h3><p>Use verified contribution as stronger context for the opportunities you pursue.</p><a className="linkArrow" href="/opportunities">Explore opportunities →</a></div></div></section>
    </div>
  </div></section>;
}
