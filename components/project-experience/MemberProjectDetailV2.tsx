'use client';

import Link from 'next/link';
import SaveProjectButton from '@/components/SaveProjectButton';
import MemberProjectDetailBodyV3 from '@/components/project-experience/MemberProjectDetailBodyV3';
import type {MemberProjectState} from '@/lib/member-project-journey';
import type {ProjectExperienceModel} from '@/lib/project-experience-model';
import styles from './MemberProjectDetailV2.module.css';

type Role={id:string;title:string;description:string|null;skills:string[];openings:number;remaining:number|null;available:boolean;responsibilities:string[];recommendedSkills:string[];experienceExpectation:string|null;weeklyCommitment:string|null;applicationRequirements:string|null};
type ContributionArea={slug:string;title:string;description:string|null};
type Props={model:ProjectExperienceModel;state:MemberProjectState;stateLabel:string;stateCopy:string;primaryAction:{label:string;href:string}|null;applicationReady:boolean;profileCompletion:number;applicationMissing:string[];roleAvailabilityKnown:boolean;saved:boolean;roles:Role[];contributionAreas:ContributionArea[]};

function date(value:string|null){if(!value)return'Not published';const parsed=new Date(value);if(Number.isNaN(parsed.getTime()))return'Not published';return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(parsed)}
function openStatus(state:MemberProjectState,deadline:string|null){if(state!=='open_eligible')return null;if(!deadline)return'Open for applications';const days=Math.ceil((new Date(deadline).getTime()-Date.now())/86400000);return days>0&&days<=7?`Closing soon · ${days} ${days===1?'day':'days'}`:'Open for applications'}

export default function MemberProjectDetailV2({model,state,stateLabel,stateCopy,primaryAction,applicationReady,profileCompletion,applicationMissing,roleAvailabilityKnown,saved,roles,contributionAreas}:Props){
 const project=model.project;
 const status=openStatus(state,project.applicationDeadline)||stateLabel;
 const action=state==='open_eligible'?{label:'Apply now',href:`/member/discover/${project.id}/apply`}:primaryAction;
 const workingModel=project.locationType?.replaceAll('_',' ')||project.location||'Project-specific';
 const availablePlaces=roleAvailabilityKnown?roles.reduce((sum,role)=>sum+(role.available?Math.max(0,role.remaining??0):0),0):null;
 return <div className={styles.page}>
  <a className={styles.skip} href="#member-project-main">Skip to project details</a>
  <nav className={styles.breadcrumb} aria-label="Project breadcrumb"><Link href="/member">My Mettelo</Link><span aria-hidden="true">/</span><Link href="/member/discover">Discover</Link><span aria-hidden="true">/</span><strong>{project.title}</strong></nav>
  <header className={styles.hero} aria-labelledby="member-project-title"><div className={styles.heroMain}><div className={styles.eyebrow}>MEMBER PROJECT DETAIL</div><h1 id="member-project-title">{project.title}</h1><p>{project.summary}</p><div className={styles.pills} aria-label="Project characteristics"><span className={`${styles.pill} ${state==='open_eligible'?styles.open:''}`}>{status}</span>{project.durationWeeks&&<span className={styles.pill}>{project.durationWeeks} {project.durationWeeks===1?'week':'weeks'}</span>}{project.weeklyCommitment&&<span className={styles.pill}>{project.weeklyCommitment}</span>}<span className={styles.pill}>{workingModel}</span></div></div>
   <aside className={styles.decision} aria-labelledby="member-decision-title"><div className={styles.eyebrow}>YOUR DECISION</div><h2 id="member-decision-title">{state==='open_eligible'?'Ready to contribute?':stateLabel}</h2><p>{state==='open_eligible'?'Review the project, contribution areas and commitment. Open the full specification only when you need deeper detail.':stateCopy}</p><dl className={styles.meta}><div><dt>Duration</dt><dd>{project.durationWeeks?`${project.durationWeeks} ${project.durationWeeks===1?'week':'weeks'}`:'Not published'}</dd></div><div><dt>Commitment</dt><dd>{project.weeklyCommitment||'Not published'}</dd></div><div><dt>Team openings</dt><dd>{availablePlaces===null?'Checking availability':`${availablePlaces} ${availablePlaces===1?'place':'places'}`}</dd></div><div><dt>Applications close</dt><dd>{date(project.applicationDeadline)}</dd></div></dl>{state==='ineligible'&&!applicationReady&&<div className={styles.readiness} role="status"><strong>{applicationMissing.length} profile requirement{applicationMissing.length===1?'':'s'} remaining</strong><span>Profile completion: {profileCompletion}%</span></div>}{action&&<Link className={styles.primaryButton} href={action.href}>{action.label}</Link>}<div className="pdv2SaveUtility"><SaveProjectButton projectId={project.id} initialSaved={saved}/></div>{state==='ineligible'&&!applicationReady&&<Link className={styles.secondaryButton} href={`/member/profile?next=${encodeURIComponent(`/member/discover/${project.id}`)}`}>Complete profile requirements</Link>}</aside>
  </header>
  <MemberProjectDetailBodyV3 model={model} roles={roles} contributionAreas={contributionAreas} projectId={project.id} canApply={state==='open_eligible'}/>
 </div>
}
