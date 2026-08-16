'use client';

import Link from 'next/link';

type Props={templates:{send_mode:string}[];deliveries:{status:string;created_at:string;last_error:string|null}[]};

export default function AdminCommunicationOverviewPanel({templates,deliveries}:Props){
  const failed=deliveries.filter(d=>['failed','dead_letter'].includes(d.status));
  const sent=deliveries.filter(d=>d.status==='sent').length;
  const queued=deliveries.filter(d=>['queued','retrying','sending'].includes(d.status)).length;
  return <><div className="adminPageHeader"><div><div className="eyebrow">Admin / Content &amp; Comms / Communications / Overview</div><h1>Communications</h1><p>Start with delivery health and anything that needs intervention, then drill into templates, queue history or event rules.</p></div></div><div className="metricGrid"><div className="metric"><strong>{templates.length}</strong><span>Active templates</span></div><div className="metric"><strong>{templates.filter(t=>t.send_mode==='automatic').length}</strong><span>Automatic</span></div><div className="metric"><strong>{templates.filter(t=>t.send_mode==='admin_review').length}</strong><span>Admin review</span></div><div className="metric"><strong>{templates.filter(t=>t.send_mode==='manual').length}</strong><span>Manual</span></div></div><section className="communicationsAttention"><header><div><span className="cardNumber">NEEDS ATTENTION</span><h2>Delivery health · last 24 hours</h2></div><Link href="/admin/notifications/delivery">Open delivery queue →</Link></header>{failed.length?<div className="communicationsFailure"><strong>{failed.length} failed or dead-letter message{failed.length===1?'':'s'}</strong><span>Open the delivery queue to inspect the provider error and retry.</span></div>:<div className="communicationsHealthy"><strong>No active delivery failures.</strong><span>{sent} sent · {queued} queued/retrying during the last 24 hours.</span></div>}</section><div className="communicationsShortcuts"><Link href="/admin/notifications/templates"><strong>Templates</strong><span>Search, edit, preview and publish governed journey copy.</span></Link><Link href="/admin/notifications/delivery"><strong>Delivery Queue</strong><span>Filter delivery records and inspect attempts or offer attachments.</span></Link><Link href="/admin/notifications/events"><strong>Event Catalogue</strong><span>Reference canonical event keys, channels and priority.</span></Link></div><style jsx>{`
    .communicationsAttention{margin-top:18px;padding:18px;border:1px solid #dce1e6;border-radius:14px;background:#fff}
    .communicationsAttention>header{display:flex;align-items:center;justify-content:space-between;gap:14px}
    .communicationsAttention h2{margin:5px 0 0;font-size:1rem}
    .communicationsAttention header :global(a){font-size:.7rem;font-weight:800}
    .communicationsFailure,.communicationsHealthy{display:grid;gap:4px;margin-top:14px;padding:14px;border-radius:10px}
    .communicationsFailure{border-left:4px solid #a92536;background:#fff0f2;color:#681724}
    .communicationsHealthy{border-left:4px solid #21834e;background:#eef8f2;color:#0f5132}
    .communicationsFailure strong,.communicationsHealthy strong{font-size:.78rem}
    .communicationsFailure span,.communicationsHealthy span{font-size:.69rem}
    .communicationsShortcuts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
    .communicationsShortcuts :global(a){display:grid;gap:4px;padding:14px;border:1px solid #dce1e6;border-radius:11px;background:#fff;color:#10131d;text-decoration:none}
    .communicationsShortcuts :global(strong){font-size:.78rem}
    .communicationsShortcuts :global(span){color:#66707e;font-size:.68rem;line-height:1.5}
    @media(max-width:760px){.communicationsAttention>header{align-items:flex-start;display:grid}.communicationsShortcuts{grid-template-columns:1fr}}
  `}</style></>;
}
