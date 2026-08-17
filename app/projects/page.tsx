import type {Metadata} from 'next';
import SubmissionForm from '@/components/SubmissionForm';
import PaginatedCardGrid from '@/components/PaginatedCardGrid';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import './projects.css';

export const metadata:Metadata={
  title:'Real-world Technology Projects',
  description:'Build technical and professional capability through structured technology, data and AI projects on Mettelo.'
};
export const dynamic='force-dynamic';

type Role={id:string;title:string;discipline:string|null;openings:number};
type TaxonomyRef={slug:string;name:string};
type Run={id:string;run_number:number;status:string;completed_at:string|null};
type Project={id:string;slug:string;title:string;summary:string;status:string;project_type:string;partner_name:string|null;location:string|null;location_type:string|null;difficulty_level:string|null;duration_weeks:number|null;weekly_commitment:string|null;application_deadline:string|null;github_url:string|null;project_roles?:Role[];project_runs?:Run[];project_domains?:{is_primary:boolean;domains:TaxonomyRef|null}[];project_tools?:{tools:TaxonomyRef|null}[];project_methods?:{methods:TaxonomyRef|null}[]};
type Search={q?:string|string[];domain?:string|string[];tool?:string|string[];level?:string|string[];status?:string|string[];type?:string|string[];quick?:string|string[];interest?:string|string[]};

function one(value:string|string[]|undefined){return Array.isArray(value)?value[0]||'':value||''}
function titleCase(value:string){return value.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function statusLabel(status:string){return status==='pilot'?'PILOT — REGISTERING INTEREST':status==='recruiting'||status==='open'?'OPEN — APPLICATIONS AVAILABLE':status==='forming'?'TEAM FORMING — SELECTING CONTRIBUTORS':status==='active'?'ACTIVE — WORK UNDERWAY':status==='review'?'IN REVIEW — CONTRIBUTIONS BEING REVIEWED':status==='completed'?'COMPLETED — PROJECT FINISHED':status.toUpperCase()}
function projectHref(filters:Record<string,string>){const params=new URLSearchParams();Object.entries(filters).forEach(([key,value])=>{if(value)params.set(key,value)});const query=params.toString();return `/projects${query?`?${query}`:''}#projects`}

export default async function ProjectsPage({searchParams}:{searchParams?:Promise<Search>}){
  const params=await searchParams||{};
  const q=one(params.q).trim();
  const domain=one(params.domain),tool=one(params.tool),level=one(params.level),statusFilter=one(params.status),typeFilter=one(params.type),quick=one(params.quick),selectedInterestId=one(params.interest);
  const supabase=createPublicSupabaseClient();
  let projects:Project[]=[];let domains:TaxonomyRef[]=[];let tools:TaxonomyRef[]=[];let loadError=false;

  if(supabase){
    const [projectResult,domainResult,toolResult]=await Promise.all([
      supabase.from('projects').select('id,slug,title,summary,status,project_type,partner_name,location,location_type,difficulty_level,duration_weeks,weekly_commitment,application_deadline,github_url,project_roles(id,title,discipline,openings),project_runs(id,run_number,status,completed_at),project_domains(is_primary,domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))').in('status',['pilot','recruiting','open','forming','active','review','completed']).eq('visibility','public').order('created_at',{ascending:false}),
      supabase.from('domains').select('slug,name').eq('is_active',true).order('sort_order'),
      supabase.from('tools').select('slug,name').eq('is_active',true).order('sort_order')
    ]);
    if(projectResult.error)loadError=true;else projects=(projectResult.data||[]) as unknown as Project[];
    domains=(domainResult.data||[]) as TaxonomyRef[];tools=(toolResult.data||[]) as TaxonomyRef[];
  }else loadError=true;

  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  const normalisedQuery=q.toLowerCase();
  const filtered=projects.filter(p=>{
    const searchable=[p.title,p.summary,p.partner_name,p.location,...(p.project_roles||[]).flatMap(r=>[r.title,r.discipline]),...(p.project_domains||[]).map(x=>x.domains?.name),...(p.project_tools||[]).map(x=>x.tools?.name),...(p.project_methods||[]).map(x=>x.methods?.name)].filter(Boolean).join(' ').toLowerCase();
    const quickMatch=quick==='open'?['recruiting','open','forming'].includes(p.status):quick==='entry'?p.difficulty_level==='entry':quick==='remote'?p.location_type==='remote':true;
    return (!normalisedQuery||searchable.includes(normalisedQuery))&&quickMatch&&(!typeFilter||p.project_type===typeFilter)&&(!domain||p.project_domains?.some(x=>x.domains?.slug===domain))&&(!tool||p.project_tools?.some(x=>x.tools?.slug===tool))&&(!level||p.difficulty_level===level)&&(!statusFilter||p.status===statusFilter);
  });
  const hasFilters=Boolean(q||quick||typeFilter||domain||tool||level||statusFilter);
  const pilotProjects=projects.filter(p=>p.status==='pilot').map(p=>({id:p.id,title:p.title}));
  const selectedPilot=pilotProjects.find(p=>p.id===selectedInterestId)||null;
  const interestDestination=(id:string)=>{const target=`/projects?interest=${encodeURIComponent(id)}#interest`;return user?target:`/signin?next=${encodeURIComponent(target)}`};

  return <>
    <section className="projectsHero" aria-labelledby="projects-page-title">
      <div className="shell projectsHeroInner">
        <div className="projectsHeroCopy">
          <div className="eyebrow">REAL-WORLD TECHNOLOGY PROJECTS</div>
          <h1 id="projects-page-title">Build capability by doing the work.</h1>
          <p>Join structured projects across technology, data and AI. Work with a team, solve real problems, contribute to meaningful outcomes and build evidence of what you can actually do.</p>
          <div className="actions"><a className="button dark" href="#projects">Explore projects →</a><a className="button ghost" href="#how-projects-work">See how it works</a></div>
        </div>
        <aside className="projectsHeroSignal" aria-label="What Mettelo projects develop"><strong>Real work builds more than technical skill.</strong><p>Projects put collaboration, communication, ownership and judgement into practice alongside the tools.</p></aside>
      </div>
    </section>

    <section className="projectsPathways" aria-labelledby="project-pathways-title">
      <div className="shell">
        <div className="projectsSectionIntro compactIntro"><div className="eyebrow">TWO WAYS TO BUILD</div><h2 id="project-pathways-title">Work on a real challenge. Choose the format that fits.</h2><p>Mettelo projects are designed around practical contribution, not passive learning.</p></div>
        <div className="projectPathwayGrid">
          <article><span className="projectPathwayIndex">01</span><div><h3>Partner Projects</h3><p>Work from a defined challenge brought by a company, startup, nonprofit, public body or partner. Contribute in a specific role and help deliver an outcome that matters.</p><a href={projectHref({type:'partner'})}>Explore Partner Projects →</a></div></article>
          <article><span className="projectPathwayIndex">02</span><div><h3>Open Projects</h3><p>Join a repeatable Mettelo brief, take ownership of real tasks and build capability with a team through structured contribution.</p><a href={projectHref({type:'open'})}>Explore Open Projects →</a></div></article>
        </div>
      </div>
    </section>

    <section className="projectsHow" id="how-projects-work" aria-labelledby="projects-how-title">
      <div className="shell">
        <div className="projectsSectionIntro"><div className="eyebrow">HOW PROJECTS WORK</div><h2 id="projects-how-title">From interest to evidence.</h2><p>You do not build capability by watching from the sidelines. Mettelo projects move you from participation to visible contribution.</p></div>
        <ol className="projectJourney">
          <li><span>01</span><h3>Choose a project</h3><p>Find a problem that matches the area where you want to build or demonstrate capability.</p></li>
          <li><span>02</span><h3>Join in a defined role</h3><p>Apply for a contribution area with clear expectations and responsibilities.</p></li>
          <li><span>03</span><h3>Do the work</h3><p>Collaborate, complete real tasks and help move the project towards a useful outcome.</p></li>
          <li><span>04</span><h3>Build Proof</h3><p>Your reviewed contribution can become evidence connected to the work you actually did.</p></li>
        </ol>
      </div>
    </section>

    <section className="projectsDiscovery" id="projects" aria-labelledby="projects-discovery-title">
      <div className="shell">
        <div className="projectsSectionIntro discoveryIntro"><div><div className="eyebrow">DISCOVER PROJECTS</div><h2 id="projects-discovery-title">Find work worth contributing to.</h2></div><p>Review the problem, available roles, time commitment, tools and current stage before you decide to join.</p></div>

        <form className="projectsSearchPanel" method="get" action="/projects#projects">
          <div className="projectsSearchMain"><label htmlFor="project-search">Search projects</label><div className="projectsSearchField"><span aria-hidden="true">⌕</span><input id="project-search" name="q" defaultValue={q} placeholder="Project, role, skill, tool or domain" autoComplete="off"/></div></div>
          <details className="projectsQuickFilters">
            <summary><span>Quick filters</span><span>{quick?titleCase(quick):'Open now, entry level, remote'}</span></summary>
            <div className="projectsQuickFilterOptions" role="group" aria-label="Quick project filters">
              <a className={quick==='open'?'isActive':''} aria-current={quick==='open'?'true':undefined} href={projectHref({q,quick:'open'})}>Open now</a>
              <a className={quick==='entry'?'isActive':''} aria-current={quick==='entry'?'true':undefined} href={projectHref({q,quick:'entry'})}>Entry level</a>
              <a className={quick==='remote'?'isActive':''} aria-current={quick==='remote'?'true':undefined} href={projectHref({q,quick:'remote'})}>Remote</a>
            </div>
          </details>
          <details className="projectsAdvancedFilters">
            <summary><span>Filters</span><span>Type, domain, tool, level, stage</span></summary>
            <div className="projectFilterPanel">
              <div><label htmlFor="type-filter">Project type</label><select id="type-filter" name="type" defaultValue={typeFilter}><option value="">All projects</option><option value="partner">Partner Projects</option><option value="open">Open Projects</option></select></div>
              <div><label htmlFor="domain-filter">Domain</label><select id="domain-filter" name="domain" defaultValue={domain}><option value="">All domains</option>{domains.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}</select></div>
              <div><label htmlFor="tool-filter">Tool</label><select id="tool-filter" name="tool" defaultValue={tool}><option value="">All tools</option>{tools.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}</select></div>
              <div><label htmlFor="level-filter">Level</label><select id="level-filter" name="level" defaultValue={level}><option value="">All levels</option><option value="entry">Entry</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
              <div><label htmlFor="status-filter">Stage</label><select id="status-filter" name="status" defaultValue={statusFilter}><option value="">All stages</option><option value="pilot">Pilot</option><option value="open">Open</option><option value="forming">Team forming</option><option value="active">Active</option><option value="review">Review</option><option value="completed">Completed</option></select></div>
              {q&&<input type="hidden" name="q" value={q}/>} {quick&&<input type="hidden" name="quick" value={quick}/>} 
              <div className="projectFilterActions"><button className="button dark" type="submit">Apply filters</button>{hasFilters&&<a className="button ghost" href="/projects#projects">Clear all</a>}</div>
            </div>
          </details>
        </form>

        <div className="projectResultsSummary" aria-live="polite"><div><strong>{filtered.length} project{filtered.length===1?'':'s'} available</strong><span>{hasFilters?'Results reflect your current search and filters.':'Explore current public projects and their contribution needs.'}</span></div>{hasFilters&&<a href="/projects#projects">Clear all filters</a>}</div>

        {loadError?<div className="emptyState panel"><h3>Projects are unavailable right now.</h3><p>Please try again later.</p></div>:filtered.length?<PaginatedCardGrid label="projects" className="projectGrid projectBriefGrid">{filtered.map(p=>{
          const primary=p.project_domains?.find(x=>x.is_primary)?.domains||p.project_domains?.[0]?.domains;
          const projectTools=(p.project_tools||[]).map(x=>x.tools).filter(Boolean) as TaxonomyRef[];
          const methods=(p.project_methods||[]).map(x=>x.methods).filter(Boolean) as TaxonomyRef[];
          const workWith=[primary,...projectTools,...methods].filter((item):item is TaxonomyRef=>Boolean(item)).filter((item,index,items)=>items.findIndex(candidate=>candidate.slug===item.slug)===index);
          const visibleWorkWith=workWith.slice(0,3);
          const remainingWorkWith=Math.max(0,workWith.length-visibleWorkWith.length);
          const roles=p.project_roles||[];
          const roleCount=roles.length;
          const runs=p.project_runs||[];const completed=runs.filter(r=>r.status==='completed').length;const active=runs.filter(r=>r.status==='active').length;const forming=runs.filter(r=>r.status==='forming').length;
          const isPilot=p.status==='pilot';const deadline=p.application_deadline?new Date(p.application_deadline):null;const deadlinePassed=deadline?deadline.getTime()<Date.now():false;const statusAccepting=p.project_type==='open'?!['pilot','completed','archived','cancelled'].includes(p.status):['recruiting','open','forming'].includes(p.status);const accepting=statusAccepting&&roleCount>0&&!deadlinePassed;
          const availabilityCopy=isPilot?'This brief is still being shaped. Register your interest and tell us where you could contribute.':accepting?'Applications are available. Review the full brief before you apply.':statusAccepting&&roleCount===0?'Roles are still being prepared. Review the brief and check back before applying.':deadlinePassed&&statusAccepting?'The application deadline has passed. You can still review the brief and current project stage.':'Review the brief and current project stage.';
          return <article className={`projectBriefCard projectType-${p.project_type}`} key={p.id}>
            <header className="projectBriefHeader"><div className="projectBriefStatus"><span>{p.project_type==='partner'?'PARTNER PROJECT':'OPEN PROJECT'}</span><span>{statusLabel(p.status)}</span></div>{p.project_type==='partner'&&p.partner_name&&<p className="projectPartner">In partnership with <strong>{p.partner_name}</strong></p>}<h3><a href={`/projects/${p.id}`}>{p.title}</a></h3><p className="projectBriefSummary">{p.summary}</p></header>
            <div className="projectBriefBody">
              <section aria-label="Project roles"><span className="projectBriefLabel">Roles</span>{roleCount>0?<div className="projectRoleList">{roles.slice(0,3).map(role=><span key={role.id}>{role.title}{role.openings>1?` · ${role.openings} openings`:''}</span>)}{roleCount>3&&<span>+{roleCount-3} more</span>}</div>:<p className="projectMuted">Roles are being prepared.</p>}</section>
              <section aria-label="Project commitment"><span className="projectBriefLabel">Commitment</span><p className="projectCommitment">{[p.difficulty_level?titleCase(p.difficulty_level):null,p.duration_weeks?`${p.duration_weeks} weeks`:null,p.weekly_commitment,p.location_type?titleCase(p.location_type):p.location].filter(Boolean).join(' · ')||'See project brief'}</p></section>
              {workWith.length>0&&<section aria-label="Project tools and methods"><span className="projectBriefLabel">Work with</span><div className="projectSkillList">{visibleWorkWith.map(item=><span key={item.slug}>{item.name}</span>)}{remainingWorkWith>0&&<span className="projectSkillMore" aria-label={`${remainingWorkWith} more tools or methods`}>+{remainingWorkWith} more</span>}</div></section>}
              {p.project_type==='open'&&(completed>0||active>0||forming>0)&&<section className="projectRunSignal" aria-label="Open project team activity"><span className="projectBriefLabel">Team activity</span><p>{completed>0&&<><strong>{completed}</strong> team{completed===1?'':'s'} completed</>}{completed>0&&(active>0||forming>0)?' · ':''}{active>0&&<><strong>{active}</strong> active</>}{active>0&&forming>0?' · ':''}{forming>0&&<><strong>{forming}</strong> forming</>}</p></section>}
            </div>
            <footer className="projectBriefFoot"><div><span>{availabilityCopy}</span>{deadline&&<small>Applications close {deadline.toLocaleDateString('en-GB')}</small>}</div><div className="projectCardActions hasPrimaryActionOnly"><a className="button dark" href={`/projects/${p.id}`}>View project →</a></div></footer>
          </article>})}</PaginatedCardGrid>:<div className="emptyState panel"><h3>Nothing matches those filters yet.</h3><p>Try removing a filter or widening your search.</p>{hasFilters&&<a className="button ghost" href="/projects#projects">Clear filters</a>}</div>}
      </div>
    </section>

    <section className="projectsCapabilities" aria-labelledby="projects-capabilities-title">
      <div className="shell projectsCapabilityLayout">
        <div className="projectsSectionIntro"><div className="eyebrow">BEYOND TECHNICAL SKILLS</div><h2 id="projects-capabilities-title">Build the capabilities that make good work possible.</h2><p>Knowing the tools is only part of the job. Real delivery also asks you to communicate, collaborate, make decisions, respond to feedback and take ownership.</p></div>
        <div className="capabilityGrid">
          <article><span>01</span><h3>Collaboration</h3><p>Coordinate with people in different roles, manage dependencies and contribute to a shared outcome.</p></article>
          <article><span>02</span><h3>Communication</h3><p>Explain your thinking, ask better questions and keep work clear as the project moves forward.</p></article>
          <article><span>03</span><h3>Presentation</h3><p>Turn technical work, findings and ideas into clear stories other people can understand and act on.</p></article>
          <article><span>04</span><h3>Leadership</h3><p>Take responsibility, create direction where needed and help a team move from uncertainty to progress.</p></article>
          <article><span>05</span><h3>Problem solving</h3><p>Work through incomplete information, constraints and trade-offs instead of following a perfect tutorial.</p></article>
          <article><span>06</span><h3>Feedback &amp; ownership</h3><p>Receive review, improve your work and follow a defined contribution through to a useful outcome.</p></article>
        </div>
      </div>
    </section>

    <section className="projectsProof" aria-labelledby="projects-proof-title">
      <div className="shell projectsProofLayout"><div><div className="eyebrow">FROM PROJECT TO PROOF</div><h2 id="projects-proof-title">Let the work speak for you.</h2><p>A project is more than something you joined. Mettelo connects your role, contribution and supporting evidence so your professional story can be built on work, not just claims.</p><a className="button ghost" href="/showcase">See Mettelo Proof →</a></div><ol aria-label="Project to Proof pathway"><li><span>Role</span></li><li><span>Work</span></li><li><span>Collaboration</span></li><li><span>Outcome</span></li><li><span>Review</span></li><li><span>Proof</span></li></ol></div>
    </section>

    {pilotProjects.length>0&&<section className="projectsInterest" id="interest"><div className="shell formShell"><div><div className="eyebrow">REGISTER INTEREST</div><h2>See a project you could contribute to?</h2><p className="lead">Tell us where you could add value. If the project moves forward and your experience fits the brief, we can invite you into the next step.</p></div>{selectedPilot?<SubmissionForm formType="project_application" submitLabel="Register my interest →" successMessage="Interest received. We’ll keep it connected to this project and contact you if there is a suitable next step."><div className="selectedPilotProject"><small>SELECTED PROJECT</small><strong>{selectedPilot.title}</strong><a href="#projects">Change project</a></div><input type="hidden" name="project" value={selectedPilot.title}/><label htmlFor="project-name">Full name *</label><input id="project-name" required name="name" autoComplete="name"/><label htmlFor="project-email">Email address *</label><input id="project-email" required name="email" type="email" autoComplete="email"/><label htmlFor="project-role">Where could you contribute? *</label><select id="project-role" name="role" required defaultValue=""><option value="" disabled>Select an area</option><option>Data Analysis / BI</option><option>Data Engineering</option><option>AI / ML</option><option>Research / UX</option><option>Project Lead</option><option>QA / Technical Review</option><option>Documentation / Storytelling</option></select><label htmlFor="project-profile">LinkedIn, GitHub or portfolio</label><input id="project-profile" name="profile" type="url" placeholder="https://"/><label htmlFor="project-contribution">Tell us what you could bring to this project *</label><textarea id="project-contribution" name="contribution" required/><label className="consent"><input required type="checkbox" name="consent" value="yes"/><span>I agree that Mettelo can use this information to review my interest in this project.</span></label></SubmissionForm>:<div className="formCard projectSelectionPrompt"><span className="chip">CHOOSE A PROJECT</span><h3>Select a pilot project first.</h3><p>Use Register interest on the relevant project so your request stays linked to the correct brief.</p><div className="actions"><a className="button dark" href="#projects">Choose a project →</a></div></div>}</div></section>}

    <section className="projectsOrganisationCta"><div className="shell projectsOrganisationBand"><div><div className="eyebrow">FOR ORGANISATIONS</div><h2>Have a technology problem worth solving?</h2><p>Bring us a defined challenge. We’ll assess whether it can become a structured Mettelo Partner Project and where a project team could contribute.</p><small>For businesses, startups, nonprofits, public bodies and other organisations with practical technology, data or AI challenges.</small></div><a className="button dark" href="/partnership#partnership-form">Bring a project →</a></div></section>
  </>;
}
