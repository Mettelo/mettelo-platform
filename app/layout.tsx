import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mettelo — Built for What’s Next",
  description: "Building the professional capability infrastructure for Data & AI professionals.",
};

const nav = [
  ["Projects", "/projects"],
  ["Membership", "/membership"],
  ["Opportunities", "/opportunities"],
  ["Events", "/events"],
  ["Blog", "/blog"],
  ["Media", "/media"],
  ["Spotlight", "/spotlight"],
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="topbar"><div className="shell"><span>Mettelo — Building the infrastructure for Data & AI professionals.</span><a href="/membership">Become a member →</a></div></div>
        <header className="siteHeader"><div className="shell nav"><a className="brand" href="/">METTELO</a><nav>{nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav><div className="navActions"><a className="button ghost" href="/member">Sign in</a><a className="button primary" href="/membership#signup">Join Mettelo</a></div></div></header>
        {children}
        <footer><div className="shell footerGrid"><div><div className="brand footerBrand">METTELO</div><p>Building the professional capability infrastructure for Data & AI professionals.</p><strong className="accent">Built for What’s Next.</strong></div><div><h4>Platform</h4><a href="/projects">Projects</a><a href="/membership">Membership</a><a href="/opportunities">Opportunities</a><a href="/events">Events</a><a href="/blog">Blog</a></div><div><h4>Community</h4><a href="https://github.com/Mettelo">GitHub</a><a href="/media">YouTube / Media</a><a href="/spotlight">Spotlight & Awards</a><a href="/member">My Mettelo</a></div><div><h4>Latest from Mettelo</h4><p className="news">Project application workflow is being built.</p><p className="news">Mettelo Spotlight will recognise meaningful contribution.</p><p className="news">Mettelo GitHub is live.</p></div></div><div className="shell copyright">© 2026 Mettelo. All rights reserved.</div></footer>
      </body>
    </html>
  );
}
