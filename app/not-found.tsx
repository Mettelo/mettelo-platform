import Link from 'next/link';

export default function NotFound(){
  return <section className="section softSection"><div className="shell"><div className="eyebrow">404</div><h1 style={{fontSize:'clamp(3rem,8vw,6rem)',margin:0}}>That page is not part of Mettelo.</h1><p className="lead">The link may be old, incomplete or still being built. Start from a live route instead.</p><div className="actions"><Link className="button dark" href="/">Go home →</Link><Link className="button ghost" href="/projects">Browse projects</Link><Link className="button ghost" href="/community">Open community</Link></div></div></section>;
}
