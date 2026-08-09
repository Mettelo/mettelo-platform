import type { Metadata } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "./mobile.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "Mettelo — Built for What’s Next", template: "%s | Mettelo" },
  description: "Build capability through community, real projects, credible proof, opportunities, events and recognition across Data & AI.",
};

const nav = [["Projects","/projects"],["Opportunities","/opportunities"],["Events","/events"],["Insights","/blog"],["Media","/media"],["Spotlight","/spotlight"]];
function BrandMark(){ return <span className="brandMark" aria-hidden="true"><i/><i/><i/></span>; }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${inter.variable} ${space.variable} ${mono.variable}`}><body>
    <div className="topbar"><div className="shell"><span>Real problems. Real teams. Real proof.</span><a href="/membership">Membership is open <b>→</b></a></div></div>
    <header className="siteHeader"><div className="shell nav"><a className="brand" href="/"><BrandMark/><span>METTELO</span></a><nav aria-label="Primary navigation">{nav.map(([label,href])=><a key={href} href={href}>{label}</a>)}</nav><div className="navActions"><a className="iconButton" href="/projects" aria-label="Search Mettelo">⌕</a><a className="button ghost" href="/member">Sign in</a><a className="button primary" href="/membership#signup">Join Mettelo</a></div><details className="mobileMenu"><summary aria-label="Open menu">☰</summary><div className="mobileMenuPanel">{nav.map(([label,href])=><a key={href} href={href}>{label}<span>→</span></a>)}<div className="mobileDivider"/><a href="/membership">Membership<span>→</span></a><a href="/member">My Mettelo<span>→</span></a><a className="mobileJoin" href="/membership#signup">Join Mettelo<span>→</span></a></div></details></div></header>
    {children}
    <footer><div className="shell footerGrid"><div><a className="brand footerBrand" href="/"><BrandMark/><span>METTELO</span></a><p>Professional capability infrastructure for Data & AI — connecting community, real work, proof and opportunity.</p><strong className="accent">Built for What’s Next.</strong><div className="footerNewsletter"><input aria-label="Email address" placeholder="Get Mettelo updates"/><button aria-label="Subscribe">→</button></div></div><div><h4>Explore</h4><a href="/projects">Projects</a><a href="/opportunities">Opportunities</a><a href="/events">Events</a><a href="/blog">Insights & News</a><a href="/media">Media</a></div><div><h4>Participate</h4><a href="/membership">Membership</a><a href="/spotlight">Spotlight & Awards</a><a href="https://github.com/Mettelo">Open Source</a><a href="/member">My Mettelo</a><a href="/admin">Admin</a></div><div><h4>Latest from Mettelo</h4><a className="news" href="/projects"><small>09 AUG 2026 · LABS</small>Project application and contributor workflow</a><a className="news" href="/spotlight"><small>09 AUG 2026 · COMMUNITY</small>Spotlight recognition system</a><a className="news" href="https://github.com/Mettelo"><small>07 AUG 2026 · OPEN SOURCE</small>Mettelo GitHub organisation is live</a></div></div><div className="shell copyright"><span>© 2026 Mettelo. All rights reserved.</span><span>Privacy · Terms · Community Guidelines · Contributor Terms</span></div></footer>
  </body></html>;
}
