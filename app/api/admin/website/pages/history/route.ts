import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {recordAdminAudit} from '@/lib/admin-audit';
import {isWebsitePageKey,validateWebsitePagePayload} from '@/lib/website-pages';

export const dynamic='force-dynamic';

async function adminContext(page:unknown){
 if(!isWebsitePageKey(page))return{error:NextResponse.json({error:'Valid Website page is required.'},{status:400})};
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
 if(!hasAdminCapability(user,'website.content.edit'))return{error:NextResponse.json({error:'Website content capability required.'},{status:403})};
 const db=serviceDb();if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
 return{page,db,user};
}

function boundedInt(value:string|null,fallback:number,min:number,max:number){const parsed=Number(value);return Number.isInteger(parsed)?Math.min(max,Math.max(min,parsed)):fallback}

export async function GET(request:Request){
 try{
  const url=new URL(request.url);const page=url.searchParams.get('page');const ctx=await adminContext(page);if('error'in ctx)return ctx.error;
  const pageNumber=boundedInt(url.searchParams.get('page_number'),1,1,100000);const pageSize=boundedInt(url.searchParams.get('page_size'),25,1,100);const from=(pageNumber-1)*pageSize;const to=from+pageSize-1;
  const {data,error,count}=await ctx.db.from('website_page_revisions').select('id,page_key,revision_number,payload,source,restored_from_revision_id,created_at,created_by',{count:'exact'}).eq('page_key',ctx.page).order('revision_number',{ascending:false}).range(from,to);
  if(error)throw error;
  const actorIds=[...new Set((data||[]).map(row=>row.created_by).filter(Boolean))] as string[];
  const names=new Map<string,string>();
  if(actorIds.length){const {data:profiles}=await ctx.db.from('profiles').select('id,full_name').in('id',actorIds);for(const profile of profiles||[])if(profile.full_name)names.set(profile.id,profile.full_name)}
  const items=(data||[]).map(row=>{const validated=validateWebsitePagePayload(ctx.page,row.payload);return{...row,payload:validated.ok?validated.payload:null,valid:validated.ok,actor_name:row.created_by?(names.get(row.created_by)||'Admin user'):'System baseline'}});
  const total=count||0;return NextResponse.json({items,page:pageNumber,page_size:pageSize,total,pages:Math.max(1,Math.ceil(total/pageSize))});
 }catch(error){console.error('website page revision history load failed',error);return NextResponse.json({error:'Unable to load Website page history.'},{status:500});}
}

export async function POST(request:Request){
 try{
  const body=await request.json();const ctx=await adminContext(body.page);if('error'in ctx)return ctx.error;
  if(body.action!=='restore_draft')return NextResponse.json({error:'Unsupported revision action.'},{status:400});
  const revisionId=Number(body.revision_id);if(!Number.isInteger(revisionId)||revisionId<=0)return NextResponse.json({error:'Valid revision is required.'},{status:400});
  const {data:revision,error:revisionError}=await ctx.db.from('website_page_revisions').select('id,page_key,revision_number,payload').eq('id',revisionId).eq('page_key',ctx.page).maybeSingle();
  if(revisionError)throw revisionError;if(!revision)return NextResponse.json({error:'Revision not found for this page.'},{status:404});
  const validated=validateWebsitePagePayload(ctx.page,revision.payload);if(!validated.ok)return NextResponse.json({error:'This revision is not valid for the current page schema.'},{status:409});
  const {data:before}=await ctx.db.from('website_page_drafts').select('payload').eq('page_key',ctx.page).maybeSingle();const updatedAt=new Date().toISOString();
  const {data,error}=await ctx.db.from('website_page_drafts').upsert({page_key:ctx.page,payload:validated.payload,updated_at:updatedAt,updated_by:ctx.user.id,restored_from_revision_id:revision.id},{onConflict:'page_key'}).select('page_key,payload,updated_at,updated_by,restored_from_revision_id').single();
  if(error)throw error;
  const audit=await recordAdminAudit({actorUserId:ctx.user.id,actorEmail:ctx.user.email,capability:'website.content.edit',action:'website.page.revision.restored_to_draft',resourceType:'website.page',resourceId:ctx.page,beforeState:before?.payload||null,afterState:validated.payload,metadata:{page:ctx.page,revision_id:revision.id,revision_number:revision.revision_number}});
  return NextResponse.json({ok:true,item:data,restored_revision:{id:revision.id,number:revision.revision_number},audit_recorded:audit.ok});
 }catch(error){console.error('website page revision restore failed',error);return NextResponse.json({error:'Unable to restore this revision to draft.'},{status:500});}
}
