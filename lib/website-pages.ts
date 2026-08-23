import {unstable_noStore as noStore} from 'next/cache';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {isSafePublicHref} from '@/lib/website-chrome';

export type WebsitePageKey='home'|'about'|'contact';
export type WebsitePageFieldKind='text'|'textarea'|'href';
export type WebsitePageFieldDefinition={key:string;label:string;group:string;kind:WebsitePageFieldKind;maxLength:number;fallback:string};
export type WebsitePagePayload={values:Record<string,string>};

const HOME_FIELDS:WebsitePageFieldDefinition[]=[
 {key:'hero_eyebrow',label:'Eyebrow',group:'Hero',kind:'text',maxLength:100,fallback:'INFORMATION TECHNOLOGY · DATA · AI'},
 {key:'hero_title',label:'Headline',group:'Hero',kind:'text',maxLength:180,fallback:'Build job-ready experience through'},
 {key:'hero_accent',label:'Headline accent',group:'Hero',kind:'text',maxLength:100,fallback:'meaningful projects.'},
 {key:'hero_lead',label:'Lead paragraph',group:'Hero',kind:'textarea',maxLength:500,fallback:'Work on IT, Data & AI projects, collaborate with others and build evidence of what you can do.'},
 {key:'hero_support',label:'Support paragraph',group:'Hero',kind:'textarea',maxLength:600,fallback:'Turn your contributions into credible professional Proof that helps you stand out for relevant roles.'},
 {key:'hero_primary_label',label:'Primary CTA label',group:'Hero',kind:'text',maxLength:80,fallback:'Explore projects →'},
 {key:'hero_primary_href',label:'Primary CTA destination',group:'Hero',kind:'href',maxLength:500,fallback:'/projects'},
 {key:'hero_secondary_label',label:'Secondary CTA label',group:'Hero',kind:'text',maxLength:80,fallback:'Join Mettelo'},
 {key:'hero_secondary_href',label:'Secondary CTA destination',group:'Hero',kind:'href',maxLength:500,fallback:'/signin?mode=signup'},
 {key:'how_eyebrow',label:'Eyebrow',group:'How Mettelo works',kind:'text',maxLength:100,fallback:'HOW METTELO WORKS'},
 {key:'how_title',label:'Heading',group:'How Mettelo works',kind:'text',maxLength:180,fallback:'From real work to credible Proof.'},
 {key:'how_body',label:'Intro copy',group:'How Mettelo works',kind:'textarea',maxLength:600,fallback:'Mettelo connects project work, contribution, supporting evidence and review so professionals can build stronger evidence of demonstrated capability.'},
 {key:'proof_eyebrow',label:'Eyebrow',group:'Proof',kind:'text',maxLength:100,fallback:'METTELO PROOF'},
 {key:'proof_title',label:'Heading',group:'Proof',kind:'text',maxLength:180,fallback:'Show the work behind your contribution.'},
 {key:'proof_lead',label:'Lead copy',group:'Proof',kind:'textarea',maxLength:700,fallback:'Mettelo Proof gives structured context to reviewed project contributions: what you worked on, what you contributed and the evidence that supports it.'},
 {key:'proof_note',label:'Verification note',group:'Proof',kind:'textarea',maxLength:700,fallback:'Verification means an authorised reviewer has reviewed the recorded contribution and supporting evidence. It does not certify the professional, guarantee an outcome or verify employment beyond the record shown.'},
 {key:'proof_cta_label',label:'CTA label',group:'Proof',kind:'text',maxLength:80,fallback:'Explore Mettelo Proof →'},
 {key:'proof_cta_href',label:'CTA destination',group:'Proof',kind:'href',maxLength:500,fallback:'/showcase'},
 {key:'organisations_eyebrow',label:'Eyebrow',group:'Organisations',kind:'text',maxLength:100,fallback:'FOR ORGANISATIONS'},
 {key:'organisations_title',label:'Heading',group:'Organisations',kind:'text',maxLength:180,fallback:'Bring a technology, Data or AI problem worth solving.'},
 {key:'organisations_lead',label:'Lead copy',group:'Organisations',kind:'textarea',maxLength:700,fallback:'Mettelo gives organisations a structured way to engage professionals around real project work and understand contribution through evidence in context.'},
 {key:'organisations_cta_label',label:'CTA label',group:'Organisations',kind:'text',maxLength:80,fallback:'Work with Mettelo →'},
 {key:'organisations_cta_href',label:'CTA destination',group:'Organisations',kind:'href',maxLength:500,fallback:'/organisations'},
 {key:'why_eyebrow',label:'Eyebrow',group:'Why Mettelo',kind:'text',maxLength:100,fallback:'WHY METTELO'},
 {key:'why_title',label:'Heading',group:'Why Mettelo',kind:'text',maxLength:180,fallback:'Real work creates stronger professional signals.'},
 {key:'why_lead',label:'Lead copy',group:'Why Mettelo',kind:'textarea',maxLength:500,fallback:'Capability becomes more credible when people can see the work, contribution and evidence behind it.'},
 {key:'why_body',label:'Main copy',group:'Why Mettelo',kind:'textarea',maxLength:1000,fallback:'Mettelo helps IT, Data & AI professionals build experience through real work, make their contributions visible and build Mettelo Proof from reviewed contribution evidence.'},
 {key:'why_scope',label:'Geographic / ambition copy',group:'Why Mettelo',kind:'textarea',maxLength:900,fallback:'We are building professional capability infrastructure with a focus on Africa and beyond — preserving useful context about demonstrated work across teams, organisations and borders.'},
 {key:'final_eyebrow',label:'Eyebrow',group:'Final CTA',kind:'text',maxLength:100,fallback:'YOUR NEXT STEP'},
 {key:'final_title',label:'Heading',group:'Final CTA',kind:'text',maxLength:180,fallback:'Build evidence through the work you do.'},
 {key:'final_body',label:'Body copy',group:'Final CTA',kind:'textarea',maxLength:700,fallback:'Join Mettelo, explore project work and start building experience that can lead to reviewed contribution evidence and credible Mettelo Proof.'},
 {key:'final_primary_label',label:'Primary CTA label',group:'Final CTA',kind:'text',maxLength:80,fallback:'Explore projects →'},
 {key:'final_primary_href',label:'Primary CTA destination',group:'Final CTA',kind:'href',maxLength:500,fallback:'/projects'},
 {key:'final_secondary_label',label:'Secondary CTA label',group:'Final CTA',kind:'text',maxLength:80,fallback:'Join Mettelo'},
 {key:'final_secondary_href',label:'Secondary CTA destination',group:'Final CTA',kind:'href',maxLength:500,fallback:'/signin?mode=signup'}
];

const ABOUT_FIELDS:WebsitePageFieldDefinition[]=[
 {key:'hero_eyebrow',label:'Eyebrow',group:'Hero',kind:'text',maxLength:100,fallback:'About Mettelo'},
 {key:'hero_title',label:'Headline',group:'Hero',kind:'text',maxLength:180,fallback:'Built for What’s Next.'},
 {key:'hero_lead',label:'Lead paragraph',group:'Hero',kind:'textarea',maxLength:1200,fallback:'Mettelo is a technology-led organisation building professional capability infrastructure for Information Technology, Data & AI professionals. We connect real work, visible contribution, supporting evidence, review and Mettelo Proof so demonstrated experience carries more useful context.'},
 {key:'hero_primary_label',label:'Primary CTA label',group:'Hero',kind:'text',maxLength:80,fallback:'Join Mettelo →'},
 {key:'hero_primary_href',label:'Primary CTA destination',group:'Hero',kind:'href',maxLength:500,fallback:'/signin?mode=signup'},
 {key:'hero_secondary_label',label:'Secondary CTA label',group:'Hero',kind:'text',maxLength:80,fallback:'Build with us'},
 {key:'hero_secondary_href',label:'Secondary CTA destination',group:'Hero',kind:'href',maxLength:500,fallback:'/partnership'},
 {key:'thesis_title',label:'Thesis heading',group:'Hero',kind:'text',maxLength:180,fallback:'Capability becomes more credible when it is demonstrated.'},
 {key:'thesis_body',label:'Thesis copy',group:'Hero',kind:'textarea',maxLength:700,fallback:'The future of work will reward more than what people know. It will reward what they can apply, build, communicate and create with others — and the evidence that gives that work context.'},
 {key:'story_eyebrow',label:'Eyebrow',group:'Story',kind:'text',maxLength:100,fallback:'The Mettelo story'},
 {key:'story_title',label:'Heading',group:'Story',kind:'text',maxLength:220,fallback:'The world of work changed. The systems around capability did not.'},
 {key:'gap_eyebrow',label:'Eyebrow',group:'Capability gap',kind:'text',maxLength:100,fallback:'The gap we are closing'},
 {key:'gap_title',label:'Heading',group:'Capability gap',kind:'text',maxLength:220,fallback:'You need experience to earn opportunity. But you often need opportunity to gain experience.'},
 {key:'gap_body',label:'Intro copy',group:'Capability gap',kind:'textarea',maxLength:800,fallback:'Mettelo is being built to break that loop by connecting meaningful work, contribution, evidence, review, professional credibility and relevant routes forward into one continuous system.'},
 {key:'ecosystem_eyebrow',label:'Eyebrow',group:'Ecosystem',kind:'text',maxLength:100,fallback:'The Mettelo ecosystem'},
 {key:'ecosystem_title',label:'Heading',group:'Ecosystem',kind:'text',maxLength:200,fallback:'One company. Seven connected capability layers.'},
 {key:'ecosystem_body',label:'Intro copy',group:'Ecosystem',kind:'textarea',maxLength:800,fallback:'Mettelo Community is the front door — not the whole company. The wider technology organisation connects how people build experience, demonstrate contribution, create credible professional evidence and pursue relevant opportunities.'},
 {key:'future_eyebrow',label:'Eyebrow',group:'Future',kind:'text',maxLength:100,fallback:'Where we are going'},
 {key:'future_title',label:'Heading',group:'Future',kind:'text',maxLength:240,fallback:'Africa and beyond: IT, Data & AI are the starting point, not the boundary of the ambition.'},
 {key:'future_body',label:'Intro copy',group:'Future',kind:'textarea',maxLength:800,fallback:'We are starting where technology transformation is moving quickly and practical evidence matters, then extending the model as the infrastructure matures.'},
 {key:'mission_title',label:'Mission heading',group:'Mission & vision',kind:'text',maxLength:220,fallback:'Build the infrastructure that enables people to develop and demonstrate real capability.'},
 {key:'mission_body',label:'Mission copy',group:'Mission & vision',kind:'textarea',maxLength:700,fallback:'We do that through meaningful work, open collaboration, intelligent technology and credible contribution evidence.'},
 {key:'vision_title',label:'Vision heading',group:'Mission & vision',kind:'text',maxLength:220,fallback:'Professional capability infrastructure for Africa and beyond.'},
 {key:'vision_body',label:'Vision copy',group:'Mission & vision',kind:'textarea',maxLength:1200,fallback:'We believe professionals across Africa should be able to access serious delivery environments, create credible evidence of what they contribute and carry that context across borders. Mettelo is building infrastructure with African ambition and global usefulness: technology that helps demonstrated capability become easier to understand and connect to relevant opportunities.'},
 {key:'founder_eyebrow',label:'Eyebrow',group:'Founder',kind:'text',maxLength:100,fallback:'Why this company was started'},
 {key:'founder_title',label:'Heading',group:'Founder',kind:'text',maxLength:220,fallback:'The problem was never simply a shortage of learning.'},
 {key:'founder_quote',label:'Founder quote',group:'Founder',kind:'textarea',maxLength:1000,fallback:'People should not have to wait for the perfect title or the perfect opportunity before they can show how they create value. We can build better infrastructure for real contribution to become visible, credible and useful.'},
 {key:'cta_eyebrow',label:'Eyebrow',group:'Final CTA',kind:'text',maxLength:100,fallback:'BUILT THROUGH CONTRIBUTION'},
 {key:'cta_title',label:'Heading',group:'Final CTA',kind:'text',maxLength:220,fallback:'Help build what professional infrastructure should become.'},
 {key:'cta_body',label:'Body copy',group:'Final CTA',kind:'textarea',maxLength:800,fallback:'Join Mettelo, contribute through projects, bring a real problem or partner with us as we develop the next layer of professional capability infrastructure.'},
 {key:'cta_primary_label',label:'Primary CTA label',group:'Final CTA',kind:'text',maxLength:80,fallback:'Join Mettelo →'},
 {key:'cta_primary_href',label:'Primary CTA destination',group:'Final CTA',kind:'href',maxLength:500,fallback:'/signin?mode=signup'},
 {key:'cta_secondary_label',label:'Secondary CTA label',group:'Final CTA',kind:'text',maxLength:80,fallback:'Work with us'},
 {key:'cta_secondary_href',label:'Secondary CTA destination',group:'Final CTA',kind:'href',maxLength:500,fallback:'/partnership'}
];

const CONTACT_FIELDS:WebsitePageFieldDefinition[]=[
 {key:'hero_eyebrow',label:'Eyebrow',group:'Hero',kind:'text',maxLength:100,fallback:'Contact Mettelo'},
 {key:'hero_title',label:'Headline',group:'Hero',kind:'text',maxLength:180,fallback:'Start with the right route.'},
 {key:'hero_lead',label:'Lead paragraph',group:'Hero',kind:'textarea',maxLength:900,fallback:'Whether you are a member, contributor, organisation, speaker, employer or simply trying to understand Mettelo, give us enough context to route your enquiry well.'},
 {key:'partner_chip',label:'Partnership label',group:'Partnership panel',kind:'text',maxLength:60,fallback:'ORGANISATIONS'},
 {key:'partner_title',label:'Heading',group:'Partnership panel',kind:'text',maxLength:160,fallback:'Partnership enquiry?'},
 {key:'partner_body',label:'Body copy',group:'Partnership panel',kind:'textarea',maxLength:700,fallback:'Use the dedicated partnership form for projects, hiring, research, events, sponsorship or collaboration.'},
 {key:'partner_cta_label',label:'CTA label',group:'Partnership panel',kind:'text',maxLength:80,fallback:'Partnership form →'},
 {key:'partner_cta_href',label:'CTA destination',group:'Partnership panel',kind:'href',maxLength:500,fallback:'/partnership'},
 {key:'routes_eyebrow',label:'Eyebrow',group:'Contact routes',kind:'text',maxLength:100,fallback:'Choose your route'},
 {key:'routes_title',label:'Heading',group:'Contact routes',kind:'text',maxLength:180,fallback:'What do you need help with?'},
 {key:'form_title',label:'Form heading',group:'Contact form',kind:'text',maxLength:160,fallback:'Send us a message'},
 {key:'form_body',label:'Form intro copy',group:'Contact form',kind:'textarea',maxLength:800,fallback:'Choose the closest route and tell us what you need. We removed the separate subject field because the topic and message already provide the routing context.'},
 {key:'faster_eyebrow',label:'Eyebrow',group:'Faster routes',kind:'text',maxLength:100,fallback:'Faster routes'},
 {key:'faster_title',label:'Heading',group:'Faster routes',kind:'text',maxLength:180,fallback:'You may not need a general enquiry.'},
 {key:'project_card_title',label:'Projects card heading',group:'Faster routes',kind:'text',maxLength:160,fallback:'Want to join a project?'},
 {key:'project_card_body',label:'Projects card copy',group:'Faster routes',kind:'textarea',maxLength:500,fallback:'Browse Labs briefs and use the project application flow.'},
 {key:'project_card_label',label:'Projects card CTA',group:'Faster routes',kind:'text',maxLength:80,fallback:'Browse projects →'},
 {key:'project_card_href',label:'Projects card destination',group:'Faster routes',kind:'href',maxLength:500,fallback:'/projects'},
 {key:'member_card_title',label:'Membership card heading',group:'Faster routes',kind:'text',maxLength:160,fallback:'Want to join Mettelo?'},
 {key:'member_card_body',label:'Membership card copy',group:'Faster routes',kind:'textarea',maxLength:500,fallback:'Create your account through the secure sign-up flow.'},
 {key:'member_card_label',label:'Membership card CTA',group:'Faster routes',kind:'text',maxLength:80,fallback:'Create account →'},
 {key:'member_card_href',label:'Membership card destination',group:'Faster routes',kind:'href',maxLength:500,fallback:'/signin'},
 {key:'partner_card_title',label:'Partners card heading',group:'Faster routes',kind:'text',maxLength:160,fallback:'Representing an organisation?'},
 {key:'partner_card_body',label:'Partners card copy',group:'Faster routes',kind:'textarea',maxLength:500,fallback:'Use the partnership form so we can assess the opportunity properly.'},
 {key:'partner_card_label',label:'Partners card CTA',group:'Faster routes',kind:'text',maxLength:80,fallback:'Partnership form →'},
 {key:'partner_card_href',label:'Partners card destination',group:'Faster routes',kind:'href',maxLength:500,fallback:'/partnership'}
];

export const WEBSITE_PAGE_FIELDS:Record<WebsitePageKey,WebsitePageFieldDefinition[]>={home:HOME_FIELDS,about:ABOUT_FIELDS,contact:CONTACT_FIELDS};
export const WEBSITE_PAGE_LABELS:Record<WebsitePageKey,string>={home:'Homepage',about:'About',contact:'Contact'};

function record(value:unknown):Record<string,unknown>|null{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null}
export function defaultWebsitePagePayload(page:WebsitePageKey):WebsitePagePayload{return{values:Object.fromEntries(WEBSITE_PAGE_FIELDS[page].map(field=>[field.key,field.fallback]))}}
export function isWebsitePageKey(value:unknown):value is WebsitePageKey{return typeof value==='string'&&['home','about','contact'].includes(value)}

export function validateWebsitePagePayload(page:WebsitePageKey,value:unknown){
 const source=record(value);const values=record(source?.values);if(!source||!values)return{ok:false as const,error:'Page content must contain a valid values object.'};
 const definitions=WEBSITE_PAGE_FIELDS[page];const allowed=new Set(definitions.map(field=>field.key));
 for(const key of Object.keys(values))if(!allowed.has(key))return{ok:false as const,error:`Unknown ${WEBSITE_PAGE_LABELS[page]} field: ${key}.`};
 const clean:Record<string,string>={};
 for(const field of definitions){
  const raw=values[field.key];if(typeof raw!=='string')return{ok:false as const,error:`${field.label} is required.`};
  const text=raw.trim();if(!text)return{ok:false as const,error:`${field.label} cannot be empty.`};
  if(text.length>field.maxLength)return{ok:false as const,error:`${field.label} is too long.`};
  if(field.kind==='href'&&!isSafePublicHref(text))return{ok:false as const,error:`${field.label} must be a safe internal or HTTPS destination.`};
  clean[field.key]=text;
 }
 return{ok:true as const,payload:{values:clean} as WebsitePagePayload};
}

export async function getPublicWebsitePage(page:WebsitePageKey):Promise<WebsitePagePayload>{
 noStore();const fallback=defaultWebsitePagePayload(page);const db=createPublicSupabaseClient();if(!db)return fallback;
 try{const {data,error}=await db.from('website_page_public').select('payload').eq('page_key',page).maybeSingle();if(error||!data)return fallback;const validated=validateWebsitePagePayload(page,data.payload);return validated.ok?validated.payload:fallback}catch{return fallback}
}
