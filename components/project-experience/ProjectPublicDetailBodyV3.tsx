import Link from 'next/link';
import type {ProjectExperienceModel} from '@/lib/project-experience-model';
import styles from './ProjectDetailBodyV3.module.css';

type Props={model:ProjectExperienceModel;canApply:boolean;ctaHref:string;authenticated:boolean};

function short(value:string|null|undefined,max=180){if(!value)return'';const clean=value.replace(/\s+/g,' ').trim();return clean.length<=max?clean:`${clean.slice(0,max).replace(/\s+\S*$/,'')}…`}
function roleMission(role:ProjectExperienceModel['roles'][number]){return short(role.responsibilities?.[0]||role.description||`${role.title} owns a defined project workstream and the evidence produced from it.`,150)}

export default function ProjectPublicDetailBodyV3({model,canApply,ctaHref,authenticated}:Props){
  const {challenge,deliverables,successCriteria,acceptanceChecks,stakeholderHandover,capabilities,roles}=model;
  const previewDeliverables=deliverables.slice(0,6);
  const previewRoles=roles.slice(0,6);
  const capabilitySignals=[...capabilities.technical,...capabilities.professional,...capabilities.methodsAndTools].filter((item,index,items)=>items.indexOf(item)===index).slice(0,10);
  const qualityGroups=[
    {title:'Data integrity',items:['Source reconciles to the governed project evidence.','Assumptions and exclusions are explicit.']},
    {title:'Analytical quality',items:['A credible baseline or comparison is included.','Error, uncertainty and material failure cases are tested.']},
    {title:'Decision quality',items:['The recommendation answers the recorded decision.','Trade-offs, counter-evidence and evidence limits remain visible.']},
    {title:'Professional delivery',items:['Work is reproducible and traceable.','Outputs meet the project-specific acceptance standard.']}
  ];
  return <div className={styles.body} id="project-content">
    <nav className={styles.nav} aria-label="Project sections"><div className={styles.navInner}><a href="#overview">Overview</a><a href="#deliverables">Deliverables</a><a href="#quality">Success standards</a><a href="#roles">Contribution areas</a></div></nav>

    <section className={styles.section} id="overview" aria-labelledby="overview-title">
      <div className={styles.sectionHead}><div><span className={styles.eyebrow}>01 · Project brief</span><h2 id="overview-title">Understand the decision this project supports.</h2></div><p className={styles.sectionIntro}>Enough context to judge relevance without turning the public page into the full working brief.</p></div>
      <p className={styles.lead}>{short(challenge.problemStatement||model.project.summary,700)}</p>
      <div className={styles.insights}>
        {challenge.stakeholder&&<article className={styles.insight}><span>Stakeholder</span><h3>{challenge.stakeholder}</h3><p>The person or group whose decision the project is designed to support.</p></article>}
        <article className={`${styles.insight} ${styles.insightDecision}`}><span>Decision to support</span><h3>{short(challenge.decisionToSupport||challenge.primaryObjective||challenge.useCase,180)||'Defined project decision'}</h3><p>The final recommendation must answer this decision directly and stay within the evidence available.</p></article>
        <article className={styles.insight}><span>Project outcome</span><h3>{short(challenge.primaryObjective||challenge.useCase,130)||'A decision-ready project outcome'}</h3><p>What the team must produce so the stakeholder can act responsibly.</p></article>
      </div>
      {(challenge.problemStatement||challenge.businessContext||challenge.useCase||challenge.constraintsTradeOffs.length||challenge.assumptions.length||challenge.outOfScope.length||challenge.responsibleUseRisks.length)&&<details className={styles.details}><summary>View detailed project context</summary><div className={styles.detailBody}>{challenge.businessContext&&<><h3>Business context</h3><p>{challenge.businessContext}</p></>}{challenge.useCase&&<><h3>Primary use case</h3><p>{challenge.useCase}</p></>}{challenge.constraintsTradeOffs.length>0&&<><h3>Constraints</h3><ul>{challenge.constraintsTradeOffs.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.assumptions.length>0&&<><h3>Assumptions</h3><ul>{challenge.assumptions.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.outOfScope.length>0&&<><h3>Out of scope</h3><ul>{challenge.outOfScope.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.responsibleUseRisks.length>0&&<><h3>Responsible use</h3><ul>{challenge.responsibleUseRisks.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul></>}</div></details>}
    </section>

    <section className={styles.section} id="deliverables" aria-labelledby="deliverables-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>02 · Outputs</span><h2 id="deliverables-title">Project deliverables</h2></div><p className={styles.sectionIntro}>The primary outputs are visible first; detailed acceptance evidence stays available on demand.</p></div>
      {previewDeliverables.length?<div className={styles.deliverables}>{previewDeliverables.map((item,index)=><article className={styles.deliverable} key={item.id}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{item.title}</strong>{item.publicSummary&&item.publicSummary!==item.title&&<p>{short(item.publicSummary,150)}</p>}</div></article>)}</div>:<div className={styles.empty}>Detailed deliverables are being finalised.</div>}
      {deliverables.length>previewDeliverables.length&&<details className={styles.details}><summary>View all {deliverables.length} deliverables and acceptance detail</summary><div className={styles.detailBody}>{deliverables.map((item,index)=><div key={item.id}><h3>{String(index+1).padStart(2,'0')} · {item.title}</h3>{item.publicSummary&&item.publicSummary!==item.title&&<p>{item.publicSummary}</p>}{item.acceptanceCriteria&&<p><strong>Acceptance:</strong> {item.acceptanceCriteria}</p>}</div>)}</div></details>}
    </section>

    <section className={styles.section} id="quality" aria-labelledby="quality-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>03 · Quality</span><h2 id="quality-title">Success standards</h2></div><p className={styles.sectionIntro}>Four clear dimensions make the quality bar scannable while retaining the full project criteria for deeper review.</p></div>
      <div className={styles.quality}>{qualityGroups.map(group=><article key={group.title}><h3>{group.title}</h3><ul>{group.items.map(item=><li key={item}>{item}</li>)}</ul></article>)}</div>
      {successCriteria.length>0&&<details className={styles.details}><summary>View all {successCriteria.length} project criteria</summary><div className={styles.detailBody}><ol>{successCriteria.map(item=><li key={item}>{item}</li>)}</ol>{acceptanceChecks.length>0&&<><h3>Acceptance & quality checks</h3><ul>{acceptanceChecks.map(item=><li key={item}>{item}</li>)}</ul></>}{stakeholderHandover&&<><h3>Stakeholder handover</h3><p>{stakeholderHandover}</p></>}</div></details>}
    </section>

    <section className={styles.section} id="roles" aria-labelledby="roles-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>04 · Participation</span><h2 id="roles-title">How you can contribute</h2></div><p className={styles.sectionIntro}>Each contribution area should communicate a distinct mission rather than repeat generic ownership language.</p></div>
      {capabilitySignals.length>0&&<div className={styles.capabilities} aria-label="Capabilities in practice">{capabilitySignals.map(item=><span key={item}>{item}</span>)}</div>}
      {previewRoles.length?<div className={styles.roles}>{previewRoles.map(role=><article className={styles.role} key={role.id}><div className={styles.roleTop}><h3>{role.title}</h3><span className={styles.capacity}>{role.openings} place{role.openings===1?'':'s'}</span></div><p>{roleMission(role)}</p>{role.skills.length>0&&<div className={styles.chips}>{role.skills.slice(0,4).map(skill=><span key={skill}>{skill}</span>)}</div>}{(role.responsibilities?.length||role.experienceExpectation||role.applicationRequirements)&&<details><summary>Role details</summary><div>{role.responsibilities?.length?<ul>{role.responsibilities.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul>:null}{role.experienceExpectation&&<p>{role.experienceExpectation}</p>}{role.applicationRequirements&&<p><strong>Application:</strong> {role.applicationRequirements}</p>}</div></details>}</article>)}</div>:<div className={styles.empty}>Contribution areas are still being prepared.</div>}
      <div className={styles.applyBand}><div><span className={styles.eyebrow}>Interested in contributing?</span><h3>See whether this project fits your next step.</h3><p>Review the published contribution areas, commitment and quality expectations before you continue.</p></div><Link className={styles.primaryButton} href={ctaHref}>{canApply?'Continue to apply':'Open in My Mettelo'}</Link></div>
    </section>

    <div className={styles.mobileAction}><Link className={styles.primaryButton} href={ctaHref}>{canApply?'Continue to apply':authenticated?'Open in My Mettelo':'Sign in to continue'}</Link></div>
  </div>;
}
