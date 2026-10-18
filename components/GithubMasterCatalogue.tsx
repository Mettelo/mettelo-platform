'use client';

import Link from 'next/link';
import {useMemo,useState} from 'react';
import type {GithubMasterProject} from '@/lib/github-master-projects';

const PAGE_SIZE=12;
export default function GithubMasterCatalogue({projects,member=false}:{projects:GithubMasterProject[];member?:boolean}){
 const [search,setSearch]=useState('');
 const [track,setTrack]=useState('all');
 const [page,setPage]=useState(1);
 const tracks=useMemo(()=>[...new Set(projects.map(p=>p.track))].sort(),[projects]);
 const filtered=useMemo(()=>{
  const q=search.trim().toLocaleLowerCase();
  return projects.filter(p=>(track==='all'||p.track===track)&&(!q||[p.id,p.name,p.brief,p.problem,p.sector,p.track,...p.roles,...p.capabilities].some(v=>v.toLocaleLowerCase().includes(q))));
 },[projects,search,track]);
 const pageCount=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
 const currentPage=Math.min(page,pageCount);
 const visible=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
 function updateSearch(value:string){setSearch(value);setPage(1)}
 function updateTrack(value:string){setTrack(value);setPage(1)}
 return <main id="projects" className="mx-auto max-w-6xl px-5 py-12">
  <div className="mb-8">
   <p className="text-sm font-semibold uppercase tracking-wide">Mettelo Project Library</p>
   <h1 className="mt-2 text-3xl font-bold">Explore 50 real-world projects</h1>
   <p className="mt-3 max-w-3xl text-base">Browse GitHub-first projects across data analytics, engineering, science, AI and business analysis. Each project has its own master repository and brief.</p>
   {member?<p className="mt-3 text-sm">Your existing applications, memberships and Lab work remain available in <Link href="/member/projects" className="font-semibold underline">My Projects</Link>. New master projects are not yet open for applications.</p>:null}
  </div>
  <div role="search" aria-label="Filter master projects" className="mb-7 grid gap-4 rounded-xl border border-slate-300 p-4 sm:grid-cols-2">
   <label className="block text-sm font-semibold" htmlFor="master-project-search">Search projects
    <input id="master-project-search" type="search" value={search} onChange={e=>updateSearch(e.target.value)} placeholder="Project, role, skill or sector" className="mt-2 block w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900" />
   </label>
   <label className="block text-sm font-semibold" htmlFor="master-project-track">Project track
    <select id="master-project-track" value={track} onChange={e=>updateTrack(e.target.value)} className="mt-2 block w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900">
     <option value="all">All tracks</option>
     {tracks.map(t=><option key={t} value={t}>{t}</option>)}
    </select>
   </label>
  </div>
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3" role="status" aria-live="polite">
   <p className="text-sm">{filtered.length} of {projects.length} projects · Page {currentPage} of {pageCount}</p>
   {(search||track!=='all')?<button type="button" onClick={()=>{setSearch('');setTrack('all');setPage(1)}} className="rounded-md border border-slate-400 px-3 py-2 text-sm">Clear filters</button>:null}
  </div>
  {visible.length?<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
   {visible.map(p=><article key={p.id} className="rounded-xl border border-slate-300 bg-white p-5 text-slate-900 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{p.id} · {p.track}</p>
    <h2 className="mt-2 text-lg font-semibold">{p.name}</h2>
    <p className="mt-3 text-sm leading-relaxed">{p.brief}</p>
    <p className="mt-3 text-xs text-slate-600">{p.sector}</p>
    <div className="mt-5 flex flex-wrap gap-3">
     <Link className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" href={`/projects/master/${encodeURIComponent(p.id)}`}>View project brief</Link>
     <a className="rounded-md border border-slate-400 px-3 py-2 text-sm font-medium" href={p.repository} target="_blank" rel="noopener noreferrer">Master repository ↗</a>
    </div>
   </article>)}
  </div>:<p className="rounded-lg border border-slate-300 p-6" role="status">No projects match your filters. Try another search or clear the filters.</p>}
  {pageCount>1?<nav className="mt-8 flex items-center justify-center gap-4" aria-label="Master project pages">
   <button type="button" disabled={currentPage===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-400 px-4 py-2 disabled:opacity-40">Previous</button>
   <span className="text-sm">Page {currentPage} of {pageCount}</span>
   <button type="button" disabled={currentPage===pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))} className="rounded-md border border-slate-400 px-4 py-2 disabled:opacity-40">Next</button>
  </nav>:null}
 </main>;
}
