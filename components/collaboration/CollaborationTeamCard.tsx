import Link from 'next/link';
import styles from './CollaborationNetwork.module.css';

export type CollaborationTeamCardData={
 need:{id:string;responsibility:string|null;weekly_commitment:string|null};
 project:{id:string;title:string;summary:string|null;weekly_commitment:string|null};
 role:string|null;
 domain:string|null;
 capabilities:string[];
 occupied:number;
 maximum:number;
 openPlaces:number;
};

function label(value:string|null|undefined){return String(value||'').trim()}

export default function CollaborationTeamCard({item}:{item:CollaborationTeamCardData}){
 const role=label(item.role||item.need.responsibility)||'Project collaboration';
 const domain=label(item.domain);
 const commitment=label(item.need.weekly_commitment||item.project.weekly_commitment)||'See project brief';
 const visibleSkills=item.capabilities.slice(0,3);
 const hiddenSkills=Math.max(0,item.capabilities.length-visibleSkills.length);

 return <article className={styles.teamCard}>
  <div className={styles.teamBody}>
   <header className={styles.teamHead}>
    <div className={styles.teamHeadCopy}>
     <div className={styles.teamEyebrow}>COLLABORATOR NEEDED</div>
     <h3>{item.project.title}</h3>
     <p className={styles.teamSubline}>{[role,domain].filter(Boolean).join(' · ')}</p>
    </div>
    <span className={styles.openBadge}>{item.openPlaces} place{item.openPlaces===1?'':'s'} open</span>
   </header>

   {item.project.summary&&<p className={styles.teamDescription}>{item.project.summary}</p>}

   {visibleSkills.length>0&&<div className={styles.skillList} aria-label="Capabilities requested">
    {visibleSkills.map(value=><span className={styles.skill} key={value}>{value}</span>)}
    {hiddenSkills>0&&<span className={styles.skillMore}>+{hiddenSkills}</span>}
   </div>}

   <div className={styles.teamStats}>
    <div className={styles.teamStat}><span>Team</span><strong>{item.occupied} / {item.maximum}</strong></div>
    <div className={styles.teamStat}><span>Commitment</span><strong>{commitment}</strong></div>
    <div className={styles.teamStat}><span>Joining</span><strong>Open</strong></div>
   </div>
  </div>

  <div className={styles.teamActions}>
   <Link className={styles.primary} href={`/member/discover/${item.project.id}?collaboration_need=${encodeURIComponent(item.need.id)}`}>View opportunity</Link>
   <Link className={styles.textAction} href={`/member/discover/${item.project.id}`}>View project →</Link>
  </div>
 </article>;
}
