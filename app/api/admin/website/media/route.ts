import {randomUUID} from 'node:crypto';
import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {recordAdminAudit} from '@/lib/admin-audit';

export const dynamic='force-dynamic';
const BUCKET='website-media';
const MAX_FILE_SIZE=8*1024*1024;
const MIME_EXTENSIONS:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
type MediaStatus='active'|'archived';

async function context(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
 if(!hasAdminCapability(user,'website.content.edit'))return{error:NextResponse.json({error:'Website content capability required.'},{status:403})};
 const db=serviceDb();if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
 return{db,user};
}
function cleanText(value:unknown,max:number){return String(value??'').trim().slice(0,max)}
function cleanSearch(value:unknown){return cleanText(value,80).replace(/[^a-zA-Z0-9 .'-]+/g,' ').replace(/\s+/g,' ').trim()}
function mediaMetadata(title:unknown,alt:unknown,decorative:unknown){
 const safeTitle=cleanText(title,160);const isDecorative=decorative===true||decorative==='true';const safeAlt=isDecorative?'':cleanText(alt,300);
 if(!safeTitle)return{ok:false as const,error:'Media title is required.'};
 if(!isDecorative&&!safeAlt)return{ok:false as const,error:'Alt text is required unless the image is explicitly decorative.'};
 return{ok:true as const,title:safeTitle,alt_text:safeAlt,decorative:isDecorative};
}

export async function GET(request:Request){
 const ctx=await context();if('error'in ctx)return ctx.error;
 const params=new URL(request.url).searchParams;const page=Math.max(1,Number.parseInt(params.get('page')||'1',10)||1);const requestedSize=Number.parseInt(params.get('page_size')||'25',10);const pageSize=[25,50,100].includes(requestedSize)?requestedSize:25;
 const status=params.get('status');const mimeType=params.get('mime_type');const sort=params.get('sort')==='oldest'?'oldest':'newest';const search=cleanSearch(params.get('q'));
 if(status&&!['active','archived'].includes(status))return NextResponse.json({error:'Invalid media status filter.'},{status:400});
 if(mimeType&&!Object.keys(MIME_EXTENSIONS).includes(mimeType))return NextResponse.json({error:'Invalid media type filter.'},{status:400});
 let query=ctx.db.from('website_media_assets').select('id,title,alt_text,decorative,original_file_name,storage_path,public_url,mime_type,size_bytes,status,created_by,created_at,updated_by,updated_at',{count:'exact'});
 if(status)query=query.eq('status',status);if(mimeType)query=query.eq('mime_type',mimeType);if(search)query=query.ilike('title',`%${search}%`);
 const start=(page-1)*pageSize;query=query.order('created_at',{ascending:sort==='oldest'}).range(start,start+pageSize-1);
 const {data,error,count}=await query;if(error)return NextResponse.json({error:'Unable to load Website media.'},{status:500});
 const total=count||0;const pages=Math.max(1,Math.ceil(total/pageSize));return NextResponse.json({items:data||[],page,page_size:pageSize,total,pages,filters:{q:search,status:status||'',mime_type:mimeType||'',sort}});
}

export async function POST(request:Request){
 const ctx=await context();if('error'in ctx)return ctx.error;
 try{
  const form=await request.formData();const file=form.get('file');if(!(file instanceof File))return NextResponse.json({error:'Image file is required.'},{status:400});
  const extension=MIME_EXTENSIONS[file.type];if(!extension)return NextResponse.json({error:'Only JPEG, PNG, WebP and AVIF images are supported.'},{status:400});
  if(file.size<=0||file.size>MAX_FILE_SIZE)return NextResponse.json({error:'Image must be larger than 0 bytes and no more than 8 MB.'},{status:400});
  const metadata=mediaMetadata(form.get('title'),form.get('alt_text'),form.get('decorative'));if(!metadata.ok)return NextResponse.json({error:metadata.error},{status:400});
  const now=new Date();const storagePath=`${now.getUTCFullYear()}/${String(now.getUTCMonth()+1).padStart(2,'0')}/${randomUUID()}.${extension}`;const bytes=Buffer.from(await file.arrayBuffer());
  const {error:uploadError}=await ctx.db.storage.from(BUCKET).upload(storagePath,bytes,{contentType:file.type,cacheControl:'31536000',upsert:false});if(uploadError)throw uploadError;
  const {data:publicData}=ctx.db.storage.from(BUCKET).getPublicUrl(storagePath);const publicUrl=publicData.publicUrl;
  const {data:item,error:insertError}=await ctx.db.from('website_media_assets').insert({title:metadata.title,alt_text:metadata.alt_text,decorative:metadata.decorative,original_file_name:cleanText(file.name||`image.${extension}`,240),storage_path:storagePath,public_url:publicUrl,mime_type:file.type,size_bytes:file.size,status:'active',created_by:ctx.user.id,updated_by:ctx.user.id}).select('*').single();
  if(insertError){await ctx.db.storage.from(BUCKET).remove([storagePath]);throw insertError}
  const audit=await recordAdminAudit({actorUserId:ctx.user.id,actorEmail:ctx.user.email,capability:'website.content.edit',action:'website.media.uploaded',resourceType:'website.media',resourceId:item.id,afterState:{title:item.title,alt_text:item.alt_text,decorative:item.decorative,mime_type:item.mime_type,size_bytes:item.size_bytes,status:item.status,storage_path:item.storage_path},metadata:{original_file_name:item.original_file_name}});
  return NextResponse.json({ok:true,item,audit_recorded:audit.ok},{status:201});
 }catch(error){console.error('website media upload failed',error);return NextResponse.json({error:'Unable to upload Website media.'},{status:500});}
}

export async function PATCH(request:Request){
 const ctx=await context();if('error'in ctx)return ctx.error;
 try{
  const body=await request.json();const id=cleanText(body.id,80);if(!id)return NextResponse.json({error:'Media asset id is required.'},{status:400});
  const {data:before,error:beforeError}=await ctx.db.from('website_media_assets').select('*').eq('id',id).maybeSingle();if(beforeError)throw beforeError;if(!before)return NextResponse.json({error:'Media asset not found.'},{status:404});
  const metadata=mediaMetadata(body.title??before.title,body.alt_text??before.alt_text,body.decorative??before.decorative);if(!metadata.ok)return NextResponse.json({error:metadata.error},{status:400});
  const status=(body.status??before.status) as MediaStatus;if(!['active','archived'].includes(status))return NextResponse.json({error:'Media status must be active or archived.'},{status:400});
  const updatedAt=new Date().toISOString();const {data:item,error}=await ctx.db.from('website_media_assets').update({title:metadata.title,alt_text:metadata.alt_text,decorative:metadata.decorative,status,updated_by:ctx.user.id,updated_at:updatedAt}).eq('id',id).select('*').single();if(error)throw error;
  const action=before.status!==status?(status==='archived'?'website.media.archived':'website.media.restored'):'website.media.updated';
  const audit=await recordAdminAudit({actorUserId:ctx.user.id,actorEmail:ctx.user.email,capability:'website.content.edit',action,resourceType:'website.media',resourceId:id,beforeState:{title:before.title,alt_text:before.alt_text,decorative:before.decorative,status:before.status},afterState:{title:item.title,alt_text:item.alt_text,decorative:item.decorative,status:item.status},metadata:{mime_type:item.mime_type,size_bytes:item.size_bytes}});
  return NextResponse.json({ok:true,item,audit_recorded:audit.ok});
 }catch(error){console.error('website media update failed',error);return NextResponse.json({error:'Unable to update Website media.'},{status:500});}
}
