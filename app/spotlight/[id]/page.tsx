import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import SocialShare from '@/components/SocialShare';
import {getPublicSpotlight} from '@/lib/public-spotlight';

export const dynamic='force-dynamic';
function monthLabel(value:string|null){if(!value)return'Monthly Spotlight';return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));}
function siteUrl(){return (process.env.NEXT_PUBLIC_SITE_URL?.trim()||'https://mettelo.com').replace(/\/$/,'');}
function categoryLabel(value:string){return value==='leader'?'Project leadership':value.charAt(0).toUpperCase()+value.slice(1);}

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const {id}=await params;
  try{
    const item=await getPublicSpotlight(id);
    if(!item)return {title:'Mettelo Spotlight'};
    const title=`${item.displayName} — ${item.title} · ${monthLabel(item.awardMonth)}`;
    const description=item.summary||`${item.displayName} has been recognised through verified contribution in Mettelo Spotlight.`;
    return {title,description,openGraph:{title,description,type:'article',url:`/spotlight/${item.id}`},twitter:{card:'summary_large_image',title,description}};
  }catch{return {title:'Mettelo Spotlight'};}
}

export default async function SpotlightDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const item=await getPublicSpotlight(id);
  if(!item)notFound();
  const url=`${siteUrl()}/spotlight/${item.id}`;
  const text=`${item.displayName} is recognised as ${item.title} in Mettelo’s ${monthLabel(item.awardMonth)} Spotlight.`;
  return <section className="section softSection"><div className="shell spotlightDetailShell">
    <main className="spotlightDetailCard" aria-labelledby="spotlight-title">
      <Link className="spotlightBackLink" href="/spotlight">← Back to Spotlight</Link>
      <div className="eyebrow">{monthLabel(item.awardMonth)} · METTELO SPOTLIGHT</div>
      <div className="spotlightDetailInitial" aria-hidden="true">{item.displayName.charAt(0).toUpperCase()}</div>
      <span className="chip green">✓ EVIDENCE-BACKED RECOGNITION</span>
      <h1 id="spotlight-title">{item.title}</h1>
      <h2>{item.displayName}</h2>
      {item.headline&&<p className="spotlightDetailHeadline"><strong>{item.headline}</strong></p>}
      <p className="spotlightDetailSummary">{item.summary||'Recognised for verified contribution through Mettelo project work.'}</p>

      <dl className="spotlightDetailFacts">
        <div><dt>Award</dt><dd>{categoryLabel(item.category)}</dd></div>
        <div><dt>Recognition month</dt><dd>{monthLabel(item.awardMonth)}</dd></div>
        {item.publishedAt&&<div><dt>Published</dt><dd>{new Date(item.publishedAt).toLocaleDateString('en-GB',{dateStyle:'long'})}</dd></div>}
      </dl>

      {(item.project||item.evidence)&&<section className="spotlightDetailEvidence" aria-labelledby="spotlight-evidence-heading"><p className="cardNumber">PUBLIC EVIDENCE CONTEXT</p><h3 id="spotlight-evidence-heading">What this recognition can safely point to</h3><p>Project and Proof links appear only when those records are independently authorised for public viewing.</p><div className="actions">{item.project&&<Link className="button ghost" href={`/projects/${item.project.id}`}>{item.project.title} →</Link>}{item.evidence&&<Link className="button ghost" href={`/proof/${item.evidence.id}`}>View verified Proof →</Link>}</div></section>}

      <div className="panelNote"><strong>Published with member permission.</strong><p>Mettelo selected this recognition automatically from qualifying evidence-backed activity. Admin safeguards exceptions; the recognised member controls whether their personal recognition is public.</p></div>

      <section className="spotlightDetailShare" aria-labelledby="spotlight-share-heading"><div><p className="cardNumber">SHARE RECOGNITION</p><h3 id="spotlight-share-heading">Share this public Spotlight.</h3><p>This share link contains only the public Spotlight projection shown on this page. If publication consent is withdrawn, this URL stops exposing the recognition.</p></div><SocialShare url={url} text={text} label="Share this Spotlight recognition"/></section>
      <div className="actions">{item.profileHref&&<Link className="button dark" href={item.profileHref}>View public profile →</Link>}<Link className="button ghost" href="/spotlight">More Spotlight recognition →</Link></div>
    </main>
    <style>{`
      .spotlightDetailShell{max-width:900px}.spotlightDetailCard{padding:clamp(22px,4vw,44px);border:1px solid #ddd6ca;border-radius:22px;background:#fff}.spotlightBackLink{display:inline-flex;min-height:44px;align-items:center;margin-bottom:18px;font-weight:760}.spotlightDetailInitial{display:grid;width:76px;height:76px;margin:20px 0;place-items:center;border:1px solid #d5c9b8;border-radius:50%;background:#fbf7ee;font-size:1.8rem;font-weight:850}.spotlightDetailCard h1{margin:14px 0 8px;font-size:clamp(2.5rem,6vw,4.7rem);line-height:1;letter-spacing:-.04em;overflow-wrap:anywhere}.spotlightDetailCard h2{margin:0;font-size:clamp(1.35rem,3vw,2rem)}.spotlightDetailHeadline{margin-top:8px}.spotlightDetailSummary{max-width:720px;font-size:1.05rem;line-height:1.7}.spotlightDetailFacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin:28px 0;background:#e7e1d6;border:1px solid #e7e1d6}.spotlightDetailFacts div{padding:16px;background:#fcfbf7}.spotlightDetailFacts dt{font-size:.7rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#68717f}.spotlightDetailFacts dd{margin:6px 0 0;font-weight:780}.spotlightDetailEvidence,.spotlightDetailShare{margin-top:28px;padding-top:24px;border-top:1px solid #e7e1d6}.spotlightDetailShare{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center}.spotlightDetailShare h3{margin:6px 0}.spotlightDetailCard :focus-visible{outline:3px solid rgba(198,137,42,.38);outline-offset:3px}
      @media(max-width:768px){.spotlightDetailFacts{grid-template-columns:1fr}.spotlightDetailShare{grid-template-columns:1fr}.spotlightDetailCard>.actions,.spotlightDetailEvidence .actions{display:grid}.spotlightDetailCard>.actions .button,.spotlightDetailEvidence .button{width:100%;min-height:44px}}
      @media(max-width:480px){.spotlightDetailCard{border-radius:16px}.spotlightDetailCard h1{font-size:clamp(2.25rem,13vw,3.4rem)}}
    `}</style>
  </div></section>;
}
