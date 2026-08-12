import {Suspense} from 'react';
import WorkspaceRouteTabs from '@/components/WorkspaceRouteTabs';

const areas=[
  ['problem','Problem','Define the decision, stakeholder and success measures.'],
  ['data-sources','Data','Document approved links, access and data quality.'],
  ['workstreams','Workstreams','Organise the project into accountable streams of work.'],
  ['delivery','Tasks','See assigned actions and delivery status.'],
  ['deliverables','Deliverables','Submit evidence and move work through review.'],
  ['team','Members','Understand who is responsible for each project role.'],
  ['discussion','Discussion','Keep project decisions in the shared message panel.'],
  ['resources','Resources','Share governed external links and supporting material.'],
  ['meetings','Project events','Schedule working sessions, reviews and presentations.'],
  ['presentation','Final presentation','Prepare the formal project review event.'],
  ['proof','Proof','Turn verified contributions into professional evidence.'],
  ['completion','Completion','Confirm readiness and close the project responsibly.'],
] as const;

export default function WorkspaceNavigationPreview(){return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">NAVIGATION RESPONSIVE FIXTURE</div><h1>Customer retention intelligence.</h1></div><p>A database-free workspace fixture used to verify clear project navigation before video testing.</p></div><Suspense fallback={null}><WorkspaceRouteTabs preview/></Suspense>{areas.map(([id,title,copy])=><section className="panel" id={id} key={id}><div className="panelHead"><div><span className="cardNumber">PROJECT AREA</span><h2 style={{marginTop:8}}>{title}</h2></div><span className="chip">READY</span></div><p>{copy}</p></section>)}</div></section>}
