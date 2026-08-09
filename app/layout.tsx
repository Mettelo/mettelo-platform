import type { Metadata } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Mettelo — Built for What’s Next",
  description: "Building the professional capability infrastructure for Data & AI professionals.",
};

const nav = [
  ["Projects", "/projects"], ["Membership", "/membership"], ["Opportunities", "/opportunities"],
  ["Events", "/events"], ["Blog", "/blog"], ["Media", "/media"], ["Spotlight", "/spotlight"],
];

function BrandMark(){
  return <span className="brandMark" aria-hidden="true"><i/><i/><i/></span>;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable} ${mono.variable}`}>
      <body>
        <div className="topbar"><div className="shell"><span>Building the infrastructure for Data & AI professionals.</span><a href="/membership">Become a member <b>→</b></a></div></div>
        <header className="siteHeader"><div className="shell nav"><a className="brand" href="/"><BrandMark/><span>METTELO</span></a><nav>{nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav><div className="navActions"><a className="button ghost" href="/member">Sign in</a><a className="button primary" href="/membership#signup">Join Mettelo</a></div></div></header>
        {children}
        <footer><div className="shell footerGrid"><div><a className="brand footerBrand" href="/"><BrandMark/><span>METTELO</span></a><p>Building the professional capability infrastructure for Data & AI professionals.</p><strong className="accent">Built for What’s Next.</strong></div><div><h4>Platform</h4><a href="/projects">Projects</a><a href="/membership">Membership</a><a href="/opportunities">Opportunities</a><a href="/events">Events</a><a href="/blog">Blog & News</a></div><div><h4>Community</h4><a href="https://github.com/Mettelo">GitHub</a><a href="/media">YouTube / Media</a><a href="/spotlight">Spotlight & Awards</a><a href="/member">My Mettelo</a></div><div><h4>Latest from Mettelo</h4><a className="news" href="/projects">Project application workflow and Labs structure</a><a className="news" href="/spotlight">Spotlight will recognise meaningful contribution</a><a className="news" href="https://github.com/Mettelo">Mettelo GitHub organisation is live</a></div></div><div className="shell copyright"><span>© 2026 Mettelo. All rights reserved.</span><span>Privacy · Terms · Community Guidelines · Contributor Terms</span></div></footer>
      </body>
    </html>
  );
}
