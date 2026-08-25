import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

export async function PATCH(request:Request){
 try{
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user||user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Career service not configured.'},{status:503});
  const body=await request.json();const id=String(body.id||'');const note=String(body.note||'').trim().slice(0,3000);if(!id)return NextResponse.json({error:'Career application is required.'},{status:400});
  const {error}=await db.from('career_applications').update({admin_notes:note||null,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;
  await db.from('communication_audit_log').insert({actor_user_id:user.id,action:'career_internal_note_update',entity_type:'career_application',entity_id:id,metadata:{candidate_communication:false}});
  return NextResponse.json({ok:true});
 }catch(error){console.error('career note update error',error);return NextResponse.json({error:'Unable to save the internal note.'},{status:500});}
}
