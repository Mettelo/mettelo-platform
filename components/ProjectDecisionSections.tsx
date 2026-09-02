import type {ProjectDetailContent} from '@/lib/project-detail-content';
import styles from './ProjectDecisionSections.module.css';

type Taxonomy={name:string};
type Props={
  summary:string;
  problemStatement:string|null;
  detail:ProjectDetailContent;
  domains:Taxonomy[];
  tools:Taxonomy[];
  methods:Taxonomy[];
};

function unique(values:string[]){return [...new Set(values.filter(Boolean))]}
function criterionText(item:ProjectDetailContent['successCriteria'][number]){
  if(item.measurement)return`${item.title} — ${item.measurement}`;
  if(item.description)return`${item.title}: ${item.description}`;
  return item.title;
}

export default function ProjectDecisionSections({summary,problemStatement,detail,domains,tools,methods}:Props){
  const technical=unique([...detail.technicalSkills,...detail.capabilities.filter(item=>item.type==='technical').map(item=>item.name)]);
  const professional=unique([...detail.professionalSkills,...detail.capabilities.filter(item=>item.type==='professional').map(item=>item.name)]);
  const toolNames=unique([...tools.map(item=>item.name),...detail.importedTools]);
  const methodNames=unique([...methods.map(item=>item.name),...detail.importedMethods]);
  const domainNames=unique([...domains.map(item=>item.name),...(detail.importedDomain?[detail.importedDomain]:[])]);
  const canonicalCriteria=detail.successCriteria.map(criterionText);
  const fallbackCriteria=unique(detail.deliverables.map(item=>item.acceptanceCriteria||'').filter(Boolean));
  const criteria=canonicalCriteria.length?canonicalCriteria:fallbackCriteria;
  // Only capabilities explicitly configured as evidence_expected may be described
  // as Proof potential. General skills and Capability Path context remain useful
  // learning/direction information but are not evidence promises.
  const proofSignals=unique(detail.capabilities.filter(item=>item.evidenceExpected).map(item=>item.name)).slice(0,6);

  return <div className={styles.stack}>
    <section className={styles.section} aria-labelledby="project-problem-heading">
      <div className={styles.eyebrow}>01 · Understand the project</div>
      <h2 id="project-problem-heading">The problem you will work on</h2>
      <p>{problemStatement||summary}</p>
      <div className={styles.useCase}>
        <div className={styles.eyebrow}>Use case</div>
        <h3>What decision or outcome should this work support?</h3>
        <p>{summary}</p>
      </div>
    </section>

    <section className={styles.section} aria-labelledby="project-deliverables-heading">
      <div className={styles.eyebrow}>02 · What you must produce</div>
      <h2 id="project-deliverables-heading">Project deliverables</h2>
      <p>The outputs below define what the team is expected to produce. Required deliverables later become part of the delivery and review record.</p>
      {detail.deliverables.length?<div className={styles.deliverables}>{detail.deliverables.map((item,index)=><article className={styles.deliverable} key={item.id}><div className={styles.number} aria-hidden="true">{index+1}</div><div><h3>{item.title}{item.isRequired?' · Required':''}</h3>{item.publicSummary&&<p>{item.publicSummary}</p>}{item.deliverableType&&<p>{item.deliverableType}</p>}{item.expectedFormat&&<p><strong>Expected format:</strong> {item.expectedFormat}</p>}{item.acceptanceCriteria&&<p><strong>Acceptance:</strong> {item.acceptanceCriteria}</p>}</div></article>)}</div>:<div className={styles.empty} role="status"><strong>Detailed deliverables are being prepared.</strong><span>This project can be explored, but Mettelo should publish the delivery outputs before opening new applications under the Project Detail V2 quality standard.</span></div>}
    </section>

    <section className={styles.section} aria-labelledby="project-success-heading">
      <div className={styles.eyebrow}>03 · Quality bar</div>
      <h2 id="project-success-heading">How success will be judged</h2>
      <p>Success criteria should be explicit enough that a member understands the project-level standard before committing. Deliverable acceptance is used only as a compatibility fallback where an older project has not yet been enriched.</p>
      {criteria.length?<div className={styles.criteria}>{criteria.map((item,index)=><div className={styles.criterion} key={`${index}-${item}`}><strong>{canonicalCriteria.length?`Success criterion ${index+1}`:`Acceptance criterion ${index+1}`}</strong><span>{item}</span></div>)}</div>:<div className={styles.empty} role="status"><strong>Success criteria are not yet published.</strong><span>This is a content-readiness gap, not an invitation to infer a quality standard.</span></div>}
    </section>

    <section className={styles.section} aria-labelledby="project-data-heading">
      <div className={styles.eyebrow}>04 · Data & resources</div>
      <h2 id="project-data-heading">What you will work with</h2>
      <p>Only resources explicitly classified as public and permitted for publication are shown on Project Detail. Team-only and restricted resources remain inside authorised Mettelo Lab access.</p>
      {detail.dataSources.length?<div className={styles.dataList}>{detail.dataSources.map(item=><article className={styles.dataCard} key={item.id}><h3>{item.name}</h3>{item.description&&<p>{item.description}</p>}<div className={styles.meta}>{item.sourceType&&<span>{item.sourceType}</span>}{item.providerName&&<span>{item.providerName}</span>}{item.dataFormat&&<span>{item.dataFormat}</span>}{item.dataPeriod&&<span>{item.dataPeriod}</span>}{item.approximateSize&&<span>{item.approximateSize}</span>}</div>{item.providerName&&<p><strong>Provider:</strong> {item.providerUrl?<a className={styles.dataLink} href={item.providerUrl} target="_blank" rel="noreferrer">{item.providerName} ↗</a>:item.providerName}</p>}{item.licenceName&&<p><strong>Licence:</strong> {item.licenceUrl?<a className={styles.dataLink} href={item.licenceUrl} target="_blank" rel="noreferrer">{item.licenceName} ↗</a>:item.licenceName}</p>}{item.requiredSubset&&<p><strong>Required subset:</strong> {item.requiredSubset}</p>}{item.provenance&&<p><strong>Source / provenance:</strong> {item.provenance}</p>}{item.knownLimitations&&<p><strong>Known limitations:</strong> {item.knownLimitations}</p>}{item.externalUrl&&<a className={styles.dataLink} href={item.externalUrl} target="_blank" rel="noreferrer">View original source ↗</a>}<small>Source identification is provided for attribution and transparency and does not imply sponsorship, endorsement or partnership with Mettelo.</small></article>)}</div>:<div className={styles.empty} role="status"><strong>No public project resources are published yet.</strong><span>Internal, team-only and restricted resources are intentionally not exposed on this discovery page.</span></div>}
    </section>

    <section className={styles.section} aria-labelledby="project-capabilities-heading">
      <div className={styles.eyebrow}>05 · What you will build</div>
      <h2 id="project-capabilities-heading">Capabilities you will practise</h2>
      <p>Mettelo separates technical capability, professional capability and the working methods/tools used to produce evidence.</p>
      <div className={styles.skills}>
        <article className={styles.skillGroup}><h3>Technical</h3><div className={styles.tags}>{technical.length?technical.slice(0,10).map(item=><span className={styles.tag} key={item}>{item}</span>):<span className={styles.tag}>Not yet mapped</span>}</div></article>
        <article className={styles.skillGroup}><h3>Professional</h3><div className={styles.tags}>{professional.length?professional.slice(0,10).map(item=><span className={styles.tag} key={item}>{item}</span>):<span className={styles.tag}>Not yet mapped</span>}</div></article>
        <article className={styles.skillGroup}><h3>Context, methods & tools</h3><div className={styles.tags}>{domainNames.slice(0,3).map(item=><span className={styles.tag} key={`d-${item}`}>{item}</span>)}{methodNames.slice(0,6).map(item=><span className={styles.tag} key={`m-${item}`}>{item}</span>)}{toolNames.slice(0,6).map(item=><span className={styles.tag} key={`t-${item}`}>{item}</span>)}</div></article>
      </div>
    </section>

    {detail.pathContexts.length>0&&<section className={styles.section} aria-labelledby="project-path-heading">
      <div className={styles.eyebrow}>06 · Direction</div>
      <h2 id="project-path-heading">Where this project fits</h2>
      <p>A project may contribute to more than one Capability Path. Path context guides progression without restricting discovery.</p>
      <div className={styles.paths}>{detail.pathContexts.map(item=><article className={styles.path} key={`${item.pathSlug}-${item.position}`}><div className={styles.pathTop}><div><h3>{item.pathName}</h3><small>Project {item.position}{item.stageName?` · ${item.stageName}`:''}</small></div><a className={styles.dataLink} href={`/projects/paths/${item.pathSlug}`}>View Path →</a></div><p><strong>Competency focus:</strong> {item.competencyFocus}</p><p><strong>Capability built:</strong> {item.capabilityBuilt}</p>{item.pathOutcome&&<p><strong>Path outcome:</strong> {item.pathOutcome}</p>}</article>)}</div>
    </section>}

    <section className={styles.section} aria-labelledby="project-proof-heading">
      <div className={styles.eyebrow}>07 · Evidence</div>
      <h2 id="project-proof-heading">What credible Proof could come from the work</h2>
      <p>These are explicitly configured evidence opportunities, not automatic awards. Mettelo Proof is created only from contribution that is actually completed and verified.</p>
      <div className={styles.proof}><p>The strongest evidence should connect your role, the work you personally contributed, the project context and the review outcome.</p>{proofSignals.length>0?<div className={styles.proofList}>{proofSignals.map(item=><div className={styles.proofItem} key={item}><strong>{item}</strong><span>Potential evidence signal if your contribution is completed and verified.</span></div>)}</div>:<div className={styles.empty} role="status"><strong>Evidence expectations are not yet configured.</strong><span>Skills and Capability Path context are not treated as Proof promises.</span></div>}</div>
    </section>
  </div>;
}
