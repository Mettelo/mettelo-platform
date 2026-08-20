import type {Metadata} from 'next';
import {unstable_noStore as noStore} from 'next/cache';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {isSafePublicHref} from '@/lib/website-chrome';

export type WebsiteSeoPageKey='home'|'about'|'contact';
export type WebsiteSeoScope='global'|WebsiteSeoPageKey;
export type GlobalSeoConfig={site_name:string;title_template:string;default_title:string;default_description:string;default_og_title:string;default_og_description:string;default_og_image:string;twitter_title:string;twitter_description:string;twitter_image:string;google_site_verification:string;bing_site_verification:string;organisation_name:string;organisation_description:string;organisation_logo_url:string};
export type PageSeoConfig={title:string;description:string;canonical:string;og_title:string;og_description:string;og_image:string;index:boolean;follow:boolean};

export const SEO_PAGE_ROUTES:Record<WebsiteSeoPageKey,string>={home:'/',about:'/about',contact:'/contact'};
export const SEO_PAGE_LABELS:Record<WebsiteSeoPageKey,string>={home:'Homepage',about:'About',contact:'Contact'};

export const DEFAULT_GLOBAL_SEO:GlobalSeoConfig={
 site_name:'Mettelo',title_template:'%s | Mettelo',default_title:'Mettelo — Build capability. Prove it. Get discovered.',
 default_description:'Mettelo is where Data & AI professionals connect, solve real problems, build credible proof and create opportunity through contribution.',
 default_og_title:'Mettelo — Build capability. Prove it. Get discovered.',default_og_description:'Real problems. Real teams. Real proof. Mettelo connects community, meaningful work, credible evidence and opportunity.',default_og_image:'/og-image.svg',
 twitter_title:'Mettelo — Build capability. Prove it. Get discovered.',twitter_description:'Real problems. Real teams. Real proof.',twitter_image:'/og-image.svg',google_site_verification:'',bing_site_verification:'',
 organisation_name:'Mettelo',organisation_description:'Professional capability infrastructure for Data & AI.',organisation_logo_url:'/mettelo-logo-dark.svg'
};
export const DEFAULT_PAGE_SEO:Record<WebsiteSeoPageKey,PageSeoConfig>={
 home:{title:DEFAULT_GLOBAL_SEO.default_title,description:DEFAULT_GLOBAL_SEO.default_description,canonical:'/',og_title:DEFAULT_GLOBAL_SEO.default_og_title,og_description:DEFAULT_GLOBAL_SEO.default_og_description,og_image:'/og-image.svg',index:true,follow:true},
 about:{title:'About Mettelo',description:'Mettelo is a technology-led organisation building professional capability infrastructure for Data & AI across Africa and beyond.',canonical:'/about',og_title:'About Mettelo',og_description:'Professional capability infrastructure for Data & AI across Africa and beyond.',og_image:'/og-image.svg',index:true,follow:true},
 contact:{title:'Contact us',description:'Contact Mettelo about membership, projects, events, media, support or general enquiries.',canonical:'/contact',og_title:'Contact Mettelo',og_description:'Contact Mettelo about membership, projects, events, media, support or general enquiries.',og_image:'/og-image.svg',index:true,follow:true}
};

function record(value:unknown):Record<string,unknown>|null{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null}
function text(value:unknown,max:number){return String(value??'').trim().slice(0,max)}
function boolean(value:unknown,fallback=true){return typeof value==='boolean'?value:fallback}
function verification(value:unknown){const cleaned=text(value,240);return /^[A-Za-z0-9._:\-+/=]*$/.test(cleaned)?cleaned:null}
function safeAsset(value:string){return isSafePublicHref(value)}
function safeCanonical(value:string){return isSafePublicHref(value)}

export function isWebsiteSeoScope(value:unknown):value is WebsiteSeoScope{return typeof value==='string'&&['global','home','about','contact'].includes(value)}
export function isWebsiteSeoPageKey(value:unknown):value is WebsiteSeoPageKey{return typeof value==='string'&&['home','about','contact'].includes(value)}

export function validateGlobalSeo(value:unknown){
 const source=record(value);if(!source)return{ok:false as const,error:'Global SEO payload is required.'};
 const result:GlobalSeoConfig={site_name:text(source.site_name,80),title_template:text(source.title_template,100),default_title:text(source.default_title,180),default_description:text(source.default_description,320),default_og_title:text(source.default_og_title,180),default_og_description:text(source.default_og_description,320),default_og_image:text(source.default_og_image,500),twitter_title:text(source.twitter_title,180),twitter_description:text(source.twitter_description,320),twitter_image:text(source.twitter_image,500),google_site_verification:verification(source.google_site_verification)??'',bing_site_verification:verification(source.bing_site_verification)??'',organisation_name:text(source.organisation_name,120),organisation_description:text(source.organisation_description,500),organisation_logo_url:text(source.organisation_logo_url,500)};
 if(!result.site_name||!result.default_title||!result.default_description||!result.default_og_title||!result.default_og_description||!result.twitter_title||!result.twitter_description||!result.organisation_name||!result.organisation_description)return{ok:false as const,error:'Complete all required global SEO and organisation fields.'};
 if(!result.title_template.includes('%s'))return{ok:false as const,error:'Title template must include %s so page titles can be inserted safely.'};
 if(!safeAsset(result.default_og_image)||!safeAsset(result.twitter_image)||!safeAsset(result.organisation_logo_url))return{ok:false as const,error:'SEO image/logo destinations must be root-relative Mettelo paths or secure HTTPS URLs.'};
 if(verification(source.google_site_verification)===null||verification(source.bing_site_verification)===null)return{ok:false as const,error:'Search-engine verification values contain unsupported characters.'};
 return{ok:true as const,payload:result};
}

export function validatePageSeo(page:WebsiteSeoPageKey,value:unknown){
 const source=record(value);if(!source)return{ok:false as const,error:'Page SEO payload is required.'};
 const result:PageSeoConfig={title:text(source.title,180),description:text(source.description,320),canonical:text(source.canonical,500),og_title:text(source.og_title,180),og_description:text(source.og_description,320),og_image:text(source.og_image,500),index:boolean(source.index),follow:boolean(source.follow)};
 if(!result.title||!result.description||!result.og_title||!result.og_description||!result.canonical||!result.og_image)return{ok:false as const,error:'Complete the title, description, canonical and social preview fields.'};
 if(!safeCanonical(result.canonical)||!safeAsset(result.og_image))return{ok:false as const,error:'Canonical and social image must use a root-relative Mettelo path or secure HTTPS URL.'};
 if(result.canonical.startsWith('/')&&new URL(result.canonical,'https://mettelo.com').pathname!==SEO_PAGE_ROUTES[page])return{ok:false as const,error:`The ${SEO_PAGE_LABELS[page]} canonical must resolve to ${SEO_PAGE_ROUTES[page]} unless you intentionally use a secure absolute canonical.`};
 return{ok:true as const,payload:result};
}

export function validateWebsiteSeo(scope:WebsiteSeoScope,value:unknown){return scope==='global'?validateGlobalSeo(value):validatePageSeo(scope,value)}
export function defaultWebsiteSeo(scope:WebsiteSeoScope){return scope==='global'?{...DEFAULT_GLOBAL_SEO}:{...DEFAULT_PAGE_SEO[scope]}}

async function publishedRow(scope:WebsiteSeoScope){
 noStore();const db=createPublicSupabaseClient();if(!db)return null;
 try{const {data,error}=await db.from('website_seo_public').select('payload').eq('scope',scope).maybeSingle();if(error||!data)return null;const checked=validateWebsiteSeo(scope,data.payload);return checked.ok?checked.payload:null}catch{return null}
}

export async function getPublicGlobalSeo():Promise<GlobalSeoConfig>{const row=await publishedRow('global');return(row&&'site_name'in row?row:DEFAULT_GLOBAL_SEO) as GlobalSeoConfig}
export async function getPublicPageSeo(page:WebsiteSeoPageKey):Promise<PageSeoConfig>{const row=await publishedRow(page);return(row&&'title'in row?row:DEFAULT_PAGE_SEO[page]) as PageSeoConfig}
function absoluteUrl(value:string){try{return new URL(value,'https://mettelo.com').toString()}catch{return'https://mettelo.com'}}

export async function buildGlobalMetadata():Promise<Metadata>{
 const [seo,home]=await Promise.all([getPublicGlobalSeo(),getPublicPageSeo('home')]);const canonical=absoluteUrl(home.canonical);
 return{metadataBase:new URL('https://mettelo.com'),title:{default:home.title||seo.default_title,template:seo.title_template},description:home.description||seo.default_description,alternates:{canonical},robots:{index:home.index,follow:home.follow,googleBot:{index:home.index,follow:home.follow}},openGraph:{title:home.og_title||seo.default_og_title,description:home.og_description||seo.default_og_description,url:canonical,siteName:seo.site_name,images:[{url:home.og_image||seo.default_og_image,alt:home.og_title||seo.default_og_title}],type:'website'},twitter:{card:'summary_large_image',title:home.og_title||seo.twitter_title,description:home.og_description||seo.twitter_description,images:[home.og_image||seo.twitter_image]},verification:{google:seo.google_site_verification||undefined,other:seo.bing_site_verification?{'msvalidate.01':[seo.bing_site_verification]}:undefined}};
}
export async function buildPageMetadata(page:WebsiteSeoPageKey):Promise<Metadata>{
 const [global,pageSeo]=await Promise.all([getPublicGlobalSeo(),getPublicPageSeo(page)]);const canonical=absoluteUrl(pageSeo.canonical);
 return{title:{absolute:pageSeo.title},description:pageSeo.description,alternates:{canonical},robots:{index:pageSeo.index,follow:pageSeo.follow,googleBot:{index:pageSeo.index,follow:pageSeo.follow}},openGraph:{title:pageSeo.og_title,description:pageSeo.og_description,url:canonical,siteName:global.site_name,images:[{url:pageSeo.og_image,alt:pageSeo.og_title}],type:'website'},twitter:{card:'summary_large_image',title:pageSeo.og_title,description:pageSeo.og_description,images:[pageSeo.og_image]}};
}
export async function buildOrganisationJsonLd(){const seo=await getPublicGlobalSeo();return{'@context':'https://schema.org','@type':'Organization',name:seo.organisation_name,url:'https://mettelo.com',description:seo.organisation_description,logo:absoluteUrl(seo.organisation_logo_url)};}
