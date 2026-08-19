import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {replaceExcludedSpotlight} from '@/lib/monthly-spotlight';
import {publishSpotlightIfReady,recordSpotlightEvent} from '@/lib/spotlight-workflow';

async function admin(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();return user?.app_metadata?.role==='admin'?user:null;}

const actions=new Set(['exclude','hold','unhold','suppress_project','restore_project','suppress_evidence','restore_evidence']);

export async function PATCH(request:Request){
  try{
    const reviewer=await admin();
    if(!reviewer)return NextResponse.json({error:'Forbidden'},{status:403});
    const db=serviceDb();
    if(!db)return NextResponse.json({error:'Service unavailable'},{status:503});

    const body=await request.json().catch(()=>({}));
    const id=typeof body.id==='string'?body.id:'';
    const action=typeof body.action==='string'?body.action:'';
    const reason=typeof body.reason==='string'?body.reason.trim().slice(0,500):'';
    if(!id||!actions.has(action))return NextResponse.json({error:'Invalid request'},{status:400});

    const {data:selected,error:readError}=await db.from('spotlights')
      .select('id,user_id,title,award_month,category,status,is_excluded,consent_status,publication_held,suppress_public_project,suppress_public_evidence')
      .eq('id',id).maybeSingle();
    if(readError)throw readError;
    if(!selected)return NextResponse.json({error:'Spotlight not found'},{status:404});
    const now=new Date().toISOString();

    if(action==='exclude'){
      if(!reason)return NextResponse.json({error:'Record a reason for excluding this automatic selection.'},{status:400});
      if(selected.status!=='draft'||selected.is_excluded)return NextResponse.json({error:'Only an active draft selection can be excluded. Use a publication hold for a recognition that is already public.'},{status:409});
      const {data:item,error}=await db.from('spotlights').update({
        is_excluded:true,
        exclusion_reason:reason,
        selection_method:'override',
        status:'archived',
        reviewed_by:reviewer.id,
        reviewed_at:now
      }).eq('id',id).select('id,status,is_excluded,exclusion_reason,publication_held,suppress_public_project,suppress_public_evidence').single();
      if(error)throw error;
      await recordSpotlightEvent(db,id,'excluded',reviewer.id,{reason,award_month:selected.award_month,category:selected.category});
      const replacement=selected.award_month?await replaceExcludedSpotlight(db,selected.award_month):null;
      return NextResponse.json({ok:true,item,replacement,message:replacement?.created?'Candidate excluded and the next eligible evidence-backed candidate was selected automatically.':'Candidate excluded. No eligible replacement is currently available.'});
    }

    if(action==='hold'){
      if(!reason)return NextResponse.json({error:'Record a reason for placing this recognition on hold.'},{status:400});
      if(selected.status==='archived'||selected.is_excluded)return NextResponse.json({error:'Archived or excluded recognition cannot be placed on hold.'},{status:409});
      const {data:item,error}=await db.from('spotlights').update({publication_held:true,hold_reason:reason,reviewed_by:reviewer.id,reviewed_at:now}).eq('id',id).select('id,status,consent_status,publication_held,hold_reason,suppress_public_project,suppress_public_evidence').single();
      if(error)throw error;
      await recordSpotlightEvent(db,id,'held',reviewer.id,{reason,was_public:selected.status==='published'});
      return NextResponse.json({ok:true,item,message:'Publication hold applied. Recognition history and member consent are preserved, but the public award is hidden.'});
    }

    if(action==='unhold'){
      const {data:item,error}=await db.from('spotlights').update({publication_held:false,hold_reason:null,reviewed_by:reviewer.id,reviewed_at:now}).eq('id',id).select('id,status,consent_status,publication_held,hold_reason,suppress_public_project,suppress_public_evidence').single();
      if(error)throw error;
      await recordSpotlightEvent(db,id,'unheld',reviewer.id);
      const publication=await publishSpotlightIfReady(db,id,reviewer.id);
      return NextResponse.json({ok:true,item:publication.item||item,message:publication.published?'Hold cleared. Existing member consent was valid, so publication resumed automatically.':'Hold cleared.'});
    }

    const suppressing=action==='suppress_project'||action==='suppress_evidence';
    const projectAction=action==='suppress_project'||action==='restore_project';
    const changes=projectAction
      ?{suppress_public_project:suppressing,reviewed_by:reviewer.id,reviewed_at:now}
      :{suppress_public_evidence:suppressing,reviewed_by:reviewer.id,reviewed_at:now};
    const {data:item,error}=await db.from('spotlights').update(changes).eq('id',id).select('id,status,consent_status,publication_held,suppress_public_project,suppress_public_evidence').single();
    if(error)throw error;
    const eventType=projectAction
      ?(suppressing?'public_project_suppressed':'public_project_restored')
      :(suppressing?'public_evidence_suppressed':'public_evidence_restored');
    await recordSpotlightEvent(db,id,eventType,reviewer.id,reason?{reason}:{});
    return NextResponse.json({ok:true,item,message:projectAction?(suppressing?'Public project context suppressed.':'Public project context restored when independently safe.'):(suppressing?'Public evidence links suppressed.':'Public evidence links restored when independently safe.')});
  }catch(error){
    console.error('admin spotlight error',error);
    return NextResponse.json({error:'Unable to update Spotlight governance.'},{status:500});
  }
}
