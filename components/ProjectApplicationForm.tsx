'use client';

type Role={id:string;title:string};
type Project={id:string;title:string;roles:Role[]};

export default function ProjectApplicationForm({projects,selectedProjectId,profileMissing=[]}:{projects:Project[];selectedProjectId?:string;profileMissing?:string[]}){
  const selected=projects.find(project=>project.id===selectedProjectId)||null;
  if(!selected)return <div className="formCard projectApplicationBridge"><span className="chip">CHOOSE A PROJECT</span><h3>Select a project before you apply.</h3><p>Project applications now continue inside My Mettelo so your member context and application lifecycle stay together.</p><a className="button dark" href="/member/discover">Open Discover →</a><style jsx>{styles}</style></div>;
  const applyPath=`/member/discover/${selected.id}/apply`;
  if(profileMissing.length)return <div className="formCard projectApplicationBridge"><span className="chip">PROFILE CHECK</span><h3>Complete your Mettelo Readiness before applying.</h3><p>This public project page remains available for project information, but signed-in project applications continue inside My Mettelo.</p><div className="bridgeList">{profileMissing.map(item=><div key={item}><span aria-hidden="true">→</span><strong>{item}</strong></div>)}</div><a className="button dark" href={`/member/profile?next=${encodeURIComponent(applyPath)}`}>Complete profile →</a><a className="button ghost" href={`/member/discover/${selected.id}`}>View member project detail →</a><style jsx>{styles}</style></div>;
  return <div className="formCard projectApplicationBridge"><span className="chip green">MY METTELO APPLICATION</span><h3>Continue this project application inside My Mettelo.</h3><p>Your project role, eligibility, existing application state and current role capacity are revalidated in the authenticated member flow before anything is submitted.</p><a className="button dark" href={applyPath}>Continue to application →</a><a className="button ghost" href={`/member/discover/${selected.id}`}>View member project detail →</a><style jsx>{styles}</style></div>;
}

const styles=`.projectApplicationBridge{display:grid;gap:14px;align-content:start}.projectApplicationBridge h3{font-size:1.55rem;margin:0}.projectApplicationBridge p{margin:0;color:var(--slate);line-height:1.65}.projectApplicationBridge .button{width:max-content;max-width:100%;min-height:44px}.bridgeList{display:grid;gap:8px;padding:14px;border-radius:12px;background:#faf7f0}.bridgeList div{display:grid;grid-template-columns:auto 1fr;gap:9px}.bridgeList span{color:#8b5a17;font-weight:800}@media(max-width:560px){.projectApplicationBridge .button{width:100%}}`;
