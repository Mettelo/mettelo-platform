import {serviceDb} from '@/lib/project-flow';

type Db=NonNullable<ReturnType<typeof serviceDb>>;
export type MemberProjectTeamState={known:boolean;confirmedMembers:number;reservedMembers:number;occupiedPlaces:number;minTeamSize:number|null;targetTeamSize:number|null;maxTeamSize:number|null;capacityAvailable:boolean;stateLabel:string};

type Input={projectId:string;projectType:string|null;projectStatus:string;minTeamSize:number|null;targetTeamSize:number|null;maxTeamSize:number|null;legacyThreshold?:number|null};

function label(input:Input,confirmed:number,reserved:number,capacityAvailable:boolean){
 if(input.projectStatus==='completed')return'Completed';
 if(input.projectStatus==='cancelled')return'Cancelled';
 if(input.projectStatus==='active'||input.projectStatus==='review')return'Active';
 const minimum=input.minTeamSize??input.legacyThreshold??null;
 if(!capacityAvailable)return'Currently full';
 if(minimum!=null&&confirmed>=minimum)return'Ready to start';
 if(confirmed+reserved>0)return'Team forming';
 return'Recruiting members';
}

export async function loadMemberProjectTeamState(db:Db,input:Input):Promise<MemberProjectTeamState>{
 const minimum=input.minTeamSize??input.legacyThreshold??null;
 const target=input.targetTeamSize??minimum;
 const maximum=input.maxTeamSize??target;
 let confirmed=0,reserved=0;
 if(input.projectType==='open'){
  const {data:run,error:runError}=await db.from('project_runs').select('id,status,has_started').eq('project_id',input.projectId).in('status',['forming','active','review','paused']).order('run_number',{ascending:false}).limit(1).maybeSingle();
  if(runError)return{known:false,confirmedMembers:0,reservedMembers:0,occupiedPlaces:0,minTeamSize:minimum,targetTeamSize:target,maxTeamSize:maximum,capacityAvailable:false,stateLabel:'Team status unavailable'};
  if(run){const {data,error}=await db.from('project_members').select('membership_status').eq('project_run_id',run.id).in('membership_status',['waiting','active']);if(error)return{known:false,confirmedMembers:0,reservedMembers:0,occupiedPlaces:0,minTeamSize:minimum,targetTeamSize:target,maxTeamSize:maximum,capacityAvailable:false,stateLabel:'Team status unavailable'};for(const row of data||[]){if(row.membership_status==='active')confirmed++;else if(row.membership_status==='waiting')reserved++;}}
 }else{
  const {data,error}=await db.from('project_members').select('membership_status').eq('project_id',input.projectId).in('membership_status',['waiting','active']);
  if(error)return{known:false,confirmedMembers:0,reservedMembers:0,occupiedPlaces:0,minTeamSize:minimum,targetTeamSize:target,maxTeamSize:maximum,capacityAvailable:false,stateLabel:'Team status unavailable'};
  for(const row of data||[]){if(row.membership_status==='active')confirmed++;else if(row.membership_status==='waiting')reserved++;}
 }
 const occupied=confirmed+reserved;
 const capacityAvailable=maximum==null?true:occupied<maximum;
 return{known:true,confirmedMembers:confirmed,reservedMembers:reserved,occupiedPlaces:occupied,minTeamSize:minimum,targetTeamSize:target,maxTeamSize:maximum,capacityAvailable,stateLabel:label(input,confirmed,reserved,capacityAvailable)};
}
