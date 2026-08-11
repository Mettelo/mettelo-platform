import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Join Mettelo', description: 'Choose how you want to participate in the Mettelo ecosystem.' };

export default function JoinPage(){
  const routes=[
    ['PROFESSIONAL','Join as a Professional','Create your free Mettelo account, build your professional profile, discover Data & AI opportunities and apply to structured projects.','/signin','Create free account'],
    ['CONTRIBUTOR','Contribute to Mettelo','Help build Mettelo across Labs, open source, community, product, content, research or operations through a defined contribution.','/contribute','Apply to contribute'],
    ['ORGANISATION','Work with Mettelo','Bring a Data & AI opportunity, real project problem, research idea, event or wider partnership into the ecosystem.','/organisations','Explore organisation routes']
  ];
  return <>
    <section className="hero"><div className="shell"><div className="eyebrow">Join Mettelo</div><h1 style={{maxWidth:900}}>Choose the route that matches what you want to do.</h1><p className="heroLead">Professionals join the network, contributors help build the ecosystem, and organisations bring opportunities or real problems. Projects and community participation sit inside those journeys rather than creating separate identities.</p></div></section>
    <section className="section"><div className="shell"><div className="joinRouteGrid">{routes.map(([code,title,copy,href,cta])=><article className="joinRoute" key={title}><span className="chip">{code}</span><h3>{title}</h3><p>{copy}</p><a className="button dark" href={href}>{cta} →</a></article>)}</div></div></section>
  </>;
}
