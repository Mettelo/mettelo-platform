import type {ReactNode} from 'react';
import {serviceDb} from '@/lib/project-flow';
import {resolveProjectTeamOverview,type ProjectTeamOverview,type ProjectTeamOverviewMember} from '@/lib/project-team-overview';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import ProjectLabCanonicalBrief from '@/components/project-experience/ProjectLabCanonicalBrief';
import styles from './MetteloLabPanel.module.css';

type TeamMember={id:string;name:string;headline:string|null;role:string};
type Discussion={id:string;author_user_id:string;body:string;created_at:string};
type NextTask={title:string;due_at:string|null}|null;
type NextMeeting={title:string;starts_at:string}|null;
type Props={projectId:string;projectRunId:string|null;projectTitle:string;projectSummary:string|null;projectType:string;runNumber:number|null;runStatus:string;currentUserId:string;workspaceRole:string;team:TeamMember[];projectArchitectName:string|null;canManageSubmissionPermissions:boolean;completedMilestones:number;totalMilestones:number;completedTasks:number;totalTasks:number;nextTask:NextTask;nextMeeting:NextMeeting;recentDiscussions:Discussion[];reviewSlot?:ReactNode};

type MilestoneSnapshot={title:string;status:string;due_at:string|null};
type WorkSnapshot={title:string;status:string;due_at:string|null};

function humanise(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}
function formatDate(value:string){return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}
function shortDate(value:string|null){return value?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(value)):null}
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
 let currentMilestone:MilestoneSnapshot|null=null;
 let blockedWork:WorkSnapshot[]=[];
 let upcomingWork:WorkSnapshot[]=[];
 if(props.projectRunId){
  const [milestoneResult,blockedResult,upcomingResult]=await Promise.all([
   auth.from('project_milestones').select('title,status,due_at').eq('project_id',props.projectId).eq('project_run_id',props.projectRunId).neq('status','completed').order('sort_order',{ascending:true}).order('due_at',{ascending:true,nullsFirst:false}).limit(1).maybeSingle(),
   auth.from('project_tasks').select('title,status,due_at').eq('project_id',props.projectId).eq('project_run_id',props.projectRunId).eq('status','blocked').order('due_at',{ascending:true,nullsFirst:false}).limit(5),
   auth.from('project_tasks').select('title,status,due_at').eq('project_id',props.projectId).eq('project_run_id',props.projectRunId).neq('status','done').neq('status','blocked').order('due_at',{ascending:true,nullsFirst:false}).limit(3)
  ]);
  currentMilestone=(milestoneResult.data||null) as MilestoneSnapshot|null;
  blockedWork=(blockedResult.data||[]) as WorkSnapshot[];
  upcomingWork=(upcomingResult.data||[]) as WorkSnapshot[];
 }
 const viewHref=(view:string)=>{const query=new URLSearchParams({...(props.projectRunId?{run:props.projectRunId}:{}),view});return `/member/projects/${props.projectId}?${query.toString()}`};
 const actionTitle=noTeam?'Your team is still being formed':props.nextTask?.title||'No task needs your attention yet';
 const actionCopy=noTeam?'We’ll notify you when you are placed into a team.':props.nextTask?(props.nextTask.due_at?`Due ${new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(props.nextTask.due_at))}.`:'Open the task to review what is required.'):(props.nextMeeting?`Next team event: ${props.nextMeeting.title} · ${formatDate(props.nextMeeting.starts_at)}`:'Your Project Lead will notify you when the next action is ready.');
 const actionHref=noTeam?viewHref('team'):props.nextTask?viewHref('tasks'):props.nextMeeting?viewHref('events'):viewHref('team');
 const actionLabel=noTeam?'View team status':props.nextTask?'Continue task':props.nextMeeting?'View next event':'View team';
 const milestoneProgress=progress(props.completedMilestones,props.totalMilestones);
 const taskProgress=progress(props.completedTasks,props.totalTasks);
 const milestoneLabel=currentMilestone?`${currentMilestone.title}${shortDate(currentMilestone.due_at)?` · ${shortDate(currentMilestone.due_at)}`:''}`:'No current milestone';
 const meetingLabel=props.nextMeeting?`${props.nextMeeting.title} · ${formatDate(props.nextMeeting.starts_at)}`:'No upcoming meeting';
 const blockerLabel=blockedWork.length?`${blockedWork.length} blocked task${blockedWork.length===1?'':'s'} · ${blockedWork.map(item=>item.title).slice(0,2).join(' · ')}`:'No active blockers';
 const upcomingLabel=upcomingWork.length?upcomingWork.map(item=>`${item.title}${shortDate(item.due_at)?` · ${shortDate(item.due_at)}`:''}`).join(' · '):'No upcoming tasks';
 return <section className={styles.metteloLab} id="mettelo-lab" aria-labelledby="mettelo-lab-title">
  <header className={styles.labHeader} data-lab-home-section>
   <div className={styles.headerMain}><span className={styles.labEyebrow}>METTELO LAB / HOME</span><h2 id="mettelo-lab-title">{props.projectTitle}</h2><p>{props.projectSummary||'Your workspace for contributing to this project, working with your team and building evidence around the work you deliver.'}</p></div>
   <aside className={styles.headerContext} aria-label="Your project context"><span className={styles.contextLabel}>YOUR CONTEXT</span><strong>{humanise(props.workspaceRole)}</strong><small>{current?`Team ${current.run_number}`:'Team forming'} · {humanise(props.runStatus)}</small></aside>
  </header>
  <ProjectLabCanonicalBrief projectId={props.projectId}/>
  <section className={styles.nextAction} data-lab-home-section aria-labelledby="lab-next-action"><div className={styles.nextActionCopy}><span className={styles.labLabel}>UP NEXT</span><h3 id="lab-next-action">{actionTitle}</h3><p>{actionCopy}</p></div><a className={styles.labButton} href={actionHref}>{actionLabel}<span aria-hidden="true">→</span></a></section>
  <section className={styles.summary} data-lab-home-section aria-labelledby="lab-summary-title">
   <div className={styles.sectionTitle}><span className={styles.labLabel}>PROJECT OVERVIEW</span><h3 id="lab-summary-title">Where things stand</h3><p>See the active run, current milestone, next meeting, blockers and upcoming delivery work from one canonical workspace.</p></div>
   <div className={styles.summaryGrid} aria-label="Current project delivery context"><Stat label="Project status" value={humanise(props.runStatus)}/><Stat label="Team" value={current?`Team ${current.run_number} · ${current.members.length} member${current.members.length===1?'':'s'}`:'Team forming'}/><Stat label="Current milestone" value={milestoneLabel}/><Stat label="Next meeting" value={meetingLabel}/><Stat label="Blockers" value={blockerLabel}/><Stat label="Upcoming work" value={upcomingLabel}/></div>
   <div className={styles.progressGrid}>
    <ProgressCard label="Milestones" completed={props.completedMilestones} total={props.totalMilestones} percent={milestoneProgress}/>
    <ProgressCard label="Tasks" completed={props.completedTasks} total={props.totalTasks} percent={taskProgress}/>
   </div>
   <div className={styles.summaryGrid}><Stat label="Project Lead" value={lead?.name||'Not assigned yet'}/><Stat label="Project Architect" value={architect||'Not assigned yet'}/><Stat label="Team status" value={humanise(props.runStatus)}/><Stat label="Your role" value={humanise(props.workspaceRole)}/></div>
  </section>
  <section className={styles.teamRoster} data-lab-team-section id="team" aria-labelledby="team-roster-title">
   <div className={styles.teamHero}>
    <div><span className={styles.cardNumber}>YOUR TEAM · METTELO LAB</span><h3 id="team-roster-title">{current?`Team ${current.run_number}`:'Your team'}</h3><p className={styles.teamIntro}>See the people working with you on this project, their responsibilities and the current team status.</p></div>
    <div className={styles.teamSnapshot} aria-label="Team status"><span>{current?humanise(current.status):'Forming'}</span><strong>{current?`${current.members.length}/${current.required_team_size??current.members.length}`:'—'}</strong><small>{current?'members':'team placement'}</small></div>
   </div>
   {current?<>
    <div className={styles.teamMeta}><span><strong>Your role</strong><b>{humanise(props.workspaceRole)}</b></span><span><strong>Project Lead</strong><b>{lead?.name||'Not assigned yet'}</b></span><span><strong>Project Architect</strong><b>{architect||'Not assigned yet'}</b></span></div>
    <div className={styles.teamGrid}>{current.members.length?current.members.map(member=><RosterMember key={member.id} member={member} currentUserId={props.currentUserId} canManageSubmissionPermissions={props.canManageSubmissionPermissions} completionHref={viewHref('proof')}/>):<div className={styles.labEmpty}><strong>You’re the first member of this team.</strong><p>Other approved members will appear here as the team fills.</p></div>}</div>
   </>:<div className={styles.labEmpty}><strong>Your team is still being formed.</strong><p>Your working team will appear here once placement is complete.</p></div>}
  </section>
  <section className={styles.activity} data-lab-home-section aria-labelledby="lab-activity-title"><div className={styles.sectionTitle}><span className={styles.labLabel}>PROJECT PULSE</span><h3 id="lab-activity-title">Latest from Chat</h3><p>See recent project discussions, decisions and blockers from your team.</p></div>{props.recentDiscussions.length?<div className={styles.activityList}>{props.recentDiscussions.slice(0,3).map(item=><article key={item.id}><div className={styles.activityMeta}><strong>{names.get(item.author_user_id)||'Mettelo member'}</strong><small>{formatDate(item.created_at)}</small></div><p>{item.body}</p></article>)}</div>:<div className={styles.labEmpty}><strong>Start your team’s project discussion.</strong><p>Messages, decisions and blockers will appear here once your team starts collaborating.</p></div>}<a className={styles.labLink} href={viewHref('chat')}>Go to Chat →</a></section>
  {props.reviewSlot?<div data-lab-home-section>{props.reviewSlot}</div>:null}
 </section>;
}
function ProgressCard({label,completed,total,percent}:{label:string;completed:number;total:number;percent:number}){return <article className={styles.progressCard}><div><span>{label}</span><strong>{total>0?`${completed} of ${total}`:'Not started'}</strong></div><div className={styles.progressTrack} role="progressbar" aria-label={`${label} completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{width:`${percent}%`}}/></div><small>{percent}% complete</small></article>}
function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><span>{label}</span><strong>{value}</strong></div>}
function RosterMember({member,currentUserId,canManageSubmissionPermissions,completionHref}:{member:ProjectTeamOverviewMember;currentUserId:string;canManageSubmissionPermissions:boolean;completionHref:string}){
 const isCurrent=member.id===currentUserId;
 const responsibilityLabel=member.responsibilities.length?member.responsibilities.join(' · '):'Not assigned yet';
 return <article className={styles.teamMember} data-current-user={isCurrent?'true':undefined}>
  {member.avatar_url?<span className={`${styles.personAvatar} ${styles.personAvatarPhoto}`} style={{backgroundImage:`url(${member.avatar_url})`}} aria-label={`${member.name} profile photo`}/>:<span className={styles.personAvatar} aria-hidden="true">{initials(member.name)}</span>}
  <div className={styles.memberContent}>
   <div className={styles.memberHeading}><div><strong>{member.name}</strong>{member.username&&<small>@{member.username}</small>}{isCurrent&&<span className={styles.youLabel}>You</span>}</div><span className={styles.rolePill}>{roleLabel(member.role)}</span></div>
   {member.headline&&<p className={styles.memberHeadline}>{member.headline}</p>}
   <div className={styles.memberMeta}><span>Status · {humanise(member.status)}</span><span>Responsibilities · {responsibilityLabel}</span>{member.can_submit_final_proof&&<span>Can submit final Proof</span>}</div>
   {canManageSubmissionPermissions&&!isCurrent&&<a className={styles.permissionLink} href={completionHref}>Manage submission permissions →</a>}
  </div>
 </article>
}
