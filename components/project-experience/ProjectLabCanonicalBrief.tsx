import {getProjectLabCanonicalData} from '@/lib/project-lab-canonical-data';
import styles from './ProjectLabCanonicalBrief.module.css';

type Props={projectId:string};

function milestoneWindow(start:number|null,end:number|null){
  if(start&&end&&start!==end)return`Weeks ${start}–${end}`;
  if(start||end)return`Week ${start||end}`;
  return'Project phase';
}

export default async function ProjectLabCanonicalBrief({projectId}:Props){
  const definition=await getProjectLabCanonicalData(projectId);
  if(!definition)return null;
  const {project,brief,resources,deliverables,successCriteria,timeline,proofSignals}=definition;

  return <section className={styles.brief} id="project-brief" data-lab-home-section aria-labelledby="canonical-project-brief-title">
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>CANONICAL PROJECT BRIEF</span><h3 id="canonical-project-brief-title">What your team is here to solve and deliver</h3><p>This is the approved project definition shared across Mettelo. Live tasks, workstreams and delivery status remain separate execution records for your team.</p></div>
      <span className={styles.sourceBadge}>One project source</span>
    </header>

    <div className={styles.grid}>
      <article className={styles.card}><span className={styles.label}>Problem Statement</span><h4>{project.title}</h4><p>{project.problemStatement||project.summary}</p></article>
      <article className={styles.card}><span className={styles.label}>Business Context</span><h4>Why the work matters</h4><p>{brief?.businessContext||'Business context has not yet been published in the canonical project brief.'}</p></article>
      <article className={styles.card}><span className={styles.label}>Primary Use Case</span><h4>What decision or action the work supports</h4><p>{brief?.useCase||'A primary use case has not yet been published.'}</p></article>
      <article className={styles.card}><span className={styles.label}>Primary Objective</span><h4>What the team needs to achieve</h4><p>{brief?.primaryObjective||'A primary objective has not yet been published.'}</p></article>
    </div>

    {(brief?.supportingObjectives.length||brief?.keyQuestions.length||brief?.inScope.length||brief?.outOfScope.length)?<div className={styles.definitionGrid}>
      {brief?.supportingObjectives.length?<DefinitionList title="Supporting objectives" items={brief.supportingObjectives}/>:null}
      {brief?.keyQuestions.length?<DefinitionList title="Key questions" items={brief.keyQuestions}/>:null}
      {brief?.inScope.length?<DefinitionList title="In scope" items={brief.inScope}/>:null}
      {brief?.outOfScope.length?<DefinitionList title="Out of scope" items={brief.outOfScope}/>:null}
    </div>:null}

    <div className={styles.sectionHead}><div><span className={styles.eyebrow}>APPROVED RESOURCES</span><h4>Project data and working resources</h4></div><p>Private stored-copy links appear only inside authorised Lab access. Original-source attribution remains visible for traceability.</p></div>
    {resources.length?<div className={styles.resourceGrid}>{resources.map(resource=><article className={styles.resource} key={resource.id}><div className={styles.resourceTop}><span>{resource.providerName||resource.sourceType||'Project resource'}</span><b>{resource.sensitivity}</b></div><h5>{resource.name}</h5>{resource.description&&<p>{resource.description}</p>}<dl>{resource.licenceName&&<div><dt>Licence</dt><dd>{resource.licenceName}</dd></div>}{resource.requiredSubset&&<div><dt>Required subset</dt><dd>{resource.requiredSubset}</dd></div>}{resource.dataPeriod&&<div><dt>Period</dt><dd>{resource.dataPeriod}</dd></div>}{resource.dataFormat&&<div><dt>Format</dt><dd>{resource.dataFormat}</dd></div>}</dl><div className={styles.links}>{resource.internalStorageUrl&&<a href={resource.internalStorageUrl} target="_blank" rel="noreferrer">Open approved working copy ↗</a>}{resource.externalUrl&&<a href={resource.externalUrl} target="_blank" rel="noreferrer">View original source ↗</a>}</div></article>)}</div>:<Empty title="No canonical project resources are available to this member yet." copy="Mettelo does not expose restricted links when the authorised project definition has no accessible resource record."/>}

    <div className={styles.sectionHead}><div><span className={styles.eyebrow}>DELIVERY DEFINITION</span><h4>Expected outputs and quality bar</h4></div><p>These define what good delivery means. Run-specific deliverable status is tracked separately in the workspace.</p></div>
    <div className={styles.twoColumns}>
      <div><h5 className={styles.subheading}>Deliverables</h5>{deliverables.length?<ol className={styles.list}>{deliverables.map(item=><li key={item.id}><div><strong>{item.title}</strong>{item.publicSummary&&<p>{item.publicSummary}</p>}{item.expectedFormat&&<small>Expected format · {item.expectedFormat}</small>}{item.acceptanceCriteria&&<small>Acceptance · {item.acceptanceCriteria}</small>}</div><span>{item.isRequired?'Required':'Optional'}</span></li>)}</ol>:<Empty title="Deliverables are not yet defined." copy="This remains a project-readiness gap; Lab does not invent delivery requirements."/>}</div>
      <div><h5 className={styles.subheading}>Success criteria</h5>{successCriteria.length?<ol className={styles.criteria}>{successCriteria.map(item=><li key={item.id}><span aria-hidden="true">✓</span><div><strong>{item.title}</strong>{item.description&&<p>{item.description}</p>}{item.measurement&&<small>{item.measurement}</small>}</div></li>)}</ol>:<Empty title="Success criteria are not yet defined." copy="The team should not infer a quality bar from file completion alone."/>}</div>
    </div>

    <div className={styles.sectionHead}><div><span className={styles.eyebrow}>PLANNED JOURNEY</span><h4>Canonical phases and Proof potential</h4></div><p>The plan below is project-level intent. Your live Lab milestones and tasks show actual execution progress.</p></div>
    <div className={styles.twoColumns}>
      <div>{timeline.length?<ol className={styles.timeline}>{timeline.map(item=><li key={item.id}><span>{milestoneWindow(item.weekStart,item.weekEnd)}</span><div><strong>{item.title}</strong>{item.description&&<p>{item.description}</p>}{item.expectedOutput&&<small>Expected output · {item.expectedOutput}</small>}</div></li>)}</ol>:<Empty title="Canonical project phases are not yet defined." copy="Live run milestones are intentionally not substituted here."/>}</div>
      <div><h5 className={styles.subheading}>Configured evidence opportunities</h5>{proofSignals.length?<div className={styles.proofGrid}>{proofSignals.map(signal=><div key={signal}><strong>{signal}</strong><span>Potential evidence only after completed contribution and verification.</span></div>)}</div>:<Empty title="Proof expectations are not yet configured." copy="Participation or a listed skill does not automatically become Mettelo Proof."/>}</div>
    </div>
  </section>;
}

function DefinitionList({title,items}:{title:string;items:string[]}){return <article className={styles.definition}><h5>{title}</h5><ul>{items.map(item=><li key={item}>{item}</li>)}</ul></article>}
function Empty({title,copy}:{title:string;copy:string}){return <div className={styles.empty} role="status"><strong>{title}</strong><span>{copy}</span></div>}
