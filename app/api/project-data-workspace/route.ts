import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

const sourceTypes=new Set(['google_sheets','excel','google_drive','github','kaggle','hugging_face','api','public_portal','cloud_location','external_website','other']);
const sensitivities=new Set(['public','internal','restricted']);const accessStates=new Set(['open','needs_access','granted','blocked']);const qualityStates=new Set(['unreviewed','usable','issues_found','approved']);
const deliverableTypes=new Set(['analysis','dataset','pipeline','model','evaluation','dashboard','research_output','documentation','presentation','other']);
const deliverableStates=new Set(['planned','in_progress','ready_for_review','changes_requested','approved']);
function clean(value:unknown,max=2000){return String(value??'').trim().slice(0,max)}
function httpsUrl(value:string){try{return new URL(value).protocol==='https:'}catch{return false}}
function slugify(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)}

export async function POST(request:Request){
  try{
    const body=await request.json();const projectId=clean(body.project_id,80),runId=clean(body.project_run_id,80),action=clean(body.action,50);
    if(!projectId||!runId)return NextResponse.json({error:'A project and active team run are required.'},{status:400});
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Project data service is not configured.'},{status:503});
    const [{data:run},{data:membership}]=await Promise.all([db.from('project_runs').select('id,status').eq('id',runId).eq('project_id',projectId).maybeSingle(),db.from('project_members').select('team_role,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).maybeSingle()]);
    const isAdmin=user.app_metadata?.role==='admin';const active=membership&&['active','completed'].includes(membership.membership_status);const canLead=isAdmin||Boolean(active&&['project_lead','reviewer'].includes(membership.team_role));
    if(!run||(!active&&!isAdmin))return NextResponse.json({error:'Active membership in this project team is required.'},{status:403});
    if(!['active','review','completed'].includes(run.status)&&!isAdmin)return NextResponse.json({error:'The data workspace opens when the team starts.'},{status:409});

    if(action==='data_source'){
      if(isAdmin&&!membership)return NextResponse.json({error:'Admin access is read-only unless you join this project team.'},{status:403});
      const name=clean(body.name,180),sourceType=clean(body.source_type,40),externalUrl=clean(body.external_url,800),sensitivity=clean(body.sensitivity,30)||'internal',accessStatus=clean(body.access_status,30)||'needs_access',qualityStatus=clean(body.quality_status,30)||'unreviewed',owner=clean(body.owner_user_id,80)||null;
      if(!name||!sourceTypes.has(sourceType)||!httpsUrl(externalUrl)||!sensitivities.has(sensitivity)||!accessStates.has(accessStatus)||!qualityStates.has(qualityStatus))return NextResponse.json({error:'Add a name, supported source type, valid HTTPS link and valid governance statuses.'},{status:400});
      if(owner){const {data}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('user_id',owner).in('membership_status',['active','completed']).maybeSingle();if(!data)return NextResponse.json({error:'The data source owner must belong to this team.'},{status:400})}
      const {data,error}=await db.from('project_data_sources').insert({project_id:projectId,project_run_id:runId,name,description:clean(body.description,1600)||null,source_type:sourceType,external_url:externalUrl,owner_user_id:owner,version_label:clean(body.version_label,120)||null,data_period:clean(body.data_period,180)||null,unit_of_observation:clean(body.unit_of_observation,240)||null,data_format:clean(body.data_format,80)||null,sensitivity,access_status:accessStatus,quality_status:qualityStatus,known_limitations:clean(body.known_limitations,2000)||null,last_checked_on:new Date().toISOString().slice(0,10),added_by:user.id}).select('*').single();if(error)throw error;return NextResponse.json({ok:true,item:data});
    }

    if(action==='data_source_status'){
      const id=clean(body.id,80);const {data:current}=await db.from('project_data_sources').select('id,owner_user_id,added_by').eq('id',id).eq('project_run_id',runId).maybeSingle();if(!current)return NextResponse.json({error:'Data source not found.'},{status:404});if(!canLead&&current.owner_user_id!==user.id&&current.added_by!==user.id)return NextResponse.json({error:'Only the source owner or project leadership can update governance status.'},{status:403});const patch:Record<string,unknown>={updated_at:new Date().toISOString(),last_checked_on:new Date().toISOString().slice(0,10)};if(body.access_status){const value=clean(body.access_status,30);if(!accessStates.has(value))return NextResponse.json({error:'Invalid access status.'},{status:400});patch.access_status=value}if(body.quality_status){const value=clean(body.quality_status,30);if(!qualityStates.has(value))return NextResponse.json({error:'Invalid quality status.'},{status:400});patch.quality_status=value}if(Object.keys(patch).length===2)return NextResponse.json({error:'Choose a governance status to update.'},{status:400});const {data,error}=await db.from('project_data_sources').update(patch).eq('id',id).eq('project_run_id',runId).select('*').single();if(error)throw error;return NextResponse.json({ok:true,item:data});
    }

    if(action==='workstream'){
      if(!canLead)return NextResponse.json({error:'Only the Project Lead, Reviewer or Admin can shape workstreams.'},{status:403});
      const name=clean(body.name,120);if(!name)return NextResponse.json({error:'Add a workstream name.'},{status:400});const owner=clean(body.owner_user_id,80)||null;if(owner){const {data}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('user_id',owner).in('membership_status',['active','completed']).maybeSingle();if(!data)return NextResponse.json({error:'The workstream owner must belong to this team.'},{status:400})}
      let slug=slugify(name)||'workstream';const {data:duplicate}=await db.from('project_workstreams').select('id').eq('project_run_id',runId).eq('slug',slug).maybeSingle();if(duplicate)slug=`${slug}-${Date.now().toString().slice(-5)}`;
      const {data,error}=await db.from('project_workstreams').insert({project_id:projectId,project_run_id:runId,name,slug,description:clean(body.description,1200)||null,owner_user_id:owner,sort_order:Math.max(0,Math.min(999,Number(body.sort_order)||0)),created_by:user.id}).select('*').single();if(error)throw error;return NextResponse.json({ok:true,item:data});
    }

    if(action==='workstream_update'){
      if(!canLead)return NextResponse.json({error:'Only project leadership can update workstreams.'},{status:403});const id=clean(body.id,80),name=clean(body.name,120),owner=clean(body.owner_user_id,80)||null;if(!id||!name)return NextResponse.json({error:'Workstream and name are required.'},{status:400});const {data:current}=await db.from('project_workstreams').select('id').eq('id',id).eq('project_run_id',runId).maybeSingle();if(!current)return NextResponse.json({error:'Workstream not found.'},{status:404});if(owner){const {data}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('user_id',owner).in('membership_status',['active','completed']).maybeSingle();if(!data)return NextResponse.json({error:'The workstream owner must belong to this team.'},{status:400})}const {data,error}=await db.from('project_workstreams').update({name,owner_user_id:owner,sort_order:Math.max(0,Math.min(999,Number(body.sort_order)||0)),updated_at:new Date().toISOString()}).eq('id',id).eq('project_run_id',runId).select('*').single();if(error)throw error;return NextResponse.json({ok:true,item:data});
    }

    if(action==='deliverable'){
      if(!canLead)return NextResponse.json({error:'Only the Project Lead, Reviewer or Admin can create reviewed deliverables.'},{status:403});
      const title=clean(body.title,180),type=clean(body.deliverable_type,40),criteria=clean(body.acceptance_criteria,3000),owner=clean(body.owner_user_id,80),reviewer=clean(body.reviewer_user_id,80),workstream=clean(body.workstream_id,80)||null,evidence=clean(body.evidence_url,800)||null;
      if(!title||!deliverableTypes.has(type)||criteria.length<20||!owner||!reviewer)return NextResponse.json({error:'Add a title, type, testable acceptance criteria, owner and reviewer.'},{status:400});if(owner===reviewer)return NextResponse.json({error:'The owner cannot review their own deliverable.'},{status:400});if(evidence&&!httpsUrl(evidence))return NextResponse.json({error:'Deliverable evidence must use a valid HTTPS URL.'},{status:400});
      const {data:members}=await db.from('project_members').select('user_id').eq('project_run_id',runId).in('membership_status',['active','completed']).in('user_id',[owner,reviewer]);if((members||[]).length!==2)return NextResponse.json({error:'Owner and reviewer must both belong to this team.'},{status:400});
      if(workstream){const {data}=await db.from('project_workstreams').select('id').eq('id',workstream).eq('project_run_id',runId).maybeSingle();if(!data)return NextResponse.json({error:'Choose a workstream from this team.'},{status:400})}
      const {data,error}=await db.from('project_deliverables').insert({project_id:projectId,project_run_id:runId,workstream_id:workstream,title,deliverable_type:type,owner_user_id:owner,reviewer_user_id:reviewer,acceptance_criteria:criteria,version_label:clean(body.version_label,120)||null,evidence_url:evidence,status:'planned',is_required:Boolean(body.is_required),created_by:user.id}).select('*').single();if(error)throw error;return NextResponse.json({ok:true,item:data});
    }

    if(action==='deliverable_status'){
      const id=clean(body.id,80),status=clean(body.status,40),notes=clean(body.review_notes,2000);if(!id||!deliverableStates.has(status))return NextResponse.json({error:'Choose a valid deliverable status.'},{status:400});
      const {data:current}=await db.from('project_deliverables').select('*').eq('id',id).eq('project_run_id',runId).eq('project_id',projectId).maybeSingle();if(!current)return NextResponse.json({error:'Deliverable not found.'},{status:404});
      const isOwner=current.owner_user_id===user.id,isReviewer=current.reviewer_user_id===user.id;if(status==='approved'&&!isAdmin&&!isReviewer)return NextResponse.json({error:'Only the named reviewer or Admin can approve this deliverable.'},{status:403});if(status==='approved'&&isOwner)return NextResponse.json({error:'You cannot approve your own deliverable.'},{status:403});if(status==='changes_requested'&&!isAdmin&&!isReviewer)return NextResponse.json({error:'Only the named reviewer or Admin can request changes.'},{status:403});if(!['approved','changes_requested'].includes(status)&&!canLead&&!isOwner)return NextResponse.json({error:'Only the owner or project leadership can update this deliverable.'},{status:403});
      const patch:Record<string,unknown>={status,updated_at:new Date().toISOString()};if(['approved','changes_requested'].includes(status)){patch.review_notes=notes||null;patch.reviewed_at=new Date().toISOString()}
      const {data,error}=await db.from('project_deliverables').update(patch).eq('id',id).eq('project_run_id',runId).select('*').single();if(error)throw error;return NextResponse.json({ok:true,item:data});
    }
    return NextResponse.json({error:'Unknown data workspace action.'},{status:400});
  }catch(error){console.error('project data workspace error',error);return NextResponse.json({error:'Unable to update the data workspace.'},{status:500})}
}
