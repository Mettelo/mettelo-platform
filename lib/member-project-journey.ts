import {projectAcceptsApplications as lifecycleAcceptsApplications,projectApplicationDeadlinePassed} from './project-lifecycle-policy';

export type MemberProjectState=
  |'open_eligible'
  |'register_interest'
  |'application_submitted'
  |'application_action_required'
  |'application_in_review'
  |'team_forming'
  |'confirmed'
  |'active'
  |'completed'
  |'closed'
  |'ineligible'
  |'cancelled';

type ProjectInput={status:string;project_type?:string|null;applications_open?:boolean|null;application_deadline?:string|null;visibility?:string|null};
type ApplicationInput={id:string;status:string;project_run_id?:string|null}|null|undefined;
type MembershipInput={membership_status:string;project_run_id?:string|null}|null|undefined;
type RunInput={status:string}|null|undefined;
export type ResolveMemberProjectStateInput={project:ProjectInput;application?:ApplicationInput;membership?:MembershipInput;run?:RunInput;applicationReady:boolean;hasAvailableRole:boolean;roleAvailabilityKnown?:boolean;now?:number};
const applicationClosed=new Set(['declined','withdrawn']);
const applicationInReview=new Set(['in_review','shortlisted']);
const applicationForming=new Set(['approved','accepted','waiting_for_team']);

export function projectAcceptsApplications(project:ProjectInput,now=Date.now()){
  const projectType=project.project_type||'open';
  if(projectApplicationDeadlinePassed({project_type:projectType,application_deadline:project.application_deadline},now))return false;
  return lifecycleAcceptsApplications({project_type:projectType,status:project.status,applications_open:project.applications_open??false,visibility:project.visibility||'public'});
}

export function resolveMemberProjectState(input:ResolveMemberProjectStateInput):MemberProjectState{
  const {project,application,membership,run}=input;
  if(project.status==='cancelled'||run?.status==='cancelled')return 'cancelled';
  if(membership){if(membership.membership_status==='completed'||project.status==='completed'||run?.status==='completed')return 'completed';if(membership.membership_status==='active'&&run&&['active','review','paused'].includes(run.status))return 'active';if(['waiting','active'].includes(membership.membership_status))return 'confirmed'}
  if(application&&!applicationClosed.has(application.status)){if(application.status==='team_complete')return 'confirmed';if(applicationForming.has(application.status))return 'team_forming';if(application.status==='action_required'||application.status==='needs_changes')return 'application_action_required';if(applicationInReview.has(application.status))return 'application_in_review';return 'application_submitted'}
  const acceptingApplications=projectAcceptsApplications(project,input.now);
  if(project.status==='pilot'&&!acceptingApplications)return 'register_interest';
  if(project.status==='completed'||!acceptingApplications)return 'closed';
  if(!input.applicationReady)return 'ineligible';
  if(input.roleAvailabilityKnown===false||!input.hasAvailableRole)return 'ineligible';
  return 'open_eligible';
}
export function memberProjectPrimaryAction(state:MemberProjectState,projectId:string){if(state==='open_eligible')return{label:'Apply to this project',href:`/member/discover/${projectId}/apply`};if(['application_submitted','application_action_required','application_in_review','team_forming'].includes(state))return{label:'View application',href:'/member/applications'};if(state==='confirmed'||state==='active')return{label:'Open in Projects',href:'/member/projects'};if(state==='completed')return{label:'View in Projects',href:'/member/projects?state=completed'};return null}
export function memberProjectCatalogueAction(state:MemberProjectState,projectId:string){if(['application_submitted','application_action_required','application_in_review','team_forming'].includes(state))return{label:'View application',href:'/member/applications'};if(state==='confirmed'||state==='active')return{label:'Open in Projects',href:'/member/projects'};if(state==='completed')return{label:'View in Projects',href:'/member/projects?state=completed'};return{label:'View project',href:`/member/discover/${projectId}`}}
export function memberProjectStateLabel(state:MemberProjectState){const labels:Record<MemberProjectState,string>={open_eligible:'Open for applications',register_interest:'Registering interest',application_submitted:'Application submitted',application_action_required:'Action required',application_in_review:'In review',team_forming:'Team forming',confirmed:'Project confirmed',active:'Active project',completed:'Completed',closed:'Applications closed',ineligible:'Not ready to apply',cancelled:'Project cancelled'};return labels[state]}
export function memberProjectStateCopy(state:MemberProjectState){const copy:Record<MemberProjectState,string>={open_eligible:'Applications are open. Choose an available project role and review the commitment before applying.',register_interest:'This project is in pilot. Review the brief and register interest while full application intake is not yet open.',application_submitted:'Your project application has been submitted. Applications now owns the review lifecycle.',application_action_required:'Your application needs an update. Continue in Applications to see the required action.',application_in_review:'Your application is being reviewed. Continue in Applications for lifecycle updates.',team_forming:'Your application is moving forward while Mettelo forms the delivery team. Continue in Applications.',confirmed:'Your place is confirmed. Projects is now the source of truth for this work.',active:'This project is active. Continue from Projects into the authorized delivery workspace.',completed:'This project is part of your completed project history in Projects.',closed:'This project is not currently accepting a new application.',ineligible:'You can review this project, but a full application is not currently available to you.',cancelled:'This project has been cancelled and is not accepting applications.'};return copy[state]}
