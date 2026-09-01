import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {getMemberCapabilityPathOverview,getMemberCapabilityPathProgress} from '@/lib/member-capability-paths';

const text=(value:unknown)=>String(value??'').trim();

export async function GET(request:Request){
  const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const mode=new URL(request.url).searchParams.get('mode');
  if(mode==='overview')return NextResponse.json({overview:await getMemberCapabilityPathOverview(db,user.id)});
  return NextResponse.json({items:await getMemberCapabilityPathProgress(db,user.id)});
}

export async function POST(request:Request){
  const db=await createServerSupabaseClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  try{
    const body=await request.json() as Record<string,unknown>;const action=text(body.action),pathId=text(body.path_id);if(!pathId)return NextResponse.json({error:'Capability Path is required.'},{status:400});
    if(action==='follow'){
      const {data:path,error:pathError}=await db.from('capability_paths').select('id,status').eq('id',pathId).eq('status','published').maybeSingle();if(pathError)throw pathError;if(!path)return NextResponse.json({error:'Only published Capability Paths can be followed.'},{status:409});
      const [{data:existing,error:existingError},{count:primaryCount,error:primaryError}]=await Promise.all([
        db.from('member_capability_paths').select('path_id,is_primary').eq('user_id',user.id).eq('path_id',pathId).maybeSingle(),
        db.from('member_capability_paths').select('path_id',{count:'exact',head:true}).eq('user_id',user.id).eq('is_primary',true)
      ]);if(existingError)throw existingError;if(primaryError)throw primaryError;
      if(existing){const {error}=await db.from('member_capability_paths').update({status:'following',paused_at:null,updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('path_id',pathId);if(error)throw error;}
      else{const {error}=await db.from('member_capability_paths').insert({user_id:user.id,path_id:pathId,status:'following',is_primary:(primaryCount??0)===0});if(error)throw error;}
    }else if(action==='set_primary'){
      const {error}=await db.rpc('set_my_primary_capability_path',{target_path:pathId});if(error)throw error;
    }else if(action==='pause'){
      const {error}=await db.from('member_capability_paths').update({status:'paused',paused_at:new Date().toISOString(),is_primary:false,updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('path_id',pathId).in('status',['following','paused']);if(error)throw error;
    }else if(action==='resume'){
      const {data:path,error:pathError}=await db.from('capability_paths').select('id').eq('id',pathId).eq('status','published').maybeSingle();if(pathError)throw pathError;if(!path)return NextResponse.json({error:'Archived or draft Paths cannot be resumed.'},{status:409});const {error}=await db.from('member_capability_paths').update({status:'following',paused_at:null,updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('path_id',pathId);if(error)throw error;
    }else if(action==='unfollow'){
      const {error}=await db.from('member_capability_paths').delete().eq('user_id',user.id).eq('path_id',pathId).in('status',['following','paused']);if(error)throw error;
    }else return NextResponse.json({error:'Unknown Capability Path action.'},{status:400});
    return NextResponse.json({ok:true,items:await getMemberCapabilityPathProgress(db,user.id)});
  }catch(error){console.error(error);return NextResponse.json({error:error instanceof Error?error.message:'Unable to update Capability Path.'},{status:500});}
}
