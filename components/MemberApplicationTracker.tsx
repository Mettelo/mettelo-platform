'use client';

type Application={id:string;status:string;submitted_at:string;project_id:string;projects:{title:string}|null;project_roles:{title:string}|null};

const steps=['submitted','in_review','shortlisted','accepted'] as const;
const labels:{[key:string]:string}={submitted:'Submitted',in_review:'In review',shortlisted:'Shortlisted',accepted:'Accepted',declined:'Declined'};

function progressIndex(status:string){if(status==='declined')return -1;const index=steps.indexOf(status as typeof steps[number]);return index<0?0:index;}

export default function MemberApplicationTracker({applications}:{applications:Application[]}){
  if(!applications.length)return <div className="emptyState"><h3>No applications yet.</h3><p>When you apply to a Labs project, you will see the project name, submission date and review progress here.</p><a className="linkArrow" href="/projects">Explore Labs →</a></div>;

  return <div className="memberApplicationList">{applications.map(item=>{
    const current=progressIndex(item.status);
    const accepted=item.status==='accepted';
    const declined=item.status==='declined';
    return <article className="memberApplicationCard" key={item.id}>
      <div className="memberApplicationHead"><div><span className="cardNumber">PROJECT APPLICATION</span><h3>{item.projects?.title||'Mettelo Labs project'}</h3><p>{item.project_roles?.title?`${item.project_roles.title} · `:''}Submitted {new Date(item.submitted_at).toLocaleDateString('en-GB')}</p></div><span className={`chip ${accepted?'green':''}`}>{(labels[item.status]||item.status.replace('_',' ')).toUpperCase()}</span></div>
      {declined?<div className="applicationOutcome declined"><strong>Application closed</strong><span>This application was not selected. You can continue exploring other Labs projects.</span></div>:<div className="applicationProgress" aria-label={`Application status: ${labels[item.status]||item.status}`}>
        {steps.map((step,index)=><div className={`applicationStep ${index<=current?'complete':''} ${index===current?'current':''}`} key={step}><span>{index<current?'✓':index+1}</span><small>{labels[step]}</small></div>)}
      </div>}
      <div className="memberApplicationFoot"><p>{accepted?'You are now part of the project team. Open the workspace to collaborate with the team and follow delivery.':item.status==='shortlisted'?'You have progressed to the shortlist. The project team will make the final selection next.':item.status==='in_review'?'Your application has been received and is being reviewed by the Mettelo team.':'Your application has been received. We will show every status change here.'}</p>{accepted&&<a className="button dark" href={`/member/projects/${item.project_id}`}>Open workspace →</a>}</div>
    </article>;
  })}<style jsx>{`
    .memberApplicationList{display:grid;gap:12px}.memberApplicationCard{padding:20px;border:1px solid rgba(16,19,29,.09);border-radius:16px;background:#fff}.memberApplicationHead{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.memberApplicationHead h3{margin:7px 0 4px;font-size:1.05rem}.memberApplicationHead p,.memberApplicationFoot p{margin:0;color:#66707e;font-size:.82rem}.applicationProgress{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin:20px 0 16px}.applicationStep{position:relative;display:grid;justify-items:center;gap:7px;color:#9aa1ab}.applicationStep:not(:last-child):after{content:"";position:absolute;top:14px;left:55%;right:-45%;height:2px;background:#e1e4e8}.applicationStep.complete:not(:last-child):after{background:#c6892a}.applicationStep span{position:relative;z-index:1;width:28px;height:28px;display:grid;place-items:center;border:2px solid #d7dbe0;border-radius:50%;background:#fff;font-size:.68rem;font-weight:800}.applicationStep.complete span{border-color:#c6892a;background:#f7efdd;color:#8b5a17}.applicationStep.current span{box-shadow:0 0 0 4px rgba(198,137,42,.12)}.applicationStep small{font-size:.68rem;font-weight:700;text-align:center}.applicationStep.complete small{color:#525b67}.memberApplicationFoot{display:flex;align-items:center;justify-content:space-between;gap:18px;padding-top:14px;border-top:1px solid rgba(16,19,29,.07)}.applicationOutcome{margin:18px 0 14px;padding:13px 14px;border-radius:12px;background:#fbf2f2;color:#7f3030}.applicationOutcome strong,.applicationOutcome span{display:block}.applicationOutcome span{margin-top:3px;font-size:.76rem}@media(max-width:620px){.applicationProgress{grid-template-columns:repeat(4,minmax(62px,1fr));overflow-x:auto;padding-bottom:4px}.memberApplicationHead,.memberApplicationFoot{display:grid}.memberApplicationFoot .button{width:100%}}
  `}</style></div>;
}
