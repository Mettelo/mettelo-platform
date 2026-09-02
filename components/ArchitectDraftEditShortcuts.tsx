'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';

type Assignment={project_id:string;assignment_role:string;projects:{id:string;title:string;summary:string;governance_status:string}|{id:string;title:string;summary:string;governance_status:string}[]|null};
function projectOf(value:Assignment['projects']){return Array.isArray(value)?value[0]||null:value}

export default function ArchitectDraftEditShortcuts(){
 const [items,setItems]=useState<Assignment[]>([]);
 useEffect(()=>{let cancelled=false;(async()=>{const response=await fetch('/api/architect-projects');const body=await response.json().catch(()=>({}));if(!cancelled&&response.ok)setItems((body.assignments||[]).filter((item:Assignment)=>item.assignment_role==='creating_architect'&&['draft','changes_requested'].includes(projectOf(item.projects)?.governance_status||'')))} )();return()=>{cancelled=true}},[]);
 if(!items.length)return null;
 return <section className="architectEditShortcuts" aria-labelledby="architect-edit-drafts"><div className="queueHead"><div><span className="cardNumber">CANONICAL DRAFT EDITING</span><h2 id="architect-edit-drafts">Continue shaping your drafts</h2></div><span className="chip">{items.length}</span></div><div className="architectCards">{items.map(item=>{const project=projectOf(item.projects);if(!project)return null;return <article className="architectCard" key={project.id}><div className="cardTop"><span className="chip">{project.governance_status.replaceAll('_',' ').toUpperCase()}</span></div><h3>{project.title}</h3><p>{project.summary}</p><Link className="button dark" href={`/member/architect-projects/${project.id}/edit`}>Edit canonical draft →</Link></article>})}</div></section>;
}
