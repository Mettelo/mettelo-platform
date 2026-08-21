import {unstable_noStore as noStore} from 'next/cache';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {isSafePublicHref} from '@/lib/website-chrome';
import {
  WEBSITE_PAGE_FIELDS as LEGACY_FIELDS,
  WEBSITE_PAGE_LABELS as LEGACY_LABELS,
  defaultWebsitePagePayload as legacyDefaultPayload,
  getPublicWebsitePage as getLegacyPublicPage,
  type WebsitePageFieldDefinition,
  type WebsitePagePayload
} from '@/lib/website-pages';

export type WebsiteCmsPageKey=
  |'home'|'about'|'contact'
  |'organisations'|'community'
  |'projects'|'opportunities'|'showcase'|'events'|'people'|'spotlight'
  |'blog'|'careers'|'faq'
  |'partnership'|'feedback'|'community_guidelines';

export type WebsiteCmsCategory='Core'|'Discover'|'Content & growth'|'Conversion & support'|'Community';
export type WebsiteCmsPageDefinition={
  key:WebsiteCmsPageKey;
  label:string;
  path:string;
  category:WebsiteCmsCategory;
  description:string;
  fields:WebsitePageFieldDefinition[];
  managerHref?:string;
  managerLabel?:string;
};

const field=(key:string,label:string,group:string,kind:'text'|'textarea'|'href',maxLength:number,fallback:string):WebsitePageFieldDefinition=>({key,label,group,kind,maxLength,fallback});

function landingFields(fallbacks:{eyebrow:string;title:string;lead:string;sectionTitle?:string;sectionBody?:string;emptyTitle?:string;emptyBody?:string;ctaLabel?:string;ctaHref?:string}){
  return [
    field('hero_eyebrow','Hero eyebrow','01 · Hero','text',100,fallbacks.eyebrow),
    field('hero_title','Hero headline','01 · Hero','text',220,fallbacks.title),
    field('hero_lead','Hero supporting copy','01 · Hero','textarea',900,fallbacks.lead),
    field('section_title','Main section heading','02 · Main content','text',220,fallbacks.sectionTitle||'Explore what is available.'),
    field('section_body','Main section introduction','02 · Main content','textarea',900,fallbacks.sectionBody||'Use the live content below to find the right next step.'),
    field('empty_title','Empty-state heading','03 · Empty state','text',180,fallbacks.emptyTitle||'Nothing is available right now.'),
    field('empty_body','Empty-state guidance','03 · Empty state','textarea',600,fallbacks.emptyBody||'Please check back soon for the latest updates.'),
    field('final_cta_label','Final CTA label','04 · Final CTA','text',80,fallbacks.ctaLabel||'Explore Mettelo →'),
    field('final_cta_href','Final CTA destination','04 · Final CTA','href',500,fallbacks.ctaHref||'/')
  ];
}

const definitions:WebsiteCmsPageDefinition[]=[
  {key:'home',label:LEGACY_LABELS.home,path:'/',category:'Core',description:'Homepage hero, explanatory sections, Proof and final conversion copy.',fields:LEGACY_FIELDS.home},
  {key:'about',label:LEGACY_LABELS.about,path:'/about',category:'Core',description:'Company story, mission, vision, ecosystem and founder copy.',fields:LEGACY_FIELDS.about},
  {key:'organisations',label:'For Organisations',path:'/organisations',category:'Core',description:'Organisation proposition, partnership routes and conversion copy.',fields:landingFields({eyebrow:'FOR ORGANISATIONS',title:'Bring a real problem. Build with Mettelo.',lead:'Work with Mettelo on practical Data & AI projects, talent, research, events and capability-building initiatives.',sectionTitle:'Ways organisations can work with Mettelo.',sectionBody:'Choose the route that best matches the problem, opportunity or collaboration you want to create.',ctaLabel:'Start a partnership →',ctaHref:'/partnership'}),managerHref:'/admin/structured-publishing',managerLabel:'Manage structured projects & opportunities'},
  {key:'community',label:'Community',path:'/community',category:'Core',description:'Community proposition, participation guidance and calls to action.',fields:landingFields({eyebrow:'METTELO COMMUNITY',title:'Build capability with people who are doing the work.',lead:'Join a professional community shaped around contribution, useful relationships and visible evidence of capability.',sectionTitle:'Participate with purpose.',sectionBody:'Discover the routes into projects, events, Proof and the wider Mettelo ecosystem.',ctaLabel:'Join Mettelo →',ctaHref:'/signin?mode=signup'})},
  {key:'projects',label:'Projects',path:'/projects',category:'Discover',description:'Public project catalogue presentation copy. Project records remain governed separately.',fields:landingFields({eyebrow:'REAL-WORLD TECHNOLOGY PROJECTS',title:'Build capability by doing the work.',lead:'Join structured projects across technology, data and AI. Work with a team, solve real problems, contribute to meaningful outcomes and build evidence of what you can actually do.',sectionTitle:'Find work worth contributing to.',sectionBody:'Review the problem, available roles, time commitment, tools and current stage before you decide to join.',emptyTitle:'No public projects match right now.',emptyBody:'Try clearing your filters or check back as new briefs open.',ctaLabel:'Explore projects →',ctaHref:'#projects'}),managerHref:'/admin/project-operations',managerLabel:'Manage project records'},
  {key:'opportunities',label:'Opportunities',path:'/opportunities',category:'Discover',description:'Opportunity feed framing, search guidance and empty-state copy.',fields:landingFields({eyebrow:'DATA & AI OPPORTUNITIES',title:'Find opportunities worth your attention.',lead:'Explore Data & AI jobs, internships, graduate roles, fellowships and other opportunities with clearer context on location, remote work, eligibility and sponsorship.',sectionTitle:'Search first. Filter only when you need to.',sectionBody:'Start with a role, company, skill or location. Use quick filters for common searches, then open advanced filters for more control.',emptyTitle:'No Data & AI opportunities are live right now.',emptyBody:'We keep the feed focused rather than showing expired or low-relevance listings.',ctaLabel:'Get opportunity alerts →',ctaHref:'/newsletter'}),managerHref:'/admin/opportunities',managerLabel:'Manage opportunity records'},
  {key:'showcase',label:'Proof / Showcase',path:'/showcase',category:'Discover',description:'Public verified-Proof framing and discovery copy. Proof records stay governed by verification.',fields:landingFields({eyebrow:'VERIFIED PROOF',title:'See the work behind the capability.',lead:'Explore reviewed contributions connected to real Mettelo project work and the evidence that supports them.',sectionTitle:'Verified contribution, in context.',sectionBody:'Proof shows what someone worked on, what they contributed and what evidence was reviewed.',emptyTitle:'No public Proof is available yet.',emptyBody:'Verified public contributions will appear here when members choose to share them.',ctaLabel:'Explore projects →',ctaHref:'/projects'}),managerHref:'/admin/proof-review',managerLabel:'Manage Proof review'},
  {key:'events',label:'Events',path:'/events',category:'Discover',description:'Public event discovery and registration framing. Event records remain governed by Events publishing.',fields:landingFields({eyebrow:'METTELO EVENTS',title:'Join sessions that move capability forward.',lead:'Discover public Mettelo sessions, project learning events, showcases and community gatherings.',sectionTitle:'Upcoming events.',sectionBody:'Register for public events or sign in to see member and project-specific sessions.',emptyTitle:'No public events are open right now.',emptyBody:'New sessions will appear here when organisers publish them for the wider community.',ctaLabel:'Join Mettelo →',ctaHref:'/signin?mode=signup'}),managerHref:'/admin/structured-publishing',managerLabel:'Manage event records'},
  {key:'people',label:'People',path:'/people',category:'Discover',description:'Public people-directory framing and discovery guidance.',fields:landingFields({eyebrow:'METTELO PEOPLE',title:'Discover capability through real contribution.',lead:'Explore professionals who have chosen to make their Mettelo profile and evidence discoverable.',sectionTitle:'People building in public.',sectionBody:'Profiles bring skills, interests and verified contribution into clearer context.',emptyTitle:'No public profiles match right now.',emptyBody:'Try another search or check back as more members make their profiles discoverable.',ctaLabel:'Join Mettelo →',ctaHref:'/signin?mode=signup'})},
  {key:'spotlight',label:'Spotlight',path:'/spotlight',category:'Discover',description:'Recognition and Spotlight programme framing.',fields:landingFields({eyebrow:'METTELO SPOTLIGHT',title:'Recognition grounded in contribution.',lead:'Discover people, work and evidence recognised across the Mettelo ecosystem.',sectionTitle:'Current recognition.',sectionBody:'Spotlight surfaces meaningful contribution and the context behind it.',emptyTitle:'No Spotlight features are live right now.',emptyBody:'New recognition will appear here as contribution is reviewed and selected.',ctaLabel:'Explore Proof →',ctaHref:'/showcase'}),managerHref:'/admin/spotlight',managerLabel:'Manage Spotlight & awards'},
  {key:'blog',label:'Insights',path:'/blog',category:'Content & growth',description:'Insights landing-page framing. Individual articles remain in News & Insights.',fields:landingFields({eyebrow:'INSIGHTS',title:'Ideas for building what comes next.',lead:'Read practical perspectives on Data & AI capability, real work, evidence, careers and the future of professional development.',sectionTitle:'Latest insights.',sectionBody:'Browse current thinking and practical guidance from Mettelo.',emptyTitle:'No insights are published yet.',emptyBody:'Published articles will appear here when they are ready.',ctaLabel:'Join the community →',ctaHref:'/signin?mode=signup'}),managerHref:'/admin/editorial',managerLabel:'Manage News & Insights'},
  {key:'careers',label:'Careers',path:'/careers',category:'Content & growth',description:'Careers proposition, hiring-process guidance and role-list framing.',fields:landingFields({eyebrow:'CAREERS AT METTELO',title:'Build what professional capability should become.',lead:'Explore open roles and help build technology, community and operating systems that connect real work, Proof and opportunity.',sectionTitle:'Open roles.',sectionBody:'Review current opportunities and apply through the governed Mettelo recruitment flow.',emptyTitle:'No roles are open right now.',emptyBody:'We will publish new opportunities here when teams are ready to hire.',ctaLabel:'Learn about Mettelo →',ctaHref:'/about'}),managerHref:'/admin/careers',managerLabel:'Manage recruiting'},
  {key:'faq',label:'FAQ',path:'/faq',category:'Content & growth',description:'FAQ introduction and support-routing copy.',fields:landingFields({eyebrow:'FAQ',title:'Questions about Mettelo?',lead:'Find clear answers about membership, projects, Proof, opportunities, events and working with Mettelo.',sectionTitle:'Frequently asked questions.',sectionBody:'Browse the topics below or contact us if you still need help.',emptyTitle:'No FAQ content is available.',emptyBody:'Please contact Mettelo and we will help route your question.',ctaLabel:'Contact Mettelo →',ctaHref:'/contact'})},
  {key:'partnership',label:'Partnership',path:'/partnership',category:'Conversion & support',description:'Partnership proposition, enquiry guidance and conversion copy.',fields:landingFields({eyebrow:'PARTNER WITH METTELO',title:'Bring a problem, opportunity or collaboration.',lead:'Tell us what you are trying to achieve and we will route the conversation to the right Mettelo team.',sectionTitle:'Start with the context.',sectionBody:'Projects, hiring, research, events, sponsorship and ecosystem partnerships can all start here.',emptyTitle:'Partnership form unavailable.',emptyBody:'Please use the Contact page while the partnership form is unavailable.',ctaLabel:'Contact Mettelo →',ctaHref:'/contact'})},
  {key:'contact',label:LEGACY_LABELS.contact,path:'/contact',category:'Conversion & support',description:'Contact routes, form introduction and faster-route copy.',fields:LEGACY_FIELDS.contact},
  {key:'feedback',label:'Feedback',path:'/feedback',category:'Conversion & support',description:'Feedback invitation, expectations and support-routing copy.',fields:landingFields({eyebrow:'FEEDBACK',title:'Help us make Mettelo better.',lead:'Share what worked, what was unclear and what would make the experience more useful.',sectionTitle:'Tell us what happened.',sectionBody:'Give enough context for the team to understand the experience and follow up when needed.',emptyTitle:'Feedback form unavailable.',emptyBody:'Please use Contact if you need to reach the team urgently.',ctaLabel:'Contact Mettelo →',ctaHref:'/contact'})},
  {key:'community_guidelines',label:'Community Guidelines',path:'/community-guidelines',category:'Community',description:'Community participation principles and guidance. Legal Terms and Privacy remain outside general copy editing.',fields:landingFields({eyebrow:'COMMUNITY GUIDELINES',title:'Build with respect, evidence and shared responsibility.',lead:'These guidelines explain how people are expected to participate across Mettelo community spaces, projects and events.',sectionTitle:'How we work together.',sectionBody:'Participate professionally, protect privacy, respect project boundaries and contribute in ways that help others do useful work.',emptyTitle:'Guidelines unavailable.',emptyBody:'Please contact Mettelo if you need clarification on community expectations.',ctaLabel:'Contact Mettelo →',ctaHref:'/contact'})}
];

export const WEBSITE_CMS_PAGES=definitions;
export const WEBSITE_CMS_PAGE_KEYS=definitions.map(item=>item.key);
export const WEBSITE_CMS_PAGE_MAP=Object.fromEntries(definitions.map(item=>[item.key,item])) as Record<WebsiteCmsPageKey,WebsiteCmsPageDefinition>;
export const WEBSITE_CMS_PAGE_LABELS=Object.fromEntries(definitions.map(item=>[item.key,item.label])) as Record<WebsiteCmsPageKey,string>;
export const WEBSITE_CMS_PAGE_FIELDS=Object.fromEntries(definitions.map(item=>[item.key,item.fields])) as Record<WebsiteCmsPageKey,WebsitePageFieldDefinition[]>;

const legacyKeys=new Set<WebsiteCmsPageKey>(['home','about','contact']);
export function isWebsiteCmsPageKey(value:unknown):value is WebsiteCmsPageKey{return typeof value==='string'&&WEBSITE_CMS_PAGE_KEYS.includes(value as WebsiteCmsPageKey)}
export function defaultWebsiteCmsPagePayload(page:WebsiteCmsPageKey):WebsitePagePayload{
  if(legacyKeys.has(page))return legacyDefaultPayload(page as 'home'|'about'|'contact');
  return{values:Object.fromEntries(WEBSITE_CMS_PAGE_FIELDS[page].map(item=>[item.key,item.fallback]))};
}
export function validateWebsiteCmsPagePayload(page:WebsiteCmsPageKey,input:unknown):{ok:true;payload:WebsitePagePayload}|{ok:false;error:string}{
  if(legacyKeys.has(page)){
    const values=(input as WebsitePagePayload|undefined)?.values;
    if(!values||typeof values!=='object'||Array.isArray(values))return{ok:false,error:'Page content must contain editable values.'};
    const fallback=legacyDefaultPayload(page as 'home'|'about'|'contact');
    const clean:Record<string,string>={};
    for(const definition of WEBSITE_CMS_PAGE_FIELDS[page]){
      const raw=values[definition.key]??fallback.values[definition.key]??definition.fallback;
      if(typeof raw!=='string')return{ok:false,error:`${definition.label} must be text.`};
      const value=raw.trim();if(value.length>definition.maxLength)return{ok:false,error:`${definition.label} is too long.`};
      if(definition.kind==='href'&&!isSafePublicHref(value))return{ok:false,error:`${definition.label} must use a Mettelo path or secure HTTPS URL.`};
      clean[definition.key]=value;
    }
    return{ok:true,payload:{values:clean}};
  }
  if(!input||typeof input!=='object'||Array.isArray(input))return{ok:false,error:'Page content is required.'};
  const values=(input as WebsitePagePayload).values;if(!values||typeof values!=='object'||Array.isArray(values))return{ok:false,error:'Page content must contain editable values.'};
  const clean:Record<string,string>={};
  for(const definition of WEBSITE_CMS_PAGE_FIELDS[page]){
    const raw=values[definition.key];if(typeof raw!=='string')return{ok:false,error:`${definition.label} is required.`};
    const value=raw.trim();if(!value)return{ok:false,error:`${definition.label} is required.`};if(value.length>definition.maxLength)return{ok:false,error:`${definition.label} is too long.`};
    if(definition.kind==='href'&&!isSafePublicHref(value))return{ok:false,error:`${definition.label} must use a Mettelo path or secure HTTPS URL.`};
    clean[definition.key]=value;
  }
  return{ok:true,payload:{values:clean}};
}
export async function getPublicWebsiteCmsPage(page:WebsiteCmsPageKey):Promise<WebsitePagePayload>{
  noStore();
  if(legacyKeys.has(page))return getLegacyPublicPage(page as 'home'|'about'|'contact');
  const fallback=defaultWebsiteCmsPagePayload(page);const db=createPublicSupabaseClient();if(!db)return fallback;
  const {data,error}=await db.from('website_page_public').select('payload').eq('page_key',page).maybeSingle();if(error||!data)return fallback;
  const validated=validateWebsiteCmsPagePayload(page,data.payload);return validated.ok?validated.payload:fallback;
}
