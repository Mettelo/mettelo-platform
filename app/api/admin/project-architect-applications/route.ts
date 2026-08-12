import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

const actions=new Set(['under_review','additional_evidence_required','approved','declined','suspended']);
export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    if(user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Admin data service unavailable.'},{status:503});
    const body=await request.json();const id=String(body.id||'');const action=String(body.action||'');const notes=String(body.notes||'').trim().slice(0,2000);
    if(!id||!actions.has(action))return NextResponse.json({error:'Choose a valid application action.'},{status:400});
    if(['additional_evidence_required','declined','suspended'].includes(action)&&!notes)return NextResponse.json({error:'Add a clear reason for this decision.'},{status:400});
    const {data:application}=await db.from('project_architect_applications').select('user_id').eq('id',id).maybeSingle();if(!application)return NextResponse.json({error:'Application not found.'},{status:404});
    const {data,error}=await db.rpc('review_project_architect_application',{p_application_id:id,p_action:action,p_notes:notes,p_actor:user.id});if(error)throw error;
    const {data:recipient}=await db.auth.admin.getUserById(application.user_id);const email=recipient.user?.email||null;
    const approved=action==='approved';const designation='Mettelo Data & AI Project Architect';
    const copy:Record<string,{title:string;body:string;subject:string}>={
      under_review:{title:'Your Project Architect application is under review',body:'The Mettelo team is reviewing your evidence. No action is needed right now.',subject:'Your Project Architect application is under review'},
      additional_evidence_required:{title:'More evidence is needed',body:`Please update your Project Architect application. Reviewer note: ${notes}`,subject:'Action needed: Project Architect evidence'},
      approved:{title:`You are now a ${designation}`,body:'Your evidence has been approved. Your internal Mettelo identity is Project Architect. You can choose whether the external designation appears publicly.',subject:`Approved: ${designation}`},
      declined:{title:'Project Architect application decision',body:`Your application was not approved at this time. Reviewer note: ${notes}`,subject:'Project Architect application decision'},
      suspended:{title:'Project Architect identity suspended',body:`Your elevated identity and public designation have been paused. Admin note: ${notes}`,subject:'Project Architect identity update'}
    };
    const message=copy[action];await notifyUser(db,{userId:application.user_id,email,type:`project_architect_${action}`,title:message.title,body:message.body,subject:message.subject,actionUrl:'/member/project-architect',dedupeKey:`architect-application:${id}:${action}`,payload:approved?{designation,credential_id:(data as {credential_id?:string})?.credential_id||null}:{}});
    return NextResponse.json({result:data});
  }catch(error){console.error('project architect review error',error);return NextResponse.json({error:error instanceof Error?error.message:'Unable to review this application.'},{status:500});}
}
