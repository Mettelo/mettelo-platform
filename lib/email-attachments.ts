import type {SupabaseClient} from '@supabase/supabase-js';

export const MAX_EMAIL_ATTACHMENTS=4;
export const MAX_EMAIL_ATTACHMENT_RAW_BYTES=28*1024*1024;

type OutboxLike={template_key:string;payload:Record<string,unknown>};
type ProviderAttachment={filename:string;content:string};

type OfferDocument={id:string;application_id:string;storage_path:string;file_name:string;size_bytes:number;active:boolean};

function stringArray(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())).map(item=>item.trim()):[];}

export function emailAllowsDocuments(templateKey:string){return templateKey==='career_offer';}

export async function resolveEmailAttachments(db:SupabaseClient,item:OutboxLike):Promise<ProviderAttachment[]>{
  if(!emailAllowsDocuments(item.template_key))return[];
  const ids=stringArray(item.payload?.offer_document_ids);
  if(!ids.length)return[];
  if(ids.length>MAX_EMAIL_ATTACHMENTS)throw new Error(`A career offer email can contain at most ${MAX_EMAIL_ATTACHMENTS} documents.`);
  const applicationId=typeof item.payload?.career_application_id==='string'?item.payload.career_application_id:'';
  if(!applicationId)throw new Error('Offer email attachment context is missing the career application.');
  const {data,error}=await db.from('career_offer_documents').select('id,application_id,storage_path,file_name,size_bytes,active').in('id',ids).eq('application_id',applicationId).eq('active',true);
  if(error)throw error;
  const documents=(data||[]) as OfferDocument[];
  if(documents.length!==ids.length)throw new Error('One or more offer email documents are no longer available.');
  const byId=new Map(documents.map(document=>[document.id,document]));
  const ordered=ids.map(id=>byId.get(id)).filter((document):document is OfferDocument=>Boolean(document));
  const totalBytes=ordered.reduce((sum,document)=>sum+Number(document.size_bytes||0),0);
  if(totalBytes>MAX_EMAIL_ATTACHMENT_RAW_BYTES)throw new Error('Offer documents are too large to attach to one email. Keep the combined files at or below 28MB.');
  const attachments:ProviderAttachment[]=[];
  for(const document of ordered){
    const download=await db.storage.from('career-offer-documents').download(document.storage_path);
    if(download.error||!download.data)throw new Error(`Unable to load ${document.file_name} for email delivery.`);
    const bytes=Buffer.from(await download.data.arrayBuffer());
    attachments.push({filename:document.file_name,content:bytes.toString('base64')});
  }
  return attachments;
}
