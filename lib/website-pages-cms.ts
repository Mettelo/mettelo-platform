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
  |'partnership'|'feedback'|'community_guidelines'
  |'privacy'|'terms';

export type WebsiteCmsCategory='Core'|'Discover'|'Content & growth'|'Conversion & support'|'Community'|'Legal';
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

function legalFields(config:{title:string;updated:string;sections:{title:string;body:string}[]}){
  return [
    field('legal_title','Document title','01 · Document','text',180,config.title),
    field('last_updated','Last updated','01 · Document','text',80,config.updated),
    ...config.sections.flatMap((section,index)=>[
      field(`section_${index+1}_title`,`Section ${index+1} heading`,`${String(index+2).padStart(2,'0')} · ${section.title}`,'text',220,section.title),
      field(`section_${index+1}_body`,`Section ${index+1} content`,`${String(index+2).padStart(2,'0')} · ${section.title}`,'textarea',4000,section.body)
    ])
  ];
}

const definitions:WebsiteCmsPageDefinition[]=[
  {key:'home',label:LEGACY_LABELS.home,path:'/',category:'Core',description:'Homepage hero, explanatory sections, Proof and final conversion copy.',fields:LEGACY_FIELDS.home},
  {key:'about',label:LEGACY_LABELS.about,path:'/about',category:'Core',description:'Company story, mission, vision, ecosystem and founder copy.',fields:LEGACY_FIELDS.about},
  {key:'organisations',label:'For Organisations',path:'/organisations',category:'Core',description:'Organisation proposition, partnership routes and conversion copy.',fields:landingFields({eyebrow:'FOR ORGANISATIONS',title:'Bring a technology problem worth solving.',lead:'Share a Data & AI opportunity, a real project problem or a partnership idea. Mettelo reviews the context and the relevant route forward.',sectionTitle:'Choose the right way to work with Mettelo.',sectionBody:'Bring an opportunity, shape a project brief or explore a wider partnership with the context needed for Mettelo to assess the next step.',emptyTitle:'Ready to start a conversation?',emptyBody:'Tell us what you are trying to achieve. Submitting an enquiry starts a review; it does not guarantee publication, project acceptance, hiring support or partnership.',ctaLabel:'Start an organisation enquiry →',ctaHref:'/partnership'}),managerHref:'/admin/structured-publishing',managerLabel:'Manage structured projects & opportunities'},
  {key:'community',label:'Community',path:'/community',category:'Core',description:'Community proposition, participation guidance and calls to action.',fields:landingFields({eyebrow:'METTELO COMMUNITY',title:'Build capability through useful professional relationships.',lead:'Connect with IT, Data & AI professionals around learning, collaboration, mentoring, projects and relevant opportunities.',sectionTitle:'Participate with purpose.',sectionBody:'Use Mettelo community spaces to learn, help, collaborate and find routes into projects, events, mentoring and meaningful contribution.',emptyTitle:'Build relationships. Then build together.',emptyBody:'Start by joining the conversation, then move into projects, events, mentoring or other contribution opportunities when they are relevant.',ctaLabel:'Join Mettelo →',ctaHref:'/signin?mode=signup'})},
  {key:'projects',label:'Projects',path:'/projects',category:'Discover',description:'Public project catalogue presentation copy. Project records remain governed separately.',fields:landingFields({eyebrow:'REAL-WORLD TECHNOLOGY PROJECTS',title:'Build capability by doing the work.',lead:'Join structured projects across technology, data and AI. Work with a team, solve real problems, contribute to meaningful outcomes and build evidence of what you can actually do.',sectionTitle:'Find work worth contributing to.',sectionBody:'Review the problem, available roles, time commitment, tools and current stage before you decide to join.',emptyTitle:'No public projects match right now.',emptyBody:'Try clearing your filters or check back as new briefs open.',ctaLabel:'Explore projects →',ctaHref:'#projects'}),managerHref:'/admin/project-operations',managerLabel:'Manage project records'},
  {key:'opportunities',label:'Opportunities',path:'/opportunities',category:'Discover',description:'Opportunity feed framing, search guidance and empty-state copy.',fields:landingFields({eyebrow:'DATA & AI OPPORTUNITIES',title:'Explore relevant routes forward.',lead:'Find current Data & AI jobs, internships, graduate roles, fellowships and other opportunities with clearer context on location, remote work, eligibility and sponsorship.',sectionTitle:'Find opportunities that fit your next move.',sectionBody:'Search by role, company, skill or location, then use filters when you need more control. Listings are routes to explore, not guarantees of fit, selection or outcome.',emptyTitle:'No Data & AI opportunities are live right now.',emptyBody:'The public feed stays focused on current, high-relevance listings rather than showing expired or low-relevance opportunities.',ctaLabel:'Get opportunity alerts →',ctaHref:'/newsletter'}),managerHref:'/admin/opportunities',managerLabel:'Manage opportunity records'},
  {key:'showcase',label:'Proof / Showcase',path:'/showcase',category:'Discover',description:'Public verified-Proof framing and discovery copy. Proof records stay governed by verification.',fields:landingFields({eyebrow:'VERIFIED PROOF',title:'See the work behind the capability.',lead:'Explore reviewed contributions connected to real Mettelo project work and the evidence that supports them.',sectionTitle:'Verified contribution, in context.',sectionBody:'Proof shows what someone worked on, what they contributed and what evidence was reviewed.',emptyTitle:'No public Proof is available yet.',emptyBody:'Verified public contributions will appear here when members choose to share them.',ctaLabel:'Explore projects →',ctaHref:'/projects'}),managerHref:'/admin/proof-review',managerLabel:'Manage Proof review'},
  {key:'events',label:'Events',path:'/events',category:'Discover',description:'Public event discovery and registration framing. Event records remain governed by Events publishing.',fields:landingFields({eyebrow:'METTELO EVENTS',title:'Learn, connect and see contribution in context.',lead:'Join practical sessions, project learning, showcases and professional conversations across Data & AI.',sectionTitle:'Upcoming events.',sectionBody:'Choose sessions that help you learn, collaborate, understand project work or connect with other professionals. Attendance alone does not create Mettelo Proof.',emptyTitle:'No public events are open right now.',emptyBody:'New sessions will appear here when organisers publish them for the wider community.',ctaLabel:'Join Mettelo →',ctaHref:'/signin?mode=signup'}),managerHref:'/admin/structured-publishing',managerLabel:'Manage event records'},
  {key:'people',label:'People',path:'/people',category:'Discover',description:'Public people-directory framing and discovery guidance.',fields:landingFields({eyebrow:'METTELO PEOPLE',title:'Discover capability through real contribution.',lead:'Explore professionals who have chosen to make their Mettelo profile and evidence discoverable.',sectionTitle:'People building in public.',sectionBody:'Profiles bring skills, interests and verified contribution into clearer context.',emptyTitle:'No public profiles match right now.',emptyBody:'Try another search or check back as more members make their profiles discoverable.',ctaLabel:'Join Mettelo →',ctaHref:'/signin?mode=signup'})},
  {key:'spotlight',label:'Spotlight',path:'/spotlight',category:'Discover',description:'Recognition and Spotlight programme framing.',fields:landingFields({eyebrow:'METTELO SPOTLIGHT',title:'Recognition grounded in contribution.',lead:'Discover people, work and evidence recognised across the Mettelo ecosystem.',sectionTitle:'Current recognition.',sectionBody:'Spotlight surfaces meaningful contribution and the context behind it.',emptyTitle:'No Spotlight features are live right now.',emptyBody:'New recognition will appear here as contribution is reviewed and selected.',ctaLabel:'Explore Proof →',ctaHref:'/showcase'}),managerHref:'/admin/spotlight',managerLabel:'Manage Spotlight & awards'},
  {key:'blog',label:'Insights',path:'/blog',category:'Content & growth',description:'Insights landing-page framing. Individual articles remain in News & Insights.',fields:landingFields({eyebrow:'INSIGHTS',title:'Ideas for building what comes next.',lead:'Read practical perspectives on Data & AI capability, real work, evidence, careers and the future of professional development.',sectionTitle:'Latest insights.',sectionBody:'Browse current thinking and practical guidance from Mettelo.',emptyTitle:'No insights are published yet.',emptyBody:'Published articles will appear here when they are ready.',ctaLabel:'Join the community →',ctaHref:'/signin?mode=signup'}),managerHref:'/admin/editorial',managerLabel:'Manage News & Insights'},
  {key:'careers',label:'Careers',path:'/careers',category:'Content & growth',description:'Careers proposition, hiring-process guidance and role-list framing.',fields:landingFields({eyebrow:'CAREERS AT METTELO',title:'Build what professional capability should become.',lead:'Explore open roles and help build technology, community and operating systems that connect real work, Proof and opportunity.',sectionTitle:'Open roles.',sectionBody:'Review current opportunities and apply through the governed Mettelo recruitment flow.',emptyTitle:'No roles are open right now.',emptyBody:'We will publish new opportunities here when teams are ready to hire.',ctaLabel:'Learn about Mettelo →',ctaHref:'/about'}),managerHref:'/admin/careers',managerLabel:'Manage recruiting'},
  {key:'faq',label:'FAQ',path:'/faq',category:'Content & growth',description:'FAQ introduction and support-routing copy.',fields:landingFields({eyebrow:'FAQ',title:'Questions about Mettelo?',lead:'Find clear answers about membership, projects, Proof, opportunities, events and working with Mettelo.',sectionTitle:'Frequently asked questions.',sectionBody:'Browse the topics below or contact us if you still need help.',emptyTitle:'No FAQ content is available.',emptyBody:'Please contact Mettelo and we will help route your question.',ctaLabel:'Contact Mettelo →',ctaHref:'/contact'})},
  {key:'partnership',label:'Partnership',path:'/partnership',category:'Conversion & support',description:'Partnership proposition, enquiry guidance and conversion copy.',fields:landingFields({eyebrow:'PARTNER WITH METTELO',title:'Bring a problem, opportunity or collaboration.',lead:'Tell us what you are trying to achieve and we will route the conversation to the right Mettelo team.',sectionTitle:'Start with the context.',sectionBody:'Projects, hiring, research, events, sponsorship and ecosystem partnerships can all start here.',emptyTitle:'Partnership form unavailable.',emptyBody:'Please use the Contact page while the partnership form is unavailable.',ctaLabel:'Contact Mettelo →',ctaHref:'/contact'})},
  {key:'contact',label:LEGACY_LABELS.contact,path:'/contact',category:'Conversion & support',description:'Contact routes, form introduction and faster-route copy.',fields:LEGACY_FIELDS.contact},
  {key:'feedback',label:'Feedback',path:'/feedback',category:'Conversion & support',description:'Feedback invitation, expectations and support-routing copy.',fields:landingFields({eyebrow:'FEEDBACK',title:'Help us make Mettelo better.',lead:'Share what worked, what was unclear and what would make the experience more useful.',sectionTitle:'Tell us what happened.',sectionBody:'Give enough context for the team to understand the experience and follow up when needed.',emptyTitle:'Feedback form unavailable.',emptyBody:'Please use Contact if you need to reach the team urgently.',ctaLabel:'Contact Mettelo →',ctaHref:'/contact'})},
  {key:'community_guidelines',label:'Community Guidelines',path:'/community-guidelines',category:'Community',description:'Community participation principles and guidance.',fields:landingFields({eyebrow:'COMMUNITY GUIDELINES',title:'Build with respect, evidence and shared responsibility.',lead:'These guidelines explain how people are expected to participate across Mettelo community spaces, projects and events.',sectionTitle:'How we work together.',sectionBody:'Participate professionally, protect privacy, respect project boundaries and contribute in ways that help others do useful work.',emptyTitle:'Guidelines unavailable.',emptyBody:'Please contact Mettelo if you need clarification on community expectations.',ctaLabel:'Contact Mettelo →',ctaHref:'/contact'})},
  {key:'privacy',label:'Privacy Policy',path:'/privacy',category:'Legal',description:'Lawyer-editable Privacy Policy. Save drafts safely, preview before release and publish only reviewed legal copy.',fields:legalFields({title:'Privacy Policy',updated:'9 August 2026',sections:[
    {title:'What we collect',body:'Mettelo collects information you choose to provide when you create an account, join the newsletter, apply to a project, submit a partnership or contributor enquiry, register interest in events, send feedback or contact the team. This can include your name, email, location, professional information, links to public profiles and the content of your submission.'},
    {title:'How we use it',body:'We use personal information to provide account access, operate community and project workflows, respond to enquiries, send requested updates, improve Mettelo, protect the platform and understand which parts of the product are useful. We do not sell personal data to advertisers.'},
    {title:'Community and public contribution',body:'Some Mettelo activity is designed to become public proof, such as approved project credits, showcases or Spotlight recognition. We will distinguish private application data from information intended for public display and provide a clear step before publication.'},
    {title:'Service providers and international use',body:'Mettelo serves professionals in Nigeria, the UK, the diaspora and other regions. We may use specialist providers for hosting, authentication, email, analytics, events and community services. Data may therefore be processed in more than one country, subject to the safeguards and terms provided by those services and applicable law.'},
    {title:'Analytics and cookies',body:'Analytics is only loaded when a measurement ID is configured. We use it to understand page usage and important conversion actions. Authentication providers may also use cookies or local storage to maintain secure sessions.'},
    {title:'Retention and security',body:'We keep information only as long as it is reasonably needed for the purpose collected, operational records, dispute handling or legal obligations. Access to private submissions and administrative data should be limited to authorised roles.'},
    {title:'Your choices',body:'You can unsubscribe from marketing emails, ask us to correct inaccurate profile information, or request access to or deletion of personal information where applicable. Some records may need to be retained for security, project integrity or legal reasons.'},
    {title:'Contact',body:'Use the Contact page for privacy questions or requests. We may update this policy as the product, legal obligations and service providers change.'}
  ]})},
  {key:'terms',label:'Terms of Use',path:'/terms',category:'Legal',description:'Lawyer-editable Terms of Use. Draft and review changes before deliberate publication to the public site.',fields:legalFields({title:'Terms of Use',updated:'9 August 2026',sections:[
    {title:'Using Mettelo',body:'Mettelo provides community, project, event, content, contribution and opportunity-discovery experiences for Data & AI professionals. You must provide accurate account information, keep credentials secure and use the service lawfully.'},
    {title:'No guaranteed outcome',body:'Membership, contribution, project participation, mentoring, referrals or visibility do not guarantee employment, sponsorship, funding, certification, promotion or any other professional outcome.'},
    {title:'Projects and contribution',body:'Project briefs may involve public data, partner-provided material or open-source work. Contributors must follow the project brief, repository licence, data-handling rules and team standards. Public credit is based on verified contribution, not attendance alone.'},
    {title:'Opportunities',body:'Mettelo may curate or link to third-party jobs, fellowships, volunteering and other opportunities. Unless explicitly stated, Mettelo is not the employer or organiser and cannot guarantee that a third-party listing remains open, accurate or suitable.'},
    {title:'Community conduct',body:'Use of Mettelo Community spaces is subject to the Community Guidelines. We may restrict or remove access where behaviour creates safety, integrity, spam, harassment or trust risks.'},
    {title:'Content and intellectual property',body:'You retain ownership of content you create unless a project or open-source licence states otherwise. By submitting material for publication, you grant Mettelo permission to display, reproduce and promote that approved material in connection with the platform and community.'},
    {title:'Availability',body:'Mettelo is an early-stage product. Features may change, be paused or be removed as we learn what is useful. We aim to label unfinished or unavailable functionality clearly.'},
    {title:'Privacy',body:'Personal information is handled as described in the Privacy Policy.'},
    {title:'Contact',body:'Use the Contact page for questions about these terms.'}
  ]})}
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
