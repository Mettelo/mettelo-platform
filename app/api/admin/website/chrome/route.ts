import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability,type AdminCapability} from '@/lib/admin-capabilities';
import {recordAdminAudit} from '@/lib/admin-audit';
import {validateWebsiteChromePayload,type WebsiteChromeScope} from '@/lib/website-chrome';

export const dynamic='force-dynamic';
const SCOPES=['navigation','footer','branding'] as const;
function validScope(value:unknown):value is WebsiteChromeScope{return typeof value==='string'&&(SCOPES as readonly string[]).includes(value)}
function editCapability(scope:WebsiteChromeScope):AdminCapability{return scope==='navigation'?'website.navigation.manage':'website.content.edit'}

async function authContext(scope:WebsiteChromeScope,mode:'read'|'edit'|'publish'){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
 const edit=editCapability(scope);
 if(!hasAdminCapability(user,edit))return{error:NextResponse.json({error:'Website Admin capability required.'},{status:403})};
 if(mode==='publish'&&!hasAdminCapability(user,'website.content.publish'))return{error:NextResponse.json({error:'Website publishing capability required.'},{status:403})};
 const db=serviceDb();if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
 return{db,user,capability:mode==='publish'?'website.content.publish' as const:edit};
}

export async function GET(request:Request){
 const scope=new URL(request.url).searchParams.get('scope');if(!validScope(scope))return NextResponse.json({error:'Valid website chrome scope is required.'},{status:400});
 const ctx=await authContext(scope,'read');if('error'in ctx)return ctx.error;
 const [{data:draft,error:draftError},{data:published,error:publishedError}]=await Promise.all([
  ctx.db.from('website_chrome_drafts').select('scope,payload,updated_at,updated_by').eq('scope',scope).maybeSingle(),
  ctx.db.from('website_chrome_public').select('scope,payload,published_at,published_by').eq('scope',scope).maybeSingle()
 ]);
 if(draftError||publishedError)return NextResponse.json({error:'Unable to load website configuration.'},{status:500});
 return NextResponse.json({scope,draft,published});
}

export async function PATCH(request:Request){
 try{
  const body=await request.json();const scope=body.scope;if(!validScope(scope))return NextResponse.json({error:'Valid website chrome scope is required.'},{status:400});
  const ctx=await authContext(scope,'edit');if('error'in ctx)return ctx.error;
  const validated=validateWebsiteChromePayload(scope,body.payload);if(!validated.ok)return NextResponse.json({error:validated.error},{status:400});
  const {data:before}=await ctx.db.from('website_chrome_drafts').select('payload').eq('scope',scope).maybeSingle();
  const updatedAt=new Date().toISOString();
  const {data,error}=await ctx.db.from('website_chrome_drafts').upsert({scope,payload:validated.payload,updated_at:updatedAt,updated_by:ctx.user.id},{onConflict:'scope'}).select('scope,payload,updated_at,updated_by').single();
  if(error)throw error;
  const audit=await recordAdminAudit({actorUserId:ctx.user.id,actorEmail:ctx.user.email,capability:ctx.capability,action:'website.chrome.draft.updated',resourceType:'website.chrome',resourceId:scope,beforeState:before?.payload||null,afterState:validated.payload,metadata:{scope}});
  return NextResponse.json({ok:true,item:data,audit_recorded:audit.ok});
 }catch(error){console.error('website chrome draft update failed',error);return NextResponse.json({error:'Unable to save website draft.'},{status:500});}
}

export async function POST(request:Request){
 try{
  const body=await request.json();const scope=body.scope;if(!validScope(scope))return NextResponse.json({error:'Valid website chrome scope is required.'},{status:400});
  if(body.action!=='publish')return NextResponse.json({error:'Unsupported website chrome action.'},{status:400});
  const ctx=await authContext(scope,'publish');if('error'in ctx)return ctx.error;
  const [{data:draft,error:draftError},{data:before}]=await Promise.all([
   ctx.db.from('website_chrome_drafts').select('payload').eq('scope',scope).maybeSingle(),
   ctx.db.from('website_chrome_public').select('payload').eq('scope',scope).maybeSingle()
  ]);
  if(draftError)throw draftError;if(!draft)return NextResponse.json({error:'Save a valid draft before publishing.'},{status:409});
  const validated=validateWebsiteChromePayload(scope,draft.payload);if(!validated.ok)return NextResponse.json({error:validated.error},{status:400});
  const publishedAt=new Date().toISOString();
  const {data,error}=await ctx.db.from('website_chrome_public').upsert({scope,payload:validated.payload,published_at:publishedAt,published_by:ctx.user.id},{onConflict:'scope'}).select('scope,payload,published_at,published_by').single();
  if(error)throw error;
  const audit=await recordAdminAudit({actorUserId:ctx.user.id,actorEmail:ctx.user.email,capability:'website.content.publish',action:'website.chrome.published',resourceType:'website.chrome',resourceId:scope,beforeState:before?.payload||null,afterState:validated.payload,metadata:{scope}});
  return NextResponse.json({ok:true,item:data,audit_recorded:audit.ok});
 }catch(error){console.error('website chrome publish failed',error);return NextResponse.json({error:'Unable to publish website configuration.'},{status:500});}
}
