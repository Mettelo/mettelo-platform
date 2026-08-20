import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {recordAdminAudit} from '@/lib/admin-audit';
import {defaultWebsiteSeo,isWebsiteSeoScope,validateWebsiteSeo} from '@/lib/website-seo';

export const dynamic='force-dynamic';

async function context(scope:unknown,mode:'read'|'edit'|'publish'){
 if(!isWebsiteSeoScope(scope))return{error:NextResponse.json({error:'Valid Website SEO scope is required.'},{status:400})};
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
 if(!hasAdminCapability(user,'website.content.edit'))return{error:NextResponse.json({error:'Website content capability required.'},{status:403})};
 if(mode==='publish'&&!hasAdminCapability(user,'website.content.publish'))return{error:NextResponse.json({error:'Website publishing capability required.'},{status:403})};
 const db=serviceDb();if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
 return{scope,db,user};
}

export async function GET(request:Request){
 const scope=new URL(request.url).searchParams.get('scope');const ctx=await context(scope,'read');if('error'in ctx)return ctx.error;
 const [{data:draft,error:draftError},{data:published,error:publishedError}]=await Promise.all([
  ctx.db.from('website_seo_drafts').select('scope,payload,updated_at,updated_by').eq('scope',ctx.scope).maybeSingle(),
  ctx.db.from('website_seo_public').select('scope,payload,published_at,published_by').eq('scope',ctx.scope).maybeSingle()
 ]);
 if(draftError||publishedError)return NextResponse.json({error:'Unable to load Website SEO settings.'},{status:500});
 const fallback=defaultWebsiteSeo(ctx.scope);const safeDraft=draft?validateWebsiteSeo(ctx.scope,draft.payload):null;const safePublished=published?validateWebsiteSeo(ctx.scope,published.payload):null;
 return NextResponse.json({scope:ctx.scope,draft:draft&&safeDraft?.ok?{...draft,payload:safeDraft.payload}:{scope:ctx.scope,payload:fallback,updated_at:null,updated_by:null},published:published&&safePublished?.ok?{...published,payload:safePublished.payload}:{scope:ctx.scope,payload:fallback,published_at:null,published_by:null}});
}

export async function PATCH(request:Request){
 try{
  const body=await request.json();const ctx=await context(body.scope,'edit');if('error'in ctx)return ctx.error;
  const validated=validateWebsiteSeo(ctx.scope,body.payload);if(!validated.ok)return NextResponse.json({error:validated.error},{status:400});
  const {data:before}=await ctx.db.from('website_seo_drafts').select('payload').eq('scope',ctx.scope).maybeSingle();const updatedAt=new Date().toISOString();
  const {data,error}=await ctx.db.from('website_seo_drafts').upsert({scope:ctx.scope,payload:validated.payload,updated_at:updatedAt,updated_by:ctx.user.id},{onConflict:'scope'}).select('scope,payload,updated_at,updated_by').single();if(error)throw error;
  const audit=await recordAdminAudit({actorUserId:ctx.user.id,actorEmail:ctx.user.email,capability:'website.content.edit',action:'website.seo.draft.updated',resourceType:'website.seo',resourceId:ctx.scope,beforeState:before?.payload||null,afterState:validated.payload,metadata:{scope:ctx.scope}});
  return NextResponse.json({ok:true,item:data,audit_recorded:audit.ok});
 }catch(error){console.error('website seo draft update failed',error);return NextResponse.json({error:'Unable to save Website SEO draft.'},{status:500});}
}

export async function POST(request:Request){
 try{
  const body=await request.json();const ctx=await context(body.scope,'publish');if('error'in ctx)return ctx.error;if(body.action!=='publish')return NextResponse.json({error:'Unsupported Website SEO action.'},{status:400});
  const [{data:draft,error:draftError},{data:before}]=await Promise.all([ctx.db.from('website_seo_drafts').select('payload').eq('scope',ctx.scope).maybeSingle(),ctx.db.from('website_seo_public').select('payload').eq('scope',ctx.scope).maybeSingle()]);
  if(draftError)throw draftError;if(!draft)return NextResponse.json({error:'Save a valid SEO draft before publishing.'},{status:409});const validated=validateWebsiteSeo(ctx.scope,draft.payload);if(!validated.ok)return NextResponse.json({error:validated.error},{status:400});
  const publishedAt=new Date().toISOString();const {data,error}=await ctx.db.from('website_seo_public').upsert({scope:ctx.scope,payload:validated.payload,published_at:publishedAt,published_by:ctx.user.id},{onConflict:'scope'}).select('scope,payload,published_at,published_by').single();if(error)throw error;
  const audit=await recordAdminAudit({actorUserId:ctx.user.id,actorEmail:ctx.user.email,capability:'website.content.publish',action:'website.seo.published',resourceType:'website.seo',resourceId:ctx.scope,beforeState:before?.payload||null,afterState:validated.payload,metadata:{scope:ctx.scope}});
  return NextResponse.json({ok:true,item:data,audit_recorded:audit.ok});
 }catch(error){console.error('website seo publish failed',error);return NextResponse.json({error:'Unable to publish Website SEO settings.'},{status:500});}
}
