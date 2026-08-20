import type {Metadata} from 'next';
import Link from 'next/link';
import {Inter,Space_Grotesk,IBM_Plex_Mono} from 'next/font/google';
import Analytics from '@/components/Analytics';
import HeaderNavigation from '@/components/HeaderNavigation';
import {ManagedDesktopNavigation,ManagedMobileNavigation} from '@/components/ManagedPublicNavigation';
import MobileMenuEnhancer from '@/components/MobileMenuEnhancer';
import FooterNewsletterForm from '@/components/FooterNewsletterForm';
import PlatformSocialLinks,{PlatformContactEmail} from '@/components/PlatformSocialLinks';
import {getPublicWebsiteChrome,isExternalPublicHref,type WebsiteFooterLink} from '@/lib/website-chrome';
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
import './public-hardening.css';
import './public-legal-reflow.css';
import './public-responsive-reflow.css';

const inter=Inter({subsets:['latin'],variable:'--font-inter',display:'swap'});const space=Space_Grotesk({subsets:['latin'],variable:'--font-space',display:'swap'});const mono=IBM_Plex_Mono({subsets:['latin'],weight:['500'],variable:'--font-mono',display:'swap'});
export const metadata:Metadata={metadataBase:new URL('https://mettelo.com'),title:{default:'Mettelo — Build capability. Prove it. Get discovered.',template:'%s | Mettelo'},description:'Mettelo is where Data & AI professionals connect, solve real problems, build credible proof and create opportunity through contribution.',openGraph:{title:'Mettelo — Build capability. Prove it. Get discovered.',description:'Real problems. Real teams. Real proof. Mettelo connects community, meaningful work, credible evidence and opportunity.',url:'https://mettelo.com/',siteName:'Mettelo',images:[{url:'/og-image.svg',width:1200,height:630,alt:'Mettelo — Built for What’s Next'}],type:'website'},twitter:{card:'summary_large_image',title:'Mettelo — Build capability. Prove it. Get discovered.',description:'Real problems. Real teams. Real proof.',images:['/og-image.svg']}};

function Logo({src,name}:{src:string;name:string}){
 // Dynamic Admin-managed logo URLs deliberately use a native image element. This avoids restricting future Media Library assets to a compile-time Next.js remote-host allowlist.
 // eslint-disable-next-line @next/next/no-img-element
 return <img className="brandLogo" src={src} alt={name} width={1630} height={370}/>;
}
function FooterManagedLink({link}:{link:WebsiteFooterLink}){const external=isExternalPublicHref(link.href);return <a href={link.href} target={external?'_blank':undefined} rel={external?'noopener noreferrer':undefined}>{link.label}</a>}

export default async function RootLayout({children}:{children:React.ReactNode}){
 const chrome=await getPublicWebsiteChrome();const branding=chrome.branding;const footer=chrome.footer;
 return <html lang="en" className={`${inter.variable} ${space.variable} ${mono.variable}`}><body><a className="skipLink" href="#main-content">Skip to content</a><header className="siteHeader"><div className="shell nav"><Link className="brand brandImageLink" href="/" aria-label={`${branding.site_name} home`}><Logo src={branding.logo_dark_url} name={branding.site_name}/></Link><ManagedDesktopNavigation navigation={chrome.navigation}/><HeaderNavigation/><div className="navActions"><a className="button ghost" href="/signin">Sign in</a><a className="button primary" href="/signin?mode=signup">Join Mettelo</a></div><details className="mobileMenu"><summary aria-label="Open menu" aria-expanded="false" aria-controls="mobile-navigation-panel"><span className="hamburgerIcon" aria-hidden="true"><i/><i/><i/></span><span className="menuLabel">Menu</span></summary><div className="mobileMenuPanel" id="mobile-navigation-panel"><ManagedMobileNavigation navigation={chrome.navigation}/><MobileMenuEnhancer/></div></details></div></header><main id="main-content">{children}</main><footer><div className="shell footerGrid"><div className="footerBrandColumn"><Link className="brand footerBrand brandImageLink" href="/" aria-label={`${branding.site_name} home`}><Logo src={branding.logo_light_url} name={branding.site_name}/></Link><p>{footer.description}</p><strong className="accent">{footer.tagline}</strong><PlatformSocialLinks/></div>{footer.sections.filter(section=>section.enabled).map(section=><div className="footerLinksColumn" key={section.id}><h4>{section.title}</h4>{section.links.filter(link=>link.enabled).map(link=><FooterManagedLink link={link} key={link.id}/>)}{section.id==='support'&&<PlatformContactEmail/>}</div>)}<div className="footerNewsletterColumn"><div className="footerNewsletter"><FooterNewsletterForm/></div></div></div><div className="shell copyright"><span>© 2026 {branding.site_name}. All rights reserved.</span><span><a href="/privacy">Privacy</a><i className="legalSeparator" aria-hidden="true">·</i><a href="/terms">Terms</a><i className="legalSeparator" aria-hidden="true">·</i><a href="/community-guidelines">Community Guidelines</a></span></div></footer><Analytics/></body></html>;
}
