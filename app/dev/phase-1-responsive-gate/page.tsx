import {notFound} from 'next/navigation';

const viewports=[
  {label:'Small phone',width:320,height:900},
  {label:'Standard phone',width:390,height:900},
  {label:'Large phone',width:430,height:932},
  {label:'Phone landscape',width:844,height:390},
  {label:'Small tablet',width:768,height:1024},
  {label:'Large tablet',width:1024,height:1366},
  {label:'Laptop',width:1280,height:900},
  {label:'Desktop',width:1440,height:1000},
  {label:'Large desktop',width:1920,height:1080}
];
const pages=[
  ['Sign in','/signin'],
  ['Check email','/auth/check-email?email=responsive.tester%40example.com'],
  ['Reset sent','/auth/reset-sent?email=responsive.tester%40example.com'],
  ['Password changed','/auth/password-changed'],
  ['Email verified','/auth/verified'],
  ['Onboarding','/dev/phase-1-onboarding']
] as const;

export default function PhaseOneResponsiveGate(){
  if(process.env.VERCEL_ENV==='production')notFound();
  return <main style={{padding:20,background:'#e9ecf1',overflowX:'auto'}}><h1 style={{fontSize:28}}>Phase 1 responsive release check</h1><p>Identity, authentication and first-time onboarding at every required viewport class. Each frame must be checked for horizontal overflow, clipped controls, text collisions, touch usability and readable success/error states.</p>{pages.map(([label,src])=><section key={src} style={{marginTop:32}}><h2 style={{fontSize:22}}>{label}</h2><div style={{display:'grid',gap:24}}>{viewports.map(viewport=><section key={`${src}-${viewport.label}`} data-gate-width={viewport.width} data-gate-height={viewport.height} data-gate-page={src} style={{width:'max-content',maxWidth:'none'}}><h3 style={{fontSize:18}}>{viewport.label} · {viewport.width}×{viewport.height}</h3><iframe title={`${label} at ${viewport.width} by ${viewport.height}`} src={src} width={viewport.width} height={viewport.height} style={{display:'block',width:viewport.width,height:viewport.height,border:'2px solid #10131d',background:'#fff'}}/></section>)}</div></section>)}</main>;
}
