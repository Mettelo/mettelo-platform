import {NextResponse} from 'next/server';
import {serviceDb} from '@/lib/project-flow';

type NeedRow={
  id:string;project_id:string;project_run_id:string;responsibility:string|null;target_role_catalogue_id:string|null;target_domain_id:string|null;experience_level:string|null;weekly_commitment:string|null;member_message:string|null;status:string;source:string;created_at:string;
};
type ProjectRow={id:string;slug:string|null;title:string;summary:string|null;status:string;visibility:string;project_type:string|null;weekly_commitment:string|null;late_joining_enabled:boolean|null;late_joining_cutoff_at:string|null};
type RunRow={id:string;project_id:string;status:string;has_started:boolean|null;recruitment_open:boolean|null};
type Capacity={available?:number;capacity_available?:boolean;maximum?:number;occupied?:number;reserved?:number;late_join_allowed?:boolean};

function clean(value:string|null,max=80){return String(value||'').trim().slice(0,max)}
function one<T>(value:T|T[]|null|undefined):T|null{return Array.isArray(value)?value[0]||null:value||null}

async function projectOpportunity(db:NonNullable<ReturnType<typeof serviceDb>>,need:NeedRow){
  if(need.source==='direct_invite')return null;
  const [{data:project},{data:run},{data:links},capacityResult]=await Promise.all([
    db.from('projects').select('id,slug,title,summary,status,visibility,project_type,weekly_commitment,late_joining_enabled,late_joining_cutoff_at').eq('id',need.project_id).maybeSingle(),
    db.from('project_runs').select('id,project_id,status,has_started,recruitment_open').eq('id',need.project_run_id).eq('project_id',need.project_id).maybeSingle(),
    db.from('project_collaboration_need_capabilities').select('capability_id').eq('collaboration_need_id',need.id),
    db.rpc('phase9_project_run_capacity',{p_project_id:need.project_id,p_run_id:need.project_run_id})
  ]);
  if(!project||!run)return null;
  const p=project as ProjectRow,r=run as RunRow;
  if(p.visibility!=='public')return null;
  const capacity=one(capacityResult.data as Capacity|Capacity[]|null);
  const capabilityIds=(links||[]).map(row=>String(row.capability_id));
  const [roleResult,domainResult,capabilitiesResult]=await Promise.all([
    need.target_role_catalogue_id?db.from('project_role_catalogue').select('title').eq('id',need.target_role_catalogue_id).eq('active',true).maybeSingle():Promise.resolve({data:null}),
    need.target_domain_id?db.from('domains').select('name').eq('id',need.target_domain_id).eq('is_active',true).maybeSingle():Promise.resolve({data:null}),
    capabilityIds.length?db.from('capabilities').select('id,name').in('id',capabilityIds).eq('is_active',true):Promise.resolve({data:[]})
  ]);
  const cutoffClosed=Boolean(p.late_joining_cutoff_at&&Date.now()>=new Date(p.late_joining_cutoff_at).getTime());
  const terminalProject=['cancelled','completed','archived'].includes(p.status);
  const liveRun=['forming','active'].includes(r.status);
  const recruitmentOpen=r.recruitment_open!==false;
  const lateJoinOpen=r.status!=='active'||(p.late_joining_enabled!==false&&!cutoffClosed);
  const hasCapacity=Boolean(capacity&&capacity.capacity_available===true&&Number(capacity.available||0)>0);
  const accepting=need.status==='active'&&!terminalProject&&liveRun&&recruitmentOpen&&lateJoinOpen&&hasCapacity;
  const closedReason=accepting?null:need.status!=='active'?'opportunity_closed':terminalProject?'project_closed':!liveRun?'run_closed':!recruitmentOpen?'recruitment_closed':!lateJoinOpen?'joining_closed':!hasCapacity?'full':'unavailable';
  return{
    id:need.id,
    project:{id:p.id,slug:p.slug,title:p.title,summary:p.summary,project_type:p.project_type},
    need:{responsibility:need.responsibility,role:roleResult.data?.title||null,domain:domainResult.data?.name||null,capabilities:(capabilitiesResult.data||[]).map(row=>String(row.name)),experience_level:need.experience_level,weekly_commitment:need.weekly_commitment||p.weekly_commitment||null,message:need.member_message},
    availability:{accepting,closed_reason:closedReason,open_places:accepting?Number(capacity?.available||0):0,joining_deadline:p.late_joining_cutoff_at||null,project_stage:p.status,run_stage:r.status},
    created_at:need.created_at,
    public_url:`/collaborate/${need.id}`,
    interest_target:`/member/discover/${p.id}?collaboration_need=${encodeURIComponent(need.id)}`
  };
}

export async function GET(request:Request){
  try{
    const db=serviceDb();
    if(!db)return NextResponse.json({error:'Collaboration opportunity service is unavailable.'},{status:503,headers:{'Cache-Control':'public, max-age=0, s-maxage=30'}});
    const url=new URL(request.url),id=clean(url.searchParams.get('id'));
    if(id){
      const {data,error}=await db.from('project_collaboration_needs').select('id,project_id,project_run_id,responsibility,target_role_catalogue_id,target_domain_id,experience_level,weekly_commitment,member_message,status,source,created_at').eq('id',id).neq('source','direct_invite').maybeSingle();
      if(error){console.error('public collaboration opportunity lookup failed',error.message);return NextResponse.json({error:'Unable to load this collaboration opportunity.'},{status:503})}
      if(!data)return NextResponse.json({error:'Collaboration opportunity not found.'},{status:404});
      const item=await projectOpportunity(db,data as NeedRow);
      if(!item)return NextResponse.json({error:'Collaboration opportunity not found.'},{status:404});
      return NextResponse.json({item},{headers:{'Cache-Control':'public, max-age=0, s-maxage=30, stale-while-revalidate=30'}});
    }
    const requestedLimit=Number(url.searchParams.get('limit')||24);const limit=Number.isFinite(requestedLimit)?Math.min(Math.max(Math.trunc(requestedLimit),1),40):24;
    const {data,error}=await db.from('project_collaboration_needs').select('id,project_id,project_run_id,responsibility,target_role_catalogue_id,target_domain_id,experience_level,weekly_commitment,member_message,status,source,created_at').eq('status','active').neq('source','direct_invite').order('created_at',{ascending:false}).limit(limit);
    if(error){console.error('public collaboration opportunities failed',error.message);return NextResponse.json({error:'Unable to load collaboration opportunities.'},{status:503})}
    const projected=await Promise.all((data||[]).map(row=>projectOpportunity(db,row as NeedRow)));
    return NextResponse.json({items:projected.filter((item):item is NonNullable<typeof item>=>Boolean(item)).filter(item=>item.availability.accepting)},{headers:{'Cache-Control':'public, max-age=0, s-maxage=30, stale-while-revalidate=30'}});
  }catch(error){console.error('public collaboration opportunities failed',error instanceof Error?error.message:'unknown');return NextResponse.json({error:'Unable to load collaboration opportunities.'},{status:503})}
}
