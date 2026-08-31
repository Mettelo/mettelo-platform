export type PublicProjectAvailabilityInput={
  status:string;
  project_type:string;
  application_deadline:string|null;
  role_count:number;
  occupied_role_count?:number;
  capacity_known?:boolean;
  applications_open?:boolean|null;
};

export type PublicProjectAvailabilityState=
  | 'open_for_application'
  | 'register_interest'
  | 'roles_preparing'
  | 'roles_filled'
  | 'applications_closed'
  | 'deadline_passed'
  | 'active'
  | 'in_review'
  | 'completed'
  | 'unavailable';

export type PublicProjectAvailability={
  state:PublicProjectAvailabilityState;
  label:string;
  available:boolean;
  acceptingInterest:boolean;
  copy:string;
};

export function resolveProjectPublicAvailability(project:PublicProjectAvailabilityInput):PublicProjectAvailability{
  const deadlinePassed=project.application_deadline?new Date(project.application_deadline).getTime()<Date.now():false;
  const statusAccepting=project.project_type==='open'
    ? !['pilot','completed','archived','cancelled'].includes(project.status)
    : ['recruiting','open','forming'].includes(project.status);
  const capacityKnown=project.capacity_known===true;
  const occupied=Math.max(0,Number(project.occupied_role_count)||0);
  const advertised=Math.max(0,Number(project.role_count)||0);

  if(project.status==='pilot')return{
    state:'register_interest',label:'Registering interest',available:false,acceptingInterest:true,
    copy:'This brief is still being shaped. Register your interest and tell us where you could contribute.'
  };
  if(deadlinePassed&&statusAccepting)return{
    state:'deadline_passed',label:'Applications closed',available:false,acceptingInterest:false,
    copy:'The application deadline has passed. You can still review the brief and current project stage.'
  };
  if(project.applications_open===false&&statusAccepting)return{
    state:'applications_closed',label:'Applications paused',available:false,acceptingInterest:false,
    copy:'Applications are not currently open for this project. Review the brief and check back for a future opening.'
  };
  if(statusAccepting&&advertised===0)return{
    state:'roles_preparing',label:'Roles preparing',available:false,acceptingInterest:true,
    copy:'Roles are still being prepared. Review the brief and check back before applying.'
  };
  if(statusAccepting&&capacityKnown&&advertised>0&&occupied>=advertised)return{
    state:'roles_filled',label:'Roles filled',available:false,acceptingInterest:false,
    copy:'The currently advertised project roles are filled. Review the brief and check back for another opening or cohort.'
  };
  if(statusAccepting&&advertised>0)return{
    state:'open_for_application',label:project.status==='forming'?'Team forming':'Open',available:true,acceptingInterest:true,
    copy:'Applications are available. Review the full brief before you apply.'
  };
  if(project.status==='active')return{state:'active',label:'Active',available:false,acceptingInterest:false,copy:'Review the brief and current project stage.'};
  if(project.status==='review')return{state:'in_review',label:'In review',available:false,acceptingInterest:false,copy:'Review the brief and current project stage.'};
  if(project.status==='completed')return{state:'completed',label:'Completed',available:false,acceptingInterest:false,copy:'Review the brief and current project stage.'};
  return{state:'unavailable',label:'Not currently available',available:false,acceptingInterest:false,copy:'Review the brief and current project stage.'};
}
