'use client';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import type {ProjectExperienceModel} from '@/lib/project-experience-model';
import styles from './ProjectDetailBodyV3.module.css';

type Role={id:string;title:string;description:string|null;skills:string[];openings:number;remaining:number|null;available:boolean;responsibilities:string[];recommendedSkills:string[];experienceExpectation:string|null;weeklyCommitment:string|null;applicationRequirements:string|null};
type ContributionArea={slug:string;title:string;description:string|null};
type Props={model:ProjectExperienceModel;roles:Role[];contributionAreas:ContributionArea[];projectId:string;canApply:boolean};

function short(value:string|null|undefined,max=180){if(!value)return'';const clean=value.replace(/\s+/g,' ').trim();return clean.length<=max?clean:`${clean.slice(0,max).replace(/\s+\S*$/,'')}…`}

export default function MemberProjectDetailBodyV3({model,roles,contributionAreas,projectId,canApply}:Props){
  const {challenge,deliverables,successCriteria,acceptanceChecks,stakeholderHandover,timeline,capabilities}=model;
  const selectableRoles=roles.filter(role=>role.available&&((role.remaining??role.openings)>0));
  const [selectedRoleId,setSelectedRoleId]=useState(selectableRoles[0]?.id||'');
  const selectedRole=roles.find(role=>role.id===selectedRoleId)||null;
  const capabilitySignals=useMemo(()=>[...capabilities.technical,...capabilities.professional,...capabilities.methodsAndTools].filter((item,index,items)=>items.indexOf(item)===index).slice(0,10),[capabilities]);
  const qualityGroups=[
    {title:'Data integrity',items:['Source reconciles to the governed project evidence.','Assumptions and exclusions are documented.']},
    {title:'Analytical quality',items:['A credible baseline or comparison is present.','Error and material failure cases are explicitly tested.']},
    {title:'Decision quality',items:['The recommendation answers the recorded decision.','Counter-evidence and evidence boundaries remain visible.']},
    {title:'Professional delivery',items:['Work is reproducible.','Evidence is traceable to named deliverables.']}
  ];
  const roleCards=roles.length?roles:contributionAreas.map(area=>({id:area.slug,title:area.title,description:area.description,skills:[],openings:0,remaining:null,available:false,responsibilities:[],recommendedSkills:[],experienceExpectation:null,weeklyCommitment:null,applicationRequirements:null}));
  return <div className={styles.body} id="member-project-main">
    <nav className={styles.nav} aria-label="Project sections"><div className={styles.navInner}><a href="#overview">Overview</a><a href="#deliverables">Deliverables</a><a href="#quality">Success standards</a><a href="#roles">Roles</a><a href="#timeline">Timeline</a></div></nav>

    <section className={styles.section} id="overview" aria-labelledby="member-overview-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>01 · Overview</span><h2 id="member-overview-title">Project brief</h2></div><p className={styles.sectionIntro}>Enough detail to make an application decision; the full operational specification remains progressively disclosed.</p></div>
      <div className={styles.insights}>
        <article className={styles.insight}><span>Challenge</span><h3>{short(challenge.problemStatement||model.project.summary,150)}</h3><p>Understand why the project exists and what evidence gap the team must close.</p></article>
        <article className={`${styles.insight} ${styles.insightDecision}`}><span>Decision to support</span><h3>{short(challenge.decisionToSupport||challenge.primaryObjective||challenge.useCase,180)||'Defined project decision'}</h3><p>The final recommendation must answer this decision directly.</p></article>
        <article className={styles.insight}><span>Outcome</span><h3>{short(challenge.primaryObjective||challenge.useCase,140)||'A decision-ready project outcome'}</h3><p>The work should produce a bounded recommendation, not just analysis or artefacts.</p></article>
      </div>
      {(challenge.businessContext||challenge.useCase||challenge.constraintsTradeOffs.length||challenge.assumptions.length||challenge.outOfScope.length||challenge.responsibleUseRisks.length)&&<details className={styles.details}><summary>Detailed context, assumptions and responsible-use boundaries</summary><div className={styles.detailBody}>{challenge.businessContext&&<><h3>Business context</h3><p>{challenge.businessContext}</p></>}{challenge.useCase&&<><h3>Primary use case</h3><p>{challenge.useCase}</p></>}{challenge.constraintsTradeOffs.length>0&&<><h3>Constraints</h3><ul>{challenge.constraintsTradeOffs.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.assumptions.length>0&&<><h3>Assumptions</h3><ul>{challenge.assumptions.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.outOfScope.length>0&&<><h3>Out of scope</h3><ul>{challenge.outOfScope.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul></>}{challenge.responsibleUseRisks.length>0&&<><h3>Responsible use</h3><ul>{challenge.responsibleUseRisks.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul></>}</div></details>}
    </section>

    <section className={styles.section} id="deliverables" aria-labelledby="member-deliverables-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>02 · Delivery</span><h2 id="member-deliverables-title">What the team will deliver</h2></div><p className={styles.sectionIntro}>Primary outputs are scannable; acceptance evidence stays available without dominating the page.</p></div>
      {deliverables.length?<div className={styles.deliverables}>{deliverables.slice(0,8).map((item,index)=><article className={styles.deliverable} key={item.id}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{item.title}</strong>{item.publicSummary&&item.publicSummary!==item.title&&<p>{short(item.publicSummary,150)}</p>}</div></article>)}</div>:<div className={styles.empty}>Detailed deliverables are being finalised.</div>}
      {deliverables.length>8&&<details className={styles.details}><summary>View all {deliverables.length} deliverables and acceptance evidence</summary><div className={styles.detailBody}>{deliverables.map((item,index)=><div key={item.id}><h3>{String(index+1).padStart(2,'0')} · {item.title}</h3>{item.publicSummary&&item.publicSummary!==item.title&&<p>{item.publicSummary}</p>}{item.acceptanceCriteria&&<p><strong>Acceptance:</strong> {item.acceptanceCriteria}</p>}</div>)}</div></details>}
    </section>

    <section className={styles.section} id="quality" aria-labelledby="member-quality-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>03 · Quality</span><h2 id="member-quality-title">How the work will be assessed</h2></div><p className={styles.sectionIntro}>The quality model is visible before application, with full criteria available only when you need deeper review.</p></div>
      <div className={styles.quality}>{qualityGroups.map(group=><article key={group.title}><h3>{group.title}</h3><ul>{group.items.map(item=><li key={item}>{item}</li>)}</ul></article>)}</div>
      {successCriteria.length>0&&<details className={styles.details}><summary>View all {successCriteria.length} project criteria</summary><div className={styles.detailBody}><ol>{successCriteria.map(item=><li key={item}>{item}</li>)}</ol>{acceptanceChecks.length>0&&<><h3>Acceptance & quality checks</h3><ul>{acceptanceChecks.map(item=><li key={item}>{item}</li>)}</ul></>}{stakeholderHandover&&<><h3>Stakeholder handover</h3><p>{stakeholderHandover}</p></>}</div></details>}
    </section>

    <section className={styles.section} id="roles" aria-labelledby="member-roles-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>04 · Your contribution</span><h2 id="member-roles-title">Choose your contribution area</h2></div><p className={styles.sectionIntro}>Available contribution areas are backend-authoritative. Filled roles cannot be selected.</p></div>
      {capabilitySignals.length>0&&<div className={styles.capabilities} aria-label="Capabilities in practice">{capabilitySignals.map(item=><span key={item}>{item}</span>)}</div>}
      {roleCards.length?<div className={styles.roles}>{roleCards.map(role=>{const selectable=role.available&&((role.remaining??role.openings)>0);const selected=selectable&&role.id===selectedRoleId;const mission=short(role.responsibilities[0]||role.description||`${role.title} owns a defined project workstream and the evidence produced from it.`,150);return <article key={role.id} className={`${styles.role} ${selectable?styles.roleSelectable:''} ${selected?styles.roleSelected:''} ${!selectable?styles.roleUnavailable:''}`} role={selectable?'button':undefined} tabIndex={selectable?0:undefined} aria-pressed={selectable?selected:undefined} onClick={()=>selectable&&setSelectedRoleId(role.id)} onKeyDown={event=>{if(selectable&&(event.key==='Enter'||event.key===' ')){event.preventDefault();setSelectedRoleId(role.id)}}}><div className={styles.roleTop}><h3>{role.title}</h3><span className={styles.capacity}>{selectable?`${role.remaining??role.openings} place${(role.remaining??role.openings)===1?'':'s'} available`:'At capacity'}</span></div><p>{mission}</p>{role.skills.length>0&&<div className={styles.chips}>{role.skills.slice(0,4).map(skill=><span key={skill}>{skill}</span>)}</div>}{(role.responsibilities.length>1||role.recommendedSkills.length>0||role.experienceExpectation||role.weeklyCommitment||role.applicationRequirements)&&<details><summary>Role details</summary><div>{role.responsibilities.length>0&&<ul>{role.responsibilities.slice(0,5).map(item=><li key={item}>{item}</li>)}</ul>}{role.experienceExpectation&&<p>{role.experienceExpectation}</p>}{role.weeklyCommitment&&<p><strong>Commitment:</strong> {role.weeklyCommitment}</p>}{role.applicationRequirements&&<p><strong>Application:</strong> {role.applicationRequirements}</p>}</div></details>}</article>})}</div>:<div className={styles.empty}>Contribution areas are still being prepared.</div>}
      <div className={styles.applyBand}><div><span className={styles.eyebrow}>Selected contribution area</span><h3>{selectedRole?.title||'Choose an available contribution area'}</h3><p>{selectedRole?'Review the role expectations, confirm your availability and continue to the application form.':'Select an available contribution area before continuing.'}</p></div>{canApply&&selectedRole?<Link className={styles.primaryButton} href={`/member/discover/${projectId}/apply?role=${encodeURIComponent(selectedRole.id)}`}>Apply as {selectedRole.title}</Link>:<span/>}</div>
    </section>

    <section className={styles.section} id="timeline" aria-labelledby="member-timeline-title"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>05 · Journey</span><h2 id="member-timeline-title">Project delivery plan</h2></div><p className={styles.sectionIntro}>A compact journey replaces repeated process copy and keeps Mettelo Lab clearly separated as the authorised delivery workspace.</p></div>
      {timeline.length?<div className={styles.timeline}>{timeline.slice(0,6).map(item=><div key={item.id}><strong>{item.title}</strong>{item.description&&<p>{short(item.description,180)}</p>}</div>)}</div>:<div className={styles.timeline}><div><strong>01 — Apply</strong><p>Choose a contribution area and submit your application.</p></div><div><strong>02 — Team formation</strong><p>Accepted members are assigned to the project workspace.</p></div><div><strong>03 — Project delivery</strong><p>Work through milestones, reviews and assigned deliverables.</p></div><div><strong>04 — Evidence review</strong><p>Your contribution is reviewed against project standards.</p></div><div><strong>05 — Handover</strong><p>Complete the final recommendation, evidence pack and professional handover.</p></div></div>}
    </section>

    {canApply&&selectedRole&&<div className={styles.mobileAction}><Link className={styles.primaryButton} href={`/member/discover/${projectId}/apply?role=${encodeURIComponent(selectedRole.id)}`}>Apply as {selectedRole.title}</Link></div>}
  </div>;
}
