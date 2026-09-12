import {projectAcceptsApplications,projectApplicationDeadlinePassed} from './project-lifecycle-policy';

export type PublicProjectAvailabilityInput={
  status:string;
  project_type:string;
  application_deadline:string|null;
  applications_open?:boolean|null;
  visibility?:string|null;
  capacity_available?:boolean|null;
  capacity_known?:boolean;
  recruitment_state?:string|null;
};
export type PublicProjectAvailabilityState='open_for_interest'|'applications_closed'|'deadline_passed'|'full'|'active'|'in_review'|'completed'|'unavailable';
export type PublicProjectAvailability={state:PublicProjectAvailabilityState;label:string;available:boolean;acceptingInterest:boolean;copy:string};

// Presentation-only adapter. Capacity is supplied by the canonical aggregate RPCs
// (memberships + reserved offers + max_team_size); role openings are deliberately
// not accepted as input and therefore cannot become a competing capacity authority.
export function resolveProjectPublicAvailability(project:PublicProjectAvailabilityInput):PublicProjectAvailability{
  const deadlinePassed=projectApplicationDeadlinePassed({project_type:project.project_type,application_deadline:project.application_deadline});
  const statusAccepting=projectAcceptsApplications({project_type:project.project_type,status:project.status,applications_open:project.applications_open??false,visibility:project.visibility||'public'});
  const lifecycleCouldAccept=!['draft','completed','archived','cancelled'].includes(project.status);
  if(deadlinePassed&&lifecycleCouldAccept)return{state:'deadline_passed',label:'Interest closed',available:false,acceptingInterest:false,copy:'The interest deadline has passed. You can still review the project brief and current stage.'};
  if(!statusAccepting&&lifecycleCouldAccept)return{state:'applications_closed',label:'Interest paused',available:false,acceptingInterest:false,copy:'Interest is not currently open for this project. Review the brief and check back for a future opening.'};
  if(project.capacity_known!==true)return{state:'unavailable',label:'Availability unavailable',available:false,acceptingInterest:false,copy:'Current canonical team capacity could not be confirmed safely.'};
  if(project.capacity_available===false||project.recruitment_state==='full')return{state:'full',label:'Full',available:false,acceptingInterest:false,copy:'The current project team has reached its canonical maximum capacity.'};
  if(statusAccepting&&project.capacity_available===true)return{state:'open_for_interest',label:project.status==='forming'?'Team forming':'Submit interest',available:true,acceptingInterest:true,copy:'Interest is open. Review the full brief before submitting.'};
  if(project.status==='active')return{state:'active',label:'Active',available:false,acceptingInterest:false,copy:'Review the brief and current project stage.'};
  if(project.status==='review')return{state:'in_review',label:'In review',available:false,acceptingInterest:false,copy:'Review the brief and current project stage.'};
  if(project.status==='completed')return{state:'completed',label:'Completed',available:false,acceptingInterest:false,copy:'Review the completed project brief.'};
  return{state:'unavailable',label:'Not currently available',available:false,acceptingInterest:false,copy:'Review the brief and current project stage.'};
}
