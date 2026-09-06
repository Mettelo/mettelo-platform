import {serviceDb} from '@/lib/project-flow';

type Db=NonNullable<ReturnType<typeof serviceDb>>;
export type MemberProjectTeamState={known:boolean;confirmedMembers:number;reservedMembers:number;occupiedPlaces:number;minTeamSize:number|null;targetTeamSize:number|null;maxTeamSize:number|null;capacityAvailable:boolean;stateLabel:string};

type Input={projectId:string;projectType:string|null;projectStatus:string;minTeamSize:number|null;targetTeamSize:number|null;maxTeamSize:number|null;legacyThreshold?:number|null};

function label(input:Input,confirmed:number,reserved:number,capacityAvailable:boolean){
 if(input.projectStatus==='completed')return'Completed';
 if(input.projectStatus==='cancelled')return'Cancelled';
 if(input.projectStatus==='active'||input.projectStatus==='review')return capacityAvailable?'Active · places may remain open':'Active · full';
 const minimum=input.minTeamSize??input.legacyThreshold??null;
 if(!capacityAvailable)return'Currently full';
 if(minimum!=null&&confirmed>=minimum)return'Ready to start';
 if(confirmed+reserved>0)return'Team forming';
 return'Recruiting members';
}

/**
 * Member-facing capacity mirrors the Phase 8/9 server invariant:
 * - waiting/active canonical memberships are occupied places;
 * - pending/accepted unconsumed Offers are reservations;
 * - a consumed accepted Offer is not counted again after membership formation.
 * Readiness itself is based on formed canonical memberships; Phase 10 owns the
 * accepted-Offer -> membership handoff.
 */
export async function loadMemberProjectTeamState(db:Db,input:Input):Promise<MemberProjectTeamState>{
 const minimum=input.minTeamSize??input.legacyThreshold??null;
 const target=input.targetTeamSize??minimum;
 const maximum=input.maxTeamSize??target;
 let confirmed=0;
 let reserved=0;

 if(input.projectType==='open'){
  const {data:run,error:runError}=await db.from('project_runs').select('id,status,has_started').eq('project_id',input.projectId).in('status',['forming','active','review','paused']).order('run_number',{ascending:false}).limit(1).maybeSingle();
  if(runError)return{known:false,confirmedMembers:0,reservedMembers:0,occupiedPlaces:0,minTeamSize:minimum,targetTeamSize:target,maxTeamSize:maximum,capacityAvailable:false,stateLabel:'Team status unavailable'};
  if(run){
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
 return{known:true,confirmedMembers:confirmed,reservedMembers:reserved,occupiedPlaces:occupied,minTeamSize:minimum,targetTeamSize:target,maxTeamSize:maximum,capacityAvailable,stateLabel:label(input,confirmed,reserved,capacityAvailable)};
}