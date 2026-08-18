import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

export async function GET(){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Sign in to view the Project Participation Terms.'},{status:401});const db=serviceDb();if(!db)return NextResponse.json({error:'Project terms service is not configured.'},{status:503});
  const {data:template}=await db.from('communication_templates').select('id,template_key,version,active').eq('template_key','project_application_terms').eq('active',true).maybeSingle();if(!template)return NextResponse.json({error:'Project Participation Terms are not currently published.'},{status:503});
  const {data:attachment}=await db.from('communication_template_attachments').select('id,file_name,storage_path,content_type,size_bytes,sort_order,created_at').eq('template_id',template.id).eq('active',true).order('sort_order').order('created_at',{ascending:false}).limit(1).maybeSingle();if(!attachment)return NextResponse.json({error:'Project Participation Terms document is not currently published.'},{status:503});
  const signed=await db.storage.from('communication-template-documents').createSignedUrl(attachment.storage_path,15*60);if(signed.error||!signed.data?.signedUrl)return NextResponse.json({error:'Unable to open the Project Participation Terms right now.'},{status:500});
  return NextResponse.json({terms:{attachment_id:attachment.id,file_name:attachment.file_name,content_type:attachment.content_type,size_bytes:attachment.size_bytes,template_version:template.version,url:signed.data.signedUrl}});
}
