import type { Metadata } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "./mobile.css";
import "./expansion.css";

const inter=Inter({subsets:["latin"],variable:"--font-inter"});
const space=Space_Grotesk({subsets:["latin"],variable:"--font-space"});
const mono=IBM_Plex_Mono({subsets:["latin"],weight:["500"],variable:"--font-mono"});

export const metadata: Metadata={
  metadataBase:new URL("https://mettelo.com"),
  title:{default:"Mettelo — Build capability. Prove it. Get discovered.",template:"%s | Mettelo"},
  description:"Mettelo connects Data & AI professionals to serious peers, meaningful work, credible proof and opportunities that move careers forward.",
  icons:{icon:"/favicon.ico"},
  openGraph:{title:"Mettelo — Build capability. Prove it. Get discovered.",description:"Join a live Data & AI professional community built around real projects, credible proof, serious peers, events and meaningful opportunity.",url:"https://mettelo.com/",siteName:"Mettelo",images:[{url:"/og-image.jpg"}],type:"website"},
  twitter:{card:"summary_large_image",title:"Mettelo — Build capability. Prove it. Get discovered.",description:"A live Data & AI professional community connecting real work, credible proof, serious peers and meaningful opportunity.",images:["/og-image.jpg"]}
};

const nav=[["About","/#about"],["Projects","/#projects"],["Opportunities","/#opportunities"],["Community","/#community"],["Events","/#events"],["Insights","/#insights"],["Spotlight","/#spotlight"]];
const socials=[
  ["WhatsApp","https://chat.whatsapp.com/LrxCOfDBCDUJhRqXFRD2cY"],
  ["Discord","https://discord.gg/Nx6qCbEY"],
  ["Community Hub","https://gamms.app/community/mettelo"],
  ["X Community","https://x.com/i/communities/2015608740804718665"],
  ["X","https://www.twitter.com/officialmettelo"],
  ["LinkedIn","https://www.linkedin.com/mettelo"],
  ["Facebook","https://www.facebook.com/officialmettelo"]
];
function BrandMark(){return <span className="brandMark" aria-hidden="true"><i/><i/><i/></span>}
function SocialIcon({label}:{label:string}){return <span aria-hidden="true" style={{fontSize:12,fontWeight:800}}>{label==="WhatsApp"?"W":label==="Discord"?"D":label==="Community Hub"?"H":label==="LinkedIn"?"in":label==="Facebook"?"f":"X"}</span>}

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en" className={`${inter.variable} ${space.variable} ${mono.variable}`}><body>
    <div className="topbar"><div className="shell"><span>Real problems. Real teams. Real proof.</span><a href="/join">Join the Mettelo network <b>→</b></a></div></div>
    <header className="siteHeader"><div className="shell nav">
      <a className="brand" href="/"><BrandMark/><span>METTELO</span></a>
      <nav aria-label="Primary navigation">{nav.map(([label,href])=><a key={href} href={href}>{label}</a>)}</nav>
      <div className="navActions"><div className="headerSocial" aria-label="Mettelo social links">{socials.slice(0,4).map(([label,href])=><a className="socialCircle" key={href} href={href} target="_blank" rel="noopener" aria-label={label}><SocialIcon label={label}/></a>)}</div><a className="iconButton" href="/search" aria-label="Search Mettelo">⌕</a><a className="button ghost" href="/signin">Sign in</a><a className="button primary" href="/join">Join Mettelo</a></div>
      <details className="mobileMenu"><summary aria-label="Open menu">☰</summary><div className="mobileMenuPanel">{nav.map(([label,href])=><a key={href} href={href}>{label}<span>→</span></a>)}<div className="mobileDivider"/><a href="/membership">Membership<span>→</span></a><a href="/contribute">Become a Contributor<span>→</span></a><a href="/partnership">Partner with Mettelo<span>→</span></a><a href="/contact">Contact us<span>→</span></a><a href="/signin">Sign in<span>→</span></a><a className="mobileJoin" href="/join">Join Mettelo<span>→</span></a><div className="mobileSocialLinks">{socials.map(([label,href])=><a key={href} href={href} target="_blank" rel="noopener">{label}</a>)}</div></div></details>
    </div></header>
    {children}
    <footer><div className="shell footerGrid">
      <div><a className="brand footerBrand" href="/"><BrandMark/><span>METTELO</span></a><p>Professional capability infrastructure for Data & AI — connecting community, real work, proof and opportunity.</p><strong className="accent">Built for What’s Next.</strong><div className="footerNewsletter"><form action="/newsletter" method="post"><input type="email" name="email" required aria-label="Email address" placeholder="Get Mettelo updates"/><button aria-label="Subscribe" type="submit">→</button></form></div><div className="footerSocial">{socials.map(([label,href])=><a key={href} href={href} target="_blank" rel="noopener">{label}</a>)}</div><small className="instagramNote">Instagram link pending — the supplied URL currently points to Facebook.</small></div>
      <div><h4>Explore</h4><a href="/#about">About Mettelo</a><a href="/#projects">Projects</a><a href="/#opportunities">Opportunities</a><a href="/#community">Community</a><a href="/#events">Events</a><a href="/#insights">Insights & News</a><a href="/#spotlight">Spotlight</a></div>
      <div><h4>Participate</h4><a href="/membership">Membership</a><a href="/contribute">Become a Contributor</a><a href="/showcase">Project Showcase</a><a href="/partnership">Partner with Mettelo</a><a href="/contact">Contact us</a><a href="/signin">Sign in</a></div>
      <div><h4>Community</h4>{socials.map(([label,href])=><a key={href} href={href} target="_blank" rel="noopener">{label}</a>)}</div>
    </div><div className="shell copyright"><span>© 2026 Mettelo. All rights reserved.</span><span><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Use</a></span></div></footer>
  </body></html>
}
