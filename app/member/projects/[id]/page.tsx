import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ProjectDeliveryControls from '@/components/ProjectDeliveryControls';
import ContributionForm from '@/components/ContributionForm';
import ProjectCollaborationPanel from '@/components/ProjectCollaborationPanel';
import TaskStatusControl from '@/components/TaskStatusControl';
import ProjectContributionReview from '@/components/ProjectContributionReview';

export const metadata:Metadata={title:'Project Workspace',description:'Private Mettelo Labs project collaboration, delivery and verification workspace.'};
export const dynamic='force-dynamic';

type Milestone={id:string;title:string;description:string|null;due_at:string|null;status:string;sort_order:number;is_required:boolean};
type Task={id:string;project_id:string;title:string;description:string|null;status:string;due_at:string|null;milestone_id:string|null;evidence_url:string|null;assignee_user_id:string|null;is_required:boolean};
type TeamMember={id:string;name:string;headline:string|null;role:string};
type Discussion={id:string;author_user_id:string;message_type:string;body:string;mentioned_user_ids:string[];created_at:string};
type Resource={id:string;title:string;resource_type:string;url:string;description:string|null;created_at:string};
type Meeting={id:string;title:string;purpose:string|null;platform:string;starts_at:string;ends_at:string|null;join_url:string;status:string};
type Presentation={id:string;status:string;meeting_url:string|null;deck_url:string|null;reviewer_notes:string|null;presented_at:string|null};
type Slot={id:string;starts_at:string;ends_at:string;meeting_url:string|null;location_label:string|null};
type Readiness={ready:boolean;required_milestones:number;completed_milestones:number;required_tasks:number;completed_tasks:number;project_members_requiring_proof:number;members_with_verified_proof:number;pending_contributions:number;presentation_required:boolean;presentation_status:string};
type ReviewRow={id:string;user_id:string;title:string;contribution_type:string;description:string|null;evidence_url:string|null;verification_status:string;task_id:string|null;created_at:string};

const emptyReadiness:Readiness={ready:false,required_milestones:0,completed_milestones:0,required_tasks:0,completed_tasks:0,project_members_requiring_proof:0,members_with_verified_proof:0,pending_contributions:0,presentation_required:false,presentation_status:'not_booked'};

export default async function ProjectWorkspace({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/signin?next=${encodeURIComponent(`/member/projects/${id}`)}`);
  const isAdmin=user.app_metadata?.role==='admin';
  const [{data:membership},{data:project}]=await Promise.all([
    supabase.from('project_members').select('id,team_role,joined_at').eq('project_id',id).eq('user_id',user.id).maybeSingle(),
    supabase.from('projects').select('id,title,summary,status,github_url,weekly_commitment,presentation_required').eq('id',id).maybeSingle()
  ]);
  if(!project||(!membership&&!isAdmin)) notFound();
  const workspaceRole=membership?.team_role||(isAdmin?'admin':'member');
  const canLead=isAdmin||['project_lead','reviewer'].includes(membership?.team_role||'');
  const canReview=canLead;

  const [milestoneResult,taskResult,discussionResult,resourceResult,meetingResult,presentationResult,slotResult,readinessResult]=await Promise.all([
    supabase.from('project_milestones').select('id,title,description,due_at,status,sort_order,is_required').eq('project_id',id).order('sort_order').order('created_at'),
    supabase.from('project_tasks').select('id,project_id,title,description,status,due_at,milestone_id,evidence_url,assignee_user_id,is_required').eq('project_id',id).order('created_at'),
    supabase.from('project_discussions').select('id,author_user_id,message_type,body,mentioned_user_ids,created_at').eq('project_id',id).order('created_at',{ascending:false}).limit(50),
    supabase.from('project_resources').select('id,title,resource_type,url,description,created_at').eq('project_id',id).order('created_at',{ascending:false}),
    supabase.from('project_meetings').select('id,title,purpose,platform,starts_at,ends_at,join_url,status').eq('project_id',id).neq('status','cancelled').order('starts_at'),
    supabase.from('project_presentations').select('id,status,meeting_url,deck_url,reviewer_notes,presented_at').eq('project_id',id).maybeSingle(),
    supabase.from('presentation_slots').select('id,starts_at,ends_at,meeting_url,location_label').eq('status','available').gte('starts_at',new Date().toISOString()).order('starts_at').limit(20),
    supabase.rpc('project_completion_readiness',{target_project:id})
  ]);
  const milestones=(milestoneResult.data||[]) as Milestone[];
  const tasks=(taskResult.data||[]) as Task[];
  const discussions=(discussionResult.data||[]) as Discussion[];
  const resources=(resourceResult.data||[]) as Resource[];
  const meetings=(meetingResult.data||[]) as Meeting[];
  const presentation=(presentationResult.data||null) as Presentation|null;
  const slots=(slotResult.data||[]) as Slot[];
  const readiness=(readinessResult.data||emptyReadiness) as Readiness;

  const serviceUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const service=serviceUrl&&serviceKey?createClient(serviceUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}}):null;
  let team:TeamMember[]=membership?[{id:user.id,name:user.user_metadata?.full_name||user.email?.split('@')[0]||'You',headline:null,role:workspaceRole}]:[];
  let presenterIds:string[]=[];
  let reviewItems:{id:string;name:string;title:string;type:string;description:string|null;evidence_url:string|null;status:string;task:string|null;created_at:string}[]=[];
  if(service){
    const {data:memberRows}=await service.from('project_members').select('user_id,team_role').eq('project_id',id).order('joined_at');
    const ids=(memberRows||[]).map(row=>row.user_id);
    const {data:profiles}=ids.length?await service.from('profiles').select('id,full_name,headline').in('id',ids):{data:[]};
    const profileMap=new Map((profiles||[]).map(profile=>[profile.id,profile]));
    team=(memberRows||[]).map(row=>({id:row.user_id,name:profileMap.get(row.user_id)?.full_name||'Mettelo member',headline:profileMap.get(row.user_id)?.headline||null,role:row.team_role}));
    if(presentation){const {data:pRows}=await service.from('project_presenters').select('user_id').eq('presentation_id',presentation.id);presenterIds=(pRows||[]).map(row=>row.user_id);}
    if(canReview){
      const {data:proofRows}=await service.from('contributions').select('id,user_id,title,contribution_type,description,evidence_url,verification_status,task_id,created_at').eq('project_id',id).in('verification_status',['pending','needs_changes']).order('created_at');
      const taskMap=new Map(tasks.map(task=>[task.id,task.title]));
      const nameMap=new Map(team.map(member=>[member.id,member.name]));
      reviewItems=((proofRows||[]) as ReviewRow[]).map(row=>({id:row.id,name:nameMap.get(row.user_id)||'Mettelo member',title:row.title,type:row.contribution_type,description:row.description,evidence_url:row.evidence_url,status:row.verification_status,task:row.task_id?taskMap.get(row.task_id)||null:null,created_at:row.created_at}));
    }
  }
  const teamNames=new Map(team.map(member=>[member.id,member.name]));
  const userTasks=membership?tasks.filter(task=>task.assignee_user_id===user.id).map(task=>({id:task.id,project_id:id,title:task.title,status:task.status})):[];

  return <section className="section softSection"><div className="shell">
    <div className="sectionHead"><div><div className="eyebrow">Mettelo Labs · Private team workspace</div><h1>{project.title}</h1></div><p>{project.summary}</p></div>
    <nav className="workspaceNav" aria-label="Project workspace"><a href="#team">Team</a><a href="#discussion">Discussion</a><a href="#delivery">Delivery</a><a href="#meetings">Meetings</a><a href="#resources">Resources</a><a href="#proof">Proof</a><a href="#presentation">Presentation</a><a href="#completion">Completion</a></nav>
    <div className="statBand"><div><strong>{project.status.toUpperCase()}</strong><span>Project status</span></div><div><strong>{workspaceRole.replace('_',' ')}</strong><span>Your workspace role</span></div><div><strong>{milestones.filter(item=>item.status==='completed').length}/{milestones.length}</strong><span>Milestones complete</span></div><div><strong>{tasks.filter(task=>task.status==='done').length}/{tasks.length}</strong><span>Tasks done</span></div></div>

    <section className="workspaceBlock" id="delivery"><div className="sectionHead compactHead"><div><div className="eyebrow">Tasks & ownership</div><h2>Make delivery visible before Proof is claimed.</h2></div><p>Milestones define required outcomes. Tasks assign ownership, due dates and progress to approved contributors.</p></div>
      <div className="dashboardGrid"><section className="panel"><div className="panelHead"><h3>Milestones</h3><span className="chip">{milestones.filter(m=>m.is_required).length} REQUIRED</span></div>{milestones.length?milestones.map(item=><div className="listRow" key={item.id}><div><strong>{item.title}</strong><br/><small>{item.is_required?'Required':'Optional'}{item.due_at?` · due ${new Date(item.due_at).toLocaleDateString('en-GB')}`:''}</small>{item.description&&<><br/><small>{item.description}</small></>}</div><span className={`chip ${item.status==='completed'?'green':''}`}>{item.status.replace('_',' ').toUpperCase()}</span></div>):<div className="emptyState"><h3>No milestones yet.</h3><p>The Project Lead will break the brief into reviewable delivery stages.</p></div>}</section>
      <section className="panel"><div className="panelHead"><h3>Tasks</h3><span className="chip">OWNERSHIP</span></div>{tasks.length?tasks.map(item=>{const editable=canLead||item.assignee_user_id===user.id;return <div className="taskRow" key={item.id}><div><strong>{item.title}</strong><small>{item.assignee_user_id?`Owner: ${teamNames.get(item.assignee_user_id)||'Project member'}`:'Unassigned'} · {item.is_required?'Required':'Optional'}{item.due_at?` · due ${new Date(item.due_at).toLocaleDateString('en-GB')}`:''}</small></div>{editable?<TaskStatusControl taskId={item.id} initialStatus={item.status}/>:<span className={`chip ${item.status==='done'?'green':''}`}>{item.status.replace('_',' ').toUpperCase()}</span>}</div>}):<div className="emptyState"><h3>No tasks yet.</h3><p>Tasks make ownership visible before contribution is submitted as Proof.</p></div>}</section></div>
      {canLead&&<div style={{marginTop:24}}><ProjectDeliveryControls projectId={id} milestones={milestones.map(item=>({id:item.id,title:item.title}))} team={team.map(member=>({id:member.id,name:member.name,role:member.role}))}/></div>}
    </section>

    <ProjectCollaborationPanel projectId={id} projectStatus={project.status} team={team} discussions={discussions} resources={resources} meetings={meetings} availableSlots={slots} presentation={presentation} presenterIds={presenterIds} presentationRequired={Boolean(project.presentation_required)} canLead={canLead} canReview={canReview} isAdmin={isAdmin} readiness={readiness}/>

    {membership&&<section className="workspaceBlock" id="proof"><div className="sectionHead compactHead"><div><div className="eyebrow">Submit work</div><h2>Evidence should map back to owned delivery.</h2></div><p>Use an assigned task when the evidence closes a specific deliverable; project-level contributions remain available for leadership, QA and work that spans tasks.</p></div><ContributionForm projects={[{id:project.id,title:project.title}]} tasks={userTasks}/></section>}
    {canReview&&<section className="panel" style={{marginTop:24}}><div className="panelHead"><div><span className="cardNumber">PROJECT REVIEW</span><h3 style={{marginTop:8}}>Evidence waiting for verification</h3></div><span className="chip">{reviewItems.length} OPEN</span></div><ProjectContributionReview items={reviewItems}/></section>}
    <div className="actions"><a className="button ghost" href={isAdmin?'/admin':'/member'}>← Back to {isAdmin?'Admin':'My Mettelo'}</a>{project.github_url&&<a className="button dark" href={project.github_url} target="_blank" rel="noopener noreferrer">Open project repository →</a>}</div>
  </div></section>;
}
