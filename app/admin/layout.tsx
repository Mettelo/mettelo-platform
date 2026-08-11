import Link from 'next/link';

export default function AdminLayout({children}:{children:React.ReactNode}){
  return <><div style={{position:'sticky',top:0,zIndex:90,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,padding:'10px 20px',background:'#10131d',color:'#fff',borderBottom:'1px solid rgba(255,255,255,.12)'}}><div><strong style={{fontSize:13}}>Mettelo Admin</strong><span style={{marginLeft:10,fontSize:11,color:'#bfc5ce'}}>Operations mode</span></div><Link href="/member" style={{display:'inline-flex',alignItems:'center',minHeight:34,padding:'0 12px',borderRadius:8,background:'#fff',color:'#10131d',fontSize:12,fontWeight:800}}>Switch to Member →</Link></div>{children}</>;
}
