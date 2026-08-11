import type {Metadata} from 'next';

export const metadata:Metadata={title:'For Organisations',description:'Work with Mettelo on Data & AI opportunities, real project problems and practical partnerships.'};

export default function OrganisationsPage(){
  const routes=[
    ['OPPORTUNITY','Post a Data & AI opportunity','Bring a current Data & AI job, internship, fellowship, apprenticeship or volunteering opportunity to Mettelo for review.','/partnership#partnership-form','Submit through current review route'],
    ['PROJECT','Bring a real project problem','Share a real organisational problem that could become a structured Mettelo Labs brief with clear scope, ownership and outcomes.','/partnership#partnership-form','Submit a project brief'],
    ['PARTNERSHIP','Partner with Mettelo','Work together on research, events, community initiatives, open source or wider ecosystem collaboration.','/partnership','Explore partnership']
  ];
  return <>
    <section className="hero"><div className="shell heroGrid"><div><div className="eyebrow">For Organisations</div><h1>Bring opportunity and real problems into the Mettelo ecosystem.</h1><p className="heroLead">Employers, startups, charities, public bodies, universities and professional organisations can work with Mettelo through clear operational routes rather than a generic contact form.</p></div><aside className="heroPanel"><span className="chip">ORGANISATION ROUTES</span><h3 style={{marginTop:18}}>Choose the outcome you actually need.</h3><p>Opportunity submissions, project briefs and broader partnerships are different workflows. This page keeps those intents separate while the dedicated employer submission workflow is completed.</p><div className="path"><span>Choose</span><span>Submit</span><span>Review</span><span>Approve</span><span>Activate</span></div></aside></div></section>
    <section className="section"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Work with Mettelo</div><h2>Start with the right operational route.</h2></div><p>Every submission is reviewed before it becomes a public opportunity, Labs brief or partnership activity.</p></div><div className="grid3">{routes.map(([code,title,copy,href,cta])=><article className="card featureCard" key={title}><div><span className="chip">{code}</span><h3 style={{marginTop:18}}>{title}</h3><p>{copy}</p></div><a className="button dark" href={href}>{cta} →</a></article>)}</div></div></section>
    <section className="section softSection"><div className="shell"><div className="ctaBand"><div><div className="cardNumber">NOT SURE WHICH ROUTE?</div><h2>Use partnership review when the requirement is broader.</h2><p>If the work combines talent, research, events, community or a larger strategic relationship, the partnership route gives Mettelo enough context to assign the right owner.</p></div><a className="button dark" href="/partnership">Partner with Mettelo →</a></div></div></section>
  </>;
}
