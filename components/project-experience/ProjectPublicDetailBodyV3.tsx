import Link from 'next/link';
import type {ProjectExperienceModel} from '@/lib/project-experience-model';
import styles from './ProjectDetailBodyV3.module.css';

type Props={model:ProjectExperienceModel;canApply:boolean;ctaHref:string;authenticated:boolean};
type QualityGroup={title:string;items:string[]};

function short(value:string|null|undefined,max=180){if(!value)return'';const clean=value.replace(/\s+/g,' ').trim();return clean.length<=max?clean:`${clean.slice(0,max).replace(/\s+\S*$/,'')}…`}
function roleMission(role:ProjectExperienceModel['roles'][number]){return short(role.responsibilities?.[0]||role.description||`${role.title} owns a defined project workstream and the evidence produced from it.`,150)}
function qualityGroups(criteria:string[]):QualityGroup[]{
  const definitions=[
    {title:'Data integrity',pattern:/data|source|scope|assumption|exclusion|licen|reconcil|schema|missing/i},
    {title:'Analytical quality',pattern:/model|baseline|error|residual|metric|validation|test|recomput|prediction|interval|extrapolat|heterosced/i},
    {title:'Decision quality',pattern:/decision|recommend|stakeholder|counter|trade-off|failure|revisit|conclusion|responsible/i},
    {title:'Professional delivery',pattern:/deliverable|handover|rerun|reproduc|trace|ownership|work product|evidence pack|broken link/i}
  ];
  const used=new Set<number>();
  const groups=definitions.map(def=>({title:def.title,items:criteria.map((item,index)=>({item,index})).filter(({item,index})=>!used.has(index)&&def.pattern.test(item)).slice(0,2).map(({item,index})=>{used.add(index);return short(item,145)})}));
  const remaining=criteria.map((item,index)=>({item,index})).filter(({index})=>!used.has(index));
  for(const group of groups){while(group.items.length<2&&remaining.length){const next=remaining.shift();if(next)group.items.push(short(next.item,145))}}
  return groups.filter(group=>group.items.length>0);
}

export default function ProjectPublicDetailBodyV3({model,canApply,ctaHref,authenticated}:Props){
  const {challenge,deliverables,successCriteria,acceptanceChecks,stakeholderHandover,capabilities,roles}=model;
  const previewDeliverables=deliverables.slice(0,6);
  const previewRoles=roles.slice(0,6);
  const capabilitySignals=[...capabilities.technical,...capabilities.professional,...capabilities.methodsAndTools].filter((item,index,items)=>items.indexOf(item)===index).slice(0,10);
  const quality=qualityGroups(successCriteria);
  return <div className={styles.body} id="project-content">
    <nav className={styles.nav} aria-label="Project sections"><div className={styles.navInner}><a href="#overview">Overview</a><a href="#deliverables">Deliverables</a><a href="#quality">Success standards</a><a href="#roles">Contribution areas</a></div></nav>

    <section className={styles.section} id="overview" aria-labelledby="overview-title">
      <div className={styles.sectionHead}><div><span className={styles.eyebrow}>01 · Overview</span><h2 id="overview-title">Project overview</h2></div><p className={styles.sectionIntro}>The essential context for deciding whether this project is relevant, with deeper specification available only when needed.</p></div>
      <p className={styles.lead}>{short(challenge.problemStatement||model.project.summary,620)}</p>
      <div className={styles.insights}>
        {challenge.stakeholder&&<article className={styles.insight}><span>Stakeholder</span><h3>{challenge.stakeholder}</h3><p>The person or group whose decision the project is designed to support.</p></article>}
        <article className={`${styles.insight} ${styles.insightDecision}`}><span>Decision to support</span><h3>{short(challenge.decisionToSupport||challenge.primaryObjective||challenge.useCase,180)||'Defined project decision'}</h3><p>The project must answer this decision directly and remain inside the available evidence.</p></article>
        <article className={styles.insight}><span>Project outcome</span><h3>{short(challenge.primaryObjective||challenge.useCase,135)||'A decision-ready project outcome'}</h3><p>The outcome the team must deliver so the stakeholder can act responsibly.</p></article>
      </div>
      {(challenge.businessContext||challenge.useCase||challenge.constraintsTradeOffs.length||challenge.assumptions.length||challenge.outOfScope.length||challenge.responsibleUseRisks.length)&&<details className={styles.details}><summary>View detailed project context</summary><div className={styles.detailBody}>{challenge.businessContext&&<><h3>Business context</h3><p>{challenge.businessContext}</p></>}{challenge.useCase&&<><h3>Primary use case</h3><p>{challenge.useCase}</p></>}{challenge.constraintsTradeOffs.length>0&&<><h3>Constraints</h3><ul>{challenge.constraintsTradeOffs.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.assumptions.length>0&&<><h3>Assumptions</h3><ul>{challenge.assumptions.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.outOfScope.length>0&&<><h3>Out of scope</h3><ul>{challenge.outOfScope.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.responsibleUseRisks.length>0&&<><h3>Responsible use</h3><ul>{challenge.responsibleUseRisks.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul></>}</div></details>}
    </section>

    <section className={styles.section} id="deliverables" aria-labelledby="deliverables-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>02 · Outputs</span><h2 id="deliverables-title">Project deliverables</h2></div><p className={styles.sectionIntro}>Primary outputs stay visible. Acceptance detail is available without turning the page into a specification document.</p></div>
      {previewDeliverables.length?<div className={styles.deliverables}>{previewDeliverables.map((item,index)=><article className={styles.deliverable} key={item.id}><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div><strong>{item.title}</strong>{item.publicSummary&&item.publicSummary!==item.title&&<p>{short(item.publicSummary,165)}</p>}</div></article>)}</div>:<div className={styles.empty} role="status">Detailed deliverables are being finalised.</div>}
      {deliverables.length>previewDeliverables.length&&<details className={styles.details}><summary>View all {deliverables.length} deliverables and acceptance detail</summary><div className={styles.detailBody}>{deliverables.map((item,index)=><div className={styles.detailItem} key={item.id}><h3>{String(index+1).padStart(2,'0')} · {item.title}</h3>{item.publicSummary&&item.publicSummary!==item.title&&<p>{item.publicSummary}</p>}{item.acceptanceCriteria&&<p><strong>Acceptance:</strong> {item.acceptanceCriteria}</p>}</div>)}</div></details>}
    </section>

    <section className={styles.section} id="quality" aria-labelledby="quality-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>03 · Quality</span><h2 id="quality-title">Success standards</h2></div><p className={styles.sectionIntro}>Project-specific criteria are grouped into scannable review dimensions; the complete quality bar remains available below.</p></div>
      {quality.length?<div className={styles.quality}>{quality.map(group=><article key={group.title}><h3>{group.title}</h3><ul>{group.items.map(item=><li key={item}>{item}</li>)}</ul></article>)}</div>:<div className={styles.empty} role="status">Project success standards are being finalised.</div>}
      {successCriteria.length>0&&<details className={styles.details}><summary>View all {successCriteria.length} project criteria</summary><div className={styles.detailBody}><ol>{successCriteria.map(item=><li key={item}>{item}</li>)}</ol>{acceptanceChecks.length>0&&<><h3>Acceptance &amp; quality checks</h3><ul>{acceptanceChecks.map(item=><li key={item}>{item}</li>)}</ul></>}{stakeholderHandover&&<><h3>Stakeholder handover</h3><p>{stakeholderHandover}</p></>}</div></details>}
    </section>

    <section className={styles.section} id="roles" aria-labelledby="roles-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>04 · Participation</span><h2 id="roles-title">How you can contribute</h2></div><p className={styles.sectionIntro}>Contribution areas are presented by ownership and capability so people can recognise fit quickly.</p></div>
      {capabilitySignals.length>0&&<div className={styles.capabilities} aria-label="Capabilities in practice">{capabilitySignals.map(item=><span key={item}>{item}</span>)}</div>}
      {previewRoles.length?<div className={styles.roles}>{previewRoles.map(role=><article className={styles.role} key={role.id}><div className={styles.roleTop}><h3>{role.title}</h3><span className={styles.capacity}>{role.openings} place{role.openings===1?'':'s'}</span></div><p>{roleMission(role)}</p>{role.skills.length>0&&<div className={styles.chips}>{role.skills.slice(0,4).map(skill=><span key={skill}>{skill}</span>)}</div>}{(role.responsibilities?.length||role.experienceExpectation||role.applicationRequirements)&&<details><summary>Role details</summary><div>{role.responsibilities?.length?<ul>{role.responsibilities.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul>:null}{role.experienceExpectation&&<p>{role.experienceExpectation}</p>}{role.applicationRequirements&&<p><strong>Application:</strong> {role.applicationRequirements}</p>}</div></details>}</article>)}</div>:<div className={styles.empty} role="status">Contribution areas are still being prepared.</div>}
      <div className={styles.applyBand}><div><span className={styles.eyebrow}>Interested in contributing?</span><h3>Continue when the project fits your next step.</h3><p>Review the published contribution areas and quality expectations before you continue.</p></div><Link className={styles.primaryButton} href={ctaHref}>{canApply?'Continue to apply':'Open in My Mettelo'}</Link></div>
    </section>

    <div className={styles.mobileAction}><Link className={styles.primaryButton} href={ctaHref}>{canApply?'Continue to apply':authenticated?'Open in My Mettelo':'Sign in to continue'}</Link></div>
  </div>;
}
