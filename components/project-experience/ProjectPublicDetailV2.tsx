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
function date(value:string|null|undefined){
  if(!value)return'Not published';
  const parsed=new Date(value);
  if(Number.isNaN(parsed.getTime()))return'Not published';
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(parsed);
}
function weeks(value:number|null){return value?`${value} ${value===1?'week':'weeks'}`:'Not published'}
function milestoneWindow(start:number|null,end:number|null){
  if(start&&end&&start!==end)return`Weeks ${start}–${end}`;
  if(start||end)return`Week ${start||end}`;
  return'Project timeline';
}
function retention(value:string|null){
  if(value==='permitted')return'Permitted';
  if(value==='restricted')return'Restricted';
  if(value==='not_permitted')return'Not permitted';
  return'Not published';
}
function initials(value:string){return value.split(/\s+/).filter(Boolean).slice(0,2).map(item=>item[0]?.toUpperCase()).join('')||'↗'}

export default function ProjectPublicDetailV2({model,canApply,ctaHref,authenticated}:Props){
  const {project,challenge,resources,deliverables,successCriteria,timeline,capabilities,proofSignals,roles,taxonomy}=model;
  const workingModel=project.locationType?titleCase(project.locationType):project.location||'Project-specific';
  const statusLabel=canApply?'Recruiting now':project.status==='pilot'?'Pilot project':'Applications closed';
  const primarySource=resources[0]||null;
  const rolePlaces=roles.reduce((sum,role)=>sum+Math.max(0,role.openings),0);
  const proofConfigured=proofSignals.length>0;
  const heroTags=[
    project.difficultyLevel&&titleCase(project.difficultyLevel),
    project.durationWeeks&&weeks(project.durationWeeks),
    roles.length&&'Team delivery',
    ...taxonomy.tools.slice(0,3).map(item=>item.name),
    ...taxonomy.methods.slice(0,2).map(item=>item.name),
    ...capabilities.professional.slice(0,1)
  ].filter((item):item is string=>Boolean(item));
  const sectionLinks:[string,string][]=[
    ['challenge','The challenge'],
    ['objectives','Objectives'],
    ['data','Data & source'],
    ['deliverables','Deliverables'],
    ['success','Success criteria'],
    ['proof','What you can prove'],
    ['timeline','Delivery journey'],
    ['roles','Roles'],
    ['eligibility','Eligibility'],
    ['apply','Apply']
  ];
  const fitCopy=`A strong fit is someone who can meet at least one published role's expectations${project.weeklyCommitment?`, commit ${project.weeklyCommitment}`:''}${project.difficultyLevel?`, and operate at the ${titleCase(project.difficultyLevel)} level described for this project`:''}.`;

  return <div className={styles.page}>
    <a className={styles.skip} href="#project-content">Skip to project details</a>

    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <Link href="/projects">Projects</Link><span aria-hidden="true">›</span><strong>{project.title}</strong>
    </nav>

    <header className={styles.hero} aria-labelledby="project-title">
      <div className={styles.heroMain}>
        <div className={styles.status}><i aria-hidden="true"/><span>{statusLabel}{taxonomy.domains[0]?.name?` · ${taxonomy.domains[0].name}`:''}</span></div>
        <h1 id="project-title">{project.title}</h1>
        <p className={styles.heroSummary}>{project.summary}</p>
        <div className={styles.heroTags} aria-label="Project characteristics">
          {heroTags.slice(0,7).map(item=><span key={item}>{item}</span>)}
        </div>
        <div className={styles.heroFoot}>
          <div className={styles.proofBadge}><span aria-hidden="true">{proofConfigured?'✓':'◌'}</span>{proofConfigured?'Mettelo Proof potential · verification required':'Evidence expectations pending'}</div>
          <div className={styles.projectId}>PROJECT · {project.id.slice(0,8).toUpperCase()}</div>
        </div>
      </div>

      <aside className={styles.decision} aria-labelledby="project-decision-title">
        <div className={styles.decisionTop}><span className={styles.label}>Project opportunity</span><span className={canApply?styles.openPill:styles.neutralPill}>{canApply?'Open':'Closed'}</span></div>
        <h2 id="project-decision-title">Build evidence of capability, not just another portfolio piece.</h2>
        <p>Join a structured team, solve a defined problem and produce work that can be reviewed against a published professional standard.</p>
        <Link className={styles.primaryButton} href={ctaHref}>{canApply?'Apply for a role':'Open in My Mettelo'}</Link>
        <small>{authenticated?'Your eligibility, role capacity and application state are checked in My Mettelo.':'Sign in or create an account and your project context will be preserved.'}</small>
        <dl className={styles.metaGrid}>
          <div><dt>Duration</dt><dd>{weeks(project.durationWeeks)}</dd></div>
          <div><dt>Commitment</dt><dd>{project.weeklyCommitment||'Not published'}</dd></div>
          <div><dt>Team</dt><dd>{project.teamSizeThreshold?`${project.teamSizeThreshold} people`:rolePlaces?`${rolePlaces} places`:'Not published'}</dd></div>
          <div><dt>Format</dt><dd>{workingModel}</dd></div>
          <div><dt>Level</dt><dd>{project.difficultyLevel?titleCase(project.difficultyLevel):'Not published'}</dd></div>
          <div><dt>Applications close</dt><dd>{date(project.applicationDeadline)}</dd></div>
        </dl>

        {primarySource&&<article className={styles.sourceCard} aria-label="Primary verified project source">
          <div className={styles.sourceHead}><span>Primary data source</span><b className={styles.verified}>● Verified</b></div>
          <div className={styles.sourceBody}>
            <div className={styles.sourceMark}>{primarySource.providerLogoAssetPath?<img src={primarySource.providerLogoAssetPath} alt={`${primarySource.providerName||'Source provider'} logo`}/>:<span aria-hidden="true">{initials(primarySource.providerName||primarySource.name)}</span>}</div>
            <div><h3>{primarySource.providerName||primarySource.name}</h3><p>{primarySource.providerName?primarySource.name:(primarySource.sourceType?titleCase(primarySource.sourceType):'External source')}</p></div>
          </div>
          <div className={styles.sourceLinks}>
            {primarySource.externalUrl&&<a href={primarySource.externalUrl} target="_blank" rel="noreferrer">View source ↗</a>}
            {primarySource.licenceUrl&&<a href={primarySource.licenceUrl} target="_blank" rel="noreferrer">Licence details</a>}
            {!primarySource.licenceUrl&&primarySource.licenceName&&<span>{primarySource.licenceName}</span>}
          </div>
          <p className={styles.disclaimer}>Source attribution does not imply sponsorship, endorsement or partnership with Mettelo.</p>
        </article>}
      </aside>
    </header>

    <section className={styles.valueStrip} aria-label="Project summary">
      <div><span>Problem</span><strong>{challenge.primaryObjective||challenge.useCase||taxonomy.domains[0]?.name||'Defined project challenge'}</strong><small>{taxonomy.domains[0]?.name?'Decision context for the work':'Review the challenge below'}</small></div>
      <div><span>Output</span><strong>{deliverables.length?`${deliverables.length} professional deliverable${deliverables.length===1?'':'s'}`:'Outputs pending'}</strong><small>{deliverables[0]?.title||'Canonical deliverables are still being completed'}</small></div>
      <div><span>Proof</span><strong>{proofConfigured?`${proofSignals.length} evidence area${proofSignals.length===1?'':'s'}`:'Evidence mapping pending'}</strong><small>Only completed, reviewed contribution becomes Mettelo Proof.</small></div>
      <div><span>Data</span><strong>{primarySource?'Verified public source':'Public source pending'}</strong><small>{primarySource?(primarySource.providerName||primarySource.name):'Private resources are never exposed as fallback'}</small></div>
    </section>

    <div id="project-content" className={styles.contentGrid}>
      <aside className={styles.sectionNav} aria-label="On this project page"><div><span>On this page</span>{sectionLinks.map(([id,label])=><a key={id} href={`#${id}`}>{label}</a>)}</div></aside>

      <div className={styles.content}>
        <section id="challenge" className={styles.section} aria-labelledby="challenge-title">
          <span className={styles.kicker}>01 · The challenge</span>
          <h2 id="challenge-title">Start with the decision, not the dataset.</h2>
          <p className={styles.lead}>{challenge.problemStatement||project.summary}</p>
          <div className={styles.challengeCard}>
            <div className={styles.challengeMain}><p className={styles.quote}>{challenge.businessContext||challenge.problemStatement||project.summary}</p></div>
            <aside><span>Primary outcome</span><strong>{challenge.primaryObjective||challenge.useCase||'Outcome detail pending'}</strong><p>{challenge.stakeholder?`The work is intended to support ${challenge.stakeholder}.`:'Stakeholder detail has not yet been published.'}</p></aside>
          </div>
          {(challenge.businessContext||challenge.useCase)&&<div className={styles.twoCards}>{challenge.businessContext&&<article><h3>Business context</h3><p>{challenge.businessContext}</p></article>}{challenge.useCase&&<article><h3>Primary use case</h3><p>{challenge.useCase}</p></article>}</div>}
        </section>

        <section id="objectives" className={styles.section} aria-labelledby="objectives-title">
          <span className={styles.kicker}>02 · What you need to solve</span>
          <h2 id="objectives-title">Clear objectives. Room for judgement.</h2>
          <p className={styles.lead}>The project defines the outcome and quality bar without prescribing every analytical or delivery step. The team is expected to make defensible decisions.</p>
          {(challenge.primaryObjective||challenge.supportingObjectives.length)?<div className={styles.objectiveList}>{challenge.primaryObjective&&<div className={styles.objective}><span>01</span><div><strong>Primary objective</strong><p>{challenge.primaryObjective}</p></div></div>}{challenge.supportingObjectives.map((item,index)=><div className={styles.objective} key={`${index}:${item}`}><span>{String(index+(challenge.primaryObjective?2:1)).padStart(2,'0')}</span><div><strong>Supporting objective</strong><p>{item}</p></div></div>)}</div>:<div className={styles.empty}><strong>Detailed objectives are not yet published.</strong><span>Mettelo does not infer objectives from a project title or dataset.</span></div>}

          {challenge.keyQuestions.length>0&&<div className={styles.questionBlock}><div className={styles.subhead}><span>Questions to answer</span><h3>The project should resolve these questions.</h3></div><div className={styles.questionGrid}>{challenge.keyQuestions.map((item,index)=><div key={`${index}:${item}`}><span>{String(index+1).padStart(2,'0')}</span><p>{item}</p></div>)}</div></div>}

          {(challenge.inScope.length||challenge.outOfScope.length)>0&&<div className={styles.scopeGrid}><article><span className={styles.cardLabel}>In scope</span>{challenge.inScope.length?<ul>{challenge.inScope.map(item=><li key={item}>{item}</li>)}</ul>:<p>Not explicitly defined.</p>}</article><article><span className={styles.cardLabel}>Out of scope</span>{challenge.outOfScope.length?<ul>{challenge.outOfScope.map(item=><li key={item}>{item}</li>)}</ul>:<p>Not explicitly defined.</p>}</article></div>}
        </section>

        <section id="data" className={styles.section} aria-labelledby="data-title">
          <span className={styles.kicker}>03 · Data, provenance & trust</span>
          <h2 id="data-title">Know what you are working with—and where it came from.</h2>
          <p className={styles.lead}>Mettelo only publishes project resources that are classified public, explicitly approved for publication and GREEN under resource governance. Approved internal working copies remain restricted to authorised project members in Mettelo Lab.</p>
          {resources.length?<div className={styles.dataStack}>{resources.map(resource=><article className={styles.dataPanel} key={resource.id}>
            <div className={styles.dataTop}>
              <div className={styles.dataCopy}>
                <div className={styles.dataIdentity}>{resource.providerLogoAssetPath&&<img src={resource.providerLogoAssetPath} alt={`${resource.providerName||'Source provider'} logo`}/>}<div><span>{resource.providerName||titleCase(resource.sourceType)}</span><h3>{resource.name}</h3></div></div>
                {resource.description&&<p>{resource.description}</p>}
                <dl className={styles.dataFacts}>
                  {resource.requiredSubset&&<div><dt>Required subset</dt><dd>{resource.requiredSubset}</dd></div>}
                  {resource.dataFormat&&<div><dt>Format</dt><dd>{resource.dataFormat}</dd></div>}
                  {resource.dataPeriod&&<div><dt>Period</dt><dd>{resource.dataPeriod}</dd></div>}
                  {resource.approximateSize&&<div><dt>Approx. size</dt><dd>{resource.approximateSize}</dd></div>}
                </dl>
                <div className={styles.dataLinks}>{resource.externalUrl&&<a href={resource.externalUrl} target="_blank" rel="noreferrer">View original source ↗</a>}{resource.providerUrl&&<a href={resource.providerUrl} target="_blank" rel="noreferrer">Provider</a>}{resource.licenceUrl&&<a href={resource.licenceUrl} target="_blank" rel="noreferrer">Licence</a>}</div>
              </div>
              <div className={styles.dataGovernance}>
                <div className={styles.governanceRow}><span>Source platform / provider</span><strong>{resource.providerName||titleCase(resource.sourceType)}</strong></div>
                <div className={styles.governanceRow}><span>Licence</span><strong>{resource.licenceName||'Not published'}</strong></div>
                <div className={styles.governanceRow}><span>Reuse status</span><strong className={styles.green}>Green · public use approved</strong></div>
                <div className={styles.governanceRow}><span>Project retention</span><strong>{retention(resource.retentionPolicy)}</strong></div>
                <div className={styles.governanceRow}><span>Last verified</span><strong>{date(resource.governanceVerifiedAt)}</strong></div>
              </div>
            </div>
            {resource.provenance&&<div className={styles.dataNote}><strong>Provenance:</strong> {resource.provenance}</div>}
            {resource.knownLimitations&&<div className={styles.dataNote}><strong>Known limitations:</strong> {resource.knownLimitations}</div>}
            <div className={styles.dataNote}>Public users see approved attribution and licence context only. Private stored-copy links, governance evidence and Lab access details remain restricted.</div>
          </article>)}</div>:<div className={styles.empty}><strong>No governed public resource is available yet.</strong><span>The project will not expose a private or unverified source as a fallback.</span></div>}
        </section>

        <section id="deliverables" className={styles.section} aria-labelledby="deliverables-title">
          <span className={styles.kicker}>04 · Required deliverables</span>
          <h2 id="deliverables-title">Professional outputs, not tick-box files.</h2>
          <p className={styles.lead}>Each output should be clear enough for another professional to review the work, understand the decisions and continue from it.</p>
          {deliverables.length?<div className={styles.deliverables}>{deliverables.map((item,index)=><article key={item.id}><div><span>{String(index+1).padStart(2,'0')}</span>{item.isRequired&&<b>Required</b>}</div><strong>{item.title}</strong><p>{item.publicSummary||item.acceptanceCriteria||'Detailed acceptance expectations are being completed.'}</p>{item.expectedFormat&&<small>Expected format · {item.expectedFormat}</small>}</article>)}</div>:<div className={styles.empty}><strong>Detailed deliverables have not been published.</strong><span>This remains a readiness gap rather than being filled with generic output assumptions.</span></div>}
        </section>

        <section id="success" className={styles.section} aria-labelledby="success-title">
          <span className={styles.kicker}>05 · Success criteria</span>
          <h2 id="success-title">Know the quality bar before you start.</h2>
          <p className={styles.lead}>Completion alone is not success. The work should be defensible, understandable and useful against criteria published before delivery begins.</p>
          {successCriteria.length?<div className={styles.criteria}>{successCriteria.map(item=><div key={item}><span aria-hidden="true">✓</span><p>{item}</p></div>)}</div>:<div className={styles.empty}><strong>Success criteria are not yet published.</strong><span>Mettelo will not invent a quality bar where the canonical record is incomplete.</span></div>}
        </section>

        <section id="proof" className={styles.section} aria-labelledby="proof-title">
          <span className={styles.kicker}>06 · What you can prove</span>
          <h2 id="proof-title">Capability becomes more valuable when there is evidence behind it.</h2>
          <p className={styles.lead}>Mettelo projects create reviewable evidence opportunities across technical execution and professional behaviours. Proof is never automatically awarded for participation.</p>
          <div className={styles.proofStage}>
            <div className={styles.proofHead}><h3>{proofConfigured?'Evidence this project is configured to build':'Evidence configuration is still being completed'}</h3><p>{proofConfigured?'Your contribution must still be completed and pass Mettelo review before it can become verified Proof.':'The project can be explored without overstating what participation proves.'}</p></div>
            <div className={styles.proofGrid}>{proofConfigured?proofSignals.map((item,index)=><article key={item}><span>{String(index+1).padStart(2,'0')}</span><strong>{item}</strong><p>Potential evidence area when your contribution is completed and verified.</p></article>):<article><span>—</span><strong>Evidence mapping pending</strong><p>No capability claim is made until the project has explicit evidence expectations.</p></article>}</div>
            <div className={styles.capabilityRows}><div><b>Technical</b><p>{capabilities.technical.length?capabilities.technical.join(' · '):'Not yet mapped'}</p></div><div><b>Professional</b><p>{capabilities.professional.length?capabilities.professional.join(' · '):'Not yet mapped'}</p></div><div><b>Methods & tools</b><p>{capabilities.methodsAndTools.length?capabilities.methodsAndTools.join(' · '):'Not yet mapped'}</p></div></div>
          </div>
        </section>

        <section id="timeline" className={styles.section} aria-labelledby="timeline-title">
          <span className={styles.kicker}>07 · Delivery journey</span>
          <h2 id="timeline-title">A structured route from ambiguity to handover.</h2>
          <p className={styles.lead}>This is the approved project plan. Live task status, team blockers and run execution remain inside Mettelo Lab.</p>
          {timeline.length?<div className={styles.timeline}>{timeline.map(item=><div className={styles.phase} key={item.id}><div className={styles.phaseWindow}>{milestoneWindow(item.weekStart,item.weekEnd)}</div><div><strong>{item.title}</strong>{item.description&&<p>{item.description}</p>}</div>{item.expectedOutput&&<div className={styles.output}>{item.expectedOutput}</div>}</div>)}</div>:<div className={styles.empty}><strong>A detailed delivery journey has not been published yet.</strong><span>Live Lab activity is not exposed as a substitute for a canonical project timeline.</span></div>}
        </section>

        <section id="roles" className={styles.section} aria-labelledby="roles-title">
          <span className={styles.kicker}>08 · Team structure</span>
          <h2 id="roles-title">Choose where you can contribute—and where you want to stretch.</h2>
          {roles.length?<div className={styles.roles}>{roles.map(role=><article key={role.id}>
            <div className={styles.roleTop}><div><h3>{role.title}</h3><p>{role.description||'Role detail is being completed.'}</p></div><div className={styles.roleSkills}>{role.skills.slice(0,4).map(skill=><span key={skill}>{skill}</span>)}</div><div className={styles.places}>{role.openings} place{role.openings===1?'':'s'}</div></div>
            {(role.responsibilities?.length||role.experienceExpectation||role.weeklyCommitment||role.applicationRequirements)&&<div className={styles.roleDetails}>
              {role.responsibilities?.length?<div><span>Responsibilities</span><ul>{role.responsibilities.slice(0,4).map(item=><li key={item}>{item}</li>)}</ul></div>:null}
              {(role.experienceExpectation||role.weeklyCommitment)&&<div><span>Expectation</span>{role.experienceExpectation&&<p>{role.experienceExpectation}</p>}{role.weeklyCommitment&&<p><strong>Commitment:</strong> {role.weeklyCommitment}</p>}</div>}
              {role.applicationRequirements&&<div><span>Application requirement</span><p>{role.applicationRequirements}</p></div>}
            </div>}
          </article>)}</div>:<div className={styles.empty}><strong>No participation roles are published yet.</strong><span>The project remains discoverable but is not ready for role application.</span></div>}
        </section>

        <section id="eligibility" className={styles.section} aria-labelledby="eligibility-title">
          <span className={styles.kicker}>09 · Before you apply</span>
          <h2 id="eligibility-title">Know the expectation before you commit.</h2>
          <div className={styles.eligibility}>
            <article className={styles.eligibilityGood}><h3>Good fit if…</h3><p>{fitCopy}</p></article>
            <article><h3>Profile requirement</h3><p>You need an eligible Mettelo member profile before completing a project application. If your profile is incomplete, My Mettelo will guide you through readiness and preserve this project context.</p></article>
          </div>

          <div id="apply" className={styles.applyBanner}>
            <div><span className={styles.kicker}>Ready to contribute?</span><h3>Build work you can stand behind.</h3><p>{canApply?'Continue to My Mettelo to confirm readiness, choose an available role and complete the correct application journey.':'You can still review this project in My Mettelo. Application remains unavailable until recruitment and role capacity permit it.'}</p></div>
            <div><Link href={ctaHref}>{canApply?'Apply for a role →':'Open in My Mettelo →'}</Link><small>{authenticated?'Your project context is preserved.':'Sign in or create an account to continue.'}</small></div>
          </div>
        </section>
      </div>
    </div>

    <div className={styles.mobileCta} aria-label="Project application action"><Link href={ctaHref}>{canApply?'Apply for a role':'Open in My Mettelo'}</Link></div>
  </div>;
}
