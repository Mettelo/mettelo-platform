import {Suspense} from 'react';
import {getProjectCapabilityPathPlacements} from '@/lib/capability-paths-public';
import ProjectPathBackContext from './ProjectPathBackContext';

export default async function PublicProjectCapabilityPaths({projectId}:{projectId:string}){
 const placements=await getProjectCapabilityPathPlacements(projectId);if(!placements.length)return null;
 const pathRefs=placements.map(item=>({slug:item.path.slug,name:item.path.name}));
 return <section className="projectPathFitPublic" aria-labelledby="project-path-fit-title"><div className="shell"><Suspense fallback={null}><ProjectPathBackContext paths={pathRefs}/></Suspense><div className="projectPathFitPublicHead"><div><div className="eyebrow">CAPABILITY PATHS</div><h2 id="project-path-fit-title">Where this project fits.</h2></div><p>This is one canonical Mettelo project. It can develop different capability depending on where it sits in a professional progression.</p></div><div className="projectPathFitList">{placements.map(item=><article className="projectPathFitItem" key={item.path_id}><div className="eyebrow">PROJECT {String(item.position).padStart(2,'0')}</div><h3>{item.path.name}</h3><p>{item.stage?.name?`${item.stage.name} · `:''}{item.path.target_role}</p><p><strong>Capability built:</strong> {item.capability_built}</p><a href={`/projects/paths/${item.path.slug}`}>Explore this Capability Path →</a></article>)}</div></div></section>;
}
