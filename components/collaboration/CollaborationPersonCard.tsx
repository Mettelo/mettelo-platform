'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './CollaborationNetwork.module.css';

export type CollaborationMember={
 username:string;
 full_name:string|null;
 headline:string|null;
 current_job_title:string|null;
 professional_area:string|null;
 experience_level:string|null;
 project_availability:string|null;
 weekly_capacity:string|null;
 skills:string[];
 preferred_roles:string[];
 avatar_url:string|null;
 invitation_state?:'pending'|null;
 match_label?:string|null;
 match_detail?:string|null;
 match_skills?:string[];
};

type Props={
 member:CollaborationMember;
 profileHref:string;
 hasProjectContext:boolean;
 pending:boolean;
 working:string;
 recommended?:boolean;
 onInvite:(username:string)=>void;
 onBlock:(username:string)=>void;
};

function human(value:string|null|undefined){
 const text=String(value||'').trim();
 if(!text)return'';
 return text.replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
}

function initials(member:CollaborationMember){
 return String(member.full_name||member.username||'M').split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();
}

export default function CollaborationPersonCard({member,profileHref,hasProjectContext,pending,working,recommended=false,onInvite,onBlock}:Props){
 const available=human(member.project_availability);
 const capacity=human(member.weekly_capacity)||'Not specified';
 const roleLabel=human(member.current_job_title||(member.preferred_roles||[])[0]||member.professional_area)||'Mettelo member';
 const professionalArea=human(member.professional_area)||'Not specified';
 const experience=human(member.experience_level)||'Not specified';
 const summary=member.headline?.trim()||`${roleLabel} open to relevant project collaboration opportunities on Mettelo.`;
 const allSkills=[...new Map([...(member.match_skills||[]),...(member.skills||[])].filter(Boolean).map(skill=>[skill.toLocaleLowerCase('en-GB'),skill])).values()];
 const visibleSkills=allSkills.slice(0,4);
 const hiddenSkills=Math.max(0,allSkills.length-visibleSkills.length);

 return <article className={`${styles.personCard} mcdCard`} role="listitem" aria-labelledby={`collaborator-${member.username}`}>
  <div className={styles.personBody}>
   <header className={styles.identity}>
    <div className={styles.avatar}>
     {member.avatar_url?<Image src={member.avatar_url} alt="" width={56} height={56} unoptimized/>:<span aria-hidden="true">{initials(member)}</span>}
    </div>
    <div className={styles.identityCopy}>
     <h3 id={`collaborator-${member.username}`}>{member.full_name||member.username}</h3>
     <p className={styles.username}>@{member.username}</p>
     <p className={styles.role}>{roleLabel}</p>
    </div>
    {available&&<span className={styles.availability}>{available}</span>}
   </header>

   {(recommended||member.match_label)&&<div className={styles.matchRow}>
    <span className={styles.matchBadge}>{member.match_label||'Relevant match'}</span>
    {member.match_detail&&<span className={styles.matchText}>{member.match_detail}</span>}
   </div>}

   <p className={styles.summary}>{summary}</p>

   {visibleSkills.length>0&&<div className={`${styles.skillList} mcdSkills`} aria-label="Relevant skills">
    {visibleSkills.map(skill=><span className={styles.skill} key={skill}>{human(skill)}</span>)}
    {hiddenSkills>0&&<span className={styles.skillMore}>+{hiddenSkills}</span>}
   </div>}

   <div className={styles.meta}>
    <div className={styles.metaItem}><span>Professional area</span><strong>{professionalArea}</strong></div>
    <div className={styles.metaItem}><span>Experience</span><strong>{experience}</strong></div>
    <div className={styles.metaItem}><span>Commitment</span><strong>{capacity}</strong></div>
   </div>
  </div>

  <div className={`${styles.actions} ${!hasProjectContext?styles.single:''}`}>
   {hasProjectContext&&(pending?<span className={styles.pending} role="status">Request pending</span>:<button className={styles.primary} type="button" onClick={()=>onInvite(member.username)} disabled={Boolean(working)} aria-label={`Send team request to ${member.full_name||member.username}`}>{working===`invite:${member.username}`?'Sending…':'Invite to project'}</button>)}
   <Link className={styles.secondary} href={profileHref}>View profile</Link>
  </div>

  <div className={styles.footer}>
   <details className={styles.more}>
    <summary aria-label={`More actions for ${member.full_name||member.username}`}>More ···</summary>
    <div className={styles.moreMenu}><button type="button" onClick={()=>onBlock(member.username)} disabled={Boolean(working)}>{working===`block:${member.username}`?'Blocking…':'Block member'}</button></div>
   </details>
  </div>
 </article>;
}
