import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';

export const dynamic='force-dynamic';

function clean(value:string|null,max=180){return String(value||'').trim().slice(0,max)}

export async function GET(request:Request){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  if(!hasAdminCapability(user,'system.audit.read'))return NextResponse.json({error:'Admin audit access required.'},{status:403});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Admin data service is not configured.'},{status:503});
  const url=new URL(request.url);const limit=Math.max(1,Math.min(100,Number(url.searchParams.get('limit'))||50));
  const actor=clean(url.searchParams.get('actor'));const action=clean(url.searchParams.get('action'),120);const resourceType=clean(url.searchParams.get('resource_type'),120);const result=clean(url.searchParams.get('result'),20);
  let query=db.from('admin_audit_log').select('id,actor_user_id,actor_email,capability,action,resource_type,resource_id,result,reason,before_state,after_state,metadata,created_at').order('created_at',{ascending:false}).limit(limit);
  if(actor)query=query.eq('actor_user_id',actor);
  if(action)query=query.eq('action',action);
  if(resourceType)query=query.eq('resource_type',resourceType);
  if(result&&['success','failure','denied'].includes(result))query=query.eq('result',result);
  const {data,error}=await query;
  if(error){console.error('admin audit read failed',error);return NextResponse.json({error:'Unable to load Admin audit history.'},{status:500});}
  return NextResponse.json({items:data||[]});
}
