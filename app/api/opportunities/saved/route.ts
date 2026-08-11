import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export async function GET(request:Request){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const url=new URL(request.url);const opportunityId=url.searchParams.get('opportunity_id');
  if(opportunityId){
    const {data,error}=await supabase.from('saved_opportunities').select('opportunity_id,saved_at').eq('user_id',user.id).eq('opportunity_id',opportunityId).maybeSingle();
    if(error)return NextResponse.json({error:'Unable to check saved status.'},{status:500});
    return NextResponse.json({saved:Boolean(data),saved_at:data?.saved_at||null});
  }
  const {data,error}=await supabase.from('saved_opportunities').select('opportunity_id,saved_at').eq('user_id',user.id).order('saved_at',{ascending:false});
  if(error)return NextResponse.json({error:'Unable to load saved opportunities.'},{status:500});
  return NextResponse.json({items:data||[]});
}

export async function POST(request:Request){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const body=await request.json().catch(()=>null);const opportunityId=String(body?.opportunity_id||'').trim();
  if(!opportunityId)return NextResponse.json({error:'Opportunity is required.'},{status:400});
  const {data:opportunity}=await supabase.from('opportunities').select('id,status,access_level,data_ai_relevance_status,closes_at').eq('id',opportunityId).maybeSingle();
  if(!opportunity||opportunity.status!=='published'||opportunity.access_level!=='public'||opportunity.data_ai_relevance_status!=='high')return NextResponse.json({error:'This opportunity is not available.'},{status:404});
  if(opportunity.closes_at&&new Date(opportunity.closes_at).getTime()<=Date.now())return NextResponse.json({error:'This opportunity has closed.'},{status:409});
  const {error}=await supabase.from('saved_opportunities').upsert({user_id:user.id,opportunity_id:opportunityId},{onConflict:'user_id,opportunity_id'});
  if(error)return NextResponse.json({error:'Unable to save opportunity.'},{status:500});
  return NextResponse.json({saved:true});
}

export async function DELETE(request:Request){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const body=await request.json().catch(()=>null);const opportunityId=String(body?.opportunity_id||'').trim();
  if(!opportunityId)return NextResponse.json({error:'Opportunity is required.'},{status:400});
  const {error}=await supabase.from('saved_opportunities').delete().eq('user_id',user.id).eq('opportunity_id',opportunityId);
  if(error)return NextResponse.json({error:'Unable to remove saved opportunity.'},{status:500});
  return NextResponse.json({saved:false});
}
