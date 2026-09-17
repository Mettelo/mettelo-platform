'use client';

import {useEffect,useMemo,useState} from 'react';
import AdminStatusBadge from './AdminStatusBadge';

type Project={
  id:string;slug:string;title:string;status:string;visibility:string;project_type:string;partner_name:string|null;
  participation_mode:string;minimum:number;target:number;maximum:number;recruitment:string;applications:number;offers:number;team:number;
  run_status:string|null;run_number:number|null;lab_readiness:string;health:string;blocker_count:number;created_at:string;updated_at:string
};
const statuses=['draft','pilot','recruiting','open','forming','active','review','completed','cancelled','archived'];
const pageSizes=[25,50,100];

export default function AdminProjectManager(){
  const[items,setItems]=useState<Project[]>([]);
  const[query,setQuery]=useState('');
  const[status,setStatus]=useState('all');
  const[visibility,setVisibility]=useState('all');
  const[type,setType]=useState('all');
  const[sort,setSort]=useState('newest');
  const[page,setPage]=useState(1);
  const[pageSize,setPageSize]=useState(25);
  const[selected,setSelected]=useState<string[]>([]);
  const[busy,setBusy]=useState('');
  const[message,setMessage]=useState('');
  const[archive,setArchive]=useState<Project|null>(null);
  const[bulkArchive,setBulkArchive]=useState(false);

  async function load(){
    const r=await fetch('/api/admin/project-operations-list',{cache:'no-store'});
    const b=await r.json();
    if(!r.ok){setMessage(b.error||'Unable to load project operations.');return;}
    setItems(b.items||[]);
  }
  useEffect(()=>{void load()},[]);

  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase();
    const rows=items.filter(item=>
      (status==='all'||item.status===status)&&
      (visibility==='all'||item.visibility===visibility)&&
      (type==='all'||item.project_type===type)&&
      (!q||[item.title,item.partner_name,item.slug].filter(Boolean).join(' ').toLowerCase().includes(q))
    );
    return [...rows].sort((a,b)=>
      sort==='oldest'?new Date(a.created_at).getTime()-new Date(b.created_at).getTime():
      sort==='fill-asc'?(a.team/Math.max(1,a.maximum))-(b.team/Math.max(1,b.maximum)):
      sort==='fill-desc'?(b.team/Math.max(1,b.maximum))-(a.team/Math.max(1,a.maximum)):
      sort==='name'?a.title.localeCompare(b.title):
      new Date(b.created_at).getTime()-new Date(a.created_at).getTime()
    );
  },[items,query,status,visibility,type,sort]);

  useEffect(()=>{setPage(1)},[query,status,visibility,type,sort,pageSize]);
  const pageCount=Math.max(1,Math.ceil(visible.length/pageSize));
  const pageItems=visible.slice((page-1)*pageSize,page*pageSize);
  const selectedOnPage=pageItems.filter(item=>selected.includes(item.id));
  const selectedProjects=items.filter(item=>selected.includes(item.id));

  function toggle(id:string){setSelected(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])}
  function clearFilters(){setQuery('');setStatus('all');setVisibility('all');setType('all');setSort('newest')}
  async function archiveIds(ids:string[]){
    setBusy('bulk');setMessage('');
    try{
      for(const id of ids){
        const r=await fetch('/api/admin/projects',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,action:'archive'})});
        const b=await r.json();
        if(!r.ok)throw new Error(b.error||'Unable to archive project.');
      }
      setArchive(null);setBulkArchive(false);setSelected([]);
      setMessage(ids.length>1?'Selected projects archived. Historical project records remain preserved.':'Project archived. Historical runs, memberships, completion and Proof remain preserved.');
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to archive project.')}
    finally{setBusy('')}
  }

  return <section className="ops" aria-label="Admin project operations">
    <div className="toolbar">
      <label className="search"><span className="srOnly">Search projects</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by project name or partner"/></label>
      <label><span>Lifecycle</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All</option>{statuses.map(value=><option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label>
      <label><span>Visibility</span><select value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="all">All</option><option value="public">Public</option><option value="private">Private</option></select></label>
      <label><span>Type</span><select value={type} onChange={e=>setType(e.target.value)}><option value="all">All</option><option value="open">Open</option><option value="partner">Partner</option></select></label>
      <label><span>Sort</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="fill-asc">Team fill % ascending</option><option value="fill-desc">Team fill % descending</option><option value="name">Name A–Z</option></select></label>
      <button className="button ghost" type="button" onClick={clearFilters}>Clear filters</button>
      <a className="button dark" href="/admin/project-operations/projects/new">Create project</a>
    </div>

    {selected.length>0&&<div className="bulkBar" role="region" aria-label="Bulk project actions">
      <strong>{selected.length} selected</strong>
      <span>Publish and visibility changes are managed from each project so lifecycle checks cannot be bypassed.</span>
      <button type="button" onClick={()=>setBulkArchive(true)}>Archive selected</button>
      <button type="button" onClick={()=>setSelected([])}>Clear</button>
    </div>}

    {visible.length===0?<div className="empty"><h3>No projects match these filters</h3><p>Adjust the filters or create a governed project.</p></div>:<>
      <div className="tableWrap"><table><thead><tr>
        <th><input type="checkbox" aria-label="Select projects on this page" checked={pageItems.length>0&&selectedOnPage.length===pageItems.length} onChange={e=>setSelected(current=>e.target.checked?[...new Set([...current,...pageItems.map(item=>item.id)])]:current.filter(id=>!pageItems.some(item=>item.id===id)))}/></th>
        <th>Project</th><th>Lifecycle</th><th>Participation</th><th>Min / Target / Max</th><th>Recruitment</th><th>Applications</th><th>Offers</th><th>Team</th><th>Health</th><th>Lab</th><th>Updated</th><th><span className="srOnly">Actions</span></th>
      </tr></thead><tbody>{pageItems.map(item=><tr key={item.id}>
        <td><input type="checkbox" aria-label={`Select ${item.title}`} checked={selected.includes(item.id)} onChange={()=>toggle(item.id)}/></td>
        <td><a className="project" href={`/admin/project-operations/projects/${item.id}`}><strong>{item.title}</strong><small>{item.partner_name||item.slug}{item.run_number?` · Run ${item.run_number}`:''}</small></a></td>
        <td><AdminStatusBadge status={item.status}/></td><td>{item.participation_mode}</td><td>{item.minimum} / {item.target} / {item.maximum}</td>
        <td><AdminStatusBadge status={item.recruitment}/></td><td>{item.applications}</td><td>{item.offers}</td><td>{item.team}</td>
        <td><span className="state"><AdminStatusBadge status={item.health}/>{item.blocker_count>0&&<small>{item.blocker_count} blocker{item.blocker_count===1?'':'s'}</small>}</span></td>
        <td><AdminStatusBadge status={item.lab_readiness}/></td><td>{new Date(item.updated_at).toLocaleDateString('en-GB')}</td>
        <td><details className="rowMenu"><summary aria-label={`Actions for ${item.title}`}>⋯</summary><div><a href={`/admin/project-operations/projects/${item.id}`}>Edit / manage</a>{item.visibility==='public'&&<a href={`/projects/${item.id}`}>View public project</a>}<a href={`/admin/project-operations/team-formation?project=${item.id}`}>Team formation</a><button type="button" disabled={item.status==='archived'||busy==='bulk'} onClick={()=>setArchive(item)}>Archive</button></div></details></td>
      </tr>)}</tbody></table></div>

      <div className="mobileProjectList">{pageItems.map(item=><article key={item.id}>
        <header><input type="checkbox" aria-label={`Select ${item.title}`} checked={selected.includes(item.id)} onChange={()=>toggle(item.id)}/><a href={`/admin/project-operations/projects/${item.id}`}><strong>{item.title}</strong><small>{item.partner_name||item.slug}</small></a><AdminStatusBadge status={item.status}/></header>
        <dl><div><dt>Participation</dt><dd>{item.participation_mode}</dd></div><div><dt>Team</dt><dd>{item.team} · {item.minimum}/{item.target}/{item.maximum}</dd></div><div><dt>Recruitment</dt><dd>{item.recruitment}</dd></div><div><dt>Applications / Offers</dt><dd>{item.applications} / {item.offers}</dd></div><div><dt>Health / Lab</dt><dd>{item.health} / {item.lab_readiness}</dd></div><div><dt>Updated</dt><dd>{new Date(item.updated_at).toLocaleDateString('en-GB')}</dd></div></dl>
        <div className="cardActions"><a className="button ghost" href={`/admin/project-operations/projects/${item.id}`}>Manage</a><button className="button ghost" type="button" disabled={item.status==='archived'||busy==='bulk'} onClick={()=>setArchive(item)}>Archive</button></div>
      </article>)}</div>

      <div className="pagination"><span>{visible.length} projects</span><label>Rows per page<select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>{pageSizes.map(value=><option key={value} value={value}>{value}</option>)}</select></label><div><button type="button" disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page>=pageCount} onClick={()=>setPage(value=>value+1)}>Next</button></div></div>
    </>}

    <div className="formStatus" role="status" aria-live="polite">{message}</div>
    {(archive||bulkArchive)&&<div className="backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setArchive(null);setBulkArchive(false)}}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="archive-project-heading"><span className="eyebrow">Governed lifecycle action</span><h2 id="archive-project-heading">{bulkArchive?`Archive ${selectedProjects.length} selected project${selectedProjects.length===1?'':'s'}?`:`Archive ${archive?.title}?`}</h2><p>Archiving stops normal new participation and removes the project from discovery. Historical applications, runs, memberships, completion, Proof and audit history are preserved.</p><div className="actions"><button className="button ghost" type="button" onClick={()=>{setArchive(null);setBulkArchive(false)}}>Cancel</button><button className="button dark" type="button" disabled={busy==='bulk'} onClick={()=>void archiveIds(bulkArchive?selected:archive?[archive.id]:[])}>{busy==='bulk'?'Archiving…':'Archive project'}</button></div></section></div>}

    <style jsx>{`
      .ops{display:grid;gap:14px}.toolbar{display:grid;grid-template-columns:minmax(220px,1.4fr) 150px 130px 130px 170px auto auto;gap:8px;align-items:end;padding:12px;border:1px solid #d9dde2;border-radius:14px;background:#fff}.toolbar label{display:grid;gap:5px;font-size:.68rem;font-weight:800;color:#5b6470}.toolbar input,.toolbar select{min-height:44px;box-sizing:border-box;border:1px solid #cfd4da;border-radius:9px;padding:8px 10px;background:#fff;color:#10131d}.bulkBar{position:sticky;top:76px;z-index:40;display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;background:#10131d;color:#fff}.bulkBar span{flex:1;color:#d3d7dd;font-size:.68rem}.bulkBar button{min-height:38px;padding:0 11px;border:1px solid rgba(255,255,255,.25);border-radius:8px;background:#fff;color:#10131d;font-weight:750}.tableWrap{overflow:auto;border:1px solid #d9dde2;border-radius:14px;background:#fff}table{width:100%;min-width:1360px;border-collapse:collapse}th{padding:10px 11px;text-align:left;background:#f5f6f8;border-bottom:1px solid #d9dde2;font-size:.61rem;letter-spacing:.035em;text-transform:uppercase;color:#5b6470}td{padding:11px;border-bottom:1px solid #e5e8ec;font-size:.72rem;vertical-align:middle}.project{display:grid;gap:3px;color:#10131d;text-decoration:none;min-width:190px}.project small,.state small{color:#68717e}.state{display:grid;gap:3px}.rowMenu{position:relative}.rowMenu summary{width:44px;height:44px;display:grid;place-items:center;cursor:pointer;list-style:none;border-radius:8px}.rowMenu summary::-webkit-details-marker{display:none}.rowMenu>div{position:absolute;right:0;top:46px;z-index:70;display:grid;min-width:180px;padding:6px;border:1px solid #d9dde2;border-radius:10px;background:#fff;box-shadow:0 12px 28px rgba(16,19,29,.15)}.rowMenu a,.rowMenu button{padding:9px 10px;border:0;border-radius:7px;background:none;text-align:left;color:#10131d;text-decoration:none;font:inherit}.rowMenu a:hover,.rowMenu button:hover{background:#f2f4f7}.mobileProjectList{display:none}.empty{padding:28px;border:1px dashed #cfd4da;border-radius:14px;background:#fff}.empty h3,.empty p{margin:0}.empty p{margin-top:6px;color:#5b6470}.pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:.72rem;color:#5b6470}.pagination label,.pagination>div{display:flex;align-items:center;gap:8px}.pagination select,.pagination button{min-height:38px;border:1px solid #cfd4da;border-radius:8px;background:#fff;padding:0 9px}.backdrop{position:fixed;inset:0;z-index:220;display:grid;place-items:center;padding:16px;background:rgba(16,19,29,.58)}.modal{width:min(520px,100%);box-sizing:border-box;padding:24px;border-radius:16px;background:#fff}.modal h2{margin:6px 0}.modal p{color:#4f5966;line-height:1.55}.actions{display:flex;justify-content:flex-end;gap:8px}.cardActions{display:flex;gap:8px}.mobileProjectList article{padding:14px;border:1px solid #d9dde2;border-radius:14px;background:#fff}.mobileProjectList header{display:grid;grid-template-columns:auto 1fr auto;align-items:start;gap:10px}.mobileProjectList header>a{display:grid;gap:3px;color:#10131d;text-decoration:none}.mobileProjectList header small{color:#68717e}.mobileProjectList dl{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:14px 0}.mobileProjectList dt{font-size:.62rem;font-weight:800;text-transform:uppercase;color:#68717e}.mobileProjectList dd{margin:3px 0 0;font-size:.75rem;overflow-wrap:anywhere}
      @media(max-width:1180px){.toolbar{grid-template-columns:1fr 1fr 1fr}.search{grid-column:span 2}}
      @media(max-width:900px){.tableWrap{display:none}.mobileProjectList{display:grid;gap:10px}.bulkBar{top:118px;overflow:auto}}
      @media(max-width:520px){.toolbar{grid-template-columns:1fr}.search{grid-column:auto}.mobileProjectList dl{grid-template-columns:1fr}.cardActions,.actions{display:grid}.cardActions .button,.actions .button{width:100%}.pagination{display:grid;justify-items:start}.bulkBar{display:grid}}
    `}</style>
  </section>
}
