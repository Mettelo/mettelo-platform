import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {MAX_EMAIL_ATTACHMENTS,MAX_EMAIL_ATTACHMENT_RAW_BYTES} from '@/lib/email-attachments';

async function adminUser(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();return user&&user.app_metadata?.role==='admin'?user:null;}
function safeName(value:string){return value.replace(/[^a-zA-Z0-9._-]+/g,'-').slice(0,120)||'offer.pdf';}

async function templateAttachmentUsage(db:ReturnType<typeof serviceDb>){
  if(!db)return{count:0,bytes:0};
  const {data:template}=await db.from('communication_templates').select('id,allow_attachments').eq('template_key','career_offer').maybeSingle();
  if(!template?.allow_attachments)return{count:0,bytes:0};
  const {data:attachments}=await db.from('communication_template_attachments').select('size_bytes').eq('template_id',template.id).eq('active',true);
  return{count:(attachments||[]).length,bytes:(attachments||[]).reduce((sum,row)=>sum+Number(row.size_bytes||0),0)};
}

async function offerDocumentUsage(db:NonNullable<ReturnType<typeof serviceDb>>,applicationId:string){
  const {data:documents}=await db.from('career_offer_documents').select('id,size_bytes').eq('application_id',applicationId).eq('active',true);
  return{documents:documents||[],count:(documents||[]).length,bytes:(documents||[]).reduce((sum,row)=>sum+Number(row.size_bytes||0),0)};
}

export async function POST(request:Request){
  try{
    const user=await adminUser();if(!user)return NextResponse.json({error:'Admin access required.'},{status:403});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Document service not configured.'},{status:503});
    const form=await request.formData();const applicationId=String(form.get('application_id')||'');const file=form.get('file');
    if(!applicationId||!(file instanceof File))return NextResponse.json({error:'Choose a PDF offer document.'},{status:400});
    if(file.type!=='application/pdf'||file.size<=0||file.size>10*1024*1024)return NextResponse.json({error:'Offer documents must be PDFs no larger than 10MB each.'},{status:400});
    const {data:application}=await db.from('career_applications').select('id,email').eq('id',applicationId).maybeSingle();
    if(!application)return NextResponse.json({error:'Career application not found.'},{status:404});

    const [templateUsage,offerUsage]=await Promise.all([templateAttachmentUsage(db),offerDocumentUsage(db,applicationId)]);
    if(templateUsage.count+offerUsage.count>=MAX_EMAIL_ATTACHMENTS){
      return NextResponse.json({error:`This offer already uses all ${MAX_EMAIL_ATTACHMENTS} available email attachment slots. Remove an offer document or a governed template attachment before adding another.`},{status:409});
    }
    if(templateUsage.bytes+offerUsage.bytes+file.size>MAX_EMAIL_ATTACHMENT_RAW_BYTES){
      return NextResponse.json({error:'This PDF would take the offer email above the 28MB combined attachment limit.'},{status:409});
    }

    const path=`${applicationId}/${crypto.randomUUID()}-${safeName(file.name)}`;const bytes=Buffer.from(await file.arrayBuffer());
    const upload=await db.storage.from('career-offer-documents').upload(path,bytes,{contentType:'application/pdf',upsert:false});
    if(upload.error)return NextResponse.json({error:'Unable to store the offer document securely.'},{status:500});
    const {data:document,error}=await db.from('career_offer_documents').insert({application_id:applicationId,storage_path:path,file_name:safeName(file.name),content_type:'application/pdf',size_bytes:file.size,uploaded_by:user.id}).select('id,application_id,file_name,size_bytes,created_at').single();
    if(error){await db.storage.from('career-offer-documents').remove([path]);throw error;}
    await db.from('communication_audit_log').insert({actor_user_id:user.id,action:'offer_document_attached',entity_type:'career_application',entity_id:applicationId,metadata:{document_id:document.id,file_name:document.file_name,size_bytes:document.size_bytes,candidate_email:application.email}});
    return NextResponse.json({ok:true,document});
  }catch(error){console.error('offer document upload error',error);return NextResponse.json({error:'Unable to upload the offer document.'},{status:500});}
}

export async function GET(request:Request){
  const user=await adminUser();if(!user)return NextResponse.json({error:'Admin access required.'},{status:403});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Document service not configured.'},{status:503});
  const applicationId=new URL(request.url).searchParams.get('application_id');if(!applicationId)return NextResponse.json({documents:[],limits:{max_documents:MAX_EMAIL_ATTACHMENTS,max_bytes:MAX_EMAIL_ATTACHMENT_RAW_BYTES,template_documents:0,template_bytes:0,available_documents:MAX_EMAIL_ATTACHMENTS,available_bytes:MAX_EMAIL_ATTACHMENT_RAW_BYTES}});
  const [offerUsage,templateUsage]=await Promise.all([offerDocumentUsage(db,applicationId),templateAttachmentUsage(db)]);
  return NextResponse.json({documents:offerUsage.documents,limits:{max_documents:MAX_EMAIL_ATTACHMENTS,max_bytes:MAX_EMAIL_ATTACHMENT_RAW_BYTES,template_documents:templateUsage.count,template_bytes:templateUsage.bytes,available_documents:Math.max(0,MAX_EMAIL_ATTACHMENTS-templateUsage.count-offerUsage.count),available_bytes:Math.max(0,MAX_EMAIL_ATTACHMENT_RAW_BYTES-templateUsage.bytes-offerUsage.bytes)}});
}

export async function DELETE(request:Request){
  try{
    const user=await adminUser();if(!user)return NextResponse.json({error:'Admin access required.'},{status:403});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Document service not configured.'},{status:503});
    const body=await request.json();const id=String(body.id||''),applicationId=String(body.application_id||'');
    if(!id||!applicationId)return NextResponse.json({error:'Document and application are required.'},{status:400});
    const {data:document}=await db.from('career_offer_documents').select('id,application_id,storage_path,file_name,active').eq('id',id).eq('application_id',applicationId).maybeSingle();
    if(!document||!document.active)return NextResponse.json({error:'Offer document not found.'},{status:404});
    const removed=await db.storage.from('career-offer-documents').remove([document.storage_path]);
    if(removed.error)return NextResponse.json({error:'Unable to remove the stored offer document.'},{status:500});
    const {error}=await db.from('career_offer_documents').update({active:false}).eq('id',id).eq('application_id',applicationId);if(error)throw error;
    await db.from('communication_audit_log').insert({actor_user_id:user.id,action:'offer_document_removed',entity_type:'career_application',entity_id:applicationId,metadata:{document_id:id,file_name:document.file_name}});
    return NextResponse.json({ok:true});
  }catch(error){console.error('offer document remove error',error);return NextResponse.json({error:'Unable to remove the offer document.'},{status:500});}
}
