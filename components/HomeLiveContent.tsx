import {createPublicSupabaseClient} from '@/lib/supabase/public';

type TaxonomyRef={slug:string;name:string};
type Project={id:string;title:string;summary:string;status:string;difficulty_level:string|null;project_domains?:{is_primary:boolean;domains:TaxonomyRef|null}[];project_tools?:{tools:TaxonomyRef|null}[]};
type Event={id:string;title:string;summary:string|null;starts_at:string;location_label:string|null;event_type:string};
type Opportunity={id:string;title:string;organisation:string|null;summary:string|null;location:string|null;opportunity_type:string;closes_at:string|null};

function fmtDate(value:string){return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value));}
function safeText(value:string|null|undefined,max=220){
  if(!value)return '';
  const normal=value.replace(/\s+/g,' ').trim().replace(/\S{56,}/g,token=>`${token.slice(0,52)}…`);
  return normal.length>max?`${normal.slice(0,max-1).trimEnd()}…`:normal;
}
function humanStatus(value:string){return value.replace(/_/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());}

export default async function HomeLiveContent(){
  const db=createPublicSupabaseClient();let project:Project|null=null;let event:Event|null=null;let opportunity:Opportunity|null=null;
  if(db){
    const now=new Date().toISOString();
    const [projects,events,opportunities]=await Promise.all([
      db.from('projects').select('id,title,summary,status,difficulty_level,project_domains(is_primary,domains(slug,name)),project_tools(tools(slug,name))').eq('visibility','public').in('status',['pilot','recruiting','active','review','completed']).order('created_at',{ascending:false}).limit(1),
      db.from('events').select('id,title,summary,starts_at,location_label,event_type').eq('status','published').gte('starts_at',now).order('starts_at',{ascending:true}).limit(1),
      db.from('opportunities').select('id,title,organisation,summary,location,opportunity_type,closes_at').eq('status','published').eq('access_level','public').or(`closes_at.is.null,closes_at.gte.${now}`).order('published_at',{ascending:false}).limit(1)
    ]);
    project=(projects.data?.[0]||null) as unknown as Project|null;
    event=(events.data?.[0]||null) as Event|null;
    opportunity=(opportunities.data?.[0]||null) as Opportunity|null;
  }

  const primary=project?.project_domains?.find(item=>item.is_primary)?.domains||project?.project_domains?.[0]?.domains;
  const projectTools=(project?.project_tools||[]).map(item=>item.tools).filter(Boolean) as TaxonomyRef[];
  const projectStatus=project?.status==='recruiting'?'Applications open':project?humanStatus(project.status):'';

  return <section className="homeDirectorLive" aria-labelledby="home-live-title">
    <div className="shell">
      <div className="homeDirectorLiveHead">
        <div><div className="eyebrow">THE LIVE METTELO ECOSYSTEM</div><h2 id="home-live-title">Find something worth contributing to.</h2></div>
        <div><p>Projects are where experience is built. Opportunities and events help people progress, connect and discover what comes next.</p><a className="linkArrow" href="/search">Explore what is live on Mettelo →</a></div>
      </div>

      <div className="homeDirectorLiveGrid">
        <article className="homeDirectorFeaturedProject">
          <div>
            <div className="homeDirectorLiveTop"><span>FEATURED PROJECT</span>{project&&<strong>{projectStatus}</strong>}</div>
            {project?<>
              <h3 className="liveCardTitle">{safeText(project.title,110)}</h3>
              <p className="homeDirectorLiveMeta">{[primary?.name,project.difficulty_level&&humanStatus(project.difficulty_level),'Team project'].filter(Boolean).join(' · ')}</p>
              <p className="homeDirectorLiveSummary liveCardSummary">{safeText(project.summary,260)}</p>
              {projectTools.length>0&&<div className="homeDirectorLiveTags" aria-label="Project tools">{projectTools.slice(0,3).map(item=><span key={item.slug}>{safeText(item.name,28)}</span>)}</div>}
              <div className="homeDirectorLiveEvidence"><span>WHAT YOU CAN BUILD EVIDENCE OF</span><strong>Applied skills · collaboration · communication · problem solving · practical delivery</strong></div>
            </>:<div className="homeDirectorLiveEmpty"><h3>New practical projects are on the way.</h3><p>Published project briefs will appear here when they are ready for members to explore.</p></div>}
          </div>
          <div className="homeDirectorLiveFoot"><p>Practical work with real contribution context.</p><a className="linkArrow" href="/projects">{project?'View project →':'Explore projects →'}</a></div>
        </article>

        <div className="homeDirectorLiveSide">
          <article>
            <div className="homeDirectorLiveTop"><span>CURRENT OPPORTUNITY</span>{opportunity&&<strong>EXTERNAL</strong>}</div>
            {opportunity?<>
              <h3 className="liveCardTitle">{safeText(opportunity.title,88)}</h3>
              {opportunity.organisation&&<p className="homeDirectorLiveOrg">{safeText(opportunity.organisation,52)}</p>}
              <p className="homeDirectorLiveMeta">{[opportunity.location,humanStatus(opportunity.opportunity_type),opportunity.closes_at&&`Closes ${fmtDate(opportunity.closes_at)}`].filter(Boolean).join(' · ')}</p>
              <p className="liveCardSummary">{safeText(opportunity.summary||'Explore the full listing to understand the role, requirements and application process.',150)}</p>
              <a className="linkArrow" href="/opportunities">View opportunity →</a>
            </>:<><h3>No public opportunity right now.</h3><p>Relevant jobs, referrals, volunteering and fellowships will appear here when published.</p><a className="linkArrow" href="/opportunities">Explore opportunities →</a></>}
          </article>

          <article>
            <div className="homeDirectorLiveTop"><span>UPCOMING EVENT</span></div>
            {event?<>
              <h3 className="liveCardTitle">{safeText(event.title,88)}</h3>
              <p className="homeDirectorLiveMeta">{fmtDate(event.starts_at)}{event.location_label?` · ${safeText(event.location_label,50)}`:''}</p>
              <p className="liveCardSummary">{safeText(event.summary||'Join the next Mettelo community session.',145)}</p>
              <a className="linkArrow" href="/events">View event →</a>
            </>:<><h3>No session scheduled yet.</h3><p>Workshops, showcases and community sessions will appear here when they are confirmed.</p><a className="linkArrow" href="/events">Explore events →</a></>}
          </article>
        </div>
      </div>

      <div className="homeDirectorLiveDisclaimer">
        <p>External opportunities are for discovery. Always review the official employer listing for final requirements, deadlines and application details.</p>
        <nav aria-label="Explore live Mettelo content"><a href="/projects">Projects →</a><a href="/opportunities">Opportunities →</a><a href="/events">Events →</a></nav>
      </div>
    </div>
  </section>;
}
