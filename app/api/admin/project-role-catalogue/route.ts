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
function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)}
function safeRoleState(role:{title?:unknown;description?:unknown;active?:unknown;sort_order?:unknown;slug?:unknown}|null|undefined){return role?{title:String(role.title||''),description:role.description?String(role.description):null,active:Boolean(role.active),sort_order:Number(role.sort_order)||0,slug:String(role.slug||'')}:null}

export async function GET(){
 const ctx=await context();if('error'in ctx)return ctx.error;
 const {data,error}=await ctx.db.from('project_role_catalogue').select('*').order('sort_order').order('title');if(error)return NextResponse.json({error:'Unable to load project roles.'},{status:500});return NextResponse.json({items:data||[]});
}

export async function POST(request:Request){
 try{
  const ctx=await context();if('error'in ctx)return ctx.error;
  const body=await request.json();const title=String(body.title||'').trim().slice(0,120);if(!title)return NextResponse.json({error:'Role title is required.'},{status:400});const slug=slugify(String(body.slug||title));if(!slug)return NextResponse.json({error:'Role title must contain letters or numbers.'},{status:400});
  const {data,error}=await ctx.db.from('project_role_catalogue').insert({title,slug,description:String(body.description||'').trim().slice(0,800)||null,active:body.active!==false,sort_order:Number(body.sort_order)||0,updated_by:ctx.user.id}).select('*').single();if(error)throw error;
  const audit=await recordAdminAudit({actorUserId:ctx.user.id,actorEmail:ctx.user.email,capability:'platform.settings.manage',action:'platform.project_role.created',resourceType:'platform.project_role',resourceId:data.id,beforeState:null,afterState:safeRoleState(data),metadata:{source:'platform_settings'}});
  return NextResponse.json({ok:true,item:data,audit_recorded:audit.ok});
 }catch(error){console.error('project role catalogue create error',error);return NextResponse.json({error:'Unable to create project role.'},{status:500})}
}

export async function PATCH(request:Request){
 try{
  const ctx=await context();if('error'in ctx)return ctx.error;
  const body=await request.json();const id=String(body.id||'').trim();if(!id)return NextResponse.json({error:'Role is required.'},{status:400});
  const {data:before,error:readError}=await ctx.db.from('project_role_catalogue').select('id,title,slug,description,active,sort_order').eq('id',id).maybeSingle();if(readError)throw readError;if(!before)return NextResponse.json({error:'Role not found.'},{status:404});
  const patch:Record<string,unknown>={updated_at:new Date().toISOString(),updated_by:ctx.user.id};if('title'in body){const title=String(body.title||'').trim().slice(0,120);if(!title)return NextResponse.json({error:'Role title is required.'},{status:400});const slug=slugify(String(body.slug||title));if(!slug)return NextResponse.json({error:'Role title must contain letters or numbers.'},{status:400});patch.title=title;patch.slug=slug}if('description'in body)patch.description=String(body.description||'').trim().slice(0,800)||null;if('active'in body)patch.active=Boolean(body.active);if('sort_order'in body)patch.sort_order=Number(body.sort_order)||0;
  const {data,error}=await ctx.db.from('project_role_catalogue').update(patch).eq('id',id).select('*').single();if(error)throw error;
  const audit=await recordAdminAudit({actorUserId:ctx.user.id,actorEmail:ctx.user.email,capability:'platform.settings.manage',action:'platform.project_role.updated',resourceType:'platform.project_role',resourceId:id,beforeState:safeRoleState(before),afterState:safeRoleState(data),metadata:{source:'platform_settings'}});
  return NextResponse.json({ok:true,item:data,audit_recorded:audit.ok});
 }catch(error){console.error('project role catalogue update error',error);return NextResponse.json({error:'Unable to update project role.'},{status:500})}
}
