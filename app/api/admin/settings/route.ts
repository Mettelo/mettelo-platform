import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {recordAdminAudit} from '@/lib/admin-audit';

async function context(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
 if(!hasAdminCapability(user,'platform.settings.manage'))return{error:NextResponse.json({error:'Platform settings capability required.'},{status:403})};
 const db=serviceDb();if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
 return{db,user};
}
function validValue(type:string,value:string){if(!value)return true;if(type==='email')return /^\S+@\S+\.\S+$/.test(value);if(type==='url'){try{const url=new URL(value);return url.protocol==='https:'}catch{return false}}return true}

export async function GET(){const ctx=await context();if('error'in ctx)return ctx.error;const [{data:settings,error},{data:roles}]=await Promise.all([ctx.db.from('platform_settings').select('*').order('sort_order').order('label'),ctx.db.from('project_role_catalogue').select('*').order('sort_order').order('title')]);if(error)return NextResponse.json({error:'Unable to load platform settings.'},{status:500});return NextResponse.json({settings:settings||[],roles:roles||[]})}

export async function PATCH(request:Request){
 try{
  const ctx=await context();if('error'in ctx)return ctx.error;
  const body=await request.json();const key=String(body.setting_key||'').trim();const value=String(body.value??'').trim().slice(0,1000)||null;
  if(!key)return NextResponse.json({error:'Setting is required.'},{status:400});
  const {data:current}=await ctx.db.from('platform_settings').select('setting_key,label,value,value_type,public_read').eq('setting_key',key).maybeSingle();
  if(!current)return NextResponse.json({error:'Setting not found.'},{status:404});
  if(!validValue(current.value_type,value||''))return NextResponse.json({error:current.value_type==='email'?'Enter a valid email address.':'Enter a secure https:// URL.'},{status:400});
  const updatedAt=new Date().toISOString();const {data,error}=await ctx.db.from('platform_settings').update({value,updated_at:updatedAt,updated_by:ctx.user.id}).eq('setting_key',key).select('*').single();if(error)throw error;
  const audit=await recordAdminAudit({actorUserId:ctx.user.id,actorEmail:ctx.user.email,capability:'platform.settings.manage',action:'platform.setting.updated',resourceType:'platform.setting',resourceId:key,beforeState:{value:current.value},afterState:{value},metadata:{label:current.label,public_read:current.public_read}});
  return NextResponse.json({ok:true,item:data,audit_recorded:audit.ok});
 }catch(error){console.error('platform setting update error',error);return NextResponse.json({error:'Unable to update platform setting.'},{status:500});}
}
