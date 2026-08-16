import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export async function GET(request:Request){
  try{
    const url=new URL(request.url);const taskId=(url.searchParams.get('task_id')||'').trim();if(!taskId)return NextResponse.json({error:'Task is required.'},{status:400});
    const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const {data:task}=await supabase.from('project_tasks').select('id,project_run_id').eq('id',taskId).maybeSingle();if(!task)return NextResponse.json({error:'Task not found or inaccessible.'},{status:404});
    const {data:membership}=await supabase.from('project_members').select('id').eq('project_run_id',task.project_run_id).eq('user_id',user.id).in('membership_status',['active','completed']).maybeSingle();const isAdmin=user.app_metadata?.role==='admin';if(!membership&&!isAdmin)return NextResponse.json({error:'Project membership is required.'},{status:403});
    const {data,error}=await supabase.from('project_task_events').select('id,event_type,from_status,to_status,comment,evidence_url,created_at,actor_user_id').eq('task_id',taskId).order('created_at',{ascending:false}).limit(50);if(error)throw error;
    const actorIds=[...new Set((data||[]).map(item=>item.actor_user_id).filter(Boolean))];const {data:profiles}=actorIds.length?await supabase.from('profiles').select('id,full_name').in('id',actorIds):{data:[]};const names=new Map((profiles||[]).map(profile=>[profile.id,profile.full_name||'Project member']));
    return NextResponse.json({items:(data||[]).map(item=>({...item,actor_name:item.actor_user_id?names.get(item.actor_user_id)||'Project member':'System'}))});
  }catch(error){console.error('task history error',error);return NextResponse.json({error:'Unable to load task activity.'},{status:500})}
}
