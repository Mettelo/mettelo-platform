import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import MemberProfileSection from '@/components/MemberProfileSection';
import MemberApplicationTracker from '@/components/MemberApplicationTracker';
import ContributionForm from '@/components/ContributionForm';
import styles from './member.module.css';

export const metadata:Metadata={title:'My Mettelo',description:'Your private Mettelo member workspace for profile, projects, applications and contribution.'};
export const dynamic='force-dynamic';

type Formation={filled:number;threshold:number;status:string;is_full:boolean;kickoff_at:string|null};
type Membership={id:string;team_role:string;membership_status:string;joined_at:string;project_id:string;projects:{id:string;title:string;status:string}|null};
type Application={id:string;status:string;submitted_at:string;project_id:string;projects:{title:string;status:string}|null;project_roles:{title:string}|null;formation?:Formation|null};
type Contribution={id:string;title:string;contribution_type:string;verification_status:string;created_at:string;evidence_url:string|null;review_notes:string|null;projects:{title:string}|null};
type TaxonomyItem={slug:string;name:string};
type DomainPreferenceRow={domains:TaxonomyItem|null};
type ToolPreferenceRow={tools:TaxonomyItem|null};
type Recommendation={id:string;slug:string;title:string;status:string;difficulty_level:string|null;project_domains?:{domains:TaxonomyItem|null}[];project_tools?:{tools:TaxonomyItem|null}[]};

export default async function MemberDashboard(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/signin');

  const [profileResult,applicationsResult,membershipsResult,contributionsResult,savedResult,eventsResult,domainsResult,toolsResult,domainPrefsResult,toolPrefsResult,recommendationResult]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',user.id).single(),
    supabase.from('project_applications').select('id,status,submitted_at,project_id,projects(title,status),project_roles(title)',{count:'exact'}).eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(8),
    supabase.from('project_members').select('id,team_role,membership_status,joined_at,project_id,projects(id,title,status)',{count:'exact'}).eq('user_id',user.id).order('joined_at',{ascending:false}),
    supabase.from('contributions').select('id,title,contribution_type,verification_status,created_at,evidence_url,review_notes,projects(title)',{count:'exact'}).eq('user_id',user.id).order('created_at',{ascending:false}).limit(10),
    supabase.from('saved_opportunities').select('opportunity_id',{count:'exact'}).eq('user_id',user.id),
    supabase.from('event_registrations').select('event_id',{count:'exact'}).eq('user_id',user.id),
    supabase.from('domains').select('slug,name').eq('is_active',true).order('sort_order'),
    supabase.from('tools').select('slug,name').eq('is_active',true).order('sort_order'),
    supabase.from('profile_domain_preferences').select('domains(slug,name)').eq('user_id',user.id),
    supabase.from('profile_tool_preferences').select('tools(slug,name)').eq('user_id',user.id),
    supabase.from('projects').select('id,slug,title,status,difficulty_level,project_domains(domains(slug,name)),project_tools(tools(slug,name))').eq('visibility','public').in('status',['pilot','recruiting','open','forming']).order('created_at',{ascending:false}).limit(20)
  ]);

  const profile=profileResult.data||{full_name:user.user_metadata?.full_name||'',headline:'',bio:'',location:'',professional_area:'',primary_goal:'',linkedin_url:'',github_url:'',avatar_url:null,skills:[],is_public:false};
  const rawApplications=(applicationsResult.data||[]) as unknown as Application[];
  const applications=await Promise.all(rawApplications.map(async item=>{const {data}=await supabase.rpc('project_team_formation',{target_project:item.project_id});return {...item,formation:(data||null) as Formation|null};}));
  const memberships=((membershipsResult.data||[]) as unknown as Membership[]).filter(item=>!['left','removed'].includes(item.membership_status));
  const contributions=(contributionsResult.data||[]) as unknown as Contribution[];
  const domains=(domainsResult.data||[]) as TaxonomyItem[];const tools=(toolsResult.data||[]) as TaxonomyItem[];
  const domainPreferences=((domainPrefsResult.data||[]) as unknown as DomainPreferenceRow[]).map(row=>row.domains?.slug).filter((value):value is string=>Boolean(value));
  const toolPreferences=((toolPrefsResult.data||[]) as unknown as ToolPreferenceRow[]).map(row=>row.tools?.slug).filter((value):value is string=>Boolean(value));
  const recommendations=((recommendationResult.data||[]) as unknown as Recommendation[]).map(project=>{
    const projectDomains=(project.project_domains||[]).map(x=>x.domains?.slug).filter((value):value is string=>Boolean(value));
    const projectTools=(project.project_tools||[]).map(x=>x.tools?.slug).filter((value):value is string=>Boolean(value));
    const matchedDomains=projectDomains.filter(slug=>domainPreferences.includes(slug));
    const matchedTools=projectTools.filter(slug=>toolPreferences.includes(slug));
    return {...project,matchedDomains,matchedTools,score:matchedDomains.length*3+matchedTools.length};
  }).filter(project=>project.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
  const verifiedCount=contributions.filter(item=>item.verification_status==='verified').length;
  const name=profile.full_name||user.email?.split('@')[0]||'Member';
  const contributionProjects=memberships.filter(item=>item.membership_status==='active'&&item.projects&&item.projects.status!=='archived').map(item=>({id:item.project_id,title:item.projects?.title||'Mettelo Labs project'}));
  const hasActivity=Boolean((applicationsResult.count||0)||(membershipsResult.count||0)||verifiedCount||(savedResult.count||0));
  const activeMemberships=memberships.filter(item=>item.membership_status==='active'&&item.projects?.status==='active');

  return <section className={`${styles.memberScope} section softSection memberWorkspace`}><div className="shell dashboard memberDashboard">
    <aside className="sidebar memberSidebar" aria-label="My Mettelo sections"><div className="memberSidebarLabel"><span className="eyebrow">Member workspace</span></div></aside>
    <div className="dashboardMain memberDashboardMain" id="overview">
      <header className="memberHero"><div className="eyebrow">Dashboard</div><h1>Welcome, {name}. Here is what is moving.</h1><p className="lead">Track applications, see teams form, return to active project work and turn completed delivery into verified Proof.</p></header>

      {hasActivity?<div className="metricGrid memberMetricGrid" aria-label="Your Mettelo activity"><div className="metric"><strong>{applicationsResult.count||0}</strong><span>Project applications</span></div><div className="metric"><strong>{activeMemberships.length}</strong><span>Active projects</span></div><div className="metric"><strong>{verifiedCount}</strong><span>Verified contributions</span></div><div className="metric"><strong>{savedResult.count||0}</strong><span>Saved opportunities</span></div></div>:<section className="panel memberGettingStarted" aria-labelledby="member-get-started"><div><span className="cardNumber">GET STARTED</span><h2 id="member-get-started">Build your Mettelo footprint.</h2><p>Your dashboard will fill with activity as you take part. Start with the steps that create the strongest signal for matching, contribution and opportunity.</p></div><div className="memberChecklist"><a href="#profile"><span>01</span><div><strong>Complete your profile</strong><small>Add your interests, tools and the work you want to do.</small></div><b>→</b></a><a href="/projects"><span>02</span><div><strong>Explore a Labs project</strong><small>Find real work where you can contribute and build evidence.</small></div><b>→</b></a><a href="/opportunities"><span>03</span><div><strong>Save a relevant opportunity</strong><small>Keep useful Data & AI roles connected to your workspace.</small></div><b>→</b></a></div></section>}

      <section className="panel memberSection" id="applications"><div className="panelHead"><div><span className="cardNumber">APPLICATION TRACKER</span><h3 style={{marginTop:7}}>Your Labs applications</h3></div><a className="linkArrow" href="/projects">Explore more projects →</a></div><p style={{margin:'0 0 18px',color:'#66707e'}}>Track the full journey from submission and review through approval, team formation and kickoff. Approved members see the live team fill count while they wait.</p><MemberApplicationTracker applications={applications}/></section>

      <section className="panel memberSection" id="projects"><div className="panelHead"><div><span className="cardNumber">MY WORK</span><h3 style={{marginTop:7}}>My Projects</h3></div><a className="linkArrow" href="/projects">Discover projects →</a></div>{memberships.length?<div className="memberProjectList">{memberships.map(item=>{const canOpen=item.membership_status==='active'||item.membership_status==='completed'||['active','review','completed'].includes(item.projects?.status||'');return <div className="listRow" key={item.id}><div><strong>{item.projects?.title||'Mettelo Labs project'}</strong><br/><small>{item.team_role.replace('_',' ')} · {item.membership_status==='waiting'?'approved — waiting for team':item.membership_status.replace('_',' ')}</small></div><div className="memberRowActions"><span className={`chip ${item.membership_status==='active'?'green':''}`}>{item.membership_status.toUpperCase()}</span>{canOpen?<a className="button dark" href={`/member/projects/${item.project_id}`}>{item.membership_status==='completed'?'View workspace →':'Open workspace →'}</a>:<a className="linkArrow" href="#applications">Track team formation →</a>}</div></div>})}</div>:<div className="emptyState"><h3>No project team yet.</h3><p>Approved applications appear here while the team forms. The collaboration workspace unlocks at kickoff.</p><a className="linkArrow" href="#applications">Track your applications →</a></div>}</section>

      <section className="panel memberSection" id="recommended"><div className="panelHead"><div><span className="cardNumber">MATCHED TO YOU</span><h3>Recommended Labs projects</h3></div><a className="linkArrow" href="/projects">See all projects →</a></div>{recommendations.length?<div className="grid3">{recommendations.map(project=><article className="card recommendationCard" key={project.id}><span className={`chip ${['recruiting','open','forming'].includes(project.status)?'green':'blue'}`}>{project.status.toUpperCase()}</span><h3>{project.title}</h3><div className="projectTagRow">{project.matchedDomains.map(slug=><span key={slug}>{domains.find(d=>d.slug===slug)?.name||slug}</span>)}{project.matchedTools.slice(0,3).map(slug=><span key={slug}>{tools.find(t=>t.slug===slug)?.name||slug}</span>)}</div><p>{project.matchedDomains.length+project.matchedTools.length} preference {project.matchedDomains.length+project.matchedTools.length===1?'match':'matches'}.</p><a className="linkArrow" href={`/projects?${project.matchedDomains[0]?`domain=${encodeURIComponent(project.matchedDomains[0])}`:project.matchedTools[0]?`tool=${encodeURIComponent(project.matchedTools[0])}`:''}#open-projects`}>View matching projects →</a></article>)}</div>:<div className="emptyState"><h3>{domainPreferences.length||toolPreferences.length?'No matching open projects yet.':'Tell Mettelo what you want to work on.'}</h3><p>{domainPreferences.length||toolPreferences.length?'Your preferences are saved. Matching projects will appear here when relevant briefs are published.':'Choose domains and tools in your profile and Mettelo will use them to surface more relevant Labs projects.'}</p><a className="linkArrow" href="#profile">Update project preferences →</a></div>}</section>

      <section id="profile" className="memberSection"><MemberProfileSection profile={{full_name:profile.full_name,headline:profile.headline,bio:profile.bio,location:profile.location,professional_area:profile.professional_area,primary_goal:profile.primary_goal,linkedin_url:profile.linkedin_url,github_url:profile.github_url,avatar_url:profile.avatar_url,skills:profile.skills||[],is_public:profile.is_public||false}} domains={domains} tools={tools} domainPreferences={domainPreferences} toolPreferences={toolPreferences}/></section>
      <section id="submit-proof" className="memberSection"><ContributionForm projects={contributionProjects}/></section>
      <section className="panel memberSection" id="proof"><div className="panelHead"><h3>Your contribution record</h3><a className="linkArrow" href="/showcase">Explore public Proof →</a></div>{contributions.length?<div className="grid3">{contributions.slice(0,6).map(item=>{const shareText=`I verified a contribution on Mettelo: ${item.title}${item.projects?.title?` · ${item.projects.title}`:''}.`;const shareUrl=`https://mettelo.com/showcase#proof-${item.id}`;return <article className="card proofCard" key={item.id}><div className="proofCardTop"><span className={`chip ${item.verification_status==='verified'?'green':''}`}>{item.verification_status.replace('_',' ').toUpperCase()}</span>{item.verification_status==='verified'&&<div className="proofShare" aria-label={`Share ${item.title}`}><a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label={`Share ${item.title} on LinkedIn`} title="Share on LinkedIn">in</a><a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label={`Share ${item.title} on X`} title="Share on X">𝕏</a></div>}</div><h3>{item.title}</h3><p>{item.projects?.title||'Mettelo contribution'} · {item.contribution_type.replace('_',' ')}</p>{item.review_notes&&<p className="proofReview"><strong>Reviewer:</strong> {item.review_notes}</p>}{item.evidence_url&&<a className="linkArrow" href={item.evidence_url} target="_blank" rel="noopener noreferrer">Evidence →</a>}</article>})}</div>:<div className="emptyState"><h3>No contribution evidence yet.</h3><p>Complete project delivery to unlock verified contribution, or submit evidence from work you owned for review.</p></div>}</section>
      <section className="panel memberSection"><div className="panelHead"><h3>Continue the loop</h3></div><div className="grid3 memberLoop"><div><span className="cardNumber">CONNECT</span><h3>Community</h3><p>Meet peers and find collaborators around your goals.</p><a className="linkArrow" href="/community">Open community →</a></div><div><span className="cardNumber">BUILD</span><h3>Labs</h3><p>Own project work, complete delivery and turn it into verified contribution.</p><a className="linkArrow" href="/projects">Explore Labs →</a></div><div><span className="cardNumber">DISCOVER</span><h3>Opportunity</h3><p>Use verified contribution as stronger context for the opportunities you pursue.</p><a className="linkArrow" href="/opportunities">Explore opportunities →</a></div></div></section>
    </div>
  </div></section>;
}
