import type {Metadata} from 'next';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import styles from '../public-wave1.module.css';

export const metadata:Metadata={title:'Verified Proof Showcase',description:'Explore completed Mettelo work through reviewed contribution evidence and contributor-controlled public Proof.'};
export const dynamic='force-dynamic';

type ProofRow={id:string;title:string;contribution_type:string;description:string|null;evidence_url:string|null;user_id:string;project_id:string|null;projects:{id:string;title:string;summary:string;github_url:string|null;status:string}|null};
type Profile={id:string;full_name:string|null;headline:string|null};

function contributionLabel(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase())}

export default async function ShowcasePage(){
  const supabase=createPublicSupabaseClient();
  let rows:ProofRow[]=[];let profiles:Profile[]=[];let loadError=false;
  if(supabase){
    const result=await supabase.from('contributions').select('id,title,contribution_type,description,evidence_url,user_id,project_id,projects(id,title,summary,github_url,status)').eq('verification_status','verified').eq('is_public',true).not('project_id','is',null);
    if(result.error)loadError=true;else rows=(result.data||[]) as unknown as ProofRow[];
    const ids=[...new Set(rows.map(row=>row.user_id))];
    if(ids.length){const people=await supabase.from('profiles').select('id,full_name,headline').in('id',ids).eq('is_public',true);if(!people.error)profiles=(people.data||[]) as Profile[];}
  }else loadError=true;

  const profileMap=new Map(profiles.map(profile=>[profile.id,profile]));
  const completed=rows.filter(row=>row.projects?.status==='completed');
  const groups=new Map<string,{project:NonNullable<ProofRow['projects']>;items:ProofRow[]}>();
  completed.forEach(row=>{if(!row.projects)return;const existing=groups.get(row.projects.id);if(existing)existing.items.push(row);else groups.set(row.projects.id,{project:row.projects,items:[row]});});
  const showcases=[...groups.values()];
  const contributors=new Set(completed.map(row=>row.user_id)).size;
  const evidenceLinks=completed.filter(row=>Boolean(row.evidence_url)).length;

  return <div className={styles.wavePage}>
    <section className={`${styles.hero} ${styles.heroDark}`} aria-labelledby="showcase-title">
      <div className="shell">
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <div className="eyebrow">METTELO PROOF</div>
            <h1 id="showcase-title">See the work behind the claim.</h1>
            <p>Public Proof connects a completed project to the contribution, evidence and review record behind it. It is designed to help people inspect capability rather than rely on a title alone.</p>
            <div className={styles.heroActions}><a className="button primary" href="#verified-work">Explore verified work →</a><a className="button ghost" href="/projects">Find a project</a></div>
          </div>
          <aside className={styles.signalPanel} aria-label="Mettelo Proof standard">
            <span className={styles.signalKicker}>THE STANDARD</span>
            <strong>Verified does not mean awarded for attendance.</strong>
            <p>A public record appears only when completed work, contributor evidence, Mettelo review and contributor-controlled visibility align.</p>
            <ul className={styles.signalList}><li><strong>Work</strong><span>Completed delivery</span></li><li><strong>Evidence</strong><span>Inspectable output</span></li><li><strong>Review</strong><span>Contribution checked</span></li><li><strong>Visibility</strong><span>Contributor controlled</span></li></ul>
          </aside>
        </div>
      </div>
    </section>

    <section className={styles.section} id="verified-work" aria-labelledby="verified-work-title">
      <div className="shell">
        <div className={styles.sectionHead}><div><div className={styles.sectionEyebrow}>VERIFIED WORK</div><h2 id="verified-work-title">Evidence dossiers, not participation badges.</h2></div><p>Each dossier keeps project context and contributor evidence together so the person reviewing the work can understand what happened and who owned what.</p></div>
        <div className={styles.proofStats} aria-label="Public Proof summary"><div><strong>{showcases.length}</strong><span>completed project{showcases.length===1?'':'s'} with public Proof</span></div><div><strong>{contributors}</strong><span>visible contributor{contributors===1?'':'s'}</span></div><div><strong>{evidenceLinks}</strong><span>linked evidence item{evidenceLinks===1?'':'s'}</span></div></div>
        <div style={{height:24}} aria-hidden="true"/>
        {loadError?<div className={styles.empty} role="status"><h3>Showcase is temporarily unavailable.</h3><p>The Proof database could not be reached. Please try again later.</p></div>:showcases.length?<div className={styles.dossierGrid}>{showcases.map(({project,items},index)=><article className={styles.dossier} key={project.id}>
          <div className={styles.dossierStory}>
            <div className={styles.dossierTop}><span className={styles.proofBadge}><i aria-hidden="true"/>COMPLETED · VERIFIED</span><span className={styles.dossierNumber}>DOSSIER {String(index+1).padStart(2,'0')}</span></div>
            <h3>{project.title}</h3><p className={styles.dossierSummary}>{project.summary}</p>
            <div className={styles.dossierMetrics}><span className={styles.dossierMetric}>{items.length} verified contribution{items.length===1?'':'s'}</span><span className={styles.dossierMetric}>Evidence reviewed</span><span className={styles.dossierMetric}>Public with consent</span></div>
            <div className={styles.dossierFoot}><span>Project context and contributor ownership stay connected.</span>{project.github_url?<a className="button dark" href={project.github_url} target="_blank" rel="noopener noreferrer">Open project repository →</a>:<span>Project output recorded</span>}</div>
          </div>
          <aside className={styles.evidenceRail} aria-label={`Verified contributions for ${project.title}`}><strong>Contribution record</strong><div className={styles.evidenceList}>{items.map(item=>{const person=profileMap.get(item.user_id);return <div className={styles.evidenceItem} id={`proof-${item.id}`} key={item.id}><div className={styles.evidencePerson}><strong>{person?.full_name||'Mettelo contributor'}</strong><span>VERIFIED</span></div><p><strong>{item.title}</strong><br/>{contributionLabel(item.contribution_type)}{person?.headline?` · ${person.headline}`:''}</p>{item.description&&<p>{item.description}</p>}{item.evidence_url&&<a href={item.evidence_url} target="_blank" rel="noopener noreferrer">Inspect evidence →</a>}</div>})}</div></aside>
        </article>)}</div>:<div className={styles.empty}><h3>No public verified project Proof yet.</h3><p>That is an honest launch state. A dossier appears only after a project is completed, contribution evidence is verified and the contributor chooses public visibility.</p><a className="button ghost" href="/projects">Explore projects →</a></div>}
      </div>
    </section>

    <section className={`${styles.section} ${styles.darkSection}`} aria-labelledby="proof-standard-title"><div className="shell"><div className={styles.sectionHead}><div><div className={styles.sectionEyebrow}>PROOF STANDARD</div><h2 id="proof-standard-title">Credibility comes from inspectable context.</h2></div><p>Mettelo Proof is useful when another person can understand the work, the contributor&apos;s ownership, the supporting evidence and what review actually confirms.</p></div><div className={styles.proofStandard}><article><span>01</span><h3>Ownership</h3><p>The contributor identifies the part of the work they actually owned.</p></article><article><span>02</span><h3>Evidence</h3><p>A repository, pull request, dashboard, document or other inspectable output supports the record.</p></article><article><span>03</span><h3>Review</h3><p>Mettelo can verify, reject or return the evidence for changes rather than automatically approving participation.</p></article><article><span>04</span><h3>Portable credit</h3><p>Public Proof connects completed work back to the professional while keeping visibility in their control.</p></article></div></div></section>
  </div>;
}
