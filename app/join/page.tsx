import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Join Mettelo', description: 'Choose how you want to participate in the Mettelo ecosystem.' };

export default function JoinPage(){
  const routes=[
    ['MEMBER','Become a Member','Create a free Mettelo account for community, opportunities, events, project alerts and your future professional activity record.','/membership#signup','Create free account'],
    ['CONTRIBUTOR','Become a Contributor','Help build Labs projects, open source, community, product, content, research, partnerships or operations.','/contribute','Apply to contribute'],
    ['COMMUNITY','Join the Community','Enter the conversation through Discord, WhatsApp and focused professional spaces.','/community','Explore community'],
    ['PROJECTS','Join a Project','Browse open Mettelo Labs briefs, choose a role and apply to build with a real team.','/projects','Browse projects'],
    ['PARTNER','Partner with Mettelo','Bring a problem, opportunity, event, research idea, talent pathway or ecosystem resource.','/partnership','Partnership form']
  ];
  return <>
    <section className="hero"><div className="shell"><div className="eyebrow">Join Mettelo</div><h1 style={{maxWidth:900}}>How do you want to participate?</h1><p className="heroLead">There is more than one way into Mettelo. Choose the route that best matches what you want to do right now — you can move between routes later with the same member identity.</p></div></section>
    <section className="section"><div className="shell"><div className="joinRouteGrid">{routes.map(([code,title,copy,href,cta])=><article className="joinRoute" key={title}><span className="chip">{code}</span><h3>{title}</h3><p>{copy}</p><a className="button dark" href={href}>{cta} →</a></article>)}</div></div></section>
  </>;
}
