'use client';

import {Children,ReactNode,useMemo,useRef,useState} from 'react';

const PAGE_SIZE=6;

export default function PaginatedCardGrid({children,label='items',className='',showCount=true}:{children:ReactNode;label?:string;className?:string;showCount?:boolean}){
  const cards=useMemo(()=>Children.toArray(children),[children]);
  const [page,setPage]=useState(1);
  const topRef=useRef<HTMLDivElement>(null);
  const total=cards.length;
  const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  const safePage=Math.min(page,totalPages);
  const start=(safePage-1)*PAGE_SIZE;
  const visible=cards.slice(start,start+PAGE_SIZE);

  function go(next:number){
    const target=Math.max(1,Math.min(totalPages,next));
    if(target===safePage)return;
    setPage(target);
    requestAnimationFrame(()=>topRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  return <div className="metteloBrowseGridWrap" ref={topRef}>
    {showCount&&total>0&&<div className="metteloBrowseCount" aria-live="polite"><strong>{total} {label}</strong><span>Showing {start+1}–{Math.min(start+PAGE_SIZE,total)} of {total}</span></div>}
    <div className={`metteloBrowseGrid ${className}`.trim()}>{visible}</div>
    {totalPages>1&&<nav className="metteloBrowsePagination" aria-label={`${label} pages`}>
      <button className="button ghost" type="button" onClick={()=>go(safePage-1)} disabled={safePage===1}>← Previous</button>
      <span>Page {safePage} of {totalPages}</span>
      <button className="button ghost" type="button" onClick={()=>go(safePage+1)} disabled={safePage===totalPages}>Next →</button>
    </nav>}
    <style jsx>{`
      .metteloBrowseGridWrap{scroll-margin-top:96px;min-width:0}
      .metteloBrowseCount{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:0 0 14px;color:var(--slate);font-size:.78rem}
      .metteloBrowseCount strong{color:var(--ink);font-size:.82rem}
      .metteloBrowseGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:stretch;min-width:0}
      .metteloBrowseGrid :global(>*){height:100%;min-width:0}
      .metteloBrowsePagination{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;margin-top:24px}
      .metteloBrowsePagination span{text-align:center;color:var(--slate);font-size:.78rem}
      .metteloBrowsePagination .button{min-height:44px}
      .metteloBrowsePagination .button:disabled{opacity:.42;cursor:not-allowed;transform:none}
      @media(max-width:680px){
        .metteloBrowseGrid{grid-template-columns:1fr}
        .metteloBrowseCount{align-items:flex-start;flex-direction:column;gap:2px}
        .metteloBrowsePagination{grid-template-columns:1fr 1fr;gap:10px}
        .metteloBrowsePagination span{grid-column:1/-1;grid-row:1}
        .metteloBrowsePagination .button{width:100%}
      }
    `}</style>
  </div>;
}
