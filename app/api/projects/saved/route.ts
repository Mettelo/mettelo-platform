import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export async function GET(request:Request){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const url=new URL(request.url);const projectId=url.searchParams.get('project_id');
  if(projectId){
    const {data,error}=await supabase.from('saved_projects').select('project_id,saved_at').eq('user_id',user.id).eq('project_id',projectId).maybeSingle();
    if(error)return NextResponse.json({error:'Unable to check saved project status.'},{status:500});
    return NextResponse.json({saved:Boolean(data),saved_at:data?.saved_at||null});
  }
  const {data,error}=await supabase.from('saved_projects').select('project_id,saved_at').eq('user_id',user.id).order('saved_at',{ascending:false});
  if(error)return NextResponse.json({error:'Unable to load saved projects.'},{status:500});
  return NextResponse.json({items:data||[]});
}

export async function POST(request:Request){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const body=await request.json().catch(()=>null);const projectId=String(body?.project_id||'').trim();
  if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});
  const {data:project,error:projectError}=await supabase.from('projects').select('id,visibility,status').eq('id',projectId).maybeSingle();
  if(projectError||!project||!['public','members'].includes(project.visibility)||['draft','archived','cancelled'].includes(project.status))return NextResponse.json({error:'This project is not available to save.'},{status:404});
  const {error}=await supabase.from('saved_projects').upsert({user_id:user.id,project_id:projectId},{onConflict:'user_id,project_id',ignoreDuplicates:true});
  if(error)return NextResponse.json({error:'Unable to save project.'},{status:500});
  return NextResponse.json({saved:true,message:'Project saved.'});
}

export async function DELETE(request:Request){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const body=await request.json().catch(()=>null);const projectId=String(body?.project_id||'').trim();
  if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});
  const {error}=await supabase.from('saved_projects').delete().eq('user_id',user.id).eq('project_id',projectId);
  if(error)return NextResponse.json({error:'Unable to remove saved project.'},{status:500});
  return NextResponse.json({saved:false,message:'Project removed from saved projects.'});
}
