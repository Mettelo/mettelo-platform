import type {MemberCapabilityPathProgress} from '@/lib/member-capability-paths';

type Props={paths:MemberCapabilityPathProgress[];selectedPath:string;selectedStage:string};

export default function MemberCapabilityPathFilters({paths,selectedPath,selectedStage}:Props){
  const published=paths.filter(path=>path.pathStatus==='published');
  const selected=published.find(path=>path.slug===selectedPath)||null;
  const stages=[...new Set((selected?.placements||[]).map(item=>item.stageName))];
  if(!published.length)return null;

  return <section className="mcpfCard" aria-label="Capability Path context">
    <div className="mcpfSummary">
      <span className="mcpfMark" aria-hidden="true">P</span>
      <div className="mcpfCopy">
        <span className="mcpfEyebrow">Path context</span>
        <strong>{selected?.name||'All followed Paths'}</strong>
        <span>{selected?`${selectedStage||'All stages'} · ${selected.placements.length} projects in this Path`:'Explore the full catalogue or narrow it with a followed Capability Path.'}</span>
      </div>
    </div>

    <details className="mcpfDetails">
      <summary>{selected?'Change Path':'Choose Path'}</summary>
      <form className="mcpfForm" action="/member/discover" method="get" aria-label="Capability Path project filters">
        <div>
          <label htmlFor="member-path-filter">Capability Path</label>
          <select id="member-path-filter" name="path" defaultValue={selectedPath}>
            <option value="">All followed Paths</option>
            {published.map(path=><option value={path.slug} key={path.pathId}>{path.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="member-stage-filter">Path stage</label>
          <select id="member-stage-filter" name="stage" defaultValue={selectedStage} disabled={!selected}>
            <option value="">All stages</option>
            {stages.map(stage=><option value={stage} key={stage}>{stage}</option>)}
          </select>
        </div>
        <div className="mcpfActions">
          <button type="submit">Apply Path</button>
          {(selectedPath||selectedStage)&&<a href="/member/discover">Clear Path filters</a>}
        </div>
      </form>
    </details>

    <style>{`
      .mcpfCard{margin:0 0 14px;padding:13px 14px;border:1px solid #ded6c8;border-radius:14px;background:linear-gradient(180deg,#fbf8f2,#f7f3eb);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;min-width:0}.mcpfSummary{display:flex;gap:12px;align-items:center;min-width:0}.mcpfMark{width:38px;height:38px;flex:0 0 38px;border:1px solid #ddd3bf;border-radius:10px;background:#fff;color:#8b5a17;display:grid;place-items:center;font:800 12px var(--font-plex-mono),ui-monospace,monospace}.mcpfCopy{display:grid;gap:2px;min-width:0}.mcpfEyebrow{font:800 9px var(--font-plex-mono),ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:#7b6d56}.mcpfCopy strong{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mcpfCopy>span:last-child{font-size:10.5px;color:#68727d;line-height:1.4}.mcpfDetails{position:relative}.mcpfDetails summary{list-style:none;min-height:44px;padding:0 13px;border:1px solid #b8c0c9;border-radius:9px;background:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;cursor:pointer}.mcpfDetails summary::-webkit-details-marker{display:none}.mcpfDetails[open] summary{background:#111318;color:#fff;border-color:#111318}.mcpfForm{position:absolute;z-index:25;top:52px;right:0;width:min(520px,calc(100vw - 40px));padding:14px;border:1px solid #d8dde3;border-radius:13px;background:#fff;box-shadow:0 16px 38px rgba(17,19,24,.12);display:grid;grid-template-columns:1fr 1fr;gap:10px}.mcpfForm>div{display:grid;gap:5px;min-width:0}.mcpfForm label{font-size:10px;font-weight:800;color:#59636f}.mcpfForm select{width:100%;min-height:44px;border:1px solid #b8c0c9;border-radius:9px;background:#fff;padding:0 9px;min-width:0}.mcpfActions{grid-column:1/-1;display:flex!important;justify-content:flex-end;gap:8px}.mcpfActions button,.mcpfActions a{min-height:44px;padding:0 13px;border:1px solid #b8c0c9;border-radius:9px;background:#fff;color:#111318;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-size:11px;font-weight:800}.mcpfActions button{background:#111318;color:#fff;border-color:#111318}.mcpfDetails summary:focus-visible,.mcpfForm button:focus-visible,.mcpfForm a:focus-visible,.mcpfForm select:focus-visible{outline:3px solid #173f8f;outline-offset:3px}@media(max-width:680px){.mcpfCard{grid-template-columns:1fr auto;padding:12px}.mcpfCopy>span:last-child{font-size:10px}.mcpfDetails summary{padding:0 11px}.mcpfForm{position:fixed;left:12px;right:12px;top:auto;bottom:12px;width:auto;grid-template-columns:1fr;padding:16px;border-radius:18px;box-shadow:0 20px 60px rgba(17,19,24,.24)}.mcpfActions{grid-column:auto;display:grid!important;grid-template-columns:1fr 1fr}.mcpfActions>*{width:100%}}@media(max-width:380px){.mcpfMark{display:none}.mcpfSummary{gap:0}.mcpfCard{gap:9px}.mcpfCopy strong{font-size:12px}.mcpfDetails summary{font-size:10px;padding:0 9px}}
    `}</style>
  </section>;
}