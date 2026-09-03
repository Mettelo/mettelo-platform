import Link from 'next/link';
import type {ProjectExperienceModel} from '@/lib/project-experience-model';
import styles from './ProjectPublicDetailV2.module.css';

type Props={model:ProjectExperienceModel;canApply:boolean;ctaHref:string;authenticated:boolean};

function titleCase(value:string|null|undefined){return value?value.replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase()):'Not published'}
function date(value:string|null|undefined){if(!value)return'Not published';const parsed=new Date(value);if(Number.isNaN(parsed.getTime()))return'Not published';return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(parsed)}
function weeks(value:number|null){return value?`${value} ${value===1?'week':'weeks'}`:'Not published'}
function short(value:string|null|undefined,max=260){if(!value)return'';const clean=value.replace(/\s+/g,' ').trim();return clean.length<=max?clean:`${clean.slice(0,max).replace(/\s+\S*$/,'')}…`}
function milestoneWindow(start:number|null,end:number|null){if(start&&end&&start!==end)return`Weeks ${start}–${end}`;if(start||end)return`Week ${start||end}`;return'Project timeline'}

export default function ProjectPublicDetailV2({model,canApply,ctaHref,authenticated}:Props){
  const {project,challenge,resources,deliverables,successCriteria,acceptanceChecks,stakeholderHandover,timeline,capabilities,proofSignals,roles,taxonomy}=model;
  const workingModel=project.locationType?titleCase(project.locationType):project.location||'Project-specific';
  const statusLabel=canApply?'Open for applications':project.status==='pilot'?'Pilot project':'Applications closed';
  const primarySource=resources[0]||null;
  const rolePlaces=roles.reduce((sum,role)=>sum+Math.max(0,role.openings),0);
  const proofConfigured=proofSignals.length>0;
  const previewDeliverables=deliverables.slice(0,6);
  const previewCriteria=successCriteria.slice(0,6);
  const previewRoles=roles.slice(0,6);
  const heroTags=[project.difficultyLevel&&titleCase(project.difficultyLevel),project.durationWeeks&&weeks(project.durationWeeks),project.weeklyCommitment,workingModel,taxonomy.domains[0]?.name].filter((item):item is string=>Boolean(item));
  const fitCopy=`A strong fit is someone who can meet at least one published role expectation${project.weeklyCommitment?`, commit ${project.weeklyCommitment}`:''}${project.difficultyLevel?`, and work at the ${titleCase(project.difficultyLevel)} level`:''}.`;

  return <div className={styles.page}>
    <a className={styles.skip} href="#project-content">Skip to project details</a>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/projects">Projects</Link><span aria-hidden="true">›</span><strong>{project.title}</strong></nav>

    <header className={styles.hero} aria-labelledby="project-title">
      <div className={styles.heroMain}>
        <div className={styles.status}><i aria-hidden="true"/><span>{statusLabel}{taxonomy.domains[0]?.name?` · ${taxonomy.domains[0].name}`:''}</span></div>
        <h1 id="project-title">{project.title}</h1>
        <p className={styles.heroSummary}>{short(project.summary,360)}</p>
        <div className={styles.heroTags} aria-label="Project characteristics">{heroTags.slice(0,5).map(item=><span key={item}>{item}</span>)}</div>
        <div className={styles.heroFoot}><div className={styles.proofBadge}><span aria-hidden="true">{proofConfigured?'✓':'◌'}</span>{proofConfigured?'Evidence opportunity · verification required':'Evidence mapping pending'}</div><div className={styles.projectId}>PROJECT · {project.id.slice(0,8).toUpperCase()}</div></div>
      </div>

      <aside className={styles.decision} aria-labelledby="project-decision-title">
        <div className={styles.decisionTop}><span className={styles.label}>Project opportunity</span><span className={canApply?styles.openPill:styles.neutralPill}>{canApply?'Open':'Closed'}</span></div>
        <h2 id="project-decision-title">Decide whether this is the right project for you.</h2>
        <p>Understand the problem, contribution areas, commitment and quality bar before you apply.</p>
        <dl className={styles.metaGrid}>
          <div><dt>Duration</dt><dd>{weeks(project.durationWeeks)}</dd></div><div><dt>Commitment</dt><dd>{project.weeklyCommitment||'Not published'}</dd></div>
          <div><dt>Team</dt><dd>{project.teamSizeThreshold?`${project.teamSizeThreshold} people`:rolePlaces?`${rolePlaces} places`:'Not published'}</dd></div><div><dt>Format</dt><dd>{workingModel}</dd></div>
          <div><dt>Level</dt><dd>{project.difficultyLevel?titleCase(project.difficultyLevel):'Not published'}</dd></div><div><dt>Applications close</dt><dd>{date(project.applicationDeadline)}</dd></div>
        </dl>
        <Link className={styles.primaryButton} href={ctaHref}>{canApply?'Continue to apply':'Open in My Mettelo'}</Link>
        <small>{authenticated?'Your eligibility, role capacity and application state are checked in My Mettelo.':'Sign in or create an account to continue with this project.'}</small>
        {primarySource&&<article className={styles.sourceCard}><div className={styles.sourceHead}><span>Data source</span><b className={styles.verified}>● Governed</b></div><h3>{primarySource.name}</h3><p>{primarySource.providerName||titleCase(primarySource.sourceType)}</p>{primarySource.licenceName&&<span className={styles.sourceMeta}>Licence · {primarySource.licenceName}</span>}<p className={styles.disclaimer}>Public project pages show approved source metadata only. Direct resource and stored-copy links remain protected.</p></article>}
      </aside>
    </header>

    <section className={styles.valueStrip} aria-label="Project summary">
      <div><span>Decision</span><strong>{short(challenge.decisionToSupport||challenge.primaryObjective||challenge.useCase,120)||'Defined project decision'}</strong></div>
      <div><span>Outputs</span><strong>{deliverables.length?`${deliverables.length} deliverables`:'Being finalised'}</strong></div>
      <div><span>Roles</span><strong>{roles.length?`${roles.length} contribution areas`:'Being finalised'}</strong></div>
      <div><span>Evidence</span><strong>{proofConfigured?`${proofSignals.length} evidence areas`:'Mapping pending'}</strong></div>
    </section>

    <main id="project-content" className={styles.content}>
      <section className={styles.section} aria-labelledby="challenge-title">
        <span className={styles.kicker}>01 · Understand the challenge</span><h2 id="challenge-title">What decision does this project need to improve?</h2>
        <p className={styles.lead}>{short(challenge.problemStatement||project.summary,520)}</p>
        <div className={styles.decisionGrid}>
          {challenge.stakeholder&&<article><span>Stakeholder</span><strong>{challenge.stakeholder}</strong></article>}
          {challenge.decisionToSupport&&<article><span>Decision to support</span><strong>{challenge.decisionToSupport}</strong></article>}
          {challenge.primaryObjective&&<article><span>Primary objective</span><strong>{challenge.primaryObjective}</strong></article>}
        </div>
        {(challenge.problemStatement||challenge.businessContext||challenge.useCase||challenge.constraintsTradeOffs.length||challenge.assumptions.length)&&<details className={styles.specDetails}><summary>View full challenge and scope</summary><div className={styles.specBody}>{challenge.problemStatement&&<><h3>Full challenge</h3><p>{challenge.problemStatement}</p></>}{challenge.businessContext&&<><h3>Business context</h3><p>{challenge.businessContext}</p></>}{challenge.useCase&&<><h3>Primary use case</h3><p>{challenge.useCase}</p></>}{challenge.keyQuestions.length>0&&<><h3>Questions the team must answer</h3><ul>{challenge.keyQuestions.map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.inScope.length>0&&<><h3>In scope</h3><ul>{challenge.inScope.map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.outOfScope.length>0&&<><h3>Out of scope</h3><ul>{challenge.outOfScope.map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.constraintsTradeOffs.length>0&&<><h3>Constraints & trade-offs</h3><ul>{challenge.constraintsTradeOffs.map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.assumptions.length>0&&<><h3>Explicit assumptions</h3><ul>{challenge.assumptions.map(item=><li key={item}>{item}</li>)}</ul></>}</div></details>}
      </section>

      <section className={styles.section} aria-labelledby="data-title"><span className={styles.kicker}>02 · Data & trust</span><h2 id="data-title">Know what the team will work with.</h2>
        {resources.length?<div className={styles.compactGrid}>{resources.map(resource=><article key={resource.id}><span>{resource.governanceStatus==='green'?'Governed source':'Approved source'}</span><h3>{resource.name}</h3>{resource.description&&<p>{short(resource.description,220)}</p>}<dl><div><dt>Provider</dt><dd>{resource.providerName||titleCase(resource.sourceType)}</dd></div>{resource.licenceName&&<div><dt>Licence</dt><dd>{resource.licenceName}</dd></div>}{resource.requiredSubset&&<div><dt>Required scope</dt><dd>{resource.requiredSubset}</dd></div>}</dl></article>)}</div>:<div className={styles.empty}><strong>No approved public resource is available yet.</strong><span>Private or unverified resources are never exposed as a fallback.</span></div>}
      </section>

      <section className={styles.section} aria-labelledby="deliverables-title"><span className={styles.kicker}>03 · What you will produce</span><h2 id="deliverables-title">Professional outputs with a clear purpose.</h2>
        {previewDeliverables.length?<div className={styles.outputList}>{previewDeliverables.map((item,index)=><article key={item.id}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{item.title}</strong>{item.publicSummary&&item.publicSummary!==item.title&&<p>{short(item.publicSummary,180)}</p>}</div></article>)}</div>:<div className={styles.empty}><strong>Detailed deliverables are being finalised.</strong></div>}
        {deliverables.length>previewDeliverables.length&&<details className={styles.specDetails}><summary>View all {deliverables.length} deliverables and acceptance detail</summary><div className={styles.specBody}>{deliverables.map((item,index)=><article className={styles.detailItem} key={item.id}><span>{String(index+1).padStart(2,'0')}</span><div><h3>{item.title}</h3>{item.publicSummary&&item.publicSummary!==item.title&&<p>{item.publicSummary}</p>}{item.acceptanceCriteria&&item.acceptanceCriteria!==item.title&&<p><strong>Acceptance:</strong> {item.acceptanceCriteria}</p>}</div></article>)}</div></details>}
      </section>

      <section className={styles.section} aria-labelledby="success-title"><span className={styles.kicker}>04 · Quality bar</span><h2 id="success-title">Know how good work will be judged.</h2>
        {previewCriteria.length?<div className={styles.criteria}>{previewCriteria.map((item,index)=><div key={item}><span>{index+1}</span><p>{short(item,220)}</p></div>)}</div>:<div className={styles.empty}><strong>Success criteria are being finalised.</strong></div>}
        {successCriteria.length>previewCriteria.length&&<details className={styles.specDetails}><summary>View all {successCriteria.length} success criteria</summary><div className={styles.specBody}><ol>{successCriteria.map(item=><li key={item}>{item}</li>)}</ol>{acceptanceChecks.length>0&&<><h3>Acceptance & quality checks</h3><ul>{acceptanceChecks.map(item=><li key={item}>{item}</li>)}</ul></>}{stakeholderHandover&&<><h3>Stakeholder handover</h3><p>{stakeholderHandover}</p></>}</div></details>}
      </section>

      <section className={styles.section} aria-labelledby="capability-title"><span className={styles.kicker}>05 · Capability & evidence</span><h2 id="capability-title">What this work can help you practise and evidence.</h2>
        <p className={styles.lead}>These are evidence opportunities, not automatic Proof awards. Your own contribution must still be completed and verified.</p>
        <div className={styles.capabilityGrid}><article><span>Technical</span><div>{capabilities.technical.length?capabilities.technical.slice(0,8).map(item=><b key={item}>{item}</b>):<em>Mapping pending</em>}</div></article><article><span>Professional</span><div>{capabilities.professional.length?capabilities.professional.slice(0,8).map(item=><b key={item}>{item}</b>):<em>Mapping pending</em>}</div></article><article><span>Methods & tools</span><div>{capabilities.methodsAndTools.length?capabilities.methodsAndTools.slice(0,8).map(item=><b key={item}>{item}</b>):<em>Mapping pending</em>}</div></article></div>
      </section>

      <section className={styles.section} aria-labelledby="roles-title"><span className={styles.kicker}>06 · Contribution areas</span><h2 id="roles-title">Choose where you can contribute.</h2>
        {previewRoles.length?<div className={styles.roleGrid}>{previewRoles.map(role=><article key={role.id}><div><h3>{role.title}</h3><span>{role.openings} place{role.openings===1?'':'s'}</span></div><p>{short(role.responsibilities?.[0]||role.description||'Project-specific ownership and delivery responsibility.',220)}</p>{role.skills.length>0&&<div className={styles.chips}>{role.skills.slice(0,4).map(skill=><b key={skill}>{skill}</b>)}</div>}{(role.responsibilities?.length||role.experienceExpectation||role.applicationRequirements)&&<details><summary>Role details</summary><div>{role.responsibilities?.length?<ul>{role.responsibilities.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul>:null}{role.experienceExpectation&&<p>{role.experienceExpectation}</p>}{role.applicationRequirements&&<p><strong>Application:</strong> {role.applicationRequirements}</p>}</div></details>}</article>)}</div>:<div className={styles.empty}><strong>Contribution areas are still being prepared.</strong></div>}
      </section>

      <section className={styles.section} aria-labelledby="journey-title"><span className={styles.kicker}>07 · Delivery journey</span><h2 id="journey-title">From application to handover.</h2>
        {timeline.length?<div className={styles.timeline}>{timeline.slice(0,6).map(item=><article key={item.id}><span>{milestoneWindow(item.weekStart,item.weekEnd)}</span><div><strong>{item.title}</strong>{item.description&&<p>{short(item.description,220)}</p>}</div></article>)}</div>:<div className={styles.journey}><div><span>1</span><p><strong>Apply</strong>Choose the contribution area that best fits your capability.</p></div><div><span>2</span><p><strong>Join the authorised workspace</strong>Accepted members receive the canonical project brief and approved resources in Mettelo Lab.</p></div><div><span>3</span><p><strong>Deliver and verify</strong>Complete assigned work, review evidence and close with a professional handover.</p></div></div>}
      </section>

      <section className={styles.applySection} aria-labelledby="apply-title"><div><span className={styles.kicker}>Before you apply</span><h2 id="apply-title">Know the expectation before you commit.</h2><p>{fitCopy}</p></div><div><Link className={styles.primaryButton} href={ctaHref}>{canApply?'Continue to apply':'Open in My Mettelo'}</Link><small>{authenticated?'Your project context is preserved.':'Sign in or create an account to continue.'}</small></div></section>
    </main>

    <div className={styles.mobileCta}><Link href={ctaHref}>{canApply?'Continue to apply':'Open in My Mettelo'}</Link></div>
  </div>;
}
