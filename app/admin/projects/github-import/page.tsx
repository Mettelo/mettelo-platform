'use client';
import {useState} from 'react';
import Link from 'next/link';
type Manifest={id:string;name:string;track:string;brief:string;problem:string;sector:string;roles:string[];capabilities:string[];repository:string};
export default function GithubProjectImport(){
 const [url,setUrl]=useState('');
 const [teamSize,setTeamSize]=useState('4');
 const [manifest,setManifest]=useState<Manifest|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [created,setCreated]=useState<string|null>(null);
 async function preview(){
  setBusy(true);setError('');setManifest(null);setCreated(null);
  try{
   const response=await fetch('/api/admin/projects/github-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repository_url:url})});
   const data=await response.json();
   if(!response.ok)throw Error([data.error,...(data.details||[])].filter(Boolean).join(' '));
   setManifest(data.manifest);
  }catch(e){setError(e instanceof Error?e.message:'Unable to preview repository.')}finally{setBusy(false)}
 }
 async function createDraft(){
  if(!manifest)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/admin/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({github_repository_url:url,project_type:'open',team_size_threshold:Number(teamSize)})});
   const data=await response.json();
   if(!response.ok)throw Error([data.error,...(data.details||[])].filter(Boolean).join(' '));
   setCreated(data.item.id);setManifest(null);
  }catch(e){setError(e instanceof Error?e.message:'Unable to create draft.')}finally{setBusy(false)}
 }
 return <main className="mx-auto max-w-3xl px-5 py-12">
  <Link href="/admin" className="text-sm underline">← Admin overview</Link>
  <h1 className="mt-6 text-3xl font-bold">Import a GitHub project</h1>
  <p className="mt-3">Register a Mettelo repository as an operational project draft. It will not appear in public discovery or accept applications until separately reviewed and published.</p>
  <div className="mt-8 rounded-xl border border-slate-300 p-5">
   <label htmlFor="github-repository-url" className="block font-semibold">GitHub repository URL</label>
   <input id="github-repository-url" type="url" value={url} onChange={e=>{setUrl(e.target.value);setManifest(null)}} placeholder="https://github.com/Mettelo/example-project" className="mt-2 block w-full rounded-md border border-slate-400 p-3" />
   <p className="mt-2 text-sm">The repository must contain a valid <code>mettelo-project.json</code> file at its root. Private repositories require a server-side GitHub token.</p>
   <button type="button" disabled={busy||!url.trim()} onClick={preview} className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{busy?'Checking…':'Validate repository'}</button>
  </div>
  {error?<p role="alert" className="mt-4 rounded-md border border-red-500 p-3">{error}</p>:null}
  {manifest?<section className="mt-6 rounded-xl border border-slate-300 p-5" aria-label="Validated project preview">
   <p className="text-sm font-semibold">{manifest.id} · {manifest.track}</p>
   <h2 className="mt-2 text-xl font-bold">{manifest.name}</h2>
   <p className="mt-3">{manifest.brief}</p>
   <p className="mt-3 text-sm">Sector: {manifest.sector} · Roles: {manifest.roles.join(', ')}</p>
   <label htmlFor="github-project-team-size" className="mt-5 block font-semibold">Required team size (1–50)</label>
   <input id="github-project-team-size" type="number" min="1" max="50" value={teamSize} onChange={e=>setTeamSize(e.target.value)} className="mt-2 w-28 rounded-md border border-slate-400 p-2" />
   <p className="mt-3 text-sm">This creates an Open Project draft. Recruitment settings and publication remain under the existing Admin workflow.</p>
   <button type="button" disabled={busy||!Number.isInteger(Number(teamSize))||Number(teamSize)<1||Number(teamSize)>50} onClick={createDraft} className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Create private draft</button>
  </section>:null}
  {created?<section className="mt-6 rounded-xl border border-green-600 p-5" role="status"><h2 className="text-xl font-semibold">Draft created</h2><p className="mt-2">The project is private. No applications have been opened and no historical records were modified.</p><Link className="mt-3 inline-block underline" href="/admin/content#publisher">Continue in Admin publishing →</Link></section>:null}
 </main>;
}
