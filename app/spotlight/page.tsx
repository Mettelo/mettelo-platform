import type {Metadata} from 'next';
import Link from 'next/link';
import SocialShare from '@/components/SocialShare';
import {listPublicSpotlights,type PublicSpotlightAward} from '@/lib/public-spotlight';

export const metadata:Metadata={
  title:'Mettelo Spotlight',
  description:'Evidence-backed Mettelo recognition earned through real contribution and published with each member’s permission.'
};
export const dynamic='force-dynamic';

function monthLabel(value:string|null){if(!value)return'Monthly Spotlight';return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));}
function siteUrl(){return (process.env.NEXT_PUBLIC_SITE_URL?.trim()||'https://mettelo.com').replace(/\/$/,'');}
function categoryLabel(value:string){return value==='leader'?'Project leadership':value.charAt(0).toUpperCase()+value.slice(1);}

function AwardCard({item}:{item:PublicSpotlightAward}){
  const url=`${siteUrl()}/spotlight/${item.id}`;
  const shareText=`${item.displayName} is recognised as ${item.title} in Mettelo’s ${monthLabel(item.awardMonth)} Spotlight.`;
  return <article className="spotlightPublicCard">
    <div className="spotlightPublicCardTop">
      <span className="chip green spotlightPublicChip">{categoryLabel(item.category)} · {monthLabel(item.awardMonth)}</span>
      <div className="spotlightPublicInitial" aria-hidden="true">{item.displayName.charAt(0).toUpperCase()}</div>
      <p className="cardNumber">EVIDENCE-BACKED RECOGNITION</p>
      <h3>{item.title}</h3>
      <h4>{item.displayName}</h4>
      {item.headline&&<p><strong>{item.headline}</strong></p>}
      <p>{item.summary||'Recognised for verified contribution through Mettelo project work.'}</p>
      {item.project&&<p className="spotlightPublicContext"><strong>Project:</strong> {item.project.title}</p>}
      {item.evidence&&<p className="spotlightPublicContext"><strong>Public Proof:</strong> {item.evidence.title}</p>}
    </div>
    <div className="spotlightPublicCardActions">
      <SocialShare url={url} text={shareText} label="Share this Spotlight recognition"/>
      <div className="actions">
        <Link className="linkArrow" href={`/spotlight/${item.id}`}>Open recognition →</Link>
        {item.profileHref&&<Link className="linkArrow" href={item.profileHref}>View profile →</Link>}
      </div>
    </div>
  </article>;
}

export default async function SpotlightPage(){
  let rows:PublicSpotlightAward[]=[];let loadError=false;
  try{rows=await listPublicSpotlights();}catch(error){console.error('public Spotlight load error',error);loadError=true;}
  const latestMonth=rows[0]?.awardMonth||null;
  const latest=latestMonth?rows.filter(row=>row.awardMonth===latestMonth).slice(0,3):[];
  const history=rows.filter(row=>row.awardMonth!==latestMonth);
  const grouped=new Map<string,PublicSpotlightAward[]>();
  history.forEach(row=>{const key=row.awardMonth||'archive';grouped.set(key,[...(grouped.get(key)||[]),row]);});
  const awardInfo=[
    ['Builder of the Month','Recognises verified delivery and inspectable contribution.'],
    ['Collaborator of the Month','Recognises verified work strengthened by useful team participation and shared progress.'],
    ['Project Leader of the Month','Recognises verified work alongside meaningful project responsibility and coordination.']
  ];

  return <>
    <section className="spotlightPublicHero" aria-labelledby="spotlight-public-title"><div className="shell spotlightPublicHeroGrid">
      <div><div className="eyebrow">METTELO SPOTLIGHT</div><h1 id="spotlight-public-title" style={{minWidth:0,maxWidth:'100%',overflowWrap:'anywhere',wordBreak:'break-word',hyphens:'auto'}}>Recognition earned through real contribution.</h1><p className="heroLead">Spotlight recognises evidence-backed work across building, collaboration and project leadership. Selection is automatic from qualifying Mettelo activity; personal recognition appears here only after the member gives explicit publication permission.</p></div>
      <aside className="spotlightPublicPrinciple" aria-label="How Spotlight works"><span className="chip spotlightPublicChip">SYSTEM SELECTS · MEMBER CONSENTS</span><h2>Recognition is not a popularity contest.</h2><p>Verified contribution is required. Other real delivery and collaboration signals can strengthen a category score, but posting volume alone cannot create an award.</p><div className="spotlightPublicPath"><span>Work</span><span>Verified evidence</span><span>Automatic selection</span><span>Consent</span><span>Public Spotlight</span></div></aside>
    </div></section>

    <section className="section"><div className="shell">
      <div className="sectionHead"><div><div className="eyebrow">LATEST RECOGNITION</div><h2>{latestMonth?monthLabel(latestMonth):'Recognition will appear when members choose to publish it.'}</h2></div><p>A month can show one, two or three awards. Private, declined, withdrawn, held or excluded recognition never appears here.</p></div>
      {loadError?<div className="panel emptyState" role="status"><h3>Spotlight is temporarily unavailable.</h3><p>Recognition data could not be loaded safely. Please try again later.</p></div>:latest.length?<div className="spotlightPublicGrid">{latest.map(item=><AwardCard item={item} key={item.id}/>)}</div>:<div className="panel emptyState"><h3>No public Spotlight recognition yet.</h3><p>Mettelo does not publish placeholder winners. Recognition appears only after verified contribution earns an award and the recognised member chooses to make it public.</p><Link className="button dark" href="/projects">Explore projects →</Link></div>}
    </div></section>

    <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">THE AWARDS</div><h2>Different contribution deserves different recognition.</h2></div><p>Each category uses a different evidence mix, while every winner still needs verified Mettelo contribution in the award month.</p></div><div className="spotlightAwardInfoGrid">{awardInfo.map(([title,copy],index)=><article className="card" key={title}><div className="cardNumber">0{index+1}</div><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>

    {grouped.size>0&&<section className="section"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">PREVIOUS MONTHS</div><h2>Published recognition remains part of Mettelo history.</h2></div><p>Only recognition with current publication consent remains publicly accessible and shareable.</p></div>{[...grouped.entries()].map(([month,items])=><section className="spotlightHistoryMonth" key={month} aria-labelledby={`spotlight-${month}`}><h3 id={`spotlight-${month}`}>{monthLabel(month)}</h3><div className="spotlightPublicGrid">{items.slice(0,3).map(item=><AwardCard item={item} key={item.id}/>)}</div></section>)}</div></section>}

    <section className="section compact"><div className="shell"><div className="ctaBand"><div><div className="cardNumber">BUILD · HELP · LEAD</div><h2>Recognition starts with useful work.</h2><p>Join real project work, contribute evidence and help a team make progress. Spotlight follows verified contribution—not self-claims.</p></div><Link className="button dark" href="/projects">Explore projects →</Link></div></div></section>

    <style>{`
      .spotlightPublicHero{padding:58px 0 42px;background:linear-gradient(180deg,#fbf7ee 0%,#fcfbf7 100%);border-bottom:1px solid #e7e1d6}.spotlightPublicHeroGrid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);gap:44px;align-items:start}.spotlightPublicHeroGrid>*{min-width:0}.spotlightPublicHero h1{max-width:850px;margin:10px 0 18px;font-size:clamp(2.7rem,5vw,5rem);line-height:.98;letter-spacing:-.045em;overflow-wrap:anywhere;word-break:break-word;hyphens:auto}.spotlightPublicPrinciple{min-width:0;padding:24px;border:1px solid #ddd6ca;border-radius:20px;background:#fff}.spotlightPublicPrinciple h2{font-size:1.45rem;margin:18px 0 10px}.spotlightPublicChip{max-width:100%;white-space:normal;overflow-wrap:anywhere;line-height:1.35}.spotlightPublicPath{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.spotlightPublicPath span{max-width:100%;padding:7px 9px;border:1px solid #ddd6ca;border-radius:999px;font-size:.75rem;font-weight:750;overflow-wrap:anywhere}.spotlightPublicGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.spotlightPublicCard{display:flex;min-width:0;min-height:100%;flex-direction:column;justify-content:space-between;gap:24px;padding:22px;border:1px solid #ddd6ca;border-radius:18px;background:#fff}.spotlightPublicCardTop{min-width:0}.spotlightPublicCard h3{margin:12px 0 5px;font-size:1.4rem;overflow-wrap:anywhere}.spotlightPublicCard h4{margin:0 0 12px;font-size:1rem;overflow-wrap:anywhere}.spotlightPublicCard p{overflow-wrap:anywhere}.spotlightPublicInitial{display:grid;width:58px;height:58px;margin:18px 0 14px;place-items:center;border:1px solid #d5c9b8;border-radius:50%;background:#fbf7ee;font-size:1.35rem;font-weight:850}.spotlightPublicContext{padding-top:10px;border-top:1px solid #eee8dd;font-size:.9rem;overflow-wrap:anywhere}.spotlightPublicCardActions{display:grid;min-width:0;gap:12px}.spotlightPublicCardActions .actions{min-width:0;margin:0}.spotlightAwardInfoGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.spotlightHistoryMonth{margin-top:32px}.spotlightHistoryMonth>h3{margin-bottom:14px}.spotlightPublicCard :focus-visible,.spotlightPublicPrinciple :focus-visible{outline:3px solid #173f8f;outline-offset:3px}
      @media(max-width:1024px){.spotlightPublicHeroGrid{grid-template-columns:minmax(0,1fr);gap:24px}.spotlightPublicGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.spotlightAwardInfoGrid{grid-template-columns:1fr}}
      @media(max-width:640px){.spotlightPublicHero{padding:38px 0 28px}.spotlightPublicHeroGrid{width:min(calc(100% - 24px),var(--max));}.spotlightPublicHeroGrid>*{min-width:0;max-width:100%;width:100%}.spotlightPublicHeroGrid :where(.eyebrow,h1,h2,p,span){min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere}.spotlightPublicHero h1{font-size:clamp(2.35rem,12vw,3.6rem);word-break:break-word;hyphens:auto}.spotlightPublicPrinciple{width:100%;box-sizing:border-box}.spotlightPublicPath{display:grid;grid-template-columns:minmax(0,1fr)}.spotlightPublicPath span{width:100%;box-sizing:border-box}.spotlightPublicGrid{grid-template-columns:1fr}.spotlightPublicCard{padding:18px}.spotlightPublicCardActions .actions{display:grid}.spotlightPublicCardActions .linkArrow{min-width:0;min-height:44px;display:flex;align-items:center;overflow-wrap:anywhere}}
      @media(prefers-reduced-motion:reduce){.spotlightPublicCard *{scroll-behavior:auto!important;transition:none!important}}
    `}</style>
  </>;
}
