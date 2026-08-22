import type {Metadata} from 'next';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {getPublicWebsiteCmsPage} from '@/lib/website-pages-cms';

export const metadata:Metadata={title:'Project Showcase',description:'Completed Mettelo Labs work and verified public contributor evidence.'};
export const dynamic='force-dynamic';

type ProofRow={id:string;title:string;contribution_type:string;description:string|null;evidence_url:string|null;user_id:string;project_id:string|null;projects:{id:string;title:string;summary:string;github_url:string|null;status:string}|null};
type Profile={id:string;full_name:string|null;headline:string|null};

export default async function ShowcasePage(){
  const supabase=createPublicSupabaseClient();
  let rows:ProofRow[]=[];let profiles:Profile[]=[];let loadError=false;
  if(supabase){
    const result=await supabase.from('contributions').select('id,title,contribution_type,description,evidence_url,user_id,project_id,projects(id,title,summary,github_url,status)').eq('verification_status','verified').eq('is_public',true).not('project_id','is',null);
    if(result.error)loadError=true;else rows=(result.data||[]) as unknown as ProofRow[];
    const ids=[...new Set(rows.map(row=>row.user_id))];
    if(ids.length){const p=await supabase.from('profiles').select('id,full_name,headline').in('id',ids).eq('is_public',true);if(!p.error)profiles=(p.data||[]) as Profile[];}
  }else loadError=true;
  const copy=(await getPublicWebsiteCmsPage('showcase')).values;
  const profileMap=new Map(profiles.map(profile=>[profile.id,profile]));
  const completed=rows.filter(row=>row.projects?.status==='completed');
  const groups=new Map<string,{project:NonNullable<ProofRow['projects']>;items:ProofRow[]}>();
  completed.forEach(row=>{if(!row.projects)return;const existing=groups.get(row.projects.id);if(existing)existing.items.push(row);else groups.set(row.projects.id,{project:row.projects,items:[row]});});
  const showcases=[...groups.values()];

  return <div className="showcasePage">
    <section className="hero"><div className="shell heroGrid"><div><div className="eyebrow">{copy.hero_eyebrow}</div><h1>{copy.hero_title}</h1><p className="heroLead">{copy.hero_lead}</p></div><aside className="heroPanel"><span className="chip green">VERIFIED PROOF</span><h3 style={{marginTop:18}}>Nothing here is awarded for attendance.</h3><div className="listRow"><strong>Project</strong><span>Completed delivery</span></div><div className="listRow"><strong>Evidence</strong><span>Reviewable output</span></div><div className="listRow"><strong>Verification</strong><span>Mettelo review</span></div><div className="listRow"><strong>Credit</strong><span>Contributor-controlled visibility</span></div></aside></div></section>
    <section className="section"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Verified work</div><h2>{copy.section_title}</h2></div><p>{copy.section_body}</p></div>
      {loadError?<div className="panel emptyState"><h3>Showcase is temporarily unavailable.</h3><p>The Proof database could not be reached. Please try again later.</p></div>:showcases.length?<div className="projectGrid">{showcases.map(({project,items})=><article className="projectCard" key={project.id}><div><span className="chip green">COMPLETED · VERIFIED</span><h3>{project.title}</h3><p>{project.summary}</p><div className="metaRow"><span className="metaPill">{items.length} verified contribution{items.length===1?'':'s'}</span><span className="metaPill">Evidence reviewed</span></div><div style={{marginTop:18}}>{items.map(item=>{const person=profileMap.get(item.user_id);const contributionType=item.contribution_type.replaceAll('_',' ');return <div className="proofRow" id={`proof-${item.id}`} key={item.id}><div><strong className="proofOwner">{person?.full_name||'Mettelo contributor'}</strong><span className="proofContribution">{item.title} · {contributionType}</span></div>{item.evidence_url&&<a className="linkArrow proofEvidence" href={item.evidence_url} target="_blank" rel="noopener noreferrer" aria-label={`View evidence for ${item.title}`}>View evidence →</a>}</div>})}</div></div><div className="projectFoot"><span>Verified contributor credits</span>{project.github_url?<a className="button dark" href={project.github_url} target="_blank" rel="noopener noreferrer">Open repository →</a>:<span className="chip">OUTPUT RECORDED</span>}</div></article>)}</div>:<div className="panel emptyState"><h3>{copy.empty_title}</h3><p>{copy.empty_body}</p><a className="button ghost" href={copy.final_cta_href}>{copy.final_cta_label}</a></div>}
    </div></section>
    <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Proof standard</div><h2>Contribution becomes credible when another person can inspect it.</h2></div></div><div className="grid4"><article className="card"><h3>Ownership</h3><p>The contributor states the part of the work they actually owned.</p></article><article className="card"><h3>Evidence</h3><p>A repository, PR, dashboard, document or other inspectable output supports the claim.</p></article><article className="card"><h3>Review</h3><p>Mettelo can verify, reject or return the evidence for changes.</p></article><article className="card"><h3>Portable credit</h3><p>Verified public proof connects completed work back to the professional who contributed it.</p></article></div><div className="actions" style={{marginTop:24}}><a className="button dark" href={copy.final_cta_href}>{copy.final_cta_label}</a></div></div></section>
  </div>;
}
