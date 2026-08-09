import { createPublicSupabaseClient } from '@/lib/supabase/public';

type TaxonomyRef={slug:string;name:string};
type Project={id:string;title:string;summary:string;status:string;difficulty_level:string|null;project_domains?:{is_primary:boolean;domains:TaxonomyRef|null}[];project_tools?:{tools:TaxonomyRef|null}[]};
type Event={id:string;title:string;summary:string|null;starts_at:string;location_label:string|null;registration_url:string|null;event_type:string};
type Opportunity={id:string;title:string;organisation:string|null;summary:string|null;location:string|null;opportunity_type:string;source_url:string|null;closes_at:string|null};
type Proof={id:string;title:string;contribution_type:string;verified_at:string|null;projects:{title:string}|null};

function fmtDate(value:string){return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value));}

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
    project=(projects.data?.[0]||null) as unknown as Project|null;event=(events.data?.[0]||null) as Event|null;opportunity=(opportunities.data?.[0]||null) as Opportunity|null;proof=(proofs.data?.[0]||null) as unknown as Proof|null;
  }
  const primary=project?.project_domains?.find(item=>item.is_primary)?.domains||project?.project_domains?.[0]?.domains;const projectTools=(project?.project_tools||[]).map(item=>item.tools).filter(Boolean) as TaxonomyRef[];
  return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Live from Mettelo</div><h2>Find something worth joining now.</h2></div><p>This section comes from the live Mettelo database. If something is not published, we say so rather than filling the page with invented activity.</p></div><div className="homeExploreGrid">
    <article className="homeExploreCard liveDiscoveryCard"><span className="cardNumber">LATEST PROJECT</span>{project?<><div className="liveCardMeta">{primary&&<span className="domainTag">{primary.name}</span>}<span className="chip">{project.status.toUpperCase()}</span></div><h3>{project.title}</h3><p>{project.summary}</p>{projectTools.length>0&&<div className="projectTagRow">{projectTools.slice(0,3).map(item=><span key={item.slug}>{item.name}</span>)}</div>}<a className="linkArrow" href="/projects">Explore Projects →</a></>:<><h3>No public project yet</h3><p>New Labs briefs will appear here after they pass the Mettelo publishing process.</p><a className="linkArrow" href="/projects">Explore Projects →</a></>}</article>
    <article className="homeExploreCard liveDiscoveryCard"><span className="cardNumber">NEXT EVENT</span>{event?<><div className="liveCardMeta"><span className="chip">{event.event_type.replace('_',' ').toUpperCase()}</span><span>{fmtDate(event.starts_at)}</span></div><h3>{event.title}</h3><p>{event.summary||event.location_label||'Confirmed Mettelo event.'}</p><a className="linkArrow" href="/events">View Event →</a></>:<><h3>No event published right now</h3><p>Confirmed workshops, AMAs, showcases and community sessions will appear here.</p><a className="linkArrow" href="/events">View Events →</a></>}</article>
    <article className="homeExploreCard liveDiscoveryCard"><span className="cardNumber">CURRENT OPPORTUNITY</span>{opportunity?<><div className="liveCardMeta"><span className="chip">{opportunity.opportunity_type.toUpperCase()}</span>{opportunity.location&&<span>{opportunity.location}</span>}</div><h3>{opportunity.title}</h3><p>{opportunity.organisation?`${opportunity.organisation} · `:''}{opportunity.summary||'Published Mettelo opportunity.'}</p>{opportunity.closes_at&&<small>Closes {fmtDate(opportunity.closes_at)}</small>}<a className="linkArrow" href="/opportunities">View Opportunities →</a></>:<><h3>No public opportunity right now</h3><p>Verified jobs, referrals, volunteering and fellowships will appear here when published.</p><a className="linkArrow" href="/opportunities">View Opportunities →</a></>}</article>
    <article className="homeExploreCard liveDiscoveryCard"><span className="cardNumber">VERIFIED PROOF</span>{proof?<><div className="liveCardMeta"><span className="chip green">VERIFIED</span>{proof.verified_at&&<span>{fmtDate(proof.verified_at)}</span>}</div><h3>{proof.title}</h3><p>{proof.projects?.title||'Mettelo contribution'} · {proof.contribution_type.replace('_',' ')}</p><a className="linkArrow" href="/showcase">Explore Proof →</a></>:<><h3>Verified Proof is building</h3><p>Public, reviewed contribution will appear here when the first verified records are published.</p><a className="linkArrow" href="/showcase">Explore Proof →</a></>}</article>
  </div></div></section>;
}
