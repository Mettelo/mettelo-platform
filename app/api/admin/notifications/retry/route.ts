import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {deliverOutboxItem,serviceDb} from '@/lib/project-flow';

export async function POST(request:Request){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user||user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
 const db=serviceDb();if(!db)return NextResponse.json({error:'Email service is not configured.'},{status:503});
 try{const {id}=await request.json();const {data:item}=await db.from('email_outbox').select('*').eq('id',String(id||'')).maybeSingle();if(!item)return NextResponse.json({error:'Email not found.'},{status:404});if(item.status==='sent')return NextResponse.json({error:'This email has already been sent.'},{status:409});await db.from('email_outbox').update({status:'queued',next_attempt_at:new Date().toISOString(),dead_letter_at:null,permanent_failure:false,updated_at:new Date().toISOString()}).eq('id',item.id);const fresh={...item,status:'queued',next_attempt_at:new Date().toISOString(),dead_letter_at:null,permanent_failure:false};await deliverOutboxItem(db,fresh);const {data:updated}=await db.from('email_outbox').select('id,status,attempts,last_error,next_attempt_at,sent_at,provider_message_id').eq('id',item.id).single();return NextResponse.json({ok:true,item:updated});}catch(error){console.error('manual email retry failed',error);return NextResponse.json({error:'Unable to retry email.'},{status:500});}
}
