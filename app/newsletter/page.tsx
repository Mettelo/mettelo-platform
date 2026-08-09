import type { Metadata } from 'next';

export const metadata:Metadata={title:'Newsletter',description:'Get practical Mettelo updates on projects, events, opportunities and contribution.'};

export default async function NewsletterPage({searchParams}:{searchParams:Promise<{subscribed?:string}>}){
  const params=await searchParams;
  const subscribed=params.subscribed==='1';
  return <section className="section softSection"><div className="shell formShell"><div><div className="eyebrow">Mettelo updates</div><h1 style={{fontSize:'clamp(2.8rem,6vw,5.2rem)',margin:0}}>Useful updates. No noise.</h1><p className="lead">Get new Labs projects, events, practical insights and selected opportunities in one place — even if you are not ready to join the full community yet.</p></div><form className="formCard" action="/api/newsletter" method="post"><span className="chip">EMAIL UPDATES</span><h2 style={{fontSize:'1.7rem'}}>Stay close to what is moving.</h2>{subscribed&&<p className="formStatus success" role="status">You are subscribed. Watch your inbox for the next useful update.</p>}<label htmlFor="newsletter-email">Email address *</label><input id="newsletter-email" type="email" name="email" required autoComplete="email" placeholder="you@example.com"/><p style={{fontSize:'.78rem',color:'var(--slate)'}}>By subscribing, you agree to receive Mettelo updates. You can unsubscribe from any email.</p><button className="button dark" type="submit" style={{width:'100%',marginTop:18}}>Subscribe →</button></form></div></section>;
}
