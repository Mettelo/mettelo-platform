import Link from 'next/link';
import type {ProjectExperienceModel} from '@/lib/project-experience-model';
import styles from './ProjectPublicDetailV2.module.css';

type Props={
  model:ProjectExperienceModel;
  canApply:boolean;
  ctaHref:string;
  authenticated:boolean;
};

function titleCase(value:string|null|undefined){return value?value.replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase()):'Not published'}
function date(value:string|null|undefined){return value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)):'Not published'}
function weeks(value:number|null){return value?`${value} ${value===1?'week':'weeks'}`:'Not published'}
function milestoneWindow(start:number|null,end:number|null){
  if(start&&end&&start!==end)return`Weeks ${start}–${end}`;
  if(start||end)return`Week ${start||end}`;
  return'Project timeline';
}

export default function ProjectPublicDetailV2({model,canApply,ctaHref,authenticated}:Props){
  const {project,challenge,resources,deliverables,successCriteria,timeline,capabilities,proofSignals,roles,taxonomy}=model;
  const workingModel=project.locationType?titleCase(project.locationType):project.location||'Project-specific';
  const statusLabel=canApply?'Applications open':project.status==='pilot'?'Pilot project':'Applications closed';
  const primarySource=resources[0]||null;
  const rolePlaces=roles.reduce((sum,role)=>sum+Math.max(0,role.openings),0);
  const sectionLinks=[
    challenge.problemStatement&&['challenge','The challenge'],
    (challenge.businessContext||challenge.useCase||challenge.primaryObjective)&&['context','Context & objective'],
    resources.length&&['resources','Data & resources'],
    deliverables.length&&['deliverables','Deliverables'],
    successCriteria.length&&['success','Success criteria'],
    (proofSignals.length||capabilities.technical.length||capabilities.professional.length)&&['proof','What you can prove'],
    timeline.length&&['timeline','Timeline'],
    roles.length&&['roles','Available roles'],
    ['apply','Application']
  ].filter(Boolean) as [string,string][];

  return <div className={styles.page}>
    <a className={styles.skip} href="#project-content">Skip to project details</a>

    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <Link href="/projects">Projects</Link><span aria-hidden="true">/</span><strong>{project.title}</strong>
    </nav>

    <header className={styles.hero} aria-labelledby="project-title">
      <div className={styles.heroMain}>
        <div className={styles.status}><i aria-hidden="true"/><span>{statusLabel}</span></div>
        <h1 id="project-title">{project.title}</h1>
        <p className={styles.heroSummary}>{project.summary}</p>
        <div className={styles.heroTags} aria-label="Project characteristics">
          {taxonomy.domains.slice(0,2).map(item=><span key={item.slug}>{item.name}</span>)}
          {project.projectType&&<span>{titleCase(project.projectType)} project</span>}
          {project.difficultyLevel&&<span>{titleCase(project.difficultyLevel)}</span>}
          {project.partnerName&&<span>{project.partnerName}</span>}
        </div>
        <div className={styles.heroFoot}><div className={styles.proofBadge}><span aria-hidden="true">◌</span>Contribution can become verified Mettelo Proof</div><div className={styles.projectId}>PROJECT<br/>{project.id.slice(0,8).toUpperCase()}</div></div>
      </div>

      <aside className={styles.decision} aria-labelledby="project-decision-title">
        <div className={styles.decisionTop}><span className={styles.label}>Before you apply</span><span className={canApply?styles.openPill:styles.neutralPill}>{statusLabel}</span></div>
        <h2 id="project-decision-title">{canApply?'Is this project right for you?':'Review the opportunity'}</h2>
        <p>{canApply?'Review the problem, expected outputs, data, quality bar and available roles before committing.':'The project brief remains available to review. Application becomes available only when recruitment and role capacity allow it.'}</p>
        <Link className={styles.primaryButton} href={ctaHref}>{canApply?'Apply for a role':'Continue in My Mettelo'}</Link>
        <small>{authenticated?'Your eligibility and application state will be checked in My Mettelo.':'Sign in or create your account and you will return to this project.'}</small>
        <dl className={styles.metaGrid}>
          <div><dt>Duration</dt><dd>{weeks(project.durationWeeks)}</dd></div>
          <div><dt>Commitment</dt><dd>{project.weeklyCommitment||'Not published'}</dd></div>
          <div><dt>Working model</dt><dd>{workingModel}</dd></div>
          <div><dt>Applications close</dt><dd>{date(project.applicationDeadline)}</dd></div>
          <div><dt>Published roles</dt><dd>{roles.length}</dd></div>
          <div><dt>Available places</dt><dd>{rolePlaces||'Not published'}</dd></div>
        </dl>
        {primarySource&&<article className={styles.sourceCard} aria-label="Primary public project source">
          <div className={styles.sourceHead}><span>Primary data source</span><b>Public</b></div>
          <div className={styles.sourceBody}><div className={styles.sourceMark} aria-hidden="true">↗</div><div><h3>{primarySource.name}</h3><p>{primarySource.sourceType?titleCase(primarySource.sourceType):'External source'}</p></div></div>
          {primarySource.provenance&&<p className={styles.sourceProvenance}>{primarySource.provenance}</p>}
          {primarySource.externalUrl&&<a href={primarySource.externalUrl} target="_blank" rel="noreferrer">View original source</a>}
          <p className={styles.disclaimer}>Source identification is provided for attribution and transparency and does not imply sponsorship, endorsement or partnership with Mettelo.</p>
        </article>}
      </aside>
    </header>

    <section className={styles.valueStrip} aria-label="Project at a glance">
      <div><span>Problem domain</span><strong>{taxonomy.domains[0]?.name||'Not yet mapped'}</strong><small>Context for the work</small></div>
      <div><span>Delivery format</span><strong>{workingModel}</strong><small>{project.location||'Project-specific location'}</small></div>
      <div><span>Contribution</span><strong>{roles.length?`${roles.length} role${roles.length===1?'':'s'}`:'Roles pending'}</strong><small>{rolePlaces?`${rolePlaces} published place${rolePlaces===1?'':'s'}`:'Capacity not published'}</small></div>
      <div><span>Evidence</span><strong>{proofSignals.length?'Proof potential':'Evidence mapping pending'}</strong><small>Only completed, verified contribution becomes Proof</small></div>
    </section>

    <div id="project-content" className={styles.contentGrid}>
      <aside className={styles.sectionNav} aria-label="On this project page"><div><span>On this page</span>{sectionLinks.map(([id,label])=><a key={id} href={`#${id}`}>{label}</a>)}</div></aside>
      <main className={styles.content}>
        <section id="challenge" className={styles.section} aria-labelledby="challenge-title"><span className={styles.kicker}>01 · The challenge</span><h2 id="challenge-title">Understand the problem before choosing the project.</h2><p className={styles.lead}>{challenge.problemStatement||project.summary}</p><div className={styles.challengeCard}><div><span className={styles.cardLabel}>Problem statement</span><p>{challenge.problemStatement||'A detailed problem statement has not been published yet. Mettelo will not infer one from incomplete project data.'}</p></div><aside><span>Who is affected</span><strong>{challenge.stakeholder||'Stakeholder detail pending'}</strong><p>Only verified project context is shown here.</p></aside></div></section>

        {(challenge.businessContext||challenge.useCase||challenge.primaryObjective)&&<section id="context" className={styles.section} aria-labelledby="context-title"><span className={styles.kicker}>02 · Context & objective</span><h2 id="context-title">What the work needs to change or support.</h2><div className={styles.twoCards}>{challenge.businessContext&&<article><h3>Business context</h3><p>{challenge.businessContext}</p></article>}{challenge.useCase&&<article><h3>Primary use case</h3><p>{challenge.useCase}</p></article>}</div>{challenge.primaryObjective&&<div className={styles.objective}><span>01</span><div><strong>Primary objective</strong><p>{challenge.primaryObjective}</p></div></div>}{challenge.supportingObjectives.map((item,index)=><div className={styles.objective} key={item}><span>{String(index+2).padStart(2,'0')}</span><div><strong>Supporting objective</strong><p>{item}</p></div></div>)}</section>}

        <section id="resources" className={styles.section} aria-labelledby="resources-title"><span className={styles.kicker}>03 · Data & resources</span><h2 id="resources-title">Know what the team will work with.</h2><p className={styles.lead}>Only resources explicitly classified as public and permitted for publication appear here. Team-only and restricted links remain inside authorised Mettelo Lab access.</p>{resources.length?<div className={styles.resourceGrid}>{resources.map(resource=><article key={resource.id}><div className={styles.resourceTop}><span>{resource.sourceType?titleCase(resource.sourceType):'Resource'}</span><b>Public</b></div><h3>{resource.name}</h3>{resource.description&&<p>{resource.description}</p>}<dl>{resource.dataFormat&&<div><dt>Format</dt><dd>{resource.dataFormat}</dd></div>}{resource.dataPeriod&&<div><dt>Period</dt><dd>{resource.dataPeriod}</dd></div>}</dl>{resource.knownLimitations&&<p><strong>Known limitations:</strong> {resource.knownLimitations}</p>}{resource.externalUrl&&<a href={resource.externalUrl} target="_blank" rel="noreferrer">View original source ↗</a>}</article>)}</div>:<div className={styles.empty}><strong>No public resource has been approved for publication yet.</strong><span>Private project resources are intentionally not exposed as a fallback.</span></div>}</section>

        <section id="deliverables" className={styles.section} aria-labelledby="deliverables-title"><span className={styles.kicker}>04 · Delivery expectations</span><h2 id="deliverables-title">What the team is expected to produce.</h2>{deliverables.length?<div className={styles.deliverables}>{deliverables.map((item,index)=><article key={item.id}><div><span>{String(index+1).padStart(2,'0')}</span>{item.isRequired&&<b>Required</b>}</div><strong>{item.title}</strong>{item.deliverableType&&<p>{titleCase(item.deliverableType)}</p>}{item.acceptanceCriteria&&<p>{item.acceptanceCriteria}</p>}</article>)}</div>:<div className={styles.empty}><strong>Detailed deliverables have not been published.</strong><span>This is treated as a project-readiness gap, not filled with generic output assumptions.</span></div>}</section>

        <section id="success" className={styles.section} aria-labelledby="success-title"><span className={styles.kicker}>05 · Quality bar</span><h2 id="success-title">How good work will be recognised.</h2>{successCriteria.length?<div className={styles.criteria}>{successCriteria.map(item=><div key={item}><span aria-hidden="true">✓</span><p>{item}</p></div>)}</div>:<div className={styles.empty}><strong>Success criteria are not yet published.</strong><span>Mettelo will not invent a quality bar where the canonical project record is incomplete.</span></div>}</section>

        <section id="proof" className={`${styles.section} ${styles.proofSection}`} aria-labelledby="proof-title"><span className={styles.kicker}>06 · Capability & evidence</span><h2 id="proof-title">What you could credibly prove through the work.</h2><p className={styles.lead}>These are evidence opportunities, not automatic awards. Mettelo Proof still requires completed contribution and verification.</p><div className={styles.proofGrid}>{proofSignals.length?proofSignals.map((item,index)=><article key={item}><span>{String(index+1).padStart(2,'0')}</span><strong>{item}</strong><p>Potential evidence signal when your contribution is completed and verified.</p></article>):<article><span>—</span><strong>Evidence mapping pending</strong><p>The project can be explored without overstating what it proves.</p></article>}</div><div className={styles.capabilityRows}><div><b>Technical</b><p>{capabilities.technical.length?capabilities.technical.join(' · '):'Not yet mapped'}</p></div><div><b>Professional</b><p>{capabilities.professional.length?capabilities.professional.join(' · '):'Not yet mapped'}</p></div><div><b>Methods & tools</b><p>{capabilities.methodsAndTools.length?capabilities.methodsAndTools.join(' · '):'Not yet mapped'}</p></div></div></section>

        <section id="timeline" className={styles.section} aria-labelledby="timeline-title"><span className={styles.kicker}>07 · Project timeline</span><h2 id="timeline-title">See the planned progression before you commit.</h2><p className={styles.lead}>This is the published project plan, not live Lab task status. Execution updates remain inside the authorised project workspace.</p>{timeline.length?<div className={styles.deliverables}>{timeline.map((item,index)=><article key={item.id}><div><span>{String(index+1).padStart(2,'0')}</span><b>{milestoneWindow(item.weekStart,item.weekEnd)}</b></div><strong>{item.title}</strong>{item.description&&<p>{item.description}</p>}{item.expectedOutput&&<p><strong>Expected output:</strong> {item.expectedOutput}</p>}</article>)}</div>:<div className={styles.empty}><strong>A detailed project timeline has not been published yet.</strong><span>Mettelo does not expose live Lab task state as a substitute for an approved project plan.</span></div>}</section>

        <section id="roles" className={styles.section} aria-labelledby="roles-title"><span className={styles.kicker}>08 · Available roles</span><h2 id="roles-title">Choose the responsibility you want to own.</h2>{roles.length?<div className={styles.roles}>{roles.map(role=><article key={role.id}><div><h3>{role.title}</h3>{role.discipline&&<span>{role.discipline}</span>}</div><p>{role.description||'Role detail is being completed.'}</p><div><span>{role.openings} place{role.openings===1?'':'s'}</span>{role.skills.slice(0,5).map(skill=><span key={skill}>{skill}</span>)}</div></article>)}</div>:<div className={styles.empty}><strong>No participation roles are published yet.</strong><span>This project remains discoverable but is not ready for role application.</span></div>}</section>

        <section id="apply" className={styles.applyBanner} aria-labelledby="apply-title"><div><span className={styles.kicker}>09 · Application</span><h2 id="apply-title">Ready to take the next step?</h2><p>{canApply?'Continue to My Mettelo to check profile readiness, choose an available role and complete the application.':'You can continue to My Mettelo to review your project state. Application stays unavailable until the project is recruiting with capacity.'}</p></div><div><Link href={ctaHref}>{canApply?'Apply for a role':'Open in My Mettelo'}</Link><small>{authenticated?'Your project context is preserved.':'Sign in returns you here.'}</small></div></section>
      </main>
    </div>

    <div className={styles.mobileCta}><Link href={ctaHref}>{canApply?'Apply for a role':'Open in My Mettelo'}</Link></div>
  </div>;
}
