import type {ReactNode} from 'react';
import {serviceDb} from '@/lib/project-flow';
import {resolveProjectTeamOverview,type ProjectTeamOverview,type ProjectTeamOverviewMember} from '@/lib/project-team-overview';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import styles from './MetteloLabPanel.module.css';

type TeamMember={id:string;name:string;headline:string|null;role:string};
type Discussion={id:string;author_user_id:string;body:string;created_at:string};
type NextTask={title:string;due_at:string|null}|null;
type NextMeeting={title:string;starts_at:string}|null;
type Props={projectId:string;projectRunId:string|null;projectTitle:string;projectSummary:string|null;projectType:string;runNumber:number|null;runStatus:string;currentUserId:string;workspaceRole:string;team:TeamMember[];projectArchitectName:string|null;canManageSubmissionPermissions:boolean;completedMilestones:number;totalMilestones:number;completedTasks:number;totalTasks:number;nextTask:NextTask;nextMeeting:NextMeeting;recentDiscussions:Discussion[];reviewSlot?:ReactNode};

function humanise(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}
function formatDate(value:string){return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}
function initials(name:string){return name.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase()}
function roleLabel(role:string){return role==='project_lead'?'Leader':role==='project_architect'?'Architect':role==='reviewer'?'Reviewer':role.replaceAll('_',' ')}
function progress(completed:number,total:number){if(total<=0)return 0;return Math.max(0,Math.min(100,Math.round((completed/total)*100)))}

export default async function MetteloLabPanel(props:Props){
 const db=serviceDb();
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 const isAdmin=user?.id===props.currentUserId&&user.app_metadata?.role==='admin';
 const fallbackOverview:ProjectTeamOverview={project_type:props.projectType,current_run_id:props.projectRunId,teams:[]};
 const teamOverview=db?await resolveProjectTeamOverview({db,projectId:props.projectId,userId:props.currentUserId,isAdmin,currentRunId:props.projectRunId})||fallbackOverview:fallbackOverview;
 const current=teamOverview.teams.find(team=>team.id===props.projectRunId&&team.is_member)||teamOverview.teams.find(team=>team.is_member)||null;
 const lead=props.team.find(member=>member.role==='project_lead');
 const architect=props.projectArchitectName||props.team.find(member=>member.role==='project_architect')?.name||null;
 const names=new Map(props.team.map(member=>[member.id,member.name]));
 const noTeam=!props.projectRunId;
 const viewHref=(view:string)=>{const query=new URLSearchParams({...(props.projectRunId?{run:props.projectRunId}:{}),view});return `/member/projects/${props.projectId}?${query.toString()}`};
 const actionTitle=noTeam?'Your team is still being formed':props.nextTask?.title||'No task needs your attention yet';
 const actionCopy=noTeam?'We’ll notify you when you are placed into a team.':props.nextTask?(props.nextTask.due_at?`Due ${new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(props.nextTask.due_at))}.`:'Open the task to review what is required.'):(props.nextMeeting?`Next team event: ${props.nextMeeting.title} · ${formatDate(props.nextMeeting.starts_at)}`:'Your Project Lead will notify you when the next action is ready.');
 const actionHref=noTeam?viewHref('team'):props.nextTask?viewHref('tasks'):props.nextMeeting?viewHref('events'):viewHref('team');
 const actionLabel=noTeam?'View team status':props.nextTask?'Continue task':props.nextMeeting?'View next event':'View team';
 const milestoneProgress=progress(props.completedMilestones,props.totalMilestones);
 const taskProgress=progress(props.completedTasks,props.totalTasks);
 return <section className={styles.metteloLab} id="mettelo-lab" aria-labelledby="mettelo-lab-title">
  <header className={styles.labHeader} data-lab-home-section>
   <div className={styles.headerMain}><span className={styles.labEyebrow}>METTELO LAB / HOME</span><h2 id="mettelo-lab-title">{props.projectTitle}</h2><p>{props.projectSummary||'Your project workspace for planning, delivery, collaboration, data, events and proof.'}</p></div>
   <aside className={styles.headerContext} aria-label="Your project context"><span className={styles.contextLabel}>YOUR CONTEXT</span><strong>{humanise(props.workspaceRole)}</strong><small>{current?`Team ${current.run_number}`:'Team forming'} · {humanise(props.runStatus)}</small></aside>
  </header>
  <section className={styles.nextAction} data-lab-home-section aria-labelledby="lab-next-action"><div className={styles.nextActionCopy}><span className={styles.labLabel}>UP NEXT</span><h3 id="lab-next-action">{actionTitle}</h3><p>{actionCopy}</p></div><a className={styles.labButton} href={actionHref}>{actionLabel}<span aria-hidden="true">→</span></a></section>
  <section className={styles.summary} data-lab-home-section aria-labelledby="lab-summary-title">
   <div className={styles.sectionTitle}><span className={styles.labLabel}>PROJECT PROGRESS</span><h3 id="lab-summary-title">Where things stand</h3><p>Focus on delivery progress first, then the people and working state around it.</p></div>
   <div className={styles.progressGrid}>
    <ProgressCard label="Milestones" completed={props.completedMilestones} total={props.totalMilestones} percent={milestoneProgress}/>
    <ProgressCard label="Tasks" completed={props.completedTasks} total={props.totalTasks} percent={taskProgress}/>
   </div>
   <div className={styles.summaryGrid}><Stat label="Project Lead" value={lead?.name||'Not assigned yet'}/><Stat label="Project Architect" value={architect||'Not assigned yet'}/><Stat label="Team status" value={humanise(props.runStatus)}/><Stat label="Your role" value={humanise(props.workspaceRole)}/></div>
  </section>
  <section className={styles.teamRoster} data-lab-team-section id="team" aria-labelledby="team-roster-title">
   <div className={styles.teamHero}>
    <div><span className={styles.cardNumber}>METTELO LAB / TEAM</span><h3 id="team-roster-title">{current?`Team ${current.run_number}`:'Your team'}</h3><p className={styles.teamIntro}>The people working with you on this project, their responsibilities and the current team state. Other cohorts are intentionally not shown.</p></div>
    <div className={styles.teamSnapshot} aria-label="Team status"><span>{current?humanise(current.status):'Forming'}</span><strong>{current?`${current.members.length}/${current.required_team_size??current.members.length}`:'—'}</strong><small>{current?'members':'team placement'}</small></div>
   </div>
   {current?<>
    <div className={styles.teamMeta}><span><strong>Your role</strong><b>{humanise(props.workspaceRole)}</b></span><span><strong>Project Lead</strong><b>{lead?.name||'Not assigned yet'}</b></span><span><strong>Project Architect</strong><b>{architect||'Not assigned yet'}</b></span></div>
    <div className={styles.teamGrid}>{current.members.length?current.members.map(member=><RosterMember key={member.id} member={member} currentUserId={props.currentUserId} canManageSubmissionPermissions={props.canManageSubmissionPermissions} completionHref={viewHref('proof')}/>):<div className={styles.labEmpty}><strong>You’re the first member of this team.</strong><p>Other approved members will appear here as the team fills.</p></div>}</div>
   </>:<div className={styles.labEmpty}><strong>Your team is still being formed.</strong><p>Your working team will appear here once placement is complete. You will not see members from other cohorts.</p></div>}
  </section>
  <section className={styles.activity} data-lab-home-section aria-labelledby="lab-activity-title"><div className={styles.sectionTitle}><span className={styles.labLabel}>PROJECT PULSE</span><h3 id="lab-activity-title">Latest from Chat</h3><p>Recent team context without turning Home into another message feed.</p></div>{props.recentDiscussions.length?<div className={styles.activityList}>{props.recentDiscussions.slice(0,3).map(item=><article key={item.id}><div className={styles.activityMeta}><strong>{names.get(item.author_user_id)||'Mettelo member'}</strong><small>{formatDate(item.created_at)}</small></div><p>{item.body}</p></article>)}</div>:<div className={styles.labEmpty}><strong>Start your team’s project discussion.</strong><p>Messages, decisions and blockers will appear here once your team starts collaborating.</p></div>}<a className={styles.labLink} href={viewHref('chat')}>Go to Chat →</a></section>
  {props.reviewSlot?<div data-lab-home-section>{props.reviewSlot}</div>:null}
 </section>;
}
function ProgressCard({label,completed,total,percent}:{label:string;completed:number;total:number;percent:number}){return <article className={styles.progressCard}><div><span>{label}</span><strong>{total>0?`${completed} of ${total}`:'Not started'}</strong></div><div className={styles.progressTrack} role="progressbar" aria-label={`${label} completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{width:`${percent}%`}}/></div><small>{percent}% complete</small></article>}
function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><span>{label}</span><strong>{value}</strong></div>}
function RosterMember({member,currentUserId,canManageSubmissionPermissions,completionHref}:{member:ProjectTeamOverviewMember;currentUserId:string;canManageSubmissionPermissions:boolean;completionHref:string}){
 const isCurrent=member.id===currentUserId;
 return <article className={styles.teamMember} data-current-user={isCurrent?'true':undefined}>
  {member.avatar_url?<span className={`${styles.personAvatar} ${styles.personAvatarPhoto}`} style={{backgroundImage:`url(${member.avatar_url})`}} aria-label={`${member.name} profile photo`}/>:<span className={styles.personAvatar} aria-hidden="true">{initials(member.name)}</span>}
  <div className={styles.memberContent}>
   <div className={styles.memberHeading}><div><strong>{member.name}</strong>{isCurrent&&<span className={styles.youLabel}>You</span>}</div><span className={styles.rolePill}>{roleLabel(member.role)}</span></div>
   {member.headline&&<p className={styles.memberHeadline}>{member.headline}</p>}
   <div className={styles.memberMeta}><span>Status · {humanise(member.status)}</span>{member.can_submit_final_proof&&<span>Final Proof delegate</span>}</div>
   {canManageSubmissionPermissions&&!isCurrent&&<a className={styles.permissionLink} href={completionHref}>Manage submission permissions →</a>}
  </div>
 </article>
}
