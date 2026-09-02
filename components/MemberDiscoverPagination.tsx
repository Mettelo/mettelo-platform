'use client';

import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';

const PAGE_SIZE=12;

function projectCards(grid:HTMLElement){
  return Array.from(grid.children).filter((child):child is HTMLElement=>child instanceof HTMLElement&&child.classList.contains('mdProjectCard'));
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

    sync();
    const root=document.querySelector<HTMLElement>('.mdDiscoverControlStack')||document.body;
    const observer=new MutationObserver(records=>{
      if(records.every(record=>paginationHost.contains(record.target)))return;
      sync(true);
    });
    observer.observe(root,{childList:true,subtree:true});
    return()=>{observer.disconnect();restore(activeGrid);paginationHost.remove()};
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
  return createPortal(<nav className="mdDiscoverPagination" aria-label="Discover project pages">
    <button type="button" onClick={()=>go(page-1)} disabled={page===1} aria-label="Previous page">← Previous</button>
    <span aria-live="polite"><strong>Page {page} of {pages}</strong><small>Showing {start}–{end} of {count}</small></span>
    <button type="button" onClick={()=>go(page+1)} disabled={page===pages} aria-label="Next page">Next →</button>
    <style jsx>{`
      .mdDiscoverPagination{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px;margin:18px 0 8px;padding:12px;border:1px solid #e7e1d6;border-radius:14px;background:#fcfbf7}
      .mdDiscoverPagination button{min-width:112px;min-height:44px;padding:8px 14px;border:1px solid #c9c3b8;border-radius:10px;background:#fff;color:#10131d;font-weight:800;cursor:pointer}
      .mdDiscoverPagination button:hover:not(:disabled),.mdDiscoverPagination button:focus-visible:not(:disabled){background:#f7efdd;border-color:#c6892a}
      .mdDiscoverPagination button:focus-visible{outline:3px solid rgba(42,47,82,.28);outline-offset:2px}
      .mdDiscoverPagination button:disabled{opacity:.42;cursor:not-allowed}
      .mdDiscoverPagination span{display:grid;justify-items:center;gap:2px;color:#5b6472;text-align:center}
      .mdDiscoverPagination strong{color:#10131d;font-size:.82rem}
      .mdDiscoverPagination small{font-size:.7rem}
      @media(max-width:560px){.mdDiscoverPagination{grid-template-columns:1fr 1fr}.mdDiscoverPagination span{grid-column:1/-1;grid-row:1}.mdDiscoverPagination button{min-width:0;width:100%}}
    `}</style>
  </nav>,host);
}
