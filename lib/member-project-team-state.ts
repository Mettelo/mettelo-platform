import {serviceDb} from '@/lib/project-flow';

type Db=NonNullable<ReturnType<typeof serviceDb>>;
export type MemberProjectTeamState={known:boolean;confirmedMembers:number;reservedMembers:number;occupiedPlaces:number;minTeamSize:number|null;targetTeamSize:number|null;maxTeamSize:number|null;capacityAvailable:boolean;stateLabel:string};

type Input={projectId:string;projectType:string|null;projectStatus:string;minTeamSize:number|null;targetTeamSize:number|null;maxTeamSize:number|null;legacyThreshold?:number|null};

function label(projectStatus:string,minimum:number|null,confirmed:number,reserved:number,capacityAvailable:boolean){
 if(projectStatus==='completed')return'Completed';
 if(projectStatus==='cancelled')return'Cancelled';
 if(projectStatus==='active'||projectStatus==='review')return capacityAvailable?'Active · places may remain open':'Active · full';
 if(!capacityAvailable)return'Currently full';
 if(minimum!=null&&confirmed>=minimum)return'Ready to start';
 if(confirmed+reserved>0)return'Team forming';
 return'Recruiting members';
}

/**
 * Member-facing capacity mirrors the canonical Phase 9 run invariant:
 * - the forming/active run owns the persisted effective start requirement;
 * - waiting/active canonical memberships are occupied places;
 * - pending/accepted unconsumed Offers are reservations;
 * - a consumed accepted Offer is not counted again after membership formation.
 *
 * This is important for Flexible projects: a persisted Solo run can require one
 * member while a persisted Team run uses the configured Team minimum. Project
 * defaults must never overwrite that run-specific geometry in the member UI.
 */
export async function loadMemberProjectTeamState(db:Db,input:Input):Promise<MemberProjectTeamState>{
 let minimum=input.minTeamSize??input.legacyThreshold??null;
 let target=input.targetTeamSize??minimum;
 let maximum=input.maxTeamSize??target;
 let confirmed=0;
 let reserved=0;

 if(input.projectType==='open'){
  const {data:run,error:runError}=await db.from('project_runs').select('id,status,has_started,required_team_size').eq('project_id',input.projectId).in('status',['forming','active','review','paused']).order('run_number',{ascending:false}).limit(1).maybeSingle();
  if(runError)return{known:false,confirmedMembers:0,reservedMembers:0,occupiedPlaces:0,minTeamSize:minimum,targetTeamSize:target,maxTeamSize:maximum,capacityAvailable:false,stateLabel:'Team status unavailable'};
  if(run){
   if(run.required_team_size!=null){
    minimum=Math.max(1,Number(run.required_team_size));
    target=target==null?minimum:Math.max(minimum,Number(target));
    maximum=maximum==null?target:Math.max(target??minimum,Number(maximum));
   }
   const {count,error}=await db.from('project_members').select('id',{count:'exact',head:true}).eq('project_run_id',run.id).in('membership_status',['waiting','active']);
   if(error)return{known:false,confirmedMembers:0,reservedMembers:0,occupiedPlaces:0,minTeamSize:minimum,targetTeamSize:target,maxTeamSize:maximum,capacityAvailable:false,stateLabel:'Team status unavailable'};
   confirmed=count||0;
  }
 }else{
  const {count,error}=await db.from('project_members').select('id',{count:'exact',head:true}).eq('project_id',input.projectId).in('membership_status',['waiting','active']);
  if(error)return{known:false,confirmedMembers:0,reservedMembers:0,occupiedPlaces:0,minTeamSize:minimum,targetTeamSize:target,maxTeamSize:maximum,capacityAvailable:false,stateLabel:'Team status unavailable'};
  confirmed=count||0;
 }

 const {count:offerReservations,error:offerError}=await db.from('project_offers').select('id',{count:'exact',head:true}).eq('project_id',input.projectId).in('status',['pending','accepted']).is('capacity_released_at',null).is('capacity_consumed_at',null);
 if(offerError)return{known:false,confirmedMembers:confirmed,reservedMembers:0,occupiedPlaces:confirmed,minTeamSize:minimum,targetTeamSize:target,maxTeamSize:maximum,capacityAvailable:false,stateLabel:'Team status unavailable'};
 reserved=offerReservations||0;
 const occupied=confirmed+reserved;
 const capacityAvailable=maximum==null?true:occupied<maximum;
 return{known:true,confirmedMembers:confirmed,reservedMembers:reserved,occupiedPlaces:occupied,minTeamSize:minimum,targetTeamSize:target,maxTeamSize:maximum,capacityAvailable,stateLabel:label(input.projectStatus,minimum,confirmed,reserved,capacityAvailable)};
}
