import {createHash,randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {deliverOutboxItem,enqueueEmail,serviceDb} from '@/lib/project-flow';

function clean(value:unknown,max=320){return String(value??'').trim().slice(0,max)}
function hash(value:string){return createHash('sha256').update(value).digest('hex')}
function email(value:unknown){const normalized=clean(value,320).toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)?normalized:null}
function isAdmin(user:{app_metadata?:Record<string,unknown>}){return user.app_metadata?.role==='admin'}
function baseUrl(){const configured=process.env.NEXT_PUBLIC_SITE_URL?.trim();if(configured)return configured.replace(/\/$/,'');const vercel=process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()||process.env.VERCEL_URL?.trim();return vercel?`https://${vercel.replace(/^https?:\/\//,'').replace(/\/$/,'')}`:'https://mettelo.com'}

export async function POST(request:Request){
 try{
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Project invitation service is unavailable.'},{status:503});
  const body=await request.json();const needId=clean(body.collaboration_need_id,80);const recipient=email(body.email);if(!needId||!recipient)return NextResponse.json({error:'A valid collaboration opportunity and email address are required.'},{status:400});
  if(user.email&&user.email.trim().toLowerCase()===recipient)return NextResponse.json({error:'Use I’m interested to respond to this opportunity yourself.'},{status:400});
  const {data:need}=await db.from('project_collaboration_needs').select('id,project_id,project_run_id,status').eq('id',needId).maybeSingle();if(!need||need.status!=='active')return NextResponse.json({error:'This collaboration opportunity is no longer active.'},{status:409});
  const [{data:project},{data:run},{data:membership},{count:activeCount},capacityResult]=await Promise.all([
   db.from('projects').select('id,title,status,visibility,late_joining_enabled,late_joining_cutoff_at').eq('id',need.project_id).maybeSingle(),
   db.from('project_runs').select('id,status,has_started,recruitment_open').eq('id',need.project_run_id).eq('project_id',need.project_id).maybeSingle(),
   db.from('project_members').select('id,team_role,membership_status').eq('project_id',need.project_id).eq('project_run_id',need.project_run_id).eq('user_id',user.id).limit(1).maybeSingle(),
   db.from('project_members').select('id',{count:'exact',head:true}).eq('project_id',need.project_id).eq('project_run_id',need.project_run_id).eq('membership_status','active'),
   db.rpc('phase9_project_run_capacity',{p_project_id:need.project_id,p_run_id:need.project_run_id})
  ]);
  if(!project||!run||project.visibility!=='public')return NextResponse.json({error:'This opportunity cannot be invited to externally.'},{status:409});
  const admin=isAdmin(user);const soleActive=(activeCount||0)===1;const authorized=admin||Boolean(membership&&membership.membership_status==='active'&&(membership.team_role==='project_lead'||soleActive));if(!authorized)return NextResponse.json({error:'Only the Project Lead, Admin, or sole active member can send a direct external collaboration invitation.'},{status:403});
  const cutoffClosed=Boolean(project.late_joining_cutoff_at&&Date.now()>=new Date(project.late_joining_cutoff_at).getTime());const capacity=Array.isArray(capacityResult.data)?capacityResult.data[0]:capacityResult.data;
  if(['completed','cancelled','archived'].includes(project.status)||!['forming','active'].includes(run.status)||run.recruitment_open===false||(run.status==='active'&&(project.late_joining_enabled===false||cutoffClosed))||!capacity||capacity.capacity_available!==true||Number(capacity.available||0)<1)return NextResponse.json({error:'This collaboration opportunity is no longer accepting people.'},{status:409});
  const {error:limitError}=await db.rpc('phase18_consume_external_invite_rate_limit',{p_actor:user.id});if(limitError){if(String(limitError.message||'').includes('EXTERNAL_INVITE_RATE_LIMITED'))return NextResponse.json({error:'You have reached the hourly invitation limit. Try again later.'},{status:429});throw limitError}
  const token=randomBytes(32).toString('base64url');const tokenHash=hash(token);const emailHash=hash(recipient);const expiresAt=new Date(Date.now()+7*24*60*60*1000).toISOString();
  const {data:invite,error:inviteError}=await db.from('project_external_collaboration_invites').insert({collaboration_need_id:need.id,project_id:need.project_id,project_run_id:need.project_run_id,invited_by:user.id,invitee_email:recipient,invitee_email_hash:emailHash,token_hash:tokenHash,status:'pending',expires_at:expiresAt}).select('id,expires_at').single();
  if(inviteError){if(inviteError.code==='23505')return NextResponse.json({error:'A pending invitation already exists for this email and opportunity.',code:'INVITE_ALREADY_PENDING'},{status:409});throw inviteError}
  const actionUrl=`${baseUrl()}/collaborate/${encodeURIComponent(need.id)}?invite=${encodeURIComponent(token)}`;const outbox=await enqueueEmail(db,{to:recipient,templateKey:'project_external_collaboration_invite',eventKey:'project_external_collaboration_invite',dedupeKey:`phase18-external:${invite.id}`,subject:`Invitation to collaborate on ${project.title}`,body:`You have been invited to consider joining ${project.title} on Mettelo. The invitation does not add you to the project automatically. Open it to review the collaboration need, then sign in or create an account and submit interest. Mettelo will revalidate eligibility, capacity and the joining window before any place is confirmed.`,actionUrl,payload:{project_title:project.title,invite_expires_at:expiresAt}});if(outbox)await deliverOutboxItem(db,outbox);
  await db.from('project_activity_log').insert({project_id:need.project_id,project_run_id:need.project_run_id,event_type:'external_collaboration_invite_sent',actor_type:admin?'admin':'user',actor_user_id:user.id,from_status:run.status,to_status:run.status,metadata:{collaboration_need_id:need.id,external_invite_id:invite.id,expires_at:expiresAt}});
  return NextResponse.json({ok:true,invite:{id:invite.id,expires_at:expiresAt}},{status:201,headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('external collaboration invite create failed',error);return NextResponse.json({error:'Unable to send this collaboration invitation.'},{status:500})}
}

export async function PATCH(request:Request){
 try{
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});const db=serviceDb();if(!db)return NextResponse.json({error:'Project invitation service is unavailable.'},{status:503});
  const body=await request.json();const id=clean(body.id,80);if(!id)return NextResponse.json({error:'Invitation id is required.'},{status:400});const {data:invite}=await db.from('project_external_collaboration_invites').select('id,project_id,project_run_id,invited_by,status').eq('id',id).maybeSingle();if(!invite)return NextResponse.json({error:'Invitation not found.'},{status:404});if(invite.status!=='pending')return NextResponse.json({ok:true,unchanged:true,status:invite.status});
  const admin=isAdmin(user);if(!admin&&invite.invited_by!==user.id)return NextResponse.json({error:'You cannot revoke this invitation.'},{status:403});const now=new Date().toISOString();const {data,error}=await db.from('project_external_collaboration_invites').update({status:'revoked',revoked_at:now,updated_at:now}).eq('id',id).eq('status','pending').select('id,status,revoked_at').maybeSingle();if(error)throw error;if(!data)return NextResponse.json({error:'Invitation changed before it could be revoked.'},{status:409});
  await db.from('project_activity_log').insert({project_id:invite.project_id,project_run_id:invite.project_run_id,event_type:'external_collaboration_invite_revoked',actor_type:admin?'admin':'user',actor_user_id:user.id,metadata:{external_invite_id:id}});return NextResponse.json({ok:true,invite:data});
 }catch(error){console.error('external collaboration invite revoke failed',error);return NextResponse.json({error:'Unable to revoke this collaboration invitation.'},{status:500})}
}