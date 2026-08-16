import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';

function clean(value:unknown,max=100){return String(value??'').trim().slice(0,max)}

export async function GET(request:Request){
  try{
    const url=new URL(request.url);const projectId=clean(url.searchParams.get('project_id')),runId=clean(url.searchParams.get('project_run_id'));
    if(!projectId||!runId)return NextResponse.json({error:'Project and project run are required.'},{status:400});
    const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const {data:membership}=await supabase.from('project_members').select('id').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).in('membership_status',['active','completed']).maybeSingle();
    if(!membership)return NextResponse.json({error:'Project membership is required.'},{status:403});
    const {data:contributions,error}=await supabase.from('contributions').select('id,title,description,evidence_url,verification_status,review_notes,created_at,updated_at,verified_at').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).order('created_at',{ascending:false});
    if(error)throw error;
    const ids=(contributions||[]).map(item=>item.id);if(!ids.length)return NextResponse.json({items:[]});
    const {data:events,eventError}=await supabase.from('contribution_review_events').select('id,contribution_id,event_type,comment,evidence_url,created_at,actor_user_id').in('contribution_id',ids).order('created_at',{ascending:true});
    if(eventError)throw eventError;
    const actorIds=[...new Set((events||[]).map(item=>item.actor_user_id).filter(Boolean))];const {data:profiles}=actorIds.length?await supabase.from('profiles').select('id,full_name').in('id',actorIds):{data:[]};const names=new Map((profiles||[]).map(profile=>[profile.id,profile.full_name||'Project member']));
    return NextResponse.json({items:(contributions||[]).map(item=>({...item,events:(events||[]).filter(event=>event.contribution_id===item.id).map(event=>({...event,actor_name:event.actor_user_id?names.get(event.actor_user_id)||'Project member':'System'}))}))});
  }catch(error){console.error('project contribution status error',error);return NextResponse.json({error:'Unable to load contribution status.'},{status:500});}
}
