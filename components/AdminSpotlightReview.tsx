'use client';

import {useState} from 'react';

type Item={
  id:string;name:string;headline:string|null;title:string;category:string;summary:string|null;award_month:string|null;score:number|null;score_breakdown:Record<string,number>|null;status:string;is_excluded:boolean;exclusion_reason:string|null;consent_status:string;publication_held:boolean;hold_reason:string|null;suppress_public_project:boolean;suppress_public_evidence:boolean;project_title:string|null;evidence_titles:string[];
};
const consentCopy:Record<string,string>={not_requested:'Not requested',pending:'Awaiting member choice',granted:'Member consent granted',declined:'Member kept it private',withdrawn:'Consent withdrawn'};
type Action='exclude'|'hold'|'unhold'|'suppress_project'|'restore_project'|'suppress_evidence'|'restore_evidence';

export default function AdminSpotlightReview({initialItems}:{initialItems:Item[]}){
  const [items,setItems]=useState(initialItems);const [message,setMessage]=useState('');const [busy,setBusy]=useState('');
  async function act(item:Item,action:Action){
    let reason='';
    if(['exclude','hold','suppress_project','suppress_evidence'].includes(action)){
      const prompt=action==='exclude'?'Reason for excluding this automatic selection?':action==='hold'?'Reason for placing public publication on hold?':action==='suppress_project'?'Reason for suppressing project context from the public award?':'Reason for suppressing public Proof context from the award?';
      reason=window.prompt(prompt)?.trim()||'';
      if(['exclude','hold'].includes(action)&&!reason)return;
    }
    setBusy(`${item.id}:${action}`);setMessage('');
    try{
      const response=await fetch('/api/admin/spotlights',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,action,reason})});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Spotlight governance action failed.');
      if(action==='exclude'){setMessage(data.message||'Selection excluded.');window.location.reload();return;}
      setItems(current=>current.map(row=>row.id===item.id?{
        ...row,
        status:data.item?.status||row.status,
        consent_status:data.item?.consent_status||row.consent_status,
        publication_held:data.item?.publication_held??row.publication_held,
        hold_reason:data.item?.hold_reason??(action==='unhold'?null:row.hold_reason),
        suppress_public_project:data.item?.suppress_public_project??row.suppress_public_project,
        suppress_public_evidence:data.item?.suppress_public_evidence??row.suppress_public_evidence
      }:row));
      setMessage(data.message||'Spotlight governance updated.');
    }catch(error){setMessage(error instanceof Error?error.message:'Spotlight governance action failed.');}finally{setBusy('');}
  }
  if(!items.length)return <div className="emptyState"><h3>No Spotlight recognition has been created yet.</h3><p>The monthly system creates evidence-backed recognition automatically when qualifying members exist. Admin does not need to nominate routine winners.</p></div>;
  return <div className="adminSpotlightReview">{message&&<div className="formStatus" role="status" aria-live="polite"><strong>{message}</strong></div>}{items.map(item=><article className="adminSpotlightCard" key={item.id}>
    <div className="adminSpotlightHead"><div><div className="metaRow"><span className="chip">{item.category.toUpperCase()}</span><span className="metaPill">{item.award_month||'No month'}</span><span className="metaPill">{item.status}</span><span className="metaPill">{consentCopy[item.consent_status]||item.consent_status}</span>{item.publication_held&&<span className="metaPill">PUBLICATION HELD</span>}{item.is_excluded&&<span className="metaPill">EXCLUDED</span>}</div><h3>{item.title} — {item.name}</h3>{item.headline&&<p><strong>{item.headline}</strong></p>}</div><div className="adminSpotlightScore"><small>INTERNAL SCORE</small><strong>{item.score??0}</strong></div></div>
    <p>{item.summary}</p>
    {item.score_breakdown&&<div className="metaRow" aria-label="Internal scoring breakdown">{Object.entries(item.score_breakdown).map(([key,value])=><span className="metaPill" key={key}>{key}: {value}</span>)}</div>}
    <div className="adminSpotlightEvidence"><div><small>PRIMARY PROJECT</small><strong>{item.project_title||'No project context resolved'}</strong></div><div><small>VERIFIED EVIDENCE</small>{item.evidence_titles.length?<ul>{item.evidence_titles.slice(0,6).map(title=><li key={title}>{title}</li>)}</ul>:<strong>No provenance rows resolved</strong>}</div></div>
    {item.exclusion_reason&&<p className="panelNote"><strong>Exclusion reason:</strong> {item.exclusion_reason}</p>}{item.publication_held&&<p className="panelNote"><strong>Publication hold:</strong> {item.hold_reason||'Exception review in progress.'}</p>}
    <div className="adminSpotlightGovernance"><div><strong>System owns normal flow.</strong><p>Selection and consent requests are automatic. Member consent triggers publication automatically unless an exception hold blocks it. Admin cannot grant member consent.</p></div><div className="actions">{item.status==='draft'&&!item.is_excluded&&<button className="button ghost" type="button" disabled={Boolean(busy)} onClick={()=>void act(item,'exclude')}>Exclude selection</button>}{!item.publication_held&&item.status!=='archived'&&!item.is_excluded&&<button className="button ghost" type="button" disabled={Boolean(busy)} onClick={()=>void act(item,'hold')}>Hold publication</button>}{item.publication_held&&<button className="button ghost" type="button" disabled={Boolean(busy)} onClick={()=>void act(item,'unhold')}>Clear publication hold</button>}{item.project_title&&!item.suppress_public_project&&<button className="button ghost" type="button" disabled={Boolean(busy)} onClick={()=>void act(item,'suppress_project')}>Suppress public project</button>}{item.suppress_public_project&&<button className="button ghost" type="button" disabled={Boolean(busy)} onClick={()=>void act(item,'restore_project')}>Restore safe project context</button>}{item.evidence_titles.length>0&&!item.suppress_public_evidence&&<button className="button ghost" type="button" disabled={Boolean(busy)} onClick={()=>void act(item,'suppress_evidence')}>Suppress public Proof</button>}{item.suppress_public_evidence&&<button className="button ghost" type="button" disabled={Boolean(busy)} onClick={()=>void act(item,'restore_evidence')}>Restore safe Proof context</button>}</div></div>
  </article>)}<style>{`
    .adminSpotlightReview{display:grid;gap:18px}.adminSpotlightCard{display:grid;gap:16px;padding:22px;border:1px solid #ddd6ca;border-radius:18px;background:#fff}.adminSpotlightHead{display:flex;justify-content:space-between;gap:20px}.adminSpotlightHead h3{margin:12px 0 4px}.adminSpotlightScore{display:grid;place-items:center;min-width:100px;padding:12px;border:1px solid #e7e1d6;border-radius:12px;background:#fcfbf7}.adminSpotlightScore small{font-size:.65rem;font-weight:800;letter-spacing:.05em}.adminSpotlightScore strong{font-size:1.7rem}.adminSpotlightEvidence{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(0,1.3fr);gap:16px;padding:16px;border:1px solid #e7e1d6;border-radius:12px;background:#fcfbf7}.adminSpotlightEvidence>div{display:grid;gap:6px}.adminSpotlightEvidence small{font-size:.68rem;font-weight:800;letter-spacing:.05em}.adminSpotlightEvidence ul{margin:0;padding-left:18px}.adminSpotlightGovernance{display:grid;grid-template-columns:minmax(250px,.75fr) minmax(0,1.25fr);gap:18px;padding-top:4px}.adminSpotlightGovernance p{margin:4px 0 0}.adminSpotlightGovernance .actions{justify-content:flex-end}.adminSpotlightCard :focus-visible{outline:3px solid rgba(198,137,42,.38);outline-offset:3px}@media(max-width:900px){.adminSpotlightHead,.adminSpotlightGovernance{display:grid}.adminSpotlightScore{width:max-content}.adminSpotlightEvidence{grid-template-columns:1fr}.adminSpotlightGovernance .actions{justify-content:flex-start}}@media(max-width:560px){.adminSpotlightCard{padding:18px}.adminSpotlightGovernance .actions{display:grid}.adminSpotlightGovernance .button{width:100%;min-height:44px}}
  `}</style></div>;
}
