import type {Metadata} from 'next';

export const metadata:Metadata={title:'Email verified',description:'Your Mettelo email address has been verified successfully.'};
function safeNext(value:string|string[]|undefined){const item=Array.isArray(value)?value[0]:value;return item&&item.startsWith('/')&&!item.startsWith('//')?item:'/member'}

export default async function VerifiedPage({searchParams}:{searchParams?:Promise<{next?:string|string[]}>}){
  const next=safeNext((await searchParams||{}).next);const onboarding=next==='/onboarding';
  return <section className="section softSection"><div className="shell" style={{maxWidth:760}}><div className="panel" style={{padding:'clamp(28px,5vw,54px)',textAlign:'center'}}><div aria-hidden="true" style={{width:64,height:64,borderRadius:'50%',display:'grid',placeItems:'center',margin:'0 auto 20px',background:'#E8F5ED',color:'#157347',fontSize:28,fontWeight:900}}>✓</div><div className="eyebrow" style={{justifyContent:'center'}}>Account verified</div><h1 style={{fontSize:'clamp(2.4rem,6vw,4rem)',margin:'0 0 14px'}}>Your email is verified.</h1><p className="lead" style={{margin:'0 auto',maxWidth:560}}>{onboarding?'Your Mettelo account is ready. Complete your profile setup to personalise your workspace, opportunities, and collaboration experience.':'Your Mettelo account is ready. You can now access My Mettelo to manage your profile, applications, projects, and verified Proof.'}</p><div className="actions" style={{justifyContent:'center',flexWrap:'wrap'}}><a className="button dark" href={next}>{onboarding?'Continue profile setup →':'Continue to My Mettelo →'}</a><a className="button ghost" href="/">Go to Mettelo home</a></div></div></div></section>;
}
