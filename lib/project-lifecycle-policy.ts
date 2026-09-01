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
};

export function projectAcceptsApplications(project:Pick<ProjectLifecycleRecord,'project_type'|'status'|'applications_open'|'visibility'>){
  if(project.applications_open!==true||project.visibility!=='public')return false;
  if(['draft','completed','cancelled','archived'].includes(project.status))return false;
  if(project.project_type==='open')return ['pilot','recruiting','open','forming','active','review'].includes(project.status);
  return ['pilot','recruiting','open','forming'].includes(project.status);
}

export function publicationReadiness(project:ProjectLifecycleRecord,roleCount:number){
  const missing:string[]=[];
  if(!String(project.title||'').trim())missing.push('title');
  if(!String(project.summary||'').trim())missing.push('summary');
  if(!String(project.problem_statement||'').trim())missing.push('problem statement');
  if(!project.team_size_threshold||project.team_size_threshold<1)missing.push('team size');
  if(roleCount<1)missing.push('at least one project role');
  if(project.project_type==='partner'&&!String(project.partner_name||'').trim())missing.push('partner name');
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
    case 'resume_intake':
      if(['draft','completed','cancelled','archived'].includes(project.status))throw new Error('This project must be published before intake can resume.');
      return{visibility:'public',applications_open:true};
    case 'unpublish': return{status:'draft',visibility:'private',applications_open:false};
    case 'archive': return{status:'archived',visibility:'private',applications_open:false};
  }
}

export function assertLifecycleShape(project:ProjectLifecycleRecord){
  if(project.status==='draft'&&(project.visibility!=='private'||project.applications_open===true))throw new Error('Draft projects must be private with applications closed.');
  if(project.applications_open===true&&project.visibility!=='public')throw new Error('Projects accepting applications must be public.');
  if(['completed','cancelled','archived'].includes(project.status)&&project.applications_open===true)throw new Error('Terminal projects cannot accept applications.');
  if(project.project_type==='partner'&&!String(project.partner_name||'').trim())throw new Error('Partner Projects require a partner name.');
}
