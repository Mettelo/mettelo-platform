'use client';

import {useState} from 'react';

type Item={question:string;answer:string};

export default function FAQAccordion({items}:{items:Item[]}){
  const [open,setOpen]=useState<Set<number>>(()=>new Set());
  function toggle(index:number){setOpen(current=>{const next=new Set(current);if(next.has(index))next.delete(index);else next.add(index);return next})}
  return <div className="faqAccordion">{items.map((item,index)=>{const expanded=open.has(index);const panelId=`faq-panel-${index}`;return <section className="faqItem" key={item.question}><h2><button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={()=>toggle(index)}><span>{item.question}</span><span className="faqIcon" aria-hidden="true">{expanded?'−':'+'}</span></button></h2><div id={panelId} className="faqAnswer" role="region" aria-label={item.question} hidden={!expanded}><p>{item.answer}</p></div></section>})}</div>;
}
