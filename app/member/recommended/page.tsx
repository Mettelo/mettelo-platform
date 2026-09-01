import Link from 'next/link';
import {redirect} from 'next/navigation';
import SaveProjectButton from '@/components/SaveProjectButton';
import {serviceDb} from '@/lib/project-flow';
import {calculateMemberReadiness} from '@/lib/member-readiness';
import {memberProjectCatalogueAction,memberProjectStateLabel,projectAcceptsApplications,resolveMemberProjectState} from '@/lib/member-project-journey';
import {eventRecommendationEligible,projectRecommendationEligible,projectRecommendationReason,recommendationRank,sortRecommendations,spotlightRecommendationEligible,textRecommendationReason,type RecommendationKind,type RecommendationProfile,type RecommendationReason} from '@/lib/member-recommendations';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import styles from './recommended.module.css';

export const dynamic='force-dynamic';

type Taxonomy={slug:string;name:string};
type DomainPref={domains:Taxonomy|null};
type ToolPref={tools:Taxonomy|null};
type Role={id:string;title:string;skills:string[]|null;openings:number};
type Project={
  id:string;title:string;summary:string;status:string;project_type:string|null;applications_open:boolean|null;application_deadline:string|null;
  location:string|null;location_type:string|null;duration_weeks:number|null;weekly_commitment:string|null;
  project_roles:Role[]|null;project_domains:{domains:Taxonomy|null}[]|null;project_tools:{tools:Taxonomy|null}[]|null;
};
type Application={id:string;project_id:string;status:string;project_run_id:string|null};
type Membership={project_id:string;project_run_id:string|null;membership_status:string;project_runs:{status:string}|null};
type Saved={project_id:string};
type CapacityRow={project_id:string;project_role_id:string|null};
type EventItem={id:string;slug:string;title:string;event_type:string;summary:string|null;description:string|null;starts_at:string;timezone:string;delivery_mode:string;location_label:string|null;status:string};
type SpotlightItem={id:string;title:string;category:string;summary:string;published_at:string|null;status:string;is_excluded:boolean;consent_status:string};
type CardItem={
  id:string;kind:RecommendationKind;title:string;summary:string;reason:RecommendationReason;rank:number;href:string;actionLabel:string;meta:string[];
  saved?:boolean;stateLabel?:string;
};

function titleCase(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase())}
function workingModel(project:Project){return project.location_type?titleCase(project.location_type):project.location||null}
function dateLabel(value:string){return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value))}
function timeLabel(value:string){return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(value))}
function keyOf(item:CardItem){return `${item.kind}:${item.id}`}

function RecommendationCard({item,featured=false}:{item:CardItem;featured?:boolean}){
  const articleClass=featured?styles.pickCard:`${styles.recommendCard} ${item.kind==='event'?styles.eventCard:item.kind==='spotlight'?styles.spotlightCard:''}`;
  const body=<div className={styles.recommendMain}>
    <div className={`${styles.typeLabel} ${styles[item.kind]}`}>{item.kind.toUpperCase()}</div>
    <h3>{item.title}</h3>
    <p>{item.summary}</p>
    {item.stateLabel&&<div className={styles.stateLabel}>{item.stateLabel}</div>}
    <div className={styles.reason}><strong>Why this is recommended</strong><p>{item.reason.copy}</p></div>
    {item.meta.length>0&&<div className={styles.metaRow}>{item.meta.map(value=><span className={styles.meta} key={value}>{value}</span>)}</div>}
  </div>;
  const actions=<div className={featured?styles.actions:styles.recommendActions}>
    <Link className={`${styles.button} ${styles.primary}`} href={item.href}>{item.actionLabel}</Link>
    {item.kind==='project'&&<div className={styles.saveWrap}><SaveProjectButton projectId={item.id} initialSaved={Boolean(item.saved)} compact/></div>}
  </div>;
  return <article className={articleClass}>{body}{actions}</article>;
}

export default async function RecommendedPage(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/signin?next=%2Fmember%2Frecommended');
  const now=Date.now();const nowIso=new Date(now).toISOString();

  const [profileResult,domainPrefsResult,toolPrefsResult,projectsResult,applicationsResult,membershipsResult,savedResult,eventsResult,spotlightsResult]=await Promise.all([
    supabase.from('profiles').select('full_name,headline,current_job_title,professional_area,bio,location,experience_level,employment_status,project_availability,weekly_capacity,primary_goal,linkedin_url,github_url,portfolio_url,skills,preferred_roles').eq('id',user.id).maybeSingle(),
    supabase.from('profile_domain_preferences').select('domains(slug,name)').eq('user_id',user.id),
    supabase.from('profile_tool_preferences').select('tools(slug,name)').eq('user_id',user.id),
    supabase.from('projects').select('id,title,summary,status,project_type,applications_open,application_deadline,location,location_type,duration_weeks,weekly_commitment,project_roles(id,title,skills,openings),project_domains(domains(slug,name)),project_tools(tools(slug,name))').in('visibility',['public','members']).in('status',['pilot','recruiting','open','forming','active','review','completed']).order('created_at',{ascending:false}).limit(200),
    supabase.from('project_applications').select('id,project_id,status,project_run_id').eq('user_id',user.id).eq('application_kind','application').order('submitted_at',{ascending:false}),
    supabase.from('project_members').select('project_id,project_run_id,membership_status,project_runs(status)').eq('user_id',user.id).in('membership_status',['waiting','active','completed']),
    supabase.from('saved_projects').select('project_id').eq('user_id',user.id),
    supabase.from('events').select('id,slug,title,event_type,summary,description,starts_at,timezone,delivery_mode,location_label,status').eq('status','published').gte('starts_at',nowIso).order('starts_at',{ascending:true}).limit(40),
    supabase.from('spotlights').select('id,title,category,summary,published_at,status,is_excluded,consent_status').eq('status','published').eq('is_excluded',false).eq('consent_status','granted').order('published_at',{ascending:false}).limit(30)
  ]);

  const profileRow=profileResult.data as Record<string,unknown>|null;
  const domainPrefs=((domainPrefsResult.data||[]) as unknown as DomainPref[]).flatMap(row=>row.domains?[row.domains]:[]);
  const toolPrefs=((toolPrefsResult.data||[]) as unknown as ToolPref[]).flatMap(row=>row.tools?[row.tools]:[]);
  const profile:RecommendationProfile={
    skills:Array.isArray(profileRow?.skills)?profileRow.skills.filter((value):value is string=>typeof value==='string'&&Boolean(value.trim())):[],
    preferredRoles:Array.isArray(profileRow?.preferred_roles)?profileRow.preferred_roles.filter((value):value is string=>typeof value==='string'&&Boolean(value.trim())):[],
    domains:domainPrefs,
    tools:toolPrefs
  };
  const memberReadiness=calculateMemberReadiness({profile:profileRow||{},domainCount:domainPrefs.length,toolCount:toolPrefs.length});
  const applicationReady=memberReadiness.applicationReadiness.ready;
  const matchingReady=memberReadiness.matchingReadiness.ready;
  const matchingMissing=memberReadiness.matchingReadiness.missing;

  const applications=(applicationsResult.data||[]) as unknown as Application[];const memberships=(membershipsResult.data||[]) as unknown as Membership[];
  const latestApplication=new Map<string,Application>();for(const item of applications){if(!latestApplication.has(item.project_id))latestApplication.set(item.project_id,item)}
  const membershipByProject=new Map(memberships.map(item=>[item.project_id,item]));
  const savedProjects=new Set(((savedResult.data||[]) as Saved[]).map(item=>item.project_id));
  const projects=(projectsResult.data||[]) as unknown as Project[];

  const db=serviceDb();let capacityRows:CapacityRow[]=[];let availabilityKnown=false;
  if(db&&projects.length){
    const capacityResult=await db.from('project_members').select('project_id,project_role_id').in('project_id',projects.map(item=>item.id)).in('membership_status',['waiting','active']);
    if(!capacityResult.error){capacityRows=(capacityResult.data||[]) as CapacityRow[];availabilityKnown=true}
  }
  const filledByRole=new Map<string,number>();for(const row of capacityRows){if(row.project_role_id)filledByRole.set(row.project_role_id,(filledByRole.get(row.project_role_id)||0)+1)}

  const projectCards:CardItem[]=projects.flatMap(project=>{
    const roles=project.project_roles||[];const availableRoles=roles.filter(role=>availabilityKnown?((filledByRole.get(role.id)||0)<role.openings):false);
    const application=latestApplication.get(project.id)||null;const membership=membershipByProject.get(project.id)||null;const relationship=Boolean(application&&!['declined','withdrawn'].includes(application.status)||membership);const discoverablePilot=project.status==='pilot';
    if(!relationship&&!discoverablePilot&&(!projectAcceptsApplications(project,now)||!availabilityKnown||availableRoles.length===0))return [];
    const state=resolveMemberProjectState({project,application,membership,run:membership?.project_runs||null,applicationReady,hasAvailableRole:availableRoles.length>0,roleAvailabilityKnown:availabilityKnown,now});
    if(!discoverablePilot&&!projectRecommendationEligible(state))return [];
    const displayRoles=relationship?roles:projectAcceptsApplications(project,now)&&availabilityKnown?availableRoles:roles;const roleTitles=displayRoles.map(role=>role.title);const roleSkills=[...new Set(displayRoles.flatMap(role=>role.skills||[]).filter(Boolean))];
    const domainSlugs=(project.project_domains||[]).flatMap(row=>row.domains?[row.domains.slug]:[]);const toolSlugs=(project.project_tools||[]).flatMap(row=>row.tools?[row.tools.slug]:[]);
    const reason=projectRecommendationReason(profile,{state,saved:savedProjects.has(project.id),roleTitles,roleSkills,domainSlugs,toolSlugs});if(!reason)return [];
    const action=memberProjectCatalogueAction(state,project.id);const meta=[workingModel(project),project.weekly_commitment,roleTitles[0],project.application_deadline?`Closes ${dateLabel(project.application_deadline)}`:null].filter((value):value is string=>Boolean(value));
    return [{id:project.id,kind:'project' as const,title:project.title,summary:project.summary,reason,rank:recommendationRank({kind:'project',reason,date:project.application_deadline,now}),href:action.href,actionLabel:action.label,meta,saved:savedProjects.has(project.id),stateLabel:state==='open_eligible'||state==='ineligible'?undefined:memberProjectStateLabel(state)}];
  });

  const eventCards:CardItem[]=((eventsResult.data||[]) as EventItem[]).flatMap(event=>{
    if(!eventRecommendationEligible({status:event.status,startsAt:event.starts_at,slug:event.slug,now}))return [];
    const reason=textRecommendationReason(profile,{title:event.title,summary:event.summary,description:event.description});if(!reason)return [];
    const meta=[titleCase(event.delivery_mode),dateLabel(event.starts_at),timeLabel(event.starts_at),event.location_label].filter((value):value is string=>Boolean(value));
    return [{id:event.id,kind:'event' as const,title:event.title,summary:event.summary||event.description||'Open the event details for the confirmed session information.',reason,rank:recommendationRank({kind:'event',reason,date:event.starts_at,now}),href:`/events/${event.slug}`,actionLabel:'View event',meta}];
  });
  const spotlightCards:CardItem[]=((spotlightsResult.data||[]) as SpotlightItem[]).flatMap(item=>{
    if(!spotlightRecommendationEligible({status:item.status,isExcluded:item.is_excluded,consentStatus:item.consent_status,id:item.id}))return [];
    const reason=textRecommendationReason(profile,{title:item.title,summary:item.summary});if(!reason)return [];
    const meta=[item.category?titleCase(item.category):null,item.published_at?`Published ${dateLabel(item.published_at)}`:null].filter((value):value is string=>Boolean(value));
    return [{id:item.id,kind:'spotlight' as const,title:item.title,summary:item.summary,reason,rank:recommendationRank({kind:'spotlight',reason,date:item.published_at,now}),href:`/spotlight/${item.id}`,actionLabel:'View Spotlight',meta}];
  });

  const all=sortRecommendations([...projectCards,...eventCards,...spotlightCards]);const topPicks=all.slice(0,3);const topKeys=new Set(topPicks.map(keyOf));
  const remainingProjects=projectCards.filter(item=>!topKeys.has(keyOf(item))).slice(0,4);const remainingEvents=eventCards.filter(item=>!topKeys.has(keyOf(item))).slice(0,4);const remainingSpotlights=spotlightCards.filter(item=>!topKeys.has(keyOf(item))).slice(0,2);
  const profileUnavailable=Boolean(profileResult.error);const categoryErrors=[projectsResult.error?'Projects':null,eventsResult.error?'Events':null,spotlightsResult.error?'Spotlight':null].filter((value):value is string=>Boolean(value));

  return <div className={styles.page}>
    <header className={styles.hero}>
      <div><div className={styles.eyebrow}>PERSONALISED · RELEVANCE</div><h1>Recommended for you</h1><p>Projects, events and member opportunities that may be useful to you right now — with a simple explanation of why each one is relevant.</p></div>
      <Link className={styles.button} href="/member/discover">Browse Discover</Link>
    </header>

    <section className={styles.contextCard} aria-label="Recommendation context"><div className={styles.contextIcon} aria-hidden="true">Me</div><div><strong>{matchingReady?'Your matching profile is ready':`${matchingMissing.length} matching requirement${matchingMissing.length===1?'':'s'} remaining`}</strong><p>{matchingReady?'Skills, project interests and preferred roles give Mettelo enough context to make useful recommendations.':matchingMissing.map(item=>item.label).join(' ')}</p></div><Link className={styles.button} href="/member/profile">Update profile</Link></section>

    {profileUnavailable?<section className={styles.empty} role="alert"><h2>We couldn&apos;t load your recommendations</h2><p>Your profile signals are temporarily unavailable, so Mettelo will not guess what is relevant.</p><div className={styles.emptyActions}><Link className={`${styles.button} ${styles.primary}`} href="/member/recommended">Try again</Link><Link className={styles.button} href="/member/discover">Browse Discover</Link></div></section>:all.length?<>
      <section className={styles.section} aria-labelledby="top-picks-heading"><div className={styles.sectionHead}><div><div className={styles.eyebrow}>TOP PICKS</div><h2 id="top-picks-heading">Most relevant right now</h2><p>A small mix of things worth looking at first.</p></div></div><div className={styles.topGrid}>{topPicks.map(item=><RecommendationCard item={item} featured key={keyOf(item)}/>)}</div></section>
      {remainingProjects.length>0&&<section className={styles.section} aria-labelledby="projects-for-you-heading"><div className={styles.sectionHead}><div><div className={styles.eyebrow}>PROJECTS</div><h2 id="projects-for-you-heading">Projects for you</h2><p>Relevant projects, without turning Recommended into another Discover catalogue.</p></div><Link href="/member/discover">View all projects →</Link></div><div className={styles.list}>{remainingProjects.map(item=><RecommendationCard item={item} key={keyOf(item)}/>)}</div></section>}
      {remainingEvents.length>0&&<section className={styles.section} aria-labelledby="events-for-you-heading"><div className={styles.sectionHead}><div><div className={styles.eyebrow}>EVENTS</div><h2 id="events-for-you-heading">Events you may like</h2><p>Relevant upcoming Mettelo events.</p></div><Link href="/events">View all events →</Link></div><div className={styles.list}>{remainingEvents.map(item=><RecommendationCard item={item} key={keyOf(item)}/>)}</div></section>}
      {remainingSpotlights.length>0&&<section className={styles.section} aria-labelledby="spotlight-for-you-heading"><div className={styles.sectionHead}><div><div className={styles.eyebrow}>FROM THE COMMUNITY</div><h2 id="spotlight-for-you-heading">Worth a look</h2><p>Published recognition and stories related to what you&apos;ve shared.</p></div><Link href="/spotlight">View Spotlight →</Link></div><div className={styles.list}>{remainingSpotlights.map(item=><RecommendationCard item={item} key={keyOf(item)}/>)}</div></section>}
    </>:categoryErrors.length?<section className={styles.empty} role="alert"><h2>We couldn&apos;t load your recommendations</h2><p>One or more recommendation sources are temporarily unavailable. Mettelo will not replace missing data with guesses.</p><div className={styles.emptyActions}><Link className={`${styles.button} ${styles.primary}`} href="/member/recommended">Try again</Link><Link className={styles.button} href="/member/discover">Browse Discover</Link></div></section>:<section className={styles.empty}><h2>We&apos;re still learning what&apos;s relevant to you</h2><p>Add your interests, preferred project roles and skills to help Mettelo make better recommendations. If nothing eligible is live, Discover remains the broader project catalogue.</p><div className={styles.emptyActions}><Link className={`${styles.button} ${styles.primary}`} href="/member/profile">Update profile</Link><Link className={styles.button} href="/member/discover">Browse Discover</Link></div></section>}

    {all.length>0&&categoryErrors.length>0&&<section className={styles.errors} aria-label="Recommendation source status">{categoryErrors.map(name=><article className={styles.localError} role="status" key={name}><h2>{name} recommendations are temporarily unavailable</h2><p>Other recommendations remain usable. Refresh later to retry this source.</p></article>)}</section>}

    <section className={styles.improve}><div><div className={styles.eyebrow}>IMPROVE YOUR RECOMMENDATIONS</div><h2>Keep your preferences useful</h2><p>Update skills, project interests, preferred roles and availability when they change. Recommended uses only signals you have actually shared with Mettelo.</p></div><Link className={`${styles.button} ${styles.primary}`} href="/member/profile">Update profile</Link></section>
    <span className={styles.srOnly}>Employment and recruitment records are not included in Recommended.</span>
  </div>;
}