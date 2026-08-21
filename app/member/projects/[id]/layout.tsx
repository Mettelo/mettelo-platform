import {Suspense} from 'react';
import {notFound,redirect} from 'next/navigation';
import {serviceDb} from '@/lib/project-flow';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import ProjectDataGovernance from '@/components/ProjectDataGovernance';
import ProjectConversationReadMarker from '@/components/ProjectConversationReadMarker';
import ProjectCompletionRequestPanel from '@/components/ProjectCompletionRequestPanel';
import ProjectContributionStatusPanel from '@/components/ProjectContributionStatusPanel';
import MetteloLabNavigation from '@/components/MetteloLabNavigation';
import MetteloLabSystemPanels from '@/components/MetteloLabSystemPanels';
import MetteloLabViewSurface from '@/components/MetteloLabViewSurface';
import styles from './phase4-workspace.module.css';
import mobileFixes from './phase4-mobile-fixes.module.css';
import interactionPolish from './phase18-interaction-polish.module.css';
import reportedRegressions from './phase18-reported-regressions.module.css';

type Membership={membership_status:string;project_run_id:string|null;team_role:string;project_runs:{status:string}|null};type TeamRow={user_id:string;team_role:string;membership_status:string};type ProfileRow={id:string;full_name:string|null};type DataSourceRow={id:string;name:string;owner_user_id:string|null;version_label:string|null;external_url:string;provenance:string|null;download_policy:string;publish_policy:string};type DataVersionRow={id:string;data_source_id:string;version_label:string;external_url:string;change_summary:string|null;created_at:string};type ConversationRow={id:string;author_user_id:string;created_at:string};
type Readiness={ready:boolean;required_milestones:number;completed_milestones:number;required_tasks:number;completed_tasks:number;project_members_requiring_proof:number;members_with_verified_proof:number;pending_contributions:number;presentation_required:boolean;presentation_status:string};type CompletionRequest={id:string;status:string;review_notes:string|null;requested_at:string;reviewed_at:string|null};
const emptyReadiness:Readiness={ready:false,required_milestones:0,completed_milestones:0,required_tasks:0,completed_tasks:0,project_members_requiring_proof:0,members_with_verified_proof:0,pending_contributions:0,presentation_required:false,presentation_status:'not_booked'};
function humanise(value:string|undefined|null){return(value||'member').replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}

export default async function ProjectWorkspaceGate({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}){
 const {id}=await params;const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/projects/${id}`)}`);const isAdmin=user.app_metadata?.role==='admin';const service=serviceDb();const gateDb=service||supabase;const [{data:project},{data:membershipResult}]=await Promise.all([gateDb.from('projects').select('id,title,summary,status').eq('id',id).maybeSingle(),gateDb.from('project_members').select('membership_status,project_run_id,team_role,project_runs(status)').eq('project_id',id).eq('user_id',user.id).in('membership_status',['waiting','active','completed']).order('joined_at',{ascending:false}).limit(1).maybeSingle()]);const membership=membershipResult as unknown as Membership|null;if(!project||(!membership&&!isAdmin))notFound();
 let runStatus=membership?.project_runs?.status||null;if(!isAdmin&&(!membership||!['active','completed'].includes(membership.membership_status)||!runStatus||!['active','review','completed'].includes(runStatus)))redirect('/member#applications');let runId=membership?.project_run_id||null;if(!runId&&isAdmin){const {data:latestRun}=await gateDb.from('project_runs').select('id,status').eq('project_id',id).in('status',['active','review','completed']).order('run_number',{ascending:false}).limit(1).maybeSingle();runId=latestRun?.id||null;runStatus=latestRun?.status||null}
 let teamRows:TeamRow[]=[],dataSources:DataSourceRow[]=[],dataVersions:DataVersionRow[]=[],conversationRows:ConversationRow[]=[];let architectUserId:string|null=null,lastReadAt:string|null=null;let readiness:Readiness=emptyReadiness;let completionRequest:CompletionRequest|null=null;
 if(runId){const [teamResult,dataResult,versionResult,architectResult,conversationResult,readResult,readinessResult,completionResult]=await Promise.all([
  supabase.from('project_members').select('user_id,team_role,membership_status').eq('project_id',id).eq('project_run_id',runId).in('membership_status',['waiting','active','completed']).order('joined_at'),
  supabase.from('project_data_sources').select('id,name,owner_user_id,version_label,external_url,provenance,download_policy,publish_policy').eq('project_id',id).eq('project_run_id',runId).order('updated_at',{ascending:false}),
  supabase.from('project_data_source_versions').select('id,data_source_id,version_label,external_url,change_summary,created_at').eq('project_run_id',runId).order('created_at',{ascending:false}).limit(100),
  supabase.from('project_architect_assignments').select('user_id').eq('project_id',id).eq('assignment_status','active').limit(1).maybeSingle(),
  supabase.from('project_discussions').select('id,author_user_id,created_at').eq('project_id',id).eq('project_run_id',runId).order('created_at',{ascending:false}).limit(100),
  supabase.from('project_discussion_reads').select('last_read_at').eq('project_run_id',runId).eq('user_id',user.id).maybeSingle(),
  supabase.rpc('project_run_completion_readiness',{target_run:runId}),
  supabase.from('project_completion_requests').select('id,status,review_notes,requested_at,reviewed_at').eq('project_run_id',runId).order('requested_at',{ascending:false}).limit(1).maybeSingle()
 ]);teamRows=(teamResult.data||[]) as TeamRow[];dataSources=(dataResult.data||[]) as DataSourceRow[];dataVersions=(versionResult.data||[]) as DataVersionRow[];architectUserId=architectResult.data?.user_id||null;conversationRows=(conversationResult.data||[]) as ConversationRow[];lastReadAt=readResult.data?.last_read_at||null;readiness=(readinessResult.data||emptyReadiness) as Readiness;completionRequest=(completionResult.data||null) as CompletionRequest|null}
 const unreadCount=conversationRows.filter(row=>row.author_user_id!==user.id&&(!lastReadAt||new Date(row.created_at)>new Date(lastReadAt))).length;const lastMessageId=conversationRows[0]?.id||null;const profileIds=[...new Set([...teamRows.map(member=>member.user_id),...dataSources.map(source=>source.owner_user_id).filter((value):value is string=>Boolean(value)),...(architectUserId?[architectUserId]:[])])];const {data:profilesData}=profileIds.length?await supabase.from('profiles').select('id,full_name').in('id',profileIds):{data:[] as ProfileRow[]};const profiles=(profilesData||[]) as ProfileRow[];const profileNames=new Map(profiles.map(profile=>[profile.id,profile.full_name||'Mettelo member']));const workspaceStatus=(runStatus||project.status||'active').replaceAll('_',' ');const canLead=isAdmin||membership?.team_role==='project_lead';const canReviewCompletion=isAdmin||architectUserId===user.id;const governedSources=dataSources.map(source=>({...source,owner_name:source.owner_user_id?profileNames.get(source.owner_user_id)||'Project member':'Not assigned'}));const completedWork=readiness.required_tasks?Math.round((readiness.completed_tasks/readiness.required_tasks)*100):0;
 const dataPanel=<ProjectDataGovernance projectId={id} projectRunId={runId} currentUserId={user.id} canLead={canLead} sources={governedSources} versions={dataVersions}/>;
 const proofPanel=<ProjectContributionStatusPanel projectId={id} projectRunId={runId}/>;
 const completionPanel=<ProjectCompletionRequestPanel projectId={id} projectRunId={runId} readiness={readiness} initialRequest={completionRequest} canLead={Boolean(membership?.team_role==='project_lead')} canReview={canReviewCompletion} projectStatus={workspaceStatus}/>;
 return <div className={`${styles.workspace} ${mobileFixes.mobileFixes} ${interactionPolish.interactionPolish} ${reportedRegressions.reportedRegressions}`}>
  <a className={styles.skipLink} href="#mettelo-lab-content">Skip to Mettelo Lab content</a>
  <div className={styles.shell}>
   <aside className={styles.rail} aria-label="Mettelo Lab workspace">
    <div className={styles.railIdentity}><p className={styles.railKicker}>METTELO ECOSYSTEM</p><h1 className={styles.labName}>Mettelo Lab</h1><a className={styles.projectTitle} href={`/member/projects/${id}`}>{project.title}</a></div>
    <div className={styles.navGroup}><p className={styles.navTitle}>Core</p><Suspense fallback={null}><MetteloLabNavigation placement="rail-primary" unreadCount={unreadCount} className={styles.nav}/></Suspense></div>
    <div className={styles.navGroup}><p className={styles.navTitle}>Project tools</p><Suspense fallback={null}><MetteloLabNavigation placement="rail-tools" className={styles.nav}/></Suspense></div>
    <div className={styles.railContext}><small>Your context</small><strong>{humanise(membership?.team_role||(isAdmin?'admin':'member'))}</strong><span>{humanise(workspaceStatus)}</span></div>
    <a className={styles.backLink} href="/member#projects">← My Mettelo</a>
   </aside>
   <div className={styles.stage}>
    <header className={styles.mobileHeader}><div><p className={styles.kicker}>METTELO LAB</p><strong>{project.title}</strong></div><div className={styles.mobileMeta}><span>{humanise(workspaceStatus)}</span><span>{humanise(membership?.team_role||(isAdmin?'admin':'member'))}</span></div></header>
    <main id="mettelo-lab-content" className={styles.main} tabIndex={-1}>
     <Suspense fallback={<div className={styles.content}>{children}</div>}><MetteloLabViewSurface className={styles.content}>{children}</MetteloLabViewSurface></Suspense>
     <Suspense fallback={null}><MetteloLabSystemPanels dataPanel={dataPanel} proofPanel={proofPanel} completionPanel={completionPanel}/></Suspense>
     <ProjectConversationReadMarker projectRunId={runId} lastMessageId={lastMessageId}/>
    </main>
    <Suspense fallback={null}><MetteloLabNavigation placement="mobile" unreadCount={unreadCount} className={styles.mobileNav}/><MetteloLabNavigation placement="more" className={styles.moreMenu}/></Suspense>
   </div>
   <aside className={styles.rightRail} aria-label="Mettelo Lab project context">
    <section><p className={styles.kicker}>Project state</p><h2>{humanise(workspaceStatus)}</h2><p>{teamRows.length} team member{teamRows.length===1?'':'s'}</p></section>
    <section><p className={styles.kicker}>Progress</p><h2>{completedWork}%</h2><p>{readiness.completed_tasks}/{readiness.required_tasks} required tasks complete</p></section>
    <section><p className={styles.kicker}>Proof readiness</p><h2>{readiness.ready?'Ready':'In progress'}</h2><p>{readiness.members_with_verified_proof}/{readiness.project_members_requiring_proof} members verified{readiness.pending_contributions?` · ${readiness.pending_contributions} pending`:''}</p></section>
    {unreadCount>0&&<section><p className={styles.kicker}>Chat</p><h2>{unreadCount} unread</h2><a href={`/member/projects/${id}?view=chat`}>Open Chat →</a></section>}
   </aside>
  </div>
 </div>;
}
