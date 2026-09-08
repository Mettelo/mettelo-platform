import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

function clean(value:unknown,max=160){return String(value??'').trim().slice(0,max)}
function isAdmin(user:{app_metadata?:Record<string,unknown>}){return user.app_metadata?.role==='admin'}
type Capacity={available?:number;capacity_available?:boolean};
function one<T>(value:T|T[]|null|undefined):T|null{return Array.isArray(value)?value[0]||null:value||null}

async function liveNeed(db:NonNullable<ReturnType<typeof serviceDb>>,needId:string){
 const {data:need}=await db.from('project_collaboration_needs').select('id,project_id,project_run_id,status').eq('id',needId).maybeSingle();
 if(!need)return{need:null,project:null,run:null,capacity:null,accepting:false};
 const [{data:project},{data:run},capacityResult]=await Promise.all([
  db.from('projects').select('id,title,status,member_invites_enabled,late_joining_enabled,late_joining_cutoff_at').eq('id',need.project_id).maybeSingle(),
  db.from('project_runs').select('id,status,recruitment_open').eq('id',need.project_run_id).eq('project_id',need.project_id).maybeSingle(),
  db.rpc('phase9_project_run_capacity',{p_project_id:need.project_id,p_run_id:need.project_run_id})
 ]);
 const capacity=one(capacityResult.data as Capacity|Capacity[]|null);const cutoffClosed=Boolean(project?.late_joining_cutoff_at&&Date.now()>=new Date(project.late_joining_cutoff_at).getTime());
 const accepting=Boolean(need.status==='active'&&project&&run&&project.member_invites_enabled===true&&!['completed','cancelled','archived'].includes(project.status)&&['forming','active'].includes(run.status)&&run.recruitment_open!==false&&(run.status!=='active'||(project.late_joining_enabled!==false&&!cutoffClosed))&&capacity?.capacity_available===true&&Number(capacity.available||0)>0);
 return{need,project,run,capacity,accepting};
}

async function senderAllowed(db:NonNullable<ReturnType<typeof serviceDb>>,user:{id:string;app_metadata?:Record<string,unknown>},projectId:string,runId:string){
 if(isAdmin(user))return true;
 const {data}=await db.from('project_members').select('id,team_role,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).eq('membership_status','active').maybeSingle();
 return data?.team_role==='project_lead';
}

export async function GET(request:Request){
 try{
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Member invitation service is unavailable.'},{status:503});
  const scope=clean(new URL(request.url).searchParams.get('scope'),20)==='sent'?'sent':'received';
  const query=db.from('project_member_collaboration_invitations').select('id,collaboration_need_id,project_id,project_run_id,invited_by,invitee_user_id,status,expires_at,responded_at,created_at').order('created_at',{ascending:false}).limit(50);
  const {data,error}=scope==='sent'?await query.eq('invited_by',user.id):await query.eq('invitee_user_id',user.id);if(error)throw error;
  const projectIds=[...new Set((data||[]).map(item=>String(item.project_id)))];const {data:projects}=projectIds.length?await db.from('projects').select('id,title').in('id',projectIds):{data:[]};const titles=new Map((projects||[]).map(item=>[String(item.id),String(item.title)]));
  return NextResponse.json({items:(data||[]).map(item=>({...item,project_title:titles.get(String(item.project_id))||'Mettelo project'}))},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('member collaboration invitations read failed',error);return NextResponse.json({error:'Unable to load member invitations.'},{status:500})}
}

export async function POST(request:Request){
 try{
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});const db=serviceDb();if(!db)return NextResponse.json({error:'Member invitation service is unavailable.'},{status:503});
  const body=await request.json();const needId=clean(body.collaboration_need_id,80);const username=clean(body.username,80).replace(/^@/,'');if(!needId||!username)return NextResponse.json({error:'A collaboration opportunity and member are required.'},{status:400});
  const live=await liveNeed(db,needId);if(!live.need||!live.project||!live.run||!live.accepting)return NextResponse.json({error:'This collaboration opportunity is no longer accepting member invitations.'},{status:409});
  if(!await senderAllowed(db,user,live.need.project_id,live.need.project_run_id))return NextResponse.json({error:'Only the active Project Lead can invite an existing member to this project run.'},{status:403});
  const {data:invitee}=await db.from('profiles').select('id,username,is_public').ilike('username',username).maybeSingle();if(!invitee||invitee.is_public!==true)return NextResponse.json({error:'That member is not available for project invitations.'},{status:404});if(invitee.id===user.id)return NextResponse.json({error:'You cannot invite yourself.'},{status:400});
  const [{data:privacy},{data:membership},{data:application}]=await Promise.all([
   db.from('member_privacy_preferences').select('allow_project_invitations').eq('user_id',invitee.id).maybeSingle(),
   db.from('project_members').select('id').eq('project_id',live.need.project_id).eq('project_run_id',live.need.project_run_id).eq('user_id',invitee.id).in('membership_status',['waiting','active','completed']).limit(1).maybeSingle(),
   db.from('project_applications').select('id,status').eq('project_id',live.need.project_id).eq('user_id',invitee.id).not('status','in','(declined,withdrawn)').limit(1).maybeSingle()
  ]);
  if(privacy?.allow_project_invitations===false)return NextResponse.json({error:'That member has chosen not to receive project invitations.'},{status:409,headers:{'Cache-Control':'private, no-store'}});if(membership)return NextResponse.json({error:'That member is already part of this project run.'},{status:409});if(application)return NextResponse.json({error:'That member already has active interest in this project.'},{status:409});
  const {error:limitError}=await db.rpc('phase18_consume_member_invite_rate_limit',{p_actor:user.id});if(limitError){if(String(limitError.message||'').includes('MEMBER_INVITE_RATE_LIMITED'))return NextResponse.json({error:'You have reached the hourly member-invitation limit. Try again later.'},{status:429});throw limitError}
  const expiresAt=new Date(Date.now()+7*24*60*60*1000).toISOString();const {data:invite,error}=await db.from('project_member_collaboration_invitations').insert({collaboration_need_id:live.need.id,project_id:live.need.project_id,project_run_id:live.need.project_run_id,invited_by:user.id,invitee_user_id:invitee.id,status:'pending',expires_at:expiresAt}).select('id,status,expires_at').single();
  if(error){if(error.code==='23505')return NextResponse.json({error:'A pending invitation already exists for this member and opportunity.',code:'INVITE_ALREADY_PENDING'},{status:409});throw error}
  const {data:authUser}=await db.auth.admin.getUserById(invitee.id);await notifyUser(db,{userId:invitee.id,email:authUser.user?.email||null,projectId:live.need.project_id,type:'project_collaboration_invite',eventKey:'project_collaboration_invite',title:`Invitation to collaborate on ${live.project.title}`,body:'A Project Lead invited you to review an active collaboration need. The invitation does not add you to the project automatically.',actionUrl:'/member/collaboration-invitations',dedupeKey:`phase18-member-invite:${invite.id}`,payload:{project_title:live.project.title}});
  await db.from('project_activity_log').insert({project_id:live.need.project_id,project_run_id:live.need.project_run_id,event_type:'member_collaboration_invite_sent',actor_type:isAdmin(user)?'admin':'user',actor_user_id:user.id,from_status:live.run.status,to_status:live.run.status,metadata:{collaboration_need_id:live.need.id,member_invite_id:invite.id,invitee_user_id:invitee.id,expires_at:expiresAt}});
  return NextResponse.json({ok:true,invite},{status:201,headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('member collaboration invitation create failed',error);return NextResponse.json({error:'Unable to send this member invitation.'},{status:500})}
}

export async function PATCH(request:Request){
 try{
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});const db=serviceDb();if(!db)return NextResponse.json({error:'Member invitation service is unavailable.'},{status:503});
  const body=await request.json();const id=clean(body.id,80);const action=clean(body.action,24);if(!id||!['accept','decline','revoke'].includes(action))return NextResponse.json({error:'Choose a valid invitation action.'},{status:400});
  const {data:invite}=await db.from('project_member_collaboration_invitations').select('id,collaboration_need_id,project_id,project_run_id,invited_by,invitee_user_id,status,expires_at').eq('id',id).maybeSingle();if(!invite)return NextResponse.json({error:'Invitation not found.'},{status:404});if(invite.status!=='pending')return NextResponse.json({error:'This invitation has already been used or is no longer active.',code:'INVITE_NOT_PENDING',status:invite.status},{status:409});
  const now=new Date();if(now.getTime()>=new Date(invite.expires_at).getTime()){await db.from('project_member_collaboration_invitations').update({status:'expired',updated_at:now.toISOString()}).eq('id',id).eq('status','pending');return NextResponse.json({error:'This invitation has expired.',code:'INVITE_EXPIRED'},{status:410})}
  if(action==='revoke'){
   if(!isAdmin(user)&&invite.invited_by!==user.id)return NextResponse.json({error:'You cannot revoke this invitation.'},{status:403});const timestamp=now.toISOString();const {data:updated,error}=await db.from('project_member_collaboration_invitations').update({status:'revoked',revoked_at:timestamp,updated_at:timestamp}).eq('id',id).eq('status','pending').select('id,status').maybeSingle();if(error)throw error;if(!updated)return NextResponse.json({error:'Invitation changed before it could be revoked.'},{status:409});return NextResponse.json({ok:true,status:'revoked'});
  }
  if(invite.invitee_user_id!==user.id)return NextResponse.json({error:'This invitation is not for the signed-in member.'},{status:403});
  if(action==='accept'){
   const live=await liveNeed(db,invite.collaboration_need_id);if(!live.need||!live.accepting)return NextResponse.json({error:'This collaboration opportunity is no longer accepting people.',code:'OPPORTUNITY_CLOSED'},{status:409});const timestamp=now.toISOString();const {data:updated,error}=await db.from('project_member_collaboration_invitations').update({status:'accepted',responded_at:timestamp,updated_at:timestamp}).eq('id',id).eq('status','pending').select('id,status').maybeSingle();if(error)throw error;if(!updated)return NextResponse.json({error:'Invitation changed before it could be accepted.',code:'INVITE_REPLAYED'},{status:409});await db.from('project_activity_log').insert({project_id:invite.project_id,project_run_id:invite.project_run_id,event_type:'member_collaboration_invite_accepted',actor_type:'user',actor_user_id:user.id,metadata:{member_invite_id:id,collaboration_need_id:invite.collaboration_need_id}});return NextResponse.json({ok:true,status:'accepted',interest_target:`/member/discover/${invite.project_id}?collaboration_need=${encodeURIComponent(invite.collaboration_need_id)}`});
  }
  const timestamp=now.toISOString();const {data:updated,error}=await db.from('project_member_collaboration_invitations').update({status:'declined',responded_at:timestamp,updated_at:timestamp}).eq('id',id).eq('status','pending').select('id,status').maybeSingle();if(error)throw error;if(!updated)return NextResponse.json({error:'Invitation changed before it could be declined.',code:'INVITE_REPLAYED'},{status:409});await db.from('project_activity_log').insert({project_id:invite.project_id,project_run_id:invite.project_run_id,event_type:'member_collaboration_invite_declined',actor_type:'user',actor_user_id:user.id,metadata:{member_invite_id:id,collaboration_need_id:invite.collaboration_need_id}});return NextResponse.json({ok:true,status:'declined'});
 }catch(error){console.error('member collaboration invitation update failed',error);return NextResponse.json({error:'Unable to update this member invitation.'},{status:500})}
}
