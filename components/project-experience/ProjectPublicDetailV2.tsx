import Link from 'next/link';
import type {ProjectExperienceModel} from '@/lib/project-experience-model';
import ProjectPublicDetailBodyV3 from './ProjectPublicDetailBodyV3';
import styles from './ProjectPublicDetailV2.module.css';

type Props={model:ProjectExperienceModel;canApply:boolean;ctaHref:string;authenticated:boolean;detailLoadError?:boolean};

function titleCase(value:string|null|undefined){return value?value.replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase()):'Not published'}
function date(value:string|null|undefined){if(!value)return'Not published';const parsed=new Date(value);if(Number.isNaN(parsed.getTime()))return'Not published';return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(parsed)}
function weeks(value:number|null){return value?`${value} ${value===1?'week':'weeks'}`:'Not published'}
function short(value:string|null|undefined,max=260){if(!value)return'';const clean=value.replace(/\s+/g,' ').trim();return clean.length<=max?clean:`${clean.slice(0,max).replace(/\s+\S*$/,'')}…`}
function participation(project:ProjectExperienceModel['project']){
  const mode=project.participationMode||((project.minTeamSize||project.teamSizeThreshold)===1?'solo':(project.minTeamSize||project.teamSizeThreshold)?'team':null);
  const min=project.minTeamSize||project.teamSizeThreshold||null;
  const target=project.targetTeamSize||min;
  const max=project.maxTeamSize||target;
  if(mode==='solo')return{label:'Solo',detail:'1 participant'};
  if(mode==='flexible')return{label:'Flexible',detail:min&&max?(min===max?`${min} participant${min===1?'':'s'}`:`${min}–${max} participants · target ${target||min}`):'Solo or team'};
  if(mode==='team')return{label:'Team',detail:min&&max?(min===max?`${min} participants`:`${min}–${max} participants · target ${target||min}`):'Team project'};
  return{label:'Not published',detail:min?`${min} participant${min===1?'':'s'}`:'Not published'};
}

export default function ProjectPublicDetailV2({model,canApply,ctaHref,authenticated,detailLoadError=false}:Props){
  const {project,resources,proofSignals,roles,taxonomy}=model;
  const workingModel=project.locationType?titleCase(project.locationType):project.location||'Project-specific';
  const statusLabel=canApply?'Open for interest':project.status==='pilot'?'Pilot project':'Interest closed';
  const primarySource=resources[0]||null;
  const rolePlaces=roles.reduce((sum,role)=>sum+Math.max(0,role.openings),0);
  const proofConfigured=proofSignals.length>0;
  const participationInfo=participation(project);
  const capacityLabel=participationInfo.detail||(rolePlaces?`${rolePlaces} places`:'Not published');
  const heroTags=[project.difficultyLevel&&titleCase(project.difficultyLevel),project.durationWeeks&&weeks(project.durationWeeks),project.weeklyCommitment,participationInfo.label,workingModel,taxonomy.domains[0]?.name].filter((item):item is string=>Boolean(item));

  return <div className={styles.page}>
    <a className={styles.skip} href="#project-content">Skip to project details</a>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/projects">Projects</Link><span aria-hidden="true">›</span><strong>{project.title}</strong></nav>

    <header className={styles.hero} aria-labelledby="project-title">
      <div className={styles.heroMain}>
        <div className={styles.status}><i aria-hidden="true"/><span>{statusLabel}{taxonomy.domains[0]?.name?` · ${taxonomy.domains[0].name}`:''}</span></div>
        <h1 id="project-title">{project.title}</h1>
        <p className={styles.heroSummary}>{short(project.summary,360)}</p>
        <div className={styles.heroTags} aria-label="Project characteristics">{heroTags.slice(0,6).map(item=><span key={item}>{item}</span>)}</div>
        <div className={styles.heroFoot}><div className={styles.proofBadge}><span aria-hidden="true">{proofConfigured?'✓':'◌'}</span>{proofConfigured?'Evidence opportunity · verification required':'Evidence mapping pending'}</div><div className={styles.projectId}>PROJECT · {project.id.slice(0,8).toUpperCase()}</div></div>
      </div>

      <aside className={styles.decision} aria-labelledby="project-decision-title">
        <div className={styles.decisionTop}><span className={styles.label}>Project opportunity</span><span className={canApply?styles.openPill:styles.neutralPill}>{canApply?'Open':'Closed'}</span></div>
        <h2 id="project-decision-title">Decide whether this is the right project for you.</h2>
        <p>Understand the problem, contribution areas, commitment and quality bar before you submit interest.</p>
        <dl className={styles.metaGrid}>
          <div><dt>Duration</dt><dd>{weeks(project.durationWeeks)}</dd></div><div><dt>Commitment</dt><dd>{project.weeklyCommitment||'Not published'}</dd></div>
          <div><dt>Participation</dt><dd>{participationInfo.label}</dd></div><div><dt>Capacity</dt><dd>{capacityLabel}</dd></div>
          <div><dt>Working model</dt><dd>{workingModel}</dd></div><div><dt>Level</dt><dd>{project.difficultyLevel?titleCase(project.difficultyLevel):'Not published'}</dd></div>
          <div><dt>Interest closes</dt><dd>{date(project.applicationDeadline)}</dd></div>
        </dl>
        {canApply?<Link className={styles.primaryButton} href={ctaHref}>Submit interest</Link>:<span className={styles.primaryButton} aria-disabled="true">Interest closed</span>}
        <small>{canApply?(authenticated?'Your eligibility and application state are checked in My Mettelo.':'Sign in or create an account to continue with this project.'):'This project is not currently accepting interest.'}</small>
        {primarySource&&<article className={styles.sourceCard}><div className={styles.sourceHead}><span>Data source</span><b className={styles.verified}>● Governed</b></div><h3>{primarySource.name}</h3><p>{primarySource.providerName||titleCase(primarySource.sourceType)}</p>{primarySource.licenceName&&<span className={styles.sourceMeta}>Licence · {primarySource.licenceName}</span>}<p className={styles.disclaimer}>Public project pages show approved source metadata only. Direct resource and stored-copy links remain protected.</p></article>}
      </aside>
    </header>

    {detailLoadError&&<div className={styles.empty} role="alert"><strong>Some project details could not be loaded.</strong><span>Core project information is still available. Refresh this page to retry the detailed project brief.</span></div>}
    <ProjectPublicDetailBodyV3 model={model} canApply={canApply} ctaHref={ctaHref} authenticated={authenticated}/>
  </div>;
}
