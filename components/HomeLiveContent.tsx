import {createPublicSupabaseClient} from '@/lib/supabase/public';

type TaxonomyRef={slug:string;name:string};
type Project={id:string;title:string;summary:string;status:string;difficulty_level:string|null;project_domains?:{is_primary:boolean;domains:TaxonomyRef|null}[];project_tools?:{tools:TaxonomyRef|null}[]};
type Event={id:string;title:string;summary:string|null;starts_at:string;location_label:string|null;registration_url:string|null;event_type:string};
type Opportunity={id:string;title:string;organisation:string|null;summary:string|null;location:string|null;opportunity_type:string;source_url:string|null;closes_at:string|null};
type Proof={id:string;title:string;contribution_type:string;verified_at:string|null;projects:{title:string}|null};

function fmtDate(value:string){return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value));}
function safeText(value:string|null|undefined,max=220){
  if(!value)return '';
  const normal=value.replace(/\s+/g,' ').trim().replace(/\S{56,}/g,token=>`${token.slice(0,52)}…`);
  return normal.length>max?`${normal.slice(0,max-1).trimEnd()}…`:normal;
}
function humanStatus(value:string){return value.replace(/_/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());}

export default async function HomeLiveContent(){
  const db=createPublicSupabaseClient();let project:Project|null=null;let event:Event|null=null;let opportunity:Opportunity|null=null;let proof:Proof|null=null;
  if(db){
    const now=new Date().toISOString();
    const [projects,events,opportunities,proofs]=await Promise.all([
      db.from('projects').select('id,title,summary,status,difficulty_level,project_domains(is_primary,domains(slug,name)),project_tools(tools(slug,name))').eq('visibility','public').in('status',['pilot','recruiting','active','review','completed']).order('created_at',{ascending:false}).limit(1),
      db.from('events').select('id,title,summary,starts_at,location_label,registration_url,event_type').eq('status','published').gte('starts_at',now).order('starts_at',{ascending:true}).limit(1),
      db.from('opportunities').select('id,title,organisation,summary,location,opportunity_type,source_url,closes_at').eq('status','published').eq('access_level','public').or(`closes_at.is.null,closes_at.gte.${now}`).order('published_at',{ascending:false}).limit(1),
      db.from('contributions').select('id,title,contribution_type,verified_at,projects(title)').eq('verification_status','verified').eq('is_public',true).order('verified_at',{ascending:false}).limit(1)
    ]);
    project=(projects.data?.[0]||null) as unknown as Project|null;
    event=(events.data?.[0]||null) as Event|null;
    opportunity=(opportunities.data?.[0]||null) as Opportunity|null;
    proof=(proofs.data?.[0]||null) as unknown as Proof|null;
  }

  const primary=project?.project_domains?.find(item=>item.is_primary)?.domains||project?.project_domains?.[0]?.domains;
  const projectTools=(project?.project_tools||[]).map(item=>item.tools).filter(Boolean) as TaxonomyRef[];
  const projectStatus=project?.status==='recruiting'?'Applications open':project?humanStatus(project.status):'';

  return <section className="section homeLiveSection homeLiveV4" aria-labelledby="home-live-title">
    <div className="shell">
      <div className="homeLiveV4Head">
        <div>
          <div className="eyebrow">Explore Mettelo</div>
          <h2 id="home-live-title">Turn practical experience into credible Proof.</h2>
        </div>
        <div className="homeLiveV4Intro">
          <p>Explore things you can work on, learn from and progress towards—while building evidence of how you apply your skills.</p>
          <a className="linkArrow" href="/search">Explore what is live on Mettelo →</a>
        </div>
      </div>

      <div className="homeLiveDiscovery">
        <article className="homeLiveFeaturedProject">
          <div className="homeLiveCardTop">
            <span className="homeLiveLabel">Featured project</span>
            {project&&<span className="homeLiveBadge">{projectStatus}</span>}
          </div>
          {project?<>
            <h3 className="liveCardTitle">{safeText(project.title,110)}</h3>
            <p className="homeLiveMeta">{[primary?.name,project.difficulty_level&&humanStatus(project.difficulty_level),'Team project'].filter(Boolean).join(' · ')}</p>
            <p className="homeLiveDescription liveCardSummary">{safeText(project.summary,235)}</p>
            {projectTools.length>0&&<div className="homeLiveTags" aria-label="Project tools">{projectTools.slice(0,3).map(item=><span key={item.slug}>{safeText(item.name,28)}</span>)}</div>}
            <div className="homeLiveEvidence"><span>What you can build evidence of</span><strong>Applied skills, collaboration, problem-solving and practical delivery.</strong></div>
            <div className="homeLiveFeaturedFooter"><p>A practical way to apply skills with others.</p><a className="linkArrow" href="/projects">View project →</a></div>
          </>:<>
            <div className="homeLiveFeaturedEmpty"><h3>New practical projects are on the way.</h3><p>Published project briefs will appear here when they are ready for members to explore.</p></div>
            <div className="homeLiveFeaturedFooter"><p>Explore the project space and see how participation works.</p><a className="linkArrow" href="/projects">Explore projects →</a></div>
          </>}
        </article>

        <div className="homeLiveSideStack">
          <article className="homeLiveSideCard homeLiveOpportunityV4">
            <div className="homeLiveCardTop"><span className="homeLiveLabel">Current opportunity</span>{opportunity&&<span className="homeLiveBadge">External</span>}</div>
            {opportunity?<>
              <h3 className="liveCardTitle">{safeText(opportunity.title,88)}</h3>
              {opportunity.organisation&&<p className="homeLiveOrganisation">{safeText(opportunity.organisation,52)}</p>}
              <div className="homeLiveOpportunityFacts">
                {opportunity.location&&<p><span>Location</span><strong>{safeText(opportunity.location,70)}</strong></p>}
                <p><span>Type</span><strong>{humanStatus(opportunity.opportunity_type)}</strong></p>
                {opportunity.closes_at&&<p><span>Closes</span><strong>{fmtDate(opportunity.closes_at)}</strong></p>}
              </div>
              <p className="homeLiveSideDescription liveCardSummary">{safeText(opportunity.summary||'Explore the full listing to understand the role, requirements and application process.',150)}</p>
              <a className="linkArrow" href="/opportunities">View opportunity →</a>
            </>:<>
              <h3>No public opportunity right now.</h3><p className="homeLiveSideDescription">Relevant jobs, referrals, volunteering and fellowships will appear here when published.</p><a className="linkArrow" href="/opportunities">Explore opportunities →</a>
            </>}
          </article>

          <article className="homeLiveSideCard homeLiveEventV4">
            <div className="homeLiveCardTop"><span className="homeLiveLabel">Upcoming events</span></div>
            {event?<>
              <h3 className="liveCardTitle">{safeText(event.title,88)}</h3>
              <p className="homeLiveMeta">{fmtDate(event.starts_at)}{event.location_label?` · ${safeText(event.location_label,50)}`:''}</p>
              <p className="homeLiveSideDescription liveCardSummary">{safeText(event.summary||'Join the next Mettelo community session.',145)}</p>
              <a className="linkArrow" href="/events">View event →</a>
            </>:<>
              <h3>No session scheduled yet.</h3><p className="homeLiveSideDescription">Workshops, showcases and community sessions will appear here when they are confirmed.</p><a className="linkArrow" href="/events">Explore events →</a>
            </>}
          </article>
        </div>
      </div>

      <div className="homeLiveProofStory">
        <div className="homeLiveProofCopy">
          <span className="homeLiveProofKicker">Mettelo Proof</span>
          <h3>Your contribution should leave evidence behind.</h3>
          <p>Completed work, feedback and reviewed contribution can become credible evidence of the skills you applied, how you worked with others and what you helped deliver.</p>
          <a className="linkArrow" href="/showcase">See how Mettelo Proof works →</a>
        </div>
        {proof?<div className="homeLiveProofExample">
          <span className="homeLiveProofVerified">Verified contribution</span>
          <strong className="liveCardTitle">{safeText(proof.title,88)}</strong>
          <p className="liveCardSummary">{safeText(`${proof.projects?.title||'Mettelo project'} · ${humanStatus(proof.contribution_type)}`,130)}</p>
          {proof.verified_at&&<small>Verified {fmtDate(proof.verified_at)}</small>}
        </div>:<div className="homeLiveProofSignals" aria-label="Examples of what Mettelo Proof can evidence">
          {['Applied skills','Collaboration','Leadership','Delivery'].map(item=><div key={item}><span>Evidence</span><strong>{item}</strong></div>)}
          <p>Reviewed contribution → credible Proof</p>
        </div>}
      </div>

      <div className="homeLiveV4Footer">
        <p>External opportunities are for discovery. Always review the official employer listing for final requirements, deadlines and application details.</p>
        <nav aria-label="Explore Mettelo live content"><a href="/projects">Explore projects →</a><a href="/opportunities">Explore opportunities →</a><a href="/events">Explore events →</a></nav>
      </div>
    </div>
  </section>;
}