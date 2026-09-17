import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

export const dynamic='force-dynamic';

async function adminContext(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
  if(user.app_metadata?.role!=='admin')return{error:NextResponse.json({error:'Admin access required.'},{status:403})};
  const db=serviceDb();
  if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
  return{db};
}

export async function GET(){
  try{
    const ctx=await adminContext();
    if('error'in ctx)return ctx.error;
    const {db}=ctx;
    const {data:projects,error}=await db.from('projects').select('id,slug,title,status,visibility,project_type,participation_mode,team_size_threshold,min_team_size,target_team_size,max_team_size,applications_open,updated_at').order('updated_at',{ascending:false});
    if(error)throw error;
    const ids=(projects||[]).map(project=>project.id);
    if(!ids.length)return NextResponse.json({items:[]});

    const [{data:applications},{data:offers},{data:members},{data:runs},blockerRows]=await Promise.all([
      db.from('project_applications').select('project_id,status').in('project_id',ids),
      db.from('project_offers').select('project_id,status').in('project_id',ids),
      db.from('project_members').select('project_id,project_run_id,membership_status').in('project_id',ids),
      db.from('project_runs').select('id,project_id,run_number,status,required_team_size,recruitment_open,has_started,updated_at').in('project_id',ids).order('run_number',{ascending:false}),
      Promise.all(ids.map(async id=>{const {data}=await db.rpc('workstream2_publication_blockers',{p_project_id:id});return{id,blockers:(Array.isArray(data)?data:[]).map(value=>String(value)).filter(Boolean)}}))
    ]);
    const blockers=new Map(blockerRows.map(row=>[row.id,row.blockers]));

    const items=(projects||[]).map(project=>{
      const projectRuns=(runs||[]).filter(run=>run.project_id===project.id);
      const currentRun=projectRuns.find(run=>!['completed','cancelled'].includes(run.status))||projectRuns[0]||null;
      const projectMembers=(members||[]).filter(member=>member.project_id===project.id&&['waiting','active','completed'].includes(member.membership_status));
      const currentMembers=currentRun?projectMembers.filter(member=>member.project_run_id===currentRun.id):projectMembers;
      const projectApplications=(applications||[]).filter(application=>application.project_id===project.id);
      const projectOffers=(offers||[]).filter(offer=>offer.project_id===project.id);
      const min=Math.max(1,Number(project.min_team_size||project.team_size_threshold||1));
      const target=Math.max(min,Number(project.target_team_size||project.team_size_threshold||min));
      const max=Math.max(target,Number(project.max_team_size||target));
      const publicationBlockers=blockers.get(project.id)||[];
      const published=project.visibility==='public'&&!['draft','archived','cancelled'].includes(project.status);
      const recruitment=currentRun?.recruitment_open===false||project.applications_open===false?'closed':'open';
      return{
        id:project.id,slug:project.slug,title:project.title,status:project.status,visibility:project.visibility,project_type:project.project_type,
        participation_mode:project.participation_mode||'team',minimum:min,target,maximum:max,recruitment,
        applications:projectApplications.length,offers:projectOffers.filter(offer=>['pending','accepted'].includes(offer.status)).length,
        team:currentMembers.length,run_status:currentRun?.status||null,run_number:currentRun?.run_number||null,
        lab_readiness:publicationBlockers.length?'blocked':'ready',health:published&&publicationBlockers.length?'attention':publicationBlockers.length?'configuration':'healthy',
        blocker_count:publicationBlockers.length,updated_at:project.updated_at
      };
    });
    return NextResponse.json({items},{headers:{'cache-control':'no-store'}});
  }catch(error){
    console.error('admin project operations list error',error);
    return NextResponse.json({error:'Unable to load project operations.'},{status:500});
  }
}
