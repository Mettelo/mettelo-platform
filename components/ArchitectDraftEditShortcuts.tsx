'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';

type Project={id:string;title:string;summary:string;governance_status:string;risk_level?:string;creator_name?:string};
type Assignment={project_id:string;assignment_role:string;projects:Project|Project[]|null};
function projectOf(value:Assignment['projects']){return Array.isArray(value)?value[0]||null:value}

export default function ArchitectDraftEditShortcuts({isAdmin=false}:{isAdmin?:boolean}){
 const [items,setItems]=useState<Project[]>([]);
 useEffect(()=>{let cancelled=false;(async()=>{const response=await fetch(isAdmin?'/api/admin/project-experience-drafts':'/api/architect-projects');const body=await response.json().catch(()=>({}));if(cancelled||!response.ok)return;if(isAdmin){setItems(body.items||[]);return}setItems((body.assignments||[]).filter((item:Assignment)=>item.assignment_role==='creating_architect').flatMap((item:Assignment)=>{const project=projectOf(item.projects);return project&&['draft','changes_requested'].includes(project.governance_status)?[project]:[]}))})();return()=>{cancelled=true}},[isAdmin]);
 if(!items.length)return null;
 return <section className="architectEditShortcuts" aria-labelledby="architect-edit-drafts"><div className="queueHead"><div><span className="cardNumber">CANONICAL DRAFT EDITING</span><h2 id="architect-edit-drafts">{isAdmin?'Editable project definitions':'Continue shaping your drafts'}</h2></div><span className="chip">{items.length}</span></div><div className="architectCards">{items.map(project=><article className="architectCard" key={project.id}><div className="cardTop"><span className="chip">{project.governance_status.replaceAll('_',' ').toUpperCase()}</span>{project.risk_level&&<span className={`risk ${project.risk_level}`}>{project.risk_level.toUpperCase()}</span>}</div><h3>{project.title}</h3><p>{project.summary}</p>{isAdmin&&project.creator_name&&<small>Creating Architect · {project.creator_name}</small>}<Link className="button dark" href={`/member/architect-projects/${project.id}/edit`}>{isAdmin?'Review / edit canonical draft →':'Edit canonical draft →'}</Link></article>)}</div></section>;
}
