'use client';

import Link from 'next/link';
import {useEffect,useRef} from 'react';
import SaveProjectButton from '@/components/SaveProjectButton';
import MemberProjectDetailBodyV3 from '@/components/project-experience/MemberProjectDetailBodyV3';
import type {MemberProjectState} from '@/lib/member-project-journey';
import type {MemberProjectFit} from '@/lib/member-project-fit';
import type {MemberProjectTeamState} from '@/lib/member-project-team-state';
import type {ProjectExperienceModel} from '@/lib/project-experience-model';
import styles from './MemberProjectDetailV2.module.css';

type Role={id:string;title:string;description:string|null;skills:string[];openings:number;remaining:number|null;available:boolean;responsibilities:string[];recommendedSkills:string[];experienceExpectation:string|null;weeklyCommitment:string|null;applicationRequirements:string|null;canonicalRoleKey?:string|null};
type ContributionArea={slug:string;title:string;description:string|null};
type Props={model:ProjectExperienceModel;state:MemberProjectState;stateLabel:string;stateCopy:string;primaryAction:{label:string;href:string}|null;applicationReady:boolean;profileCompletion:number;applicationMissing:string[];saved:boolean;roles:Role[];contributionAreas:ContributionArea[];fit:MemberProjectFit;teamState:MemberProjectTeamState};

function date(value:string|null){if(!value)return'Not published';const parsed=new Date(value);if(Number.isNaN(parsed.getTime()))return'Not published';return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(parsed)}
function humanMode(value:string|null|undefined){if(!value)return'Not published';return value.charAt(0).toUpperCase()+value.slice(1)}

export default function MemberProjectDetailV2({model,state,stateLabel,stateCopy,primaryAction,applicationReady,profileCompletion,applicationMissing,saved,roles,contributionAreas,fit,teamState}:Props){
 const project=model.project;const decisionHeadingRef=useRef<HTMLHeadingElement>(null);const workingModel=project.locationType?.replaceAll('_',' ')||project.location||'Project-specific';
 const isSolo=project.participationMode==='solo';
 const soloState=project.status==='active'||project.status==='review'?'Working independently':'Solo participation';
 const returnTarget=`/member/discover/${project.id}#member-decision-title`;
 const incompleteAction=state==='ineligible'&&!applicationReady?{label:'Submit Interest',href:`/member/profile?next=${encodeURIComponent(returnTarget)}`}:null;const action=primaryAction||incompleteAction;
 useEffect(()=>{if(window.location.hash==='#member-decision-title'){window.requestAnimationFrame(()=>{decisionHeadingRef.current?.focus();decisionHeadingRef.current?.scrollIntoView({block:'center'})})}},[]);
 return <div className={styles.page}>
  <a className={styles.skip} href="#member-project-main">Skip to project details</a>
  <nav className={styles.breadcrumb} aria-label="Project breadcrumb"><Link href="/member">My Mettelo</Link><span aria-hidden="true">/</span><Link href="/member/discover">Discover</Link><span aria-hidden="true">/</span><strong>{project.title}</strong></nav>
  <header className={styles.hero} aria-labelledby="member-project-title"><div className={styles.heroMain}><div className={styles.eyebrow}>MEMBER PROJECT DETAIL</div><h1 id="member-project-title">{project.title}</h1><p>{project.summary}</p><div className={styles.pills} aria-label="Project characteristics"><span className={`${styles.pill} ${state==='open_eligible'?styles.open:''}`}>{stateLabel}</span>{project.difficultyLevel&&<span className={styles.pill}>{project.difficultyLevel}</span>}{project.durationWeeks&&<span className={styles.pill}>{project.durationWeeks} {project.durationWeeks===1?'week':'weeks'}</span>}{project.weeklyCommitment&&<span className={styles.pill}>{project.weeklyCommitment}</span>}<span className={styles.pill}>{humanMode(project.participationMode)}</span><span className={styles.pill}>{workingModel}</span></div></div>
   <aside className={styles.decision} aria-labelledby="member-decision-title"><div className={styles.eyebrow}>YOUR DECISION</div><h2 id="member-decision-title" ref={decisionHeadingRef} tabIndex={-1}>{stateLabel}</h2><p>{stateCopy}</p>{isSolo?<dl className={styles.meta} aria-label="Solo participation capacity"><div><dt>Participation</dt><dd>Solo</dd></div><div><dt>Working model</dt><dd>{soloState}</dd></div><div><dt>Minimum to start</dt><dd>1</dd></div><div><dt>Maximum places</dt><dd>1</dd></div><div><dt>Interest closes</dt><dd>{date(project.applicationDeadline)}</dd></div></dl>:<dl className={styles.meta} aria-label="Team participation capacity"><div><dt>Participation</dt><dd>{humanMode(project.participationMode)}</dd></div><div><dt>Team state</dt><dd>{teamState.stateLabel}</dd></div><div><dt>Confirmed</dt><dd>{teamState.known?teamState.confirmedMembers:'Checking'}</dd></div><div><dt>Minimum to start</dt><dd>{teamState.minTeamSize??'Not published'}</dd></div><div><dt>Target team</dt><dd>{teamState.targetTeamSize??'Not published'}</dd></div><div><dt>Maximum team</dt><dd>{teamState.maxTeamSize??'Not published'}</dd></div><div><dt>Interest closes</dt><dd>{date(project.applicationDeadline)}</dd></div></dl>}{!isSolo&&teamState.known&&teamState.reservedMembers>0&&<p className={styles.readiness} role="status"><strong>{teamState.reservedMembers} place{teamState.reservedMembers===1?' is':'s are'} currently reserved/offered</strong><span>Reserved places count toward current capacity while team formation is in progress.</span></p>}{state==='ineligible'&&!applicationReady&&<div className={styles.readiness} role="status"><strong>{applicationMissing.length} profile requirement{applicationMissing.length===1?'':'s'} remaining</strong><span>Profile completion: {profileCompletion}%</span></div>}{action&&<Link className={styles.primaryButton} href={action.href}>{action.label}</Link>}<div className="pdv2SaveUtility"><SaveProjectButton projectId={project.id} initialSaved={saved}/></div>{state==='ineligible'&&!applicationReady&&<p className={styles.readiness} role="status">Submit Interest will first take you to complete the missing profile information, then return you to this exact project and updated qualification state.</p>}</aside>
  </header>
  <MemberProjectDetailBodyV3 model={model} roles={roles} contributionAreas={contributionAreas} projectId={project.id} canApply={state==='open_eligible'} applicationReady={applicationReady} applicationMissing={applicationMissing} fit={fit} teamState={teamState}/>
 </div>
}