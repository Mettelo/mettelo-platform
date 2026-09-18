import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

function clean(value:string|null,max=80){return String(value||'').trim().slice(0,max)}
function norm(value:unknown){return String(value||'').trim().toLocaleLowerCase('en-GB')}
function unique(values:string[]){return [...new Set(values.map(value=>value.trim()).filter(Boolean))]}
function includesLoose(value:string,term:string){return norm(value).includes(norm(term))}
function availabilityRank(value:unknown){const item=norm(value);if(item.includes('available now'))return 0;if(item.includes('open'))return 1;if(item.includes('limited'))return 2;return 3}

type BaseMember={
 id?:string;
 username:string;
 full_name:string|null;
 headline:string|null;
 current_job_title:string|null;
 professional_area:string|null;
 experience_level:string|null;
 project_availability:string|null;
 weekly_capacity:string|null;
 skills:string[]|null;
 preferred_roles:string[]|null;
 avatar_url:string|null;
};
type DiscoveryMember=Omit<BaseMember,'id'> & {
 invitation_state?:'pending'|null;
 match_label?:string|null;
 match_detail?:string|null;
 match_skills?:string[];
};
type Signals={
 projectSkills:string[];
 projectRoles:string[];
 projectAreas:string[];
 memberSkills:string[];
 memberRoles:string[];
 memberArea:string|null;
};

function explain(member:BaseMember,signals:Signals){
 const skills=unique(member.skills||[]);
 const skillNorm=new Map(skills.map(skill=>[norm(skill),skill]));
 const projectMatches=signals.projectSkills.filter(signal=>skillNorm.has(norm(signal))).map(signal=>skillNorm.get(norm(signal))!).filter(Boolean);
 const shared=signals.memberSkills.filter(signal=>skillNorm.has(norm(signal))).map(signal=>skillNorm.get(norm(signal))!).filter(Boolean);
 const complementary=projectMatches.filter(skill=>!signals.memberSkills.some(own=>norm(own)===norm(skill)));
 const memberRole=[member.current_job_title,...(member.preferred_roles||[])].filter(Boolean).map(value=>String(value));
 const roleFit=signals.projectRoles.some(target=>memberRole.some(role=>includesLoose(role,target)||includesLoose(target,role)))||signals.memberRoles.some(target=>memberRole.some(role=>includesLoose(role,target)||includesLoose(target,role)));
 const areaFit=Boolean(member.professional_area&&(signals.projectAreas.some(area=>includesLoose(member.professional_area!,area)||includesLoose(area,member.professional_area!))||(signals.memberArea&&includesLoose(member.professional_area,signals.memberArea))));
 const available=availabilityRank(member.project_availability)<=1;

 let label='Relevant professional fit';
 let detail='Professional background may complement your collaboration network.';
 let matched=unique(projectMatches.length?projectMatches:shared).slice(0,4);
 if(projectMatches.length>=2){label='Strong skill match';detail=`${projectMatches.length} relevant capabilities for the current project.`}
 else if(complementary.length){label='Complementary skills';detail=`Matches a current project need: ${complementary.slice(0,2).join(', ')}.`}
 else if(shared.length>=2){label='Strong skill match';detail=`Shared skills: ${shared.slice(0,3).join(', ')}.`}
 else if(projectMatches.length===1){label='Relevant project capability';detail=`Relevant capability: ${projectMatches[0]}.`}
 else if(available){label='Available now';detail='Availability indicates this member is open to relevant project work.'}
 else if(roleFit){label='Relevant role fit';detail='Role preference aligns with your current collaboration context.'}
 else if(areaFit){label='Relevant professional area';detail='Professional area aligns with your collaboration context.'}

 return{
  label,detail,matched,
  sort:[
   availabilityRank(member.project_availability),
   projectMatches.length?0:1,
   -projectMatches.length,
   shared.length?0:1,
   -shared.length,
   roleFit?0:1,
   areaFit?0:1,
   member.weekly_capacity?0:1,
   norm(member.username)
  ] as (number|string)[]
 };
}

function compareTuple(a:(number|string)[],b:(number|string)[]){
 for(let i=0;i<Math.max(a.length,b.length);i++){
  const av=a[i]??'',bv=b[i]??'';
  if(typeof av==='number'&&typeof bv==='number'&&av!==bv)return av-bv;
  const compared=String(av).localeCompare(String(bv),'en-GB');
  if(compared)return compared;
 }
 return 0;
}

async function contextExclusions(db:NonNullable<ReturnType<typeof serviceDb>>,actor:string,projectId:string|null,runId:string|null){
 const blockedIds=new Set<string>();
 const {data:blocks}=await db.from('member_interaction_blocks').select('blocker_user_id,blocked_user_id').or(`blocker_user_id.eq.${actor},blocked_user_id.eq.${actor}`).limit(500);
 for(const block of blocks||[]){
  const other=String(block.blocker_user_id)===actor?String(block.blocked_user_id):String(block.blocker_user_id);
  if(other)blockedIds.add(other);
 }
 const teamIds=new Set<string>(),pendingIds=new Set<string>();
 if(projectId&&runId){
  const [{data:team},{data:pending}]=await Promise.all([
   db.from('project_members').select('user_id').eq('project_id',projectId).eq('project_run_id',runId).in('membership_status',['waiting','active','completed']).limit(200),
   db.from('project_member_collaboration_invitations').select('invitee_user_id').eq('project_id',projectId).eq('project_run_id',runId).eq('invited_by',actor).eq('status','pending').gt('expires_at',new Date().toISOString()).limit(200)
  ]);
  for(const item of team||[])teamIds.add(String(item.user_id));
  for(const item of pending||[])pendingIds.add(String(item.invitee_user_id));
 }
 return{blockedIds,teamIds,pendingIds};
}

async function loadSignals(db:NonNullable<ReturnType<typeof serviceDb>>,actor:string,projectId:string|null,runId:string|null,needId:string|null):Promise<Signals>{
 const {data:profile}=await db.from('profiles').select('skills,preferred_roles,professional_area').eq('id',actor).maybeSingle();
 const memberSkills=unique((profile?.skills||[]) as string[]);
 const memberRoles=unique((profile?.preferred_roles||[]) as string[]);
 const memberArea=profile?.professional_area?String(profile.professional_area):null;
 if(!projectId||!runId)return{projectSkills:[],projectRoles:[],projectAreas:[],memberSkills,memberRoles,memberArea};

 const [{data:projectCaps},{data:projectRoles},{data:projectDomains},{data:need}]=await Promise.all([
  db.from('project_capabilities').select('capability_id,capabilities(name)').eq('project_id',projectId).limit(80),
  db.from('project_roles').select('title,skills,recommended_skills,responsibilities').eq('project_id',projectId).limit(80),
  db.from('project_domains').select('domain_id,domains(name)').eq('project_id',projectId).limit(20),
  needId?db.from('project_collaboration_needs').select('id,responsibility,target_role_catalogue_id,project_collaboration_need_capabilities(capability_id,capabilities(name)),project_role_catalogue(title)').eq('id',needId).eq('project_id',projectId).eq('project_run_id',runId).in('status',['active','needs_review']).maybeSingle():Promise.resolve({data:null})
 ]);

 const capNames=(projectCaps||[]).flatMap(item=>{
  const rel=item.capabilities as unknown as {name?:string}|{name?:string}[]|null;
  const row=Array.isArray(rel)?rel[0]:rel;
  return row?.name?[String(row.name)]:[];
 });
 const roleSignals=(projectRoles||[]).flatMap(item=>[
  String(item.title||''),
  ...(((item.skills||[]) as string[])),
  ...(((item.recommended_skills||[]) as string[])),
  ...(((item.responsibilities||[]) as string[]))
 ]);
 const domainNames=(projectDomains||[]).flatMap(item=>{
  const rel=item.domains as unknown as {name?:string}|{name?:string}[]|null;
  const row=Array.isArray(rel)?rel[0]:rel;
  return row?.name?[String(row.name)]:[];
 });
 const needCaps=((need?.project_collaboration_need_capabilities||[]) as unknown as {capabilities?:{name?:string}|{name?:string}[]|null}[]).flatMap(item=>{
  const rel=item.capabilities;const row=Array.isArray(rel)?rel[0]:rel;return row?.name?[String(row.name)]:[];
 });
 const roleRel=need?.project_role_catalogue as unknown as {title?:string}|{title?:string}[]|null;
 const roleRow=Array.isArray(roleRel)?roleRel[0]:roleRel;

 return{
  projectSkills:unique([...capNames,...roleSignals,...needCaps,need?.responsibility?String(need.responsibility):'']),
  projectRoles:unique([roleRow?.title?String(roleRow.title):'',...(projectRoles||[]).map(item=>String(item.title||''))]),
  projectAreas:unique(domainNames),
  memberSkills,memberRoles,memberArea
 };
}

async function recommend(db:NonNullable<ReturnType<typeof serviceDb>>,actor:string,signals:Signals,projectId:string|null,runId:string|null,limit:number){
 const {blockedIds,teamIds,pendingIds}=await contextExclusions(db,actor,projectId,runId);
 const {data:profiles,error}=await db.from('profiles')
  .select('id,username,full_name,headline,current_job_title,professional_area,experience_level,project_availability,weekly_capacity,skills,preferred_roles,avatar_url')
  .neq('id',actor).eq('is_public',true).not('username','is',null).limit(60);
 if(error)throw error;
 const ids=(profiles||[]).map(item=>String(item.id));
 const {data:privacy}=ids.length?await db.from('member_privacy_preferences').select('user_id,allow_project_invitations').in('user_id',ids):{data:[]};
 const privateIds=new Set((privacy||[]).filter(item=>item.allow_project_invitations===false).map(item=>String(item.user_id)));

 return (profiles||[])
  .filter(member=>{
   const id=String(member.id);
   return !blockedIds.has(id)&&!teamIds.has(id)&&!pendingIds.has(id)&&!privateIds.has(id);
  })
  .map(member=>({member:member as BaseMember,explain:explain(member as BaseMember,signals)}))
  .filter(item=>{
   const hasContext=signals.projectSkills.length||signals.projectRoles.length||signals.projectAreas.length||signals.memberSkills.length||signals.memberRoles.length||signals.memberArea;
   if(!hasContext)return true;
   const e=item.explain;
   return e.matched.length>0||e.label!=='Relevant professional fit'||availabilityRank(item.member.project_availability)<=1;
  })
  .sort((a,b)=>compareTuple(a.explain.sort,b.explain.sort))
  .slice(0,limit)
  .map(({member,explain:e})=>({
   username:member.username,full_name:member.full_name,headline:member.headline,current_job_title:member.current_job_title,
   professional_area:member.professional_area,experience_level:member.experience_level,project_availability:member.project_availability,
   weekly_capacity:member.weekly_capacity,skills:member.skills||[],preferred_roles:member.preferred_roles||[],avatar_url:member.avatar_url,
   invitation_state:null,match_label:e.label,match_detail:e.detail,match_skills:e.matched
  }));
}

export async function GET(request:Request){
 try{
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401,headers:{'Cache-Control':'private, no-store'}});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Member discovery is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});

  const url=new URL(request.url);
  const mode=url.searchParams.get('mode')==='recommend'?'recommend':'search';
  const query=clean(url.searchParams.get('q'));
  const projectId=clean(url.searchParams.get('project_id'))||null;
  const runId=clean(url.searchParams.get('project_run_id'))||null;
  const needId=clean(url.searchParams.get('collaboration_need'))||null;
  const requestedLimit=Number(url.searchParams.get('limit')||(mode==='recommend'?9:20));
  const limit=Number.isFinite(requestedLimit)?Math.min(Math.max(Math.trunc(requestedLimit),1),mode==='recommend'?12:20):(mode==='recommend'?9:20);

  if(projectId&&runId){
   const {data:membership}=await db.from('project_members').select('id').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).eq('membership_status','active').maybeSingle();
   if(!membership)return NextResponse.json({error:'This project collaboration context is no longer available.'},{status:403,headers:{'Cache-Control':'private, no-store'}});
  }

  if(mode==='recommend'){
   const signals=await loadSignals(db,user.id,projectId,runId,needId);
   const items=await recommend(db,user.id,signals,projectId,runId,limit);
   return NextResponse.json({items,mode:'recommend'},{headers:{'Cache-Control':'private, no-store'}});
  }

  if(query.length<2)return NextResponse.json({error:'Enter at least 2 characters to search for a member.'},{status:400,headers:{'Cache-Control':'private, no-store'}});
  const {data,error}=await auth.rpc('phase18_search_discoverable_members',{p_query:query,p_limit:limit});
  if(error){
   const message=String(error.message||'');
   if(message.includes('DISCOVERY_RATE_LIMITED'))return NextResponse.json({error:'Too many member searches. Try again shortly.',code:'DISCOVERY_RATE_LIMITED'},{status:429,headers:{'Cache-Control':'private, no-store','Retry-After':'60'}});
   if(message.includes('DISCOVERY_QUERY_TOO_SHORT'))return NextResponse.json({error:'Enter at least 2 characters to search for a member.'},{status:400,headers:{'Cache-Control':'private, no-store'}});
   if(message.includes('AUTHENTICATION_REQUIRED'))return NextResponse.json({error:'Authentication required.'},{status:401,headers:{'Cache-Control':'private, no-store'}});
   console.error('member discovery RPC failed',{code:error.code,message:error.message});
   return NextResponse.json({error:'Member search is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});
  }

  const raw=(data||[]) as DiscoveryMember[];
  const usernames=raw.map(item=>item.username).filter(Boolean);
  const {data:profiles}=usernames.length?await db.from('profiles').select('id,username').in('username',usernames):{data:[]};
  const idByUsername=new Map((profiles||[]).map(item=>[norm(item.username),String(item.id)]));
  const {blockedIds,teamIds,pendingIds}=await contextExclusions(db,user.id,projectId,runId);
  const signals=await loadSignals(db,user.id,projectId,runId,needId);
  const role=norm(url.searchParams.get('role')),capability=norm(url.searchParams.get('capability')),domain=norm(url.searchParams.get('domain')),availability=norm(url.searchParams.get('availability')),commitment=norm(url.searchParams.get('commitment'));

  const items=raw.filter(member=>{
   const id=idByUsername.get(norm(member.username));if(!id||blockedIds.has(id)||teamIds.has(id))return false;
   const roles=[member.current_job_title,...(member.preferred_roles||[])].map(norm).join(' ');
   const skills=(member.skills||[]).map(norm).join(' ');
   return(!role||roles.includes(role))&&(!capability||skills.includes(capability))&&(!domain||norm(member.professional_area).includes(domain))&&(!availability||norm(member.project_availability).includes(availability))&&(!commitment||norm(member.weekly_capacity).includes(commitment));
  }).map(member=>{
   const id=idByUsername.get(norm(member.username));
   const e=explain(member,signals);
   return{...member,invitation_state:id&&pendingIds.has(id)?'pending':null,match_label:e.label,match_detail:e.detail,match_skills:e.matched};
  });

  return NextResponse.json({items,mode:'search'},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('member discovery request failed',error instanceof Error?error.message:'member discovery failed');
  return NextResponse.json({error:'Member search is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});
 }
}
