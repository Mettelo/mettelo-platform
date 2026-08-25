'use client';

import Link from 'next/link';

export type CareerPipelineRow={id:string;full_name:string;email:string;status:string;final_outcome:string;offer_status:string;submitted_at:string;career_roles:{title:string}|null};
const stages=[
  {value:'submitted',label:'Application Received'},
  {value:'in_review',label:'Under Review'},
  {value:'shortlisted',label:'Shortlisted'},
  {value:'interview',label:'Interview & Final Decision'}
];
function normalisedStage(status:string){return ['offer','hired','rejected'].includes(status)?'interview':status;}
function outcome(row:CareerPipelineRow){if(row.final_outcome==='hired')return'Hired';if(row.final_outcome==='rejected')return'Rejected';return'Decision Pending';}

export default function AdminCareerPipelineBoard({rows}:{rows:CareerPipelineRow[]}){
  return <div className="careerKanban" aria-label="Career candidate pipeline">{stages.map(stage=>{const items=rows.filter(row=>normalisedStage(row.status)===stage.value);return <section key={stage.value}><header><span className="stageLabel">{stage.label}</span><strong>{items.length}</strong></header><div>{items.slice(0,30).map(item=><Link href="/admin/careers/applications" key={item.id}><strong>{item.full_name}</strong><span>{item.career_roles?.title||'Mettelo role'}</span>{stage.value==='interview'&&<small>{outcome(item)}{item.final_outcome==='hired'?` · Offer ${item.offer_status.replaceAll('_',' ')}`:''}</small>}<small>Applied {new Date(item.submitted_at).toLocaleDateString('en-GB')}</small></Link>)}{items.length>30&&<Link href="/admin/careers/applications">+ {items.length-30} more →</Link>}</div></section>})}<style jsx>{`
    .careerKanban{display:grid;grid-template-columns:repeat(4,minmax(230px,1fr));gap:12px;overflow-x:auto;padding-bottom:8px}
    .careerKanban>section{min-height:300px;border:1px solid #dce1e6;border-radius:13px;background:#f7f8fa}
    .careerKanban header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px;border-bottom:1px solid #e2e5e8}
    .stageLabel{font-size:.7rem;font-weight:850;color:#243040}.careerKanban header>strong{font-size:.72rem}
    .careerKanban section>div{display:grid;gap:7px;padding:8px}
    .careerKanban :global(a){display:grid;gap:3px;padding:10px;border:1px solid #e0e4e8;border-radius:9px;background:#fff;color:#10131d;text-decoration:none}
    .careerKanban :global(a:hover){border-color:#aeb7c2}.careerKanban :global(a:focus-visible){outline:3px solid #173f8f;outline-offset:2px}
    .careerKanban :global(a strong){font-size:.72rem}.careerKanban :global(a span){color:#48515e;font-size:.65rem}.careerKanban :global(a small){color:#7b8490;font-size:.6rem;text-transform:capitalize}
    @media(max-width:760px){.careerKanban{grid-template-columns:repeat(4,82vw)}}
  `}</style></div>;
}
