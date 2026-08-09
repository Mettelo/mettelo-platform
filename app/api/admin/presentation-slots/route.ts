import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function validUrl(value:string){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol);}catch{return false;}}

export async function POST(request:Request){
  try{
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return NextResponse.json({error:'Authentication required.'},{status:401});
    if(user.app_metadata?.role!=='admin') return NextResponse.json({error:'Admin access required.'},{status:403});
    const body=await request.json();
    const startsAt=String(body.starts_at||'');const endsAt=String(body.ends_at||'');const meetingUrl=String(body.meeting_url||'').trim().slice(0,600);const location=String(body.location_label||'').trim().slice(0,180);
    if(!startsAt||!endsAt||new Date(endsAt)<=new Date(startsAt)) return NextResponse.json({error:'Add a valid presentation start and end time.'},{status:400});
    if(meetingUrl&&!validUrl(meetingUrl)) return NextResponse.json({error:'Provide a valid meeting URL.'},{status:400});
    const {data,error}=await supabase.from('presentation_slots').insert({starts_at:startsAt,ends_at:endsAt,meeting_url:meetingUrl||null,location_label:location||null,status:'available',created_by:user.id}).select('id,starts_at,ends_at').single();
    if(error) throw error;
    return NextResponse.json({ok:true,slot:data});
  }catch(error){console.error('presentation slot error',error);return NextResponse.json({error:'Unable to create this presentation slot.'},{status:500});}
}
