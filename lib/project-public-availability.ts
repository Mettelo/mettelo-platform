import {projectAcceptsApplications,projectApplicationDeadlinePassed} from './project-lifecycle-policy';

export type PublicProjectAvailabilityInput={status:string;project_type:string;application_deadline:string|null;role_count:number;occupied_role_count?:number;capacity_known?:boolean;applications_open?:boolean|null;visibility?:string|null};
export type PublicProjectAvailabilityState='open_for_application'|'register_interest'|'roles_preparing'|'roles_filled'|'applications_closed'|'deadline_passed'|'active'|'in_review'|'completed'|'unavailable';
export type PublicProjectAvailability={state:PublicProjectAvailabilityState;label:string;available:boolean;acceptingInterest:boolean;copy:string};
export function resolveProjectPublicAvailability(project:PublicProjectAvailabilityInput):PublicProjectAvailability{
  const deadlinePassed=projectApplicationDeadlinePassed({project_type:project.project_type,application_deadline:project.application_deadline});
  const statusAccepting=projectAcceptsApplications({project_type:project.project_type,status:project.status,applications_open:project.applications_open??false,visibility:project.visibility||'public'});
  const lifecycleCouldAccept=!['draft','completed','archived','cancelled'].includes(project.status);
  const capacityKnown=project.capacity_known===true,occupied=Math.max(0,Number(project.occupied_role_count)||0),advertised=Math.max(0,Number(project.role_count)||0);
  if(deadlinePassed&&lifecycleCouldAccept)return{state:'deadline_passed',label:'Applications closed',available:false,acceptingInterest:false,copy:'The application deadline has passed. You can still review the brief and current project stage.'};
  if(!statusAccepting&&lifecycleCouldAccept&&project.applications_open===false)return{state:project.status==='pilot'?'register_interest':'applications_closed',label:project.status==='pilot'?'Registering interest':'Applications paused',available:false,acceptingInterest:project.status==='pilot',copy:project.status==='pilot'?'This pilot is visible while its application intake is paused. Register interest if available, or check back for the next opening.':'Applications are not currently open for this project. Review the brief and check back for a future opening.'};
  if(statusAccepting&&advertised===0)return{state:'roles_preparing',label:'Roles preparing',available:false,acceptingInterest:true,copy:'Roles are still being prepared. Review the brief and check back before applying.'};
  if(statusAccepting&&capacityKnown&&advertised>0&&occupied>=advertised)return{state:'roles_filled',label:'Roles filled',available:false,acceptingInterest:false,copy:'The current cohort roles are filled. Open projects become available again for the next cohort.'};
  if(statusAccepting&&advertised>0)return{state:'open_for_application',label:project.status==='pilot'?'Pilot · Applications open':project.status==='forming'?'Team forming':'Open',available:true,acceptingInterest:true,copy:'Applications are available. Review the full brief before you apply.'};
  if(project.status==='active')return{state:'active',label:'Active',available:false,acceptingInterest:false,copy:'Review the brief and current project stage.'};
  if(project.status==='review')return{state:'in_review',label:'In review',available:false,acceptingInterest:false,copy:'Review the brief and current project stage.'};
  if(project.status==='completed')return{state:'completed',label:'Completed',available:false,acceptingInterest:false,copy:'Review the brief and current project stage.'};
  return{state:'unavailable',label:'Not currently available',available:false,acceptingInterest:false,copy:'Review the brief and current project stage.'};
}
