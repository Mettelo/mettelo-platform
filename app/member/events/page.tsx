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
    const eventIds=[...new Set([...(registrations||[]).map(row=>row.event_id),...(participants||[]).map(row=>row.event_id)])];
    const runIds=[...new Set((memberships||[]).map(row=>row.project_run_id))];
    const {data:assigned}=eventIds.length||runIds.length
      ?await db.from('project_meetings').select(eventFields).in('status',['scheduled','completed','cancelled']).gte('starts_at',historyCutoff).or([
        eventIds.length?`id.in.(${eventIds.join(',')})`:'',
        runIds.length?`project_run_id.in.(${runIds.join(',')})`:'',
      ].filter(Boolean).join(',')).order('starts_at')
      :{data:[]};
    const statuses=new Map((registrations||[]).map(row=>[row.event_id,row.status]));
    const byId=new Map<string,Record<string,unknown>>();
    for(const item of [...(assigned||[]),...(learningEvents||[])])byId.set(item.id,{...item,registrationStatus:statuses.get(item.id)||null});
    events=[...byId.values()].sort((a,b)=>String(a.starts_at).localeCompare(String(b.starts_at)));
  }

  return <section className="section softSection"><div className="shell">
    <div className="sectionHead"><div><div className="eyebrow">MY WORK · EVENTS</div><h1>Your event schedule.</h1></div><p>Project sessions, required reviews and optional learning events in one place. Registering for an event never grants access to a private project workspace.</p></div>
    <MemberEventsPanel events={events as never[]} nowIso={nowIso}/>
  </div></section>;
}
