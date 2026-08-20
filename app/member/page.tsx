import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {mobileMoreNav} from '@/lib/member-navigation';
import styles from './member-home-v3.module.css';
import exploreStyles from './member-home-explore.module.css';

export const metadata:Metadata={title:'My Mettelo Home',description:'Your personal Mettelo command centre for work, applications, Proof and what comes next.'};
export const dynamic='force-dynamic';

type Project={id?:string;slug?:string;title:string;status?:string;project_type?:string;project_domains?:{domains:{slug:string;name:string}|null}[];project_tools?:{tools:{slug:string;name:string}|null}[]};
type Application={id:string;status:string;updated_at:string;project_id:string;project_run_id:string|null;projects:Project|Project[]|null};
type Membership={id:string;team_role:string;membership_status:string;project_id:string;project_run_id:string|null;projects:Project|Project[]|null;project_runs:{status:string;run_number:number}|{status:string;run_number:number}[]|null};
type Task={id:string;title:string;status:string;due_at:string|null;blocker_reason:string|null;project_id:string;project_run_id:string|null;projects:{title:string}|{title:string}[]|null};
type Spotlight={id:string;status:string;consent_status:string};
type Preference={domains?:{slug:string;name:string}|null;tools?:{slug:string;name:string}|null};
type QueueItem={kind:'ACTION'|'UPDATE'|'CONSENT';title:string;text:string;href:string;symbol:string};
type StatusMeta={label:string;meaning:string;actionRequired:boolean};

function one<T>(value:T|T[]|null|undefined){return Array.isArray(value)?value[0]||null:value||null}
function dateLabel(value:string|null){if(!value)return null;return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(new Date(value))}
function labHref(projectId:string,runId:string|null){return `/member/projects/${projectId}${runId?`?run=${runId}`:''}`}
function applicationStatus(status:string):StatusMeta{
  if(status==='submitted')return{label:'Submitted',meaning:'Mettelo has your application. No action needed right now.',actionRequired:false};
  if(status==='shortlisted')return{label:'Shortlisted',meaning:'Your application has moved forward. Check Applications for any requested response.',actionRequired:false};
  if(['approved','accepted','waiting_for_team'].includes(status))return{label:'Team forming',meaning:'Your place is confirmed while Mettelo forms the remaining team. No action needed.',actionRequired:false};
  if(['started','active'].includes(status))return{label:'Started',meaning:'Your project is active. Continue the work in Mettelo Lab.',actionRequired:true};
  if(['rejected','not_selected'].includes(status))return{label:'Not selected',meaning:'This application will not move forward. Explore another project when you are ready.',actionRequired:false};
  return{label:status.replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase()),meaning:'Open Applications for the latest details.',actionRequired:false};
}

export default async function MemberHome(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/signin?next=/member');

  const [profileResult,appsResult,membersResult,proofResult,savedResult,savedProjectsResult,tasksResult,spotlightResult,identityResult,leadResult,domainPrefsResult,toolPrefsResult,recommendationProjectsResult]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',user.id).maybeSingle(),
    supabase.from('project_applications').select('id,status,updated_at,project_id,project_run_id,projects(id,title,status,project_type)',{count:'exact'}).eq('user_id',user.id).order('updated_at',{ascending:false}).limit(3),
    supabase.from('project_members').select('id,team_role,membership_status,project_id,project_run_id,projects(id,title,status,project_type),project_runs(status,run_number)').eq('user_id',user.id).in('membership_status',['waiting','active','completed']).order('joined_at',{ascending:false}),
    supabase.from('contributions').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('verification_status','verified'),
    supabase.from('saved_opportunities').select('opportunity_id',{count:'exact',head:true}).eq('user_id',user.id),
    supabase.from('saved_projects').select('project_id',{count:'exact',head:true}).eq('user_id',user.id),
    supabase.from('project_tasks').select('id,title,status,due_at,blocker_reason,project_id,project_run_id,projects(title)').eq('assignee_user_id',user.id).neq('status','done').order('due_at',{ascending:true,nullsFirst:false}).limit(8),
    supabase.from('spotlights').select('id,status,consent_status').eq('user_id',user.id).in('status',['draft','published','archived']).limit(4),
    supabase.from('account_identities').select('account_type').eq('user_id',user.id).maybeSingle(),
    supabase.from('project_members').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('team_role','project_lead').in('membership_status',['active','completed']),
    supabase.from('profile_domain_preferences').select('domains(slug,name)').eq('user_id',user.id),
    supabase.from('profile_tool_preferences').select('tools(slug,name)').eq('user_id',user.id),
    supabase.from('projects').select('id,slug,title,status,project_domains(domains(slug,name)),project_tools(tools(slug,name))').eq('visibility','public').in('status',['pilot','recruiting','open','forming']).order('created_at',{ascending:false}).limit(40)
  ]);

  const profile=profileResult.data||{};
  const applications=(appsResult.data||[]) as unknown as Application[];
  const memberships=(membersResult.data||[]) as unknown as Membership[];
  const tasks=(tasksResult.data||[]) as unknown as Task[];
  const spotlights=(spotlightResult.data||[]) as Spotlight[];
  const activeMemberships=memberships.filter(item=>item.membership_status==='active'&&(!one(item.project_runs)||one(item.project_runs)?.status==='active'));
  const waitingMemberships=memberships.filter(item=>item.membership_status==='waiting');
  const latestApplication=applications[0]||null;
  const latestApplicationMeta=latestApplication?applicationStatus(latestApplication.status):null;
  const pendingSpotlight=spotlights.find(item=>item.status==='draft'&&item.consent_status==='pending')||null;
  const isArchitect=identityResult.data?.account_type==='project_architect';
  const hasLead=Boolean(leadResult.count);

  const domainPrefs=((domainPrefsResult.data||[]) as unknown as Preference[]).map(item=>item.domains?.slug).filter((value):value is string=>Boolean(value));
  const toolPrefs=((toolPrefsResult.data||[]) as unknown as Preference[]).map(item=>item.tools?.slug).filter((value):value is string=>Boolean(value));
  const recommendationCount=((recommendationProjectsResult.data||[]) as unknown as Project[]).filter(project=>{
    const projectDomains=(project.project_domains||[]).map(item=>item.domains?.slug).filter((value):value is string=>Boolean(value));
    const projectTools=(project.project_tools||[]).map(item=>item.tools?.slug).filter((value):value is string=>Boolean(value));
    return projectDomains.some(slug=>domainPrefs.includes(slug))||projectTools.some(slug=>toolPrefs.includes(slug));
  }).length;
  const savedCount=(savedResult.count||0)+(savedProjectsResult.count||0);

  const name=profile.full_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Member';
  const firstName=String(name).trim().split(/\s+/)[0]||'Member';
  const profileChecks=[Boolean(profile.full_name),Boolean(profile.headline||profile.current_job_title||profile.professional_area),Boolean(Array.isArray(profile.skills)?profile.skills.length:profile.skills),Boolean(profile.project_availability)];
  const profilePercent=Math.round((profileChecks.filter(Boolean).length/profileChecks.length)*100);
  const profileReady=profilePercent===100;
  const now=Date.now();
  const overdueTask=tasks.find(task=>task.due_at&&new Date(task.due_at).getTime()<now);
  const blockedTask=tasks.find(task=>task.status==='blocked'||Boolean(task.blocker_reason));
  const nextTask=overdueTask||blockedTask||tasks[0]||null;
  const activeProject=activeMemberships[0]||null;
  const activeProjectData=activeProject?one(activeProject.projects):null;
  const activeRun=activeProject?one(activeProject.project_runs):null;
  const activeProjectTask=activeProject?tasks.find(task=>task.project_id===activeProject.project_id&&(!activeProject.project_run_id||task.project_run_id===activeProject.project_run_id))||null:null;

  const upNext=nextTask?{
    label:'Up next · Project work',
    title:overdueTask?.id===nextTask.id?`Resume overdue work: ${nextTask.title}`:blockedTask?.id===nextTask.id?`Resolve your blocker: ${nextTask.title}`:`Continue: ${nextTask.title}`,
    text:`${one(nextTask.projects)?.title||'Your active project'}${nextTask.due_at?` · due ${dateLabel(nextTask.due_at)}`:''}${nextTask.blocker_reason?` · blocker: ${nextTask.blocker_reason}`:''}`,
    href:labHref(nextTask.project_id,nextTask.project_run_id),cta:'Open Mettelo Lab'
  }:pendingSpotlight?{
    label:'Up next · Consent',title:'Review your Spotlight recognition',text:'Mettelo will not publish this recognition without your explicit permission.',href:'/member/spotlight',cta:'Review Spotlight'
  }:latestApplication&&latestApplicationMeta?.actionRequired?{
    label:'Up next · Application',title:`Continue ${one(latestApplication.projects)?.title||'your project'}`,text:latestApplicationMeta.meaning,href:labHref(latestApplication.project_id,latestApplication.project_run_id),cta:'Open Mettelo Lab'
  }:!profileReady?{
    label:'Up next · Profile',title:'Complete the details that improve matching',text:`Your profile is ${profilePercent}% complete. Add the next missing detail when you have a moment.`,href:'/member/profile',cta:'Complete profile'
  }:{
    label:'Up next · Explore',title:recommendationCount?'Review work matched to your profile':'Find your next practical project',text:recommendationCount?`${recommendationCount} current project${recommendationCount===1?' matches':'s match'} your selected domains or tools.`:'Browse current projects when you are ready for another commitment.',href:recommendationCount?'/member/recommended':'/member/discover',cta:recommendationCount?'See recommendations':'Discover projects'
  };

  const queue:QueueItem[]=[];
  if(!profileReady)queue.push({kind:'ACTION',title:'Complete your profile',text:`${profilePercent}% complete · stronger profile detail improves matching.`,href:'/member/profile',symbol:'○'});
  if(latestApplication&&latestApplicationMeta)queue.push({kind:'UPDATE',title:`${one(latestApplication.projects)?.title||'Project application'} · ${latestApplicationMeta.label}`,text:latestApplicationMeta.meaning,href:'/member/applications',symbol:'◎'});
  if(pendingSpotlight)queue.push({kind:'CONSENT',title:'Review Spotlight recognition',text:'Publication requires your explicit permission. Declining does not affect your account.',href:'/member/spotlight',symbol:'★'});

  const overview=[
    {label:'Active project',plural:'Active projects',value:activeMemberships.length,helper:activeMemberships.length?'Continue current work':'No active project right now',href:'/member/projects'},
    {label:'Application',plural:'Applications',value:appsResult.count||0,helper:waitingMemberships.length?`${waitingMemberships.length} team${waitingMemberships.length===1?' is':'s are'} forming`:'Track application history',href:'/member/applications'},
    {label:'Verified Proof',plural:'Verified Proof',value:proofResult.count||0,helper:(proofResult.count||0)?'Evidence you can reuse':'Build evidence through verified work',href:'/member/proof'},
    {label:'Saved',plural:'Saved',value:savedCount,helper:'Projects and opportunities retained for later',href:'/member/saved'},
    {label:'Recommendation',plural:'Recommendations',value:recommendationCount,helper:recommendationCount?'Matched to your profile':'Improve preferences for stronger matches',href:'/member/recommended'}
  ];

  return <section className={`${styles.home} memberWorkspace`} aria-labelledby="member-home-title"><div className={styles.wrap}>
    <header className={styles.hero}>
      <div><div className={styles.eyebrow}>MY METTELO · HOME</div><h1 id="member-home-title">Good to see you, {firstName}.</h1><p className={styles.heroText}>One place to resume your work, understand what needs attention, build verified Proof and find what comes next.</p></div>
      <aside className={styles.profileMini} aria-label="Profile readiness"><div className={styles.eyebrow}>PROFILE READINESS</div><strong><span>{profilePercent}% complete</span><span>{profileChecks.filter(Boolean).length} / {profileChecks.length}</span></strong><div className={styles.meter} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profilePercent} aria-label="Profile completeness"><span style={{width:`${profilePercent}%`}}/></div><Link href="/member/profile">{profileReady?'View profile':'Complete missing details'} →</Link></aside>
    </header>

    <section className={styles.priority} aria-label="Member priorities">
      <article className={styles.upNext}><div><div className={styles.eyebrow}>{upNext.label}</div><h2>{upNext.title}</h2><p>{upNext.text}</p>{nextTask&&<div className={styles.chips}><span>{nextTask.status.replaceAll('_',' ')}</span>{nextTask.due_at&&<span>Due {dateLabel(nextTask.due_at)}</span>}{nextTask.blocker_reason&&<span>Blocker recorded</span>}</div>}</div><div className={styles.actions}><Link className={`${styles.button} ${styles.buttonLight}`} href={upNext.href}>{upNext.cta} →</Link><Link className={`${styles.button} ${styles.buttonGhostDark}`} href="/member/projects">View projects</Link></div></article>
      <aside className={styles.needs}><div className={styles.eyebrow}>WHAT NEEDS YOU NOW</div><h2>Personal queue</h2>{queue.length?<div className={styles.needsList}>{queue.slice(0,3).map(item=><Link href={item.href} className={styles.needRow} key={`${item.kind}:${item.title}`}><span className={styles.needIcon} aria-hidden="true">{item.symbol}</span><span className={styles.needCopy}><strong>{item.title}</strong><small>{item.text}</small></span><b>{item.kind}</b></Link>)}</div>:<div className={styles.quiet}><strong>No required actions right now.</strong><p>Your current account and project state does not require attention.</p></div>}</aside>
    </section>

    <section className={styles.overview} aria-label="Member overview">{overview.map(item=><Link href={item.href} key={item.label} aria-label={`${item.value} ${item.value===1?item.label:item.plural}. ${item.helper}`}><b aria-hidden="true">→</b><strong>{item.value}</strong><span>{item.value===1?item.label:item.plural}</span><small>{item.helper}</small></Link>)}</section>

    <div className={styles.grid}>
      <div>
        <section className={styles.panel} aria-labelledby="continue-working-heading"><div className={styles.panelHead}><div><div className={styles.eyebrow}>MY PROJECTS</div><h2 id="continue-working-heading">Continue working</h2></div><Link className={styles.panelLink} href="/member/projects">View all projects →</Link></div>{activeProject&&activeProjectData?<article className={styles.project}><span className={styles.state}>● Active</span><h3>{activeProjectData.title}</h3><p>{activeProjectData.project_type==='partner'?'Partner Project':'Open Project'}{activeRun?.run_number?` · Team ${activeRun.run_number}`:''} · {activeProject.team_role.replaceAll('_',' ')}</p><div className={styles.nextWork}><small>NEXT STEP</small><strong>{activeProjectTask?.title||'Continue in Mettelo Lab'}</strong>{activeProjectTask?.due_at&&<span>Due {dateLabel(activeProjectTask.due_at)}</span>}</div><div className={styles.actions}><Link className={`${styles.button} ${styles.buttonDark}`} href={labHref(activeProject.project_id,activeProject.project_run_id)}>Open Mettelo Lab</Link><Link className={styles.button} href="/member/projects">Project details</Link></div></article>:<div className={styles.empty}><h3>No active project right now.</h3><p>{waitingMemberships.length?'Your confirmed place is still in team formation. Applications owns the full status.':'When a project starts, this is where you will resume its Mettelo Lab.'}</p><Link href={waitingMemberships.length?'/member/applications':'/member/discover'}>{waitingMemberships.length?'Track team formation':'Discover projects'} →</Link></div>}</section>

        <section className={styles.panel} aria-labelledby="queue-heading"><div className={styles.panelHead}><div><div className={styles.eyebrow}>PERSONAL QUEUE</div><h2 id="queue-heading">Actions & meaningful updates</h2></div>{queue.length>0&&<span>{queue.length} item{queue.length===1?'':'s'}</span>}</div>{queue.length?<div className={styles.queue}>{queue.map(item=><Link className={styles.queueRow} href={item.href} key={`${item.kind}:${item.title}`}><span className={styles.queueIcon} aria-hidden="true">{item.symbol}</span><span className={styles.queueCopy}><strong>{item.title}</strong><small>{item.text}</small></span><b className={`${styles.queueKind} ${item.kind==='ACTION'?styles.actionKind:item.kind==='CONSENT'?styles.consentKind:''}`}>{item.kind}</b></Link>)}</div>:<div className={`${styles.empty} ${styles.emptyCompact}`}><h3>You are up to date.</h3><p>No profile, application or recognition action currently needs you.</p></div>}</section>

        {(hasLead||isArchitect)&&<section className={styles.roleHub} aria-labelledby="role-tools-heading"><div className={styles.eyebrow}>ROLE TOOLS · ONLY WHEN ASSIGNED</div><h2 id="role-tools-heading">Your additional Mettelo responsibilities</h2><p>Role-specific work stays available without cluttering the core member journey.</p><div className={styles.roleLinks}>{hasLead&&<Link href="/member/project-lead"><span><strong>Project Lead workspace</strong><small>Delivery health · blockers · evidence · completion</small></span><b aria-hidden="true">→</b></Link>}{isArchitect&&<Link href="/member/architect-projects"><span><strong>Project Architect workspace</strong><small>Shape, review and govern assigned projects</small></span><b aria-hidden="true">→</b></Link>}</div></section>}
      </div>

      <aside>
        <section className={styles.panel} aria-labelledby="application-heading"><div className={styles.panelHead}><div><div className={styles.eyebrow}>APPLICATIONS</div><h2 id="application-heading">Latest status</h2></div><Link className={styles.panelLink} href="/member/applications">View all →</Link></div>{latestApplication&&latestApplicationMeta?<article className={styles.application}><span className={styles.applicationState}>{latestApplicationMeta.label.toUpperCase()}</span><h3>{one(latestApplication.projects)?.title||'Project application'}</h3><p>{latestApplicationMeta.meaning}</p><div className={styles.actions}><Link className={styles.button} href="/member/applications">View applications →</Link></div></article>:<div className={`${styles.empty} ${styles.emptyCompact}`}><h3>No applications yet.</h3><p>Discover a project and apply when the fit is right.</p><Link href="/member/discover">Discover projects →</Link></div>}</section>
        <section className={`${styles.valueCard} ${styles.proof}`} aria-labelledby="proof-heading"><div className={styles.eyebrow}>PROOF</div><div className={styles.proofValue}>{proofResult.count||0} verified</div><h2 id="proof-heading">Evidence that travels with you</h2><p>Verified project contributions become a reusable record of what you have actually done.</p><Link className={styles.button} href="/member/proof">Open Proof →</Link></section>
        {pendingSpotlight&&<section className={`${styles.valueCard} ${styles.spotlight}`} aria-labelledby="spotlight-heading"><div className={styles.eyebrow}>SPOTLIGHT · REPUTATION</div><span className={styles.consent}>CONSENT REQUIRED</span><h2 id="spotlight-heading">Recognition waiting for your review</h2><p>Mettelo never publishes your Spotlight recognition without your explicit permission. Declining does not affect your account.</p><Link className={styles.button} href="/member/spotlight">Review Spotlight →</Link></section>}
      </aside>

      <section className={styles.mobileJourney} aria-labelledby="mobile-more-heading"><div className={styles.eyebrow}>MORE OF MY METTELO</div><h2 id="mobile-more-heading">Everything remains reachable</h2><div>{mobileMoreNav.map(item=><Link href={item.href} key={item.href}><strong>{item.label}</strong><small>{item.description}</small></Link>)}</div></section>

      <section className={styles.explore} aria-labelledby="explore-grow-heading"><div><div className={styles.eyebrow}>EXPLORE & GROW</div><h2 id="explore-grow-heading">Your next opportunity should fit where you’re going.</h2><p>Browse projects, use profile-matched recommendations, explore jobs and internships, or return to something you saved.</p></div><div className={exploreStyles.actions}><Link className={exploreStyles.primary} href="/member/discover">Explore projects <span aria-hidden="true">→</span></Link><Link className={exploreStyles.secondary} href="/member/recommended">Recommended</Link><Link className={exploreStyles.secondary} href="/opportunities">Opportunities</Link><Link className={`${exploreStyles.secondary} ${exploreStyles.secondaryLast}`} href="/member/saved">Saved</Link></div></section>
    </div>
  </div></section>;
}
