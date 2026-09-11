import {serviceDb} from '@/lib/project-flow';
import ProjectGrowTeamActions from '@/components/ProjectGrowTeamActions';

type Props={projectId:string;projectRunId:string;workspaceRole:string;activeMemberCount:number;isAdmin:boolean};
type Capacity={available?:number;maximum?:number;occupied?:number;reserved?:number;capacity_available?:boolean};
function one<T>(value:T|T[]|null|undefined):T|null{return Array.isArray(value)?value[0]||null:value||null}
function dateLabel(value:string){return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value))}

export default async function ProjectGrowTeamSection({projectId,projectRunId,workspaceRole,activeMemberCount,isAdmin}:Props){
 const db=serviceDb();
 if(!db)return <section style={{marginTop:24,paddingTop:20,borderTop:'1px solid var(--line)'}} aria-labelledby="grow-team-title"><span className="cardNumber">GROW THE TEAM</span><h4 id="grow-team-title" style={{margin:'8px 0'}}>Find the right collaborator</h4><p>Team recruitment controls are temporarily unavailable.</p></section>;
 const [projectResult,runResult,needResult,capacityResult]=await Promise.all([
  db.from('projects').select('id,status,visibility,weekly_commitment,member_invites_enabled,collaboration_marketplace_enabled,project_sharing_enabled,late_joining_enabled,late_joining_cutoff_at').eq('id',projectId).maybeSingle(),
  db.from('project_runs').select('id,status,recruitment_open').eq('id',projectRunId).eq('project_id',projectId).maybeSingle(),
  db.from('project_collaboration_needs').select('id,responsibility,member_message,status').eq('project_id',projectId).eq('project_run_id',projectRunId).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle(),
  db.rpc('phase9_project_run_capacity',{p_project_id:projectId,p_run_id:projectRunId})
 ]);
 const project=projectResult.data,run=runResult.data,need=needResult.data,capacity=one(capacityResult.data as Capacity|Capacity[]|null);
 if(!project||!run)return null;
 const terminal=['completed','cancelled','archived'].includes(project.status)||run.status==='completed';
 const finalReview=run.status==='review';
 const cutoffClosed=Boolean(project.late_joining_cutoff_at&&Date.now()>=new Date(project.late_joining_cutoff_at).getTime());
 const joiningClosed=run.status==='active'&&(project.late_joining_enabled===false||cutoffClosed);
 const full=capacity?.capacity_available===false||Number(capacity?.available??0)<1;
 const baseRecruitable=!terminal&&!finalReview&&!joiningClosed&&!full&&['forming','active'].includes(run.status)&&run.recruitment_open!==false;
 const canManage=isAdmin||workspaceRole==='project_lead'||activeMemberCount===1;
 const canPost=baseRecruitable&&project.collaboration_marketplace_enabled===true;
 const canFind=canPost&&project.member_invites_enabled===true;
 const canShare=canPost&&project.project_sharing_enabled!==false&&project.visibility==='public';
 let stateLabel='RECRUITMENT OPEN';
 let stateMessage=`${Number(capacity?.available??0)} open place${Number(capacity?.available??0)===1?'':'s'}.`;
 if(project.late_joining_cutoff_at&&!cutoffClosed)stateMessage+=` Joining available until ${dateLabel(project.late_joining_cutoff_at)}.`;
 if(finalReview){stateLabel='FINAL REVIEW';stateMessage='Recruitment is closed while this run is in final review.'}
 else if(terminal){stateLabel='PROJECT COMPLETED';stateMessage='This project run is no longer recruiting.'}
 else if(full){stateLabel='TEAM FULL';stateMessage='There are no open places in this project run.'}
 else if(joiningClosed){stateLabel='JOINING CLOSED';stateMessage='The joining window for this active project run has closed.'}
 else if(run.recruitment_open===false){stateLabel='RECRUITMENT CLOSED';stateMessage='Recruitment is closed for this project run.'}
 else if(project.collaboration_marketplace_enabled!==true){stateLabel='COLLABORATION DISABLED';stateMessage='Member-led collaboration recruitment is disabled for this project.'}
 return <section style={{marginTop:24,paddingTop:20,borderTop:'1px solid var(--line)'}} aria-labelledby="grow-team-title">
  <div style={{marginBottom:14}}><span className="cardNumber">GROW THE TEAM</span><h4 id="grow-team-title" style={{margin:'8px 0 5px',fontSize:'1.15rem'}}>Find the right collaborator</h4><p style={{margin:0,color:'var(--slate)',lineHeight:1.5}}>Recruit from Mettelo, publish a structured collaborator need, or share the same governed opportunity externally. Every route stays tied to this exact project run.</p></div>
  <ProjectGrowTeamActions projectId={projectId} projectRunId={projectRunId} activeNeedId={need?.id||null} activeNeedLabel={need?.responsibility||need?.member_message||null} weeklyCommitment={project.weekly_commitment||null} canRecruit={baseRecruitable} canManage={canManage} canFind={canFind} canPost={canPost} canShare={canShare} stateLabel={stateLabel} stateMessage={stateMessage}/>
 </section>;
}
