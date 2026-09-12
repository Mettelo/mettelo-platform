import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

function clean(value:unknown,max=800){return String(value??'').trim().slice(0,max)}
function idList(value:unknown,max=12){if(!Array.isArray(value))return[];return[...new Set(value.map(item=>clean(item,80)).filter(Boolean))].slice(0,max)}
function isAdmin(user:{app_metadata?:Record<string,unknown>}){return user.app_metadata?.role==='admin'}

type CapacitySnapshot={available?:number;capacity_available?:boolean;maximum?:number;occupied?:number;reserved?:number;late_join_allowed?:boolean};
function one<T>(value:T|T[]|null|undefined){return Array.isArray(value)?value[0]||null:value||null}

async function actorContext(projectId:string,runId:string){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
 const db=serviceDb();
 if(!db)return{error:NextResponse.json({error:'Project service is not configured.'},{status:503})};
 const [{data:project},{data:run},{data:membership},{count:activeCount}]=await Promise.all([
  db.from('projects').select('id,status,visibility,project_type,weekly_commitment,late_joining_enabled,late_joining_cutoff_at,member_invites_enabled,project_lead_invites_enabled,team_member_invites_enabled,collaboration_marketplace_enabled').eq('id',projectId).maybeSingle(),
  db.from('project_runs').select('id,project_id,status,has_started,recruitment_open').eq('id',runId).eq('project_id',projectId).maybeSingle(),
  db.from('project_members').select('id,team_role,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).limit(1).maybeSingle(),
  db.from('project_members').select('id',{count:'exact',head:true}).eq('project_id',projectId).eq('project_run_id',runId).eq('membership_status','active')
 ]);
 if(!project||!run)return{error:NextResponse.json({error:'Project run not found.'},{status:404})};
 if(project.status==='completed'||project.status==='cancelled'||project.status==='archived')return{error:NextResponse.json({error:'This project can no longer recruit collaborators.'},{status:409})};
 const admin=isAdmin(user);
 if(!admin&&(!membership||membership.membership_status!=='active'))return{error:NextResponse.json({error:'Active project membership is required.'},{status:403})};
 const canManage=admin||Boolean(membership&&membership.membership_status==='active'&&(membership.team_role==='project_lead'?project.project_lead_invites_enabled===true:project.team_member_invites_enabled===true));
 return{auth,db,user,project,run,membership,activeCount:activeCount||0,canManage};
}

async function capacity(db:NonNullable<ReturnType<typeof serviceDb>>,projectId:string,runId:string){
 const {data,error}=await db.rpc('phase9_project_run_capacity',{p_project_id:projectId,p_run_id:runId});
 if(error)return{error};
 return{snapshot:one(data as CapacitySnapshot|CapacitySnapshot[]|null)};
}

export async function GET(request:Request){
 try{
  const url=new URL(request.url);const projectId=clean(url.searchParams.get('project_id'),80);const runId=clean(url.searchParams.get('project_run_id'),80);
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  let query=auth.from('project_collaboration_needs').select('id,project_id,project_run_id,source_project_role_id,responsibility,target_role_catalogue_id,target_domain_id,experience_level,weekly_commitment,member_message,status,source,created_at,updated_at,project_collaboration_need_capabilities(capability_id)').eq('status','active').order('created_at',{ascending:false}).limit(60);
  if(projectId)query=query.eq('project_id',projectId);if(runId)query=query.eq('project_run_id',runId);
  const {data,error}=await query;if(error){console.error('collaboration need list failed',error.message);return NextResponse.json({error:'Unable to load collaboration opportunities.'},{status:500})}
  return NextResponse.json({items:data||[]},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('collaboration need list failed',error);return NextResponse.json({error:'Unable to load collaboration opportunities.'},{status:500})}
}

export async function POST(request:Request){
 try{
  const body=await request.json();const projectId=clean(body.project_id,80),runId=clean(body.project_run_id,80);
  if(!projectId||!runId)return NextResponse.json({error:'Project and run are required.'},{status:400});
  const ctx=await actorContext(projectId,runId);if('error'in ctx)return ctx.error;
  if(!ctx.canManage)return NextResponse.json({error:'Your current project role is not authorized by this project’s recruitment policy.'},{status:403});
  if(ctx.project.collaboration_marketplace_enabled!==true)return NextResponse.json({error:'Collaboration marketplace recruitment is disabled for this project.'},{status:409});
  if(!['forming','active'].includes(ctx.run.status))return NextResponse.json({error:'Collaboration recruitment is only available for forming or active runs.'},{status:409});
  if(ctx.run.recruitment_open===false)return NextResponse.json({error:'Recruitment is closed for this project run.'},{status:409});
  if(ctx.project.late_joining_enabled===false&&ctx.run.status==='active')return NextResponse.json({error:'Late joining is disabled for this active project.'},{status:409});
  if(ctx.project.late_joining_cutoff_at&&Date.now()>=new Date(ctx.project.late_joining_cutoff_at).getTime())return NextResponse.json({error:'The joining window for this project has closed.'},{status:409});
  const cap=await capacity(ctx.db,projectId,runId);if(cap.error||!cap.snapshot)return NextResponse.json({error:'Current project capacity could not be confirmed.'},{status:503});
  if(cap.snapshot.capacity_available!==true||Number(cap.snapshot.available||0)<1)return NextResponse.json({error:'This project run has no collaboration capacity available.'},{status:409});

  const sourceRoleId=clean(body.source_project_role_id,80)||null;const responsibility=clean(body.responsibility,160)||null;const targetRoleId=clean(body.target_role_catalogue_id,80)||null;const targetDomainId=clean(body.target_domain_id,80)||null;const experience=clean(body.experience_level,30)||null;const message=clean(body.member_message,800)||null;const requestedCommitment=clean(body.weekly_commitment,120)||null;const source=['member','phase15_solo_to_team','phase16_replacement','admin'].includes(clean(body.source,40))?clean(body.source,40):'member';const capabilityIds=idList(body.capability_ids);
  if(!responsibility&&!targetRoleId&&!capabilityIds.length)return NextResponse.json({error:'Choose at least one governed collaboration need: responsibility, role or capability.'},{status:400});
  if(requestedCommitment&&ctx.project.weekly_commitment&&requestedCommitment!==ctx.project.weekly_commitment)return NextResponse.json({error:'Commitment must use the project’s canonical weekly commitment.'},{status:409});

  const validations=await Promise.all([
   targetRoleId?ctx.db.from('project_role_catalogue').select('id').eq('id',targetRoleId).eq('active',true).maybeSingle():Promise.resolve({data:null,error:null}),
   targetDomainId?ctx.db.from('domains').select('id').eq('id',targetDomainId).eq('is_active',true).maybeSingle():Promise.resolve({data:null,error:null}),
   capabilityIds.length?ctx.db.from('capabilities').select('id').in('id',capabilityIds).eq('is_active',true):Promise.resolve({data:[],error:null})
  ]);
  if(targetRoleId&&!validations[0].data)return NextResponse.json({error:'Choose a valid canonical role.'},{status:400});
  if(targetDomainId&&!validations[1].data)return NextResponse.json({error:'Choose a valid canonical domain.'},{status:400});
  if(capabilityIds.length&&((validations[2].data||[]).length!==capabilityIds.length))return NextResponse.json({error:'Choose valid canonical capabilities.'},{status:400});

  const {data:need,error}=await ctx.db.from('project_collaboration_needs').insert({project_id:projectId,project_run_id:runId,created_by:ctx.user.id,source_project_role_id:sourceRoleId,responsibility,target_role_catalogue_id:targetRoleId,target_domain_id:targetDomainId,experience_level:experience,weekly_commitment:requestedCommitment||ctx.project.weekly_commitment||null,member_message:message,status:'active',source}).select('id,project_id,project_run_id,status,created_at').single();
  if(error){
   const detail=String(error.message||'');
   if(error.code==='23505')return NextResponse.json({error:'An active collaboration opportunity already exists for this need.',code:'DUPLICATE_ACTIVE_NEED'},{status:409});
   if(detail.includes('COLLABORATION_MARKETPLACE_DISABLED'))return NextResponse.json({error:'Collaboration marketplace recruitment is disabled for this project.',code:'MARKETPLACE_DISABLED'},{status:409});
   if(detail.includes('JOINING_WINDOW_CLOSED')||detail.includes('RUN_RECRUITMENT_CLOSED')||detail.includes('PROJECT_CLOSED')||detail.includes('LATE_JOINING_DISABLED'))return NextResponse.json({error:'This project is no longer eligible to recruit collaborators.',code:'RECRUITMENT_CLOSED'},{status:409});
   if(error.code==='23514')return NextResponse.json({error:'The collaboration need no longer matches this project/run.',code:'INVALID_NEED_CONTEXT'},{status:409});
   throw error;
  }
  if(capabilityIds.length){const {error:capabilityError}=await ctx.db.from('project_collaboration_need_capabilities').insert(capabilityIds.map(capabilityId=>({collaboration_need_id:need.id,capability_id:capabilityId})));if(capabilityError){await ctx.db.from('project_collaboration_needs').delete().eq('id',need.id);throw capabilityError}}
  await ctx.db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'collaboration_need_opened',actor_type:isAdmin(ctx.user)?'admin':'user',actor_user_id:ctx.user.id,from_status:ctx.run.status,to_status:ctx.run.status,metadata:{collaboration_need_id:need.id,source,responsibility:responsibility||null,target_role_catalogue_id:targetRoleId,capability_count:capabilityIds.length,capacity_available:Number(cap.snapshot.available||0)}});
  return NextResponse.json({ok:true,item:need},{status:201,headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('collaboration need create failed',error);return NextResponse.json({error:'Unable to open this collaboration need.'},{status:500})}
}

export async function PATCH(request:Request){
 try{
  const body=await request.json();const needId=clean(body.id,80),projectId=clean(body.project_id,80),runId=clean(body.project_run_id,80);if(!needId||!projectId||!runId)return NextResponse.json({error:'Collaboration need, project and run are required.'},{status:400});
  const ctx=await actorContext(projectId,runId);if('error'in ctx)return ctx.error;if(!ctx.canManage)return NextResponse.json({error:'Your current project role is not authorized by this project’s recruitment policy.'},{status:403});
  const {data:current}=await ctx.db.from('project_collaboration_needs').select('id,status,project_id,project_run_id').eq('id',needId).eq('project_id',projectId).eq('project_run_id',runId).maybeSingle();if(!current)return NextResponse.json({error:'Collaboration need not found.'},{status:404});if(current.status!=='active')return NextResponse.json({ok:true,already_closed:true,item:current});
  const reason=clean(body.reason,240)||'closed_by_authorized_actor';const now=new Date().toISOString();const {data,error}=await ctx.db.from('project_collaboration_needs').update({status:'closed',closed_reason:reason,closed_at:now,updated_at:now}).eq('id',needId).eq('status','active').select('id,status,closed_at').maybeSingle();if(error)throw error;if(!data)return NextResponse.json({error:'The collaboration need changed before it could be closed.'},{status:409});
  await ctx.db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'collaboration_need_closed',actor_type:isAdmin(ctx.user)?'admin':'user',actor_user_id:ctx.user.id,from_status:ctx.run.status,to_status:ctx.run.status,metadata:{collaboration_need_id:needId,reason}});
  return NextResponse.json({ok:true,item:data},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('collaboration need close failed',error);return NextResponse.json({error:'Unable to close this collaboration need.'},{status:500})}
}