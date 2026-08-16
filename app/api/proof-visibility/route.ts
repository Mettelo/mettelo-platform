import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

const allowed=new Set(['public','mettelo_only','private']);

export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();
    const {data:{user}}=await auth.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Proof service is unavailable.'},{status:503});
    const body=await request.json().catch(()=>({}));
    const id=String(body.id||'');const visibility=String(body.visibility||'');
    if(!id||!allowed.has(visibility))return NextResponse.json({error:'Choose Public, Mettelo only or Private.'},{status:400});
    const {data:existing}=await db.from('contributions').select('id,user_id,verification_status').eq('id',id).eq('user_id',user.id).maybeSingle();
    if(!existing)return NextResponse.json({error:'Proof record not found.'},{status:404});
    if(existing.verification_status!=='verified')return NextResponse.json({error:'Visibility can be changed after this contribution is verified.'},{status:409});
    const now=new Date().toISOString();
    const {data,error}=await db.from('contributions').update({visibility,visibility_reviewed_at:now}).eq('id',id).eq('user_id',user.id).select('id,visibility,visibility_reviewed_at').single();
    if(error)throw error;
    const message=visibility==='public'?'This Proof is now public and can be shared by link.':visibility==='mettelo_only'?'This Proof is visible to signed-in Mettelo members only.':'This Proof is private to you and authorised reviewers.';
    return NextResponse.json({ok:true,item:data,message});
  }catch(error){console.error('proof visibility error',error);return NextResponse.json({error:'Unable to update Proof visibility.'},{status:500});}
}
