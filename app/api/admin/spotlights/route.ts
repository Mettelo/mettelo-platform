import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

async function admin(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();return user?.app_metadata?.role==='admin'?user:null;}

export async function PATCH(request:Request){
  const reviewer=await admin();if(!reviewer)return NextResponse.json({error:'Forbidden'},{status:403});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Service unavailable'},{status:503});
  const body=await request.json().catch(()=>({}));const id=typeof body.id==='string'?body.id:'';const action=typeof body.action==='string'?body.action:'';
  if(!id||!['publish','exclude','restore'].includes(action))return NextResponse.json({error:'Invalid request'},{status:400});
  const now=new Date().toISOString();
  if(action==='publish'){
    const {data:row}=await db.from('spotlights').select('award_month').eq('id',id).single();if(!row)return NextResponse.json({error:'Spotlight not found'},{status:404});
    const {count}=await db.from('spotlights').select('id',{count:'exact',head:true}).eq('award_month',row.award_month).eq('status','draft').eq('is_excluded',false);
    if((count||0)<3)return NextResponse.json({error:'All three eligible monthly awards must be present before publication.'},{status:409});
    const {error}=await db.from('spotlights').update({status:'published',published_at:now,reviewed_by:reviewer.id,reviewed_at:now}).eq('award_month',row.award_month).eq('status','draft').eq('is_excluded',false);if(error)throw error;
    return NextResponse.json({ok:true,publishedMonth:row.award_month});
  }
  const excluded=action==='exclude';const reason=excluded&&typeof body.reason==='string'?body.reason.trim().slice(0,500):null;
  const {error}=await db.from('spotlights').update({is_excluded:excluded,exclusion_reason:reason,selection_method:excluded?'override':'automatic',reviewed_by:reviewer.id,reviewed_at:now}).eq('id',id);if(error)throw error;
  return NextResponse.json({ok:true});
}
