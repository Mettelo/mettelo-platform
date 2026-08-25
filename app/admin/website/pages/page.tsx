import {redirect} from 'next/navigation';
import AdminWebsitePagesEditor from '@/components/AdminWebsitePagesEditor';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {WEBSITE_CMS_PAGES,defaultWebsiteCmsPagePayload,validateWebsiteCmsPagePayload} from '@/lib/website-pages-cms';

export const dynamic='force-dynamic';

const HOME_GROUPS:Record<string,string>={
 Hero:'01 · Hero — existing design',
 'Why Mettelo':'02 · Why Mettelo exists',
 'How Mettelo works':'03 · Real work & participation',
 Proof:'05 · Mettelo Proof',
 Organisations:'07 · Organisations route',
 'Final CTA':'08 · Final CTA'
};

const HOME_LABELS:Record<string,string>={
 why_eyebrow:'Section eyebrow',why_title:'Positioning heading',why_lead:'Problem / value lead',why_body:'Mettelo differentiation copy',why_scope:'Supporting context',
 how_eyebrow:'Section eyebrow',how_title:'Real-work heading',how_body:'Real-work introduction',
 proof_eyebrow:'Section eyebrow',proof_title:'Proof heading',proof_lead:'Proof explanation',proof_note:'Verification note',proof_cta_label:'Proof CTA label',proof_cta_href:'Proof CTA destination',
 organisations_eyebrow:'Organisation eyebrow',organisations_title:'Organisation heading',organisations_lead:'Organisation value copy',organisations_cta_label:'Organisation CTA label',organisations_cta_href:'Organisation CTA destination',
 final_eyebrow:'Final eyebrow',final_title:'Final heading',final_body:'Final supporting copy',final_primary_label:'Primary CTA label',final_primary_href:'Primary CTA destination',final_secondary_label:'Secondary CTA label',final_secondary_href:'Secondary CTA destination'
};

function adminDefinition(definition:(typeof WEBSITE_CMS_PAGES)[number]){
 if(definition.key!=='home')return definition;
 return{
  ...definition,
  description:'Homepage copy for the existing hero and the redesigned below-the-fold story: why Mettelo exists, real work, Mettelo Proof, organisation route and final conversion. Live project, opportunity and event records remain managed separately.',
  fields:definition.fields.map(field=>({...field,group:HOME_GROUPS[field.group]||field.group,label:HOME_LABELS[field.key]||field.label}))
 };
}

export default async function AdminWebsitePagesPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(!hasAdminCapability(user,'website.content.edit'))redirect('/admin');
 const db=serviceDb();if(!db)return <section className="section"><div className="shell"><div className="adminEmpty"><h1>Website pages unavailable</h1><p>Admin data service is not configured.</p></div></div></section>;
 const definitions=WEBSITE_CMS_PAGES.map(adminDefinition);const keys=definitions.map(item=>item.key);
 const [{data:drafts,error:draftError},{data:published,error:publishedError}]=await Promise.all([
  db.from('website_page_drafts').select('page_key,payload,updated_at').in('page_key',keys),
  db.from('website_page_public').select('page_key,payload,published_at').in('page_key',keys)
 ]);
 if(draftError||publishedError)return <section className="section"><div className="shell"><div className="adminEmpty"><h1>Website pages unavailable</h1><p>Unable to load the Website page content service.</p></div></div></section>;
 const pageConfigs=definitions.map(definition=>{
  const draftRow=(drafts||[]).find(row=>row.page_key===definition.key);const publishedRow=(published||[]).find(row=>row.page_key===definition.key);const fallback=defaultWebsiteCmsPagePayload(definition.key);
  const draftValidated=draftRow?validateWebsiteCmsPagePayload(definition.key,draftRow.payload):null;const publishedValidated=publishedRow?validateWebsiteCmsPagePayload(definition.key,publishedRow.payload):null;
  return{...definition,draft:draftValidated?.ok?draftValidated.payload:fallback,published:publishedValidated?.ok?publishedValidated.payload:fallback,draftUpdatedAt:draftRow?.updated_at||null,publishedAt:publishedRow?.published_at||null};
 });
 return <section className="section softSection"><div className="shell adminWebsitePagesShell"><AdminWebsitePagesEditor pages={pageConfigs}/></div></section>;
}
