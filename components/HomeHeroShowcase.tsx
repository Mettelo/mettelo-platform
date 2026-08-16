'use client';

import {useState} from 'react';

type Metrics={projects:number|null;opportunities:number|null;proofs:number|null};

type Slide={
  eyebrow:string;
  title:string;
  body:string;
  accent:string;
  detailTitle:string;
  detailBody:string;
};

const slides:Slide[]=[
  {eyebrow:'PROJECT DELIVERY',title:'Work in a real delivery environment.',body:'Roles, tasks, milestones, data, events and evidence stay connected from brief to completion.',accent:'Structured delivery',detailTitle:'Active project',detailBody:'Your role · Data Analyst'},
  {eyebrow:'VERIFIED PROOF',title:'Turn contribution into evidence people can trust.',body:'Reviewed work stays connected to the project context, evidence and verification state behind it.',accent:'Evidence reviewed',detailTitle:'Proof record',detailBody:'Contribution · Verified'},
  {eyebrow:'DISCOVERY',title:'Use stronger signals when opportunity appears.',body:'Projects and verified Proof give organisations more context than a list of claims on a profile.',accent:'Professional discovery',detailTitle:'Opportunity signal',detailBody:'Evidence · Context · Fit'}
];

function Metric({label,value}:{label:string;value:number|null}){
  return <div className="heroMetric"><span>{label}</span><strong>{value===null?'Live':value.toLocaleString('en-GB')}</strong><small>{value===null?'Platform signal':'currently visible'}</small></div>;
}

export default function HomeHeroShowcase({metrics}:{metrics:Metrics}){
  const [index,setIndex]=useState(0);
  const slide=slides[index];
  function move(delta:number){setIndex(current=>(current+delta+slides.length)%slides.length)}
  return <aside className="heroExperience" aria-label="Mettelo platform showcase">
    <div className="heroScene">
      <div className="heroSceneGlow" aria-hidden="true"/>
      <div className="heroPeopleIllustration" aria-label="Illustrative collaborative professional workspace">
        <span className="person personOne" aria-hidden="true"><i/><b/></span>
        <span className="person personTwo" aria-hidden="true"><i/><b/></span>
        <span className="workspaceDesk" aria-hidden="true"/>
      </div>

      <div className="heroFloatingProof">
        <span className="verifiedMark" aria-hidden="true">✓</span>
        <div><small>VERIFIED PROOF</small><strong>Contribution reviewed</strong><span>Evidence connected to delivery</span></div>
      </div>

      <div className="heroFeatureCard">
        <span className="chip">{slide.eyebrow}</span>
        <h3>{slide.title}</h3>
        <p>{slide.body}</p>
        <div className="heroFeatureMeta"><span>{slide.detailTitle}</span><strong>{slide.detailBody}</strong></div>
        <div className="heroFeatureFoot"><span>{slide.accent}</span><strong>View in Mettelo →</strong></div>
      </div>

      <div className="heroMetrics" aria-label="Live Mettelo platform signals">
        <Metric label="Public projects" value={metrics.projects}/>
        <Metric label="Open opportunities" value={metrics.opportunities}/>
        <Metric label="Verified Proof" value={metrics.proofs}/>
      </div>

      <div className="heroSlideControls" aria-label="Platform showcase slides">
        <button type="button" onClick={()=>move(-1)} aria-label="Previous showcase slide">←</button>
        <div className="heroDots" role="tablist" aria-label="Choose showcase slide">
          {slides.map((item,itemIndex)=><button key={item.eyebrow} type="button" role="tab" aria-selected={itemIndex===index} aria-label={`Show ${item.eyebrow.toLowerCase()} slide`} onClick={()=>setIndex(itemIndex)}><span/></button>)}
        </div>
        <button type="button" onClick={()=>move(1)} aria-label="Next showcase slide">→</button>
      </div>
    </div>
  </aside>;
}
