import type {Metadata} from 'next';
import {getPublishedCapabilityPaths} from '@/lib/capability-paths-public';
import '../capability-paths-public.css';

export const metadata:Metadata={title:'Capability Paths',description:'Explore structured professional progression through real Mettelo projects. Capability Paths give direction without restricting how you discover or contribute to projects.'};
export const dynamic='force-dynamic';

export default async function CapabilityPathsIndexPage(){
 const paths=await getPublishedCapabilityPaths();
 return <>
  <section className="capabilityPathsHero"><div className="shell"><div className="capabilityPathBreadcrumb"><a href="/projects">Projects</a><span aria-hidden="true">/</span><span>Capability Paths</span></div><div className="eyebrow">CAPABILITY PATHS</div><h1>Build capability through a sequence of real projects.</h1><p>Choose a professional direction and explore a recommended professional progression through Mettelo projects. Paths help you decide what to work on next; they do not lock you into a curriculum or replace individual project discovery.</p></div></section>
  <main className="capabilityPathsIndex"><div className="shell">{paths.length?<div className="capabilityPathsIndexGrid">{paths.map(path=><a className="capabilityPathsIndexCard" href={`/projects/paths/${path.slug}`} key={path.id}><div className="eyebrow">{path.target_role}</div><h2>{path.name}</h2><p>{path.short_description||path.progression_summary||`A structured project progression designed to build toward ${path.target_outcome}.`}</p><div className="capabilityPathCardMeta"><span>{path.project_count} project{path.project_count===1?'':'s'}</span><span>{path.stage_count} stage{path.stage_count===1?'':'s'}</span></div><p className="pathOutcome"><strong>Target capability:</strong> {path.target_outcome}</p><b>Explore Capability Path →</b></a>)}</div>:<section className="capabilityPathEmpty"><h2>No Capability Paths are published yet.</h2><p>You can still browse current Mettelo projects by domain, tool, level and availability.</p><a className="button dark" href="/projects#projects">Browse projects →</a></section>}</div></main>
  <style>{`.capabilityPathsHero .shell,.capabilityPathsIndex .shell{width:min(1180px,calc(100% - 32px));max-width:100%;min-width:0}.capabilityPathsHero .shell>*,.capabilityPathsIndex .shell>*,.capabilityPathsIndexGrid,.capabilityPathsIndexCard{min-width:0;max-width:100%}.capabilityPathsHero h1,.capabilityPathsHero p,.capabilityPathsIndexCard *{overflow-wrap:anywhere;word-break:normal}.capabilityPathsIndexCard b{white-space:normal}`}</style>
 </>;
}
