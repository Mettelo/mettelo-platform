import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export async function GET(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const {data,error}=await supabase.from('notifications').select('id,type,title,body,action_url,read_at,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20);
  if(error)return NextResponse.json({error:'Unable to load notifications.'},{status:500});
  return NextResponse.json({items:data||[],unread:(data||[]).filter(item=>!item.read_at).length});
}

export async function PATCH(request:Request){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const body=await request.json();const id=String(body.id||'');
  const query=supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id);
  const {error}=id?await query.eq('id',id):await query.is('read_at',null);
  if(error)return NextResponse.json({error:'Unable to update notifications.'},{status:500});
  return NextResponse.json({ok:true});
}
