'use client';

const iconByStatus:Record<string,string>={draft:'○',pilot:'◇',open:'●',recruiting:'●',forming:'◎',active:'✓',paused:'Ⅱ',review:'◷',completed:'✓',archived:'—',private:'◒',public:'●',submitted:'◷',in_review:'◷',under_review:'◷',shortlisted:'★',offered:'→',approved:'✓',declined:'×',failed:'!',inactive:'○',success:'✓',completed_sync:'✓',waiting:'◷',confirmed:'✓'};

export default function AdminStatusBadge({status,label}:{status:string;label?:string}){
  const key=status.toLowerCase().replaceAll(' ','_');
  const tone=['active','approved','completed','public','success','confirmed'].includes(key)?'success':['forming','shortlisted','offered','pilot','review','waiting'].includes(key)?'warning':['failed','declined'].includes(key)?'danger':['paused','archived','inactive','private'].includes(key)?'neutral':'info';
  const text=label||status.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
  return <span className={`adminStatusBadge adminStatusBadge--${tone}`}><span aria-hidden="true">{iconByStatus[key]||'•'}</span>{text}<style jsx>{`
    .adminStatusBadge{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:4px 9px;border-radius:999px;font-size:.68rem;font-weight:800;line-height:1;white-space:nowrap;border:1px solid transparent}
    .adminStatusBadge--success{color:#0f5132;background:#eaf7ef;border-color:#b9dfc8}.adminStatusBadge--warning{color:#72501b;background:#fff8e8;border-color:#ead7a6}.adminStatusBadge--danger{color:#7a1e2c;background:#fdecef;border-color:#efbcc6}.adminStatusBadge--neutral{color:#48515e;background:#f0f1f3;border-color:#d9dde2}.adminStatusBadge--info{color:#1e40af;background:#eff6ff;border-color:#c8d8ff}
  `}</style></span>;
}
