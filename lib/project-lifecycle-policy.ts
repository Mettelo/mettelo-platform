export type ProjectType='open'|'partner';
export type ProjectStatus='draft'|'pilot'|'recruiting'|'open'|'forming'|'active'|'review'|'completed'|'cancelled'|'archived';
export type ProjectLifecycleAction='publish_pilot'|'publish_open'|'publish_recruiting'|'pause_intake'|'resume_intake'|'unpublish'|'archive';

export type ProjectLifecycleRecord={
  project_type:ProjectType|string|null;
  status:ProjectStatus|string;
  visibility:string;
  applications_open:boolean|null;
  partner_name?:string|null;
  title?:string|null;
  summary?:string|null;
  problem_statement?:string|null;
  team_size_threshold?:number|null;
  application_deadline?:string|null;
};

export function projectAcceptsApplications(project:Pick<ProjectLifecycleRecord,'project_type'|'status'|'applications_open'|'visibility'>){
  if(project.applications_open!==true||project.visibility!=='public')return false;
  if(['draft','completed','cancelled','archived'].includes(project.status))return false;
  if(project.project_type==='open')return ['pilot','recruiting','open','forming','active','review'].includes(project.status);
  return project.project_type==='partner'&&['pilot','recruiting','open','forming'].includes(project.status);
}

/**
 * Open Projects use continuous intake across successive cohorts, so a canonical
 * project-level deadline must never permanently close future teams. Partner
 * Projects are single-cycle and may use the project application deadline.
 */
export function projectApplicationDeadlinePassed(project:Pick<ProjectLifecycleRecord,'project_type'|'application_deadline'>,now=Date.now()){
  if(project.project_type==='open'||!project.application_deadline)return false;
  const deadline=new Date(project.application_deadline).getTime();
  return Number.isFinite(deadline)&&deadline<=now;
}

export function publicationReadiness(project:ProjectLifecycleRecord,roleCapacity:number,now=Date.now()){
  const missing:string[]=[];
  if(!String(project.title||'').trim())missing.push('title');
  if(!String(project.summary||'').trim())missing.push('summary');
  if(!String(project.problem_statement||'').trim())missing.push('problem statement');
  const teamSize=Math.max(0,Number(project.team_size_threshold)||0);
  if(teamSize<1)missing.push('team size');
  if(roleCapacity<1)missing.push('at least one project role');
  else if(teamSize>0&&roleCapacity<teamSize)missing.push(`role capacity for ${teamSize} team members`);
  if(project.project_type==='partner'&&!String(project.partner_name||'').trim())missing.push('partner name');
  if(projectApplicationDeadlinePassed(project,now))missing.push('a future application deadline');
  return{ready:missing.length===0,missing};
}

export function lifecyclePatch(project:ProjectLifecycleRecord,action:ProjectLifecycleAction){
  switch(action){
    case 'publish_pilot': return{status:'pilot',visibility:'public',applications_open:true};
    case 'publish_open':
      if(project.project_type!=='open')throw new Error('Publish Open is only valid for Open Projects.');
      return{status:'open',visibility:'public',applications_open:true};
    case 'publish_recruiting': return{status:'recruiting',visibility:'public',applications_open:true};
    case 'pause_intake': return{applications_open:false};
    case 'resume_intake': {
      const candidate={...project,visibility:'public',applications_open:true};
      if(!projectAcceptsApplications(candidate))throw new Error(project.project_type==='partner'?'Partner Project intake cannot reopen after the engagement has started.':'This project must be in a live application stage before intake can resume.');
      return{visibility:'public',applications_open:true};
    }
    case 'unpublish': return{status:'draft',visibility:'private',applications_open:false};
    case 'archive': return{status:'archived',visibility:'private',applications_open:false};
  }
}

export function assertLifecycleShape(project:ProjectLifecycleRecord){
  if(project.status==='draft'&&(project.visibility!=='private'||project.applications_open===true))throw new Error('Draft projects must be private with applications closed.');
  if(project.applications_open===true&&project.visibility!=='public')throw new Error('Projects accepting applications must be public.');
  if(project.applications_open===true&&!projectAcceptsApplications(project))throw new Error(project.project_type==='partner'?'Partner Projects can only accept applications before the engagement starts.':'This project status cannot accept applications.');
  if(['completed','cancelled','archived'].includes(project.status)&&project.applications_open===true)throw new Error('Terminal projects cannot accept applications.');
  if(project.status==='archived'&&project.visibility!=='private')throw new Error('Archived projects must be private.');
  if(project.project_type==='partner'&&!String(project.partner_name||'').trim())throw new Error('Partner Projects require a partner name.');
}
