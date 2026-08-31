import {getPublishedCapabilityPaths} from '@/lib/capability-paths-public';

export default async function PublicCapabilityPathsSection(){
 const paths=await getPublishedCapabilityPaths(6);
 if(!paths.length)return null;
 return <section className="capabilityPathEntry" aria-labelledby="capability-path-entry-title"><div className="shell"><div className="capabilityPathEntryHead"><div><div className="eyebrow">BUILD WITH DIRECTION</div><h2 id="capability-path-entry-title">Follow a Capability Path.</h2><p>Not sure which project to choose next? Capability Paths organise real Mettelo projects into a recommended professional progression. The Path gives direction; individual projects remain real work you can explore independently.</p></div><a className="button ghost" href="/projects/paths">View all Capability Paths →</a></div><div className="capabilityPathCards">{paths.map(path=><a className="capabilityPathCard" href={`/projects/paths/${path.slug}`} key={path.id}><small>{path.target_role}</small><h3>{path.name}</h3><p>{path.short_description||path.progression_summary||`Build toward ${path.target_outcome}.`}</p><div className="capabilityPathCardMeta"><span>{path.project_count} project{path.project_count===1?'':'s'}</span><span>{path.stage_count} stage{path.stage_count===1?'':'s'}</span></div><b>Explore Path →</b></a>)}</div></div></section>;
}
