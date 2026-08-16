'use client';

import Link from 'next/link';
import AdminStatusBadge from './AdminStatusBadge';

export type CareerPipelineRow={id:string;full_name:string;email:string;status:string;submitted_at:string;career_roles:{title:string}|null};
const stages=['submitted','in_review','shortlisted','interview','offer','hired','rejected'];

export default function AdminCareerPipelineBoard({rows}:{rows:CareerPipelineRow[]}){
  return <div className="careerKanban" aria-label="Career candidate pipeline">{stages.map(stage=>{const items=rows.filter(row=>row.status===stage);return <section key={stage}><header><AdminStatusBadge status={stage} label={stage==='submitted'?'New':undefined}/><strong>{items.length}</strong></header><div>{items.slice(0,20).map(item=><Link href={`/admin/careers/applications?candidate=${item.id}`} key={item.id}><strong>{item.full_name}</strong><span>{item.career_roles?.title||'Mettelo role'}</span><small>{new Date(item.submitted_at).toLocaleDateString('en-GB')}</small></Link>)}{items.length>20&&<Link href={`/admin/careers/applications?status=${stage}`}>+ {items.length-20} more →</Link>}</div></section>})}<style jsx>{`
    .careerKanban{display:grid;grid-template-columns:repeat(7,minmax(190px,1fr));gap:10px;overflow-x:auto;padding-bottom:8px}
    .careerKanban>section{min-height:280px;border:1px solid #dce1e6;border-radius:13px;background:#f7f8fa}
    .careerKanban header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px;border-bottom:1px solid #e2e5e8}
    .careerKanban header>strong{font-size:.72rem}
    .careerKanban section>div{display:grid;gap:7px;padding:8px}
    .careerKanban :global(a){display:grid;gap:3px;padding:10px;border:1px solid #e0e4e8;border-radius:9px;background:#fff;color:#10131d;text-decoration:none}
    .careerKanban :global(a:hover){border-color:#aeb7c2}
    .careerKanban :global(a strong){font-size:.72rem}
    .careerKanban :global(a span){color:#48515e;font-size:.65rem}
    .careerKanban :global(a small){color:#7b8490;font-size:.6rem}
    @media(max-width:760px){.careerKanban{grid-template-columns:repeat(7,82vw)}}
  `}</style></div>;
}
