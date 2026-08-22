import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {createServerSupabaseClient} from '@/lib/supabase/server';

function savedOpportunityDb(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!serviceKey)return null;
  return createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
}

export async function GET(request:Request){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const db=savedOpportunityDb()||supabase;
  const url=new URL(request.url);const opportunityId=url.searchParams.get('opportunity_id');
  if(opportunityId){
    const {data,error}=await db.from('saved_opportunities').select('opportunity_id,saved_at,reminders_enabled').eq('user_id',user.id).eq('opportunity_id',opportunityId).maybeSingle();
    if(error)return NextResponse.json({error:'Unable to check saved status.'},{status:500});
    return NextResponse.json({saved:Boolean(data),saved_at:data?.saved_at||null,reminders_enabled:data?.reminders_enabled??true});
  }
  const {data,error}=await db.from('saved_opportunities').select('opportunity_id,saved_at,reminders_enabled').eq('user_id',user.id).order('saved_at',{ascending:false});
  if(error)return NextResponse.json({error:'Unable to load saved opportunities.'},{status:500});
  return NextResponse.json({items:data||[]});
}

export async function POST(request:Request){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const db=savedOpportunityDb()||supabase;
  const body=await request.json().catch(()=>null);const opportunityId=String(body?.opportunity_id||'').trim();
  if(!opportunityId)return NextResponse.json({error:'Opportunity is required.'},{status:400});
  const {data:opportunity}=await db.from('opportunities').select('id,status,access_level,data_ai_relevance_status,closes_at').eq('id',opportunityId).maybeSingle();
  if(!opportunity||opportunity.status!=='published'||opportunity.access_level!=='public'||opportunity.data_ai_relevance_status!=='high')return NextResponse.json({error:'This opportunity is not available.'},{status:404});
  if(opportunity.closes_at&&new Date(opportunity.closes_at).getTime()<=Date.now())return NextResponse.json({error:'This opportunity has closed.'},{status:409});
  const {error}=await db.from('saved_opportunities').upsert({user_id:user.id,opportunity_id:opportunityId,reminders_enabled:true},{onConflict:'user_id,opportunity_id',ignoreDuplicates:true});
  if(error)return NextResponse.json({error:'Unable to save opportunity.'},{status:500});
  return NextResponse.json({saved:true,reminders_enabled:true,message:'Saved to My Saved Opportunities. Deadline reminders are on.'});
}

export async function PATCH(request:Request){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const db=savedOpportunityDb()||supabase;
  const body=await request.json().catch(()=>null);const opportunityId=String(body?.opportunity_id||'').trim();
  if(!opportunityId||typeof body?.reminders_enabled!=='boolean')return NextResponse.json({error:'Opportunity and reminder preference are required.'},{status:400});
  const {data,error}=await db.from('saved_opportunities').update({reminders_enabled:body.reminders_enabled}).eq('user_id',user.id).eq('opportunity_id',opportunityId).select('opportunity_id,reminders_enabled').maybeSingle();
  if(error)return NextResponse.json({error:'Unable to update reminder preference.'},{status:500});
  if(!data)return NextResponse.json({error:'Save this opportunity before changing reminders.'},{status:404});
  return NextResponse.json({saved:true,reminders_enabled:data.reminders_enabled,message:data.reminders_enabled?'Deadline reminder enabled.':'Deadline reminder disabled.'});
}

export async function DELETE(request:Request){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const db=savedOpportunityDb()||supabase;
  const body=await request.json().catch(()=>null);const opportunityId=String(body?.opportunity_id||'').trim();
  if(!opportunityId)return NextResponse.json({error:'Opportunity is required.'},{status:400});
  const {error}=await db.from('saved_opportunities').delete().eq('user_id',user.id).eq('opportunity_id',opportunityId);
  if(error)return NextResponse.json({error:'Unable to remove saved opportunity.'},{status:500});
  return NextResponse.json({saved:false,message:'Removed from My Saved Opportunities.'});
}
