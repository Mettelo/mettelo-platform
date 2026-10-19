'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Project={id:string;title:string;canonical_project_key:string|null;github_url:string|null;status:string;visibility:string;applications_open:boolean};
export default function AdminGithubProjectReview(){
 const [items,setItems]=useState<Project[]>([]);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState('');
 const [revision,setRevision]=useState<Record<string,{loading:boolean;message:string;revision?:number;blob?:string;canApprove?:boolean}>>({});
 async function checkRevision(id:string){
  setRevision(previous=>({...previous,[id]:{loading:true,message:''}}));
  try{
   const response=await fetch('/api/admin/projects/github-revision-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id:id})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Unable to check repository');
   const message=data.changes_pending_approval?`Changes found in ${data.changed_fields.join(', ')}. These changes are not applied; review and approval will be required.`:'No changes to the approved project manifest.';
   setRevision(previous=>({...previous,[id]:{loading:false,message,revision:data.current_revision,blob:data.latest_blob_sha,canApprove:data.changes_pending_approval&&data.can_approve}}));
  }catch(e){setRevision(previous=>({...previous,[id]:{loading:false,message:e instanceof Error?e.message:'Unable to check repository'}}))}
 }
 async function approveRevision(id:string){
  const current=revision[id];
  if(!current?.canApprove||!current.revision||!current.blob)return;
  if(!window.confirm('Approve this GitHub manifest revision for the private draft? This changes the draft title, summary and problem, but does not publish or open applications.'))return;
  setRevision(previous=>({...previous,[id]:{...current,loading:true}}));
  try{
   const response=await fetch('/api/admin/projects/github-revision-approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id:id,expected_revision:current.revision,expected_blob_sha:current.blob,confirmation:'APPROVE_GITHUB_REVISION'})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Revision approval failed');
   setRevision(previous=>({...previous,[id]:{loading:false,message:`Revision ${data.approved_revision} approved for private draft. Publication and applications are unchanged.`,canApprove:false}}));
  }catch(e){setRevision(previous=>({...previous,[id]:{...current,loading:false,message:e instanceof Error?e.message:'Revision approval failed'}}))}
 }
 useEffect(()=>{
  let active=true;
  fetch('/api/admin/projects',{cache:'no-store'}).then(async response=>{
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Unable to load projects');
   if(active)setItems((data.items||[]).filter((p:Project)=>p.github_url&&p.canonical_project_key));
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load projects')}).finally(()=>{if(active)setBusy(false)});
  return ()=>{active=false};
 },[]);
 return <main className="mx-auto max-w-5xl px-5 py-12">
  <Link href="/admin" className="text-sm underline">← Admin overview</Link>
  <h1 className="mt-6 text-3xl font-bold">GitHub project approvals</h1>
  <p className="mt-3">Review imported project status before opening applications. Publishing uses the existing Admin project governance; this page never bypasses publication checks.</p>
  <div className="mt-6 flex flex-wrap gap-4"><Link className="underline" href="/admin/projects/github-import">Import another repository</Link><Link className="underline" href="/admin/content#publisher">Open existing project publisher</Link></div>
  {busy?<p role="status" className="mt-6">Loading GitHub projects…</p>:null}
  {error?<p role="alert" className="mt-6">{error}</p>:null}
  {!busy&&!error&&!items.length?<p className="mt-6 rounded-lg border p-5">No GitHub-linked operational projects have been registered yet.</p>:null}
  {!busy&&!error?<div className="mt-6 grid gap-4">{items.map(p=><article key={p.id} className="rounded-xl border border-slate-300 p-5">
   <p className="text-xs font-semibold">{p.canonical_project_key}</p><h2 className="mt-1 text-xl font-semibold">{p.title}</h2>
   <p className="mt-2 text-sm">Lifecycle: {p.status} · Visibility: {p.visibility} · Applications: {p.applications_open?'Open':'Closed'}</p>
   <button type="button" disabled={revision[p.id]?.loading} onClick={()=>checkRevision(p.id)} className="mt-3 rounded-md border border-slate-400 px-3 py-2 text-sm disabled:opacity-50">{revision[p.id]?.loading?'Checking…':'Check GitHub changes'}</button>
   {revision[p.id]?.message?<p role="status" className="mt-2 text-sm">{revision[p.id].message}</p>:null}
   {revision[p.id]?.canApprove?<button type="button" disabled={revision[p.id]?.loading} onClick={()=>approveRevision(p.id)} className="mt-3 ml-3 rounded-md border border-slate-900 px-3 py-2 text-sm disabled:opacity-50">Approve draft revision</button>:null}
   <div className="mt-3 flex flex-wrap gap-4 text-sm">
    <a className="underline" href={p.github_url||'#'} target="_blank" rel="noopener noreferrer">View GitHub repository</a>
    <Link className="underline" href="/admin/content#publisher">Review in project publisher</Link>
   </div>
  </article>)}</div>:null}
 </main>;
}
