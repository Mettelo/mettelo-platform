import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import MemberApplicationTracker from '@/components/MemberApplicationTracker';

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

  // My Mettelo Applications is project-participation only. Recruitment is owned by
  // /careers/applications so candidates have one clear source of truth for interviews,
  // offers and onboarding. Do not join project_roles through the member client because
  // authenticated members intentionally do not have direct SELECT access to that table.
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

  if(error)console.error('member project applications query failed',error);
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

  const enriched=applications.map(item=>({...item,project_roles:item.requested_role?{title:item.requested_role}:null,formation:item.project_run_id?formation.get(item.project_run_id)||null:null,events:events.filter(event=>event.application_id===item.id)}));
  const activeProjectCount=enriched.filter(item=>!['declined','withdrawn'].includes(item.status)&&item.projects?.status!=='cancelled').length;

  return <section className="section softSection memberWorkspace"><div className="shell">
    <div className="sectionHead"><div><div className="eyebrow">PROJECT APPLICATIONS</div><h1>Know exactly what is happening next.</h1></div><p>Track project applications here from submission through team formation and confirmation. Recruitment applications, interviews and offers are kept separately in Careers.</p></div>
    <div className="applicationSummary" aria-label="Project application summary"><div><strong>{activeProjectCount}</strong><span>active project application{activeProjectCount===1?'':'s'}</span></div><div className="applicationSummaryActions"><a className="button dark" href="/member/discover">Discover projects →</a><a className="button ghost" href="/careers/applications">Career applications</a></div></div>
    {error?<section className="panel applicationPanel" role="alert"><h2>We couldn’t load your applications</h2><p>Refresh the page to try again. Your project data has not been changed.</p></section>:<section className="panel applicationPanel"><div className="panelHead"><div><span className="cardNumber">PROJECT APPLICATIONS</span><h2 style={{marginTop:8,fontSize:'1.35rem'}}>Your project journey</h2></div><span className="chip">{enriched.length}</span></div><p className="sectionHelper">The newest application appears first. Open each card to understand the current state, team progress and recorded timeline.</p><MemberApplicationTracker applications={enriched}/></section>}
  </div><style>{`.applicationSummary{display:grid;grid-template-columns:minmax(180px,auto) minmax(280px,1fr);gap:10px;align-items:stretch;margin:0 0 20px}.applicationSummary>div:not(.applicationSummaryActions){min-width:180px;display:grid;align-content:center;gap:4px;padding:16px 18px;border:1px solid rgba(16,19,29,.08);border-radius:14px;background:#fff}.applicationSummary strong{font-size:1.45rem}.applicationSummary span{color:#5b6470;font-size:.71rem}.applicationSummaryActions{display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 12px 12px}.applicationPanel{margin-top:18px;border-radius:18px!important}.sectionHelper{margin:-4px 0 18px;color:#5b6470;font-size:.79rem;line-height:1.55}@media(max-width:760px){.applicationSummary{grid-template-columns:1fr}.applicationSummaryActions{display:grid;padding:0}.applicationSummaryActions .button{width:100%}.applicationPanel{padding:16px!important}}`}</style></section>;
}
