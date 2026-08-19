import type {SupabaseClient} from '@supabase/supabase-js';
import {recordSpotlightEvent,requestSpotlightConsent} from '@/lib/spotlight-workflow';

type Metric={verified:number;completed:number;discussion:number;attendance:number;lead:number;meetings:number;evidence:number};
type Evidence={id:string;title:string;projectId:string|null;verifiedAt:string|null};
type Candidate={userId:string;name:string;metric:Metric;evidence:Evidence[]};
type Category='builder'|'collaborator'|'leader';
type RankedAward={category:Category;title:string;summary:string;userId:string;score:number;breakdown:Record<string,number>;evidence:Evidence[];primaryProjectId:string|null};

const zero=():Metric=>({verified:0,completed:0,discussion:0,attendance:0,lead:0,meetings:0,evidence:0});
const clamp=(value:number,max:number)=>Math.min(value,max);

const definitions=[
  {category:'builder' as const,title:'Builder of the Month',score:(m:Metric)=>clamp(m.verified*50,100)+clamp(m.completed*12,48)+clamp(m.evidence*8,24),summary:(m:Metric)=>`${m.verified} verified contribution${m.verified===1?'':'s'} · ${m.completed} completed task${m.completed===1?'':'s'} · ${m.evidence} task evidence link${m.evidence===1?'':'s'}`},
  {category:'collaborator' as const,title:'Collaborator of the Month',score:(m:Metric)=>clamp(m.discussion*2,30)+clamp(m.attendance*10,30)+clamp(m.completed*8,40)+clamp(m.verified*20,40),summary:(m:Metric)=>`${m.verified} verified contribution${m.verified===1?'':'s'} · ${m.discussion} project discussion contribution${m.discussion===1?'':'s'} · ${m.attendance} attended event${m.attendance===1?'':'s'} · ${m.completed} completed task${m.completed===1?'':'s'}`},
  {category:'leader' as const,title:'Project Leader of the Month',score:(m:Metric)=>clamp(m.lead*50,50)+clamp(m.meetings*10,30)+clamp(m.completed*5,20)+clamp(m.verified*15,30),summary:(m:Metric)=>`${m.verified} verified contribution${m.verified===1?'':'s'} · ${m.lead} active project-lead role${m.lead===1?'':'s'} · ${m.meetings} meeting${m.meetings===1?'':'s'} organised · ${m.completed} completed task${m.completed===1?'':'s'}`}
];

export function previousMonth(reference=new Date()){
  const end=new Date(Date.UTC(reference.getUTCFullYear(),reference.getUTCMonth(),1));
  const start=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()-1,1));
  return {start,end,awardMonth:start.toISOString().slice(0,10)};
}

function referenceForAwardMonth(awardMonth:string){
  const date=new Date(`${awardMonth}T00:00:00Z`);
  if(Number.isNaN(date.getTime()))throw new Error('Invalid Spotlight award month.');
  return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,2));
}

async function rowsOrThrow<T>(promise:PromiseLike<{data:T[]|null;error:unknown}>){
  const result=await promise;if(result.error)throw result.error;return result.data||[];
}

export async function buildMonthlyRankings(db:SupabaseClient,reference=new Date()){
  const {start,end,awardMonth}=previousMonth(reference);const from=start.toISOString();const to=end.toISOString();
  const [profiles,tasks,contributions,discussions,attendance,members,meetings]=await Promise.all([
    rowsOrThrow(db.from('profiles').select('id,full_name')),
    rowsOrThrow(db.from('project_tasks').select('assignee_user_id,status,evidence_url,updated_at').not('assignee_user_id','is',null).gte('updated_at',from).lt('updated_at',to)),
    rowsOrThrow(db.from('contributions').select('id,user_id,title,project_id,verification_status,verified_at').eq('verification_status','verified').gte('verified_at',from).lt('verified_at',to)),
    rowsOrThrow(db.from('project_discussions').select('author_user_id,created_at').gte('created_at',from).lt('created_at',to)),
    rowsOrThrow(db.from('event_registrations').select('user_id,attended,registered_at').eq('attended',true).gte('registered_at',from).lt('registered_at',to)),
    rowsOrThrow(db.from('project_members').select('user_id,team_role,joined_at,activated_at,membership_status').in('team_role',['project_lead','lead']).in('membership_status',['active','completed'])),
    rowsOrThrow(db.from('project_meetings').select('organiser_user_id,starts_at,status').gte('starts_at',from).lt('starts_at',to))
  ]);

  const map=new Map<string,Candidate>();
  for(const profile of profiles as {id:string;full_name:string|null}[]){map.set(profile.id,{userId:profile.id,name:profile.full_name?.trim()||'Mettelo member',metric:zero(),evidence:[]});}
  for(const row of tasks as {assignee_user_id:string|null;status:string;evidence_url:string|null}[]){const c=row.assignee_user_id&&map.get(row.assignee_user_id);if(!c)continue;if(['done','completed'].includes(row.status)){c.metric.completed++;if(row.evidence_url)c.metric.evidence++;}}
  for(const row of contributions as {id:string;user_id:string;title:string;project_id:string|null;verified_at:string|null}[]){const c=map.get(row.user_id);if(!c)continue;c.metric.verified++;c.evidence.push({id:row.id,title:row.title,projectId:row.project_id,verifiedAt:row.verified_at});}
  for(const row of discussions as {author_user_id:string}[]){const c=map.get(row.author_user_id);if(c)c.metric.discussion++;}
  for(const row of attendance as {user_id:string}[]){const c=map.get(row.user_id);if(c)c.metric.attendance++;}
  for(const row of members as {user_id:string}[]){const c=map.get(row.user_id);if(c)c.metric.lead++;}
  for(const row of meetings as {organiser_user_id:string|null;status:string}[]){const c=row.organiser_user_id&&map.get(row.organiser_user_id);if(c&&row.status!=='cancelled')c.metric.meetings++;}

  // Spotlight recognition must always be traceable to verified evidence. Other real
  // activity changes the category score, but cannot create a winner on its own.
  const eligible=[...map.values()].filter(candidate=>candidate.metric.verified>0);
  const rankings=new Map<Category,RankedAward[]>();
  for(const definition of definitions){
    const ranked=eligible.map(candidate=>({
      category:definition.category,
      title:definition.title,
      summary:definition.summary(candidate.metric),
      userId:candidate.userId,
      score:definition.score(candidate.metric),
      breakdown:{...candidate.metric},
      evidence:[...candidate.evidence].sort((a,b)=>(b.verifiedAt||'').localeCompare(a.verifiedAt||'')),
      primaryProjectId:candidate.evidence.find(item=>item.projectId)?.projectId||null
    })).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||map.get(a.userId)!.name.localeCompare(map.get(b.userId)!.name));
    rankings.set(definition.category,ranked);
  }
  return {awardMonth,from,to,eligible:eligible.length,rankings};
}

export async function buildMonthlyAwards(db:SupabaseClient,reference=new Date()){
  const result=await buildMonthlyRankings(db,reference);const used=new Set<string>();const awards:RankedAward[]=[];
  for(const definition of definitions){const winner=(result.rankings.get(definition.category)||[]).find(item=>!used.has(item.userId));if(!winner)continue;used.add(winner.userId);awards.push(winner);}
  return {awardMonth:result.awardMonth,from:result.from,to:result.to,eligible:result.eligible,awards};
}

export async function createMonthlySpotlightDrafts(db:SupabaseClient,reference=new Date()){
  const result=await buildMonthlyRankings(db,reference);
  const {data:existing,error:existingError}=await db.from('spotlights')
    .select('id,user_id,category,status,is_excluded,consent_status')
    .eq('award_month',result.awardMonth);
  if(existingError)throw existingError;

  const active=(existing||[]).filter(item=>item.status!=='archived'&&!item.is_excluded);
  const blockedUsers=new Set((existing||[]).filter(item=>item.is_excluded).map(item=>item.user_id).filter(Boolean) as string[]);
  const used=new Set(active.map(item=>item.user_id).filter(Boolean) as string[]);
  const activeCategories=new Set(active.map(item=>item.category as Category));
  let created=0;

  for(const definition of definitions){
    if(activeCategories.has(definition.category))continue;
    const winner=(result.rankings.get(definition.category)||[]).find(item=>!used.has(item.userId)&&!blockedUsers.has(item.userId));
    if(!winner)continue;
    const {data:item,error}=await db.from('spotlights').insert({
      user_id:winner.userId,
      title:winner.title,
      category:winner.category,
      summary:winner.summary,
      status:'draft',
      award_month:result.awardMonth,
      score:winner.score,
      score_breakdown:winner.breakdown,
      rank_position:1,
      selection_method:existing?.length?'override':'automatic',
      primary_project_id:winner.primaryProjectId,
      selected_at:new Date().toISOString(),
      consent_status:'not_requested'
    }).select('id').single();
    if(error)throw error;

    const evidenceRows=winner.evidence.slice(0,6).map((evidence,index)=>({
      spotlight_id:item.id,
      contribution_id:evidence.id,
      project_id:evidence.projectId,
      source_label:evidence.title,
      is_primary:index===0
    }));
    if(evidenceRows.length){const {error:evidenceError}=await db.from('spotlight_evidence').insert(evidenceRows);if(evidenceError)throw evidenceError;}
    await recordSpotlightEvent(db,item.id,existing?.length?'replacement_selected':'selected',null,{award_month:result.awardMonth,category:winner.category});
    await requestSpotlightConsent(db,item.id);
    used.add(winner.userId);activeCategories.add(winner.category);created++;
  }

  return {
    awardMonth:result.awardMonth,
    from:result.from,
    to:result.to,
    eligible:result.eligible,
    created,
    activeAwards:activeCategories.size,
    reason:created?'Automatic evidence-backed Spotlight recognition created.':activeCategories.size?'Monthly Spotlight already reconciled.':'No eligible evidence-backed Spotlight winner is available.'
  };
}

export async function replaceExcludedSpotlight(db:SupabaseClient,awardMonth:string){
  return createMonthlySpotlightDrafts(db,referenceForAwardMonth(awardMonth));
}
