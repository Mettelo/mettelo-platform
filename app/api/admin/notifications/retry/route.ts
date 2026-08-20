import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {deliverOutboxItem,serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {recordAdminAudit} from '@/lib/admin-audit';

export async function POST(request:Request){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
 if(!hasAdminCapability(user,'communications.manage'))return NextResponse.json({error:'Communications management capability required.'},{status:403});
 const db=serviceDb();if(!db)return NextResponse.json({error:'Email service is not configured.'},{status:503});
 try{
  const {id}=await request.json();const deliveryId=String(id||'').trim();if(!deliveryId)return NextResponse.json({error:'Delivery is required.'},{status:400});
  const {data:item}=await db.from('email_outbox').select('*').eq('id',deliveryId).maybeSingle();if(!item)return NextResponse.json({error:'Email not found.'},{status:404});if(item.status==='sent')return NextResponse.json({error:'This email has already been sent.'},{status:409});
  const before={status:item.status,attempts:item.attempts,max_attempts:item.max_attempts,dead_letter_at:item.dead_letter_at};
  const retryAt=new Date().toISOString();await db.from('email_outbox').update({status:'queued',next_attempt_at:retryAt,dead_letter_at:null,permanent_failure:false,updated_at:retryAt}).eq('id',item.id);
  const fresh={...item,status:'queued',next_attempt_at:retryAt,dead_letter_at:null,permanent_failure:false};await deliverOutboxItem(db,fresh);
  const {data:updated}=await db.from('email_outbox').select('id,status,attempts,last_error,next_attempt_at,sent_at,provider_message_id').eq('id',item.id).single();
  const audit=await recordAdminAudit({actorUserId:user.id,actorEmail:user.email,capability:'communications.manage',action:'communications.delivery.retry_requested',resourceType:'email.delivery',resourceId:item.id,beforeState:before,afterState:{status:updated?.status||'unknown',attempts:updated?.attempts??before.attempts},metadata:{manual:true}});
  return NextResponse.json({ok:true,item:updated,audit_recorded:audit.ok});
 }catch(error){console.error('manual email retry failed',error);return NextResponse.json({error:'Unable to retry email.'},{status:500});}
}
