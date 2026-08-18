import type {SupabaseClient} from '@supabase/supabase-js';

export const MAX_EMAIL_ATTACHMENTS=4;
export const MAX_EMAIL_ATTACHMENT_RAW_BYTES=28*1024*1024;

type OutboxLike={template_key:string;payload:Record<string,unknown>};
type AttachmentContentType='application/pdf'|'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
type ProviderAttachment={filename:string;content:string;content_type:AttachmentContentType};
type OfferDocument={id:string;application_id:string;storage_path:string;file_name:string;size_bytes:number;active:boolean};
type TemplateAttachment={id:string;storage_path:string;file_name:string;size_bytes:number;content_type:AttachmentContentType;active:boolean;sort_order:number};

function stringArray(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())).map(item=>item.trim()):[];}
function governedTemplateKey(item:OutboxLike){const source=item.payload?.source_template_key;return item.template_key==='admin_template_test'&&typeof source==='string'&&source.trim()?source.trim():item.template_key}
async function download(db:SupabaseClient,bucket:string,path:string,fileName:string,contentType:AttachmentContentType){const result=await db.storage.from(bucket).download(path);if(result.error||!result.data)throw new Error(`Unable to load ${fileName} for email delivery.`);const bytes=Buffer.from(await result.data.arrayBuffer());return{filename:fileName,content:bytes.toString('base64'),content_type:contentType} satisfies ProviderAttachment}

async function templateAttachments(db:SupabaseClient,templateKey:string){
  const {data:template,error:templateError}=await db.from('communication_templates').select('id,allow_attachments').eq('template_key',templateKey).maybeSingle();if(templateError)throw templateError;if(!template?.allow_attachments)return[];
  const {data,error}=await db.from('communication_template_attachments').select('id,storage_path,file_name,size_bytes,content_type,active,sort_order').eq('template_id',template.id).eq('active',true).order('sort_order').order('created_at');if(error)throw error;
  return(data||[]) as TemplateAttachment[];
}

async function offerAttachments(db:SupabaseClient,item:OutboxLike){
  if(item.template_key!=='career_offer')return[] as OfferDocument[];const ids=stringArray(item.payload?.offer_document_ids);if(!ids.length)return[];if(ids.length>MAX_EMAIL_ATTACHMENTS)throw new Error(`A career offer email can contain at most ${MAX_EMAIL_ATTACHMENTS} documents.`);const applicationId=typeof item.payload?.career_application_id==='string'?item.payload.career_application_id:'';if(!applicationId)throw new Error('Offer email attachment context is missing the career application.');const {data,error}=await db.from('career_offer_documents').select('id,application_id,storage_path,file_name,size_bytes,active').in('id',ids).eq('application_id',applicationId).eq('active',true);if(error)throw error;const documents=(data||[]) as OfferDocument[];if(documents.length!==ids.length)throw new Error('One or more offer email documents are no longer available.');const byId=new Map(documents.map(document=>[document.id,document]));return ids.map(id=>byId.get(id)).filter((document):document is OfferDocument=>Boolean(document));
}

export async function resolveEmailAttachments(db:SupabaseClient,item:OutboxLike):Promise<ProviderAttachment[]>{
  const [governed,offer]=await Promise.all([templateAttachments(db,governedTemplateKey(item)),offerAttachments(db,item)]);
  const totalCount=governed.length+offer.length;if(totalCount>MAX_EMAIL_ATTACHMENTS)throw new Error(`This email resolves to ${totalCount} attachments. Keep the combined governed and per-send documents at or below ${MAX_EMAIL_ATTACHMENTS}.`);
  const totalBytes=governed.reduce((sum,document)=>sum+Number(document.size_bytes||0),0)+offer.reduce((sum,document)=>sum+Number(document.size_bytes||0),0);if(totalBytes>MAX_EMAIL_ATTACHMENT_RAW_BYTES)throw new Error('Email documents are too large to attach to one message. Keep the combined files at or below 28MB.');
  const attachments:ProviderAttachment[]=[];
  for(const document of governed)attachments.push(await download(db,'communication-template-documents',document.storage_path,document.file_name,document.content_type));
  for(const document of offer)attachments.push(await download(db,'career-offer-documents',document.storage_path,document.file_name,'application/pdf'));
  return attachments;
}
