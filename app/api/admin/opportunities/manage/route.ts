import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});if(user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return NextResponse.json({error:'Admin data service is not configured.'},{status:503});
    const body=await request.json();const id=String(body.id||'');const action=String(body.action||'');const note=String(body.note||'').trim().slice(0,800);if(!id||action!=='remove')return NextResponse.json({error:'Invalid opportunity action.'},{status:400});
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const now=new Date().toISOString();
    const {data:item,error:loadError}=await db.from('opportunities').select('id,title,status').eq('id',id).single();if(loadError||!item)return NextResponse.json({error:'Opportunity not found.'},{status:404});
    const {error}=await db.from('opportunities').update({status:'draft',review_required:false,verification_status:'rejected',rejection_reason:note||'Removed from the public opportunity feed by Mettelo admin.',updated_at:now}).eq('id',id);if(error)throw error;
    await db.from('opportunity_verification_checks').insert({opportunity_id:id,check_type:'human_review',result:'fail',detail:note||'Removed from public feed by Mettelo admin.',checked_by:user.email||user.id});
    return NextResponse.json({ok:true,id});
  }catch(error){console.error('opportunity manage error',error);return NextResponse.json({error:'Unable to update opportunity.'},{status:500});}
}
