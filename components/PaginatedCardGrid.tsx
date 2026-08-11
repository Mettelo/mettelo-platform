'use client';

import {Children,ReactNode,useEffect,useRef,useState} from 'react';

type Props={children:ReactNode;className?:string;ariaLabel?:string;pageSize?:number;showCount?:boolean};

export default function PaginatedCardGrid({children,className='',ariaLabel='Items',pageSize=6,showCount=false}:Props){
  const items=Children.toArray(children);const totalPages=Math.max(1,Math.ceil(items.length/pageSize));const [page,setPage]=useState(1);const topRef=useRef<HTMLDivElement>(null);const safePage=Math.min(page,totalPages);const start=(safePage-1)*pageSize;const visible=items.slice(start,start+pageSize);
  useEffect(()=>{if(page>totalPages)setPage(totalPages)},[page,totalPages]);
  function move(next:number){setPage(next);window.requestAnimationFrame(()=>topRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));}
  return <div className="metteloPaginatedGridWrap" ref={topRef}>
    {showCount&&<div className="metteloGridCount">Showing {items.length?start+1:0}–{Math.min(start+pageSize,items.length)} of {items.length}</div>}
    <div className={`metteloPaginatedGrid ${className}`.trim()} aria-label={ariaLabel}>{visible}</div>
    {totalPages>1&&<nav className="metteloGridPagination" aria-label={`${ariaLabel} pages`}><button className="button ghost" type="button" disabled={safePage===1} onClick={()=>move(Math.max(1,safePage-1))}>← Previous</button><span>Page {safePage} of {totalPages}</span><button className="button ghost" type="button" disabled={safePage===totalPages} onClick={()=>move(Math.min(totalPages,safePage+1))}>Next →</button></nav>}
    <style jsx global>{`.metteloPaginatedGridWrap{min-width:0;scroll-margin-top:92px}.metteloPaginatedGrid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:16px!important;align-items:stretch}.metteloPaginatedGrid>*{min-width:0!important;width:100%;height:100%;box-sizing:border-box}.metteloGridCount{margin:0 0 12px;color:#6a7380;font-size:.76rem}.metteloGridPagination{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:22px}.metteloGridPagination span{color:#6d7581;font-size:.78rem}.metteloGridPagination .button{min-height:44px}.metteloGridPagination .button:disabled{opacity:.42;cursor:not-allowed}@media(max-width:680px){.metteloPaginatedGrid{grid-template-columns:1fr!important}.metteloGridPagination{justify-content:space-between;gap:8px}.metteloGridPagination .button{padding-inline:10px}}`}</style>
  </div>;
}
