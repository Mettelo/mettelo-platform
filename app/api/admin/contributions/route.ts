import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const statuses=new Set(['pending','needs_changes','verified','rejected']);

export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();
    const {data:{user}}=await auth.auth.getUser();
    if(!user) return NextResponse.json({error:'Authentication required.'},{status:401});
    if(user.app_metadata?.role!=='admin') return NextResponse.json({error:'Admin access required.'},{status:403});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key) return NextResponse.json({error:'Admin data service is not configured.'},{status:503});
    const body=await request.json();const id=String(body.id||'');const status=String(body.status||'');const reviewNotes=String(body.review_notes||'').trim().slice(0,1800);
    if(!id||!statuses.has(status)) return NextResponse.json({error:'Choose a valid contribution and review status.'},{status:400});
    if(status==='needs_changes'&&!reviewNotes) return NextResponse.json({error:'Add review notes explaining what needs to change.'},{status:400});
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:existing}=await db.from('contributions').select('id,task_id').eq('id',id).maybeSingle();
    if(!existing) return NextResponse.json({error:'Contribution not found.'},{status:404});
    const verified=status==='verified';
    const {data,error}=await db.from('contributions').update({verification_status:status,review_notes:reviewNotes||null,verified_by:verified?user.id:null,verified_at:verified?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',id).select('id,verification_status').single();
    if(error) throw error;
    if(existing.task_id){
      const taskStatus=verified?'done':status==='needs_changes'?'in_progress':status==='rejected'?'blocked':'review';
      const {error:taskError}=await db.from('project_tasks').update({status:taskStatus,updated_at:new Date().toISOString()}).eq('id',existing.task_id);
      if(taskError) throw taskError;
    }
    return NextResponse.json({ok:true,contribution:data});
  }catch(error){console.error('contribution verification error',error);return NextResponse.json({error:'Unable to update contribution review.'},{status:500});}
}
