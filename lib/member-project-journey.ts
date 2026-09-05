import {projectAcceptsApplications as lifecycleAcceptsApplications,projectApplicationDeadlinePassed} from './project-lifecycle-policy';

export type MemberProjectState='open_eligible'|'register_interest'|'application_submitted'|'application_action_required'|'application_in_review'|'team_forming'|'confirmed'|'active'|'completed'|'closed'|'ineligible'|'full'|'cancelled';
export type MemberProjectQualificationReason='ELIGIBLE'|'PROFILE_INCOMPLETE'|'INTEREST_EXISTS'|'PROJECT_CLOSED'|'CAPACITY_FULL'|'ALREADY_PARTICIPATING'|'DEADLINE_PASSED'|'CAPACITY_UNKNOWN'|'PROJECT_CANCELLED'|'PROJECT_COMPLETED';
export type MemberProjectQualification={state:MemberProjectState;reason:MemberProjectQualificationReason;eligible:boolean};

type ProjectInput={status:string;project_type?:string|null;applications_open?:boolean|null;application_deadline?:string|null;visibility?:string|null};
type ApplicationInput={id:string;status:string;project_run_id?:string|null}|null|undefined;
type MembershipInput={membership_status:string;project_run_id?:string|null}|null|undefined;
type RunInput={status:string}|null|undefined;
export type ResolveMemberProjectStateInput={project:ProjectInput;application?:ApplicationInput;membership?:MembershipInput;run?:RunInput;applicationReady:boolean;capacityAvailable?:boolean;capacityKnown?:boolean;hasAvailableRole?:boolean;roleAvailabilityKnown?:boolean;now?:number};
const applicationClosed=new Set(['declined','withdrawn']);
const applicationInReview=new Set(['in_review','shortlisted']);
const applicationForming=new Set(['approved','accepted','waiting_for_team']);

export function projectAcceptsApplications(project:ProjectInput,now=Date.now()){
 const projectType=project.project_type||'open';
 if(projectApplicationDeadlinePassed({project_type:projectType,application_deadline:project.application_deadline},now))return false;
 return lifecycleAcceptsApplications({project_type:projectType,status:project.status,applications_open:project.applications_open??false,visibility:project.visibility||'public'});
}

export function resolveMemberProjectQualification(input:ResolveMemberProjectStateInput):MemberProjectQualification{
 const {project,application,membership,run}=input;const now=input.now??Date.now();
 if(project.status==='cancelled'||run?.status==='cancelled')return{state:'cancelled',reason:'PROJECT_CANCELLED',eligible:false};
 if(membership){
  if(membership.membership_status==='completed'||project.status==='completed'||run?.status==='completed')return{state:'completed',reason:'PROJECT_COMPLETED',eligible:false};
  if(membership.membership_status==='active'&&run&&['active','review','paused'].includes(run.status))return{state:'active',reason:'ALREADY_PARTICIPATING',eligible:false};
  if(['waiting','active'].includes(membership.membership_status))return{state:'confirmed',reason:'ALREADY_PARTICIPATING',eligible:false};
 }
 if(application&&!applicationClosed.has(application.status)){
  if(application.status==='team_complete')return{state:'confirmed',reason:'INTEREST_EXISTS',eligible:false};
  if(applicationForming.has(application.status))return{state:'team_forming',reason:'INTEREST_EXISTS',eligible:false};
  if(application.status==='action_required'||application.status==='needs_changes')return{state:'application_action_required',reason:'INTEREST_EXISTS',eligible:false};
  if(applicationInReview.has(application.status))return{state:'application_in_review',reason:'INTEREST_EXISTS',eligible:false};
  return{state:'application_submitted',reason:'INTEREST_EXISTS',eligible:false};
 }
 if(project.status==='completed')return{state:'completed',reason:'PROJECT_COMPLETED',eligible:false};
 if(projectApplicationDeadlinePassed({project_type:project.project_type||'open',application_deadline:project.application_deadline},now))return{state:'closed',reason:'DEADLINE_PASSED',eligible:false};
 const acceptingApplications=lifecycleAcceptsApplications({project_type:project.project_type||'open',status:project.status,applications_open:project.applications_open??false,visibility:project.visibility||'public'});
 if(project.status==='pilot'&&!acceptingApplications)return{state:'register_interest',reason:'PROJECT_CLOSED',eligible:false};
 if(!acceptingApplications)return{state:'closed',reason:'PROJECT_CLOSED',eligible:false};
 if(!input.applicationReady)return{state:'ineligible',reason:'PROFILE_INCOMPLETE',eligible:false};
 const capacityKnown=input.capacityKnown??input.roleAvailabilityKnown??true;const capacityAvailable=input.capacityAvailable??input.hasAvailableRole??true;
 if(!capacityKnown)return{state:'ineligible',reason:'CAPACITY_UNKNOWN',eligible:false};
 if(!capacityAvailable)return{state:'full',reason:'CAPACITY_FULL',eligible:false};
 return{state:'open_eligible',reason:'ELIGIBLE',eligible:true};
}

export function resolveMemberProjectState(input:ResolveMemberProjectStateInput):MemberProjectState{return resolveMemberProjectQualification(input).state}

export function memberProjectPrimaryAction(state:MemberProjectState,projectId:string){if(state==='open_eligible')return{label:'Submit Interest',href:`/member/discover/${projectId}/apply`};if(['application_submitted','application_action_required','application_in_review','team_forming'].includes(state))return{label:'View interest',href:'/member/applications'};if(state==='confirmed'||state==='active')return{label:'Open in Projects',href:'/member/projects'};if(state==='completed')return{label:'View in Projects',href:'/member/projects?state=completed'};return null}
export function memberProjectCatalogueAction(state:MemberProjectState,projectId:string){if(['application_submitted','application_action_required','application_in_review','team_forming'].includes(state))return{label:'View interest',href:'/member/applications'};if(state==='confirmed'||state==='active')return{label:'Open in Projects',href:'/member/projects'};if(state==='completed')return{label:'View in Projects',href:'/member/projects?state=completed'};return{label:'View project',href:`/member/discover/${projectId}`}}
export function memberProjectStateLabel(state:MemberProjectState){const labels:Record<MemberProjectState,string>={open_eligible:'Eligible to submit interest',register_interest:'Interest not yet open',application_submitted:'Interest submitted',application_action_required:'Action required',application_in_review:'Interest in review',team_forming:'Team forming',confirmed:'Project confirmed',active:'Active project',completed:'Completed',closed:'Interest closed',ineligible:'Profile update required',full:'Project currently full',cancelled:'Project cancelled'};return labels[state]}
export function memberProjectStateCopy(state:MemberProjectState){const copy:Record<MemberProjectState,string>={open_eligible:'You meet the current Phase 5 qualification checks. Submit Interest to continue to the Phase 6 interest form.',register_interest:'This project is not currently accepting interest.',application_submitted:'Your interest has already been submitted. Use Applications to track its current state.',application_action_required:'Your existing interest needs an update. Continue in Applications to see the required action.',application_in_review:'Your interest is being reviewed. Continue in Applications for status updates.',team_forming:'Your interest is moving forward while Mettelo forms the delivery team. Continue in Applications.',confirmed:'Your place is confirmed. Projects is now the source of truth for this work.',active:'You are already participating in this project. Continue from Projects.',completed:'This project is part of your completed project history in Projects.',closed:'This project is not currently accepting new interest.',ineligible:'Complete the required profile information before you can submit interest.',full:'This project is currently at capacity. You can still review the project, but new interest is not being accepted.',cancelled:'This project has been cancelled and is not accepting interest.'};return copy[state]}
