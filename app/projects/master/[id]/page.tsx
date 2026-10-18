import {getExpandableGithubProject} from '@/lib/expandable-github-catalogue';
import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getGithubMasterProject,isGithubMasterDiscoveryEnabled} from '@/lib/github-master-projects';
export const dynamic='force-dynamic';
type Props={params:Promise<{id:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {id}=await params;
 const project=isGithubMasterDiscoveryEnabled()?await getExpandableGithubProject(id):null;
 return {title:project?`${project.name} | Mettelo Project Library`:'Project not found'};
}
export default async function MasterProjectDetail({params}:Props){
 if(!isGithubMasterDiscoveryEnabled())notFound();
 const {id}=await params;
 const project=await getExpandableGithubProject(id);
 if(!project)notFound();
 return <main className="mx-auto max-w-4xl px-5 py-12">
  <Link href="/projects" className="text-sm underline">← All projects</Link>
  <p className="mt-8 text-sm font-semibold uppercase tracking-wide">{project.id} · {project.track}</p>
  <h1 className="mt-3 text-3xl font-bold">{project.name}</h1>
  <p className="mt-4 text-lg">{project.brief}</p>
  <section className="mt-8"><h2 className="text-xl font-semibold">The problem</h2><p className="mt-2">{project.problem}</p></section>
  <section className="mt-8"><h2 className="text-xl font-semibold">Project focus</h2><p className="mt-2">{project.use_case||project.brief}</p></section>
  <section className="mt-8"><h2 className="text-xl font-semibold">Roles</h2><ul className="mt-2 list-disc pl-6">{project.roles.map(role=><li key={role}>{role}</li>)}</ul></section>
  <section className="mt-8"><h2 className="text-xl font-semibold">Skills and capabilities</h2><ul className="mt-2 list-disc pl-6">{project.capabilities.map(skill=><li key={skill}>{skill}</li>)}</ul></section>
  {project.data_source?<section className="mt-8"><h2 className="text-xl font-semibold">Data source</h2><p className="mt-2">{project.data_source}</p></section>:null}
  {project.operationalId&&project.applicationsOpen?<div className="mt-8 rounded-lg border border-slate-300 p-5">
   <h2 className="text-lg font-semibold">Applications are open</h2>
   <p className="mt-2 text-sm">This project is managed through Mettelo's existing operational application and team workflow.</p>
   <Link href={`/projects/${project.operationalId}`} className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-3 text-white">View project and apply</Link>
  </div>:null}
  <div className="mt-10 rounded-lg border border-slate-300 p-5">
   <p className="text-sm">Explore the master repository for project instructions and submission requirements. Applications for the initial master catalogue are not enabled yet; newly approved operational projects may offer applications through Mettelo.</p>
   <a className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-3 text-white" href={project.repository} target="_blank" rel="noopener noreferrer">Open master GitHub repository ↗</a>
  </div>
 </main>;
}
