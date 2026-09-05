import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import MemberApplicationTracker from '@/components/MemberApplicationTracker';
import MemberPageHeader from '@/components/MemberPageHeader';

type AppEvent={id:string;application_id:string;from_status:string|null;to_status:string;created_at:string};
type Application={id:string;status:string;submitted_at:string;updated_at:string;project_id:string;project_run_id?:string|null;application_kind?:string;requested_role?:string|null;projects:{title:string;status:string;project_type?:string;team_size_threshold?:number|null;forming_deadline?:string|null;kickoff_at?:string|null}|null;project_roles:{title:string}|null;formation?:{filled:number;threshold:number;status:string;is_full:boolean;kickoff_at:string|null;forming_deadline:string|null;run_number:number|null}|null;events?:AppEvent[]};

type ProjectQueryError={code?:string;message?:string}|null;

export const dynamic='force-dynamic';

function isHistoricalProjectApplicationColumnError(error:ProjectQueryError){
  if(!error||error.code!=='42703')return false;
  return /project_applications\.(application_kind|requested_role|project_run_id)|column ["']?(application_kind|requested_role|project_run_id)["']?/i.test(error.message||'');
}

export default async function ApplicationsPage(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)redirect('/signin?next=/member/applications');

  // My Mettelo Applications is the existing project-request tracker route.
  // It now presents Phase 6 `interest` rows truthfully while retaining legacy
  // role-specific `application` rows in the same canonical tracker.
  // Recruitment applications remain owned by /careers/applications.
  // Do not join legacy project_roles through the member client: authenticated
  // intentionally has no SELECT grant there. requested_role is the legacy label.
  const primary=await auth
    .from('project_applications')
    .select('id,status,submitted_at,updated_at,project_id,project_run_id,application_kind,requested_role,projects(title,status,project_type,team_size_threshold,forming_deadline,kickoff_at)')
    .eq('user_id',user.id)
    .order('submitted_at',{ascending:false});

  let projectData:unknown=primary.data;
  let error:ProjectQueryError=primary.error;
  if(isHistoricalProjectApplicationColumnError(error)){
    const fallback=await auth
      .from('project_applications')
      .select('id,status,submitted_at,updated_at,project_id,projects(title,status,project_type,team_size_threshold,forming_deadline,kickoff_at)')
      .eq('user_id',user.id)
      .order('submitted_at',{ascending:false});
    projectData=fallback.data;
    error=fallback.error;
  }

  if(error)console.error('member project requests query failed',error);
  const applications=(projectData||[]) as unknown as Application[];
  const applicationIds=applications.map(item=>item.id);
  const runIds=[...new Set(applications.map(item=>item.project_run_id).filter((id):id is string=>Boolean(id)))];

  const {data:eventRows}=applicationIds.length
    ? await auth.from('project_application_events').select('id,application_id,from_status,to_status,created_at').in('application_id',applicationIds).order('created_at',{ascending:true})
    : {data:[] as AppEvent[]};
  const events=(eventRows||[]) as AppEvent[];

  const formation=new Map<string,{filled:number;threshold:number;status:string;is_full:boolean;kickoff_at:string|null;forming_deadline:string|null;run_number:number|null}>();
  const service=serviceDb();
  if(service&&runIds.length){
    const [{data:runs},{data:members}]=await Promise.all([
      service.from('project_runs').select('id,project_id,run_number,status,team_size_threshold,kickoff_at').in('id',runIds),
      service.from('project_members').select('project_run_id,membership_status').in('project_run_id',runIds).in('membership_status',['waiting','active'])
    ]);
    for(const run of runs||[]){
      const app=applications.find(item=>item.project_run_id===run.id);
      const filled=(members||[]).filter(member=>member.project_run_id===run.id).length;
      const threshold=Number(run.team_size_threshold||app?.projects?.team_size_threshold||1);
      formation.set(run.id,{filled,threshold,status:run.status,is_full:filled>=threshold,kickoff_at:run.kickoff_at||app?.projects?.kickoff_at||null,forming_deadline:app?.projects?.forming_deadline||null,run_number:run.run_number||null});
    }
  }

  const enriched=applications.map(item=>({...item,formation:item.project_run_id?formation.get(item.project_run_id)||null:null,events:events.filter(event=>event.application_id===item.id)}));

  return <div className="applicationsPage">
    <MemberPageHeader
      eyebrow="MY WORK · PROJECT REQUESTS"
      title="Applications"
      titleId="applications-title"
      description="Track project interests submitted through the new project journey alongside any legacy project applications. Follow each request from submission through review, team formation, confirmation or closure."
      actions={<><a className="applicationsButton applicationsButtonDark" href="/member/discover">Discover projects</a><a className="applicationsButton" href="/member/recommended">Recommended</a></>}
    />

    {error
      ? <section className="applicationsError" role="alert"><h2>We couldn’t load your project requests</h2><p>Refresh the page to try again. Your project data has not been changed.</p></section>
      : <MemberApplicationTracker applications={enriched}/>}

    <style>{`
      .applicationsPage{width:min(100%,1240px);margin:0;min-width:0;color:#111318}
      .applicationsButton{min-height:44px;padding:0 15px;border:1px solid #b8c0c9;border-radius:10px;background:#fff;color:#111318;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-size:13px;font-weight:800}
      .applicationsButtonDark{background:#111318;border-color:#111318;color:#fff}
      .applicationsButton:focus-visible{outline:3px solid #173f8f;outline-offset:3px}
      .applicationsError{margin-top:20px;padding:20px;border:1px solid #d0a0a0;border-radius:14px;background:#fff}
      .applicationsError h2{margin:0 0 6px;font-size:1.1rem}.applicationsError p{margin:0;color:#59636f}
      @media(max-width:480px){.applicationsButton{font-size:13px}}
    `}</style>
  </div>;
}