import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

const STATES=new Set(['pending','completed','not_required']);
export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user||user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Career service not configured.'},{status:503});
    const body=await request.json();const id=String(body.id||'').trim();const status=String(body.status||'').trim();if(!id||!STATES.has(status))return NextResponse.json({error:'Invalid onboarding update.'},{status:400});
    const now=new Date().toISOString();const {data:item,error}=await db.from('career_onboarding_items').update({status,completed_at:status==='completed'?now:null,updated_at:now}).eq('id',id).select('id,application_id,item_key,title,description,status,due_at,completed_at').single();if(error)throw error;
    await db.from('communication_audit_log').insert({actor_user_id:user.id,action:'career_onboarding_updated',entity_type:'career_application',entity_id:item.application_id,metadata:{onboarding_item_id:item.id,item_key:item.item_key,status}});
    return NextResponse.json({ok:true,item});
  }catch(error){console.error('career onboarding update error',error);return NextResponse.json({error:'Unable to update onboarding item.'},{status:500});}
}
