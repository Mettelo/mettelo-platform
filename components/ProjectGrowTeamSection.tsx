import {serviceDb} from '@/lib/project-flow';
import ProjectGrowTeamActions from '@/components/ProjectGrowTeamActions';

type Props={projectId:string;projectRunId:string;workspaceRole:string;activeMemberCount:number;isAdmin:boolean};
type Capacity={available?:number;maximum?:number;occupied?:number;reserved?:number;capacity_available?:boolean};
type Option={id:string;label:string};
type ProjectRole={id:string;responsibilities:string[]|null};
type AssignedResponsibility={responsibility:string;source_project_role_id:string|null};
function one<T>(value:T|T[]|null|undefined):T|null{return Array.isArray(value)?value[0]||null:value||null}
function dateLabel(value:string){return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value))}
function key(value:string){return value.trim().toLocaleLowerCase('en-GB')}
function unavailable(message:string){return <section style={{marginTop:24,paddingTop:20,borderTop:'1px solid var(--line)'}} aria-labelledby="grow-team-title"><span className="cardNumber">GROW THE TEAM</span><h4 id="grow-team-title" style={{margin:'8px 0'}}>Find the right collaborator</h4><div role="status" style={{padding:14,border:'1px solid var(--line)',borderRadius:12}}><strong>CONFIGURATION ERROR</strong><p style={{margin:'6px 0 0'}}>{message}</p></div></section>}

export default async function ProjectGrowTeamSection({projectId,projectRunId,workspaceRole,activeMemberCount,isAdmin}:Props){
 const db=serviceDb();
 if(!db)return unavailable('Team recruitment controls are temporarily unavailable. Your Team workspace remains available and no recruitment action has been performed.');
 const [projectResult,runResult,needResult,capacityResult,rolesResult,domainsResult,capabilitiesResult,projectRolesResult,assignedResult]=await Promise.all([
  db.from('projects').select('id,title,status,visibility,project_type,weekly_commitment,min_team_size,target_team_size,max_team_size,member_invites_enabled,project_lead_invites_enabled,team_member_invites_enabled,collaboration_marketplace_enabled,project_sharing_enabled,collaboration_social_sharing_enabled,late_joining_enabled,late_joining_cutoff_at').eq('id',projectId).maybeSingle(),
  db.from('project_runs').select('id,status,recruitment_open,completion_requested_at').eq('id',projectRunId).eq('project_id',projectId).maybeSingle(),
  db.from('project_collaboration_needs').select('id,source,source_project_role_id,responsibility,target_role_catalogue_id,target_domain_id,experience_level,weekly_commitment,member_message,status,project_collaboration_need_capabilities(capability_id)').eq('project_id',projectId).eq('project_run_id',projectRunId).eq('status','active').neq('source','direct_invite').order('created_at',{ascending:false}).limit(1).maybeSingle(),
  db.rpc('phase9_project_run_capacity',{p_project_id:projectId,p_run_id:projectRunId}),
  db.from('project_role_catalogue').select('id,title').eq('active',true).order('title').limit(80),
  db.from('domains').select('id,name').eq('is_active',true).order('name').limit(80),
  db.from('capabilities').select('id,name').eq('is_active',true).order('name').limit(160),
  db.from('project_roles').select('id,responsibilities').eq('project_id',projectId).order('id').limit(80),
  db.from('project_member_responsibilities').select('responsibility,source_project_role_id').eq('project_id',projectId).eq('project_run_id',projectRunId).eq('assignment_status','active').limit(500)
 ]);
 const project=projectResult.data,run=runResult.data,need=needResult.data,capacity=one(capacityResult.data as Capacity|Capacity[]|null);
 if(!project||!run)return unavailable('The canonical project or project run could not be loaded. Grow the Team is disabled until this configuration is repaired.');
 if(capacityResult.error||!capacity)return unavailable('Current team capacity could not be confirmed. Recruitment is disabled rather than risking an over-capacity admission.');
 const terminal=['completed','cancelled','archived'].includes(project.status)||run.status==='completed';
 const finalReview=run.status==='review';
 const completionFreeze=!terminal&&(finalReview||Boolean(run.completion_requested_at));
 const cutoffClosed=Boolean(project.late_joining_cutoff_at&&Date.now()>=new Date(project.late_joining_cutoff_at).getTime());
 const joiningClosed=run.status==='active'&&(project.late_joining_enabled===false||cutoffClosed);
 const openPlaces=Math.max(0,Number(capacity.available??0));const maximum=Number(capacity.maximum??project.max_team_size??openPlaces+activeMemberCount);const occupied=Number(capacity.occupied??activeMemberCount);
 const full=capacity.capacity_available===false||openPlaces<1;
 const baseRecruitable=!terminal&&!completionFreeze&&!joiningClosed&&!full&&['forming','active'].includes(run.status)&&run.recruitment_open!==false;
 const roleAuthorized=isAdmin||(workspaceRole==='project_lead'?project.project_lead_invites_enabled===true:project.team_member_invites_enabled===true);
 const canManage=baseRecruitable&&roleAuthorized;
 const canFind=canManage&&project.member_invites_enabled===true;
 const canPost=canManage&&project.collaboration_marketplace_enabled===true;
 const canShare=canManage&&project.project_sharing_enabled!==false&&project.collaboration_social_sharing_enabled===true&&project.visibility==='public';
 let stateLabel='AVAILABLE';
 let stateMessage=`${openPlaces} open place${openPlaces===1?'':'s'}.`;
 if(project.late_joining_cutoff_at&&!cutoffClosed)stateMessage+=` Joining available until ${dateLabel(project.late_joining_cutoff_at)}.`;
 if(completionFreeze){stateLabel='COMPLETION FREEZE';stateMessage=finalReview?'FINAL REVIEW. Recruitment is closed while this exact run is in final review.':'FINAL REVIEW CYCLE. Recruitment remains closed after completion was requested, including while requested changes are being addressed.'}
 else if(terminal){stateLabel='RECRUITMENT CLOSED';stateMessage='This project run is completed or otherwise closed and cannot recruit.'}
 else if(full){stateLabel='FULL';stateMessage=`TEAM FULL. ${occupied} / ${maximum}. There are no open places in this project run.`}
 else if(joiningClosed){stateLabel='JOINING CLOSED';stateMessage=project.late_joining_enabled===false?'Late joining is disabled for this active project run.':'The configured joining cutoff has passed.'}
 else if(run.recruitment_open===false){stateLabel='RECRUITMENT CLOSED';stateMessage='Recruitment is closed for this project run.'}
 else if(!roleAuthorized){stateLabel='NOT AUTHORIZED';stateMessage='Recruitment is open, but this project policy does not authorize your current team role to recruit.'}
 else if(project.member_invites_enabled!==true&&project.collaboration_marketplace_enabled!==true){stateLabel='RECRUITMENT CLOSED';stateMessage='Member invitations and collaboration marketplace recruitment are disabled by project policy.'}
 const roleOptions:Option[]=(rolesResult.data||[]).map(item=>({id:String(item.id),label:String(item.title)}));
 const domainOptions:Option[]=(domainsResult.data||[]).map(item=>({id:String(item.id),label:String(item.name)}));
 const capabilityOptions:Option[]=(capabilitiesResult.data||[]).map(item=>({id:String(item.id),label:String(item.name)}));
 const activeCapabilityIds=((need?.project_collaboration_need_capabilities||[]) as {capability_id:string}[]).map(item=>String(item.capability_id));
 const assigned=new Set(((assignedResult.data||[]) as AssignedResponsibility[]).map(item=>key(item.responsibility)));
 let suggestedResponsibility:string|null=null,suggestedSourceProjectRoleId:string|null=null;
 for(const role of (projectRolesResult.data||[]) as ProjectRole[]){for(const responsibility of role.responsibilities||[]){if(responsibility.trim()&&!assigned.has(key(responsibility))){suggestedResponsibility=responsibility.trim();suggestedSourceProjectRoleId=String(role.id);break}}if(suggestedResponsibility)break}
 return <section style={{marginTop:24,paddingTop:20,borderTop:'1px solid var(--line)'}} aria-labelledby="grow-team-title">
  <nav aria-label="Team experience" style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14,fontSize:11,fontWeight:800,letterSpacing:'.04em'}}><span>CURRENT TEAM</span><span>RESPONSIBILITIES</span><span>CAPACITY</span><span>RECRUITMENT STATE</span><span>GROW THE TEAM</span></nav>
  <div style={{marginBottom:14}}><span className="cardNumber">GROW THE TEAM</span><h4 id="grow-team-title" style={{margin:'8px 0 5px',fontSize:'1.15rem'}}>Find the right collaborator</h4><p style={{margin:0,color:'var(--slate)',lineHeight:1.5}}>Recruit from Mettelo, publish a structured collaborator need, or share the same governed opportunity externally. Every route stays tied to this exact project run.</p></div>
  <ProjectGrowTeamActions projectId={projectId} projectRunId={projectRunId} projectTitle={project.title} projectType={project.project_type||null} activeNeedId={need?.id||null} activeNeedLabel={need?.responsibility||need?.member_message||null} activeRoleId={need?.target_role_catalogue_id||null} activeDomainId={need?.target_domain_id||null} activeCapabilityIds={activeCapabilityIds} weeklyCommitment={project.weekly_commitment||null} joiningCutoff={project.late_joining_cutoff_at||null} teamOccupied={occupied} teamMinimum={Number(project.min_team_size||1)} teamTarget={Number(project.target_team_size||maximum)} teamMaximum={maximum} openPlaces={openPlaces} runStatus={run.status} canRecruit={baseRecruitable} canManage={canManage} canFind={canFind} canPost={canPost} canShare={canShare} stateLabel={stateLabel} stateMessage={stateMessage} roleOptions={roleOptions} domainOptions={domainOptions} capabilityOptions={capabilityOptions} suggestedResponsibility={suggestedResponsibility} suggestedSourceProjectRoleId={suggestedSourceProjectRoleId}/>
 </section>;
}
