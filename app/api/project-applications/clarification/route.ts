import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyAdmins,serviceDb} from '@/lib/project-flow';

export async function POST(request:Request){
  try{
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const body=await request.json();
    const id=String(body.id||'').trim();
    const responseText=String(body.response||'').trim();
    if(!id)return NextResponse.json({error:'Project request is required.'},{status:400});
    if(responseText.length<10||responseText.length>2000)return NextResponse.json({error:'Please provide a clarification response between 10 and 2,000 characters.'},{status:400});

    const {data,error}=await supabase.rpc('phase7_respond_to_clarification',{p_application_id:id,p_response:responseText});
    if(error){
      const message=String(error.message||'');
      if(message.includes('APPLICATION_NOT_FOUND'))return NextResponse.json({error:'Project request not found.'},{status:404});
      if(message.includes('CLARIFICATION_NOT_ACTIVE'))return NextResponse.json({error:'This clarification request is no longer active. Refresh My Mettelo to see the latest status.'},{status:409});
      if(message.includes('CLARIFICATION_RESPONSE_INVALID'))return NextResponse.json({error:'Please provide a valid clarification response.'},{status:400});
      if(message.includes('AUTH_REQUIRED'))return NextResponse.json({error:'Authentication required.'},{status:401});
      throw error;
    }

    const db=serviceDb();
    if(db){
      const {data:application}=await db.from('project_applications').select('project_id,application_kind,projects(title)').eq('id',id).maybeSingle();
      if(application){
        const project=Array.isArray(application.projects)?application.projects[0]:application.projects;
        await Promise.allSettled([
          db.from('project_activity_log').insert({project_id:application.project_id,event_type:'clarification_responded',actor_type:'user',actor_user_id:user.id,from_status:'clarification_requested',to_status:'in_review',metadata:{application_id:id,application_kind:application.application_kind,response_length:responseText.length}}),
          notifyAdmins(db,{projectId:application.project_id,applicationId:id,type:'application_clarification_responded',title:`Clarification received — ${project?.title||'project request'}`,body:'A member responded to a clarification request. Review the canonical project request for the supplied information.',actionUrl:'/admin/project-operations/applications'})
        ]);
      }
    }

    return NextResponse.json({ok:true,application:data,message:'Clarification sent. Your project request is back in review.'});
  }catch(error){
    console.error('project clarification response error',error);
    return NextResponse.json({error:'Unable to send your clarification response.'},{status:500});
  }
}
