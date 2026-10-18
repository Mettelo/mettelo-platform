'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Project={id:string;title:string;canonical_project_key:string|null;github_url:string|null;status:string;visibility:string;applications_open:boolean};
export default function AdminGithubProjectReview(){
 const [items,setItems]=useState<Project[]>([]);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState('');
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
   <div className="mt-3 flex flex-wrap gap-4 text-sm">
    <a className="underline" href={p.github_url||'#'} target="_blank" rel="noopener noreferrer">View GitHub repository</a>
    <Link className="underline" href="/admin/content#publisher">Review in project publisher</Link>
   </div>
  </article>)}</div>:null}
 </main>;
}
