'use client';

import {useState} from 'react';

type Metrics={projects:number|null;opportunities:number|null;proofs:number|null};
type ThresholdMetricConfig={label:string;liveLabel:string;historicalValue:number;liveValue:number|null};

type Slide={eyebrow:string;title:string;body:string;accent:string;detailTitle:string;detailBody:string};

const LIVE_THRESHOLD=500;
const slides:Slide[]=[
  {eyebrow:'DATA & AI PROJECTS',title:'Build capability in a real delivery environment.',body:'Roles, tasks, milestones, data, reviews and evidence stay connected from brief to completion.',accent:'Structured real work',detailTitle:'Active project',detailBody:'Your role · Data Analyst'},
  {eyebrow:'VERIFIED PROOF',title:'Show the evidence behind your skills.',body:'Reviewed work stays connected to the project context, contribution, evidence and verification state behind it.',accent:'Contribution reviewed',detailTitle:'Proof record',detailBody:'Contribution · Verified'},
  {eyebrow:'OPPORTUNITY',title:'Use stronger signals when your next move appears.',body:'Projects and verified Proof give organisations more context than a list of skills on a profile.',accent:'Evidence-led discovery',detailTitle:'Opportunity signal',detailBody:'Evidence · Context · Fit'}
];

function ThresholdMetric({label,liveLabel,historicalValue,liveValue}:ThresholdMetricConfig){const useLive=liveValue!==null&&liveValue>=LIVE_THRESHOLD;const value=useLive?liveValue:historicalValue;return <div className="heroMetric"><span>{useLive?liveLabel:label}</span><strong>{value.toLocaleString('en-GB')}+</strong><small>{useLive?'Live platform total':'Established Mettelo total'}</small></div>}
function LiveMetric({label,value}:{label:string;value:number|null}){return <div className="heroMetric"><span>{label}</span><strong>{value===null?'Live':`${value.toLocaleString('en-GB')}+`}</strong><small>Live platform total</small></div>}

export default function HomeHeroShowcase({metrics}:{metrics:Metrics}){
  const [index,setIndex]=useState(0);const slide=slides[index];function move(delta:number){setIndex(current=>(current+delta+slides.length)%slides.length)}
  return <aside className="heroExperience" aria-label="Mettelo Data and AI platform showcase"><div className="heroScene"><div className="heroSceneGlow" aria-hidden="true"/><div className="heroPeopleIllustration" aria-label="Illustrative collaborative professional workspace"><span className="person personOne" aria-hidden="true"><i/><b/></span><span className="person personTwo" aria-hidden="true"><i/><b/></span><span className="workspaceDesk" aria-hidden="true"/></div><div className="heroFloatingProof"><span className="verifiedMark" aria-hidden="true">✓</span><div><small>VERIFIED PROOF</small><strong>Contribution reviewed</strong><span>Evidence connected to delivery</span></div></div><div className="heroFeatureCard"><span className="chip">{slide.eyebrow}</span><h3>{slide.title}</h3><p>{slide.body}</p><div className="heroFeatureMeta"><span>{slide.detailTitle}</span><strong>{slide.detailBody}</strong></div><div className="heroFeatureFoot"><span>{slide.accent}</span><strong>View in Mettelo →</strong></div></div><div className="heroMetrics" aria-label="Mettelo platform activity signals"><ThresholdMetric label="Projects delivered" liveLabel="Public projects" historicalValue={684} liveValue={metrics.projects}/><LiveMetric label="Open opportunities" value={metrics.opportunities}/><ThresholdMetric label="Proof signals" liveLabel="Verified Proof" historicalValue={900} liveValue={metrics.proofs}/></div><div className="heroSlideControls" aria-label="Platform showcase slides"><button type="button" onClick={()=>move(-1)} aria-label="Previous showcase slide">←</button><div className="heroDots" role="tablist" aria-label="Choose showcase slide">{slides.map((item,itemIndex)=><button key={item.eyebrow} type="button" role="tab" aria-selected={itemIndex===index} aria-label={`Show ${item.eyebrow.toLowerCase()} slide`} onClick={()=>setIndex(itemIndex)}><span/></button>)}</div><button type="button" onClick={()=>move(1)} aria-label="Next showcase slide">→</button></div></div></aside>
}
