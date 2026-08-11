import type {SupabaseClient} from '@supabase/supabase-js';

type Metric={verified:number;completed:number;discussion:number;attendance:number;lead:number;meetings:number;evidence:number};
type Candidate={userId:string;name:string;headline:string|null;avatarUrl:string|null;metric:Metric};
type Award={category:'builder'|'collaborator'|'leader';title:string;summary:string;userId:string;score:number;breakdown:Record<string,number>};

const zero=():Metric=>({verified:0,completed:0,discussion:0,attendance:0,lead:0,meetings:0,evidence:0});
const clamp=(value:number,max:number)=>Math.min(value,max);

export function previousMonth(reference=new Date()){
  const end=new Date(Date.UTC(reference.getUTCFullYear(),reference.getUTCMonth(),1));
  const start=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()-1,1));
  return {start,end,awardMonth:start.toISOString().slice(0,10)};
}

export async function buildMonthlyAwards(db:SupabaseClient,reference=new Date()){
  const {start,end,awardMonth}=previousMonth(reference);const from=start.toISOString();const to=end.toISOString();
  const [profiles,tasks,contributions,discussions,attendance,members,meetings]=await Promise.all([
    db.from('profiles').select('id,full_name,headline,avatar_url').eq('is_public',true),
    db.from('project_tasks').select('assignee_user_id,status,evidence_url,updated_at').not('assignee_user_id','is',null).gte('updated_at',from).lt('updated_at',to),
    db.from('contributions').select('user_id,verification_status,verified_at').eq('verification_status','verified').gte('verified_at',from).lt('verified_at',to),
    db.from('project_discussions').select('author_user_id,created_at').gte('created_at',from).lt('created_at',to),
    db.from('event_registrations').select('user_id,attended,registered_at').eq('attended',true).gte('registered_at',from).lt('registered_at',to),
    db.from('project_members').select('user_id,team_role,joined_at,activated_at,membership_status').in('team_role',['project_lead','lead']).in('membership_status',['active','completed']),
    db.from('project_meetings').select('organiser_user_id,starts_at,status').gte('starts_at',from).lt('starts_at',to)
  ]);
  const map=new Map<string,Candidate>();
  for(const profile of profiles.data||[]){map.set(profile.id,{userId:profile.id,name:profile.full_name?.trim()||'Mettelo member',headline:profile.headline||null,avatarUrl:profile.avatar_url||null,metric:zero()});}
  for(const row of tasks.data||[]){const c=row.assignee_user_id&&map.get(row.assignee_user_id);if(!c)continue;if(['done','completed'].includes(row.status)){c.metric.completed++;if(row.evidence_url)c.metric.evidence++;}}
  for(const row of contributions.data||[]){const c=map.get(row.user_id);if(c)c.metric.verified++;}
  for(const row of discussions.data||[]){const c=map.get(row.author_user_id);if(c)c.metric.discussion++;}
  for(const row of attendance.data||[]){const c=map.get(row.user_id);if(c)c.metric.attendance++;}
  for(const row of members.data||[]){const c=map.get(row.user_id);if(c)c.metric.lead++;}
  for(const row of meetings.data||[]){const c=row.organiser_user_id&&map.get(row.organiser_user_id);if(c&&row.status!=='cancelled')c.metric.meetings++;}

  const rows=[...map.values()];const used=new Set<string>();
  const definitions=[
    {category:'builder' as const,title:'Builder of the Month',score:(m:Metric)=>clamp(m.verified*50,100)+clamp(m.completed*12,48)+clamp(m.evidence*8,24),summary:(m:Metric)=>`${m.verified} verified contribution${m.verified===1?'':'s'} · ${m.completed} completed task${m.completed===1?'':'s'} · ${m.evidence} task evidence link${m.evidence===1?'':'s'}`},
    {category:'collaborator' as const,title:'Collaborator of the Month',score:(m:Metric)=>clamp(m.discussion*2,30)+clamp(m.attendance*10,30)+clamp(m.completed*8,40)+clamp(m.verified*20,40),summary:(m:Metric)=>`${m.discussion} project contribution${m.discussion===1?'':'s'} to discussion · ${m.attendance} attended event${m.attendance===1?'':'s'} · ${m.completed} completed task${m.completed===1?'':'s'}`},
    {category:'leader' as const,title:'Project Leader of the Month',score:(m:Metric)=>clamp(m.lead*50,50)+clamp(m.meetings*10,30)+clamp(m.completed*5,20)+clamp(m.verified*15,30),summary:(m:Metric)=>`${m.lead} active project-lead role${m.lead===1?'':'s'} · ${m.meetings} meeting${m.meetings===1?'':'s'} organised · ${m.completed} completed task${m.completed===1?'':'s'}`}
  ];
  const awards:Award[]=[];
  for(const definition of definitions){
    const ranked=rows.map(candidate=>({candidate,score:definition.score(candidate.metric)})).filter(row=>row.score>0&&!used.has(row.candidate.userId)).sort((a,b)=>b.score-a.score||a.candidate.name.localeCompare(b.candidate.name));
    const winner=ranked[0];if(!winner)continue;used.add(winner.candidate.userId);
    awards.push({category:definition.category,title:definition.title,summary:definition.summary(winner.candidate.metric),userId:winner.candidate.userId,score:winner.score,breakdown:winner.candidate.metric});
  }
  return {awardMonth,from,to,eligible:rows.filter(c=>Object.values(c.metric).some(Boolean)).length,awards};
}

export async function createMonthlySpotlightDrafts(db:SupabaseClient,reference=new Date()){
  const result=await buildMonthlyAwards(db,reference);
  if(result.awards.length<3)return {...result,created:0,reason:'At least three distinct eligible members are required.'};
  const {data:existing}=await db.from('spotlights').select('id').eq('award_month',result.awardMonth).neq('status','archived').limit(1);
  if(existing?.length)return {...result,created:0,reason:'Monthly Spotlight already exists.'};
  const rows=result.awards.map((award,index)=>({user_id:award.userId,title:award.title,category:award.category,summary:award.summary,status:'draft',award_month:result.awardMonth,score:award.score,score_breakdown:award.breakdown,rank_position:index+1,selection_method:'automatic'}));
  const {error}=await db.from('spotlights').insert(rows);if(error)throw error;
  return {...result,created:rows.length,reason:null};
}
