import {notFound,redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import ProjectDataGovernance from '@/components/ProjectDataGovernance';
import styles from './phase4-workspace.module.css';

type Membership={membership_status:string;project_run_id:string|null;team_role:string;project_runs:{status:string}|null};
type TeamRow={user_id:string;team_role:string;membership_status:string};
type ProfileRow={id:string;full_name:string|null};
type TaskRow={id:string;title:string;status:string;due_at:string|null};
type MilestoneRow={status:string};
type MeetingRow={title:string;starts_at:string;timezone:string|null};
type DataSourceRow={id:string;name:string;owner_user_id:string|null;version_label:string|null;external_url:string;provenance:string|null;download_policy:string;publish_policy:string};
type DataVersionRow={id:string;data_source_id:string;version_label:string;external_url:string;change_summary:string|null;created_at:string};

function humanise(value:string|undefined|null){return (value||'member').replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}
function formatMeeting(meeting:MeetingRow|null){if(!meeting)return'Not scheduled yet';try{return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:meeting.timezone||'Europe/London'}).format(new Date(meeting.starts_at))}catch{return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'}).format(new Date(meeting.starts_at))}}

export default async function ProjectWorkspaceGate({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}){
  const {id}=await params;const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/projects/${id}`)}`);const isAdmin=user.app_metadata?.role==='admin';
  const [{data:project},{data:membershipResult}]=await Promise.all([supabase.from('projects').select('id,title,summary,status').eq('id',id).maybeSingle(),supabase.from('project_members').select('membership_status,project_run_id,team_role,project_runs(status)').eq('project_id',id).eq('user_id',user.id).order('joined_at',{ascending:false}).limit(1).maybeSingle()]);
  const membership=membershipResult as unknown as Membership|null;if(!project||(!membership&&!isAdmin))notFound();
  let runStatus=membership?.project_runs?.status||null;if(!isAdmin&&(!membership||!['active','completed'].includes(membership.membership_status)||!runStatus||!['active','review','completed'].includes(runStatus)))redirect('/member#applications');
  let runId=membership?.project_run_id||null;if(!runId&&isAdmin){const {data:latestRun}=await supabase.from('project_runs').select('id,status').eq('project_id',id).in('status',['active','review','completed']).order('run_number',{ascending:false}).limit(1).maybeSingle();runId=latestRun?.id||null;runStatus=latestRun?.status||null}

  let teamRows:TeamRow[]=[],tasks:TaskRow[]=[],milestones:MilestoneRow[]=[],dataSources:DataSourceRow[]=[],dataVersions:DataVersionRow[]=[];let nextMeeting:MeetingRow|null=null;let architectUserId:string|null=null;
  if(runId){const now=new Date().toISOString();const [teamResult,taskResult,milestoneResult,meetingResult,dataResult,versionResult,architectResult]=await Promise.all([
    supabase.from('project_members').select('user_id,team_role,membership_status').eq('project_id',id).eq('project_run_id',runId).in('membership_status',['waiting','active','completed']).order('joined_at'),
    supabase.from('project_tasks').select('id,title,status,due_at').eq('project_id',id).eq('project_run_id',runId).eq('assignee_user_id',user.id).neq('status','done').order('due_at',{ascending:true,nullsFirst:false}).limit(10),
    supabase.from('project_milestones').select('status').eq('project_id',id).eq('project_run_id',runId),
    supabase.from('project_meetings').select('title,starts_at,timezone').eq('project_id',id).eq('project_run_id',runId).neq('status','cancelled').gte('starts_at',now).order('starts_at').limit(1).maybeSingle(),
    supabase.from('project_data_sources').select('id,name,owner_user_id,version_label,external_url,provenance,download_policy,publish_policy').eq('project_id',id).eq('project_run_id',runId).order('updated_at',{ascending:false}),
    supabase.from('project_data_source_versions').select('id,data_source_id,version_label,external_url,change_summary,created_at').eq('project_run_id',runId).order('created_at',{ascending:false}).limit(100),
    supabase.from('project_architect_assignments').select('user_id').eq('project_id',id).eq('assignment_status','active').limit(1).maybeSingle()
  ]);teamRows=(teamResult.data||[]) as TeamRow[];tasks=(taskResult.data||[]) as TaskRow[];milestones=(milestoneResult.data||[]) as MilestoneRow[];nextMeeting=(meetingResult.data||null) as MeetingRow|null;dataSources=(dataResult.data||[]) as DataSourceRow[];dataVersions=(versionResult.data||[]) as DataVersionRow[];architectUserId=architectResult.data?.user_id||null}

  const profileIds=[...new Set([...teamRows.map(member=>member.user_id),...(architectUserId?[architectUserId]:[])])];const {data:profilesData}=profileIds.length?await supabase.from('profiles').select('id,full_name').in('id',profileIds):{data:[] as ProfileRow[]};const profiles=(profilesData||[]) as ProfileRow[];const profileNames=new Map(profiles.map(profile=>[profile.id,profile.full_name||'Mettelo member']));
  const lead=teamRows.find(member=>member.team_role==='project_lead');const architect=architectUserId?{user_id:architectUserId}:teamRows.find(member=>member.team_role==='project_architect');const nextTask=tasks[0]||null;const completedMilestones=milestones.filter(item=>item.status==='completed').length;const workspaceStatus=(runStatus||project.status||'active').replaceAll('_',' ');const isCompleted=workspaceStatus==='completed';const canLead=isAdmin||membership?.team_role==='project_lead';

  return <div className={styles.workspace}>
    <a className={styles.skipLink} href="#project-workspace-content">Skip to project workspace</a>
    <header className={styles.header}><div className={styles.headerInner}><div><p className={styles.breadcrumb}><a href="/member#projects">My Mettelo</a> / Project workspace</p><h1 className={styles.title}>{project.title}</h1><div className={styles.meta} aria-label="Project status and your role"><span className={styles.badge}>{humanise(workspaceStatus)}</span><span className={styles.badge}>Your role: {humanise(membership?.team_role||(isAdmin?'admin':'member'))}</span></div></div></div></header>
    <div className={styles.body}>
      <nav className={styles.nav} aria-label="Project workspace navigation"><p className={styles.navTitle}>Project workspace</p><a href="#phase4-overview">Overview</a><a href="#delivery">Tasks</a><a href="#discussion">Conversation</a><a href="#phase4-data-governance">Data</a><a href="#meetings">Events</a><a href="#proof">Contributions</a><a href="#team">Team</a>{canLead&&<a href="#completion">Delivery health</a>}</nav>
      <main id="project-workspace-content" className={styles.main} tabIndex={-1}>
        <section id="phase4-overview" className={styles.kickoff} aria-labelledby="phase4-overview-title">
          <h2 id="phase4-overview-title">{isCompleted?'Project complete':'Welcome to your project workspace'}</h2><p className={styles.kickoffLead}>{isCompleted?'This workspace is now your project record. You can review the work, decisions, events and approved contributions below.':project.summary||'Everything you need to understand your role, complete the work and stay aligned with your team is here.'}</p>
          <div className={styles.grid}>
            <div className={styles.card}><span className={styles.cardLabel}>Your role</span><strong>{humanise(membership?.team_role||(isAdmin?'admin':'member'))}</strong><span>{teamRows.length?`${teamRows.length} people in this project team`:'Project team'}</span></div>
            <div className={styles.card}><span className={styles.cardLabel}>Project Lead</span><strong>{lead?profileNames.get(lead.user_id)||'Project Lead':'Not assigned yet'}</strong><span>{lead?'Delivery and blocker support':'You will see the Lead here when assigned'}</span></div>
            <div className={styles.card}><span className={styles.cardLabel}>Project Architect</span><strong>{architect?profileNames.get(architect.user_id)||'Project Architect':'Not assigned yet'}</strong><span>{architect?'Governance and project quality':'You will see the Architect here when assigned'}</span></div>
            <div className={styles.card}><span className={styles.cardLabel}>Progress</span><strong>{completedMilestones} of {milestones.length} milestones complete</strong><span>Project status: {humanise(workspaceStatus)}</span></div>
          </div>
          <div className={styles.next}><div className={styles.nextText}><span className={styles.cardLabel}>{isCompleted?'Project record':'Your next action'}</span><strong>{isCompleted?'Review your approved contributions':nextTask?.title||'No task needs your attention yet'}</strong><p>{isCompleted?'Your completed work remains available in this workspace.':nextTask?(nextTask.due_at?`Due ${new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(nextTask.due_at))}.`:'Open the task to review the requirement and expected evidence.'):(nextMeeting?`Next meeting: ${nextMeeting.title} · ${formatMeeting(nextMeeting)}`:'Your Project Lead will notify you when the next action is ready.')}</p></div><a className={styles.action} href={isCompleted?'#proof':nextTask?'#delivery':nextMeeting?'#meetings':'#team'}>{isCompleted?'View contributions':nextTask?'Open my tasks':nextMeeting?'View next event':'View team'}</a></div>
        </section>
        <ProjectDataGovernance projectId={id} projectRunId={runId} currentUserId={user.id} canLead={canLead} sources={dataSources} versions={dataVersions}/>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  </div>;
}
