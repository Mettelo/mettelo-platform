import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Join Mettelo', description: 'Join Mettelo as a professional or work with us as an organisation.' };

export default function JoinPage(){
  const routes=[
    ['PROFESSIONAL','Join as a Professional','Create your free Mettelo account, build your professional profile, discover Data & AI opportunities and apply to structured projects.','/signin','Create free account'],
    ['ORGANISATION','Work with Mettelo','Bring a real Data & AI problem, research idea, event or wider partnership into the ecosystem.','/partnership','Explore ways to work with us']
  ];
  return <>
    <section className="hero"><div className="shell"><div className="eyebrow">Join Mettelo</div><h1 style={{maxWidth:900}}>Choose the route that matches what you want to do.</h1><p className="heroLead">Professionals join Mettelo to build capability, work on projects, create Proof and access opportunity. Organisations can bring real problems, research, events and partnerships into the ecosystem. If you want to help build Mettelo itself, explore our Careers page.</p><div className="actions"><a className="button ghost" href="/careers">Explore Mettelo Careers →</a></div></div></section>
    <section className="section"><div className="shell"><div className="joinRouteGrid">{routes.map(([code,title,copy,href,cta])=><article className="joinRoute" key={title}><span className="chip">{code}</span><h3>{title}</h3><p>{copy}</p><a className="button dark" href={href}>{cta} →</a></article>)}</div></div></section>
  </>;
}
