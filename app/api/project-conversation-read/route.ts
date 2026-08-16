import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';

function clean(value:unknown,max=100){return String(value??'').trim().slice(0,max)}

export async function POST(request:Request){
  try{
    const body=await request.json();const projectRunId=clean(body.project_run_id),lastMessageId=clean(body.last_message_id)||null;
    if(!projectRunId)return NextResponse.json({error:'Project run is required.'},{status:400});
    const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const {data:membership}=await supabase.from('project_members').select('id').eq('project_run_id',projectRunId).eq('user_id',user.id).in('membership_status',['active','completed']).maybeSingle();
    if(!membership)return NextResponse.json({error:'Active project membership is required.'},{status:403});
    if(lastMessageId){const {data:message}=await supabase.from('project_discussions').select('id').eq('id',lastMessageId).eq('project_run_id',projectRunId).maybeSingle();if(!message)return NextResponse.json({error:'Conversation message not found.'},{status:400});}
    const {error}=await supabase.from('project_discussion_reads').upsert({project_run_id:projectRunId,user_id:user.id,last_read_at:new Date().toISOString(),last_read_message_id:lastMessageId},{onConflict:'project_run_id,user_id'});
    if(error)throw error;
    return NextResponse.json({ok:true});
  }catch(error){console.error('conversation read state error',error);return NextResponse.json({error:'Unable to update conversation read state.'},{status:500})}
}
