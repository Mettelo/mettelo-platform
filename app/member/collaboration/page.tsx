import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import MemberPageHeader from '@/components/MemberPageHeader';
import MemberCollaboratorDiscovery from '@/components/MemberCollaboratorDiscovery';
import CollaborationTeamCard from '@/components/collaboration/CollaborationTeamCard';
import networkStyles from '@/components/collaboration/CollaborationNetwork.module.css';

export const dynamic='force-dynamic';

type Search={
 view?:string|string[];
 project_id?:string|string[];
 project_run_id?:string|string[];
 collaboration_need?:string|string[];
 q?:string|string[];
 role?:string|string[];
 capability?:string|string[];
 domain?:string|string[];
 commitment?:string|string[];
};
type Capacity={available?:number;maximum?:number;occupied?:number;capacity_available?:boolean};
type Need={id:string;project_id:string;project_run_id:string;responsibility:string|null;target_role_catalogue_id:string|null;target_domain_id:string|null;weekly_commitment:string|null;member_message:string|null;status:string;source:string;created_at:string};
type TeamCard={need:Need;project:{id:string;title:string;summary:string|null;weekly_commitment:string|null};runStatus:string;role:string|null;domain:string|null;capabilities:string[];occupied:number;maximum:number;openPlaces:number};

function one(value:string|string[]|undefined){return Array.isArray(value)?value[0]||'':value||''}
function capOne<T>(value:T|T[]|null|undefined):T|null{return Array.isArray(value)?value[0]||null:value||null}
function human(value:string|null|undefined){return String(value||'').replace(/_/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase())}
function lower(value:string|null|undefined){return String(value||'').trim().toLocaleLowerCase('en-GB')}

function tabHref(view:'people'|'teams',context:{projectId:string;runId:string;needId:string}){
 const params=new URLSearchParams({view});
 if(context.projectId&&context.runId){params.set('project_id',context.projectId);params.set('project_run_id',context.runId)}
 if(context.needId)params.set('collaboration_need',context.needId);
 return `/member/collaboration?${params.toString()}`;
}

export default async function CollaborationNetworkPage({searchParams}:{searchParams?:Promise<Search>}){
 const params=await searchParams||{};
 const requestedView=one(params.view)==='teams'?'teams':'people';
 const requestedProjectId=one(params.project_id).trim(),requestedRunId=one(params.project_run_id).trim(),requestedNeedId=one(params.collaboration_need).trim();
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 const requestedNext=new URLSearchParams({view:requestedView});if(requestedProjectId&&requestedRunId){requestedNext.set('project_id',requestedProjectId);requestedNext.set('project_run_id',requestedRunId)}if(requestedNeedId)requestedNext.set('collaboration_need',requestedNeedId);
 if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/collaboration?${requestedNext.toString()}`)}`);
 const db=serviceDb();
 if(!db)return <main className="cnRoot"><MemberPageHeader eyebrow="DIRECTION & DISCOVERY · COLLABORATION" title="Collaboration Network" description="Find people to grow your current project, or discover teams that are actively looking for collaborators."/><div className="cnError" role="alert"><strong>We couldn’t load the Collaboration Network.</strong><p>Try again.</p></div></main>;

 let projectContext:null|{projectId:string;runId:string;needId:string;title:string;role:string;runState:string;occupied:number;maximum:number;openPlaces:number;recruitment:string}=null;
 let contextWarning='';
 if(requestedProjectId||requestedRunId){
  if(!requestedProjectId||!requestedRunId)contextWarning='Project context could not be verified. Open Collaboration Network from Mettelo Lab → Team and try again.';
  else{
   const [{data:project},{data:run},{data:membership},capacityResult]=await Promise.all([
    db.from('projects').select('id,title,status,late_joining_enabled,late_joining_cutoff_at').eq('id',requestedProjectId).maybeSingle(),
    db.from('project_runs').select('id,project_id,status,recruitment_open').eq('id',requestedRunId).eq('project_id',requestedProjectId).maybeSingle(),
    db.from('project_members').select('id,team_role,membership_status').eq('project_id',requestedProjectId).eq('project_run_id',requestedRunId).eq('user_id',user.id).eq('membership_status','active').maybeSingle(),
    db.rpc('phase9_project_run_capacity',{p_project_id:requestedProjectId,p_run_id:requestedRunId})
   ]);
   const capacity=capOne(capacityResult.data as Capacity|Capacity[]|null);
   if(project&&run&&membership&&capacity&&!capacityResult.error){
    let verifiedNeedId='';
    if(requestedNeedId){const {data:need}=await db.from('project_collaboration_needs').select('id').eq('id',requestedNeedId).eq('project_id',requestedProjectId).eq('project_run_id',requestedRunId).eq('status','active').maybeSingle();verifiedNeedId=need?.id||''}
    const cutoffClosed=Boolean(project.late_joining_cutoff_at&&Date.now()>=new Date(project.late_joining_cutoff_at).getTime());
    const recruitment=!['forming','active'].includes(run.status)||run.recruitment_open===false?'Closed':run.status==='active'&&(project.late_joining_enabled===false||cutoffClosed)?'Joining closed':capacity.capacity_available===false||Number(capacity.available||0)<1?'Full':'Open';
    projectContext={projectId:requestedProjectId,runId:requestedRunId,needId:verifiedNeedId,title:project.title,role:human(membership.team_role||'Contributor'),runState:human(run.status),occupied:Number(capacity.occupied||0),maximum:Number(capacity.maximum||0),openPlaces:Number(capacity.available||0),recruitment};
   }else contextWarning='Project context could not be verified. Team request controls remain unavailable until you open Collaboration Network from an active project.';
  }
 }

 const context={projectId:projectContext?.projectId||'',runId:projectContext?.runId||'',needId:projectContext?.needId||''};

 let teamCards:TeamCard[]=[];
 let teamsError='';
 if(requestedView==='teams'){
  const {data:needs,error}=await auth.from('project_collaboration_needs').select('id,project_id,project_run_id,responsibility,target_role_catalogue_id,target_domain_id,weekly_commitment,member_message,status,source,created_at').eq('status','active').neq('source','direct_invite').order('created_at',{ascending:false}).limit(36);
  if(error)teamsError='We couldn’t load teams looking for collaborators.';
  else{
   const rows=(needs||[]) as Need[];const projectIds=[...new Set(rows.map(item=>item.project_id))],runIds=[...new Set(rows.map(item=>item.project_run_id))],roleIds=[...new Set(rows.map(item=>item.target_role_catalogue_id).filter(Boolean))] as string[],domainIds=[...new Set(rows.map(item=>item.target_domain_id).filter(Boolean))] as string[],needIds=rows.map(item=>item.id);
   const [projectsResult,runsResult,rolesResult,domainsResult,linksResult]=await Promise.all([
    projectIds.length?db.from('projects').select('id,title,summary,status,visibility,weekly_commitment,late_joining_enabled,late_joining_cutoff_at').in('id',projectIds):Promise.resolve({data:[]}),
    runIds.length?db.from('project_runs').select('id,project_id,status,recruitment_open').in('id',runIds):Promise.resolve({data:[]}),
    roleIds.length?db.from('project_role_catalogue').select('id,title').in('id',roleIds).eq('active',true):Promise.resolve({data:[]}),
    domainIds.length?db.from('domains').select('id,name').in('id',domainIds).eq('is_active',true):Promise.resolve({data:[]}),
    needIds.length?db.from('project_collaboration_need_capabilities').select('collaboration_need_id,capability_id').in('collaboration_need_id',needIds):Promise.resolve({data:[]})
   ]);
   const capIds=[...new Set((linksResult.data||[]).map(item=>String(item.capability_id)))];
   const {data:capabilityRows}=capIds.length?await db.from('capabilities').select('id,name').in('id',capIds).eq('is_active',true):{data:[]};
   const projects=new Map((projectsResult.data||[]).map(item=>[String(item.id),item]));const runs=new Map((runsResult.data||[]).map(item=>[String(item.id),item]));const roles=new Map((rolesResult.data||[]).map(item=>[String(item.id),String(item.title)]));const domains=new Map((domainsResult.data||[]).map(item=>[String(item.id),String(item.name)]));const capabilityNames=new Map((capabilityRows||[]).map(item=>[String(item.id),String(item.name)]));const linksByNeed=new Map<string,string[]>();
   for(const link of linksResult.data||[]){const id=String(link.collaboration_need_id),current=linksByNeed.get(id)||[];current.push(String(link.capability_id));linksByNeed.set(id,current)}
   const candidates=await Promise.all(rows.map(async need=>{
    const project=projects.get(need.project_id),run=runs.get(need.project_run_id);if(!project||!run)return null;
    const cutoffClosed=Boolean(project.late_joining_cutoff_at&&Date.now()>=new Date(project.late_joining_cutoff_at).getTime());
    if(!['public','members'].includes(project.visibility)||['cancelled','completed','archived'].includes(project.status)||!['forming','active'].includes(run.status)||run.recruitment_open===false||(run.status==='active'&&(project.late_joining_enabled===false||cutoffClosed)))return null;
    const capacityResult=await db.rpc('phase9_project_run_capacity',{p_project_id:need.project_id,p_run_id:need.project_run_id});const capacity=capOne(capacityResult.data as Capacity|Capacity[]|null);if(capacityResult.error||!capacity||capacity.capacity_available!==true||Number(capacity.available||0)<1)return null;
    return{need,project:{id:String(project.id),title:String(project.title),summary:project.summary?String(project.summary):null,weekly_commitment:project.weekly_commitment?String(project.weekly_commitment):null},runStatus:String(run.status),role:need.target_role_catalogue_id?roles.get(need.target_role_catalogue_id)||null:null,domain:need.target_domain_id?domains.get(need.target_domain_id)||null:null,capabilities:(linksByNeed.get(need.id)||[]).map(id=>capabilityNames.get(id)).filter((value):value is string=>Boolean(value)),occupied:Number(capacity.occupied||0),maximum:Number(capacity.maximum||0),openPlaces:Number(capacity.available||0)} as TeamCard;
   }));
   teamCards=candidates.filter((item):item is TeamCard=>Boolean(item));
  }
 }

 const q=lower(one(params.q)),roleFilter=lower(one(params.role)),capabilityFilter=lower(one(params.capability)),domainFilter=lower(one(params.domain)),commitmentFilter=lower(one(params.commitment));
 const filteredTeams=teamCards.filter(item=>{const role=lower(item.role||item.need.responsibility),domain=lower(item.domain),commitment=lower(item.need.weekly_commitment||item.project.weekly_commitment),caps=item.capabilities.map(lower),haystack=lower([item.project.title,item.project.summary,item.need.responsibility,item.need.member_message,item.role,item.domain,item.need.weekly_commitment,...item.capabilities].filter(Boolean).join(' '));return(!q||haystack.includes(q))&&(!roleFilter||role.includes(roleFilter))&&(!capabilityFilter||caps.some(value=>value.includes(capabilityFilter)))&&(!domainFilter||domain.includes(domainFilter))&&(!commitmentFilter||commitment.includes(commitmentFilter))});
 const roleOptions=[...new Set(teamCards.map(item=>item.role||item.need.responsibility).filter((value):value is string=>Boolean(value)))].sort(),capabilityOptions=[...new Set(teamCards.flatMap(item=>item.capabilities))].sort(),domainOptions=[...new Set(teamCards.map(item=>item.domain).filter((value):value is string=>Boolean(value)))].sort(),commitmentOptions=[...new Set(teamCards.map(item=>item.need.weekly_commitment||item.project.weekly_commitment).filter((value):value is string=>Boolean(value)))].sort();

 return <main className="cnRoot">
  <MemberPageHeader eyebrow="DIRECTION & DISCOVERY · COLLABORATION" title="Collaboration Network" description="Find people to grow your current project, or discover teams that are actively looking for collaborators."/>
  <nav className="cnTabs" aria-label="Collaboration Network views">
   <Link aria-current={requestedView==='people'?'page':undefined} className={requestedView==='people'?'active':''} href={tabHref('people',context)}>People</Link>
   <Link aria-current={requestedView==='teams'?'page':undefined} className={requestedView==='teams'?'active':''} href={tabHref('teams',context)}>Teams &amp; Projects</Link>
  </nav>
  {contextWarning&&<div className="cnWarning" role="status">{contextWarning}</div>}
  {projectContext&&<section className="cnContext" aria-labelledby="current-project-context-title"><div><span>YOUR CURRENT PROJECT CONTEXT</span><h2 id="current-project-context-title">{projectContext.title}</h2><p>{projectContext.runState} project run · Your role: {projectContext.role}</p></div><dl><div><dt>Team</dt><dd>{projectContext.occupied} / {projectContext.maximum}</dd></div><div><dt>Open places</dt><dd>{projectContext.openPlaces}</dd></div><div><dt>Recruitment</dt><dd>{projectContext.recruitment}</dd></div></dl></section>}
  {requestedView==='people'?<MemberCollaboratorDiscovery projectId={projectContext?.projectId} projectRunId={projectContext?.runId} initialNeedId={projectContext?.needId} projectTitle={projectContext?.title}/>:<section className="cnTeams" aria-labelledby="teams-looking-title">
   <div className="cnSectionHead"><div><span>TEAMS &amp; PROJECTS</span><h2 id="teams-looking-title">Teams looking for collaborators</h2><p>Active project teams with a governed collaboration need and current capacity.</p></div></div>
   <form className={networkStyles.searchShell} method="get" action="/member/collaboration">
    <input type="hidden" name="view" value="teams"/>
    <label>
     <span className={networkStyles.searchLabel}>Search teams, roles, capabilities or domains</span>
     <div className={networkStyles.searchRow}>
      <input className={networkStyles.searchInput} name="q" defaultValue={one(params.q)} placeholder="Try “Data Analyst”, “Python” or a project name"/>
      <button className={networkStyles.searchButton} type="submit">Search teams</button>
     </div>
    </label>
    <details className={networkStyles.filters}>
     <summary>Filters{(roleFilter||capabilityFilter||domainFilter||commitmentFilter)&&<span className={networkStyles.filterCount}>{[roleFilter,capabilityFilter,domainFilter,commitmentFilter].filter(Boolean).length}</span>}</summary>
     <div className={networkStyles.filterGrid}>
      <label>Role<select name="role" defaultValue={one(params.role)}><option value="">All roles</option>{roleOptions.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <label>Capability<select name="capability" defaultValue={one(params.capability)}><option value="">All capabilities</option>{capabilityOptions.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <label>Domain<select name="domain" defaultValue={one(params.domain)}><option value="">All domains</option>{domainOptions.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <label>Commitment<select name="commitment" defaultValue={one(params.commitment)}><option value="">Any commitment</option>{commitmentOptions.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <button className={networkStyles.clear} type="submit">Apply filters</button>
     </div>
    </details>
   </form>
   {teamsError?<div className="cnError" role="alert"><strong>We couldn’t load the Collaboration Network.</strong><p>Try again.</p></div>:<><div className="cnCount" aria-live="polite">{filteredTeams.length} open collaboration need{filteredTeams.length===1?'':'s'}</div><div className={networkStyles.teamGrid}>{filteredTeams.map(item=><CollaborationTeamCard item={item} key={item.need.id}/>)}{filteredTeams.length===0&&<div className={networkStyles.empty}><strong>No teams are currently looking for collaborators</strong><p>Explore projects or check back when new collaboration needs open.</p>{(q||roleFilter||capabilityFilter||domainFilter||commitmentFilter)&&<Link className="button ghost" href="/member/collaboration?view=teams">Clear filters</Link>}</div>}</div></>}
  </section>}
  <style>{`
   .cnRoot{display:grid;gap:22px;min-width:0}.cnTabs{display:inline-flex;width:max-content;max-width:100%;padding:4px;border:1px solid #e1e3e8;border-radius:12px;background:#f1f2f4}.cnTabs a{min-height:44px;display:flex;align-items:center;padding:9px 14px;border-radius:9px;font-size:.82rem;font-weight:800;color:var(--slate)}.cnTabs a.active{background:var(--white);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.08)}.cnContext{display:flex;justify-content:space-between;gap:22px;padding:17px 19px;border:1px solid #eadfcb;border-radius:16px;background:linear-gradient(180deg,#fffdf8,#fbf6eb)}.cnContext>div>span,.cnSectionHead span,.cnTeamTop span{font:800 .68rem/1.2 var(--font-mono);letter-spacing:.1em;color:var(--bronze-deep)}.cnContext h2{margin:5px 0 3px;font-size:1rem}.cnContext p{margin:0;color:var(--slate);font-size:.78rem}.cnContext dl{display:flex;gap:12px;margin:0}.cnContext dl div{min-width:90px;padding-left:13px;border-left:1px solid #e6dac4}.cnContext dt,.cnStats dt{font-size:.66rem;color:var(--slate)}.cnContext dd,.cnStats dd{margin:4px 0 0;font-weight:850}.cnWarning,.cnError{padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--white);color:var(--slate)}.cnError{border-color:#e0b7b7;background:#fff6f6}.cnError p{margin:4px 0 0}.cnTeams{display:grid;gap:16px}.cnSectionHead h2{margin:5px 0 3px;font-size:1.55rem}.cnSectionHead p{margin:0;color:var(--slate)}.cnFilters{display:grid;grid-template-columns:minmax(210px,2fr) repeat(4,minmax(125px,1fr)) auto;gap:9px;align-items:end;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--white)}.cnFilters label{display:grid;gap:6px;font-size:.7rem;font-weight:800}.cnFilters input,.cnFilters select{min-width:0;width:100%;min-height:44px;padding:9px 10px;border:1px solid #cfc7ba;border-radius:10px;background:var(--paper);color:var(--ink)}.cnFilters .button{min-height:44px}.cnCount{font-size:.76rem;color:var(--slate)}.cnGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.cnTeamCard,.cnEmpty{min-width:0;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--white)}.cnTeamTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.cnTeamTop h3{margin:6px 0 3px;font-size:1rem;line-height:1.35}.cnTeamTop p{margin:0;color:var(--slate);font-size:.75rem}.cnTeamTop b{flex:0 0 auto;border-radius:999px;padding:6px 8px;background:#fbf1df;color:var(--bronze-deep);font-size:.67rem}.cnSummary{color:var(--slate);font-size:.78rem;line-height:1.5}.cnChips{display:flex;flex-wrap:wrap;gap:6px}.cnChips span{padding:5px 7px;border:1px solid #e8e8ec;border-radius:999px;background:#f7f7f8;color:#475467;font-size:.68rem}.cnStats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:14px 0}.cnStats div{padding:9px;border-radius:10px;background:#f8f8f8}.cnActions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cnActions .button{min-height:44px;text-align:center}.cnEmpty{grid-column:1/-1}.cnEmpty p{color:var(--slate)}@media(max-width:1100px){.cnFilters{grid-template-columns:repeat(2,minmax(0,1fr))}.cnGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.cnContext{display:grid}.cnContext dl{display:grid;grid-template-columns:repeat(3,1fr)}.cnContext dl div{padding:9px;border:0;border-radius:10px;background:#fff8ec}.cnFilters,.cnGrid{grid-template-columns:1fr}.cnTabs{width:100%}.cnTabs a{flex:1;justify-content:center;text-align:center}.cnActions{grid-template-columns:1fr}.cnTeamTop{display:grid}.cnTeamTop b{width:max-content}}@media(max-width:390px){.cnContext dl,.cnStats{grid-template-columns:1fr}.cnTeamCard{padding:15px}}`}</style>
 </main>;
}
