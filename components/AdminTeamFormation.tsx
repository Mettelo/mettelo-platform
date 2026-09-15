'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import AdminStatusBadge from './AdminStatusBadge';

type Role={id:string;title:string;responsibilities:string[]};
type Responsibility={id:string;responsibility:string;source_project_role_id:string|null};
type Member={membership_id:string;id:string;name:string;headline:string|null;team_role:string;membership_status:string;leadership_interest:boolean;responsibilities:Responsibility[]};
type Readiness={ready?:boolean;reason_codes?:string[];blockers?:string[];team?:{required_team_size?:number;project_lead_count?:number};system?:{start_paused?:boolean;start_blocked?:boolean}};
type ReadinessItem={run_id:string;readiness:Readiness|null;scheduled_start_at:string|null};
type Team={id:string;run_id:string;run_number:number;title:string;project_type:string;partner_name:string|null;admission_mode:string|null;participation_mode:string|null;status:string;team_size_threshold:number;min_team_size:number;target_team_size:number;max_team_size:number;open_places:number;forming_deadline:string|null;kickoff_at:string|null;filled:number;roles:Role[];team:Member[];readiness?:Readiness|null;scheduled_start_at?:string|null};
type StatusFilter='current'|'forming'|'active'|'paused'|'all';
const statusGroups:Record<StatusFilter,string[]>={current:['forming','active','paused','review'],forming:['forming'],active:['active','review'],paused:['paused'],all:[]};

function words(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}
function choiceValue(roleId:string,responsibility:string){return `${roleId}|||${responsibility}`}
function parseChoice(value:string){const [roleId,...parts]=value.split('|||');return{roleId,responsibility:parts.join('|||')}}

export default function AdminTeamFormation({focusProjectId}:{focusProjectId?:string}){
  const [items,setItems]=useState<Team[]>([]);
  const [query,setQuery]=useState('');
  const [project,setProject]=useState('all');
  const [statusFilter,setStatusFilter]=useState<StatusFilter>('current');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(10);
  const [working,setWorking]=useState('');
  const [message,setMessage]=useState('');
  const [reason,setReason]=useState<Record<string,string>>({});
  const [responsibilityChoice,setResponsibilityChoice]=useState<Record<string,string>>({});

  const load=useCallback(async()=>{
    setMessage('');
    try{
      const readinessQuery=focusProjectId?`?project_id=${encodeURIComponent(focusProjectId)}`:'';
      const [teamResponse,readinessResponse]=await Promise.all([
        fetch('/api/admin/project-flow',{cache:'no-store'}),
        fetch(`/api/admin/project-start-readiness${readinessQuery}`,{cache:'no-store'})
      ]);
      const [teamBody,readinessBody]=await Promise.all([teamResponse.json().catch(()=>({})),readinessResponse.json().catch(()=>({}))]);
      if(!teamResponse.ok)throw new Error(teamBody.error||'Unable to load project teams.');
      if(!readinessResponse.ok)throw new Error(readinessBody.error||'Unable to load final start readiness.');
      const readinessByRun=new Map<string,ReadinessItem>((readinessBody.items||[]).map((item:ReadinessItem)=>[item.run_id,item]));
      setItems((teamBody.items||[]).map((item:Team)=>{const current=readinessByRun.get(item.run_id);return{...item,readiness:current?.readiness||null,scheduled_start_at:current?.scheduled_start_at||item.scheduled_start_at||null}}));
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load project teams.');}
  },[focusProjectId]);

  useEffect(()=>{void load()},[load]);
  useEffect(()=>{if(focusProjectId)setProject(focusProjectId)},[focusProjectId]);

  const projectOptions=useMemo(()=>{const map=new Map<string,string>();items.forEach(item=>map.set(item.id,item.title));return [...map.entries()].sort((a,b)=>a[1].localeCompare(b[1]))},[items]);
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();const allowed=statusGroups[statusFilter];return items.filter(item=>(project==='all'||item.id===project)&&(!allowed.length||allowed.includes(item.status))&&(!q||[item.title,...item.team.map(member=>member.name)].join(' ').toLowerCase().includes(q)))},[items,query,project,statusFilter]);
  const groups=useMemo(()=>{const map=new Map<string,{id:string;title:string;teams:Team[]}>();filtered.forEach(team=>{const current=map.get(team.id)||{id:team.id,title:team.title,teams:[]};current.teams.push(team);map.set(team.id,current)});return [...map.values()]},[filtered]);
  const pageCount=Math.max(1,Math.ceil(groups.length/pageSize));
  const safePage=Math.min(page,pageCount);
  const pageGroups=groups.slice((safePage-1)*pageSize,safePage*pageSize);
  useEffect(()=>setPage(1),[query,project,statusFilter,pageSize]);

  async function act(item:Team,action:string,payload:Record<string,unknown>={}){
    const key=`${item.run_id}:${action}:${String(payload.user_id||payload.assignment_id||'')}`;
    setWorking(key);setMessage('');
    try{
      const response=await fetch('/api/admin/project-flow',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:item.id,run_id:item.run_id,action,reason:reason[item.run_id]||'',...payload})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Unable to update this team.');
      setMessage(body.message||'Team updated.');
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to update this team.');}
    finally{setWorking('')}
  }

  function responsibilityOptions(item:Team){
    return item.roles.flatMap(role=>(role.responsibilities||[]).map(responsibility=>({roleId:role.id,roleTitle:role.title,responsibility,value:choiceValue(role.id,responsibility)})));
  }

  return <div className="teamFormationAdmin">
    <div className="teamToolbar" role="search" aria-label="Filter project teams">
      <label>Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search project or member"/></label>
      <label>Project<select value={project} onChange={e=>setProject(e.target.value)}><option value="all">All projects</option>{projectOptions.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>
      <label>Status<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as StatusFilter)}><option value="current">Current teams</option><option value="forming">Forming</option><option value="active">Active</option><option value="paused">Paused</option><option value="all">All statuses</option></select></label>
    </div>

    {filtered.length>0&&<div className="resultsSummary" aria-live="polite"><strong>{groups.length} project{groups.length===1?'':'s'}</strong><span>· {filtered.length} run{filtered.length===1?'':'s'}</span></div>}
    {!filtered.length?<div className="adminEmpty"><h3>No teams match these filters</h3><p>Try another project, status, or search term.</p></div>:pageGroups.map(group=><section className="projectTeamGroup" key={group.id}>
      <header><div><span className="eyebrow">PROJECT</span><h2>{group.title}</h2></div><a href={`/admin/project-operations/projects/${group.id}`}>Open project →</a></header>
      <div className="runList">{group.teams.map(item=>{
        const readiness=item.readiness;
        const canStart=item.status==='forming'&&readiness?.ready===true;
        const blockers=readiness?.reason_codes||readiness?.blockers||[];
        const hasLead=item.team.some(member=>member.team_role==='project_lead');
        const requiresLead=item.min_team_size>1;
        const options=responsibilityOptions(item);
        return <article className="runCard" key={item.run_id}>
          <div className="runHeader"><div><strong>Team {item.run_number}</strong><small>{item.participation_mode?words(item.participation_mode):item.project_type==='partner'?'Partner Project':'Open Project'} · {item.admission_mode?words(item.admission_mode):'Admission configured'}</small></div><AdminStatusBadge status={item.status}/></div>
          <dl className="geometry" aria-label={`Team ${item.run_number} formation capacity`}><div><dt>Members</dt><dd>{item.filled}</dd></div><div><dt>Minimum</dt><dd>{item.min_team_size}</dd></div><div><dt>Target</dt><dd>{item.target_team_size}</dd></div><div><dt>Maximum</dt><dd>{item.max_team_size}</dd></div><div><dt>Open places</dt><dd>{item.open_places}</dd></div></dl>
          <div className={canStart?'readiness ready':'readiness blocked'} role="status"><strong>{canStart?'READY TO START':'NOT READY TO START'}</strong><span>{canStart?'Minimum and canonical Phase 11 readiness requirements are satisfied. Target size does not block start.':blockers.length?blockers.map(words).join(' · '):'Canonical readiness has not passed.'}</span></div>
          {requiresLead&&!hasLead&&<div className="notice" role="status"><strong>Project Lead required</strong><span>Leadership interest is advisory only. An authorised assignment is required before start.</span></div>}

          <div className="members">{item.team.length?item.team.map(member=>{
            const stateKey=`${item.run_id}:${member.id}`;
            const choice=responsibilityChoice[stateKey]||'';
            return <section className="memberCard" key={member.id} aria-label={`${member.name} team responsibilities`}>
              <div className="memberIdentity"><div><strong>{member.name}</strong><small>{member.headline||member.membership_status}</small></div><AdminStatusBadge status={member.membership_status}/></div>
              <div className="memberMeta"><span>{member.team_role==='project_lead'?'Project Lead':'Contributor'}</span>{member.leadership_interest&&member.team_role!=='project_lead'&&<span>Willing to lead</span>}</div>
              <div className="assignmentList"><strong>Delivery responsibilities</strong>{member.responsibilities.length?<ul>{member.responsibilities.map(assignment=><li key={assignment.id}><span>{assignment.responsibility}</span><button type="button" className="textButton" disabled={working!==''} onClick={()=>act(item,'release_responsibility',{assignment_id:assignment.id})}>Release</button></li>)}</ul>:<p>No delivery responsibility assigned.</p>}</div>
              <div className="assignmentControls"><label>Add responsibility<select value={choice} onChange={e=>setResponsibilityChoice(current=>({...current,[stateKey]:e.target.value}))}><option value="">Choose responsibility</option>{options.map(option=><option key={option.value} value={option.value}>{option.responsibility} · {option.roleTitle}</option>)}</select></label><button className="button ghost" type="button" disabled={working!==''||!choice} onClick={()=>{const selected=parseChoice(choice);void act(item,'assign_responsibility',{user_id:member.id,responsibility:selected.responsibility,source_project_role_id:selected.roleId})}}>Assign</button>{member.team_role!=='project_lead'&&requiresLead&&item.status==='forming'?<button className="button ghost" type="button" disabled={working!==''} onClick={()=>act(item,'assign_lead',{user_id:member.id})}>Make Project Lead</button>:member.team_role==='project_lead'?<span className="leadLabel">Project Lead</span>:null}</div>
            </section>
          }):<div className="adminEmpty compact"><p>No admitted members in this run yet.</p></div>}</div>

          <div className="teamActions"><button className="button dark" type="button" disabled={!canStart||working!==''} title={canStart?'Canonical readiness passed.':blockers.length?`Blocked: ${blockers.map(words).join(', ')}`:'Readiness has not passed.'} onClick={()=>act(item,'force_start')}>Start this team</button>{item.status==='paused'?<button className="button dark" type="button" disabled={working!==''} onClick={()=>act(item,'resume')}>Resume team</button>:['forming','active'].includes(item.status)&&<><label>Pause reason<input value={reason[item.run_id]||''} onChange={e=>setReason(current=>({...current,[item.run_id]:e.target.value}))} placeholder="Required reason"/></label><button className="button ghost" type="button" disabled={working!==''||!(reason[item.run_id]||'').trim()} onClick={()=>act(item,'pause')}>Pause team</button></>}<a className="button ghost" href={`/member/projects/${item.id}?run=${item.run_id}`}>Open workspace</a></div>
        </article>
      })}</div>
    </section>)}

    {filtered.length>0&&<nav className="pagination" aria-label="Team formation pagination"><span>Page {safePage} of {pageCount}</span><label>Projects per page<select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={15}>15</option><option value={25}>25</option></select></label><button type="button" disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</button><button type="button" disabled={safePage>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>Next</button></nav>}
    <div className="formStatus" role="status" aria-live="polite">{message}</div>

    <style jsx>{`
      .teamFormationAdmin{display:grid;gap:14px}.teamToolbar{display:grid;grid-template-columns:minmax(220px,1.4fr) minmax(170px,1fr) minmax(160px,.8fr);gap:10px;padding:14px;border:1px solid #d9dde2;border-radius:14px;background:#fff}.teamToolbar label,.assignmentControls label,.teamActions label,.pagination label{display:grid;gap:6px;font-size:.72rem;font-weight:800;color:#47515e}.teamToolbar input,.teamToolbar select,.assignmentControls select,.teamActions input,.pagination select{min-height:44px;border:1px solid #b8c0ca;border-radius:9px;background:#fff;padding:8px 10px;color:#10131d}.resultsSummary{display:flex;gap:8px;color:#47515e}.projectTeamGroup{border:1px solid #d9dde2;border-radius:14px;background:#fff;overflow:hidden}.projectTeamGroup>header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;background:#f7f7f5;border-bottom:1px solid #d9dde2}.projectTeamGroup h2{margin:4px 0 0;font-size:clamp(1.05rem,2vw,1.45rem)}.runList{display:grid;gap:14px;padding:14px}.runCard{display:grid;gap:14px;border:1px solid #d9dde2;border-radius:12px;padding:14px}.runHeader,.memberIdentity,.memberMeta,.teamActions,.pagination{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.runHeader>div,.memberIdentity>div{display:grid;gap:3px}.runHeader small,.memberIdentity small{color:#697381}.geometry{display:grid;grid-template-columns:repeat(5,minmax(90px,1fr));gap:8px;margin:0}.geometry div{padding:10px;border:1px solid #e0e3e7;border-radius:9px;background:#fafaf8}.geometry dt{font-size:.66rem;text-transform:uppercase;font-weight:800;color:#697381}.geometry dd{margin:4px 0 0;font-size:1.15rem;font-weight:900}.readiness,.notice{display:grid;gap:4px;padding:11px 12px;border-radius:9px}.readiness.ready{background:#eef7ef;border:1px solid #a9cdb0}.readiness.blocked,.notice{background:#fff8e7;border:1px solid #dcc78e}.readiness span,.notice span{font-size:.78rem}.members{display:grid;gap:10px}.memberCard{display:grid;gap:10px;padding:12px;border:1px solid #e0e3e7;border-radius:10px}.memberMeta{justify-content:flex-start;font-size:.72rem;font-weight:800;color:#5b6470}.assignmentList{display:grid;gap:6px}.assignmentList>strong{font-size:.72rem;text-transform:uppercase}.assignmentList ul{display:flex;gap:7px;flex-wrap:wrap;list-style:none;padding:0;margin:0}.assignmentList li{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:999px;background:#f1f2f5;font-size:.74rem}.assignmentList p{margin:0;color:#697381;font-size:.78rem}.textButton{border:0;background:transparent;text-decoration:underline;font:inherit;cursor:pointer}.assignmentControls{display:grid;grid-template-columns:minmax(220px,1fr) auto auto;gap:8px;align-items:end}.leadLabel{font-size:.74rem;font-weight:900;padding:9px 10px;border-radius:8px;background:#f1f2f5}.teamActions{justify-content:flex-start;border-top:1px solid #e0e3e7;padding-top:12px}.teamActions label{min-width:min(300px,100%)}.pagination{justify-content:flex-end}.pagination button{min-height:40px}.formStatus{min-height:20px;font-size:.82rem;font-weight:700}.teamToolbar input:focus-visible,.teamToolbar select:focus-visible,.assignmentControls select:focus-visible,.teamActions input:focus-visible,.button:focus-visible,.textButton:focus-visible,.projectTeamGroup a:focus-visible,.pagination button:focus-visible,.pagination select:focus-visible{outline:3px solid #8b6b2e;outline-offset:2px}
      @media(max-width:760px){.teamToolbar{grid-template-columns:1fr}.geometry{grid-template-columns:repeat(2,minmax(0,1fr))}.assignmentControls{grid-template-columns:1fr}.assignmentControls .button{width:100%}.teamActions{align-items:stretch}.teamActions>*{width:100%}.projectTeamGroup>header{align-items:flex-start}.pagination{justify-content:flex-start}}
      @media(max-width:360px){.runList,.runCard{padding:10px}.geometry{grid-template-columns:1fr 1fr}.projectTeamGroup>header{padding:12px}.memberCard{padding:10px}}
      @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
    `}</style>
  </div>
}