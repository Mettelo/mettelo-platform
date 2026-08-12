import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyAdmins,serviceDb} from '@/lib/project-flow';

const editableStatuses=new Set(['draft','additional_evidence_required']);
const fields=['data_ai_experience','project_delivery_experience','coordination_experience','proposed_first_project','availability','motivation'] as const;
function clean(value:unknown,max:number){return String(value||'').trim().slice(0,max)}
function httpsUrl(value:unknown){const text=clean(value,700);if(!text)return null;try{const url=new URL(text);return url.protocol==='https:'?url.toString():null}catch{return null}}
type ExternalEvidence={label:string;url:string|null};

export async function GET(){
  const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const [{data:identity},{data:application}]=await Promise.all([
    supabase.from('account_identities').select('account_type,show_project_architect_designation').eq('user_id',user.id).maybeSingle(),
    supabase.from('project_architect_applications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  if(!application)return NextResponse.json({identity:identity||{account_type:'member',show_project_architect_designation:false},application:null,evidence:[],history:[],credential:null});
  const [{data:evidence},{data:history},{data:credential}]=await Promise.all([
    supabase.from('project_architect_application_evidence').select('*').eq('application_id',application.id).order('created_at'),
    supabase.from('project_architect_application_history').select('*').eq('application_id',application.id).order('created_at',{ascending:false}),
    supabase.from('project_architect_credentials').select('*').eq('application_id',application.id).order('issued_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  return NextResponse.json({identity,application,evidence:evidence||[],history:history||[],credential});
}

export async function POST(request:Request){
  try{
    const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const body=await request.json();const requestedStatus=body.status==='submitted'?'submitted':'draft';
    const values=Object.fromEntries(fields.map(key=>[key,clean(body[key],key==='availability'?240:3000)]));
    if(requestedStatus==='submitted'&&fields.some(key=>!values[key]))return NextResponse.json({error:'Complete every application section before submitting.'},{status:400});
    const links:ExternalEvidence[]=Array.isArray(body.external_evidence)?body.external_evidence.slice(0,6).map((row:unknown)=>{const item=(row||{}) as Record<string,unknown>;return{label:clean(item.label,160),url:httpsUrl(item.url)}}):[];
    if(links.some(link=>!link.label||!link.url))return NextResponse.json({error:'Every work example needs a label and valid secure link.'},{status:400});
    const proofIds=Array.isArray(body.proof_ids)?[...new Set(body.proof_ids.map((id:unknown)=>clean(id,80)).filter(Boolean))].slice(0,10):[];
    if(!links.length&&!proofIds.length&&requestedStatus==='submitted')return NextResponse.json({error:'Add at least one work example or verified Mettelo Proof.'},{status:400});
    if(proofIds.length){const {data:proof}=await supabase.from('contributions').select('id').eq('user_id',user.id).eq('verification_status','verified').in('id',proofIds);if((proof||[]).length!==proofIds.length)return NextResponse.json({error:'One or more selected Proof records are not verified or do not belong to you.'},{status:400});}

    const {data:current}=await supabase.from('project_architect_applications').select('id,status').eq('user_id',user.id).in('status',['draft','submitted','under_review','additional_evidence_required','approved','suspended']).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(current&&!editableStatuses.has(current.status))return NextResponse.json({error:'This application is already in review or has a final decision.'},{status:409});
    let applicationId=current?.id as string|undefined;
    if(!applicationId){const {data,error}=await supabase.from('project_architect_applications').insert({user_id:user.id,status:'draft',...values}).select('id').single();if(error)throw error;applicationId=data.id;}
    else {const {error}=await supabase.from('project_architect_applications').update({...values,updated_at:new Date().toISOString()}).eq('id',applicationId);if(error)throw error;}

    const {error:clearError}=await supabase.from('project_architect_application_evidence').delete().eq('application_id',applicationId);
    if(clearError)throw clearError;
    const evidence=[...links.map(link=>({application_id:applicationId,evidence_type:'external_link',label:link.label,external_url:link.url})),...proofIds.map(id=>({application_id:applicationId,evidence_type:'mettelo_proof',label:'Verified Mettelo Proof',contribution_id:id}))];
    if(evidence.length){const {error}=await supabase.from('project_architect_application_evidence').insert(evidence);if(error)throw error;}
    const update:Record<string,unknown>={status:requestedStatus,updated_at:new Date().toISOString()};if(requestedStatus==='submitted')update.submitted_at=new Date().toISOString();
    const {data:application,error:updateError}=await supabase.from('project_architect_applications').update(update).eq('id',applicationId).select('*').single();if(updateError)throw updateError;
    if(requestedStatus==='submitted'){const db=serviceDb();if(db)await notifyAdmins(db,{type:'project_architect_application_submitted',title:'Project Architect application submitted',body:'A Member has submitted evidence for Project Architect review.',actionUrl:'/admin/project-architect-applications',dedupeKey:`architect-application:${applicationId}:submitted`});}
    return NextResponse.json({application,message:requestedStatus==='submitted'?'Application submitted for review.':'Draft saved.'});
  }catch(error){console.error('project architect application error',error);return NextResponse.json({error:'Unable to save the Project Architect application.'},{status:500});}
}

export async function PATCH(request:Request){
  try{
    const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const body=await request.json();
    if(body.action==='visibility'){
      const db=serviceDb();if(!db)return NextResponse.json({error:'Identity service unavailable.'},{status:503});
      const {data:identity}=await db.from('account_identities').select('account_type').eq('user_id',user.id).maybeSingle();
      if(identity?.account_type!=='project_architect')return NextResponse.json({error:'An active Project Architect identity is required.'},{status:403});
      const {error}=await db.from('account_identities').update({show_project_architect_designation:Boolean(body.visible),updated_at:new Date().toISOString()}).eq('user_id',user.id);if(error)throw error;
      return NextResponse.json({ok:true,visible:Boolean(body.visible)});
    }
    if(body.action!=='withdraw')return NextResponse.json({error:'Unsupported action.'},{status:400});
    const {data,error}=await supabase.from('project_architect_applications').update({status:'withdrawn',updated_at:new Date().toISOString()}).eq('user_id',user.id).in('status',['draft','submitted']).select('id,status').single();
    if(error)return NextResponse.json({error:'Only a draft or submitted application can be withdrawn.'},{status:409});
    return NextResponse.json({application:data});
  }catch{return NextResponse.json({error:'Unable to update this application.'},{status:500});}
}
