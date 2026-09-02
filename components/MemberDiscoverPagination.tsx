'use client';

import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';

const PAGE_SIZE=9;
const REFINEMENT_EVENT='mettelo:discover-refinement-change';

type PageItem=number|'ellipsis-start'|'ellipsis-end';

function projectCards(grid:HTMLElement){
  return Array.from(grid.children).filter((child):child is HTMLElement=>child instanceof HTMLElement&&child.classList.contains('mdProjectCard'));
}

function pageItems(current:number,total:number):PageItem[]{
  if(total<=7)return Array.from({length:total},(_,index)=>index+1);
  if(current<=4)return[1,2,3,4,5,'ellipsis-end',total];
  if(current>=total-3)return[1,'ellipsis-start',total-4,total-3,total-2,total-1,total];
  return[1,'ellipsis-start',current-1,current,current+1,'ellipsis-end',total];
}

export default function MemberDiscoverPagination(){
  const [page,setPage]=useState(1);
  const [count,setCount]=useState(0);
  const [host,setHost]=useState<HTMLDivElement|null>(null);
  const pageRef=useRef(1);

  useEffect(()=>{pageRef.current=page},[page]);

  useEffect(()=>{
    const paginationHost=document.createElement('div');
    paginationHost.dataset.discoverPaginationHost='true';
    setHost(paginationHost);

    let activeGrid:HTMLElement|null=null;
    let previousSignature='';

    const restore=(grid:HTMLElement|null)=>{if(grid)projectCards(grid).forEach(item=>{item.hidden=false})};
    const sync=(resetWhenChanged=false)=>{
      const grid=document.querySelector<HTMLElement>('.mdProjectGrid');
      const gridChanged=grid!==activeGrid;
      if(gridChanged){restore(activeGrid);activeGrid=grid;previousSignature=''}
      if(!grid){if(paginationHost.isConnected)paginationHost.remove();pageRef.current=1;setPage(1);setCount(0);return}
      if(paginationHost.parentElement!==grid.parentElement||paginationHost.previousElementSibling!==grid)grid.insertAdjacentElement('afterend',paginationHost);

      const items=projectCards(grid);
      const signature=items.map(item=>item.querySelector('h2')?.textContent||'').join('|');
      const changed=gridChanged||(previousSignature!==''&&signature!==previousSignature);
      previousSignature=signature;
      const totalPages=Math.max(1,Math.ceil(items.length/PAGE_SIZE));
      const requested=resetWhenChanged&&changed?1:pageRef.current;
      const nextPage=Math.max(1,Math.min(totalPages,requested));
      pageRef.current=nextPage;
      setPage(nextPage);
      setCount(items.length);
      items.forEach((item,index)=>{item.hidden=index<(nextPage-1)*PAGE_SIZE||index>=nextPage*PAGE_SIZE});
    };
    const resetForRefinement=()=>{pageRef.current=1;setPage(1);requestAnimationFrame(()=>sync(false))};

    sync();
    const root=document.querySelector<HTMLElement>('.mdDiscoverControlStack')||document.body;
    const observer=new MutationObserver(records=>{
      if(records.every(record=>paginationHost.contains(record.target)))return;
      sync(true);
    });
    observer.observe(root,{childList:true,subtree:true});
    window.addEventListener(REFINEMENT_EVENT,resetForRefinement);
    return()=>{window.removeEventListener(REFINEMENT_EVENT,resetForRefinement);observer.disconnect();restore(activeGrid);paginationHost.remove()};
  },[]);

  const pages=Math.max(1,Math.ceil(count/PAGE_SIZE));
  if(!host||count<=PAGE_SIZE)return null;

  function go(nextPage:number){
    const grid=document.querySelector<HTMLElement>('.mdProjectGrid');
    if(!grid)return;
    const items=projectCards(grid);
    const target=Math.max(1,Math.min(pages,nextPage));
    pageRef.current=target;
    setPage(target);
    items.forEach((item,index)=>{item.hidden=index<(target-1)*PAGE_SIZE||index>=target*PAGE_SIZE});
    const anchor=document.querySelector<HTMLElement>('.mdCatalogueHead');
    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    anchor?.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'});
  }

  const start=(page-1)*PAGE_SIZE+1;
  const end=Math.min(count,page*PAGE_SIZE);
  const items=pageItems(page,pages);
  return createPortal(<nav className="mdDiscoverPagination" aria-label="Discover project pages">
    <button type="button" onClick={()=>go(page-1)} disabled={page===1} aria-label="Previous page">← Previous</button>
    <div className="mdPaginationCentre">
      <div className="mdPageNumbers" aria-label="Choose project page">
        {items.map(item=>typeof item==='number'?<button key={item} type="button" className="mdPageNumber" onClick={()=>go(item)} aria-label={`Page ${item}`} aria-current={item===page?'page':undefined}>{item}</button>:<span className="mdPageEllipsis" key={item} aria-hidden="true">…</span>)}
      </div>
      <span className="mdPageSummary" aria-live="polite"><strong>Page {page} of {pages}</strong><small>Showing {start}–{end} of {count}</small></span>
    </div>
    <button type="button" onClick={()=>go(page+1)} disabled={page===pages} aria-label="Next page">Next →</button>
    <style jsx>{`
      .mdDiscoverPagination{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px;margin:18px 0 8px;padding:12px;border:1px solid #e7e1d6;border-radius:14px;background:#fcfbf7}
      .mdDiscoverPagination>button{min-width:112px;min-height:44px;padding:8px 14px;border:1px solid #c9c3b8;border-radius:10px;background:#fff;color:#10131d;font-weight:800;cursor:pointer}
      .mdDiscoverPagination button:hover:not(:disabled),.mdDiscoverPagination button:focus-visible:not(:disabled){background:#f7efdd;border-color:#c6892a}
      .mdDiscoverPagination button:focus-visible{outline:3px solid rgba(42,47,82,.28);outline-offset:2px}
      .mdDiscoverPagination button:disabled{opacity:.42;cursor:not-allowed}
      .mdPaginationCentre{display:grid;justify-items:center;gap:7px;min-width:0}.mdPageNumbers{display:flex;align-items:center;justify-content:center;gap:5px;flex-wrap:wrap}.mdPageNumber{width:38px;min-width:38px;height:38px;border:1px solid #d1cbc0;border-radius:9px;background:#fff;color:#10131d;font-weight:800;cursor:pointer}.mdPageNumber[aria-current="page"]{background:#10131d;color:#fff;border-color:#10131d}.mdPageEllipsis{min-width:22px;text-align:center;color:#68717d;font-weight:800}.mdPageSummary{display:grid;justify-items:center;gap:2px;color:#5b6472;text-align:center}.mdPageSummary strong{color:#10131d;font-size:.82rem}.mdPageSummary small{font-size:.7rem}
      @media(max-width:560px){.mdDiscoverPagination{grid-template-columns:1fr 1fr}.mdPaginationCentre{grid-column:1/-1;grid-row:1}.mdPageNumbers{display:none}.mdDiscoverPagination>button{min-width:0;width:100%}.mdDiscoverPagination>button:first-of-type{grid-column:1;grid-row:2}.mdDiscoverPagination>button:last-of-type{grid-column:2;grid-row:2}}
    `}</style>
  </nav>,host);
}
