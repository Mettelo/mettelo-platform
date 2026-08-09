import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});if(user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return NextResponse.json({error:'Admin data service is not configured.'},{status:503});
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const body=await request.json();const id=String(body.id||'');const action=String(body.action||'');const note=String(body.note||'').trim().slice(0,1200);if(!id||!['approve','reject','recheck'].includes(action))return NextResponse.json({error:'Invalid review action.'},{status:400});
    const {data:item,error:loadError}=await db.from('opportunities').select('id,title,organisation,source_url,official_application_url,closes_at').eq('id',id).single();if(loadError||!item)return NextResponse.json({error:'Opportunity not found.'},{status:404});
    if(action==='approve'){
      if(!item.organisation)return NextResponse.json({error:'Employer must be identified before publication.'},{status:409});if(!item.official_application_url&&!item.source_url)return NextResponse.json({error:'A traceable source or official application URL is required.'},{status:409});if(item.closes_at&&new Date(item.closes_at)<=new Date())return NextResponse.json({error:'This opportunity is already closed.'},{status:409});
      const now=new Date().toISOString();const {error}=await db.from('opportunities').update({status:'published',publication_mode:'manual',verification_status:'verified',review_required:false,last_verified_at:now,published_at:now,rejection_reason:null,verification_reasons:note?[`Admin approval: ${note}`]:['Admin approved after review'],updated_at:now}).eq('id',id);if(error)throw error;
      await db.from('opportunity_verification_checks').insert({opportunity_id:id,check_type:'human_review',result:'pass',score:100,detail:note||'Approved by Mettelo admin.',checked_by:user.email||user.id});
    } else if(action==='reject'){
      const {error}=await db.from('opportunities').update({status:'draft',verification_status:'rejected',review_required:false,rejection_reason:note||'Rejected during Mettelo review.',updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;await db.from('opportunity_verification_checks').insert({opportunity_id:id,check_type:'human_review',result:'fail',detail:note||'Rejected by Mettelo admin.',checked_by:user.email||user.id});
    } else {
      const {error}=await db.from('opportunities').update({verification_status:'needs_review',review_required:true,rejection_reason:null,next_verification_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;await db.from('opportunity_verification_checks').insert({opportunity_id:id,check_type:'human_review',result:'warn',detail:note||'Admin requested re-verification.',checked_by:user.email||user.id});
    }
    return NextResponse.json({ok:true});
  }catch(error){console.error('opportunity review error',error);return NextResponse.json({error:'Unable to update opportunity review.'},{status:500});}
}
