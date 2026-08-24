import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import MemberEventsPanel from '@/components/MemberEventsPanel';
import {serviceDb} from '@/lib/project-flow';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export const metadata:Metadata={title:'My Events',description:'Your project sessions, presentations and optional learning events.'};
export const dynamic='force-dynamic';

const eventFields='id,project_id,project_run_id,title,purpose,event_type,visibility,learning_objectives,starts_at,ends_at,timezone,capacity,registration_deadline,status';

export default async function MemberEvents(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)redirect('/signin?next=/member/events');
  const db=serviceDb();
  const nowIso=new Date().toISOString();
  let events:Record<string,unknown>[]=[];

  if(db){
    const historyCutoff=new Date(Date.now()-90*24*60*60*1000).toISOString();
    const [{data:registrations},{data:participants},{data:memberships},{data:learningEvents}]=await Promise.all([
      db.from('project_event_registrations').select('event_id,status').eq('user_id',user.id).neq('status','cancelled'),
      db.from('project_event_participants').select('event_id').eq('user_id',user.id),
      db.from('project_members').select('project_run_id').eq('user_id',user.id).in('membership_status',['active','completed']),
      db.from('project_meetings').select(eventFields).in('visibility',['community_learning','approval_required']).eq('event_type','learning_session').in('status',['scheduled','completed','cancelled']).gte('starts_at',historyCutoff).order('starts_at'),
    ]);
    const participantIds=new Set((participants||[]).map(row=>row.event_id));
    const runIds=[...new Set((memberships||[]).map(row=>row.project_run_id))];
    const runIdSet=new Set(runIds);
    const eventIds=[...new Set([...(registrations||[]).map(row=>row.event_id),...participantIds])];
    const {data:assigned}=eventIds.length||runIds.length
      ?await db.from('project_meetings').select(eventFields).in('status',['scheduled','completed','cancelled']).gte('starts_at',historyCutoff).or([
        eventIds.length?`id.in.(${eventIds.join(',')})`:'',
        runIds.length?`project_run_id.in.(${runIds.join(',')})`:'',
      ].filter(Boolean).join(',')).order('starts_at')
      :{data:[]};
    const statuses=new Map((registrations||[]).map(row=>[row.event_id,row.status]));
    const isAdmin=user.app_metadata?.role==='admin';
    const byId=new Map<string,Record<string,unknown>>();
    for(const item of [...(assigned||[]),...(learningEvents||[])]){
      const registrationStatus=statuses.get(item.id)||null;
      const joinEntitled=Boolean(
        isAdmin||
        participantIds.has(item.id)||
        runIdSet.has(item.project_run_id)||
        registrationStatus==='reserved'
      );
      byId.set(item.id,{...item,registrationStatus,joinEntitled});
    }
    events=[...byId.values()].sort((a,b)=>String(a.starts_at).localeCompare(String(b.starts_at)));
  }

  return <section className="softSection memberWorkspace memberEventsPage"><div className="memberEventsWrap">
    <header className="memberEventsHero"><div><div className="eyebrow">MY WORK · EVENTS</div><h1>Your event schedule.</h1></div><p>Project sessions, required reviews and optional learning events in one place. Registering for an event never grants access to a private project workspace.</p></header>
    <MemberEventsPanel events={events as never[]} nowIso={nowIso}/>
  </div><style>{`
    .memberEventsPage{min-width:0;padding:4px 0 40px;background:var(--sand-2)}
    .memberEventsWrap{width:min(100%,1240px);margin:0;min-width:0}
    .memberEventsHero{display:grid;grid-template-columns:minmax(0,.72fr) minmax(320px,1fr);gap:44px;align-items:end;margin:4px 0 22px;min-width:0}
    .memberEventsHero>div,.memberEventsHero>p{min-width:0}
    .memberEventsHero .eyebrow{margin-bottom:10px}
    .memberEventsHero h1{margin:0;font-size:clamp(2rem,3.2vw,3rem);line-height:1.04;letter-spacing:-.04em;overflow-wrap:break-word}
    .memberEventsHero p{max-width:660px;margin:0;color:var(--slate);font-size:.9rem;line-height:1.62;overflow-wrap:break-word}
    @media(max-width:900px){.memberEventsHero{grid-template-columns:1fr;gap:10px;align-items:start}.memberEventsHero p{max-width:760px}}
    @media(max-width:760px){.memberEventsPage{padding-top:0;padding-bottom:24px}.memberEventsHero{margin-bottom:16px}.memberEventsHero h1{font-size:clamp(1.75rem,8vw,2.25rem)}.memberEventsHero p{font-size:.84rem;line-height:1.55}}
  `}</style></section>;
}
