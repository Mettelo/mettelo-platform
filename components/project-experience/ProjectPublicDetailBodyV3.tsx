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
function weekRange(start:number|null,end:number|null){if(start&&end)return start===end?`Week ${start}`:`Weeks ${start}–${end}`;if(start)return`From week ${start}`;if(end)return`By week ${end}`;return'Project timeline'}

export default function ProjectPublicDetailBodyV3({model,canApply,ctaHref,authenticated}:Props){
  const {challenge,deliverables,successCriteria,acceptanceChecks,stakeholderHandover,capabilities,roles,resources,timeline,proofSignals,project}=model;
  const previewDeliverables=deliverables.slice(0,6);
  const previewRoles=roles.slice(0,6);
  const capabilitySignals=[...capabilities.technical,...capabilities.professional,...capabilities.methodsAndTools].filter((item,index,items)=>items.indexOf(item)===index).slice(0,10);
  const quality=qualityGroups(successCriteria);
  const hasScope=challenge.inScope.length>0||challenge.outOfScope.length>0;
  const min=project.minTeamSize||project.teamSizeThreshold||null;
  const target=project.targetTeamSize||min;
  const max=project.maxTeamSize||target;
  const teamSummary=project.participationMode==='solo'?'Solo project':project.participationMode==='flexible'?'Solo or collaborative participation':project.participationMode==='team'?'Collaborative team project':min===1?'Solo project':min?'Collaborative team project':'Participation model published in the project overview';
  return <div className={styles.body} id="project-content">
    <nav className={styles.nav} aria-label="Project sections"><div className={styles.navInner}><a href="#overview">Overview</a><a href="#scope">Scope &amp; resources</a><a href="#deliverables">Deliverables</a><a href="#quality">Success standards</a><a href="#timeline">Timeline &amp; Proof</a><a href="#roles">Contribution areas</a></div></nav>

    <section className={styles.section} id="overview" aria-labelledby="overview-title">
      <div className={styles.sectionHead}><div><span className={styles.eyebrow}>01 · Overview</span><h2 id="overview-title">Project overview</h2></div><p className={styles.sectionIntro}>The essential context for deciding whether this project is relevant, with deeper specification available only when needed.</p></div>
      <p className={styles.lead}>{short(challenge.problemStatement||model.project.summary,620)}</p>
      <div className={styles.insights}>
        {challenge.stakeholder&&<article className={styles.insight}><span>Stakeholder</span><h3>{challenge.stakeholder}</h3><p>The person or group whose decision the project is designed to support.</p></article>}
        <article className={`${styles.insight} ${styles.insightDecision}`}><span>Primary objective</span><h3>{short(challenge.primaryObjective||challenge.decisionToSupport||challenge.useCase,180)||'Defined project objective'}</h3><p>The project should connect its work to this outcome rather than generic activity.</p></article>
        <article className={styles.insight}><span>Decision / use case</span><h3>{short(challenge.decisionToSupport||challenge.useCase,135)||'A decision-ready project outcome'}</h3><p>The expected outcome should remain inside the evidence available to the team.</p></article>
      </div>
      {(challenge.businessContext||challenge.useCase||challenge.supportingObjectives.length||challenge.keyQuestions.length||challenge.constraintsTradeOffs.length||challenge.assumptions.length||challenge.responsibleUseRisks.length)&&<details className={styles.details} open><summary>Project context, objectives and questions</summary><div className={styles.detailBody}>{challenge.businessContext&&<><h3>Business context</h3><p>{challenge.businessContext}</p></>}{challenge.useCase&&<><h3>Primary use case</h3><p>{challenge.useCase}</p></>}{challenge.supportingObjectives.length>0&&<><h3>Supporting objectives</h3><ol>{challenge.supportingObjectives.map(item=><li key={item}>{item}</li>)}</ol></>}{challenge.keyQuestions.length>0&&<><h3>Key questions</h3><ul>{challenge.keyQuestions.map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.constraintsTradeOffs.length>0&&<><h3>Constraints and trade-offs</h3><ul>{challenge.constraintsTradeOffs.slice(0,6).map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.assumptions.length>0&&<><h3>Assumptions</h3><ul>{challenge.assumptions.slice(0,6).map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.responsibleUseRisks.length>0&&<><h3>Responsible use</h3><ul>{challenge.responsibleUseRisks.slice(0,6).map(item=><li key={item}>{item}</li>)}</ul></>}</div></details>}
    </section>

    <section className={styles.section} id="scope" aria-labelledby="scope-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>02 · Scope &amp; resources</span><h2 id="scope-title">What the project covers</h2></div><p className={styles.sectionIntro}>Scope and governed public resources make the work boundary and data provenance clear before a visitor continues.</p></div>
      {hasScope?<div className={styles.quality}>{challenge.inScope.length>0&&<article><h3>In scope</h3><ul>{challenge.inScope.map(item=><li key={item}>{item}</li>)}</ul></article>}{challenge.outOfScope.length>0&&<article><h3>Out of scope</h3><ul>{challenge.outOfScope.map(item=><li key={item}>{item}</li>)}</ul></article>}</div>:<div className={styles.empty} role="status">Detailed scope boundaries are being finalised.</div>}
      {resources.length>0?<details className={styles.details} open><summary>Public resources and source provenance</summary><div className={styles.detailBody}>{resources.map(resource=><div className={styles.detailItem} key={resource.id}><h3>{resource.name}</h3>{resource.description&&<p>{resource.description}</p>}<p><strong>Source/provider:</strong> {resource.providerName||resource.sourceType||'Not published'}</p>{resource.licenceName&&<p><strong>Licence:</strong> {resource.licenceName}</p>}{resource.dataPeriod&&<p><strong>Data period:</strong> {resource.dataPeriod}</p>}{resource.dataFormat&&<p><strong>Format:</strong> {resource.dataFormat}</p>}{resource.requiredSubset&&<p><strong>Required subset:</strong> {resource.requiredSubset}</p>}{resource.knownLimitations&&<p><strong>Known limitations:</strong> {resource.knownLimitations}</p>}</div>)}</div></details>:<div className={styles.empty} role="status">No governed public resource metadata is currently published for this project.</div>}
    </section>

    <section className={styles.section} id="deliverables" aria-labelledby="deliverables-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>03 · Outputs</span><h2 id="deliverables-title">Project deliverables</h2></div><p className={styles.sectionIntro}>Primary outputs stay visible. Acceptance detail is available without turning the page into a specification document.</p></div>
      {previewDeliverables.length?<div className={styles.deliverables}>{previewDeliverables.map((item,index)=><article className={styles.deliverable} key={item.id}><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div><strong>{item.title}</strong>{item.publicSummary&&item.publicSummary!==item.title&&<p>{short(item.publicSummary,165)}</p>}</div></article>)}</div>:<div className={styles.empty} role="status">Detailed deliverables are being finalised.</div>}
      {deliverables.length>previewDeliverables.length&&<details className={styles.details}><summary>View all {deliverables.length} deliverables and acceptance detail</summary><div className={styles.detailBody}>{deliverables.map((item,index)=><div className={styles.detailItem} key={item.id}><h3>{String(index+1).padStart(2,'0')} · {item.title}</h3>{item.publicSummary&&item.publicSummary!==item.title&&<p>{item.publicSummary}</p>}{item.acceptanceCriteria&&<p><strong>Acceptance:</strong> {item.acceptanceCriteria}</p>}</div>)}</div></details>}
    </section>

    <section className={styles.section} id="quality" aria-labelledby="quality-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>04 · Quality</span><h2 id="quality-title">Success standards</h2></div><p className={styles.sectionIntro}>These are project quality criteria, not automatic verified Proof.</p></div>
      {quality.length?<div className={styles.quality}>{quality.map(group=><article key={group.title}><h3>{group.title}</h3><ul>{group.items.map(item=><li key={item}>{item}</li>)}</ul></article>)}</div>:<div className={styles.empty} role="status">Project success standards are being finalised.</div>}
      {successCriteria.length>0&&<details className={styles.details}><summary>View all {successCriteria.length} project criteria</summary><div className={styles.detailBody}><ol>{successCriteria.map(item=><li key={item}>{item}</li>)}</ol>{acceptanceChecks.length>0&&<><h3>Acceptance &amp; quality checks</h3><ul>{acceptanceChecks.map(item=><li key={item}>{item}</li>)}</ul></>}{stakeholderHandover&&<><h3>Stakeholder handover</h3><p>{stakeholderHandover}</p></>}</div></details>}
    </section>

    <section className={styles.section} id="timeline" aria-labelledby="timeline-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>05 · Timeline &amp; Proof potential</span><h2 id="timeline-title">How the work may progress and what it may evidence</h2></div><p className={styles.sectionIntro}>Milestones describe the planned work. Evidence areas describe potential Proof only; verification requires the later Mettelo evidence and review process.</p></div>
      {timeline.length>0?<div className={styles.deliverables}>{timeline.map((item,index)=><article className={styles.deliverable} key={item.id}><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div><strong>{item.title}</strong><p>{weekRange(item.weekStart,item.weekEnd)}{item.expectedOutput?` · ${item.expectedOutput}`:''}</p>{item.description&&<p>{short(item.description,180)}</p>}</div></article>)}</div>:<div className={styles.empty} role="status">A detailed public milestone sequence is not currently published.</div>}
      <details className={styles.details} open><summary>Potential evidence from this project</summary><div className={styles.detailBody}>{proofSignals.length>0?<ul>{proofSignals.map(item=><li key={item}>{item}</li>)}</ul>:<p>Evidence mapping is still being configured for this project.</p>}<p><strong>Important:</strong> completing a project does not automatically create verified Mettelo Proof. Evidence must still pass the later review and verification process.</p></div></details>
    </section>

    <section className={styles.section} id="roles" aria-labelledby="roles-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>06 · Participation</span><h2 id="roles-title">How you can contribute</h2></div><p className={styles.sectionIntro}>Contribution areas are informational here. Detailed eligibility and role selection happen only after authentication.</p></div>
      <div className={styles.insights}><article className={styles.insight}><span>Participation</span><h3>{teamSummary}</h3><p>{min&&max?`Published capacity ${min===max?min:`${min}–${max}`} participant${max===1?'':'s'}${target?` · target ${target}`:''}.`:'See the project overview for the published participation context.'}</p></article><article className={styles.insight}><span>Basic eligibility</span><h3>{canApply?'Currently accepting interest':'Not currently accepting interest'}</h3><p>Public contribution areas help you judge fit. Account-level readiness, eligibility and role selection are checked after authentication.</p></article></div>
      {capabilitySignals.length>0&&<div className={styles.capabilities} aria-label="Capabilities in practice">{capabilitySignals.map(item=><span key={item}>{item}</span>)}</div>}
      {previewRoles.length?<div className={styles.roles}>{previewRoles.map(role=><article className={styles.role} key={role.id}><div className={styles.roleTop}><h3>{role.title}</h3><span className={styles.capacity}>{role.openings} place{role.openings===1?'':'s'}</span></div><p>{roleMission(role)}</p>{role.skills.length>0&&<div className={styles.chips}>{role.skills.slice(0,4).map(skill=><span key={skill}>{skill}</span>)}</div>}{(role.responsibilities?.length||role.experienceExpectation)&&<details><summary>Contribution details</summary><div>{role.responsibilities?.length?<ul>{role.responsibilities.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul>:null}{role.experienceExpectation&&<p>{role.experienceExpectation}</p>}</div></details>}</article>)}</div>:<div className={styles.empty} role="status">Contribution areas are still being prepared.</div>}
      <div className={styles.applyBand}><div><span className={styles.eyebrow}>Interested in contributing?</span><h3>Continue when the project fits your next step.</h3><p>Review the published contribution areas and quality expectations before you continue.</p></div>{canApply?<Link className={styles.primaryButton} href={ctaHref}>Submit interest</Link>:<span className={styles.primaryButton} aria-disabled="true">Interest closed</span>}</div>
    </section>

    <div className={styles.mobileAction}>{canApply?<Link className={styles.primaryButton} href={ctaHref}>Submit interest</Link>:<span className={styles.primaryButton} aria-disabled="true">Interest closed</span>}<span className="sr-only">{authenticated?'Continue in My Mettelo after selecting Submit interest.':'Sign in or create an account after selecting Submit interest.'}</span></div>
  </div>;
}
