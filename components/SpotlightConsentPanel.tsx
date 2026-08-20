'use client';

import Link from 'next/link';
import {useState} from 'react';
import SocialShare from '@/components/SocialShare';

export type SpotlightMemberItem={
  id:string;
  title:string;
  category:string;
  summary:string|null;
  awardMonth:string|null;
  status:string;
  consentStatus:string;
  selectedAt:string|null;
  publishedAt:string|null;
  publicationHeld:boolean;
  projectTitle:string|null;
  evidenceTitles:string[];
  publicUrl:string|null;
};

type Props={initialItems:SpotlightMemberItem[];publicationName:string;publicationHeadline:string|null;detail?:boolean};

function monthLabel(value:string|null){if(!value)return'Monthly Spotlight';return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));}
function categoryLabel(value:string){return value==='leader'?'Project leadership':value.charAt(0).toUpperCase()+value.slice(1);}
function state(item:SpotlightMemberItem){
  if(item.consentStatus==='withdrawn')return{label:'Permission withdrawn',detail:'Your recognition remains in your private history and the public URL is no longer available.'};
  if(item.consentStatus==='declined')return{label:'Publication declined',detail:'Your recognition remains private. Declining does not remove the award from your Mettelo history.'};
  if(item.publicationHeld)return{label:'Publication on hold',detail:'Your recognition remains recorded. Public access and sharing are paused while Mettelo resolves an exception. You can still make or change your publication choice.'};
  if(item.status==='published'&&item.consentStatus==='granted')return{label:'Published',detail:'Your recognition is public because you granted permission. You can view or share it.'};
  if(item.consentStatus==='granted')return{label:'Permission granted',detail:'You granted publication permission. Publication will happen automatically when no hold or exception blocks it.'};
  return{label:'Your choice needed',detail:'Review what would be published, then allow or decline public Spotlight.'};
}

export default function SpotlightConsentPanel({initialItems,publicationName,publicationHeadline,detail=false}:Props){
  const [items,setItems]=useState(initialItems);const [busy,setBusy]=useState('');const [message,setMessage]=useState('');
  async function act(item:SpotlightMemberItem,action:'grant'|'decline'|'withdraw'){
    setBusy(`${item.id}:${action}`);setMessage('');
    try{
      const response=await fetch('/api/spotlight-consent',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,action})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Unable to update Spotlight publication permission.');
      setItems(current=>current.map(row=>{
        if(row.id!==item.id)return row;
        const nextUrl=body.publicUrl?new URL(body.publicUrl,window.location.origin).toString():null;
        return {...row,status:body.item?.status||row.status,consentStatus:body.item?.consent_status||row.consentStatus,publicationHeld:body.item?.publication_held??row.publicationHeld,publicUrl:nextUrl,publishedAt:(body.item?.status==='published'&&!row.publishedAt)?new Date().toISOString():row.publishedAt};
      }));
      setMessage(body.message||'Spotlight publication choice updated.');
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to update Spotlight publication permission.');}
    finally{setBusy('');}
  }

  if(!items.length)return <div className="spotlightMemberEmpty"><h2>No Spotlight recognition yet.</h2><p>Spotlight is earned automatically from qualifying evidence-backed contribution. There is nothing you need to nominate or submit.</p><Link className="button dark" href="/member/projects">Continue project work →</Link></div>;

  const publicCount=items.filter(item=>item.status==='published'&&item.consentStatus==='granted'&&!item.publicationHeld).length;
  const actionCount=items.filter(item=>item.status==='draft'&&!['granted','declined'].includes(item.consentStatus)).length;
  return <div className={`spotlightMemberPortfolio${detail?' spotlightMemberPortfolioDetail':''}`}>
    {!detail&&<div className="spotlightMemberSummary" aria-label="Spotlight summary"><div><strong>{items.length}</strong><span>Recognition{items.length===1?'':'s'}</span></div><div><strong>{publicCount}</strong><span>Public</span></div><div><strong>{actionCount}</strong><span>Needs your choice</span></div></div>}
    {message&&<div className="formStatus" role="status" aria-live="polite"><strong>{message}</strong></div>}
    <div className="spotlightMemberCollection">{items.map(item=>{const current=state(item);const isPublic=item.status==='published'&&item.consentStatus==='granted'&&!item.publicationHeld&&Boolean(item.publicUrl);const canChoose=item.status==='draft'&&item.consentStatus!=='granted';const heldState=item.publicationHeld&&!['declined','withdrawn'].includes(item.consentStatus);return <article className={`spotlightMemberCard${isPublic?' isPublic':''}`} key={item.id}>
      <div className="spotlightMemberCardHead"><div><span className="chip">{categoryLabel(item.category)} · {monthLabel(item.awardMonth)}</span><h2>{item.title}</h2></div><span className="spotlightMemberStatus"><span aria-hidden="true">{isPublic?'✓':heldState?'!':'●'}</span>{current.label}</span></div>
      <p className="spotlightMemberSummaryText">{item.summary||'Recognition based on verified Mettelo contribution.'}</p>
      <div className="spotlightMemberEvidence"><p className="cardNumber">WHY THIS RECOGNITION</p>{item.evidenceTitles.length?<ul>{item.evidenceTitles.slice(0,3).map(title=><li key={title}>{title}</li>)}</ul>:<p>Verified Mettelo contribution evidence is attached to this recognition.</p>}{item.projectTitle&&<p><strong>Primary project:</strong> {item.projectTitle}</p>}</div>
      <div className="spotlightMemberState"><strong>{current.label}</strong><p>{current.detail}</p></div>

      {(canChoose||item.consentStatus==='declined')&&<section className="spotlightMemberConsent" aria-label={`Publication choice for ${item.title}`}><h3>What public permission covers</h3><p>If you allow publication, Mettelo may publish <strong>{publicationName}</strong>{publicationHeadline?<> · {publicationHeadline}</>:null}, this award title and summary. Project or Proof context appears only when it is independently public and not suppressed by Mettelo.</p>{item.publicationHeld&&<p><strong>Publication is currently on hold.</strong> Your choice will be recorded now, but nothing becomes public or shareable until the hold is cleared.</p>}<div className="actions"><button className="button dark" type="button" disabled={Boolean(busy)} onClick={()=>void act(item,'grant')}>Allow public Spotlight</button>{item.consentStatus!=='declined'&&<button className="button ghost" type="button" disabled={Boolean(busy)} onClick={()=>void act(item,'decline')}>Keep this recognition private</button>}</div></section>}

      {item.consentStatus==='granted'&&<div className="actions"><button className="button ghost" type="button" disabled={Boolean(busy)} onClick={()=>void act(item,'withdraw')}>Withdraw publication permission</button></div>}

      {isPublic&&item.publicUrl&&<section className="spotlightMemberShare" aria-labelledby={`share-${item.id}`}><div><p className="cardNumber">SHARE YOUR RECOGNITION</p><h3 id={`share-${item.id}`}>Share your public Spotlight.</h3><p>Use your canonical public recognition link on social media. Only the public-safe Spotlight projection is shared.</p></div><SocialShare url={item.publicUrl} text={`I’m recognised as ${item.title} in Mettelo’s ${monthLabel(item.awardMonth)} Spotlight.`} label="Share my Spotlight recognition"/><div className="actions"><Link className="button dark" href={`/spotlight/${item.id}`}>View public recognition →</Link></div></section>}

      {!detail&&<div className="spotlightMemberFooter"><Link className="linkArrow" href={`/member/spotlight/${item.id}`}>View recognition details →</Link>{item.selectedAt&&<span>Recognised {new Date(item.selectedAt).toLocaleDateString('en-GB')}</span>}</div>}
    </article>})}</div>
    <style>{`
      .spotlightMemberPortfolio{display:grid;gap:22px}.spotlightMemberSummary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.spotlightMemberSummary>div{display:grid;gap:4px;padding:17px 18px;border:1px solid #ddd6ca;border-radius:14px;background:#fff}.spotlightMemberSummary strong{font-size:1.7rem}.spotlightMemberSummary span{color:#626b78;font-size:.82rem;font-weight:760}.spotlightMemberCollection{display:grid;gap:18px}.spotlightMemberCard{display:grid;gap:18px;padding:22px;border:1px solid #ddd6ca;border-radius:18px;background:#fff}.spotlightMemberCard.isPublic{border-color:#b8a06d}.spotlightMemberCardHead{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.spotlightMemberCard h2{margin:10px 0 0;font-size:clamp(1.55rem,3vw,2.25rem);overflow-wrap:anywhere}.spotlightMemberStatus{display:inline-flex;min-height:36px;align-items:center;gap:7px;padding:6px 9px;border:1px solid #d6cec0;border-radius:999px;background:#fcfbf7;font-size:.76rem;font-weight:800;white-space:nowrap}.spotlightMemberSummaryText{max-width:760px;margin:0;font-size:1rem;line-height:1.65}.spotlightMemberEvidence,.spotlightMemberState,.spotlightMemberConsent,.spotlightMemberShare{padding:18px;border:1px solid #e7e1d6;border-radius:14px;background:#fcfbf7}.spotlightMemberEvidence ul{margin:10px 0;padding-left:20px}.spotlightMemberEvidence li{margin:6px 0}.spotlightMemberState strong,.spotlightMemberConsent h3,.spotlightMemberShare h3{display:block;margin:0 0 6px}.spotlightMemberState p,.spotlightMemberConsent p,.spotlightMemberShare p{margin:0;line-height:1.6}.spotlightMemberConsent .actions,.spotlightMemberShare .actions{margin-top:14px}.spotlightMemberShare{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center}.spotlightMemberShare .actions{grid-column:1/-1}.spotlightMemberFooter{display:flex;justify-content:space-between;gap:16px;align-items:center;padding-top:4px;font-size:.82rem;color:#68717f}.spotlightMemberEmpty{padding:28px;border:1px solid #ddd6ca;border-radius:18px;background:#fff}.spotlightMemberCard :focus-visible,.spotlightMemberEmpty :focus-visible{outline:3px solid #173f8f;outline-offset:3px}
      @media(max-width:1024px){.spotlightMemberShare{grid-template-columns:1fr}.spotlightMemberShare .actions{grid-column:auto}.spotlightMemberCardHead{display:grid}.spotlightMemberStatus{width:max-content;max-width:100%}}
      @media(max-width:640px){.spotlightMemberSummary{grid-template-columns:1fr 1fr}.spotlightMemberSummary>div:first-child{grid-column:1/-1}.spotlightMemberCard{padding:18px}.spotlightMemberConsent .actions,.spotlightMemberShare .actions{display:grid}.spotlightMemberConsent .button,.spotlightMemberShare .button{width:100%;min-height:44px}.spotlightMemberFooter{display:grid}.spotlightMemberStatus{white-space:normal}}
      @media(prefers-reduced-motion:reduce){.spotlightMemberPortfolio *{scroll-behavior:auto!important;transition:none!important}}
    `}</style>
  </div>;
}
