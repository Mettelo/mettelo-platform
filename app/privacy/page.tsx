import type {Metadata} from 'next';
import {getPublicWebsiteCmsPage} from '@/lib/website-pages-cms';

export const metadata:Metadata={title:'Privacy Policy',description:'How Mettelo collects, uses and protects personal information.'};

export default async function PrivacyPage(){
 const copy=(await getPublicWebsiteCmsPage('privacy')).values;
 const sections=Array.from({length:8},(_,index)=>({title:copy[`section_${index+1}_title`],body:copy[`section_${index+1}_body`]}));
 return <section className="section"><div className="shell legalPage"><div className="eyebrow">Legal</div><h1>{copy.legal_title}</h1><p className="lead">Last updated: {copy.last_updated}</p>{sections.map((section,index)=><section key={`${index}-${section.title}`} className="legalSection"><h2>{section.title}</h2><p>{section.body}</p></section>)}<aside className="legalLinks" aria-label="Privacy support links"><strong>Privacy requests and questions</strong><a href="/contact">Contact Mettelo →</a></aside></div></section>
}
