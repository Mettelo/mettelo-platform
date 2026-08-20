import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {recordAdminAudit} from '@/lib/admin-audit';
import {defaultWebsitePagePayload,isWebsitePageKey,validateWebsitePagePayload} from '@/lib/website-pages';

export const dynamic='force-dynamic';

async function context(page:unknown,mode:'read'|'edit'|'publish'){
 if(!isWebsitePageKey(page))return{error:NextResponse.json({error:'Valid Website page is required.'},{status:400})};
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
 if(!hasAdminCapability(user,'website.content.edit'))return{error:NextResponse.json({error:'Website content capability required.'},{status:403})};
 if(mode==='publish'&&!hasAdminCapability(user,'website.content.publish'))return{error:NextResponse.json({error:'Website publishing capability required.'},{status:403})};
 const db=serviceDb();if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
 return{page,db,user};
}

export async function GET(request:Request){
 const page=new URL(request.url).searchParams.get('page');const ctx=await context(page,'read');if('error'in ctx)return ctx.error;
 const [{data:draft,error:draftError},{data:published,error:publishedError}]=await Promise.all([
  ctx.db.from('website_page_drafts').select('page_key,payload,updated_at,updated_by,restored_from_revision_id').eq('page_key',ctx.page).maybeSingle(),
  ctx.db.from('website_page_public').select('page_key,payload,published_at,published_by').eq('page_key',ctx.page).maybeSingle()
 ]);
 if(draftError||publishedError)return NextResponse.json({error:'Unable to load Website page content.'},{status:500});
 const fallback=defaultWebsitePagePayload(ctx.page);
 const safeDraft=draft?validateWebsitePagePayload(ctx.page,draft.payload):null;
 const safePublished=published?validateWebsitePagePayload(ctx.page,published.payload):null;
 return NextResponse.json({page:ctx.page,draft:draft&&safeDraft?.ok?{...draft,payload:safeDraft.payload}:{page_key:ctx.page,payload:fallback,updated_at:null,updated_by:null,restored_from_revision_id:null},published:published&&safePublished?.ok?{...published,payload:safePublished.payload}:{page_key:ctx.page,payload:fallback,published_at:null,published_by:null}});
}

export async function PATCH(request:Request){
 try{
  const body=await request.json();const ctx=await context(body.page,'edit');if('error'in ctx)return ctx.error;
  const validated=validateWebsitePagePayload(ctx.page,body.payload);if(!validated.ok)return NextResponse.json({error:validated.error},{status:400});
  const {data:before}=await ctx.db.from('website_page_drafts').select('payload').eq('page_key',ctx.page).maybeSingle();
  const updatedAt=new Date().toISOString();
  const {data,error}=await ctx.db.from('website_page_drafts').upsert({page_key:ctx.page,payload:validated.payload,updated_at:updatedAt,updated_by:ctx.user.id},{onConflict:'page_key'}).select('page_key,payload,updated_at,updated_by,restored_from_revision_id').single();
  if(error)throw error;
  const audit=await recordAdminAudit({actorUserId:ctx.user.id,actorEmail:ctx.user.email,capability:'website.content.edit',action:'website.page.draft.updated',resourceType:'website.page',resourceId:ctx.page,beforeState:before?.payload||null,afterState:validated.payload,metadata:{page:ctx.page,restored_from_revision_id:data.restored_from_revision_id||null}});
  return NextResponse.json({ok:true,item:data,audit_recorded:audit.ok});
 }catch(error){console.error('website page draft update failed',error);return NextResponse.json({error:'Unable to save Website page draft.'},{status:500});}
}

export async function POST(request:Request){
 try{
  const body=await request.json();const ctx=await context(body.page,'publish');if('error'in ctx)return ctx.error;
  if(body.action!=='publish')return NextResponse.json({error:'Unsupported Website page action.'},{status:400});
  const [{data:draft,error:draftError},{data:before}]=await Promise.all([
   ctx.db.from('website_page_drafts').select('payload,restored_from_revision_id').eq('page_key',ctx.page).maybeSingle(),
   ctx.db.from('website_page_public').select('payload').eq('page_key',ctx.page).maybeSingle()
  ]);
  if(draftError)throw draftError;if(!draft)return NextResponse.json({error:'Save a valid draft before publishing.'},{status:409});
  const validated=validateWebsitePagePayload(ctx.page,draft.payload);if(!validated.ok)return NextResponse.json({error:validated.error},{status:400});
  const {data:revision,error}=await ctx.db.rpc('publish_website_page_with_revision',{
   p_page_key:ctx.page,p_payload:validated.payload,p_actor:ctx.user.id,p_restored_from_revision_id:draft.restored_from_revision_id||null
  }).single();
  if(error)throw error;
  const item={page_key:ctx.page,payload:validated.payload,published_at:revision.published_at,published_by:ctx.user.id};
  const audit=await recordAdminAudit({actorUserId:ctx.user.id,actorEmail:ctx.user.email,capability:'website.content.publish',action:'website.page.published',resourceType:'website.page',resourceId:ctx.page,beforeState:before?.payload||null,afterState:validated.payload,metadata:{page:ctx.page,revision_id:revision.revision_id,revision_number:revision.revision_number,restored_from_revision_id:draft.restored_from_revision_id||null}});
  return NextResponse.json({ok:true,item,revision:{id:revision.revision_id,number:revision.revision_number},audit_recorded:audit.ok});
 }catch(error){console.error('website page publish failed',error);return NextResponse.json({error:'Unable to publish Website page content.'},{status:500});}
}
