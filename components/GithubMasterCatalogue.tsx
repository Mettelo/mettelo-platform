import Link from 'next/link';
import type {GithubMasterProject} from '@/lib/github-master-projects';

export default function GithubMasterCatalogue({projects,member=false}:{projects:GithubMasterProject[];member?:boolean}){
 return <main id="projects" className="mx-auto max-w-6xl px-5 py-12">
  <div className="mb-8">
   <p className="text-sm font-semibold uppercase tracking-wide">Mettelo Project Library</p>
   <h1 className="mt-2 text-3xl font-bold">Explore 50 real-world projects</h1>
   <p className="mt-3 max-w-3xl text-base">Browse GitHub-first projects across data analytics, engineering, science, AI and business analysis. Each project has its own master repository and brief.</p>
   {member?<p className="mt-3 text-sm">Your existing applications, memberships and Lab work remain available through their original project links. New master projects are not yet open for applications.</p>:null}
  </div>
  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
   {projects.map(p=><article key={p.id} className="rounded-xl border border-slate-300 bg-white p-5 text-slate-900 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{p.id} · {p.track}</p>
    <h2 className="mt-2 text-lg font-semibold">{p.name}</h2>
    <p className="mt-3 text-sm leading-relaxed">{p.brief}</p>
    <p className="mt-3 text-xs text-slate-600">{p.sector}</p>
    <div className="mt-5 flex flex-wrap gap-3">
     <Link className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" href={`/projects/master/${encodeURIComponent(p.id)}`}>View project brief</Link>
     <a className="rounded-md border border-slate-400 px-3 py-2 text-sm font-medium" href={p.repository} target="_blank" rel="noopener noreferrer">Master repository ↗</a>
    </div>
   </article>)}
  </div>
 </main>;
}
