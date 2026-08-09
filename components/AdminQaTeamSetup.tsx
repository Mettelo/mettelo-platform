'use client';

import { useEffect, useMemo, useState } from 'react';

type UserRow={id:string;email:string;name:string;role:string|null;project_role:string|null};
type Credentials={key:string;email:string;password:string|null;user_id:string};

export default function AdminQaTeamSetup(){
  const [users,setUsers]=useState<UserRow[]>([]);
  const [project,setProject]=useState<{id:string;title:string;status:string}|null>(null);
  const [lead,setLead]=useState('');const [analyst,setAnalyst]=useState('');const [engineer,setEngineer]=useState('');
  const [working,setWorking]=useState('');const [message,setMessage]=useState('');const [credentials,setCredentials]=useState<Credentials[]>([]);
  async function load(){
    setWorking('load');setMessage('');
    try{const response=await fetch('/api/admin/qa-team',{cache:'no-store'});const body=await response.json();if(!response.ok)throw new Error(body.error||'Unable to load QA setup.');setUsers(body.users||[]);setProject(body.project||null);
      const leadUser=(body.users||[]).find((u:UserRow)=>u.project_role==='project_lead');if(leadUser)setLead(leadUser.id);
      const contributors=(body.users||[]).filter((u:UserRow)=>u.project_role==='contributor');if(contributors[0])setAnalyst(contributors[0].id);if(contributors[1])setEngineer(contributors[1].id);
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load QA setup.');}finally{setWorking('');}
  }
  useEffect(()=>{void load();},[]);
  const options=useMemo(()=>users.map(user=><option key={user.id} value={user.id}>{user.name} · {user.email}{user.role==='admin'?' · ADMIN':''}</option>),[users]);
  async function post(action:string,payload:Record<string,unknown>={}){
    setWorking(action);setMessage('');if(action==='create_qa_users')setCredentials([]);
    try{const response=await fetch('/api/admin/qa-team',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,...payload})});const body=await response.json();if(!response.ok)throw new Error(body.error||'QA setup failed.');setMessage(body.message||'QA setup updated.');if(body.credentials)setCredentials(body.credentials);await load();}
    catch(error){setMessage(error instanceof Error?error.message:'QA setup failed.');}finally{setWorking('');}
  }
  return <section className="panel" id="qa-team"><div className="panelHead"><div><span className="cardNumber">INTERNAL QA</span><h3 style={{marginTop:8}}>Collaboration pilot team setup</h3></div><span className="chip">{project?.status?.toUpperCase()||'LOADING'}</span></div>
    <p className="panelNote">Creates or assigns controlled test identities to the private <strong>[QA] Mettelo Collaboration Pilot</strong>. This does not publish a fake project.</p>
    <div className="actions"><button type="button" className="button ghost" disabled={Boolean(working)} onClick={()=>post('create_qa_users')}>{working==='create_qa_users'?'Creating…':'Create dedicated QA users'}</button><button type="button" className="button ghost" disabled={Boolean(working)} onClick={()=>load()}>Refresh users</button></div>
    {credentials.length>0&&<div className="formCard" style={{marginTop:16}}><strong>New QA credentials — copy now</strong><p className="panelNote">Passwords are only returned when an account is first created. Keep these out of the repository.</p>{credentials.map(item=><div className="listRow" key={item.user_id}><div><strong>{item.email}</strong><br/><small>{item.key}</small></div><code>{item.password||'Existing account — password unchanged'}</code></div>)}</div>}
    <div className="formCard" style={{marginTop:16}}><div className="fieldRow"><div><label htmlFor="qa-lead">Project Lead</label><select id="qa-lead" value={lead} onChange={e=>setLead(e.target.value)}><option value="">Choose user</option>{options}</select></div><div><label htmlFor="qa-analyst">Data Analyst</label><select id="qa-analyst" value={analyst} onChange={e=>setAnalyst(e.target.value)}><option value="">Choose user</option>{options}</select></div></div><label htmlFor="qa-engineer">Data Engineer</label><select id="qa-engineer" value={engineer} onChange={e=>setEngineer(e.target.value)}><option value="">Choose user</option>{options}</select><button type="button" className="button dark" style={{width:'100%',marginTop:20}} disabled={Boolean(working)||!lead||!analyst||!engineer} onClick={()=>post('assign_team',{lead_user_id:lead,analyst_user_id:analyst,engineer_user_id:engineer})}>{working==='assign_team'?'Assigning…':'Assign QA team + six tasks →'}</button></div>
    <div className="formStatus" role="status" aria-live="polite">{message}</div>
  </section>;
}
