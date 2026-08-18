import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {Inter,Space_Grotesk,IBM_Plex_Mono} from 'next/font/google';
import Analytics from '@/components/Analytics';
import HeaderNavigation from '@/components/HeaderNavigation';
import MobileMenuEnhancer from '@/components/MobileMenuEnhancer';
import FooterNewsletterForm from '@/components/FooterNewsletterForm';
import PlatformSocialLinks,{PlatformContactEmail} from '@/components/PlatformSocialLinks';
import './globals.css';
import './mobile.css';
import './expansion.css';
import './collaboration.css';
import './messages.css';
import './polish.css';
import './page-system.css';
import './alignment.css';
import './data-workspace.css';
import './public-chrome.css';

const inter=Inter({subsets:['latin'],variable:'--font-inter',display:'swap'});const space=Space_Grotesk({subsets:['latin'],variable:'--font-space',display:'swap'});const mono=IBM_Plex_Mono({subsets:['latin'],weight:['500'],variable:'--font-mono',display:'swap'});
export const metadata:Metadata={metadataBase:new URL('https://mettelo.com'),title:{default:'Mettelo — Build capability. Prove it. Get discovered.',template:'%s | Mettelo'},description:'Mettelo is where Data & AI professionals connect, solve real problems, build credible proof and create opportunity through contribution.',openGraph:{title:'Mettelo — Build capability. Prove it. Get discovered.',description:'Real problems. Real teams. Real proof. Mettelo connects community, meaningful work, credible evidence and opportunity.',url:'https://mettelo.com/',siteName:'Mettelo',images:[{url:'/og-image.svg',width:1200,height:630,alt:'Mettelo — Built for What’s Next'}],type:'website'},twitter:{card:'summary_large_image',title:'Mettelo — Build capability. Prove it. Get discovered.',description:'Real problems. Real teams. Real proof.',images:['/og-image.svg']}};
function Logo({light=false}:{light?:boolean}){return <Image className="brandLogo" src={light?'/mettelo-logo-light.svg':'/mettelo-logo-dark.svg'} alt="Mettelo" width={1630} height={370} unoptimized priority/>}

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={`${inter.variable} ${space.variable} ${mono.variable}`}><body><a className="skipLink" href="#main-content">Skip to content</a><header className="siteHeader"><div className="shell nav"><Link className="brand brandImageLink" href="/" aria-label="Mettelo home"><Logo/></Link><HeaderNavigation/><div className="navActions"><a className="button ghost" href="/signin">Sign in</a><a className="button primary" href="/signin?mode=signup">Join Mettelo</a></div><details className="mobileMenu"><summary aria-label="Open menu" aria-expanded="false" aria-controls="mobile-navigation-panel"><span className="hamburgerIcon" aria-hidden="true"><i/><i/><i/></span><span className="menuLabel">Menu</span></summary><div className="mobileMenuPanel" id="mobile-navigation-panel"><MobileMenuEnhancer/></div></details></div></header><main id="main-content">{children}</main><footer><div className="shell footerGrid"><div className="footerBrandColumn"><Link className="brand footerBrand brandImageLink" href="/" aria-label="Mettelo home"><Logo light/></Link><p>Professional capability infrastructure for Data & AI — connecting community, real work, proof and opportunity.</p><strong className="accent">Built for What’s Next.</strong><PlatformSocialLinks/></div><div className="footerLinksColumn"><h4>Explore</h4><a href="/projects">Projects</a><a href="/opportunities">Opportunities</a><a href="/showcase">Proof</a><a href="/events">Events</a><a href="/community">Community</a><a href="/people">People</a><a href="/blog">Insights</a><a href="/spotlight">Spotlight</a></div><div className="footerLinksColumn"><h4>For organisations</h4><a href="/organisations">Organisation overview</a><a href="/post-opportunity">Post an opportunity</a><a href="/partnership#partnership-form">Bring a project</a><a href="/partnership">Partner with Mettelo</a><a href="/careers">Careers</a></div><div className="footerLinksColumn"><h4>Company & Support</h4><a href="/about">About Mettelo</a><a href="/faq">FAQ</a><a href="/contact">Contact us</a><PlatformContactEmail/><a href="/feedback">Give feedback</a><a href="/community-guidelines">Community Guidelines</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div><div className="footerNewsletterColumn"><div className="footerNewsletter"><FooterNewsletterForm/></div></div></div><div className="shell copyright"><span>© 2026 Mettelo. All rights reserved.</span><span><a href="/privacy">Privacy</a><i className="legalSeparator" aria-hidden="true">·</i><a href="/terms">Terms</a><i className="legalSeparator" aria-hidden="true">·</i><a href="/community-guidelines">Community Guidelines</a></span></div></footer><Analytics/></body></html>}
