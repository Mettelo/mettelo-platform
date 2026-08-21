import type {Metadata} from 'next';
import {getPublicWebsiteCmsPage} from '@/lib/website-pages-cms';

export const metadata:Metadata={title:'Terms of Use',description:'Terms for using Mettelo, its community, projects and contribution systems.'};

export default async function TermsPage(){
 const copy=(await getPublicWebsiteCmsPage('terms')).values;
 const sections=Array.from({length:9},(_,index)=>({title:copy[`section_${index+1}_title`],body:copy[`section_${index+1}_body`]}));
 return <section className="section"><div className="shell legalPage"><div className="eyebrow">Legal</div><h1>{copy.legal_title}</h1><p className="lead">Last updated: {copy.last_updated}</p>{sections.map((section,index)=><section key={`${index}-${section.title}`} className="legalSection"><h2>{section.title}</h2><p>{section.body}</p></section>)}<aside className="legalLinks" aria-label="Related legal links"><a href="/community-guidelines">Community Guidelines</a><a href="/privacy">Privacy Policy</a><a href="/contact">Contact Mettelo</a></aside></div></section>
}
