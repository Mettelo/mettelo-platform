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

const socials=[
  ["WhatsApp","https://chat.whatsapp.com/LrxCOfDBCDUJhRqXFRD2cY"],
  ["Discord","https://discord.gg/Nx6qCbEY"],
  ["Community Hub","https://gamms.app/community/mettelo"],
  ["X Community","https://x.com/i/communities/2015608740804718665"],
  ["X","https://www.twitter.com/officialmettelo"],
  ["LinkedIn","https://www.linkedin.com/mettelo"],
  ["Facebook","https://www.facebook.com/officialmettelo"]
];

const explore=[
  ["Projects","/projects","Join real Labs work and open-source projects."],
  ["Opportunities","/opportunities","Jobs, referrals, fellowships and volunteering."],
  ["Events","/events","Workshops, AMAs, showcases and build sessions."],
  ["Project Showcase","/showcase","See completed work and verified contribution."],
];
const community=[
  ["Community","/community","Peer groups, discussion and support."],
  ["People","/people","Discover professionals by capability and interests."],
  ["Mentors & Office Hours","/mentors","Career, technical and leadership support."],
  ["Become a Contributor","/contribute","Help build Mettelo, Labs and the ecosystem."],
];
const insights=[
  ["Insights & News","/blog","Ideas, career lessons and Mettelo updates."],
  ["Media","/media","Videos, talks, member stories and event replays."],
  ["Spotlight & Awards","/spotlight","Recognition based on meaningful contribution."],
];

function Logo({light=false}:{light?:boolean}){
  return <img className="brandLogo" src={light?"/mettelo-logo-light.svg":"/mettelo-logo-dark.svg"} alt="Mettelo"/>;
}
function Dropdown({label,items}:{label:string;items:string[][]}){
  return <details className="navDropdown"><summary>{label}<span aria-hidden="true">⌄</span></summary><div className="navDropdownPanel">{items.map(([title,href,copy])=><a key={href} href={href}><strong>{title}</strong><small>{copy}</small></a>)}</div></details>
}

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en" className={`${inter.variable} ${space.variable} ${mono.variable}`}><body>
    <div className="topbar"><div className="shell"><span>Real problems. Real teams. Real proof.</span><a href="/join">Join the Mettelo network <b>→</b></a></div></div>
    <header className="siteHeader"><div className="shell nav">
      <a className="brand brandImageLink" href="/" aria-label="Mettelo home"><Logo/></a>
      <nav className="primaryNav" aria-label="Primary navigation">
        <a className="primaryNavLink" href="/about">About</a>
        <Dropdown label="Explore" items={explore}/>
        <Dropdown label="Community" items={community}/>
        <Dropdown label="Insights" items={insights}/>
        <a className="primaryNavLink" href="/partnership">Partner</a>
      </nav>
      <div className="navActions"><a className="iconButton" href="/search" aria-label="Search Mettelo">⌕</a><a className="button ghost" href="/signin">Sign in</a><a className="button primary" href="/join">Join Mettelo</a></div>
      <details className="mobileMenu"><summary aria-label="Open menu">☰</summary><div className="mobileMenuPanel">
        <a href="/about">About<span>→</span></a>
        <div className="mobileGroup"><strong>Explore</strong><a href="/projects">Projects<span>→</span></a><a href="/opportunities">Opportunities<span>→</span></a><a href="/events">Events<span>→</span></a><a href="/showcase">Project Showcase<span>→</span></a></div>
        <div className="mobileGroup"><strong>Community</strong><a href="/community">Community Hub<span>→</span></a><a href="/people">People<span>→</span></a><a href="/mentors">Mentors & Office Hours<span>→</span></a><a href="/contribute">Become a Contributor<span>→</span></a></div>
        <div className="mobileGroup"><strong>Insights</strong><a href="/blog">Insights & News<span>→</span></a><a href="/media">Media<span>→</span></a><a href="/spotlight">Spotlight & Awards<span>→</span></a></div>
        <a href="/partnership">Partner with Mettelo<span>→</span></a><a href="/contact">Contact us<span>→</span></a><div className="mobileDivider"/><a href="/signin">Sign in<span>→</span></a><a className="mobileJoin" href="/join">Join Mettelo<span>→</span></a><div className="mobileSocialLinks">{socials.map(([label,href])=><a key={href} href={href} target="_blank" rel="noopener">{label}</a>)}</div></div></details>
    </div></header>
    {children}
    <footer><div className="shell footerGrid">
      <div><a className="brand footerBrand brandImageLink" href="/" aria-label="Mettelo home"><Logo light/></a><p>Professional capability infrastructure for Data & AI — connecting community, real work, proof and opportunity.</p><strong className="accent">Built for What’s Next.</strong><div className="footerNewsletter"><form action="/newsletter" method="post"><input type="email" name="email" required aria-label="Email address" placeholder="Get Mettelo updates"/><button aria-label="Subscribe" type="submit">→</button></form></div><div className="footerSocial">{socials.map(([label,href])=><a key={href} href={href} target="_blank" rel="noopener">{label}</a>)}</div><small className="instagramNote">Instagram link pending — the supplied URL currently points to Facebook.</small></div>
      <div><h4>Explore</h4><a href="/about">About Mettelo</a><a href="/projects">Projects</a><a href="/opportunities">Opportunities</a><a href="/community">Community</a><a href="/events">Events</a><a href="/blog">Insights & News</a><a href="/spotlight">Spotlight</a></div>
      <div><h4>Participate</h4><a href="/membership">Membership</a><a href="/contribute">Become a Contributor</a><a href="/showcase">Project Showcase</a><a href="/partnership">Partner with Mettelo</a><a href="/contact">Contact us</a><a href="/signin">Sign in</a></div>
      <div><h4>Community</h4>{socials.map(([label,href])=><a key={href} href={href} target="_blank" rel="noopener">{label}</a>)}</div>
    </div><div className="shell copyright"><span>© 2026 Mettelo. All rights reserved.</span><span><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Use</a></span></div></footer>
  </body></html>
}
