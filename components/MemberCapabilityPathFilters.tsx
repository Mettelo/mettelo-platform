import type {MemberCapabilityPathProgress} from '@/lib/member-capability-paths';

type Props={paths:MemberCapabilityPathProgress[];selectedPath:string;selectedStage:string};

export default function MemberCapabilityPathFilters({paths,selectedPath,selectedStage}:Props){
  const selected=paths.find(path=>path.slug===selectedPath)||null;const stages=[...new Set((selected?.placements||[]).map(item=>item.stageName))];
  if(!paths.length)return null;
  return <form className="mcpf" action="/member/discover" method="get" aria-label="Capability Path project filters">
    <div><label htmlFor="member-path-filter">Capability Path</label><select id="member-path-filter" name="path" defaultValue={selectedPath}><option value="">All followed Paths</option>{paths.filter(path=>path.pathStatus==='published').map(path=><option value={path.slug} key={path.pathId}>{path.name}</option>)}</select></div>
    <div><label htmlFor="member-stage-filter">Path stage</label><select id="member-stage-filter" name="stage" defaultValue={selectedStage} disabled={!selected}><option value="">All stages</option>{stages.map(stage=><option value={stage} key={stage}>{stage}</option>)}</select></div>
    <button type="submit">Apply Path filters</button>{(selectedPath||selectedStage)&&<a href="/member/discover">Clear Path filters</a>}
    <style>{`.mcpf{display:grid;grid-template-columns:minmax(180px,1fr) minmax(160px,.8fr) auto auto;gap:10px;align-items:end;margin:0 0 14px;padding:14px;border:1px solid #ddd7ca;border-radius:12px;background:#fff}.mcpf>div{display:grid;gap:5px;min-width:0}.mcpf label{font-size:10px;font-weight:800;color:#59636f}.mcpf select{width:100%;min-height:44px;border:1px solid #b8c0c9;border-radius:9px;background:#fff;padding:0 9px;min-width:0}.mcpf button,.mcpf a{min-height:44px;padding:0 13px;border:1px solid #b8c0c9;border-radius:9px;background:#fff;color:#111318;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-size:11px;font-weight:800}.mcpf button{background:#111318;color:#fff;border-color:#111318}.mcpf button:focus-visible,.mcpf a:focus-visible,.mcpf select:focus-visible{outline:3px solid #e0ad59;outline-offset:2px}@media(max-width:820px){.mcpf{grid-template-columns:1fr 1fr}}@media(max-width:560px){.mcpf{grid-template-columns:1fr}.mcpf button,.mcpf a{width:100%}}`}</style>
  </form>;
}
